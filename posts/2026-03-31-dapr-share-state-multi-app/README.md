# How to Share State Between Multiple Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Microservice, Multi-App, Shared State

Description: Learn how to share state across multiple Dapr applications using shared state stores, cross-app key access patterns, and the appid key prefix configuration.

---

## Introduction

By default, Dapr prefixes every state key with the application ID to prevent naming collisions between services. However, many architectures require multiple services to read and write shared data. This guide covers the techniques for sharing state safely across Dapr applications.

## Default Key Isolation

```mermaid
graph LR
    AppA[App A - orderservice] -->|key: orderservice||order-123| Store[(State Store)]
    AppB[App B - inventory] -->|key: inventory||order-123| Store
    Note[Different logical entries]
```

By default:
- `orderservice` writing key `order-123` stores it as `orderservice||order-123`.
- `inventory` writing key `order-123` stores it as `inventory||order-123`.

They are completely separate entries.

## Approach 1 - Disable Key Prefix (Global Shared Namespace)

Set `keyPrefix` to `none` on the state store component to disable the app ID prefix:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: shared-statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: keyPrefix
      value: none
```

With `keyPrefix: none`, the key is stored exactly as supplied. Both `orderservice` and `inventory` writing key `cart-user-42` access the same entry.

```bash
# orderservice writes
curl -X POST http://localhost:3500/v1.0/state/shared-statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "cart-user-42", "value": {"items": ["laptop"]}}]'

# inventory reads (same key, same data)
curl http://localhost:3500/v1.0/state/shared-statestore/cart-user-42
```

## Approach 2 - Use App ID Prefix Explicitly

Keep the default prefix but have one service read another service's keys by constructing the full prefixed key:

```bash
# Read orderservice's state from inventory service
# Key format: {appId}||{key}
curl http://localhost:3500/v1.0/state/statestore/orderservice%7C%7Corder-123
```

This is useful for read-only access patterns where one service needs visibility into another service's data without modifying it.

## Approach 3 - Use a Dedicated Shared State Store

Define a second state store component with `name: shared-statestore` and `keyPrefix: none`, leaving the primary state store with per-app key isolation:

```yaml
# Per-app state store (default prefix)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
---
# Shared state store (no prefix)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: shared-statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: keyPrefix
      value: none
```

Services use `statestore` for private state and `shared-statestore` for shared data.

## Scoping the Shared State Store

Restrict which applications can access the shared store using component scoping:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: shared-statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: keyPrefix
      value: none
scopes:
  - orderservice
  - inventory
  - frontend
```

Only `orderservice`, `inventory`, and `frontend` can access this component. Other apps receive a `403 Forbidden` response.

## Concurrent Write Safety

When multiple apps write to shared state, use ETags for optimistic concurrency:

```bash
# Step 1: Read with ETag
curl -v http://localhost:3500/v1.0/state/shared-statestore/cart-user-42
# ETag: "5"

# Step 2: Write with ETag check (fails if another app modified it)
curl -X POST http://localhost:3500/v1.0/state/shared-statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "cart-user-42",
    "value": {"items": ["laptop", "mouse"]},
    "etag": "5",
    "options": {"concurrency": "first-write", "consistency": "strong"}
  }]'
```

## Example: Shared Shopping Cart

```python
# cart-service: writes cart state
with DaprClient() as client:
    client.save_state(
        store_name="shared-statestore",
        key=f"cart-{user_id}",
        value=json.dumps(cart)
    )

# checkout-service: reads cart state
with DaprClient() as client:
    result = client.get_state(
        store_name="shared-statestore",
        key=f"cart-{user_id}"
    )
    cart = json.loads(result.data)
```

## Summary

Dapr offers three patterns for sharing state across applications: disable the key prefix with `keyPrefix: none` for a global shared namespace, construct prefixed keys manually for cross-app read access, or use a dedicated shared state store component. Scope the shared component to authorised applications using the `scopes` field, and always use ETag-based concurrency control when multiple services write to the same keys to prevent lost updates.
