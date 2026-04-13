# How to Use Dapr with AWS SQS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SQS, Pub/Sub, Messaging

Description: Configure Dapr pub/sub with AWS SQS to send and receive messages between microservices, including dead-letter queue setup and message visibility configuration.

---

Dapr's pub/sub building block supports AWS SQS as a message broker. Services publish messages to topics and subscribe to them without managing SQS queue URLs, polling, or message acknowledgment directly.

## Create SQS Queues

```bash
# Create the main queue
aws sqs create-queue \
  --queue-name dapr-orders \
  --region us-east-1

# Create a dead-letter queue for failed messages
aws sqs create-queue \
  --queue-name dapr-orders-dlq \
  --region us-east-1

# Get DLQ ARN
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/dapr-orders-dlq \
  --attribute-names QueueArn \
  --query "Attributes.QueueArn" \
  --output text)

# Configure redrive policy on the main queue
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/dapr-orders \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"
```

## Configure the Dapr SQS Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
  namespace: default
spec:
  type: pubsub.aws.sqs
  version: v1
  metadata:
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
  - name: messageVisibilityTimeout
    value: "30"
  - name: messageMaxNumber
    value: "10"
  - name: messageWaitTimeSeconds
    value: "20"
  - name: disableEntityManagement
    value: "false"
  - name: sqsDeadLettersQueueName
    value: dapr-orders-dlq
```

## Publish a Message

```python
import requests
import json

def publish_order(order: dict):
    resp = requests.post(
        "http://localhost:3500/v1.0/publish/orderpubsub/orders",
        json=order,
        headers={"Content-Type": "application/json"}
    )
    resp.raise_for_status()
    print(f"Published order: {order['id']}")

publish_order({
    "id": "order-001",
    "customerId": "cust-123",
    "items": [{"sku": "WIDGET-A", "qty": 2}],
    "total": 49.98
})
```

## Subscribe to Messages

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "orderpubsub",
        "topic": "orders",
        "route": "/orders"
    }])

@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.json
    order = event.get('data', {})
    print(f"Processing order: {order['id']}")
    # Process the order...
    return jsonify({"status": "SUCCESS"})

if __name__ == '__main__':
    app.run(port=8080)
```

## Handling Message Failures

Return a RETRY status to requeue a message or DROP to send it to the DLQ:

```python
@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.json
    order = event.get('data', {})

    try:
        process_order(order)
        return jsonify({"status": "SUCCESS"})
    except TemporaryError as e:
        print(f"Temporary error, will retry: {e}")
        return jsonify({"status": "RETRY"})
    except PermanentError as e:
        print(f"Permanent error, sending to DLQ: {e}")
        return jsonify({"status": "DROP"})
```

## Publish with Message Metadata

```python
import requests

requests.post(
    "http://localhost:3500/v1.0/publish/orderpubsub/orders?metadata.ttlInSeconds=300",
    json={"id": "order-002", "total": 25.00},
    headers={"Content-Type": "application/json"}
).raise_for_status()
```

## Summary

Dapr's SQS pub/sub integration handles queue management, long polling, message visibility, and dead-letter queue routing automatically. Services publish and subscribe using simple HTTP endpoints with no SQS SDK required. The RETRY and DROP response statuses give subscribers fine-grained control over message reprocessing and dead-lettering.
