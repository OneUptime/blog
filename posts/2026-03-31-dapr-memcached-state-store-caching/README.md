# How to Use Memcached as Dapr State Store for Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Memcached, State Store, Caching, Performance, Microservice

Description: Use Memcached as a Dapr state store for high-speed, volatile caching with automatic expiration and linear horizontal scalability.

---

## Overview

Memcached is a simple, high-performance, distributed memory caching system. Dapr's Memcached state store component provides an API-compatible way to use Memcached as a volatile cache layer for microservices, enabling cache patterns without coupling application code to the Memcached client library.

## Memcached Deployment

Deploy Memcached on Kubernetes:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami

helm install memcached bitnami/memcached \
  --set replicaCount=3 \
  --set resources.requests.memory=512Mi \
  --set resources.limits.memory=1Gi \
  --set architecture=high-availability
```

Verify deployment:

```bash
kubectl get pods -l app.kubernetes.io/name=memcached
kubectl port-forward service/memcached 11211:11211

# Test connectivity
echo "stats" | nc localhost 11211
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: memcached-cache
  namespace: default
spec:
  type: state.memcached
  version: v1
  metadata:
  - name: hosts
    value: "memcached-0.memcached:11211,memcached-1.memcached:11211,memcached-2.memcached:11211"
  - name: maxIdleConnections
    value: "10"
  - name: timeout
    value: "1000"
```

## Cache-Aside Pattern with Dapr

Implement cache-aside using Dapr state API:

```python
import dapr.clients as dapr
import json
import time

def get_product_with_cache(product_id: str) -> dict:
    cache_key = f"product:{product_id}"

    with dapr.DaprClient() as client:
        # Try cache first
        cached = client.get_state(
            store_name="memcached-cache",
            key=cache_key
        )

        if cached.data:
            print(f"Cache HIT for {product_id}")
            return json.loads(cached.data)

        # Cache miss - fetch from database
        print(f"Cache MISS for {product_id}")
        product = fetch_from_database(product_id)

        # Populate cache with TTL
        client.save_state(
            store_name="memcached-cache",
            key=cache_key,
            value=json.dumps(product),
            state_metadata={"ttlInSeconds": "300"}
        )

        return product

def invalidate_product_cache(product_id: str):
    with dapr.DaprClient() as client:
        client.delete_state(
            store_name="memcached-cache",
            key=f"product:{product_id}"
        )
        print(f"Cache invalidated for product {product_id}")

def fetch_from_database(product_id: str) -> dict:
    # Simulated DB fetch
    return {"id": product_id, "name": "Widget", "price": 9.99}
```

## Bulk Cache Operations

Load multiple cache entries efficiently:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func warmCache(products []Product) error {
    client, _ := dapr.NewClient()
    defer client.Close()

    ctx := context.Background()
    items := make([]*dapr.SetStateItem, len(products))

    for i, p := range products {
        data, _ := json.Marshal(p)
        items[i] = &dapr.SetStateItem{
            Key:   fmt.Sprintf("product:%s", p.ID),
            Value: data,
            Metadata: map[string]string{
                "ttlInSeconds": "3600",
            },
        }
    }

    return client.SaveBulkState(ctx, "memcached-cache", items...)
}
```

## Consistent Hashing for Distribution

Memcached uses consistent hashing to distribute keys across nodes. Monitor distribution:

```bash
# Check stats per server
echo "stats" | nc memcached-0.memcached 11211 | grep -E "curr_items|bytes|cmd_get|cmd_set|get_hits|get_misses"

# Calculate hit rate
# hit_rate = get_hits / (get_hits + get_misses)
```

## Important Limitations

Memcached does not support:
- Persistence (all data is lost on restart)
- Transactions
- ETags or optimistic concurrency
- Strong consistency guarantees

Use Memcached only for volatile, reproducible data that can be rebuilt from the source of truth.

## Summary

Memcached with Dapr provides a lightweight, high-throughput caching layer for read-heavy microservices. The cache-aside pattern implemented via Dapr's state API keeps application code decoupled from Memcached specifics. Because Memcached is volatile, it should complement a durable state store (like PostgreSQL or Redis in persistent mode) rather than replace it for critical state.
