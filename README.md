# Campaign Detective

A local React/TypeScript marketing investigation app. Ask a question, watch persisted progress, inspect warehouse evidence and SQL, and save or export the result. The interface is inspired by Hightouch's published product screenshots; this is an independent project.

## Run

Requires Node 22+, Docker, and a server-side OpenAI key in `.env.local` as `OPENAI_API_KEY`. Never put credentials in a Vite-prefixed variable. The ignored local environment file should have owner-only permissions.

```sh
npm install
npm run setup
npm run backend
# separate terminal
npm run dev
```

Open http://127.0.0.1:5176. The animated design is at `/system-design`; the earlier static walkthrough is at `/prototype`.

## Implementation

The loopback gateway distributes requests across three API processes. Creating an investigation inserts one durable Postgres row that serves as both its job record and queue entry. Three worker processes claim jobs with locking and a lease. They save checkpoints and use fencing tokens so an expired worker cannot overwrite a replacement's result. The browser polls the API for saved progress and answers.

Within each worker, an OpenAI Agents SDK planner selects checks, specialists interpret results, and a verifier reviews the explanation. The shared query runner executes only a fixed parameterized SQL catalog through a read-only database role. Models cannot run arbitrary SQL or change campaigns. Model tracing is disabled. The configured model defaults to gpt-4o-mini and can be changed through OPENAI_MODEL.

The synthetic warehouse has **one million order-event rows total**, split across three scenarios: inventory unavailability, late reporting, and duplicate events. The reporting manifest deliberately includes expected-but-not-yet-reported events so completeness can be independently checked. Revenue queries deduplicate order identifiers. Business context defines revenue, timezone and comparison windows.

A deterministic gate withholds a definitive sales-decline conclusion whenever reporting is incomplete. Citation and exact numerical-field checks reject certain unsupported claims; they do not prove every sentence correct or establish causation. The UI labels partial results and includes evidence for review.

## Limits and recovery

Three investigations run concurrently. Jobs have a four-minute deadline, at most ten model calls, bounded database queries and three worker attempts. Checkpoints allow retries to reuse saved evidence. Execution is at least once: an interrupted external call can still incur provider charges even if its result was not saved. Failed checks are incomplete, never silently treated as zero. Cancellation invalidates worker writes.

The warehouse and investigation store are separate schemas/roles in one local Postgres instance. This is a runnable local design, not a deployed highly available cluster. The development gateway has no health-based failover, authentication is not implemented, and the services bind to loopback. Multi-company access, autoscaling, sharding and public deployment are outside this version.

## Validation

```sh
npm run build
npm test
npx tsx scripts/evaluate.ts
```

The last command makes paid model calls for three scenarios and saves results in ignored `.runtime/evaluation.json`. It checks expected evidence, citations and incomplete-reporting behavior, not comprehensive semantic correctness. Tests cover the seed, read-only permissions, restricted query catalog, idempotency, fencing and completeness guard.

Performance Lab runs 30 real warehouse checks with ten concurrent clients and a four-connection pool. Its latency and errors are measured live. This is a database workload benchmark, **not** a claim of ten simultaneous full model investigations or million-user capacity. Actual model token counts are shown; dollar costs are not estimated without a pricing configuration.

An initial live evaluation found an overconfident delayed-data answer. That regression prompted the deterministic completeness gate and its dedicated test. Historical investigations remain in the local history; rerun them to use updated behavior.

## Scaling and recovery validation

```sh
npx tsx scripts/validation/run.ts
npx tsx scripts/validation/live.ts
```

The infrastructure test creates and removes its own isolated Postgres schema. It compares twelve jobs with one worker versus three workers, using real queue/storage/warehouse queries and a fixed 400 ms delay in place of model calls. It then kills a worker with SIGKILL after a checkpoint and verifies that a replacement resumes saved evidence after lease expiry and rejects a stale write. It does not interrupt application workers or mutate user investigations.

The live test submits six actual AI investigations concurrently through the gateway and samples their queue states every 100 ms. It records request acceptance, queue wait, full latency, token usage, rejected findings and partial answers separately. This command incurs model usage. It is a small capacity check, not a saturation benchmark or a guarantee of correctness.

