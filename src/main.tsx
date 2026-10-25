import LiveApp from './LiveApp';
import SystemDesign from './SystemDesign';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sparkles,
  House,
  MessageSquare,
  ChartNoAxesCombined,
  Database,
  Settings,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Check,
  CircleCheck,
  ArrowUpRight,
  Paperclip,
  Copy,
  ThumbsUp,
  ThumbsDown,
  X,
  FileText,
  FlaskConical,
  Clock3,
  Layers,
  ShieldCheck,
  Download,
  Menu,
  Snowflake,
  Image,
  Upload,
  Ellipsis,
  CircleArrowUp,
} from 'lucide-react';
import './styles.css';
import './hightouch-components.css';

type View = 'chat' | 'new' | 'data' | 'scale' | 'settings';
const scenarios = [
  {
    title: 'Why did campaign revenue drop?',
    short: 'Campaign revenue investigation',
    answer: 'The decline is concentrated in one campaign. Inventory is the strongest explanation.',
    detail:
      'The Alpine Jacket campaign accounts for 82% of the revenue decline. Its featured product went out of stock on October 19, while ad spend remained steady. Other campaigns stayed close to their previous-week performance.',
    tag: 'Inventory constraint',
    metric: '−28.4%',
    action: 'Review the Alpine Jacket campaign',
    suggestion:
      'Consider pausing ads for the unavailable jacket and shifting creative toward in-stock products. Confirm replenishment timing with the inventory team first.',
  },
  {
    title: 'Is this a real decline or delayed data?',
    short: 'Conversion reporting delay',
    answer: 'Recent conversion data is incomplete. A budget change would be premature.',
    detail:
      'The last two days contain fewer reported purchases, but order ingestion is running 36 hours behind. Comparing equally mature reporting windows reduces the apparent decline to 2.1%.',
    tag: 'Incomplete reporting',
    metric: '−2.1%',
    action: 'Recheck after the reporting window closes',
    suggestion:
      'Keep the current campaign settings while the delayed orders arrive. Revisit the same comparison once both periods have complete data.',
  },
  {
    title: 'Are duplicate purchases inflating revenue?',
    short: 'Purchase data quality check',
    answer: 'Repeated purchase events are overstating campaign revenue.',
    detail:
      'The sample event stream contains repeated order identifiers from a retrying integration. Deduplicating by order ID reduces reported revenue by 12.6%; the underlying order ledger reconciles after this adjustment.',
    tag: 'Duplicate events',
    metric: '−12.6%',
    action: 'Review the purchase-event integration',
    suggestion:
      'Use deduplicated orders for this analysis and inspect the integration retry behavior before making campaign decisions.',
  },
];
function Mark() {
  return <Search size={21} strokeWidth={1.8} aria-hidden="true" />;
}
function App() {
  const [view, setView] = useState<View>('new');
  const [scenario, setScenario] = useState(0);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [evidence, setEvidence] = useState(false);
  const [trace, setTrace] = useState(false);
  const [notice, setNotice] = useState('');
  const [mobile, setMobile] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState<number[]>([]);
  const s = scenarios[scenario];
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEvidence(false);
        setMobile(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const toast = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3500);
  };
  const open = (i: number) => {
    setScenario(i);
    setView('chat');
    setEvidence(false);
    setMobile(false);
    setFeedback('');
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const q = query.toLowerCase();
    open(q.includes('duplic') ? 2 : q.includes('delay') || q.includes('late') ? 1 : 0);
    setQuery('');
    toast('Static preview: showing a prepared sample investigation.');
  };
  const exportReport = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob(
        [
          `CAMPAIGN DETECTIVE — SAMPLE REPORT\nSynthetic data · Static prototype\n\n${s.title}\n\n${s.answer}\n${s.detail}\n\nSuggested next step\n${s.suggestion}`,
        ],
        { type: 'text/plain' },
      ),
    );
    a.download = 'sample-investigation.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div
      className={
        'app' +
        (navCollapsed ? ' nav-collapsed' : '') +
        (historyCollapsed ? ' history-collapsed' : '')
      }
    >
      <aside className={'primary ' + (mobile ? 'mobile-open' : '')}>
        <div className="brand">
          <Mark />
          <strong>Campaign Detective</strong>
          <button
            className="collapse-nav"
            title="Collapse navigation"
            aria-label="Collapse navigation"
            aria-expanded={!navCollapsed}
            onClick={() => setNavCollapsed(true)}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <button
          className="workspace"
          onClick={() => toast('Northstar Retail is the sample workspace.')}
        >
          <span>Northstar Retail</span>
          <ChevronsUpDown size={13} />
        </button>
        <nav>
          <button
            className={view === 'chat' || view === 'new' ? 'active' : ''}
            onClick={() => setView('new')}
          >
            <Sparkles />
            Agents
          </button>
          <div className="subnav">
            <button
              className={view === 'chat' || view === 'new' ? 'selected' : ''}
              onClick={() => setView('new')}
            >
              Chats
            </button>
          </div>
          <button className={view === 'data' ? 'active' : ''} onClick={() => setView('data')}>
            <Database />
            Data & context
          </button>
          <button className={view === 'scale' ? 'active' : ''} onClick={() => setView('scale')}>
            <ChartNoAxesCombined />
            Performance lab
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar user">H</span>
            <div>
              Haruna Oseni<small>Personal workspace</small>
            </div>
            <ChevronsUpDown size={13} />
          </div>
        </div>
      </aside>
      <aside className="history">
        <div className="history-heading">
          Chats <span>3</span>
          <button
            className="collapse-history"
            title="Collapse chat history"
            aria-label="Collapse chat history"
            aria-expanded={!historyCollapsed}
            onClick={() => setHistoryCollapsed(true)}
          >
            <PanelLeftClose size={16} />
          </button>
          <button title="New chat" onClick={() => setView('new')}>
            <Plus size={17} />
          </button>
        </div>
        <button className="new-chat" onClick={() => setView('new')}>
          <Plus size={15} />
          New chat
        </button>
        <label className="search">
          <Search size={14} />
          <input
            aria-label="Search investigations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
          />
        </label>
        <p className="nav-label">TODAY</p>
        {scenarios
          .filter((x) => x.short.toLowerCase().includes(search.toLowerCase()))
          .map((x) => {
            const i = scenarios.indexOf(x);
            return (
              <button
                key={x.short}
                className={'chat-item ' + (view === 'chat' && scenario === i ? 'current' : '')}
                onClick={() => open(i)}
              >
                <MessageSquare size={14} />
                <span>
                  {x.short}
                  <small>{i === 0 ? '10:42 AM' : i === 1 ? '9:18 AM' : '8:56 AM'}</small>
                </span>
              </button>
            );
          })}
        {search && !scenarios.some((x) => x.short.toLowerCase().includes(search.toLowerCase())) && (
          <div className="empty-search">
            No matching chats.<button onClick={() => setSearch('')}>Clear search</button>
          </div>
        )}
      </aside>
      <main>
        <header>
          <div>
            {navCollapsed && (
              <button
                className="restore-nav"
                title="Expand navigation"
                aria-label="Expand navigation"
                aria-expanded="false"
                onClick={() => setNavCollapsed(false)}
              >
                <PanelLeftOpen size={17} />
              </button>
            )}
            {historyCollapsed && (
              <button
                className="restore-history"
                title="Expand chat history"
                aria-label="Expand chat history"
                aria-expanded="false"
                onClick={() => setHistoryCollapsed(false)}
              >
                <MessageSquare size={17} />
              </button>
            )}
            <button
              className="mobile-toggle"
              onClick={() => setMobile(!mobile)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <span className="breadcrumb">Agents</span>
            <ChevronRight size={13} />
            <strong>
              {view === 'chat'
                ? s.short
                : view === 'new'
                  ? 'New chat'
                  : view === 'data'
                    ? 'Data & context'
                    : view === 'scale'
                      ? 'Performance lab'
                      : 'Settings'}
            </strong>
          </div>
          <div>
            <button className="header-context" onClick={() => setEvidence(!evidence)}>
              <FileText size={15} />
              Show context
            </button>
            {view === 'chat' && (
              <button
                className="icon-button"
                aria-label="Export sample report"
                onClick={exportReport}
              >
                <Download size={16} />
              </button>
            )}
          </div>
        </header>
        {view === 'chat' ? (
          <div className="conversation">
            <div className="conversation-body">
              <div className="user-message">
                <span>
                  {s.title}
                  <small>Compare this week with last week and show me what changed.</small>
                </span>
              </div>
              <div className="assistant-label">
                <span className="spark-icon">
                  <Sparkles size={18} />
                </span>
                <strong>Campaign Detective</strong>
                <span>Sample analysis</span>
              </div>
              <button className="trace-toggle" onClick={() => setTrace(!trace)}>
                <CircleCheck size={15} />
                <span>Investigation complete · 5 checks</span>
                <ChevronDown size={14} className={trace ? 'rotate' : ''} />
              </button>
              {trace && (
                <div className="trace">
                  {[
                    'Checked data freshness and reporting windows',
                    'Compared revenue and spend by campaign',
                    'Inspected inventory and product availability',
                    'Tested alternative explanations',
                    'Verified totals against order records',
                  ].map((t) => (
                    <div key={t}>
                      <Check size={13} />
                      {t}
                    </div>
                  ))}
                </div>
              )}
              <h1>
                {scenario === 0
                  ? 'Campaign Revenue Investigation'
                  : scenario === 1
                    ? 'Conversion Reporting Analysis'
                    : 'Purchase Data Quality Analysis'}
              </h1>
              <p className="lead">{s.detail}</p>
              <div className="metrics">
                <Metric
                  title="Campaign revenue"
                  value={scenario === 0 ? '$38,420' : scenario === 1 ? '$52,532' : '$46,032'}
                  change={s.metric}
                  note={scenario === 1 ? 'after window alignment' : 'vs. previous period'}
                />
                <Metric
                  title="Ad spend"
                  value="$12,800"
                  change="+0.8%"
                  note="vs. previous period"
                  neutral
                />
                <Metric
                  title="Return on ad spend"
                  value={scenario === 0 ? '3.00×' : '4.10×'}
                  change={scenario === 0 ? '−29.0%' : 'Adjusted'}
                  note="revenue ÷ ad spend"
                  neutral={scenario !== 0}
                />
              </div>
              <div className="answer-section">
                <h2>
                  {scenario === 0
                    ? 'Finding 1: Revenue decline is concentrated in the Alpine Jacket campaign'
                    : s.tag}
                </h2>
                <p>
                  <strong>What changed:</strong> {s.answer}
                </p>
                <p>
                  <strong>Why this matters:</strong>{' '}
                  {scenario === 0
                    ? 'Ad spend is nearly unchanged, but the advertised product is no longer available. Check product availability before changing the overall marketing budget.'
                    : s.suggestion}
                </p>
                <table className="answer-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Previous period</th>
                      <th>Current period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scenario === 0
                      ? [
                          ['Alpine Jacket revenue', '$18,600', '$6,100'],
                          ['Other campaign revenue', '$35,060', '$32,320'],
                          ['Total ad spend', '$12,700', '$12,800'],
                          ['Alpine Jacket availability', 'In stock', 'Out of stock'],
                        ]
                      : scenario === 1
                        ? [
                            ['Reporting delay', 'Complete', '36 hours'],
                            ['Aligned revenue change', 'Baseline', '−2.1%'],
                            ['Comparison windows', 'Mature', 'Mature'],
                          ]
                        : [
                            ['Purchase events', 'Raw stream', 'Duplicates detected'],
                            ['Revenue adjustment', 'Unadjusted', '−12.6%'],
                            ['Order identifier', 'Repeated', 'Deduplicated'],
                          ]
                    ).map((r) => (
                      <tr key={r[0]}>
                        {r.map((v) => (
                          <td key={v}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="chart-card">
                <div className="card-heading">
                  <div>
                    <h3>Revenue & advertising spend</h3>
                    <p>Daily totals · October 12–25, 2026 · Sample data</p>
                  </div>
                  <button className="subtle" onClick={() => setEvidence(true)}>
                    View data <ArrowUpRight size={13} />
                  </button>
                </div>
                <div className="legend">
                  <span>
                    <i className="teal" />
                    Campaign revenue
                  </span>
                  <span>
                    <i className="gray" />
                    Ad spend
                  </span>
                </div>
                <Chart variant={scenario} />
                <div className="chart-note">
                  <span className="dot" />
                  {scenario === 0
                    ? 'October 19: Alpine Jacket inventory reaches zero'
                    : scenario === 1
                      ? 'Recent dates excluded until conversion reporting is complete'
                      : 'Revenue shown after duplicate order IDs are removed'}
                </div>
              </div>
              <div className="finding">
                <div className="finding-icon">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <h3>{s.tag}</h3>
                  <p>
                    {scenario === 0
                      ? 'The timing and campaign breakdown support an inventory-related explanation. They do not establish the causal effect of any future budget change.'
                      : scenario === 1
                        ? 'A reporting delay can explain the apparent drop. Wait for complete data before interpreting recent performance.'
                        : 'Event totals and unique-order totals disagree. Resolve the discrepancy before evaluating campaign performance.'}
                  </p>
                  <button className="text-button" onClick={() => setEvidence(true)}>
                    Explore supporting evidence <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
              <div className="next-step">
                <div className="card-heading">
                  <span>Recommended next step</span>
                  <span className="review-tag">For your review</span>
                </div>
                <h3>{s.action}</h3>
                <p>{s.suggestion}</p>
                <button
                  className="outline"
                  onClick={() => {
                    setSaved([...new Set([...saved, scenario])]);
                    toast('Saved to this preview session. No campaign changes were made.');
                  }}
                >
                  <Plus size={14} />
                  {saved.includes(scenario) ? 'Recommendation saved' : 'Save recommendation'}
                </button>
              </div>
              <div className="answer-footer">
                <button
                  aria-label="Copy answer"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(s.answer + '\n' + s.detail)
                      .then(() => toast('Answer copied.'))
                      .catch(() => toast('Use Export report to save the answer.'));
                  }}
                >
                  <Copy size={14} />
                </button>
                <button
                  className={feedback === 'up' ? 'liked' : ''}
                  aria-label="Helpful answer"
                  onClick={() => setFeedback('up')}
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  className={feedback === 'down' ? 'liked' : ''}
                  aria-label="Unhelpful answer"
                  onClick={() => setFeedback('down')}
                >
                  <ThumbsDown size={14} />
                </button>
                <span>Based on 4 sample sources</span>
                <button className="source-chip" onClick={() => setEvidence(true)}>
                  <Database size={12} />
                  Northstar warehouse <ArrowUpRight size={11} />
                </button>
              </div>
            </div>
            <Composer query={query} setQuery={setQuery} submit={submit} />
          </div>
        ) : view === 'new' ? (
          <div className="welcome">
            <div className="welcome-center">
              <div className="welcome-heading">
                <span className="large-spark">
                  <Sparkles size={36} fill="currentColor" strokeWidth={1} />
                </span>
                <h1>Let’s discover something new.</h1>
              </div>
              <div className="prompt-cards">
                {scenarios.map((x, i) => (
                  <button key={x.title} onClick={() => open(i)}>
                    <span>
                      <Snowflake size={23} />
                    </span>
                    {x.title}
                  </button>
                ))}
              </div>
              <Composer query={query} setQuery={setQuery} submit={submit} />
            </div>
          </div>
        ) : view === 'data' ? (
          <div className="page">
            <div className="eyebrow">WORKSPACE CONTEXT</div>
            <h1>Data & context</h1>
            <p className="lead">
              The sample sources and business definitions behind each investigation.
            </p>
            <div className="source-banner">
              <span className="db-icon">
                <Database size={25} />
              </span>
              <div>
                <h3>Northstar Retail warehouse</h3>
                <p>Synthetic retail environment · Schema preview</p>
              </div>
              <span className="preview-pill">Not connected</span>
            </div>
            <h3 className="section-title">
              Data sources <span>4 tables</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Contains</th>
                  <th>Planned scale</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['orders', 'Purchases, revenue, refunds', '500,000'],
                  ['ad_events', 'Campaigns, clicks, spend', '1,000,000'],
                  ['inventory', 'SKU availability over time', '25,000'],
                  ['customers', 'Customer profiles & segments', '100,000'],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td>
                      <Database size={15} />
                      {r[0]}
                    </td>
                    <td>{r[1]}</td>
                    <td>{r[2]}</td>
                    <td>
                      <span className="neutral-tag">Planned</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="section-title">Business context</h3>
            <div className="context-grid">
              {[
                [
                  'Revenue definition',
                  'Completed orders, net of refunds. Excludes tax and shipping.',
                ],
                [
                  'Reporting window',
                  'Compare matching weekdays. Allow 48 hours for conversions to arrive.',
                ],
                [
                  'Campaign guidelines',
                  'Do not recommend ads for out-of-stock products. Changes require review.',
                ],
              ].map(([a, b]) => (
                <div className="context-card" key={a}>
                  <FileText size={18} />
                  <h3>{a}</h3>
                  <p>{b}</p>
                </div>
              ))}
            </div>
          </div>
        ) : view === 'scale' ? (
          <div className="page">
            <div className="eyebrow">PERFORMANCE LAB</div>
            <h1>Performance lab</h1>
            <p className="lead">
              A preview of how we’ll measure accuracy, speed, and cost as datasets and concurrent
              usage grow.
            </p>
            <div className="lab-notice">
              <FlaskConical size={18} />
              <div>
                <strong>Benchmark runs haven’t started.</strong>
                <p>This is the evaluation interface. No performance results are claimed.</p>
              </div>
            </div>
            <div className="metrics">
              <Metric title="Dataset sizes" value="100K → 1M" note="planned records per test" />
              <Metric title="Concurrent users" value="1 → 25" note="planned load levels" />
              <Metric title="Evaluation cases" value="20" note="planned investigation scenarios" />
            </div>
            <h3 className="section-title">Benchmark matrix</h3>
            <table>
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Concurrent users</th>
                  <th>p95 response</th>
                  <th>Accuracy</th>
                  <th>Cost / query</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['100,000', '1'],
                  ['500,000', '5'],
                  ['1,000,000', '10'],
                  ['1,000,000', '25'],
                ].map((r, i) => (
                  <tr key={i}>
                    <td>{r[0]} records</td>
                    <td>{r[1]}</td>
                    <td className="muted">Not run</td>
                    <td className="muted">Not run</td>
                    <td className="muted">Not run</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="context-grid">
              {[
                ['Correctness', 'Check findings against known answers and held-out scenarios.'],
                [
                  'Reliability',
                  'Test query limits, interrupted investigations, and simultaneous requests.',
                ],
                [
                  'Efficiency',
                  'Measure database time, end-to-end latency, and model cost separately.',
                ],
              ].map(([a, b]) => (
                <div className="context-card" key={a}>
                  <ShieldCheck size={19} />
                  <h3>{a}</h3>
                  <p>{b}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="page">
            <div className="eyebrow">PREFERENCES</div>
            <h1>Workspace settings</h1>
            <p className="lead">Manage your workspace and investigation preferences.</p>
            <div className="settings-card">
              {[
                ['Workspace', 'Northstar Retail'],
                ['Mode', 'Static prototype'],
                ['Data', 'Synthetic examples only'],
                ['AI provider', 'Not connected'],
                ['Campaign actions', 'Review only'],
                ['Built by', 'Haruna Oseni'],
              ].map(([a, b]) => (
                <div key={a}>
                  <span>{a}</span>
                  <strong>{b}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      {evidence && (
        <>
          <div className="drawer-shade" onClick={() => setEvidence(false)} aria-hidden="true" />
          <aside className="evidence" role="dialog" aria-modal="true" aria-label="Session context">
            <div className="card-heading">
              <h3>
                <FileText size={19} />
                Session context
              </h3>
              <button
                autoFocus
                aria-label="Close session context"
                onClick={() => setEvidence(false)}
              >
                <X size={19} />
              </button>
            </div>
            <section className="context-section">
              <h3>
                Data <span>4</span>
              </h3>
              {['Customers', 'Orders', 'Campaign performance', 'Product inventory'].map((t) => (
                <button key={t} onClick={() => toast(t + ': synthetic demo source.')}>
                  <Snowflake size={21} />
                  {t}
                </button>
              ))}
            </section>
            <section className="context-section">
              <h3>
                Context <span>3</span>
              </h3>
              {['Business Context', 'Campaign Guidelines', 'Northstar Product Catalog'].map((t) => (
                <button
                  key={t}
                  onClick={() => toast(t + ': prepared business context for this prototype.')}
                >
                  <FileText size={17} />
                  {t}
                </button>
              ))}
            </section>
            <section className="context-section">
              <h3>
                Definitions <span>4</span>
              </h3>
              {[
                ['Net campaign revenue', 'Verified'],
                ['Reporting window', 'Verified'],
                ['Inventory-related decline', 'Assumed'],
                ['Campaign attribution', 'Assumed'],
              ].map(([a, b]) => (
                <button
                  key={a}
                  onClick={() => toast(a + ': example definition, not a live verification.')}
                >
                  <span className={'definition-icon ' + b.toLowerCase()}>
                    {b === 'Verified' ? <Check size={15} /> : '?'}
                  </span>
                  <span>{a}</span>
                  <small className={b.toLowerCase()}>{b}</small>
                </button>
              ))}
            </section>
          </aside>
        </>
      )}
      {notice && (
        <div className="toast" role="status">
          <CircleCheck size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}
function Metric({
  title,
  value,
  change,
  note,
  neutral = false,
}: {
  title: string;
  value: string;
  change?: string;
  note: string;
  neutral?: boolean;
}) {
  return (
    <div className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>
        {change && <b className={neutral ? 'neutral' : 'negative'}>{change}</b>}
        {note}
      </small>
    </div>
  );
}
function Composer({
  query,
  setQuery,
  submit,
}: {
  query: string;
  setQuery: (s: string) => void;
  submit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="composer-wrap">
      <form className="composer" onSubmit={submit}>
        <input
          aria-label="Ask a marketing question"
          placeholder="Ask anything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div>
          <label className="composer-model">
            <Snowflake size={17} />
            <select aria-label="Customer data model" defaultValue="retail">
              <option value="retail">Retail Customers</option>
            </select>
            <ChevronsUpDown size={14} />
          </label>
          <button
            type="submit"
            aria-label="Send question"
            title="Send question"
            disabled={!query.trim()}
          >
            <CircleArrowUp size={18} />
          </button>
        </div>
      </form>
      <p role="status">AI can make mistakes. Review findings before taking action.</p>
    </div>
  );
}

function Chart({ variant }: { variant: number }) {
  return (
    <svg
      className="chart"
      viewBox="0 0 720 210"
      role="img"
      aria-label="Illustrative daily revenue and advertising spend chart"
    >
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#268778" stopOpacity=".14" />
          <stop offset="1" stopColor="#268778" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 75, 120, 165].map((y, i) => (
        <g key={y}>
          <line x1="48" x2="704" y1={y} y2={y} stroke="#edf0ef" strokeDasharray="3 4" />
          <text x="0" y={y + 4} fill="#929997" fontSize="10">
            ${6 - i * 2}k
          </text>
        </g>
      ))}
      <path
        d={
          variant === 0
            ? 'M48 57 L98 48 L148 63 L198 39 L248 54 L298 44 L348 56 L398 85 L448 104 L498 117 L548 112 L598 128 L648 122 L698 130 L698 165 L48 165 Z'
            : 'M48 57 L98 48 L148 63 L198 39 L248 54 L298 44 L348 56 L398 53 L448 65 L498 57 L548 66 L598 60 L648 68 L698 64 L698 165 L48 165 Z'
        }
        fill="url(#fill)"
      />
      <path
        d={
          variant === 0
            ? 'M48 57 L98 48 L148 63 L198 39 L248 54 L298 44 L348 56 L398 85 L448 104 L498 117 L548 112 L598 128 L648 122 L698 130'
            : 'M48 57 L98 48 L148 63 L198 39 L248 54 L298 44 L348 56 L398 53 L448 65 L498 57 L548 66 L598 60 L648 68 L698 64'
        }
        fill="none"
        stroke="#268778"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M48 143 L98 141 L148 144 L198 140 L248 143 L298 142 L348 141 L398 143 L448 140 L498 142 L548 141 L598 144 L648 142 L698 140"
        fill="none"
        stroke="#9ca6a3"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      <line x1="398" x2="398" y1="20" y2="165" stroke="#a1b9b1" strokeDasharray="3 4" />
      <rect x="345" y="3" width="106" height="22" rx="5" fill="#eef5f1" />
      <text x="398" y="18" textAnchor="middle" fill="#54766a" fontSize="10">
        {variant === 0 ? 'Out of stock' : variant === 1 ? 'Aligned windows' : 'Deduplicated'}
      </text>
      {['Oct 12', 'Oct 14', 'Oct 16', 'Oct 18', 'Oct 20', 'Oct 22', 'Oct 25'].map((d, i) => (
        <text
          key={d}
          x={48 + i * 108}
          y="193"
          textAnchor={i === 6 ? 'end' : 'start'}
          fill="#929997"
          fontSize="10"
        >
          {d}
        </text>
      ))}
    </svg>
  );
}
createRoot(document.getElementById('root')!).render(
  window.location.pathname === '/system-design' ? (
    <SystemDesign />
  ) : window.location.pathname === '/prototype' ? (
    <App />
  ) : (
    <LiveApp />
  ),
);
