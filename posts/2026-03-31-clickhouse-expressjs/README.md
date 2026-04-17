# How to Use ClickHouse with Express.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Express, Node, JavaScript, TypeScript, Analytics, Database

Description: Connect Express.js to ClickHouse using the official Node.js client, build analytics routes with parameterized queries, stream large result sets, and handle errors properly.

---

Express.js is the most widely used Node.js web framework. ClickHouse provides an official `@clickhouse/client` package for Node.js, with full TypeScript types, streaming, and async/await. (A separate `@clickhouse/client-web` package is available for browsers, Cloudflare Workers, and other Web-Streams environments.) This guide walks through building a production-ready analytics API with Express and ClickHouse.

## Installation

```bash
npm install express @clickhouse/client
npm install --save-dev typescript @types/express ts-node
```

## Project Structure

```text
src/
  app.ts
  clickhouse.ts
  routes/
    events.ts
    analytics.ts
  types.ts
tsconfig.json
package.json
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

## ClickHouse Client Setup

```typescript
// src/clickhouse.ts
import { createClient, ClickHouseClient } from "@clickhouse/client";

let clientInstance: ClickHouseClient | null = null;

export function getClient(): ClickHouseClient {
  if (!clientInstance) {
    clientInstance = createClient({
      url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
      username: process.env.CLICKHOUSE_USER ?? "default",
      password: process.env.CLICKHOUSE_PASSWORD ?? "",
      database: process.env.CLICKHOUSE_DATABASE ?? "analytics",
      request_timeout: 30_000,
      compression: {
        response: true,
        request: false,
      },
      clickhouse_settings: {
        max_execution_time: 30,
        max_memory_usage: "4000000000",
      },
    });
  }
  return clientInstance;
}

export async function ping(): Promise<boolean> {
  const client = getClient();
  const result = await client.ping();
  return result.success;
}
```

## Types

```typescript
// src/types.ts
export interface EventInput {
  user_id: number;
  session_id: string;
  event_type: string;
  page: string;
  properties?: Record<string, unknown>;
}

export interface EventRow {
  event_id: string;
  user_id: number;
  event_type: string;
  page: string;
  ts: string;
}

export interface AggregateSummary {
  event_type: string;
  total: number;
  unique_users: number;
}

export interface TimeSeriesPoint {
  bucket: string;
  count: number;
}
```

## ClickHouse Schema

```sql
CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE analytics.events
(
    event_id   UUID        DEFAULT generateUUIDv4(),
    user_id    UInt64,
    session_id String,
    event_type LowCardinality(String),
    page       String,
    properties String      DEFAULT '{}',
    ts         DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts);
```

## Events Router

```typescript
// src/routes/events.ts
import { Router, Request, Response } from "express";
import { getClient } from "../clickhouse";
import { EventInput, EventRow } from "../types";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as EventInput;
  if (!body.user_id || !body.event_type || !body.page) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = getClient();
  await client.insert({
    table: "analytics.events",
    values: [
      {
        user_id: body.user_id,
        session_id: body.session_id ?? "",
        event_type: body.event_type,
        page: body.page,
        properties: JSON.stringify(body.properties ?? {}),
        ts: new Date().toISOString().replace("T", " ").slice(0, 23),
      },
    ],
    format: "JSONEachRow",
  });

  return res.status(201).json({ status: "accepted" });
});

router.post("/batch", async (req: Request, res: Response) => {
  const events = req.body as EventInput[];
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: "Expected an array" });
  }

  const client = getClient();
  const values = events.map((e) => ({
    user_id: e.user_id,
    session_id: e.session_id ?? "",
    event_type: e.event_type,
    page: e.page,
    properties: JSON.stringify(e.properties ?? {}),
    ts: new Date().toISOString().replace("T", " ").slice(0, 23),
  }));

  await client.insert({ table: "analytics.events", values, format: "JSONEachRow" });
  return res.status(201).json({ status: "accepted", count: values.length });
});

router.get("/", async (req: Request, res: Response) => {
  const { event_type, user_id } = req.query;
  const limit = Math.min(Number(req.query.limit ?? 100), 1000);

  const conditions: string[] = ["1=1"];
  const params: Record<string, unknown> = { limit };

  if (event_type) {
    conditions.push("event_type = {event_type:String}");
    params.event_type = event_type;
  }
  if (user_id) {
    conditions.push("user_id = {user_id:UInt64}");
    params.user_id = Number(user_id);
  }

  const client = getClient();
  const result = await client.query({
    query: `
      SELECT event_id, user_id, event_type, page, ts
      FROM analytics.events
      WHERE ${conditions.join(" AND ")}
      ORDER BY ts DESC
      LIMIT {limit:UInt32}
    `,
    query_params: params,
    format: "JSONEachRow",
  });

  const rows: EventRow[] = await result.json();
  return res.json(rows);
});

