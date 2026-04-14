# How to Use Dapr Subscription CRD for Declarative Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Subscription, CRD, Declarative

Description: Use Dapr's Subscription CRD to declare pub/sub topic subscriptions as Kubernetes resources, enabling GitOps management of message routing without changing application code.

---

## Programmatic vs. Declarative Subscriptions

Dapr supports two subscription models. In programmatic subscriptions, the app exposes a `/dapr/subscribe` endpoint that returns subscription details. In declarative subscriptions, a Kubernetes Subscription CRD defines the same information as a native Kubernetes resource.

Declarative subscriptions are preferred for GitOps workflows since they don't require application code changes to add or modify subscriptions.

## Basic Subscription CRD

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders/process
```

- `pubsubname` - the Component CRD name of the pub/sub component
- `topic` - the topic to subscribe to
- `routes.default` - the HTTP path on the app to deliver messages

Apply it and restart the pod to pick up the subscription:

```bash
kubectl apply -f orders-subscription.yaml
kubectl rollout restart deployment/orders-api
```

## Subscription with Multiple Routes

Route different message types to different handler endpoints:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    rules:
    - match: event.type == "order.created"
      path: /orders/create
    - match: event.type == "order.cancelled"
      path: /orders/cancel
    default: /orders/process
```

## Subscription with Dead Letter Topics

Configure a dead letter topic for messages that fail after all retries:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders/process
  deadLetterTopic: orders-deadletter
```

## Bulk Subscription for High Throughput

Enable bulk subscription to receive batches of messages:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders/process
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
```

Handle bulk messages in your application:

```javascript
app.post('/orders/process', (req, res) => {
  const { entries } = req.body;
  const results = entries.map(entry => {
    try {
      processOrder(entry.event.data);
      return { entryId: entry.entryId, status: 'SUCCESS' };
    } catch (err) {
      return { entryId: entry.entryId, status: 'RETRY', error: err.message };
    }
  });
  res.json({ statuses: results });
});
```

## Scoping Subscriptions to Specific Apps

The Subscription CRD applies to any app in the namespace that subscribes to the pubsub component. To restrict it to a specific app, use the top-level `scopes` field:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: default
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders/process
scopes:
- orders-api
```

## Validating Subscriptions

```bash
# List subscriptions
kubectl get subscription -n default

# Check which subscriptions are active for an app
kubectl logs orders-api-pod -c daprd | grep "subscription"
```

## Summary

Dapr's Subscription CRD enables declarative pub/sub configuration as a Kubernetes resource, supporting basic routing, content-based multi-route rules, dead letter topics, and bulk delivery. Managing subscriptions as CRDs decouples routing logic from application code and enables GitOps-based subscription management with standard Kubernetes tooling.
