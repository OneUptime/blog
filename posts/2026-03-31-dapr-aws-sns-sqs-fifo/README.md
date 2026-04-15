# How to Configure AWS SNS/SQS with FIFO Queues for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SNS, SQS, FIFO, Pub/Sub

Description: Configure Dapr AWS SNS/SQS pub/sub with FIFO queues and topics to ensure ordered, exactly-once message delivery using message group IDs and deduplication.

---

## Overview

AWS SQS FIFO queues guarantee ordered delivery within a message group and support exactly-once processing via deduplication. When used with SNS FIFO topics, messages are delivered to subscribers in order within their group. Dapr's SNS/SQS component supports FIFO via the `fifo` metadata flag and the `fifoMessageGroupID` field, which sets the message group ID at the component level.

## Create FIFO SNS Topic and SQS Queue

FIFO resources must have names ending in `.fifo`:

```bash
# Create FIFO SNS topic
aws sns create-topic \
  --name orders.fifo \
  --attributes ContentBasedDeduplication=true

# Create FIFO SQS queue
aws sqs create-queue \
  --queue-name orders-dapr.fifo \
  --attributes FifoQueue=true,ContentBasedDeduplication=true,VisibilityTimeout=30

# Subscribe SQS to SNS
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:orders.fifo \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:123456789012:orders-dapr.fifo
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: snssqs-pubsub
  namespace: default
spec:
  type: pubsub.snssqs
  version: v1
  metadata:
    - name: accessKey
      secretKeyRef:
        name: aws-secret
        key: access-key
    - name: secretKey
      secretKeyRef:
        name: aws-secret
        key: secret-key
    - name: region
      value: "us-east-1"
    - name: fifo
      value: "true"
    - name: fifoMessageGroupID
      value: "orders"
    - name: messageVisibilityTimeout
      value: "30"
    - name: messageRetryLimit
      value: "3"
    - name: messageWaitTimeSeconds
      value: "20"
    - name: sqsDeadLettersQueueName
      value: "orders-dlq.fifo"
```

## Publishing Messages

The message group ID is set at the component level via `fifoMessageGroupID`. All messages published through this component share the same ordering scope. Deduplication is handled automatically via content-based deduplication enabled on the SNS topic and SQS queue:

```python
from dapr.clients import DaprClient
import json

def publish_order_event(order_id: str, event: dict):
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="snssqs-pubsub",
            topic_name="orders",
            data=json.dumps(event),
            data_content_type="application/json",
        )

publish_order_event("order-123", {
    "type": "payment_received",
    "timestamp": "2026-03-31T10:00:00Z",
    "amount": 150.00
})
```

## SQS Queue Policy

Grant SNS permission to send to the FIFO SQS queue:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "sns.amazonaws.com"},
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:us-east-1:123456789012:orders-dapr.fifo",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "arn:aws:sns:us-east-1:123456789012:orders.fifo"
        }
      }
    }
  ]
}
```

## IAM Policy for Dapr

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage", "sqs:DeleteMessage",
        "sqs:GetQueueAttributes", "sqs:GetQueueUrl",
        "sns:Publish", "sns:CreateTopic",
        "sns:Subscribe", "sns:GetTopicAttributes"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-1:123456789012:orders-dapr.fifo",
        "arn:aws:sns:us-east-1:123456789012:orders.fifo"
      ]
    }
  ]
}
```

## Summary

Configuring Dapr SNS/SQS with FIFO queues requires setting `fifo: "true"` in the component, creating SNS and SQS resources with `.fifo` name suffixes, and setting `fifoMessageGroupID` to define the ordering scope. All messages published through the component share the same message group and are delivered in order. Enable `ContentBasedDeduplication` on the SNS topic and SQS queue to prevent duplicate processing.
