# How to Isolate Tenant Messages with Dapr Pub/Sub Scoping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Multi-Tenancy, Security, Scoping

Description: Isolate tenant messages in Dapr pub/sub using component scoping, topic prefixing, namespace-scoped brokers, and subscription filters to prevent cross-tenant message leakage.

---

## The Challenge of Pub/Sub Isolation in Multi-Tenant Systems

In a shared pub/sub system, a tenant publishing to topic `orders` could potentially receive messages from another tenant's `orders` topic. Dapr provides multiple mechanisms to prevent this cross-tenant message leakage.

## Option 1 - Component Scoping

Scope a pub/sub component to specific app IDs so only authorized apps can publish or subscribe:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: tenant-a
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis.tenant-a.svc.cluster.local:6379"
scopes:
- tenant-a-orders-api
- tenant-a-inventory-api
```

Apps in `tenant-b` cannot use this component even if they reference it by name.

## Option 2 - Topic Prefixing

Use tenant-specific topic names to logically separate messages on a shared broker:

```javascript
const daprClient = new DaprClient();

async function publishTenantEvent(tenantId, eventType, data) {
  // Always use tenant-prefixed topic names
  const topic = `${tenantId}.${eventType}`;
  await daprClient.pubsub.publish('pubsub', topic, data);
}

// Tenant A publishes to: "tenant-a.orders"
await publishTenantEvent('tenant-a', 'orders', orderData);

// Tenant B publishes to: "tenant-b.orders"
await publishTenantEvent('tenant-b', 'orders', orderData);
```

Configure subscriptions for each tenant's topics:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: tenant-a-orders-sub
  namespace: tenant-a
spec:
  pubsubname: pubsub
  topic: tenant-a.orders
  route: /orders/process
```

## Option 3 - Separate Brokers per Tenant

For the strongest isolation, each tenant uses a dedicated broker instance:

```yaml
# Tenant A uses a dedicated Kafka cluster
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: tenant-a
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka.tenant-a.svc.cluster.local:9092"
  - name: authType
    value: "none"
  - name: consumerGroup
    value: "tenant-a-consumers"
```

## Option 4 - Subscription Filters

Use routing rules in subscriptions to route messages based on tenant identity:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: filtered-orders-sub
  namespace: my-namespace
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    rules:
    - match: event.data.tenantId == "tenant-a"
      path: /orders/process
    default: /orders/discard
```

## Validating Isolation

Test that cross-tenant messages do not leak:

```bash
# Publish as tenant-a
curl -X POST http://localhost:3500/v1.0/publish/pubsub/tenant-a.orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123", "tenantId": "tenant-a"}'

# Verify tenant-b subscription does NOT receive this message
kubectl logs tenant-b-pod -c app | grep "orderId: 123"
# Should return no output
```

## Summary

Dapr pub/sub tenant isolation is achieved through component scoping to restrict access by app ID, topic prefixing to logically separate messages on shared brokers, separate broker instances for complete physical isolation, and routing rules for content-based routing. The appropriate level depends on your compliance requirements and tolerance for shared infrastructure.
