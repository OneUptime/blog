# How to Trace Pub/Sub Message Flow in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Pub/Sub, Message Flow, Observability, Microservice

Description: Trace the complete lifecycle of pub/sub messages in Dapr from publisher through broker to subscriber for end-to-end message flow visibility.

---

## Overview

Pub/sub message flows are inherently asynchronous, making them harder to trace than synchronous service calls. Dapr automatically instruments publish and subscribe operations, creating trace spans that link the publisher's trace to the subscriber's processing. This guide covers how Dapr traces pub/sub flows and how to visualize complete message journeys.

## How Dapr Traces Pub/Sub Operations

When a Dapr app publishes a message:
1. Dapr creates a span for the `PublishEvent` operation
2. The trace context (`traceparent`) is embedded in the CloudEvent attributes
3. When the subscriber receives the message, Dapr reads the trace context from the CloudEvent
4. Dapr creates a child span under the same trace, linking publish and subscribe

This creates a connected trace even though message delivery is asynchronous.

## Setting Up Tracing

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pubsub-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

## Publisher Service

```python
from flask import Flask, request
import requests

app = Flask(__name__)
DAPR_URL = "http://localhost:3500"

@app.route('/checkout', methods=['POST'])
def checkout():
    order = request.json

    # Publish - Dapr creates a PublishEvent span
    resp = requests.post(
        f"{DAPR_URL}/v1.0/publish/kafka-pubsub/order-completed",
        json=order,
        headers={
            "Content-Type": "application/json",
            "traceparent": request.headers.get("traceparent", "")
        }
    )

    return {"status": "published"}, 200
```

## Subscriber Service

```python
from flask import Flask, request
import json

app = Flask(__name__)

@app.route('/order-completed', methods=['POST'])
def handle_order_completed():
    # CloudEvent from Dapr
    event = request.json

    # Trace context was propagated by Dapr through the broker
    # The span here is a child of the publisher's span
    order_id = event.get('data', {}).get('orderId')
    trace_id = extract_trace_id(request)

    print(json.dumps({
        "event": "processing_order",
        "order_id": order_id,
        "trace_id": trace_id,
        "cloud_event_id": event.get('id')
    }))

    # Process the order...
    return '', 200

def extract_trace_id(req):
    tp = req.headers.get('traceparent', '')
    parts = tp.split('-')
    return parts[1] if len(parts) >= 2 else 'none'
```

## Viewing the Pub/Sub Trace

In Jaeger or Zipkin, the trace shows:

```text
checkout-service (100ms total)
  |-- POST /checkout (30ms)
  |-- dapr.publish: order-completed (70ms)
        |
        (async gap - message in broker)
        |
  order-processor (80ms total)    <- linked via trace ID
    |-- dapr.subscribe: order-completed (80ms)
          |-- POST /order-completed (75ms)
                |-- dapr.state.set: orders (30ms)
```

Note: The async gap may span seconds or minutes. Trace viewers show this as separate root spans linked by trace ID.

## Tracing Message Retry Attempts

When a subscriber fails, Dapr retries. Each retry creates a new span under the same trace:

```text
order-processor
  Attempt 1: dapr.subscribe (FAILED - 500ms)
  Attempt 2: dapr.subscribe (FAILED - 500ms)
  Attempt 3: dapr.subscribe (SUCCESS - 200ms)
```

This lets you see how many retries occurred and the duration of each attempt.

## Dead Letter Queue Tracing

Messages that exhaust retries go to a DLQ. The DLQ consumer's trace links back to the original publish trace:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-sub
spec:
  pubsubname: kafka-pubsub
  topic: order-completed
  route: /order-completed
  deadLetterTopic: order-completed-dlq
```

## Searching for Pub/Sub Traces

```bash
# Find all traces for order-completed topic
curl "http://localhost:16686/api/traces?service=order-processor&operation=dapr.subscribe"

# Find traces with errors in pub/sub
curl "http://localhost:16686/api/traces?service=order-processor&tag=error:true&operation=dapr.subscribe"
```

## Summary

Dapr automatically traces pub/sub operations by embedding trace context in CloudEvents and creating linked spans at publish and subscribe time. The result is a complete trace that spans the asynchronous message boundary, showing publish latency, broker delivery time (approximate), and subscriber processing time. Use this to identify slow consumers, frequent retry patterns, and messages going to the dead letter queue.
