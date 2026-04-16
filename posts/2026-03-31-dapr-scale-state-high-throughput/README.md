# How to Scale Dapr State Management for High Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Scalability, Redis, Performance

Description: Optimize Dapr state store operations for high throughput using bulk APIs, connection pooling, state store partitioning, and caching strategies.

---

## State Management Throughput Challenges

At high throughput, Dapr state operations can become a bottleneck. The key optimizations are: using bulk APIs, tuning connection pools, sharding state across multiple stores, and leveraging TTL-based caching.

## Using Bulk State APIs

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"

    dapr "github.com/dapr/go-sdk/client"
)

func bulkSaveStates(client dapr.Client, items []CartItem) error {
    ctx := context.Background()

    stateItems := make([]*dapr.SetStateItem, len(items))
    for i, item := range items {
        data, err := json.Marshal(item)
        if err != nil {
            return err
        }
        stateItems[i] = &dapr.SetStateItem{
            Key:   fmt.Sprintf("cart-%s", item.UserID),
            Value: data,
            Options: &dapr.StateOptions{
                Concurrency: dapr.StateConcurrencyLastWrite,
                Consistency: dapr.StateConsistencyEventual,
            },
        }
    }

    return client.SaveBulkState(ctx, "statestore", stateItems...)
}

func bulkGetStates(client dapr.Client, userIDs []string) ([]*dapr.BulkStateItem, error) {
    ctx := context.Background()
    keys := make([]string, len(userIDs))
    for i, id := range userIDs {
        keys[i] = fmt.Sprintf("cart-%s", id)
    }
    return client.GetBulkState(ctx, "statestore", keys, nil, 10)
}
```

## Redis State Store Tuning

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-cluster.default.svc.cluster.local:6379"
  - name: maxRetries
    value: "3"
  - name: maxRetryBackoff
    value: "2s"
  - name: failover
    value: "false"
  - name: redeliverInterval
    value: "0"
  - name: processingTimeout
    value: "15s"
  - name: poolSize
    value: "100"
  - name: idleTimeout
    value: "5m"
  - name: maxConnAge
    value: "30m"
  - name: ttlInSeconds
    value: "3600"
```

## State Store Sharding

Use multiple state stores and route keys based on hash:

```python
import hashlib
import httpx

DAPR_PORT = 3500
STATE_STORES = ["statestore-0", "statestore-1", "statestore-2", "statestore-3"]

def get_store_for_key(key: str) -> str:
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return STATE_STORES[h % len(STATE_STORES)]

async def save_state(key: str, value: dict):
    store = get_store_for_key(key)
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_PORT}/v1.0/state/{store}",
            json=[{"key": key, "value": value}]
        )

async def get_state(key: str) -> dict:
    store = get_store_for_key(key)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://localhost:{DAPR_PORT}/v1.0/state/{store}/{key}"
        )
        return resp.json() if resp.status_code == 200 else {}
```

## Eventual vs Strong Consistency

```go
// High throughput writes - use eventual consistency
func saveEventualState(client dapr.Client, key string, value interface{}) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    return client.SaveStateWithETag(context.Background(), "statestore", key, data, "", nil,
        dapr.WithConcurrency(dapr.StateConcurrencyLastWrite),
        dapr.WithConsistency(dapr.StateConsistencyEventual))
}

// Critical data - use strong consistency
func saveStrongState(client dapr.Client, key string, value interface{}, etag string) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    return client.SaveStateWithETag(context.Background(), "statestore", key, data, etag, nil,
        dapr.WithConcurrency(dapr.StateConcurrencyFirstWrite),
        dapr.WithConsistency(dapr.StateConsistencyStrong))
}
```

## Benchmarking State Throughput

```bash
# Simple throughput test using parallel curl
time seq 1 1000 | xargs -P 50 -I{} \
  curl -s -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"bench-{}","value":{"n":{}}}]'
```

## Summary

High-throughput Dapr state management relies on bulk APIs to amortize network round trips, Redis connection pool tuning to avoid socket exhaustion, and optional sharding across multiple state stores when a single Redis instance hits throughput limits. Choosing eventual consistency for non-critical writes also significantly increases throughput by avoiding distributed coordination overhead.
