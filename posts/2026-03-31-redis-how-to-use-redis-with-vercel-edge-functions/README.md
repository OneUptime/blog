# How to Use Redis with Vercel Edge Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vercel, Edge Function, Next.js, Upstash, Serverless

Description: Use Redis with Vercel Edge Functions via the Upstash REST API to build fast edge caches, rate limiters, and A/B testing systems in Next.js.

---

## Vercel Edge Functions and Redis

Vercel Edge Functions run on the V8 isolate runtime, which does not support TCP connections. To use Redis, you need the Upstash REST API, which communicates over HTTP and works seamlessly with edge runtimes.

Common use cases include:
- Edge-level request caching
- Global rate limiting
- A/B testing and feature rollouts
- Geolocation-based personalization

## Installation

```bash
npm install @upstash/redis @upstash/ratelimit
```

## Environment Variables

Set these in your Vercel project dashboard or `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

## Edge API Route with Caching

```javascript
// app/api/products/[id]/route.js
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET(request, { params }) {
  const { id } = await params;
  const cacheKey = `product:${id}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  const product = await fetchProductFromDatabase(id);

  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await redis.setex(cacheKey, 600, product);

  return NextResponse.json(product, {
    headers: { 'X-Cache': 'MISS' },
  });
}
```

## Edge Middleware for Rate Limiting

```javascript
// middleware.js
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit',
});

export async function middleware(request) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      },
    });
  }

  return NextResponse.next({
    headers: {
      'X-RateLimit-Remaining': remaining.toString(),
    },
  });
}

export const config = {
  matcher: '/api/:path*',
};
```

## A/B Testing at the Edge

```javascript
// middleware.js
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function middleware(request) {
  const userId = request.cookies.get('user-id')?.value;

  if (!userId) {
    return NextResponse.next();
  }

  // Check assigned variant
  let variant = await redis.get(`ab:checkout:${userId}`);

  if (!variant) {
    // Randomly assign variant
    variant = Math.random() < 0.5 ? 'control' : 'treatment';
    await redis.setex(`ab:checkout:${userId}`, 86400 * 30, variant);
  }

  const response = NextResponse.next();
  response.cookies.set('checkout-variant', variant);
  return response;
}
```

## Geolocation-Based Personalization

```javascript
// app/api/content/route.js
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET(request) {
  const country = request.geo?.country ?? 'US';
  const cacheKey = `content:${country}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const content = await fetchLocalizedContent(country);
  await redis.setex(cacheKey, 3600, content);

  return NextResponse.json(content);
}
```

## Atomic Counters at the Edge

```javascript
// app/api/votes/route.js
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST(request) {
  const { postId } = await request.json();

  // Atomically increment vote count
  const newCount = await redis.incr(`votes:${postId}`);

  return NextResponse.json({ votes: newCount });
}
```

## Summary

Vercel Edge Functions integrate with Redis via Upstash's HTTP REST API, enabling powerful edge-side caching, rate limiting, and personalization in Next.js applications. Use the `runtime = 'edge'` export to opt into the V8 isolate runtime, and leverage Upstash's `@upstash/ratelimit` package for turnkey rate limiting in middleware.
