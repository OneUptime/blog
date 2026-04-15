# How to Implement Configuration Store with Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Configuration, Feature Flag, Runtime

Description: Learn how to implement a dynamic configuration store using Dapr state management to update service behavior at runtime without redeployment.

---

## Why a Configuration Store?

Static ConfigMaps require pod restarts when values change. Dapr state management lets services read configuration at request time and react to changes dynamically, enabling feature flags, rate limits, and routing rules that take effect immediately.

## Configure the State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: config-store
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Writing Configuration Entries

Use an admin service or CLI script to write config values:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function setConfig(service, key, value) {
  await client.state.save('config-store', [
    {
      key: `config:${service}:${key}`,
      value
    }
  ]);
}

// Set a feature flag
await setConfig('order-service', 'feature.express-checkout', true);

// Set a rate limit
await setConfig('api-gateway', 'ratelimit.requests-per-minute', 500);
```

## Reading Configuration at Runtime

```javascript
async function getConfig(service, key, defaultValue = null) {
  const value = await client.state.get('config-store', `config:${service}:${key}`);
  return value !== null ? value : defaultValue;
}

// In your request handler
app.post('/checkout', async (req, res) => {
  const expressEnabled = await getConfig('order-service', 'feature.express-checkout', false);
  if (expressEnabled) {
    return handleExpressCheckout(req, res);
  }
  return handleStandardCheckout(req, res);
});
```

## Caching Config Locally to Reduce Latency

Poll and cache configuration to avoid a state store round trip on every request:

```javascript
const cache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

async function getCachedConfig(service, key, defaultValue) {
  const cacheKey = `${service}:${key}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.value;
  }

  const value = await getConfig(service, key, defaultValue);
  cache.set(cacheKey, { value, fetchedAt: Date.now() });
  return value;
}
```

## Bulk Config Load on Startup

```javascript
async function loadServiceConfig(serviceName) {
  const keys = ['feature.express-checkout', 'ratelimit.rpm', 'logging.level'];
  const prefixedKeys = keys.map(k => `config:${serviceName}:${k}`);
  const results = await client.state.getBulk('config-store', prefixedKeys);

  const resultMap = new Map(results.map(r => [r.key, r.data]));
  return Object.fromEntries(
    keys.map((k, i) => [k, resultMap.get(prefixedKeys[i])])
  );
}
```

## Watching for Config Changes (Redis Keyspace Notifications)

```bash
# Enable Redis keyspace notifications for config changes
redis-cli config set notify-keyspace-events KEA
```

Then subscribe to key changes via a Dapr binding or Redis client to invalidate your local cache when a config value is updated.

## Summary

Using Dapr state management as a configuration store decouples configuration from deployment artifacts. Services read feature flags and tuneable parameters at runtime, allowing operations teams to change system behavior instantly without rolling new container images or restarting pods.
