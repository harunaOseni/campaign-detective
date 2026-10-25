# Campaign Detective

An AI marketing investigator that answers questions with warehouse evidence. Explore stockouts, delayed reporting, and duplicate purchases across one million synthetic order-event records.

Built with React, TypeScript, Node.js/Express, PostgreSQL, and the OpenAI Agents SDK. Independent project inspired by Hightouch’s published interface.

## Run locally

Requires Node.js 22+, Docker running, and an OpenAI API key.

1. Add `OPENAI_API_KEY=your-key` to `.env.local` (Git-ignored). Model calls use your API credits.
2. Run:

```sh
npm install
npm run setup
npm run backend
```

In another terminal:

```sh
npm run dev
```

Open [the app](http://127.0.0.1:5176/) or [the system design](http://127.0.0.1:5176/system-design).

## Try it

Choose the matching scenario in Chats:

- **Inventory:** “Compare Alpine Jacket revenue and stock availability between the previous week and the current week.”
- **Reporting delay:** “Is the revenue decline real, or are sales records missing?”
- **Duplicate events:** “Compare total revenue before and after removing duplicate purchases.”

## How it works

Requests pass through a local load balancer to API servers, a durable PostgreSQL queue, and workers. Each investigation follows **planner → read-only queries → specialists → verifier**. Workers save progress; the app polls for updates. Code renders numerical claims from evidence, with bounded retries and execution limits.

## Validation

- **43 automated tests** and **26 live regression checks** passed.
- **200 concurrent investigations** finished in **123 seconds**: 133 complete answers, 67 expected delayed-data partial answers, and zero execution failures.
- The load test repeated three question patterns on local PostgreSQL, with 25 simultaneous model calls. It demonstrates this workload, not universal accuracy or production capacity.

```sh
npm test
npm run build
```

This is a local demo with synthetic data and no authentication. Public deployment is not configured.