export default router;
```

## Analytics Router

```typescript
// src/routes/analytics.ts
import { Router, Request, Response } from "express";
import { getClient } from "../clickhouse";
import { AggregateSummary, TimeSeriesPoint } from "../types";

const router = Router();

router.get("/summary", async (req: Request, res: Response) => {
  const days = Number(req.query.days ?? 7);
  const client = getClient();

  const result = await client.query({
    query: `
      SELECT
        event_type,
        count()       AS total,
        uniq(user_id) AS unique_users
      FROM analytics.events
      WHERE ts >= now() - INTERVAL {days:UInt32} DAY
      GROUP BY event_type
      ORDER BY total DESC
    `,
    query_params: { days },
    format: "JSONEachRow",
  });

  const rows: AggregateSummary[] = await result.json();
  return res.json(rows);
});

router.get("/timeseries", async (req: Request, res: Response) => {
  const event_type = (req.query.event_type as string) ?? "page_view";
  const hours      = Number(req.query.hours ?? 24);
  const client     = getClient();

  const result = await client.query({
    query: `
      SELECT
        toStartOfHour(ts) AS bucket,
        count()           AS count
      FROM analytics.events
      WHERE event_type = {event_type:String}
        AND ts >= now() - INTERVAL {hours:UInt32} HOUR
      GROUP BY bucket
      ORDER BY bucket
    `,
    query_params: { event_type, hours },
    format: "JSONEachRow",
  });

  const rows: TimeSeriesPoint[] = await result.json();
  return res.json(rows);
});

router.get("/top-pages", async (req: Request, res: Response) => {
  const days  = Number(req.query.days ?? 7);
  const limit = Math.min(Number(req.query.limit ?? 10), 100);
  const client = getClient();

  const result = await client.query({
    query: `
      SELECT
        page,
        count()       AS views,
        uniq(user_id) AS unique_users
      FROM analytics.events
      WHERE event_type = 'page_view'
        AND ts >= now() - INTERVAL {days:UInt32} DAY
      GROUP BY page
      ORDER BY views DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { days, limit },
    format: "JSONEachRow",
  });

  const rows = await result.json();
  return res.json(rows);
});

router.get("/export", async (req: Request, res: Response) => {
  const client = getClient();
  const days   = Number(req.query.days ?? 1);

  const { stream } = await client.exec({
    query: `
      SELECT event_id, user_id, event_type, page, ts
      FROM analytics.events
      WHERE ts >= now() - INTERVAL {days:UInt32} DAY
      FORMAT CSV
    `,
    query_params: { days },
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=events.csv");
  stream.pipe(res);
});

export default router;
```

## Main Application

```typescript
// src/app.ts
import express from "express";
import { json } from "express";
import eventsRouter    from "./routes/events";
import analyticsRouter from "./routes/analytics";
import { ping }        from "./clickhouse";

const app = express();

app.use(json());

app.get("/health", async (_req, res) => {
  const ok = await ping();
  return res.json({ status: ok ? "ok" : "degraded" });
});

app.use("/events",    eventsRouter);
app.use("/analytics", analyticsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

## Package Scripts

```json
{
  "scripts": {
    "dev": "ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js"
  }
}
```

## Running the Application

```bash
npm run dev
```

## Streaming Large Results

For large exports, use `client.exec()` to obtain the raw byte stream from the HTTP response and pipe it directly to the Express response, avoiding buffering millions of rows in memory:

```typescript
router.get("/stream", async (req: Request, res: Response) => {
  const client = getClient();
  const { stream } = await client.exec({
    query: "SELECT * FROM analytics.events LIMIT 10000000 FORMAT JSONEachRow",
  });

  res.setHeader("Content-Type", "application/x-ndjson");
  stream.pipe(res);
});
```

Note: `client.query(...).stream()` returns an object-mode stream that yields `Row[]` chunks (each `Row` has `.text` and `.json<T>()`) and cannot be piped directly to an HTTP response. Use `client.exec()` when you want to forward the raw bytes, or iterate `Row` objects and write them yourself.

## Environment Variables

```text
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=analytics
PORT=3000
```

## Summary

The `@clickhouse/client` package gives Express.js full ClickHouse support with TypeScript types, parameterized queries, streaming, and async/await. Structure your application with a shared client module, typed request/response objects, and separate routers for ingestion and analytics endpoints. Use streaming for large exports and always parameterize query inputs to prevent injection vulnerabilities.
