# How to Use Dapr Bindings with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Python, Integration, Event-Driven

Description: Learn how to use Dapr input and output bindings in Python to connect your microservices to external systems like Kafka, cron triggers, and storage.

---

## Introduction

Dapr Bindings connect Python microservices to external systems without custom integration code. Input bindings trigger your app when external events occur, while output bindings let your app write data to external resources through a simple API.

## Installation

```bash
pip install dapr flask flask-dapr
```

## Configuring a Cron Input Binding

```yaml
# dapr/components/cron.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron-trigger
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "@every 60s"
```

## Configuring a Kafka Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-input
spec:
  type: bindings.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: topics
      value: "raw-events"
    - name: consumerGroup
      value: "processor-group"
```

## Handling Input Bindings with Flask

```python
# app.py
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route("/cron-trigger", methods=["POST"])
def handle_cron():
    print("Cron job triggered - running cleanup task")
    cleanup_old_records()
    return jsonify({"status": "ok"})

@app.route("/kafka-input", methods=["POST"])
def handle_kafka():
    event_data = request.get_json()
    payload = json.loads(event_data.get("data", "{}"))
    print("Kafka message received:", payload)
    process_event(payload)
    return jsonify({"status": "ok"})

def cleanup_old_records():
    print("Deleting records older than 30 days...")

def process_event(event):
    print("Processing event type:", event.get("type"))

if __name__ == "__main__":
    app.run(port=5000)
```

## Configuring an Output Binding (Azure Blob Storage)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-blob
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
    - name: accountName
      value: "mystorageaccount"
    - name: accountKey
      secretKeyRef:
        name: azure-secret
        key: storage-key
    - name: containerName
      value: "reports"
```

## Invoking Output Bindings

```python
import json
from dapr.clients import DaprClient

def save_report_to_blob(report_content: str, filename: str) -> None:
    with DaprClient() as client:
        client.invoke_binding(
            binding_name="azure-blob",
            operation="create",
            data=report_content.encode("utf-8"),
            binding_metadata={"blobName": filename},
        )
        print(f"Report saved to blob: {filename}")

def send_to_kafka(message: dict) -> None:
    with DaprClient() as client:
        client.invoke_binding(
            binding_name="kafka-output",
            operation="create",
            data=json.dumps(message).encode("utf-8"),
        )
        print("Message sent to Kafka")
```

## Configuring a Kafka Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-output
spec:
  type: bindings.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: publishTopic
      value: "processed-events"
```

## Running with Dapr

```bash
dapr run \
  --app-id processor-service \
  --app-port 5000 \
  --resources-path ./dapr/components \
  -- python app.py
```

## Summary

Dapr Bindings in Python give you a clean abstraction for connecting to external systems. Flask route handlers receive input binding triggers, and `client.invoke_binding()` calls send data to external outputs. By keeping integration logic in Dapr component configuration, you can swap underlying systems without modifying Python application code.
