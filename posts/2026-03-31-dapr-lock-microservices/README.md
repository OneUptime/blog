# How to Use Dapr Distributed Lock with Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Lock, Microservice, Coordination, Kubernetes

Description: Learn how to coordinate multiple microservices using Dapr distributed locks, including cross-service locking patterns and deployment considerations on Kubernetes.

---

In a microservices architecture, distributed locks are needed when services across different deployments must coordinate access to shared resources. Dapr's lock API provides a consistent interface regardless of how many services or instances are involved.

## Architecture Overview

Multiple microservices share a single Dapr lock store component. Each service acquires and releases locks via its local Dapr sidecar. The lock store (Redis) acts as the coordination point.

```text
[Service A sidecar] ----\
[Service B sidecar] -------> [Redis Lock Store]
[Service C sidecar] ----/
```

## Shared Lock Store Component

Define the lock store as a shared Dapr component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
  namespace: production
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master.production:6379
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
```

## Scoping Access to Specific Services

Use `scopes` to restrict which services can use the lock store:

```yaml
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
scopes:
- order-service
- inventory-service
- payment-service
```

This prevents unintended services from acquiring locks.

## Cross-Service Lock Convention

Establish a naming convention for resource IDs to avoid collisions:

```text
{domain}-{entity-type}-{entity-id}
```

Examples:
- `orders-order-12345`
- `inventory-sku-ABC-001`
- `payments-transaction-xyz`

## Order Fulfillment Example

Two services - `order-service` and `inventory-service` - must coordinate stock reservation:

```python
# order-service
LOCK_EXPIRY_SECONDS = 30

async def reserve_inventory(order_id: str, sku: str):
    resource_id = f"inventory-sku-{sku}"
    lock = await acquire_lock("lockstore", resource_id, f"order-service-{POD_NAME}", LOCK_EXPIRY_SECONDS)
    if not lock:
        raise Exception(f"Cannot reserve {sku} - inventory update in progress")
    try:
        available = await check_stock(sku)
        if available > 0:
            await decrement_stock(sku)
            return True
        return False
    finally:
        await release_lock("lockstore", resource_id, f"order-service-{POD_NAME}")
```

```python
# inventory-service
LOCK_EXPIRY_SECONDS = 30

async def restock_sku(sku: str, quantity: int):
    resource_id = f"inventory-sku-{sku}"
    lock = await acquire_lock("lockstore", resource_id, f"inventory-service-{POD_NAME}", LOCK_EXPIRY_SECONDS)
    if not lock:
        raise Exception(f"Cannot restock {sku} - another update in progress")
    try:
        await update_stock(sku, quantity)
    finally:
        await release_lock("lockstore", resource_id, f"inventory-service-{POD_NAME}")
```

## Kubernetes Deployment Considerations

Use the pod name as the lock owner for easy tracing:

```yaml
env:
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
```

Combine namespace and pod name for globally unique lock owners:

```python
LOCK_OWNER = f"{os.getenv('NAMESPACE')}/{os.getenv('POD_NAME')}"
```

## Summary

Dapr distributed locks work across microservices by routing all lock operations through a shared Redis-backed component. Use consistent resource ID naming conventions to avoid collisions between services. Scoping the lock store to specific app IDs adds an authorization layer. Using the Kubernetes pod name as the lock owner provides clear attribution in logs and debugging sessions.
