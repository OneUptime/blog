# How to Optimize Redis as Dapr State Store for High Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Redis, State Store, Performance, Caching, Optimization

Description: Optimize Redis as a Dapr state store for high performance with connection pooling, TTL management, and read-your-writes consistency.

---

## Overview

Redis is the most commonly used Dapr state store due to its low latency and rich data structure support. However, default configurations leave significant performance on the table. This guide covers key optimizations for production workloads.

## Dapr Component Configuration for Performance

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-state
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-cluster:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
  - name: enableTLS
    value: "true"
  - name: maxRetries
    value: "3"
  - name: maxRetryBackoff
    value: "2s"
  - name: failover
    value: "true"
  - name: sentinelMasterName
    value: "mymaster"
  - name: redeliverInterval
    value: "2s"
  - name: processingTimeout
    value: "15s"
  - name: poolSize
    value: "100"
  - name: minIdleConns
    value: "10"
  - name: idleTimeout
    value: "5m"
  - name: actorStateStore
    value: "true"
  - name: ttlInSeconds
    value: "3600"
```

## Redis Server Tuning

Optimize Redis server settings for Dapr workloads:

```bash
# Increase max memory and set eviction policy
redis-cli CONFIG SET maxmemory 4gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Disable unnecessary persistence for pure cache use cases
redis-cli CONFIG SET save ""

# Tune lazy freeing for better performance
redis-cli CONFIG SET lazyfree-lazy-eviction yes
redis-cli CONFIG SET lazyfree-lazy-expire yes
```

For persistent state stores, enable AOF with fsync tuning:

```bash
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG SET appendfsync everysec
redis-cli CONFIG SET no-appendfsync-on-rewrite yes
```

## Bulk Operations with ETags

Use ETags for optimistic concurrency to reduce retry conflicts:

```python
import json
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateOptions, Consistency, Concurrency

def update_cart_with_etag(user_id: str, cart_items: list):
    with DaprClient() as client:
        # Get current state with ETag
        response = client.get_state(
            store_name="redis-state",
            key=f"cart:{user_id}",
        )

        current_etag = response.etag
        raw = response.data
        cart = json.loads(raw) if raw else {"items": []}
        cart["items"].extend(cart_items)

        # Save with ETag for optimistic concurrency
        client.save_state(
            store_name="redis-state",
            key=f"cart:{user_id}",
            value=json.dumps(cart),
            etag=current_etag,
            options=StateOptions(
                concurrency=Concurrency.first_write,
                consistency=Consistency.strong,
            ),
        )
```

## Batch State Operations

Use bulk save and get for better throughput:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"

    dapr "github.com/dapr/go-sdk/client"
)

func saveBatchOrders(orders []Order) error {
    client, err := dapr.NewClient()
    if err != nil {
        return fmt.Errorf("failed to create dapr client: %w", err)
    }
    defer client.Close()

    ctx := context.Background()
    items := make([]*dapr.SetStateItem, len(orders))

    for i, order := range orders {
        data, err := json.Marshal(order)
        if err != nil {
            return fmt.Errorf("failed to marshal order %s: %w", order.ID, err)
        }
        items[i] = &dapr.SetStateItem{
            Key:   fmt.Sprintf("order:%s", order.ID),
            Value: data,
            Etag:  &dapr.ETag{Value: order.Etag},
            Options: &dapr.StateOptions{
                Concurrency: dapr.StateConcurrencyLastWrite,
                Consistency: dapr.StateConsistencyStrong,
            },
        }
    }

    return client.SaveBulkState(ctx, "redis-state", items...)
}
```

## Monitoring Redis Performance

Track key performance metrics:

```bash
# Check slow queries
redis-cli SLOWLOG GET 10

# Monitor real-time stats
redis-cli --stat

# Find biggest keys by element count per data type
redis-cli --bigkeys

# View connection pool stats
redis-cli INFO clients
```

## Summary

Redis as a Dapr state store achieves maximum performance through proper connection pool sizing, eviction policy tuning, and bulk state operations. Using ETags with optimistic concurrency reduces contention in high-write scenarios, while the `ttlInSeconds` setting prevents stale state accumulation. Sentinel or Cluster mode ensures high availability for production workloads.
