# How to Set Up Dapr Pub/Sub with AWS SNS/SQS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, AWS SNS, AWS SQS, Messaging

Description: Configure Dapr pub/sub messaging with AWS SNS and SQS for serverless, scalable fan-out messaging and queue-based delivery on AWS.

---

## How Dapr Uses SNS and SQS Together

Dapr's AWS pub/sub component uses SNS (Simple Notification Service) as the topic fan-out layer and SQS (Simple Queue Service) as the delivery queue for each subscriber. When you subscribe to a topic, Dapr automatically creates an SNS topic, an SQS queue, and an SNS subscription that routes messages to the queue.

```mermaid
flowchart LR
    P[Publisher App] -->|Publish| SNS[AWS SNS Topic\norders]
    SNS -->|Fan-out| Q1[SQS Queue\norders-subscriber-a]
    SNS -->|Fan-out| Q2[SQS Queue\norders-subscriber-b]
    Q1 -->|Poll| SA[Subscriber A Sidecar]
    Q2 -->|Poll| SB[Subscriber B Sidecar]
    SA --> A[Subscriber A App]
    SB --> B[Subscriber B App]
```

## Prerequisites

- AWS account with SNS and SQS permissions
- Dapr CLI initialized
- AWS credentials configured

## IAM Policy

Attach this policy to your IAM user or role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:CreateTopic",
        "sns:DeleteTopic",
        "sns:Publish",
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:GetTopicAttributes",
        "sns:ListTopics",
        "sqs:CreateQueue",
        "sqs:DeleteQueue",
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ListQueues",
        "sqs:SetQueueAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

## Configuring the SNS/SQS Component

```yaml
# pubsub-snssqs.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: disableEntityManagement
    value: "false"
  - name: messageVisibilityTimeout
    value: "10"
  - name: messageWaitTimeSeconds
    value: "1"
  - name: messageMaxNumber
    value: "10"
  - name: sqsDeadLettersQueueName
    value: "dapr-dead-letter-queue"
```

Create the secret on Kubernetes:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Using IAM Roles (Recommended)

For EKS with IRSA or EC2 instance profiles, omit credentials:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
```

## Publisher Service

```python
# publisher.py
import os
import requests

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def publish(topic, data):
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/{topic}"
    resp = requests.post(url, json=data,
                         headers={"Content-Type": "application/json"})
    resp.raise_for_status()
    print(f"Published: {data}")

# Publish to SNS topic "orders"
publish("orders", {
    "orderId": "ORD-001",
    "customerId": "CUST-42",
    "amount": 99.99,
    "region": "us-east"
})

# Publish to a different topic
publish("user-signups", {
    "userId": "USR-001",
    "email": "alice@example.com",
    "plan": "pro"
})
```

Start:

```bash
dapr run \
  --app-id aws-publisher \
  --components-path ./components \
  --dapr-http-port 3500 \
  -- python publisher.py
```

## Subscriber Service

```python
# subscriber.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/orders"
        }
    ])

@app.route('/orders', methods=['POST'])
def handle_order():
    event = request.get_json()
    order = event.get("data", {})
    print(f"Received order {order.get('orderId')}: ${order.get('amount')}")

    try:
        process_order(order)
        return jsonify({"status": "SUCCESS"})
    except Exception as e:
        print(f"Error processing order: {e}")
        return jsonify({"status": "RETRY"}), 200

def process_order(order):
    print(f"Order {order['orderId']} fulfilled")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

## Go Subscriber Example

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type Subscription struct {
    PubsubName string `json:"pubsubname"`
    Topic      string `json:"topic"`
    Route      string `json:"route"`
}

type CloudEvent struct {
    ID   string          `json:"id"`
    Data json.RawMessage `json:"data"`
}

func main() {
    http.HandleFunc("/dapr/subscribe", func(w http.ResponseWriter, r *http.Request) {
        subs := []Subscription{{
            PubsubName: "pubsub",
            Topic:      "orders",
            Route:      "/orders",
        }}
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(subs)
    })

    http.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
        var event CloudEvent
        json.NewDecoder(r.Body).Decode(&event)

        var order map[string]interface{}
        json.Unmarshal(event.Data, &order)
        fmt.Printf("Order received: %v\n", order)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "SUCCESS"})
    })

    log.Println("Starting subscriber on :3001")
    log.Fatal(http.ListenAndServe(":3001", nil))
}
```

## Message Deduplication

SQS FIFO queues support exactly-once delivery. Configure the component to use FIFO:

```yaml
  - name: fifo
    value: "true"
  - name: fifoMessageGroupID
    value: "mygroup"
```

## Testing with LocalStack

For local development without AWS:

```yaml
  - name: endpoint
    value: "http://localhost:4566"
  - name: region
    value: "us-east-1"
  - name: accessKey
    value: "test"
  - name: secretKey
    value: "test"
```

Start LocalStack:

```bash
docker run -d -p 4566:4566 localstack/localstack
```

## Monitoring

Monitor SQS queue depth via AWS CloudWatch:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=orders-order-subscriber \
  --start-time 2026-03-31T00:00:00Z \
  --end-time 2026-03-31T23:59:59Z \
  --period 300 \
  --statistics Average
```

## Summary

Dapr pub/sub with AWS SNS/SQS creates SNS topics for fan-out and SQS queues per subscriber for reliable delivery. The component handles topic and queue creation automatically. Publishers post to `/v1.0/publish` and messages are delivered via SNS to all subscribed SQS queues. Using IAM roles instead of access keys is recommended for production. LocalStack enables local testing without AWS credentials.
