# How to Build Server-Side Analytics with ClickHouse and Next.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Next.js, Server-Side Rendering, Analytics, TypeScript

Description: Use Next.js API routes and Server Components to query ClickHouse on the server, keeping credentials secure and rendering analytics data without client-side fetching.

---

## Why Server-Side for Analytics

Querying ClickHouse from the browser exposes credentials and bypasses security. Next.js API routes and Server Components run on the server, keeping the ClickHouse connection private while pre-rendering analytics charts.

## ClickHouse Client Setup

```typescript
// lib/clickhouse.ts
import { createClient } from '@clickhouse/client';

export const ch = createClient({
  url: process.env.CLICKHOUSE_URL!,
  database: process.env.CLICKHOUSE_DB ?? 'analytics',
  username: process.env.CLICKHOUSE_USER ?? 'default',
  password: process.env.CLICKHOUSE_PASSWORD ?? '',
});
```

## API Route (Pages Router)

```typescript
// pages/api/analytics/traffic.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ch } from '@/lib/clickhouse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const days = Number(req.query.days ?? 7);

  const rs = await ch.query({
    query: `SELECT toDate(ts) AS day, count() AS views
            FROM page_views
            WHERE ts >= today() - {days:UInt32}
            GROUP BY day ORDER BY day`,
    query_params: { days },
    format: 'JSONEachRow',
  });

  const data = await rs.json();
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.json(data);
}
```

## Server Component (App Router)

```tsx
// app/analytics/page.tsx
import { ch } from '@/lib/clickhouse';
import { TrafficChart } from '@/components/TrafficChart';

async function getTrafficData() {
  const rs = await ch.query({
    query: `SELECT toDate(ts) AS day, count() AS views
            FROM page_views WHERE ts >= today() - 30
            GROUP BY day ORDER BY day`,
    format: 'JSONEachRow',
  });
  return rs.json<{ day: string; views: string }>();
}

export default async function AnalyticsPage() {
  const data = await getTrafficData();
  return (
    <main>
      <h1>30-Day Traffic</h1>
      <TrafficChart data={data} />
    </main>
  );
}
```

Data fetching happens at render time on the server. No API call from the client is needed.

## Caching with Next.js

Use `next/cache` for route segment caching.

```typescript
import { unstable_cache } from 'next/cache';

const getCachedTraffic = unstable_cache(getTrafficData, ['traffic'], {
  revalidate: 60, // seconds
});
```

## Environment Variables

```text
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_DB=analytics
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=secret
```

Never expose these to the client bundle - only use them in server-side files.

## Error Boundaries

```tsx
// app/analytics/error.tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <p>Failed to load analytics: {error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Summary

Next.js keeps ClickHouse credentials safe by moving queries to API routes or Server Components. Server Components in the App Router allow data fetching at render time without any client-side JavaScript. Use `unstable_cache` or `Cache-Control` headers to avoid querying ClickHouse on every request.
