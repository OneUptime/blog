# How to Configure Dapr with AWS SNS/SQS Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SNS, SQS, Pub/Sub, Cloud, Messaging, Microservice

Description: Configure Dapr's pub/sub building block with AWS SNS and SQS for reliable cloud-native messaging on AWS infrastructure.

---

## Overview

AWS SNS (Simple Notification Service) and SQS (Simple Queue Service) work together to provide a robust pub/sub pattern. Dapr's SNS/SQS component automatically manages SNS topics and SQS queues, handling subscriptions, message delivery, and dead-letter queues. This guide covers configuring Dapr to use SNS/SQS as its pub/sub backend on AWS.

## Prerequisites

- AWS account with SNS and SQS permissions
- Dapr CLI installed
- AWS credentials configured (IAM role or access keys)
- AWS CLI installed

## Required IAM Permissions

Your IAM role or user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:CreateTopic",
        "sns:Subscribe",
        "sns:Publish",
        "sns:GetTopicAttributes",
        "sqs:CreateQueue",
        "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes",
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:SetQueueAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sns-sqs-pubsub
  namespace: default
spec:
  type: pubsub.snssqs
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
    - name: sqsDeadLettersQueueName
      value: "dapr-dead-letter-queue"
    - name: messageVisibilityTimeout
      value: "60"
    - name: messageRetryLimit
      value: "3"
    - name: messageWaitTimeSeconds
      value: "20"
```

## Using IAM Roles on EKS

If running on EKS with IRSA (IAM Roles for Service Accounts), skip the access keys:

```yaml
spec:
  type: pubsub.snssqs
  version: v1
  metadata:
    - name: region
      value: "us-east-1"
    - name: sqsDeadLettersQueueName
      value: "dapr-dead-letter-queue"
```

Annotate the Kubernetes service account:

```bash
kubectl annotate serviceaccount order-service \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/dapr-pubsub-role
```

## Publishing Messages

```bash
curl -X POST http://localhost:3500/v1.0/publish/sns-sqs-pubsub/order-created \
  -H "Content-Type: application/json" \
  -d '{"orderId": "AWS-3001", "amount": 149.99}'
```

Dapr automatically creates an SNS topic named `order-created` and an SQS queue for each subscriber.

## Subscribing in Node.js

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/order-created', (req, res) => {
  const { data } = req.body;
  console.log(`Processing order ${data.orderId} for $${data.amount}`);
  res.sendStatus(200);
});

app.listen(3000);
```

Subscription YAML:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-sub
spec:
  pubsubname: sns-sqs-pubsub
  topic: order-created
  route: /order-created
```

## Monitoring with AWS CloudWatch

```bash
# Check SQS queue depth
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=order-service-order-created \
  --period 60 \
  --statistics Average \
  --start-time 2026-03-31T00:00:00Z \
  --end-time 2026-03-31T01:00:00Z
```

## Summary

Dapr's SNS/SQS component automates the creation and management of AWS SNS topics and SQS queues, including dead-letter queue setup. On EKS, use IRSA to avoid managing AWS credentials directly. The component handles long polling, message visibility timeouts, and retry logic, letting your application focus on business logic rather than AWS SDK integration.
