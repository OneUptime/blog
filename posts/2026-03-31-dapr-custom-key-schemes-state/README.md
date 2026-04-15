# How to Use Custom Key Schemes in Dapr State Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Key Design, Microservice, Best Practice

Description: Learn how to design and implement custom key schemes in Dapr State Management for multi-tenancy, hierarchical data, and optimised query performance.

---

## Introduction

While Dapr manages the `appId||` prefix automatically, the portion of the key you supply is entirely under your control. A well-designed key scheme enables efficient lookups, supports multi-tenancy, avoids hotspots, and makes debugging easier. This guide covers proven patterns for structuring state keys in Dapr applications.

## Key Anatomy

```json
{daprPrefix}||{yourKeyScheme}
     ^                ^
 managed by Dapr   you control this
```

The Dapr prefix is `{appId}||` by default. Everything after that is your key scheme.

## Pattern 1 - Resource-Type Prefix

Use a consistent type prefix to group related keys:

```yaml
order:{orderId}
user:{userId}
session:{sessionId}
product:{productId}
```

```bash
# Save an order
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "order:ord-8842", "value": {"item": "laptop", "status": "pending"}}]'

# Save a user
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "user:usr-1201", "value": {"name": "Alice", "email": "alice@example.com"}}]'
```

## Pattern 2 - Tenant-Scoped Keys

For multi-tenant applications, prefix with the tenant ID:

```json
{tenantId}:{resourceType}:{resourceId}
```

```bash
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "tenant-acme:order:ord-001", "value": {"item": "laptop"}},
    {"key": "tenant-globex:order:ord-001", "value": {"item": "mouse"}}
  ]'
```

Both tenants can have `ord-001` without collision. See the multi-tenancy guide for full patterns.

## Pattern 3 - Hierarchical Keys

Model parent-child relationships:

```json
{parentId}:{childType}:{childId}
```

```bash
# User's orders
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "user:usr-42:order:ord-101", "value": {"item": "laptop"}},
    {"key": "user:usr-42:order:ord-102", "value": {"item": "mouse"}},
    {"key": "user:usr-42:cart:current",  "value": {"items": []}}
  ]'
```

## Pattern 4 - Version-Stamped Keys

Append a version for immutable history:

```json
{resourceId}:v{version}
```

```bash
# Keep history of config changes
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "config:feature-flags:v1", "value": {"darkMode": false}},
    {"key": "config:feature-flags:v2", "value": {"darkMode": true}},
    {"key": "config:feature-flags:latest", "value": {"darkMode": true}}
  ]'
```

## Pattern 5 - Time-Bucketed Keys

For time-series data, bucket by time period:

```yaml
metrics:{metric}:{yyyymmdd}
```

```bash
# Daily page view counts
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "metrics:pageviews:20260101", "value": {"count": 5420}},
    {"key": "metrics:pageviews:20260102", "value": {"count": 6130}}
  ]'
```

## Implementing a Key Builder in Code

Create a central key-building utility to enforce consistency:

```python
# key_builder.py
from dataclasses import dataclass

@dataclass
class StateKey:
    @staticmethod
    def order(order_id: str) -> str:
        return f"order:{order_id}"

    @staticmethod
    def user(user_id: str) -> str:
        return f"user:{user_id}"

    @staticmethod
    def session(session_id: str) -> str:
        return f"session:{session_id}"

    @staticmethod
    def tenant_order(tenant_id: str, order_id: str) -> str:
        return f"{tenant_id}:order:{order_id}"

    @staticmethod
    def user_cart(user_id: str) -> str:
        return f"user:{user_id}:cart:current"
```

```python
# Usage
from dapr.clients import DaprClient
from key_builder import StateKey

with DaprClient() as client:
    client.save_state(
        store_name="statestore",
        key=StateKey.order("ord-8842"),
        value='{"item": "laptop"}'
    )

    result = client.get_state(
        store_name="statestore",
        key=StateKey.user_cart("usr-42")
    )
```

## Go Key Builder Example

```go
package keys

import "fmt"

func Order(orderID string) string {
    return fmt.Sprintf("order:%s", orderID)
}

func UserCart(userID string) string {
    return fmt.Sprintf("user:%s:cart:current", userID)
}

func TenantOrder(tenantID, orderID string) string {
    return fmt.Sprintf("%s:order:%s", tenantID, orderID)
}
```

## Key Length Considerations

Most state stores have key length limits:

| Store | Max Key Length |
|-------|--------------|
| Redis | 512 MB (practically unlimited) |
| Cosmos DB | 1,023 bytes |
| DynamoDB | 2,048 bytes |
| PostgreSQL | Unlimited (text type) |

Keep keys short and readable. UUIDs are 36 characters; consider using ULID (26 chars) or short IDs for high-volume keys.

## Avoiding Common Mistakes

```bash
# Bad: timestamp at start causes time-based hotspots in ordered stores
20260101-order-001

# Good: resource ID first
order-001-20260101

# Bad: sequential integers cause partition hotspots
order-1
order-2
order-3

# Good: UUID or random suffix
order-a3f2-8bc1
order-92d4-1ef0
```

## Summary

Custom key schemes in Dapr are entirely under your control. Use resource-type prefixes for organization, tenant IDs for multi-tenancy isolation, and hierarchical structures for parent-child relationships. Implement a centralized key builder in your code to enforce naming conventions and prevent typos. Design keys with high-cardinality leading segments to avoid hotspots in the underlying state store, and stay within the key length limits of your chosen backend.
