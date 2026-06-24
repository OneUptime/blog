# How to Use Dapr with AWS Kinesis for Stream Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Kinesis, Stream Processing, Pub/Sub

Description: Configure Dapr pub/sub with AWS Kinesis Data Streams to process high-throughput event streams from microservices with at-least-once delivery guarantees.

---

AWS Kinesis Data Streams provides high-throughput, ordered event streaming. Dapr's Kinesis binding component lets microservices produce and consume stream events without managing shard iterators, checkpointing, or the Kinesis SDK.

## Create a Kinesis Data Stream

```bash
aws kinesis create-stream \
  --stream-name order-events \
  --shard-count 4 \
  --region us-east-1

# Wait for the stream to become active
aws kinesis wait stream-exists \
  --stream-name order-events \
  --region us-east-1

aws kinesis describe-stream-summary \
  --stream-name order-events \
  --region us-east-1
```

## Configure the Dapr Kinesis Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kinesis-binding
  namespace: default
spec:
  type: bindings.aws.kinesis
  version: v1
  metadata:
  - name: streamName
    value: order-events
  - name: consumerName
    value: order-processor
  - name: mode
    value: extended
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

## Produce Events to Kinesis

```python
import requests
import json
import base64

def publish_event(event_type: str, data: dict, partition_key: str):
    payload = json.dumps({"eventType": event_type, "data": data})
    encoded = base64.b64encode(payload.encode()).decode()

    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/kinesis-binding",
        json={
            "operation": "create",
            "data": encoded,
            "metadata": {
                "partitionKey": partition_key
            }
        }
    )
    resp.raise_for_status()
    print(f"Event published: {event_type}")

# Publish order events
publish_event("ORDER_PLACED", {
    "orderId": "order-001",
    "customerId": "cust-123",
    "total": 150.00
}, partition_key="cust-123")

publish_event("PAYMENT_RECEIVED", {
    "orderId": "order-001",
    "amount": 150.00,
    "method": "card"
}, partition_key="cust-123")
```

## Consume Events from Kinesis

The Kinesis binding triggers your service endpoint for each record received:

```python
from flask import Flask, request, jsonify
import base64
import json

app = Flask(__name__)

@app.route('/kinesis-binding', methods=['POST'])
def handle_kinesis_event():
    body = request.json
    # Kinesis records are base64-encoded
    raw = base64.b64decode(body.get('data', '')).decode('utf-8')
    event = json.loads(raw)

    event_type = event.get('eventType')
    data = event.get('data', {})

    print(f"Processing event: {event_type}")
    print(f"Shard ID: {body.get('metadata', {}).get('ShardId')}")
    print(f"Sequence: {body.get('metadata', {}).get('SequenceNumber')}")

    if event_type == 'ORDER_PLACED':
        process_new_order(data)
    elif event_type == 'PAYMENT_RECEIVED':
        process_payment(data)

    return jsonify({"status": "SUCCESS"})

def process_new_order(data: dict):
    print(f"New order: {data['orderId']}")

def process_payment(data: dict):
    print(f"Payment for order: {data['orderId']}, amount: {data['amount']}")

if __name__ == '__main__':
    app.run(port=8080)
```

## Configure Enhanced Fan-out Consumer

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kinesis-fanout
  namespace: default
spec:
  type: bindings.aws.kinesis
  version: v1
  metadata:
  - name: streamName
    value: order-events
  - name: consumerName
    value: analytics-consumer
  - name: mode
    value: extended
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

## Summary

Dapr's Kinesis binding abstracts shard management, checkpointing, and record iteration behind a simple HTTP trigger and output binding API. Services produce events with a partition key to control shard routing and consume events by implementing a POST endpoint. Extended fan-out mode provides dedicated throughput per consumer, ideal for analytics pipelines processing the same stream in parallel.
