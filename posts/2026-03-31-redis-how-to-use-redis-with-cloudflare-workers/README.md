# How to Use Redis with Cloudflare Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cloudflare Workers, Edge Computing, Serverless, Upstash

Description: Connect Redis to Cloudflare Workers using the Upstash REST API for edge caching, rate limiting, and shared state at the network edge.

---

## Why Redis at the Edge

Cloudflare Workers run at the network edge in over 300 data centers worldwide. Combining them with Redis enables:

- Sub-millisecond edge caching
- Distributed rate limiting across global regions
- Real-time feature flags
- Session management at the edge

Cloudflare Workers support TCP via the `connect()` API, but HTTP-based clients like the Upstash REST API are preferred in serverless environments because they avoid connection management overhead.

## Setting Up Upstash Redis

1. Create a free database at [upstash.com](https://upstash.com)
2. Copy the REST URL and token from the dashboard
3. Store them as Cloudflare Worker secrets

```bash
# Add secrets via Wrangler CLI
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
```

## Installing the Upstash SDK

```bash
npm install @upstash/redis
```

## Basic Caching Example

```javascript
import { Redis } from '@upstash/redis/cloudflare';

export default {
  async fetch(request, env, ctx) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    const url = new URL(request.url);
    const cacheKey = `page:${url.pathname}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch origin data
    const data = await fetchOriginData(url.pathname);

    // Cache with TTL using waitUntil to avoid blocking response
    ctx.waitUntil(redis.set(cacheKey, JSON.stringify(data), { ex: 300 }));

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
      },
    });
  },
};
```

## Rate Limiting at the Edge

```javascript
import { Redis } from '@upstash/redis/cloudflare';
import { Ratelimit } from '@upstash/ratelimit';

export default {
  async fetch(request, env) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
    });

    const ip = request.headers.get('CF-Connecting-IP');
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      });
    }

    return handleRequest(request);
  },
};
```

## Feature Flags with Redis

```javascript
import { Redis } from '@upstash/redis/cloudflare';

async function isFeatureEnabled(redis, feature, userId) {
  // Check global flag
  const globalFlag = await redis.get(`feature:${feature}`);
  if (globalFlag === 'disabled') return false;
  if (globalFlag === 'enabled') return true;

  // Check user-specific rollout
  const userFlag = await redis.get(`feature:${feature}:user:${userId}`);
  return userFlag === 'enabled';
}

export default {
  async fetch(request, env) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    const userId = getUserIdFromRequest(request);
    const newUiEnabled = await isFeatureEnabled(redis, 'new-ui', userId);

    return new Response(JSON.stringify({ newUiEnabled }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

## wrangler.toml Configuration

```toml
name = "my-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[vars]
CACHE_TTL = "300"

# Secrets are set via `wrangler secret put`
# UPSTASH_REDIS_REST_URL
# UPSTASH_REDIS_REST_TOKEN
```

## Pipelining Multiple Commands

```javascript
import { Redis } from '@upstash/redis/cloudflare';

export default {
  async fetch(request, env) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Pipeline reduces HTTP round trips
    const pipeline = redis.pipeline();
    pipeline.get('config:theme');
    pipeline.get('config:locale');
    pipeline.incr('metrics:pageviews');

    const [theme, locale, views] = await pipeline.exec();

    return new Response(JSON.stringify({ theme, locale, views }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

## Summary

Cloudflare Workers can use Redis through Upstash's HTTP REST API, which is the preferred approach in serverless environments since it avoids TCP connection management overhead. This combination enables powerful edge computing patterns like distributed caching, global rate limiting, and real-time feature flags. Use `ctx.waitUntil()` for non-blocking cache writes to keep response times low.
