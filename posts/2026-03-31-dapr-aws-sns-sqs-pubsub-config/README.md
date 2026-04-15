# How to Configure AWS SNS/SQS for Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SNS, SQS, Pub/Sub, Messaging, Cloud

Description: Configure AWS SNS and SQS as Dapr pub/sub components for reliable event-driven messaging in AWS-hosted microservices.

---

## Overview

AWS SNS (Simple Notification Service) combined with SQS (Simple Queue Service) forms a classic fan-out messaging pattern. Dapr's SNS/SQS pub/sub component abstracts this infrastructure, letting you publish and subscribe using Dapr's standard API.

## Setting Up AWS Resources

Create the required SNS topic and SQS queue using the AWS CLI:

```bash
# Create SNS topic
aws sns create-topic --name orders --region us-east-1

# Create SQS queue with dead-letter queue
aws sqs create-queue \
  --queue-name orders-dlq \
  --region us-east-1

aws sqs create-queue \
  --queue-name orders-processor \
  --attributes '{
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789012:orders-dlq\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region us-east-1

# Subscribe SQS to SNS
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:orders \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:123456789012:orders-processor
```

## IAM Policy Configuration

Create an IAM policy that grants Dapr the required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:CreateTopic",
        "sns:GetTopicAttributes",
        "sns:Subscribe",
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:CreateQueue",
        "sqs:SetQueueAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

## Dapr Component Configuration

Create a Kubernetes secret for AWS credentials:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Define the Dapr pub/sub component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sns-sqs-pubsub
  namespace: default
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: region
    value: "us-east-1"
  - name: sqsDeadLettersQueueName
    value: "orders-dlq"
  - name: messageVisibilityTimeout
    value: "30"
  - name: messageReceiveLimit
    value: "3"
  - name: messageWaitTimeSeconds
    value: "20"
```

## Publishing Events

```python
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    event_data = {
        "orderId": "ord-123",
        "items": ["item-a", "item-b"],
        "total": 99.99
    }
    client.publish_event(
        pubsub_name='sns-sqs-pubsub',
        topic_name='orders',
        data=json.dumps(event_data),
        data_content_type='application/json'
    )
    print("Order published successfully")
```

## Subscribing with Scopes

Limit which services can subscribe using Dapr scopes:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sns-sqs-pubsub
  namespace: default
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  scopes:
  - order-service
  - inventory-service
```

## Summary

AWS SNS/SQS with Dapr provides a robust event-driven messaging solution that leverages AWS's durable, scalable queuing infrastructure. Dead-letter queues handle failed messages automatically, while Dapr's pub/sub abstraction keeps your application code portable across different message brokers. Using IAM roles with IRSA on EKS avoids hard-coded credentials entirely.