Measured on this local machine: the controlled workload took 5.22 seconds with one worker and 2.00 seconds with three (2.62× throughput). Crash recovery completed in 1.96 seconds using a shortened test lease of 1.5 seconds; the application lease remains 30 seconds. The live six-job burst took 32.57 seconds, peaked at three running jobs, and had zero execution errors. Two answers completed; two were partial because of late reporting; two were withheld because numerical citations failed validation. This exposes a remaining answer-quality limitation rather than hiding it in a success rate. All measured records appear in Performance Lab and local JSON reports under `.runtime/`.

To repeat the warehouse concurrency sweep (no model calls):

```sh
npx tsx scripts/validation/warehouse-load.ts
```

This tests 10, 25, 50 and 100 concurrent clients, three times per level, with three catalog queries per client. The database connection pool stays at four, so extra clients wait for a connection. Reported latency includes that wait. Results are persisted in Performance Lab and `.runtime/warehouse-concurrency.json`. This increases demand, not database capacity; throughput may plateau while response times rise. It does not increase dataset size or establish production capacity. Repeated local queries can benefit from cache warming.

## Evidence-bound numerical answers

The agent selects fact identifiers instead of writing numerical values or calculating differences. The server builds those facts from successful query rows, attaches entity/period labels, resolves citations, and renders exact values. Final model prose containing numeric digits or unknown fact identifiers gets one bounded repair; unresolved invalid references or causal claims are withheld. If only model-written quantities remain, the affected prose fields are omitted and the valid selected measurements are retained; this does not promote an unsupported answer to completed. This avoids the earlier row/value mismatch but is not a semantic proof: models can still select irrelevant facts, misinterpret relationships, or fail to follow the output constraints. Partial answers remain explicit. Unverified specialist drafts are never published when execution fails.

## Real AI concurrency ramp

Worker processes now support multiple asynchronous investigation slots. For example, five processes with twenty slots each allow up to one hundred active investigations while retaining a global claim limit:

```sh
MAX_CONCURRENT_JOBS=100 WORKER_PROCESSES=5 WORKER_CONCURRENCY=20 npm run backend
# In another terminal; incurs real model usage:
npx tsx scripts/validation/ai-scale.ts 100
```

Stop the existing backend before starting another. Ramp through 10, 25, 50, then 100 and inspect saved results between stages. The validation script stores results before returning failure when any useful-answer or expected-evidence check fails. These checks cover three synthetic scenario families; their pass rate is not universal answer accuracy. A running investigation may be waiting on database or model I/O; one hundred active investigations does not imply one hundred model calls executing at every instant.

A fifty-job run exposed Postgres connection exhaustion. Application pools were reduced from twelve to four connections per process. With five worker processes and three API processes, the configured application pool budget is thirty-two and warehouse pools can use up to thirty-two more (including API benchmark connections). Additional deployment replicas need their own connection budgeting. The failed benchmark remains in history alongside its corrected retest.

The final hundred-investigation retest added a shared, leased model-call semaphore capped at twenty-five. Calls wait for capacity before consuming their per-job call budget. Leases expire after a process crash; calls have a shorter provider timeout, and no automatic provider retry is enabled. This is a concurrency cap, not a token-per-minute rate limiter.

That run reached one hundred active investigations and returned one hundred evidence-backed responses in 60.98 seconds, with zero execution failures, zero rejected fact references, and all one hundred passing the defined scenario-evidence checks. Thirty-seven were complete and sixty-three partial; p95 full latency was 54.33 seconds. This is one successful run over repeated questions in three synthetic scenario families, not a universal accuracy claim, broad question benchmark, or production capacity guarantee. The prior hundred-job run had five provider failures and remains visible. Numerical binding tests and live scenario checks do not establish semantic correctness of every sentence.

