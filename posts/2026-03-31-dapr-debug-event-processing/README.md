# How to Debug Event Processing Issues in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Debugging, Pub/Sub, Troubleshooting, Event Processing, Observability

Description: Debug event processing failures in Dapr pub/sub using logs, tracing, dead-letter queues, and Dapr diagnostic tools.

---

## Overview

Event processing failures in Dapr pub/sub are challenging to debug because failures are asynchronous and may involve multiple services. This guide covers systematic approaches to diagnosing failed deliveries, stuck consumers, and silent message drops.

## Enable Debug Logging

Increase Dapr sidecar log verbosity for detailed pub/sub traces:

```bash
# Set log level via Dapr annotation
kubectl annotate pod my-app-pod \
  dapr.io/log-level=debug \
  --overwrite

# Or set in deployment
kubectl patch deployment order-service -p '{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "dapr.io/log-level": "debug"
        }
      }
    }
  }
}'
```

View Dapr sidecar logs:

```bash
# Stream Dapr sidecar logs
kubectl logs -l app=order-service -c daprd -f

# Filter for pub/sub specific logs
kubectl logs deployment/order-service -c daprd | grep -i "pubsub\|subscription\|topic"
```

## Check Subscription Registration

Verify Dapr received your subscription configuration:

```bash
# Check subscriptions via Dapr metadata API
kubectl exec -it deploy/order-service -c order-service -- \
  curl http://localhost:3500/v1.0/metadata | jq '.subscriptions'
```

Expected output:
```json
[
  {
    "pubsubname": "orders-pubsub",
    "topic": "OrderPlaced",
    "rules": [
      {
        "path": "/orders/placed"
      }
    ]
  }
]
```

## Test Subscription Endpoint Directly

```bash
# Test if the subscription route responds correctly
curl -X POST http://localhost:8080/orders/placed \
  -H "Content-Type: application/json" \
  -d '{
    "specversion": "1.0",
    "id": "test-event-001",
    "source": "test",
    "type": "OrderPlaced",
    "data": {
      "orderId": "test-order",
      "customerId": "test-customer"
    }
  }'

# Expected: 200 with {"status": "SUCCESS"}
# Wrong responses cause Dapr to retry or drop the message
```

## Dead-Letter Queue Inspection

Configure and check dead-letter queues for failed messages:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orders-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: consumerGroup
    value: "order-processor"
```

```bash
# Check Kafka dead-letter topic for failed messages
kafka-console-consumer.sh \
  --bootstrap-server kafka:9092 \
  --topic OrderPlaced-dead-letter \
  --from-beginning \
  --max-messages 10

# For RabbitMQ - inspect dead-letter queue via management UI
rabbitmqadmin get queue=orders-dead-letter count=10 \
  -H localhost -u admin -p admin
```

## Dapr Dashboard for Visual Debugging

```bash
# Open Dapr dashboard
dapr dashboard -k

# Or port-forward to the dashboard
kubectl port-forward service/dapr-dashboard 8080:8080 -n dapr-system
# Open http://localhost:8080
```

## Publish a Test Event Manually

```bash
# Publish directly via Dapr HTTP API (bypasses app code)
curl -X POST http://localhost:3500/v1.0/publish/orders-pubsub/OrderPlaced \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "debug-001",
    "customerId": "debug-customer",
    "total": 1.00
  }'
```

## Trace a Failed Event

```python
import requests
import json

def debug_publish_and_trace(event_data: dict):
    """Publish with explicit traceparent header for debugging"""
    trace_id = "abcd1234abcd1234abcd1234abcd1234"
    traceparent = f"00-{trace_id}-0000000000000001-01"

    response = requests.post(
        "http://localhost:3500/v1.0/publish/orders-pubsub/OrderPlaced",
        headers={
            "Content-Type": "application/json",
            "traceparent": traceparent
        },
        data=json.dumps(event_data)
    )
    print(f"Published with trace ID: {trace_id}")
    print(f"Response: {response.status_code}")
    print("Search for this trace in Jaeger/Zipkin to follow the event path")
```

## Common Issues Checklist

```bash
# 1. Component not loaded
kubectl get component orders-pubsub -n default

# 2. Secrets not available
kubectl get secret orders-pubsub-secret -n default

# 3. App not returning 200 for subscription endpoint
kubectl logs deploy/order-service | grep -E "5[0-9]{2}|error|Error"

# 4. Network policy blocking Dapr sidecar
kubectl get networkpolicy -n default

# 5. Dapr sidecar not injected
kubectl get pod -l app=order-service -o jsonpath='{.items[*].spec.containers[*].name}'
```

## Summary

Debugging event processing in Dapr requires a layered approach: verify subscription registration, test endpoint responses directly, enable debug logging, and inspect dead-letter queues. The Dapr metadata API is the first stop to confirm that subscriptions are registered correctly. Test events published directly via the HTTP API help isolate whether issues are in the Dapr component configuration or in the application handler logic.
