# How to Trace Binding Operations in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Binding, Observability, Microservice, Input Binding, Output Binding

Description: Monitor Dapr input and output binding operations with distributed traces to measure integration latency and debug external system connectivity.

---

## Overview

Dapr bindings connect your application to external systems like databases, queues, storage, and SaaS APIs. Output bindings let your app trigger external actions, while input bindings let external events trigger your app. Dapr traces both directions, giving you visibility into integration latency and failures.

## How Dapr Traces Bindings

- **Output bindings**: When your app calls `v1.0/bindings/{name}`, Dapr creates a span for the binding invocation. The span duration includes the time to deliver the message or invoke the external service.
- **Input bindings**: When an external event triggers your app endpoint, Dapr creates a span for delivering the event to your application.

## Setting Up Tracing

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: binding-tracing
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

## Example: Kafka Output Binding

Define the binding component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-binding
  namespace: default
spec:
  type: bindings.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: topics
      value: "notifications"
    - name: consumerGroup
      value: "notification-processor"
    - name: authType
      value: "none"
```

Using the output binding from your app:

```python
from flask import Flask, request
import requests

app = Flask(__name__)
DAPR_URL = "http://localhost:3500"

@app.route('/notify', methods=['POST'])
def send_notification():
    data = request.json

    # Output binding call - Dapr creates a span
    resp = requests.post(
        f"{DAPR_URL}/v1.0/bindings/kafka-binding",
        json={
            "data": {"userId": data['userId'], "message": data['message']},
            "operation": "create"
        },
        headers={
            "Content-Type": "application/json",
            "traceparent": request.headers.get("traceparent", "")
        }
    )

    return {"sent": resp.status_code == 200}, 200
```

## Example: Storage Blob Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: blob-storage
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
    - name: accountName
      value: "myaccount"
    - name: accountKey
      secretKeyRef:
        name: storage-secret
        key: accessKey
    - name: containerName
      value: "uploads"
```

```python
import base64

@app.route('/upload', methods=['POST'])
def upload_file():
    file_data = request.data

    resp = requests.post(
        f"{DAPR_URL}/v1.0/bindings/blob-storage",
        json={
            "data": base64.b64encode(file_data).decode(),
            "metadata": {"blobName": "report.pdf"},
            "operation": "create"
        },
        headers={"traceparent": request.headers.get("traceparent", "")}
    )

    return {"uploaded": resp.status_code == 200}, 200
```

## Input Binding - Handling External Events

```python
# Input binding endpoint - triggered by external event (e.g., cron, SQS)
@app.route('/scheduled-report', methods=['POST'])
def handle_scheduled_report():
    # Dapr creates a span for delivering this input binding event
    event = request.json
    print(f"Scheduled report triggered: {event}")
    generate_report()
    return '', 200
```

## Binding Span Attributes

Dapr binding spans include:

| Attribute | Example |
|---|---|
| `db.system` | `bindings` |
| `db.name` | `kafka-binding` |
| `db.statement` | `POST /v1.0/bindings/kafka-binding` |

## Searching for Binding Traces

```bash
# Find all binding invocations
curl "http://localhost:16686/api/traces?service=order-service&tags=%7B%22db.system%22%3A%22bindings%22%7D"

# Find slow binding calls
curl "http://localhost:16686/api/traces?service=order-service&minDuration=1s&tags=%7B%22db.system%22%3A%22bindings%22%7D"

# Find binding errors
curl "http://localhost:16686/api/traces?service=order-service&tags=%7B%22error%22%3A%22true%22%2C%22db.system%22%3A%22bindings%22%7D"
```

## Debugging Binding Failures

When a binding operation fails, the trace span is marked with error and includes the status code. Common issues visible in traces:

- **Connection refused**: External system down (span duration very short, immediate error)
- **Timeout**: External system slow (span duration equals configured timeout)
- **Auth failure**: Credentials invalid (span has 4xx status code attribute)

## Summary

Dapr traces both input and output binding operations automatically. Output binding spans measure the latency of delivering events or invoking external systems, while input binding spans measure how quickly your application processes incoming external events. Use binding traces to monitor integration health, detect slow external dependencies, and quickly diagnose connectivity failures.
