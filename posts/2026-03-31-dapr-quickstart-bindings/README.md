# How to Run Dapr Quickstart for Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Quickstart, Input Binding, Output Binding

Description: Run the Dapr bindings quickstart to trigger your application on a schedule using an input binding and call an external system using an output binding.

---

## What You Will Build

Two components: a cron input binding that triggers your app every 10 seconds, and an HTTP output binding that lets your app call an external API.

```mermaid
flowchart LR
    Cron[bindings.cron\n@every 10s] -->|trigger| Sidecar[Dapr Sidecar]
    Sidecar -->|POST /cron-trigger| App[Application]
    App -->|POST /v1.0/bindings/external-api| Sidecar
    Sidecar -->|HTTP POST| External[External API]
```

## Prerequisites

```bash
dapr init
```

## Component Definitions

### Input Binding - Cron

```yaml
# components/cron.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron-trigger
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 10s"
  - name: direction
    value: "input"
```

### Output Binding - HTTP

```yaml
# components/http-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: external-api
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: https://httpbin.org
  - name: direction
    value: "output"
```

## The Application

```python
# app.py
from flask import Flask
import requests
import os

app = Flask(__name__)
DAPR_HTTP_PORT = os.getenv('DAPR_HTTP_PORT', '3500')

# Input binding handler - called every 10 seconds by the cron trigger
@app.route('/cron-trigger', methods=['POST'])
def handle_cron():
    print("Cron triggered! Running scheduled task...")

    # Use output binding to call external API
    response = requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/external-api",
        json={
            "data": {"timestamp": "2026-03-31T12:00:00Z", "task": "scheduled-report"},
            "operation": "create",
            "metadata": {
                "path": "/post",
                "Content-Type": "application/json"
            }
        }
    )
    print(f"External API response: {response.status_code}")
    return '', 200

if __name__ == '__main__':
    app.run(port=5001)
```

## Run the Application

```bash
pip3 install flask requests
dapr run \
  --app-id binding-app \
  --app-port 5001 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  -- python3 app.py
```

## Expected Output

```text
Cron triggered! Running scheduled task...
External API response: 200
Cron triggered! Running scheduled task...
External API response: 200
```

## Other Input Binding Types

### Kafka Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-events
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: topics
    value: incoming-orders
  - name: consumerGroup
    value: binding-consumers
  - name: direction
    value: input
```

Your app endpoint name matches the binding component name:

```python
@app.route('/kafka-events', methods=['POST'])
def handle_kafka_event():
    event = request.get_json()
    print(f"Kafka event: {event}")
    return '', 200
```

### AWS S3 Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-trigger
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: my-uploads-bucket
  - name: region
    value: us-east-1
  - name: direction
    value: input
```

## Other Output Binding Types

### Send Email via SendGrid

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid
spec:
  type: bindings.twilio.sendgrid
  version: v1
  metadata:
  - name: apiKey
    secretKeyRef:
      name: sendgrid-secret
      key: api-key
auth:
  secretStore: kubernetes
```

```python
requests.post(
    f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/sendgrid",
    json={
        "operation": "create",
        "data": "Order confirmation: your order ord-001 has shipped.",
        "metadata": {
            "emailTo": "customer@example.com",
            "emailFrom": "noreply@example.com",
            "subject": "Order Shipped"
        }
    }
)
```

### Upload to AWS S3

```python
import base64

with open("report.pdf", "rb") as f:
    content = base64.b64encode(f.read()).decode()

requests.post(
    f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/s3-output",
    json={
        "operation": "create",
        "data": content,
        "metadata": {
            "key": "reports/2026-03-31-report.pdf",
            "contentType": "application/pdf"
        }
    }
)
```

## Output Binding Operations

Different binding types support different operations:

| Binding | Operations |
|---------|-----------|
| `bindings.http` | `create` |
| `bindings.aws.s3` | `create`, `get`, `delete`, `list` |
| `bindings.kafka` | `create` |
| `bindings.twilio.sendgrid` | `create` |
| `bindings.azure.storagequeues` | `create` |

## Summary

The Dapr bindings quickstart shows how input bindings trigger your application from external events (cron schedules, Kafka messages, S3 uploads) and output bindings let your application write to external systems (HTTP endpoints, S3, email). The application handler endpoint name matches the binding component name. No SDK is required - all interactions use standard HTTP calls.