Research context: [PICARD](https://arxiv.org/abs/2109.05093) studies constrained decoding to reject invalid generated structures. Our fact-reference validator follows the related principle of restricting output to verifiable structures, but does not implement PICARD. [SGLang](https://arxiv.org/abs/2312.07104) studies efficient execution and reuse across structured model programs; its self-hosted cache optimizations are not part of this hosted-model application. Neither paper is evidence for our measured capacity; our saved local runs are that evidence.

### Interpreting partial answers

In the successful hundred-job run, the sixty-three partial responses comprised thirty-three delayed-data cases, twenty-nine inventory cases, and one duplicate-event case. The delayed-data responses intentionally withheld a full-period conclusion. Many inventory responses withheld causal claims or requested additional checks; some were overly cautious even when descriptive evidence was available. The metric called `usefulAnswers` in the raw report counts nonempty findings with evidence and no top-level execution error, not independently judged usefulness. The UI labels it **Answers with findings**. Expected-evidence checks likewise test citations/scenario handling, not every sentence's semantic truth.

Queue admission now performs capacity checking and insertion under one transaction lock, so simultaneous submissions cannot bypass the configured bound. Use `QUEUE_LIMIT=200 MAX_CONCURRENT_JOBS=200 WORKER_PROCESSES=5 WORKER_CONCURRENCY=40 MODEL_CONCURRENCY=25` for the two-hundred-job capacity test. Application and warehouse connection pool sizes stay fixed; additional investigations wait for model capacity.

The two-hundred-investigation test reached two hundred active jobs with twenty-five model calls allowed simultaneously. It finished in 95.86 seconds (p95 full latency 89.42 seconds), with zero execution/warehouse failures. One report was withheld by fact validation, so 199/200 passed the defined evidence checks; this run intentionally fails the all-cases quality gate. There were eighty complete and one hundred twenty partial responses: sixty-seven delayed-data, fifty-one inventory, and two duplicate-event cases. Partial output is not automatically a good answer. Results are saved in Performance Lab and `.runtime/ai-scale-200.json`.

### Answer scope and partial-answer evaluation

The planner now records the requested deliverable and distinguishes descriptive comparisons, causal explanations, data quality, completeness, and unavailable requests. A final scope review checks the answer against that deliverable, including whether missing evidence is actually missing. If it requests an available catalog check, the worker collects it and reviews again within the existing call/deadline budget. Forecasts outside the connected data remain incomplete. The UI explains why a new answer is partial.

Run the paid, repeated quality evaluation with:

```sh
npx tsx scripts/validation/answer-quality.ts
```

It asks eight question variants twice: inventory/revenue comparison, stock availability, revenue observation, duplicate counts, duplicate revenue diagnosis, delayed reporting, causal proof, and an unavailable forecast. It checks expected completion/abstention and evidence citations, plus numerical-prose and direct stockout-causality regressions. Results appear in Performance Lab and timestamped local reports. It is a narrow regression suite, not universal semantic accuracy.

Reviewing an initially passing status/citation run revealed unsupported causal wording and numbers spelled out in prose. The final validator now rejects number words as well as digits and a targeted direct-stockout-causality pattern, with a bounded repair. A broader model-generation regex caused incomplete provider responses and was reverted; the failed evaluation is retained. Generated prose retains a simple digit constraint, while fact IDs are resolved by code. These guards do not detect every paraphrase, number expression, or semantic mistake. Final model review checks the full answer, but still needs broader evaluation and human review.

The deterministic regression suite now contains thirty-four passing tests, including scope-review follow-up queries, unavailable forecasts, number-word bypasses, direct stockout-causality wording, and safe retention of verified measurements when numerical prose is removed.

When a descriptive answer remains unsupported despite successful checks, a bounded evidence-coverage assessment decides whether the exact requested values and periods are present. If so, the server constructs an observations-only answer from its validated selected fact IDs instead of retaining speculative prose. Invalid references or a missing requirement cannot promote completion. This assessment is still model-based; deterministic binding validates values and provenance, not whether every selected fact fully answers an arbitrary question. The added review calls can change latency and cost; the earlier two-hundred-job result predates these quality changes; see the post-quality-change retest below for current measurements.

The final local repeat passed all 16 defined checks: 10 descriptive/data-quality answers completed and 6 delayed-data/causal-proof/unavailable-forecast answers remained incomplete, with zero execution errors. Both repeats of the original inventory comparison completed. Earlier failed runs remain recorded. This is a development regression set used to improve the implementation, not a held-out accuracy benchmark; broader unseen questions and independently judged usefulness remain unproven.

### Post-quality-change load retest

The updated implementation reached 200 active investigations with model calls capped at 25. All 200 passed the defined scenario-evidence checks: 133 completed, and all 67 delayed-reporting cases remained incomplete. There were no execution/warehouse errors or withheld reports. Total duration was 149.50 seconds and p95 end-to-end latency was 137.04 seconds, with 948 model calls. This supersedes the earlier load result for the current quality flow. It still uses repeated questions from three synthetic scenario families, not two hundred distinct unseen questions or a semantic-accuracy guarantee.

The separate unseen-question sanity check is reproducible with `npx tsx scripts/validation/sanity-check.ts` (paid model calls). Its ten questions were frozen before execution and were not used to tune this implementation. In particular, it includes a mature-weekday comparison inside the delayed-data scenario to probe the completeness gate's scope.

The unseen-question run passed 9/10 automated status/evidence checks with zero execution errors. Manual review found additional defects, recorded prominently in Performance Lab: the completeness gate blocks a valid mature-weekday comparison; a caveat contradicts missing-data evidence; the customer-segment narrative reverses the direction of new-customer order counts; an answer invents inventory replenishment events; and superscript numerical characters bypass the ASCII digit/number-word prose guard. The last defect did not change the observed counts in that answer, but violates the intended binding boundary. These findings were unfixed at that test-only checkpoint; the subsequent remediation is described below. The 9/10 score must not be presented as semantic accuracy or demo-readiness.

The frontend now handles empty/unreadable server responses with a readable connection message and clears that message after a successful response, instead of retaining a raw JSON parser error following a backend restart.

### Scope-aware, evidence-rendered answers

Published factual text now comes from code, not free-form model prose. Models still plan, select checks, review evidence coverage, and select fact IDs. After reference validation, the renderer emits exact measurements and computes increased/decreased/unchanged comparisons from matching entity, metric, and period values. It includes a matching baseline when available. Model-written headlines, explanations, recommendations and caveats do not pass through into the final factual answer. Causal requests receive an observations-only explanation and remain incomplete; unsupported requests retain an explicit limitation. This trades open-ended narrative for a narrower, auditable answer format.

The completeness exception requires an explicit weekday-only request, successful aligned-query evidence, a reporting manifest, and no pending weekday records. The existing aligned query covers whole-store totals; entity-specific weekday requests cannot claim that aggregate as an entity result. Ordinary questions cannot be silently narrowed by the planner. Replacement completeness answers discard older caveats. The numerical prose validator also recognizes Unicode numeric forms, although published factual prose no longer depends on model phrasing.

Forty-three automated tests pass, including increased/decreased comparisons, paired baselines, stale-caveat removal, Unicode quantities, explicit scope authorization, and missing scoped evidence. The earlier two-hundred-request measurement predates this final rendering/scope change. These controls do not prove the model selected every relevant fact or interpreted every possible user question correctly; the query catalog and date scopes remain bounded.

After these fixes, the ten-question sanity suite passed 10/10 and the repeated eight-variant suite passed 16/16, both with zero execution errors. The weekday-only answer completed while full-period delayed-data questions remained incomplete. Review of published outputs confirmed the earlier contradictory caveats and invented replenishment narrative were absent. These are now development regression cases, not fresh unseen accuracy measurements. Forty-three automated tests and the production build also passed.

### Final-version 200-investigation rerun

After the scope-aware, evidence-rendered answer fixes, the same three-family workload was rerun with 200 worker slots and a global cap of 25 model calls. All 200 defined scenario checks passed: 133 completed, 67 expected delayed-data partial answers, zero execution/warehouse errors, and zero withheld reports. Peak active investigations reached 200. Total time was 123.21 seconds; p95 end-to-end time was 114.98 seconds. This is a repeated workload against the local million-row synthetic PostgreSQL dataset, not 200 distinct questions or proof of universal accuracy. Results are recorded in Performance Lab and `.runtime/ai-scale-200.json`. The normal local configuration was restored to 25 investigation slots afterward.
