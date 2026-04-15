# How to Configure Cache TTL with Dapr State TTL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cache, TTL, State Management, Expiration

Description: Learn how to configure time-to-live (TTL) for Dapr state store entries to automatically expire cached data and prevent stale values from accumulating.

---

## What is Dapr State TTL?

Dapr state TTL allows you to set an expiration time on individual state entries. When the TTL expires, the state store automatically deletes the entry. This is ideal for caching because expired entries are cleaned up without any application-side eviction logic. Support for TTL depends on the underlying state store - Redis, Cosmos DB, DynamoDB, and others support it natively.

## Setting TTL on a State Entry

Pass `ttlInSeconds` in the metadata when saving state:

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {
      "key": "product:123",
      "value": {"name": "Widget", "price": 9.99},
      "metadata": {
        "ttlInSeconds": "300"
      }
    }
  ]'
```

The entry will be automatically deleted after 300 seconds (5 minutes).

## TTL in the Go SDK

```go
package main

import (
    "context"
    "encoding/json"
    dapr "github.com/dapr/go-sdk/client"
)

func cacheProduct(ctx context.Context, client dapr.Client, product Product) error {
    data, _ := json.Marshal(product)
    return client.SaveState(ctx, "statestore", "product:"+product.ID, data, map[string]string{
        "ttlInSeconds": "300",
    })
}
```

## TTL in the Python SDK

```python
from dapr.clients import DaprClient

def cache_product(product_id: str, product: dict, ttl_seconds: int = 300):
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=f"product:{product_id}",
            value=json.dumps(product),
            state_metadata={"ttlInSeconds": str(ttl_seconds)}
        )
```

## Tiered TTL Strategy

Different data types have different freshness requirements. Apply tiered TTLs accordingly:

```python
TTL_CONFIG = {
    "product": 300,       # 5 minutes - products change occasionally
    "category": 3600,     # 1 hour - categories are stable
    "user_session": 1800, # 30 minutes - security-sensitive
    "exchange_rate": 60,  # 1 minute - highly volatile
    "static_config": 86400 # 1 day - rarely changes
}

def cache_entity(entity_type: str, entity_id: str, data: dict):
    ttl = TTL_CONFIG.get(entity_type, 300)
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=f"{entity_type}:{entity_id}",
            value=json.dumps(data),
            state_metadata={"ttlInSeconds": str(ttl)}
        )
```

## Checking TTL Metadata on a State Entry

Some state stores return the remaining TTL when you read a state entry. Check with the metadata query:

```bash
curl "http://localhost:3500/v1.0/state/statestore/product:123?consistency=strong"
```

The response headers include `metadata.ttlExpireTime` with the absolute expiry timestamp in RFC3339 format.

## Refreshing TTL on Access

To implement a sliding expiration (where the TTL resets on each read), re-save the entry with the same value and a fresh TTL after each successful read:

```python
async def get_with_sliding_ttl(key: str, ttl: int = 300):
    value = await get_from_cache(key)
    if value:
        # Refresh TTL on access
        await cache_entity_raw(key, value, ttl)
    return value
```

## Summary

Dapr state TTL provides automatic cache expiration without application-side eviction logic. By passing `ttlInSeconds` metadata in every save operation, entries self-destruct when they become stale. Using a tiered TTL configuration based on how volatile each data type is allows fine-grained control over cache freshness across the entire application.
