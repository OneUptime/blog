# How to Implement Dead Letter Processing in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Dead Letter, Pub/Sub, Error Handling, Microservice

Description: Learn how to implement dead letter queue processing in Dapr for undeliverable messages, including routing, reprocessing, and alerting patterns.

---

## What Is a Dead Letter Queue

A dead letter queue (DLQ) captures messages that cannot be delivered after exhausting all retry attempts. In Dapr, dead letter topics serve the same purpose - undeliverable pub/sub messages are redirected to a separate topic for investigation and reprocessing. This prevents message loss and provides a safety net for production incidents.

## Configuring Dead Letter Topics

Add a `deadLetterTopic` to your subscription definition:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: payment-subscription
  namespace: payments
spec:
  pubsubname: payments-pubsub
  topic: payment-events
  routes:
    default: /process-payment
  deadLetterTopic: payment-dlq
  bulkSubscribe:
    enabled: false
```

Messages land in `payment-dlq` when delivery fails and all retry attempts configured in the resiliency policy are exhausted.

## Processing Dead Letter Messages

Subscribe to the DLQ topic in a dedicated handler service:

```python
from flask import Flask, request, jsonify
import json
from datetime import datetime

app = Flask(__name__)

@app.route("/dapr/subscribe", methods=["GET"])
def subscribe():
    return jsonify([
        {
            "pubsubname": "payments-pubsub",
            "topic": "payment-dlq",
            "routes": {
                "default": "/handle-dlq"
            }
        }
    ])

@app.route("/handle-dlq", methods=["POST"])
def handle_dlq():
    envelope = request.get_json()
    message = envelope.get("data", {})
    message_id = envelope.get("id", "unknown")

    # Store for investigation
    store_dlq_record({
        "messageId": message_id,
        "payload": message,
        "receivedAt": datetime.utcnow().isoformat(),
        "status": "pending-review"
    })

    # Notify operations team
    send_dlq_alert(message_id, message)

    return "", 200
```

## Reprocessing Dead Letter Messages

Build an admin endpoint to replay DLQ messages after fixing the underlying issue:

```python
from dapr.clients import DaprClient
import json

def replay_dlq_message(dlq_record_id: str):
    record = get_dlq_record(dlq_record_id)
    original_payload = record["payload"]

    with DaprClient() as client:
        # Re-publish to the original topic
        client.publish_event(
            pubsub_name="payments-pubsub",
            topic_name="payment-events",
            data=json.dumps(original_payload),
            publish_metadata={
                "cloudevent.id": f"replay-{dlq_record_id}"
            }
        )

    update_dlq_record_status(dlq_record_id, "replayed")
```

## DLQ Metrics Dashboard

Expose DLQ depth as a custom metric so you can alert on accumulation:

```python
from prometheus_client import Gauge, start_http_server

dlq_depth = Gauge(
    "dapr_dlq_depth",
    "Number of unprocessed DLQ messages",
    ["topic"]
)

def update_dlq_metrics():
    depth = count_pending_dlq_records("payment-dlq")
    dlq_depth.labels(topic="payment-dlq").set(depth)
```

Add a Prometheus alert rule:

```yaml
groups:
- name: dapr-dlq
  rules:
  - alert: DLQDepthHigh
    expr: dapr_dlq_depth{topic="payment-dlq"} > 50
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "DLQ depth exceeds threshold for {{ $labels.topic }}"
```

## Preventing DLQ Accumulation

Configure resiliency policies to balance retry attempts before DLQ routing:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: payment-resiliency
spec:
  policies:
    retries:
      paymentRetry:
        policy: exponential
        maxRetries: 3
        maxInterval: 15s
  targets:
    components:
      payments-pubsub:
        inbound:
          retry: paymentRetry
```

## Summary

Dapr dead letter topics provide a reliable safety net for undeliverable messages by capturing them in a separate topic for investigation and replay. A dedicated DLQ processor service stores failed messages, sends alerts, and exposes replay endpoints for operator-driven reprocessing. Monitoring DLQ depth with Prometheus alerts ensures accumulation is caught early before it becomes an incident.
