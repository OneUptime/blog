# How to Use Declarative Subscriptions in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Subscription, Kubernetes, Microservice

Description: Learn how to define Dapr pub/sub subscriptions declaratively using Kubernetes CRDs, keeping subscription configuration outside of application code.

---

## Declarative vs Programmatic Subscriptions

Dapr supports two models for defining subscriptions:

- **Programmatic**: Your app exposes a `GET /dapr/subscribe` endpoint that returns subscription config at startup. The subscription lives in your code.
- **Declarative**: You apply a `Subscription` Kubernetes resource. The subscription is defined in infrastructure, not code.

Declarative subscriptions are preferred for production environments because they are version-controlled separately, can be applied by operations teams, and do not require app restarts when changed (with some limitations).

## Defining a Declarative Subscription

Create a `Subscription` CRD resource:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-subscription
  namespace: production
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /handlers/orders
scopes:
- order-processor
```

Apply it to your cluster:

```bash
kubectl apply -f orders-subscription.yaml
```

## Multi-Route Declarative Subscription

Use routing rules within the `routes` field for content-based routing:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: payments-subscription
  namespace: production
spec:
  pubsubname: pubsub
  topic: payments
  routes:
    rules:
    - match: event.type == "PaymentSucceeded"
      path: /handlers/payment-success
    - match: event.type == "PaymentFailed"
      path: /handlers/payment-failed
    default: /handlers/payment-default
scopes:
- payment-service
```

## Implementing the Handler in Your App

The app only needs to expose the handler endpoint - no `/dapr/subscribe` endpoint is required when using declarative subscriptions:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/handlers/orders", (req, res) => {
  const { data } = req.body;
  console.log(`Received order: ${JSON.stringify(data)}`);
  // Process order
  res.sendStatus(200);
});

app.post("/handlers/payment-success", (req, res) => {
  const { data } = req.body;
  console.log(`Payment succeeded: ${data.paymentId}`);
  res.sendStatus(200);
});

app.post("/handlers/payment-failed", (req, res) => {
  const { data } = req.body;
  console.log(`Payment failed: ${data.reason}`);
  res.sendStatus(200);
});

app.listen(3000);
```

## Verifying Subscriptions Are Loaded

Check that Dapr picked up the declarative subscriptions:

```bash
kubectl get subscriptions -n production
kubectl describe subscription orders-subscription -n production
```

You can also check the Dapr sidecar logs:

```bash
kubectl logs deployment/order-processor -c daprd -n production | grep subscription
```

## Scoping Subscriptions to Specific Apps

The `scopes` field restricts which Dapr app IDs receive messages from this subscription. If omitted, all apps sharing the same pubsub component will receive messages on that topic:

```yaml
scopes:
- order-processor
- order-archiver
```

## Subscription Metadata Options

You can add metadata to declarative subscriptions for broker-specific behavior:

```yaml
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /handlers/orders
  metadata:
    rawPayload: "true"
```

The `rawPayload` metadata option tells Dapr to deliver the raw event payload without CloudEvent envelope wrapping, which is useful when subscribing to events from external systems that do not use the CloudEvent format.

## Summary

Declarative subscriptions in Dapr use Kubernetes `Subscription` CRDs to define pub/sub topic bindings outside of application code. This separates operational concerns from business logic, lets platform teams manage subscriptions independently, and makes subscription configuration visible and auditable in your GitOps workflow.
