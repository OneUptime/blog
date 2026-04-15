# How to Implement Dynamic Rate Limiting with Dapr Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rate Limiting, Configuration, API, Middleware

Description: Build a dynamic rate limiter that reads per-route and per-tenant limits from the Dapr Configuration API, updating without restarts.

---

## Why Dynamic Rate Limits?

Static rate limits baked into middleware config require a redeployment to change. With Dapr's Configuration API you can push new limits at runtime, letting ops teams react to traffic spikes without touching code.

## Storing Rate Limit Config in Redis

```bash
# Set per-route limits (requests per second)
redis-cli SET "/api/v1/search" "100"
redis-cli SET "/api/v1/upload" "10"
redis-cli SET "/api/v1/reports" "20"

# Set per-tenant overrides
redis-cli SET "tenant:enterprise-a:/api/v1/search" "1000"
```

## Dapr Configuration Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rate-limits
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

## Rate Limiting Middleware in Node.js

```javascript
const { DaprClient, CommunicationProtocolEnum } = require("@dapr/dapr");
const rateCounters = new Map();
const configCache = new Map();

const daprClient = new DaprClient({
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

async function loadRateLimits() {
  const items = await daprClient.configuration.get("rate-limits", [
    "/api/v1/search",
    "/api/v1/upload",
    "/api/v1/reports",
  ]);
  for (const [key, item] of Object.entries(items.items)) {
    configCache.set(key, parseInt(item.value, 10));
    console.log(`Loaded rate limit: ${key} = ${item.value} req/s`);
  }
}

async function subscribeRateLimits() {
  await daprClient.configuration.subscribeWithKeys(
    "rate-limits",
    ["/api/v1/search", "/api/v1/upload", "/api/v1/reports"],
    (response) => {
      for (const [key, item] of Object.entries(response.items)) {
        configCache.set(key, parseInt(item.value, 10));
        console.log(`Rate limit updated: ${key} = ${item.value} req/s`);
      }
    }
  );
}

function rateLimitMiddleware(req, res, next) {
  const route = req.path;
  const tenant = req.headers["x-tenant-id"] || "default";
  const tenantKey = `tenant:${tenant}:${route}`;

  const limit = configCache.get(tenantKey) || configCache.get(route) || 50;
  const counter = rateCounters.get(route) || { count: 0, resetAt: Date.now() + 1000 };

  if (Date.now() > counter.resetAt) {
    counter.count = 0;
    counter.resetAt = Date.now() + 1000;
  }

  counter.count++;
  rateCounters.set(route, counter);

  if (counter.count > limit) {
    return res.status(429).json({ error: "rate limit exceeded", limit });
  }

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", limit - counter.count);
  next();
}

module.exports = { loadRateLimits, subscribeRateLimits, rateLimitMiddleware };
```

## Wiring Into Express

```javascript
const express = require("express");
const { loadRateLimits, subscribeRateLimits, rateLimitMiddleware } = require("./rateLimit");

async function main() {
  await loadRateLimits();
  await subscribeRateLimits();

  const app = express();
  app.use(rateLimitMiddleware);

  app.get("/api/v1/search", (req, res) => res.json({ results: [] }));
  app.listen(3000, () => console.log("Server running on port 3000"));
}

main();
```

## Testing Dynamic Changes

```bash
# Tighten the search limit without restarting the service
redis-cli SET "/api/v1/search" "5"

# Verify it takes effect immediately
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/search
done
```

## Summary

Dapr's Configuration API subscription model lets your rate limiting middleware receive push updates as soon as limits change in the backing store. This removes the need to restart services or do rolling deployments just to adjust traffic controls, making it much faster to respond to unexpected load spikes.
