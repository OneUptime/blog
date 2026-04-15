# How to Use ClickHouse Node.js Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Node.js, JavaScript, Client, Integration

Description: Learn how to connect to ClickHouse from Node.js using the official @clickhouse/client package, including queries, inserts, streaming, and TypeScript support.

---

The official `@clickhouse/client` package is a TypeScript-first Node.js client for ClickHouse. It uses the HTTP interface, supports streaming inserts and query results, row-level type coercion, and works in both Node.js and browser (web) environments. This guide covers everything from initial setup to production usage patterns.

## Installation

```bash
npm install @clickhouse/client
```

## Basic Connection

```typescript
import { createClient } from '@clickhouse/client';

const client = createClient({
  url: 'http://127.0.0.1:8123',
  database: 'default',
  username: 'default',
  password: '',
  request_timeout: 30_000,
  keep_alive: {
    enabled: true,
  },
  clickhouse_settings: {
    max_execution_time: 60,
    max_memory_usage: '10000000000',
  },
});

// Test the connection
const result = await client.query({
  query: 'SELECT version() AS version',
  format: 'JSONEachRow',
});

const rows = await result.json<{ version: string }>();
console.log('ClickHouse version:', rows[0].version);
```

## Create a Table

```typescript
await client.command({
  query: `
    CREATE TABLE IF NOT EXISTS events (
      event_id   UUID         DEFAULT generateUUIDv4(),
      user_id    UInt64,
      event_name LowCardinality(String),
      created_at DateTime64(3, 'UTC'),
      properties Map(String, String)
    )
    ENGINE = MergeTree()
    PARTITION BY toYYYYMM(created_at)
    ORDER BY (user_id, created_at)
  `,
});
console.log('Table created');
```

## Insert Rows

```typescript
type Event = {
  user_id: number;
  event_name: string;
  created_at: string;
  properties: Record<string, string>;
};

const events: Event[] = [
  {
    user_id: 1001,
    event_name: 'purchase',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 23),
    properties: { item: 'widget', currency: 'USD' },
  },
  {
    user_id: 1002,
    event_name: 'page_view',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 23),
    properties: { page: '/pricing' },
  },
];

await client.insert({
  table: 'events',
  values: events,
  format: 'JSONEachRow',
});

console.log(`Inserted ${events.length} rows`);
```

## Query with JSONEachRow

```typescript
type EventSummary = {
  user_id: string;
  event_count: string;
  first_seen: string;
};

const result = await client.query({
  query: `
    SELECT
      user_id,
      count()         AS event_count,
      min(created_at) AS first_seen
    FROM events
    GROUP BY user_id
    ORDER BY event_count DESC
    LIMIT 10
  `,
  format: 'JSONEachRow',
});

const rows = await result.json<EventSummary>();
for (const row of rows) {
  console.log(`User ${row.user_id}: ${row.event_count} events since ${row.first_seen}`);
}
```

## Parameterized Queries

```typescript
const userId = 1001;
const since   = '2024-01-01 00:00:00';

const result = await client.query({
  query: `
    SELECT event_name, count() AS cnt
    FROM events
    WHERE user_id    = {uid: UInt64}
      AND created_at >= {since: DateTime}
    GROUP BY event_name
    ORDER BY cnt DESC
  `,
  query_params: {
    uid:   userId,
    since: since,
  },
  format: 'JSONEachRow',
});

const rows = await result.json<{ event_name: string; cnt: string }>();
rows.forEach(r => console.log(`${r.event_name}: ${r.cnt}`));
```

ClickHouse query parameters use `{name: Type}` syntax inside the SQL string and are passed in `query_params`. They are sent as HTTP headers and are safe from SQL injection.

## Stream Large Query Results

```typescript
import { createWriteStream } from 'node:fs';

const { stream } = await client.exec({
  query: 'SELECT event_id, user_id, event_name, created_at FROM events FORMAT JSONEachRow',
});

// Stream raw bytes to a file
const writeStream = createWriteStream('/tmp/events.jsonl');
stream.pipe(writeStream);
await new Promise((resolve) => writeStream.on('finish', resolve));
console.log('Streamed to file');
```

