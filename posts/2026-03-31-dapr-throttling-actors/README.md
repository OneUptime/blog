# How to Implement Throttling with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Throttling, Rate Limit, API

Description: Learn how to implement per-entity throttling using Dapr actors where each actor tracks request counts and enforces rate limits with sliding or fixed window algorithms.

---

## Why Use Actors for Throttling?

Traditional rate limiting requires a shared counter in Redis or a database. Dapr actors are a simpler alternative: each actor represents one throttle subject (user, API key, IP), holds its own counter state, and uses turn-based concurrency to safely increment without atomic operations.

## Token Bucket Throttle Actor

```javascript
const { AbstractActor } = require('@dapr/dapr');

class TokenBucketActor extends AbstractActor {

  async checkAndConsume(params = {}) {
    const {
      cost = 1,
      capacity = 100,        // max tokens in bucket
      refillRate = 10,       // tokens added per second
    } = params;

    const now = Date.now();
    const bucket = await this.stateManager.get('bucket') || {
      tokens: capacity,
      lastRefill: now
    };

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refilled = Math.min(capacity, bucket.tokens + elapsed * refillRate);
    bucket.tokens = refilled;
    bucket.lastRefill = now;

    if (bucket.tokens < cost) {
      await this.stateManager.set('bucket', bucket);
      return {
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: Math.ceil((cost - bucket.tokens) / refillRate * 1000)
      };
    }

    bucket.tokens -= cost;
    await this.stateManager.set('bucket', bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }
}
```

## Fixed Window Rate Limiter Actor

```javascript
const { AbstractActor } = require('@dapr/dapr');

class FixedWindowActor extends AbstractActor {

  async checkAndIncrement(params = {}) {
    const { limit = 60, windowSeconds = 60 } = params;
    const now = Date.now();
    const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
    const windowKey = `window:${windowStart}`;

    const count = await this.stateManager.get(windowKey) || 0;

    if (count >= limit) {
      const windowEnd = windowStart + windowSeconds * 1000;
      return { allowed: false, count, retryAfterMs: windowEnd - now };
    }

    await this.stateManager.set(windowKey, count + 1);
    return { allowed: true, count: count + 1, remaining: limit - count - 1 };
  }
}
```

## Middleware Using the Throttle Actor

```javascript
const { DaprClient, ActorProxyBuilder, ActorId } = require('@dapr/dapr');
const client = new DaprClient();
const throttleBuilder = new ActorProxyBuilder('TokenBucketActor', client);

async function rateLimitMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing API key' });

  const actor = throttleBuilder.build(new ActorId(`apikey:${apiKey}`));
  const result = await actor.checkAndConsume(
    { cost: 1, capacity: 100, refillRate: 10 }
  );

  res.setHeader('X-RateLimit-Remaining', result.remaining);

  if (!result.allowed) {
    res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfterMs: result.retryAfterMs });
  }

  next();
}

app.use('/api', rateLimitMiddleware);
```

## Per-Endpoint Throttling

```javascript
const windowBuilder = new ActorProxyBuilder('FixedWindowActor', client);

async function checkEndpointLimit(userId, endpoint) {
  const actor = windowBuilder.build(new ActorId(`user:${userId}:${endpoint}`));
  return actor.checkAndIncrement({ limit: 10, windowSeconds: 60 });
}

app.post('/api/send-email', async (req, res) => {
  const check = await checkEndpointLimit(req.user.id, 'send-email');
  if (!check.allowed) {
    return res.status(429).json({ error: 'Too many emails. Try again shortly.' });
  }
  await emailService.send(req.body);
  res.json({ success: true });
});
```

## Summary

Dapr actors implement per-entity throttling without shared counters or Redis atomic operations. Turn-based concurrency ensures safe state updates, and each actor independently tracks its rate limit state. Deploying different actor types (token bucket vs fixed window) gives you flexible throttling semantics for different use cases.
