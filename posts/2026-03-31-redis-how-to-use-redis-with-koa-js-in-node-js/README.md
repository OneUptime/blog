# How to Use Redis with Koa.js in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Koa.js, Node.js, Caching, Backend

Description: Learn how to integrate Redis with Koa.js in Node.js for caching, session storage, and rate limiting with practical code examples.

---

Koa.js is a lightweight Node.js web framework built by the Express team. Pairing it with Redis gives you fast in-memory storage for caching responses, storing sessions, and implementing rate limiting. This guide walks through a practical integration.

## Installing Dependencies

```bash
npm install koa @koa/router ioredis
```

## Connecting to Redis

Create a Redis client using `ioredis`, which provides a robust API with built-in retry logic.

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));
```

## Caching API Responses

A common pattern is to cache expensive database queries or external API responses. Here is a Koa middleware that checks the cache before processing:

```javascript
const Koa = require('koa');
const Router = require('@koa/router');

const app = new Koa();
const router = new Router();

async function cacheMiddleware(ctx, next) {
  const key = `cache:${ctx.path}`;
  const cached = await redis.get(key);
  if (cached) {
    ctx.body = JSON.parse(cached);
    ctx.set('X-Cache', 'HIT');
    return;
  }
  await next();
  if (ctx.body) {
    await redis.setex(key, 60, JSON.stringify(ctx.body)); // TTL 60 seconds
    ctx.set('X-Cache', 'MISS');
  }
}

router.get('/products', cacheMiddleware, async (ctx) => {
  // Simulate database fetch
  ctx.body = { products: [{ id: 1, name: 'Widget' }] };
});

app.use(router.routes());
app.listen(3000);
```

## Session Storage with Redis

Use Redis to store session data so it persists across server restarts and scales across multiple instances.

```bash
npm install koa-session koa-redis
```

```javascript
const session = require('koa-session');
const redisStore = require('koa-redis');

app.keys = ['your-secret-key'];

const sessionConfig = {
  store: redisStore({ client: redis }),
  maxAge: 86400000, // 1 day in ms
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};

app.use(session(sessionConfig, app));

router.post('/login', async (ctx) => {
  const { username } = ctx.request.body;
  ctx.session.user = username;
  ctx.body = { message: 'Logged in' };
});
```

## Rate Limiting with Redis

Redis counters provide an efficient way to implement per-IP rate limiting.

```javascript
async function rateLimitMiddleware(ctx, next) {
  const ip = ctx.ip;
  const key = `rate:${ip}`;
  const requests = await redis.incr(key);
  if (requests === 1) {
    await redis.expire(key, 60); // Reset window every 60 seconds
  }
  if (requests > 100) {
    ctx.status = 429;
    ctx.body = { error: 'Too many requests' };
    return;
  }
  await next();
}

app.use(rateLimitMiddleware);
```

## Error Handling

Always handle Redis connection failures gracefully so they do not bring down your Koa application.

```javascript
async function safeGet(key) {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error(`Redis GET failed for key ${key}:`, err.message);
    return null; // Fall through to the actual data source
  }
}
```

## Summary

Integrating Redis with Koa.js involves installing `ioredis`, creating a client, and applying it across middleware for caching, sessions, and rate limiting. Always handle Redis errors gracefully to avoid cascading failures in your application.
