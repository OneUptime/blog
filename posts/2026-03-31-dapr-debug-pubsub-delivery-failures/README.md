# How to Debug Dapr Pub/Sub Delivery Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Debugging, Microservice, Observability

Description: Learn how to diagnose and fix Dapr pub/sub message delivery failures using logs, tracing, and component health checks.

---

When messages stop flowing through your Dapr pub/sub system, pinpointing the cause quickly is essential. Delivery failures can stem from broker connectivity issues, misconfigured components, subscriber errors, or message schema mismatches. This guide walks through a systematic debugging approach.

## Check Dapr Sidecar Logs

Start by inspecting the Dapr sidecar logs on the publisher and subscriber pods.

```bash
# Publisher sidecar logs
kubectl logs <publisher-pod> -c daprd --tail=100

# Subscriber sidecar logs
kubectl logs <subscriber-pod> -c daprd --tail=100
```

Look for errors mentioning `pubsub`, `delivery`, or your component name. A failed broker connection looks like:

```text
level=error msg="error publishing message: connection refused" component=kafka
```

## Verify Pub/Sub Component Health

Check the loaded components via the Dapr metadata API on the sidecar:

```bash
kubectl port-forward <app-pod> 3500:3500 &
curl http://localhost:3500/v1.0/metadata | jq '.components'
```

This returns each component's name, type, version, and capabilities. If your pub/sub component is missing from the list, it failed to initialize — check the sidecar logs for credential or connectivity errors.

## Test the Subscription Endpoint

Dapr calls your subscriber's `/dapr/subscribe` endpoint at startup. Verify it returns the correct configuration:

```bash
curl http://localhost:<app-port>/dapr/subscribe
```

Expected response:

```json
[
  {
    "pubsubname": "kafka-pubsub",
    "topic": "orders",
    "route": "/orders"
  }
]
```

If this endpoint returns an error or empty array, Dapr will not route messages to your app.

## Enable Verbose Logging

Increase Dapr log verbosity to trace message routing:

```yaml
annotations:
  dapr.io/log-level: "debug"
  dapr.io/enable-api-logging: "true"
```

With debug logging enabled, you can follow a message from publish through delivery:

```bash
kubectl logs <pod> -c daprd | grep -i "pubsub\|topic\|deliver"
```

## Inspect Dead Letter Topics

Configure a dead-letter topic to capture failed messages:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: orders-sub
spec:
  pubsubname: kafka-pubsub
  topic: orders
  route: /orders
  deadLetterTopic: orders-dlq
```

Then subscribe to `orders-dlq` to inspect what went wrong with undeliverable messages.

## Check Subscriber Response Codes

Dapr retries delivery if the subscriber returns a non-2xx HTTP status or the gRPC status is not `OK`. Verify your handler returns the correct status:

```javascript
app.post('/orders', (req, res) => {
  try {
    processOrder(req.body);
    res.sendStatus(200); // Signal success
  } catch (err) {
    console.error(err);
    res.sendStatus(500); // Dapr will retry
  }
});
```

Returning 404 causes Dapr to drop the message without retry. Returning 500 triggers a retry. To control retry backoff behavior, configure a Dapr resiliency policy.

## Use Zipkin Tracing

Enable distributed tracing to follow messages across services:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

Search Zipkin for `pubsub/publish` and `pubsub/subscribe` spans to find where delivery breaks down.

## Summary

Debugging Dapr pub/sub delivery failures requires checking sidecar logs, verifying component health, and inspecting subscriber endpoint responses. Use dead-letter topics to capture failed messages and distributed tracing to follow the full message lifecycle. Returning correct HTTP status codes from subscribers ensures Dapr applies the right retry or drop behavior.