## Stream Row-by-Row Processing

```typescript
const result = await client.query({
  query: 'SELECT user_id, event_name, created_at FROM events LIMIT 1000000',
  format: 'JSONEachRow',
});

let count = 0;
for await (const rows of result.stream()) {
  for (const row of rows) {
    const parsed = row.json<{ user_id: string; event_name: string }>();
    count++;
    // process each row
  }
}
console.log(`Processed ${count} rows`);
```

## Stream Insert from a File

```typescript
import { createReadStream } from 'node:fs';

// Insert from a JSONL file without loading it all into memory
await client.insert({
  table: 'events',
  values: createReadStream('/tmp/events.jsonl'),
  format: 'JSONEachRow',
});
```

## Async Insert (Server-Side Buffering)

```typescript
await client.insert({
  table: 'events',
  values: [{ user_id: 1001, event_name: 'click', created_at: new Date().toISOString() }],
  format: 'JSONEachRow',
  clickhouse_settings: {
    async_insert: 1,
    wait_for_async_insert: 0,
  },
});
```

## TypeScript Types with Generic JSON

```typescript
interface PageView {
  user_id: number;
  page: string;
  referrer: string | null;
  duration_ms: number;
  viewed_at: string;
}

const result = await client.query({
  query: 'SELECT user_id, page, referrer, duration_ms, viewed_at FROM page_views LIMIT 100',
  format: 'JSONEachRow',
});

const rows = await result.json<PageView>();
// rows is fully typed as PageView[]
```

## Use JSONCompactEachRow for Smaller Payloads

```typescript
// JSONCompactEachRow returns arrays instead of objects, reducing JSON overhead
const result = await client.query({
  query: 'SELECT user_id, event_name, created_at FROM events LIMIT 5',
  format: 'JSONCompactEachRow',
});

// Each row is an array
const rows = await result.json<[number, string, string]>();
rows.forEach(([userId, eventName, createdAt]) => {
  console.log(userId, eventName, createdAt);
});
```

## Error Handling

```typescript
import { ClickHouseError } from '@clickhouse/client';

try {
  const result = await client.query({
    query: 'SELECT * FROM nonexistent_table',
    format: 'JSONEachRow',
  });
  await result.json();
} catch (err) {
  if (err instanceof ClickHouseError) {
    console.error(`ClickHouse error ${err.code}: ${err.message}`);
  } else {
    throw err;
  }
}
```

## Close the Client

```typescript
// Release HTTP connections when shutting down
await client.close();
```

## Express.js Integration

```typescript
import express from 'express';
import { createClient } from '@clickhouse/client';

const app = express();
const ch  = createClient({ url: 'http://localhost:8123' });

app.get('/stats', async (req, res) => {
  try {
    const result = await ch.query({
      query: `
        SELECT
          toDate(created_at) AS day,
          count()            AS events
        FROM events
        WHERE created_at >= today() - 7
        GROUP BY day
        ORDER BY day
      `,
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(3000);
```

## Common Pitfalls

- Always call `result.json()`, `result.text()`, or consume `result.stream()` before the response is garbage-collected. Uncollected responses hold open HTTP connections.
- ClickHouse query parameters use `{name: Type}` syntax, not `$1` or `?` placeholders. The type annotation is required and must match a valid ClickHouse type name.
- The `format` field in `insert()` must match the format of the data you are passing. Passing JSON objects with `JSONEachRow` is correct; passing CSV text requires `CSV` format.
- `client.command()` is for DDL and statements with no result set. `client.query()` is for SELECT and anything that returns rows.

## Summary

`@clickhouse/client` is the official TypeScript-first Node.js client for ClickHouse. Use `client.query()` with `JSONEachRow` for typed row results, parameterized queries for safe interpolation, and `result.stream()` for memory-efficient processing of large result sets. Use `client.insert()` for bulk writes and configure `async_insert` for high-frequency single-row writes.
