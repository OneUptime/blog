# How to Use Redis with Traefik for Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Traefik, Rate Limiting

Description: Learn how to implement distributed rate limiting in Traefik using a Redis-backed middleware plugin to enforce consistent request quotas across multiple Traefik instances.

---

Traefik's built-in rate limiting middleware (`InFlightReq` and `RateLimit`) works per-instance, which means request quotas are not shared across replicas. For truly distributed rate limiting, you need a shared counter store. Redis fills this role via Traefik's plugin system.

## Architecture

Multiple Traefik replicas each connect to the same Redis instance. When a request arrives, the middleware checks and increments a Redis counter for the client. All replicas see the same count, enforcing a global quota.

## Running Redis and Traefik

```yaml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  traefik:
    image: traefik:v3
    command:
      - --api.insecure=true
      - --providers.docker=true
      - --experimental.plugins.redis-ratelimit.modulename=github.com/acme/traefik-redis-ratelimit
      - --experimental.plugins.redis-ratelimit.version=v0.1.0
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

## Custom Redis Rate Limiter Middleware

If a plugin is not available, you can implement rate limiting at the service level using a Redis sidecar. Here is an example with a Node.js API that uses Redis for rate limiting behind Traefik:

```javascript
const redis = require('redis');
const express = require('express');

async function main() {
  const client = redis.createClient({ url: 'redis://redis:6379' });
  await client.connect();

  async function rateLimitMiddleware(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.ip;
    const key = `rate:${ip}`;
    const limit = 60;
    const window = 60;

    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, window);
    }

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));

    if (count > limit) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  }

  const app = express();
  app.use(rateLimitMiddleware);
  app.listen(3000);
}

main();
```

## Traefik Labels for Service Routing

```text
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api.rule=Host(`api.example.com`)"
  - "traefik.http.routers.api.middlewares=redis-ratelimit@docker"
```

## Using Traefik's Native Rate Limit with Redis (Plugin)

For plugin-based rate limiting, create a `traefik.yml` config:

```text
experimental:
  plugins:
    redis-rate-limit:
      moduleName: github.com/yourorg/traefik-redis-ratelimit
      version: v1.0.0

http:
  middlewares:
    redis-rate-limit:
      plugin:
        redis-rate-limit:
          redisAddr: "redis:6379"
          limit: 100
          window: 60
          keyPrefix: "traefik:ratelimit:"
```

## Verifying Limits in Redis

```bash
redis-cli keys "rate:*"
redis-cli get "rate:192.168.1.100"
redis-cli ttl "rate:192.168.1.100"
```

## Summary

Distributed rate limiting with Traefik and Redis ensures that all proxy replicas enforce a unified request quota. By storing counters in Redis, the rate limit is shared across the entire cluster rather than applied independently per instance. This approach is essential in horizontally scaled API gateway deployments where fairness and accuracy of quotas matter.
