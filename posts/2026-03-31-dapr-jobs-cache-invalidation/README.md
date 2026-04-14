# How to Use Dapr Jobs for Cache Invalidation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Cache, Invalidation, Scheduling, Microservice

Description: Learn how to use Dapr Jobs API to schedule periodic cache invalidation, refreshing stale data and maintaining cache consistency in distributed microservices.

---

Cache invalidation is one of the hardest problems in distributed systems. Dapr Jobs provides a reliable scheduling primitive to periodically refresh or invalidate cache entries, ensuring your applications serve fresh data without manual intervention.

## Cache Invalidation Strategies with Dapr Jobs

**Time-based invalidation**: Purge or refresh caches on a fixed schedule.
**Selective invalidation**: Target specific cache key patterns based on job parameters.
**Warmup after invalidation**: Immediately repopulate the cache after clearing it.

## Scheduling Cache Invalidation Jobs

```bash
# Invalidate product catalog cache every 30 minutes
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/invalidate-product-cache \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 30m",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"cachePrefix\": \"product:\", \"warmup\": true}"
    }
  }'

# Flush pricing cache every hour during business hours
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/invalidate-pricing-cache \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 9-17 * * 1-5",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"cachePrefix\": \"price:\", \"warmup\": false}"
    }
  }'
```

## Implementing Cache Invalidation via Dapr State API

Dapr's State API supports querying and deleting state entries. Combine it with a cache invalidation handler:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

const DAPR_URL = 'http://localhost:3500';
const STATE_STORE = 'redis-statestore';

app.post('/job/invalidate-product-cache', async (req, res) => {
  try {
    const params = JSON.parse(req.body?.data?.value || '{}');
    const { cachePrefix, warmup } = params;

    // Delete keys matching prefix using bulk delete
    const keysToDelete = await findCacheKeys(cachePrefix);
    console.log(`Invalidating ${keysToDelete.length} keys with prefix ${cachePrefix}`);

    await deleteCacheKeys(keysToDelete);

    if (warmup) {
      await warmupCache(cachePrefix);
    }

    res.status(200).json({
      invalidated: keysToDelete.length,
      warmedUp: warmup
    });
  } catch (err) {
    console.error('Cache invalidation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

async function deleteCacheKeys(keys) {
  if (keys.length === 0) return;

  const operations = keys.map(key => ({
    operation: 'delete',
    request: { key }
  }));
  await fetch(`${DAPR_URL}/v1.0/state/${STATE_STORE}/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations })
  });
}

async function warmupCache(prefix) {
  // Re-fetch and store fresh data
  if (prefix === 'product:') {
    const products = await fetchProductsFromDatabase();
    const stateItems = products.map(p => ({
      key: `product:${p.id}`,
      value: p
    }));
    await fetch(`${DAPR_URL}/v1.0/state/${STATE_STORE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateItems)
    });
  }
}

app.listen(6001);
```

## Using Redis Directly via Dapr Binding

For Redis-backed caches, use the Dapr Redis binding to delete specific cache keys:

```python
import requests
import json

def invalidate_cache_key(key: str):
    response = requests.post(
        "http://localhost:3500/v1.0/bindings/redis-binding",
        json={
            "operation": "delete",
            "metadata": {
                "key": key
            }
        }
    )
    return response.status_code == 200
```

## Scheduled Cache Warmup After Invalidation

```go
func handleCacheInvalidation(ctx context.Context, job *common.JobEvent) error {
    log.Println("Starting cache invalidation...")

    // Delete stale state entries
    keys := []string{"config:featureFlags", "config:limits", "config:themes"}
    for _, key := range keys {
        if err := daprClient.DeleteState(ctx, "statestore", key, nil); err != nil {
            log.Printf("Failed to delete key %s: %v", key, err)
        }
    }

    // Warmup with fresh data
    freshConfig := loadConfigFromDatabase()
    for k, v := range freshConfig {
        daprClient.SaveState(ctx, "statestore", k, []byte(v), nil)
    }

    log.Println("Cache invalidation and warmup complete")
    return nil
}
```

## Summary

Dapr Jobs provides a clean scheduling mechanism for periodic cache invalidation, supporting both time-based and selective invalidation strategies. Combining scheduled job triggers with Dapr State API operations or Redis bindings enables consistent cache management across your microservice fleet.
