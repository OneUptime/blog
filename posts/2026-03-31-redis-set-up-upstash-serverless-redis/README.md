# How to Set Up Upstash Serverless Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Upstash, Serverless, Edge, Caching

Description: Learn how to create and use an Upstash serverless Redis database - including setup, the REST API, SDK usage, and integration with Vercel and Cloudflare Workers.

---

Upstash is a serverless Redis service that bills per request rather than per hour. It is ideal for edge functions, serverless APIs, and workloads with unpredictable or low traffic where running a dedicated Redis instance is wasteful.

## Creating an Upstash Redis Database

1. Sign up at [upstash.com](https://upstash.com)
2. Go to Console > Redis > Create Database
3. Choose region (closest to your compute)
4. Select "Global" for multi-region replication or single-region for lower cost

Or via the Upstash CLI:

```bash
brew install upstash/tap/upstash
upstash auth login
upstash redis create --name my-db --region us-east-1
```

## Connecting with the Standard Redis Client

```python
import redis

client = redis.Redis(
    host="your-db.upstash.io",
    port=6379,
    password="<your-upstash-password>",
    ssl=True,
    decode_responses=True,
)

client.set("hello", "world", ex=60)
print(client.get("hello"))  # world
```

## Using the Upstash REST API

Upstash provides an HTTP REST API, allowing edge runtimes (like Cloudflare Workers) to access Redis without a TCP connection:

```bash
# Set a key
curl -X POST https://your-db.upstash.io \
  -H "Authorization: Bearer <token>" \
  -d '["SET", "key1", "value1", "EX", "300"]'

# Get a key
curl -X POST https://your-db.upstash.io \
  -H "Authorization: Bearer <token>" \
  -d '["GET", "key1"]'
```

## Using @upstash/redis SDK (Edge-Compatible)

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: Request): Promise<Response> {
  const visits = await redis.incr("page:home:visits");
  return new Response(JSON.stringify({ visits }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

## Vercel Integration

```bash
# Install the Upstash Vercel integration from marketplace, or set env vars manually
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

## Cloudflare Workers Example

```javascript
import { Redis } from "@upstash/redis/cloudflare";

export default {
  async fetch(request, env) {
    const redis = Redis.fromEnv(env);
    const ip = request.headers.get("CF-Connecting-IP");
    const key = `rate:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    if (count > 50) {
      return new Response("Too Many Requests", { status: 429 });
    }
    return new Response("OK");
  },
};
```

## Pricing Model

Upstash charges per command (~$0.20 per 100,000 requests). For workloads under ~500k requests/day, it is cheaper than any managed Redis alternative. Above that, a dedicated instance (ElastiCache, Memorystore, or Azure Cache) becomes more cost-effective.

## Summary

Upstash serverless Redis is the best choice for edge functions, low-traffic serverless APIs, and per-request billing workloads. Use the `@upstash/redis` SDK for edge-compatible REST-based access, or the standard Redis TCP client for traditional server environments. Monitor daily request counts - when you exceed roughly 500k commands/day, evaluate whether a dedicated instance offers better economics.
