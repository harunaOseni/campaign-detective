import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Sparkles,
  Database,
  ChartNoAxesCombined,
  Plus,
  MessageSquare,
  ChevronRight,
  FileText,
  X,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUp,
  Check,
  Clock3,
  ThumbsUp,
  ThumbsDown,
  Copy,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import './live.css';
type Job = Record<string, any>;
type Page = 'new' | 'chat' | 'data' | 'scale';
const presets = [
  { title: 'Why did campaign revenue drop despite steady ad spend?', dataset: 'inventory' },
  { title: 'Is the revenue decline real or delayed reporting?', dataset: 'delay' },
  { title: 'Are duplicate orders inflating campaign revenue?', dataset: 'duplicates' },
];
const connectionMessage = 'The server is temporarily unavailable. Reconnecting…';
const clearConnectionError = (message: string) =>
  message === connectionMessage || message.includes('Unexpected end of JSON input') ? '' : message;
async function api(path: string, options?: RequestInit) {
  let r: Response;
  try {
    r = await fetch('/api' + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw Error(connectionMessage);
  }
  let body: any;
  try {
    body = JSON.parse(await r.text());
  } catch {
    throw Error(connectionMessage);
  }
  if (!r.ok) throw Error(r.status >= 500 ? connectionMessage : body.error || 'Request failed');
  return body;
}
const nf = (n: any) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : String(n ?? '—');
export default function LiveApp() {
  const [page, setPage] = useState<Page>('new'),
    [jobs, setJobs] = useState<Job[]>([]),
    [job, setJob] = useState<Job | null>(null),
    [selected, setSelected] = useState<string | null>(
      new URLSearchParams(location.search).get('job'),
    );
  const [question, setQuestion] = useState(''),
    [search, setSearch] = useState(''),
    [dataset, setDataset] = useState('inventory'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [context, setContext] = useState<any>(null),
    [metrics, setMetrics] = useState<any>(null),
    [drawer, setDrawer] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [historyCollapsed, setHistoryCollapsed] = useState(false),
    [benchmarking, setBenchmarking] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const data = await api('/investigations');
      setJobs(data);
      setError(clearConnectionError);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    refresh();
    api('/context')
      .then(setContext)
      .catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    if (!selected) return;
    setPage('chat');
    let stopped = false;
    const poll = async () => {
      try {
        const data = await api('/investigations/' + selected);
        if (!stopped) {
          setJob(data);
          setError(clearConnectionError);
          refresh();
        }
      } catch (e: any) {
        if (!stopped) setError(e.message);
      }
    };
    poll();
    const t = setInterval(poll, 1500);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [selected, refresh]);
  useEffect(() => {
    if (page !== 'scale') return;
    const load = () =>
      api('/metrics')
        .then((data) => {
          setMetrics(data);
          setError(clearConnectionError);
        })
        .catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [page]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const open = (id: string) => {
    setSelected(id);
    setJob(null);
    setPage('chat');
    history.replaceState(null, '', '/?job=' + id);
  };
  const fresh = () => {
    setSelected(null);
    setJob(null);
    setPage('new');
    history.replaceState(null, '', '/');
    setError('');
  };
  const submit = async (q = question, d = dataset) => {
    if (busy || q.trim().length < 4) return;
    setBusy(true);
    setError('');
    try {
      const r = await api('/investigations', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ question: q.trim(), dataset: d }),
      });
      setQuestion('');
      open(r.id);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const prefs = async (body: any) => {
    if (!job) return;
    try {
      await api('/investigations/' + job.id + '/preferences', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setJob({ ...job, ...body });
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };
  const result = job?.result,
    evidence = result?.evidence || job?.checkpoint?.evidence || [];
  const active = job && ['queued', 'running'].includes(job.status);
  const exportReport = () => {
    if (!job) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-investigation-' + job.id.slice(0, 8) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const composer = (
    <div className="composer-wrap">
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          aria-label="Ask a marketing question"
          placeholder="Ask anything about your campaign data…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={2000}
        />
        <div>
          <label className="composer-model">
            <Database size={16} />
            <select
              aria-label="Investigation dataset"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
            >
              <option value="inventory">Northstar · Inventory scenario</option>
              <option value="delay">Northstar · Reporting delay</option>
              <option value="duplicates">Northstar · Duplicate events</option>
            </select>
          </label>
          <button
            type="submit"
            aria-label="Send question"
            disabled={busy || question.trim().length < 4}
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </form>
      <p>AI can make mistakes. Review findings before taking action.</p>
    </div>
  );
  return (
    <div
      className={
        'app live-app' +
        (collapsed ? ' nav-collapsed' : '') +
        (historyCollapsed ? ' history-collapsed' : '')
      }
    >
      <aside className="primary">
        <div className="brand">
          <Search size={21} />
          <strong>Campaign Detective</strong>
          <button
            aria-label="Collapse navigation"
            className="collapse-nav"
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <div className="workspace">
          <span>Northstar Retail</span>
        </div>
        <nav>
          <button className={page === 'new' || page === 'chat' ? 'active' : ''} onClick={fresh}>
            <Sparkles />
            Agents
          </button>
          <div className="subnav">
            <button className={page === 'new' || page === 'chat' ? 'selected' : ''} onClick={fresh}>
              Chats
            </button>
          </div>
          <button className={page === 'data' ? 'active' : ''} onClick={() => setPage('data')}>
            <Database />
            Data & context
          </button>
          <button className={page === 'scale' ? 'active' : ''} onClick={() => setPage('scale')}>
            <ChartNoAxesCombined />
            Performance lab
          </button>
        </nav>
        <div className="sidebar-bottom">
          <a className="design-link" href="/system-design">
            System design
          </a>
          <div className="profile">
            <span className="avatar user">H</span>
            <div>
              Haruna Oseni<small>Northstar workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <aside className="history">
        <div className="history-heading">
          Chats <span>{jobs.length}</span>
          <button
            aria-label="Collapse chat history"
            className="collapse-history"
            onClick={() => setHistoryCollapsed(true)}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <button className="new-chat" onClick={fresh}>
          <Plus size={15} />
          New chat
        </button>
        <label className="search">
          <Search size={14} />
          <input
            aria-label="Search investigations"
            placeholder="Search chats…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <p className="nav-label">INVESTIGATIONS</p>
        {jobs
          .filter((j) => j.question.toLowerCase().includes(search.toLowerCase()))
          .map((j) => (
            <button
              className={'chat-item ' + (selected === j.id ? 'current' : '')}
              key={j.id}
              onClick={() => open(j.id)}
            >
              <MessageSquare size={14} />
              <span>
                {j.question}
                <small>
                  {j.status}
                  {j.saved ? ' · Saved' : ''}
                </small>
              </span>
            </button>
          ))}
        {!jobs.length && <p className="empty-search">Your investigations will appear here.</p>}
      </aside>
      <main>
        <header>
          <div>
            {collapsed && (
              <button aria-label="Expand navigation" onClick={() => setCollapsed(false)}>
                <PanelLeftOpen size={17} />
              </button>
            )}
            {historyCollapsed && (
              <button aria-label="Expand chat history" onClick={() => setHistoryCollapsed(false)}>
                <MessageSquare size={17} />
              </button>
            )}
            <span className="breadcrumb">Agents</span>
            <ChevronRight size={13} />
            <strong>
              {page === 'new'
                ? 'New chat'
                : page === 'chat'
                  ? 'Investigation'
                  : page === 'data'
                    ? 'Data & context'
                    : 'Performance lab'}
            </strong>
          </div>
          <div>
            <button className="header-context" onClick={() => setDrawer(!drawer)}>
              <FileText size={15} />
              Show context
            </button>
            {job && page === 'chat' && (
              <button aria-label="Export investigation" onClick={exportReport}>
                <Download size={16} />
              </button>
            )}
          </div>
        </header>
        {error && (
          <div className="live-error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {page === 'new' && (
          <div className="welcome">
            <div className="welcome-center">
              <div className="welcome-heading">
                <span className="large-spark">
                  <Sparkles size={36} />
                </span>
                <h1>Let’s discover something new.</h1>
              </div>
              <div className="prompt-cards">
                {presets.map((p) => (
                  <button
                    disabled={busy}
                    key={p.dataset}
                    onClick={() => {
                      setDataset(p.dataset);
                      submit(p.title, p.dataset);
                    }}
                  >
                    <span>
                      <Database size={23} />
                    </span>
                    {p.title}
                  </button>
                ))}
              </div>
              {composer}
            </div>
          </div>
        )}
        {page === 'chat' && (
          <div className="conversation">
            <div className="conversation-body">
              {!job ? (
                <p role="status">Loading investigation…</p>
              ) : (
                <>
                  <div className="user-message">
                    <span>
                      {job.question}
                      <small>Northstar Retail · {job.dataset} · Synthetic dataset</small>
                    </span>
                  </div>
                  <div className="assistant-label">
                    <span className="spark-icon">
                      <Sparkles size={18} />
                    </span>
                    <strong>Campaign Detective</strong>
                    <span>{job.status}</span>
                  </div>
                  <div className="live-stage" role="status">
                    {active ? <Clock3 size={16} /> : <Check size={16} />}
                    <strong>{job.stage}</strong>
                    {active && (
                      <button
                        onClick={async () => {
                          try {
                            await api('/investigations/' + job.id + '/cancel', { method: 'POST' });
                            setJob(await api('/investigations/' + job.id));
                          } catch (e: any) {
                            setError(e.message);
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <details className="live-trace" open={!!active}>
                    <summary>Investigation activity · {job.events?.length || 0} events</summary>
                    {job.events?.map((event: any, i: number) => (
                      <div key={i}>
                        <Check size={12} />
                        <span>
                          <strong>{event.stage}</strong>
                          <small>{event.detail}</small>
                        </span>
                        <time>{new Date(event.at).toLocaleTimeString()}</time>
                      </div>
                    ))}
                  </details>
                  {result ? (
                    <>
                      <h1>{result.headline}</h1>
                      <div className="answer-overview">
                        <span className="answer-eyebrow">At a glance</span>
                        {result.summary
                          .split(/(?<=[.!?])\s+(?=[A-Z])/)
                          .map((line: string, i: number) => (
                            <p key={i}>{line}</p>
                          ))}
                      </div>
                      {result.partialReason && (
                        <p className="muted">
                          <strong>Why this answer is partial:</strong> {result.partialReason}
                        </p>
                      )}
                      {result.findings?.length > 0 &&
                        (() => {
                          const sources = [
                            ...new Set<string>(
                              result.findings.flatMap((f: any) => f.evidenceIds || []),
                            ),
                          ];
                          const measurements = [
                            ...new Map<string, any>(
                              result.findings.flatMap((f: any) =>
                                (f.measurements || []).map((m: any) => [
                                  JSON.stringify([m.evidenceId, m.rowIndex, m.field]),
                                  m,
                                ]),
                              ),
                            ).values(),
                          ];
                          const notes = [
                            ...new Set<string>(
                              result.findings
                                .filter((f: any) => !f.measurements?.length)
                                .flatMap((f: any) => f.explanation.split(/(?<=[.!?])\s+(?=[A-Z])/)),
                            ),
                          ];
                          const comparisons = new Map<string, any>();
                          for (const m of measurements) {
                            const source = evidence.find((e: any) => e.id === m.evidenceId);
                            const row = source?.rows?.[m.rowIndex];
                            if (!row || !['previous', 'current'].includes(row.period)) continue;
                            const label = row.campaign || row.segment || 'All selected records';
                            const key = JSON.stringify([m.evidenceId, label, m.field]);
                            const item = comparisons.get(key) || { key, label, field: m.field };
                            item[row.period] = m.value;
                            comparisons.set(key, item);
                          }
                          const groups = new Map<string, any[]>();
                          for (const item of comparisons.values()) {
                            groups.set(item.field, [...(groups.get(item.field) || []), item]);
                          }
                          const standalone = measurements.filter((m: any) => {
                            const row = evidence.find((e: any) => e.id === m.evidenceId)?.rows?.[
                              m.rowIndex
                            ];
                            return !row || !['previous', 'current'].includes(row.period);
                          });
                          const duplicateCount = standalone.find(
                            (m: any) => m.evidenceId === 'quality' && m.field === 'duplicate_rows',
                          )?.value;
                          const rawRevenue = standalone.find(
                            (m: any) => m.evidenceId === 'quality' && m.field === 'raw_revenue',
                          )?.value;
                          const cleanRevenue = standalone.find(
                            (m: any) =>
                              m.evidenceId === 'quality' && m.field === 'deduplicated_revenue',
                          )?.value;
                          const hasRevenueComparison =
                            Number.isFinite(rawRevenue) && Number.isFinite(cleanRevenue);
                          const metricLabels: Record<string, string> = {
                            duplicate_rows: 'Duplicate records',
                            event_rows: 'Total recorded events',
                            unique_orders: 'Unique purchases',
                            raw_revenue: 'Revenue before removing duplicates',
                            deduplicated_revenue: 'Revenue after removing duplicates',
                            duplicate_revenue: 'Revenue counted more than once',
                          };
                          const revenue = groups.get('revenue') || [];
                          const comparable = revenue.filter(
                            (r) => typeof r.previous === 'number' && typeof r.current === 'number',
                          );
                          const declined = comparable
                            .filter((r) => r.current < r.previous)
                            .map((r) => r.label);
                          const others = comparable
                            .filter((r) => r.current >= r.previous)
                            .map((r) => r.label);
                          const takeaway = comparable.length
                            ? (declined.length
                                ? `Revenue fell for ${declined.join(', ')}.`
                                : 'Revenue did not fall for the products compared.') +
                              (declined.length && others.length
                                ? ` ${others.join(', ')} had stable or higher revenue.`
                                : '')
                            : '';
                          return (
                            <section className="answer-section">
                              <h2>What changed</h2>
                              {takeaway && <p className="comparison-takeaway">{takeaway}</p>}
                              {[...groups].map(([field, rows]) => (
                                <div key={field} className="comparison-group">
                                  <h3>{field.replaceAll('_', ' ')}</h3>
                                  <div className="table-scroll">
                                    <table className="finding-measurements">
                                      <thead>
                                        <tr>
                                          <th>Product / scope</th>
                                          <th>Previous period</th>
                                          <th>Current period</th>
                                          <th>Change</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.map((r) => {
                                          const valid =
                                            typeof r.previous === 'number' &&
                                            typeof r.current === 'number';
                                          const delta = valid ? r.current - r.previous : null;
                                          return (
                                            <tr key={r.key}>
                                              <td>{r.label}</td>
                                              <td>{nf(r.previous)}</td>
                                              <td>{nf(r.current)}</td>
                                              <td>
                                                {delta === null
                                                  ? 'Not available'
                                                  : delta === 0
                                                    ? 'No change'
                                                    : `${delta > 0 ? '+' : '−'}${nf(Math.abs(delta))}`}
                                                {delta !== null &&
                                                  delta !== 0 &&
                                                  r.previous > 0 && (
                                                    <small className="comparison-percent">
                                                      {Math.abs((delta / r.previous) * 100) < 0.01
                                                        ? delta < 0
                                                          ? '<0.01% decrease'
                                                          : '<0.01% increase'
                                                        : `${nf((delta / r.previous) * 100)}%`}
                                                    </small>
                                                  )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                              {standalone.length > 0 && (
                                <div className="comparison-group">
                                  {typeof duplicateCount === 'number' && (
                                    <p className="comparison-takeaway">
                                      {duplicateCount > 0
                                        ? `${nf(duplicateCount)} extra records repeat purchases already recorded.`
                                        : 'No duplicate purchase records were found.'}
                                      {hasRevenueComparison &&
                                        ` Counting each purchase once reduces reported revenue by ${nf(rawRevenue - cleanRevenue)}.`}
                                    </p>
                                  )}
                                  <table className="finding-measurements">
                                    <thead>
                                      <tr>
                                        <th>Measurement</th>
                                        <th>Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {standalone.map((m: any) => (
                                        <tr
                                          key={JSON.stringify([m.evidenceId, m.rowIndex, m.field])}
                                        >
                                          <td>
                                            {metricLabels[m.field] || m.field.replaceAll('_', ' ')}
                                          </td>
                                          <td>{nf(m.value)}</td>
                                        </tr>
                                      ))}
                                      {hasRevenueComparison &&
                                        !standalone.some(
                                          (m: any) =>
                                            m.evidenceId === 'quality' &&
                                            m.field === 'duplicate_revenue',
                                        ) && (
                                          <tr>
                                            <td>Revenue counted more than once</td>
                                            <td>{nf(rawRevenue - cleanRevenue)}</td>
                                          </tr>
                                        )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {notes.length > 0 && (
                                <ul className="readable-findings">
                                  {notes.map((line, i) => (
                                    <li key={i}>{line}</li>
                                  ))}
                                </ul>
                              )}
                              <div className="live-citations">
                                {sources.map((id) => (
                                  <a href={'#evidence-' + id} key={id}>
                                    <Database size={12} />
                                    {id}
                                  </a>
                                ))}
                              </div>
                            </section>
                          );
                        })()}
                      {result.uncertainties?.length > 0 && (
                        <section className="finding">
                          <ShieldCheck size={20} />
                          <div>
                            <h3>Limits of this answer</h3>
                            <ul>
                              {result.uncertainties.map((u: string, i: number) => (
                                <li key={i}>{u}</li>
                              ))}
                            </ul>
                          </div>
                        </section>
                      )}
                      {result.recommendations?.length > 0 && (
                        <section className="next-step">
                          <h3>Recommended next steps</h3>
                          <ul>
                            {result.recommendations.map((r: string, i: number) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                          <button className="outline" onClick={() => prefs({ saved: !job.saved })}>
                            {job.saved ? 'Saved · Unsave' : 'Save recommendation'}
                          </button>
                        </section>
                      )}
                    </>
                  ) : (
                    !active && (
                      <p>
                        {job.error ||
                          'This investigation has stopped. Any collected evidence remains below.'}
                      </p>
                    )
                  )}
                  {evidence.length > 0 && (
                    <section className="live-evidence">
                      <h2>Supporting evidence</h2>
                      <p>
                        Real read-only queries over synthetic records. Open a check to inspect its
                        results and SQL.
                      </p>
                      {evidence.map((e: any) => (
                        <details id={'evidence-' + e.id} key={e.id}>
                          <summary>
                            <Database size={14} />
                            {e.label}
                            <span>{e.error ? 'Incomplete' : Math.round(e.durationMs) + ' ms'}</span>
                          </summary>
                          {e.error ? (
                            <p role="alert">{e.error}</p>
                          ) : (
                            <div className="table-scroll">
                              <table className="answer-table">
                                <thead>
                                  <tr>
                                    {Object.keys(e.rows[0] || {}).map((k) => (
                                      <th key={k}>{k.replaceAll('_', ' ')}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {e.rows.map((r: any, i: number) => (
                                    <tr key={i}>
                                      {Object.values(r).map((v: any, n: number) => (
                                        <td key={n}>{nf(v)}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <details>
                            <summary>Read-only SQL</summary>
                            <pre>{e.sql}</pre>
                            <p>Dataset parameter: {job.dataset}</p>
                          </details>
                        </details>
                      ))}
                    </section>
                  )}
                  <div className="answer-footer">
                    <button
                      aria-label="Copy answer"
                      disabled={!result}
                      onClick={() =>
                        navigator.clipboard
                          .writeText(result.headline + '\n' + result.summary)
                          .catch(() => setError('Copy unavailable. Use Export investigation.'))
                      }
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      aria-label="Helpful answer"
                      className={job.feedback === 'up' ? 'liked' : ''}
                      onClick={() => prefs({ feedback: 'up' })}
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      aria-label="Unhelpful answer"
                      className={job.feedback === 'down' ? 'liked' : ''}
                      onClick={() => prefs({ feedback: 'down' })}
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                  <details className="run-details">
                    <summary>Run details</summary>
                    <dl>
                      <div>
                        <dt>Model calls</dt>
                        <dd>{job.model_calls}</dd>
                      </div>
                      <div>
                        <dt>Database queries</dt>
                        <dd>{job.query_count}</dd>
                      </div>
                      <div>
                        <dt>Total tokens</dt>
                        <dd>{nf(Number(job.input_tokens) + Number(job.output_tokens))}</dd>
                      </div>
                    </dl>
                  </details>
                </>
              )}
            </div>
            {composer}
          </div>
        )}
        {page === 'data' && (
          <div className="page">
            <h1>Data & context</h1>
            <p className="lead">
              Connected synthetic warehouse and the definitions used in every investigation.
            </p>
            {context ? (
              <>
                <div className="source-banner">
                  <Database size={25} />
                  <div>
                    <h3>Northstar Retail warehouse</h3>
                    <p>
                      {context.engine} · {nf(context.totalRows)} order-event rows
                    </p>
                  </div>
                  <span className="neutral-tag">Connected · Read only</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Scenario</th>
                      <th>Records</th>
                      <th>First day</th>
                      <th>Last day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {context.datasets.map((d: any) => (
                      <tr key={d.dataset}>
                        <td>{d.dataset}</td>
                        <td>{nf(d.rows)}</td>
                        <td>{d.first_day}</td>
                        <td>{d.last_day}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h2>Business definitions</h2>
                <div className="context-grid">
                  {[
                    ['Revenue', context.context.revenue],
                    [
                      'Comparison windows',
                      context.context.previous + ' vs ' + context.context.current,
                    ],
                    [
                      'Timezone and currency',
                      context.context.timezone + ' · ' + context.context.currency,
                    ],
                    ['Campaign rules', context.context.rules.join(' ')],
                  ].map(([title, text]) => (
                    <div className="context-card" key={title}>
                      <FileText size={18} />
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>
                <h2>Available analytical checks</h2>
                <ul>
                  {context.catalog.map((q: any) => (
                    <li key={q.id}>{q.label}</li>
                  ))}
                </ul>
                <p className="muted">{context.scope}</p>
              </>
            ) : (
              <p>Loading connected sources…</p>
            )}
          </div>
        )}
        {page === 'scale' && (
          <div className="page">
            <h1>Performance lab</h1>
            <p className="lead">
              Measured results from this local deployment. Warehouse load tests are separate from
              full AI investigations.
            </p>
            {metrics && (
              <>
                <div className="metrics">
                  {[
                    ['Completed', metrics.completed + ' / ' + metrics.total],
                    [
                      'p95 end-to-end',
                      metrics.p95_seconds ? Math.round(metrics.p95_seconds) + ' s' : 'Not measured',
                    ],
                    ['Queue / Running', metrics.queued + ' / ' + metrics.running],
                  ].map(([label, value]) => (
                    <div className="metric" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <p>
                  {nf(metrics.input_tokens)} input tokens · {nf(metrics.output_tokens)} output
                  tokens · {metrics.model_calls} model requests
                </p>
                <p className="muted">{metrics.costNote}</p>
                <div className="lab-notice">
                  <FlaskConical size={20} />
                  <div>
                    <strong>Warehouse load test</strong>
                    <p>
                      30 queries with 10 concurrent clients over the seeded warehouse. No paid model
                      calls.
                    </p>
                    <button
                      className="outline"
                      disabled={benchmarking}
                      onClick={async () => {
                        setBenchmarking(true);
                        try {
                          await api('/benchmarks', { method: 'POST' });
                          setMetrics(await api('/metrics'));
                        } catch (e: any) {
                          setError(e.message);
                        } finally {
                          setBenchmarking(false);
                        }
                      }}
                    >
                      {benchmarking ? 'Running measured benchmark…' : 'Run warehouse benchmark'}
                    </button>
                  </div>
                </div>
                {metrics.benchmarks.map((b: any, i: number) => (
                  <section className="answer-section" key={i}>
                    <h3>{b.result.kind}</h3>
                    <p>{b.result.scope}</p>
                    {b.result.manualReviewNotes && (
                      <div className="finding">
                        <div>
                          <h3>Manual review found additional issues</h3>
                          <ul>
                            {b.result.manualReviewNotes.map((note: string, n: number) => (
                              <li key={n}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    {b.result.qualityCases ? (
                      <>
                        <p>
                          <strong>
                            {b.result.passed} / {b.result.total} scoped checks passed
                          </strong>
                        </p>
                        <table>
                          <thead>
                            <tr>
                              <th>Question variant</th>
                              <th>Run</th>
                              <th>Expected</th>
                              <th>Actual</th>
                              <th>Check</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.result.qualityCases.map((r: any) => (
                              <tr key={r.id}>
                                <td>
                                  <a
                                    href={'/?job=' + r.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      open(r.id);
                                    }}
                                  >
                                    {r.case}
                                  </a>
                                </td>
                                <td>{r.repeat}</td>
                                <td>{r.expected}</td>
                                <td>{r.actual}</td>
                                <td>{r.passed ? 'Passed' : 'Failed'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : b.result.runs ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Clients</th>
                            <th>Run</th>
                            <th>Queries</th>
                            <th>p95 incl. wait</th>
                            <th>Queries / s</th>
                            <th>Errors</th>
                          </tr>
                        </thead>
                        <tbody>
                          {b.result.runs.map((r: any) => (
                            <tr key={r.clients + '-' + r.repeat}>
                              <td>{r.clients}</td>
                              <td>{r.repeat}</td>
                              <td>{r.queries}</td>
                              <td>{nf(r.p95Ms)} ms</td>
                              <td>{r.throughput.toFixed(2)}</td>
                              <td>{r.errors}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : b.result.results ? (
                      <>
                        <table>
                          <thead>
                            <tr>
                              <th>Workers</th>
                              <th>Completed</th>
                              <th>Duration</th>
                              <th>Jobs / second</th>
                              <th>p95 wait</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.result.results.map((r: any) => (
                              <tr key={r.workers}>
                                <td>{r.workers}</td>
                                <td>
                                  {r.completed} / {r.jobs}
                                </td>
                                <td>{nf(r.elapsedMs)} ms</td>
                                <td>{r.throughputPerSecond.toFixed(2)}</td>
                                <td>{nf(r.p95WaitMs)} ms</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p>
                          <strong>{b.result.speedup.toFixed(2)}× throughput improvement</strong>{' '}
                          with three workers in this controlled workload.
                        </p>
                        <p>
                          Process crash recovery: {b.result.recovery.passed ? 'passed' : 'failed'} ·
                          saved evidence resumed · stale writes rejected ·{' '}
                          {nf(b.result.recovery.recoveryMs)} ms to recover.
                        </p>
                      </>
                    ) : b.result.jobs ? (
                      <table>
                        <tbody>
                          {[
                            ['Submitted investigations', b.result.jobs],
                            [
                              'Completed / partial',
                              b.result.completed + ' / ' + b.result.incomplete,
                            ],
                            [
                              'Peak running / queued',
                              b.result.peakRunning + ' / ' + b.result.peakQueued,
                            ],
                            ['p95 request acceptance', nf(b.result.p95AcceptMs) + ' ms'],
                            ['p95 queue wait', nf(b.result.p95WaitMs) + ' ms'],
                            ['p95 full investigation', nf(b.result.p95EndToEndMs) + ' ms'],
                            ['Model calls', b.result.modelCalls],
                            [
                              'Simultaneous model-call limit',
                              b.result.modelConcurrency ?? 'Not configured in this run',
                            ],
                            ['Answers with findings', b.result.usefulAnswers ?? 'Not measured'],
                            [
                              'Expected evidence checks passed',
                              b.result.expectedChecksPassed ?? 'Not measured',
                            ],
                            [
                              'Rejected numerical findings',
                              b.result.rejectedFindings ?? 'Not recorded',
                            ],
                            ['Execution errors', b.result.errors],
                            [
                              'Delayed-data safeguard',
                              b.result.delayedDataGatePassed ? 'Passed' : 'Failed',
                            ],
                          ].map(([k, v]) => (
                            <tr key={k}>
                              <td>{k}</td>
                              <td>{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table>
                        <tbody>
                          <tr>
                            <td>p95</td>
                            <td>{nf(b.result.p95Ms)} ms</td>
                          </tr>
                          <tr>
                            <td>Total duration</td>
                            <td>{nf(b.result.elapsedMs)} ms</td>
                          </tr>
                          <tr>
                            <td>Errors</td>
                            <td>{b.result.errors}</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                    <small>{new Date(b.at).toLocaleString()}</small>
                  </section>
                ))}
                <h2>Capacity boundaries</h2>
                <p>
                  API processes and configurable worker slots share one machine. This demonstrates
                  distribution and bounded concurrency, not million-user capacity. Evaluation
                  results are recorded by the test commands; answer accuracy is not inferred from
                  completion rate.
                </p>
              </>
            )}
          </div>
        )}
      </main>
      {drawer && (
        <>
          <div className="drawer-shade" onClick={() => setDrawer(false)} />
          <aside className="evidence" role="dialog" aria-modal="true" aria-label="Session context">
            <div className="card-heading">
              <h3>Session context</h3>
              <button autoFocus aria-label="Close session context" onClick={() => setDrawer(false)}>
                <X size={19} />
              </button>
            </div>
            <section className="context-section">
              <h3>Data</h3>
              <p>Northstar Retail · Synthetic warehouse</p>
              <p>{nf(context?.totalRows)} order-event rows</p>
              <p>Selected scenario: {job?.dataset || dataset}</p>
            </section>
            <section className="context-section">
              <h3>Business context</h3>
              <p>{context?.context.revenue}</p>
              <p>{context?.context.rules.join(' ')}</p>
            </section>
            <section className="context-section">
              <h3>Execution limits</h3>
              <p>{context?.limits.concurrentJobs} active investigations</p>
              <p>{context?.limits.modelCalls} model calls per investigation</p>
              <p>{context?.limits.deadlineSeconds} second deadline</p>
              <p>Model: {context?.model}</p>
            </section>
          </aside>
        </>
      )}
    </div>
  );
}
