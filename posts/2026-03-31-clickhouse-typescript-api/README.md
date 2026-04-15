# How to Build a TypeScript API with ClickHouse Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TypeScript, API, Node.js, Analytics

Description: Build a type-safe TypeScript REST API backed by ClickHouse using the official client and Fastify for serving analytics data.

---

## Project Setup

```bash
npm init -y
npm install @clickhouse/client fastify zod
npm install -D typescript @types/node ts-node
npx tsc --init
```

## ClickHouse Client with Type Safety

```typescript
import { createClient, ClickHouseClient } from '@clickhouse/client';

export const ch: ClickHouseClient = createClient({
  url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
  database: 'analytics',
  username: process.env.CLICKHOUSE_USER ?? 'default',
  password: process.env.CLICKHOUSE_PASSWORD ?? '',
});
```

## Typed Query Helper

```typescript
export async function queryRows<T>(
  query: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const rs = await ch.query({
    query,
    query_params: params,
    format: 'JSONEachRow',
  });
  return rs.json<T>();
}
```

## Domain Types

```typescript
interface TopEvent {
  event_name: string;
  cnt: string;      // UInt64 is quoted as a string in JSON by default
  avg_ms: number;   // Float64 is returned as a JSON number
}
```

## Repository Layer

```typescript
export async function getTopEvents(days: number): Promise<TopEvent[]> {
  return queryRows<TopEvent>(
    `SELECT event_name,
            count()        AS cnt,
            avg(duration)  AS avg_ms
     FROM events
     WHERE ts >= now() - INTERVAL {days:UInt32} DAY
     GROUP BY event_name
     ORDER BY cnt DESC
     LIMIT 20`,
    { days }
  );
}
```

## Fastify Server

```typescript
import Fastify from 'fastify';
import { z } from 'zod';
import { getTopEvents } from './repository';

const app = Fastify({ logger: true });

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

app.get('/api/top-events', async (req, reply) => {
  const { days } = querySchema.parse(req.query);
  const data = await getTopEvents(days);
  return reply.send(data);
});

app.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
});
```

## Input Validation with Zod

Zod catches invalid query parameters before they reach ClickHouse, preventing injection and malformed SQL.

## Error Handling

```typescript
app.setErrorHandler((error, req, reply) => {
  app.log.error(error);
  reply.status(500).send({ error: 'Internal server error' });
});
```

## Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await app.close();
  await ch.close();
  process.exit(0);
});
```

## Summary

A TypeScript API backed by ClickHouse uses generic query helpers for type safety, Zod for input validation, and Fastify for a fast HTTP layer. Typed interfaces for query results prevent runtime surprises from ClickHouse's JSON number serialization.
