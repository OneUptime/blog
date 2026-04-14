# How to Scope Topic Access to Specific Applications in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Scoping, Security, Microservice

Description: Learn how to restrict which Dapr applications can publish or subscribe to specific topics using pub/sub component scoping for security and isolation.

---

## Why Scope Topic Access?

By default, any Dapr application with access to a pub/sub component can publish to or subscribe from any topic on that component. In a shared environment, this can lead to unauthorized data access or accidental cross-service message pollution. Dapr topic scoping lets you explicitly control which app IDs are allowed to publish and which are allowed to subscribe, per topic.

## Component-Level Scoping vs Topic-Level Scoping

Dapr supports two levels of scoping:

- **Component-level scoping**: Controls which apps can access the component at all (via `scopes` field)
- **Topic-level scoping**: Controls which apps can publish or subscribe to individual topics (via `spec.metadata`)

## Enabling Topic-Level Access Scoping

Add metadata fields to your pub/sub component definition:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
  - name: publishingScopes
    value: "order-service=orders;inventory-service=inventory-updates;payment-service=payments"
  - name: subscriptionScopes
    value: "order-processor=orders;payment-processor=payments;inventory-manager=inventory-updates"
  - name: allowedTopics
    value: "orders,payments,inventory-updates"
```

The format is: `appId1=topic1,topic2;appId2=topic3`

## Understanding the Scope Metadata Fields

- `allowedTopics`: Whitelist of topics that any app can use. Apps cannot create arbitrary new topics.
- `publishingScopes`: Per-app publishing permissions. `order-service` can only publish to `orders`.
- `subscriptionScopes`: Per-app subscription permissions. `order-processor` can only subscribe to `orders`.

## Example: Enforcing Separation Between Services

Say you have three services and want strict boundaries:

```yaml
- name: publishingScopes
  value: "checkout-service=orders;fulfillment-service=shipments;billing-service=invoices"
- name: subscriptionScopes
  value: "order-processor=orders;warehouse-service=shipments;accounting-service=invoices"
- name: allowedTopics
  value: "orders,shipments,invoices"
```

With this configuration:
- `checkout-service` can publish to `orders` only
- `billing-service` cannot publish to `orders` (403 error)
- `warehouse-service` can subscribe to `shipments` only

## Testing Scope Enforcement

Try publishing to a scoped topic from an unauthorized app:

```bash
# From order-processor (not authorized to publish to orders)
curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Expected: HTTP 403
```

From an authorized app:

```bash
# From checkout-service (authorized to publish to orders)
curl -s -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ord-100", "total": 59.99}'
# Expected: HTTP 204 No Content
```

## Combining Component and Topic Scoping

For maximum isolation, combine component-level scoping with topic-level scoping:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: allowedTopics
    value: "orders,order-events"
  - name: publishingScopes
    value: "checkout-service=orders"
  - name: subscriptionScopes
    value: "order-processor=orders,order-events"
scopes:
- checkout-service
- order-processor
```

Only `checkout-service` and `order-processor` can even access this component, and within that, their topic access is further restricted.

## Summary

Dapr topic scoping uses `publishingScopes`, `subscriptionScopes`, and `allowedTopics` metadata fields on pub/sub components to enforce fine-grained access control per application and topic. Combined with component-level scoping, this gives you a complete access control model for your event-driven architecture without modifying application code.
