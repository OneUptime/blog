# How to Use ClickHouse with Next.js API Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Next.js, TypeScript, API Route, Node.js, Analytics

Description: Build Next.js API routes that query ClickHouse to serve fast analytical data to React components with connection reuse and proper error handling.

---

Next.js API routes run server-side Node.js code, making them an ideal place to query ClickHouse and expose analytics data to your frontend. This keeps credentials server-side and allows connection pooling across requests.

## Installing the ClickHouse Client

```bash
npm install @clickhouse/client
```

## Creating a Shared ClickHouse Client

Create `lib/clickhouse.ts` to share a single client instance:

```typescript
import { createClient, ClickHouseClient } from '@clickhouse/client';

let client: ClickHouseClient | null = null;

export function getClickHouseClient(): ClickHouseClient {
  if (!client) {
    client = createClient({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DB || 'default',
    });
  }
  return client;
}
```

## Writing an API Route

Create `pages/api/analytics/top-pages.ts` (or `app/api/analytics/top-pages/route.ts` for App Router):

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { getClickHouseClient } from '../../../lib/clickhouse';

interface PageViewRow {
  page: string;
  views: string;
  unique_users: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const days = Number(req.query.days) || 7;

  try {
    const client = getClickHouseClient();
    const result = await client.query({
      query: `
        SELECT
          page,
          count() AS views,
          uniq(user_id) AS unique_users
        FROM default.page_views
        WHERE created_at >= now() - INTERVAL {days:UInt8} DAY
        GROUP BY page
        ORDER BY views DESC
        LIMIT 20
      `,
      query_params: { days },
      format: 'JSONEachRow',
    });

    const rows = await result.json<PageViewRow>();
    return res.status(200).json(rows.map(r => ({
      page: r.page,
      views: Number(r.views),
      uniqueUsers: Number(r.unique_users),
    })));
  } catch (err) {
    console.error('ClickHouse query error:', err);
    return res.status(500).json({ error: 'Query failed' });
  }
}
```

## App Router Version (Next.js 13+)

Create `app/api/analytics/top-pages/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get('days')) || 7;

  const client = getClickHouseClient();
  const result = await client.query({
    query: `
      SELECT page, count() AS views
      FROM default.page_views
      WHERE created_at >= now() - INTERVAL {days:UInt8} DAY
      GROUP BY page ORDER BY views DESC LIMIT 10
    `,
    query_params: { days },
    format: 'JSONEachRow',
  });

  const rows = await result.json();
  return NextResponse.json(rows);
}
```

## Fetching from a React Component

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function TopPages() {
  const { data, error } = useSWR('/api/analytics/top-pages?days=7', fetcher);

  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <ul>
      {data.map((row: any) => (
        <li key={row.page}>{row.page}: {row.views} views</li>
      ))}
    </ul>
  );
}
```

## Summary

Next.js API routes provide a clean server-side boundary for ClickHouse queries, keeping credentials secure and enabling connection reuse across requests. The `@clickhouse/client` library's support for parameterized queries prevents SQL injection, and the pattern scales naturally to App Router and React Server Components.
