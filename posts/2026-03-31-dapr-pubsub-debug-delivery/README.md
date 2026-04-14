# How to Debug Pub/Sub Message Delivery Issues in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Debugging, Observability, Microservice

Description: Learn how to diagnose and fix message delivery failures in Dapr pub/sub using logs, tracing, dead-letter topics, and component configuration checks.

---

## Why Dapr Pub/Sub Messages Fail to Deliver

Message delivery failures in Dapr pub/sub can stem from several sources: misconfigured components, incorrect subscription endpoints, network issues, or application-level errors. Effective debugging requires examining multiple layers.

## Enable Debug Logging

Start by increasing Dapr sidecar log verbosity to capture detailed pub/sub activity.

```bash
dapr run --app-id myapp \
  --app-port 3000 \
  --log-level debug \
  -- node app.js
```

On Kubernetes, patch the deployment to enable debug logs:

```bash
kubectl annotate deployment myapp \
  dapr.io/log-level=debug
kubectl rollout restart deployment/myapp
```

## Check the Dapr Dashboard

```bash
dapr dashboard
```

Open `http://localhost:8080` and navigate to your app. The Components tab shows whether your pub/sub component loaded successfully. The Metadata section surfaces connection errors.

## Inspect Subscriber Endpoint Registration

Dapr discovers subscriptions by calling `GET /dapr/subscribe` on your app. Verify it returns the expected payload:

```bash
curl http://localhost:3000/dapr/subscribe
```

Expected response:

```json
[
  {
    "pubsubname": "pubsub",
    "topic": "orders",
    "route": "/orders"
  }
]
```

If this endpoint is missing or returns an incorrect format, Dapr will not register the subscription.

## Trace Messages with Zipkin

Enable distributed tracing to follow a message from publish to consume:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

Apply to your app:

```bash
kubectl annotate deployment myapp \
  dapr.io/config=tracing
```

Search for `pubsub` in Zipkin traces to find spans showing publish and subscribe operations.

## Use Dead-Letter Topics to Catch Failures

Configure a dead-letter topic to capture messages that cannot be processed:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders
  deadLetterTopic: orders-dead
```

Subscribe to `orders-dead` and log full message content to understand why processing failed.

## Validate Component Health via API

```bash
curl http://localhost:3500/v1.0/healthz
curl http://localhost:3500/v1.0/metadata
```

The metadata endpoint lists all loaded components. If your pub/sub component is absent, check component YAML syntax and secrets references.

## Common Pitfalls

- App port mismatch between `--app-port` and the actual listening port
- Topic name case sensitivity differences between publisher and subscriber
- Missing `Content-Type: application/json` header on publish requests
- Broker connection timeouts causing silent drops

```bash
# Test publish manually
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123"}'
```

Check the Dapr sidecar logs immediately after to see if the message was forwarded.

## Summary

Debugging Dapr pub/sub delivery issues involves enabling verbose logging, verifying the subscription endpoint, using distributed tracing, and inspecting component health. Configuring dead-letter topics ensures no message is silently lost, giving you a clear audit trail for failures.
