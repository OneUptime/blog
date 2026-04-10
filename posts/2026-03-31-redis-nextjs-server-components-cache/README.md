# How to Cache Next.js Server Components with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Next.js, Server Component, Cache, Performance

Description: Cache expensive data fetches in Next.js App Router Server Components using Redis to avoid redundant database queries on each render.

---

Next.js App Router Server Components fetch data on the server. While Next.js provides built-in caching for `fetch` requests, database calls, ORM queries, and third-party SDK calls require manual caching. Redis is an ideal store for this.

## Install Redis

```bash
npm install redis
```

## Create a Cached Fetch Utility

`lib/cache.ts`:

```typescript
import { createClient } from "redis";

let client: ReturnType<typeof createClient> | null = null;

async function getRedis() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (e) => console.error("Redis error", e));
    await client.connect();
  }
  return client;
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const redis = await getRedis();
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await fetcher();
  await redis.setEx(key, ttlSeconds, JSON.stringify(data));
  return data;
}
```

## Use in a Server Component

```typescript
// app/products/page.tsx
import { cachedFetch } from "../../lib/cache";
import { db } from "../../lib/db";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category = "all" } = await searchParams;

  const products = await cachedFetch(
    `products:${category}`,
    () => db.product.findMany({ where: { category } }),
    120 // 2-minute cache
  );

  return (
    <main>
      <h1>Products</h1>
      <ul>
        {products.map((p) => (
          <li key={p.id}>{p.name} - ${p.price}</li>
        ))}
      </ul>
    </main>
  );
}
```

## Tag-Based Cache Invalidation

Track which keys belong to a "products" tag and invalidate them together:

```typescript
export async function invalidateTag(tag: string) {
  const redis = await getRedis();
  const keys = await redis.sMembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(keys);
    await redis.del(`tag:${tag}`);
  }
}

export async function cachedFetchWithTag<T>(
  key: string,
  tag: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const redis = await getRedis();
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await fetcher();
  await redis.setEx(key, ttlSeconds, JSON.stringify(data));
  await redis.sAdd(`tag:${tag}`, key);
  return data;
}
```

## Invalidate from a Route Handler

```typescript
// app/api/revalidate/route.ts
import { invalidateTag } from "../../../lib/cache";

export async function POST(req: Request) {
  const { tag } = await req.json();
  await invalidateTag(tag);
  return Response.json({ invalidated: tag });
}
```

## Summary

Wrapping database or API calls in a `cachedFetch` utility gives Next.js Server Components a Redis-backed cache without modifying component logic. Tag-based invalidation groups related keys so a single API call can purge all cached variants of a data type. This approach complements Next.js built-in fetch caching for cases where raw `fetch` is not used.
