# How to Use Dapr AWS SQS Binding for Message Queuing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SQS, Binding, Message Queue

Description: Learn how to use the Dapr AWS SQS binding as both an input trigger and output producer for reliable message queuing in event-driven microservice architectures.

---

## What Is the Dapr AWS SQS Binding?

Amazon SQS is a managed message queuing service offering standard and FIFO queues. The Dapr AWS SQS binding supports both input (consuming messages) and output (producing messages) modes, providing a clean abstraction over SQS without requiring the AWS SDK in your application.

## Setting Up the SQS Binding Component

### Standard Queue Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-queue
  namespace: default
spec:
  type: bindings.aws.sqs
  version: v1
  metadata:
    - name: queueName
      value: "order-processing"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secrets
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secrets
        key: secretKey
    - name: direction
      value: "input, output"
```

Queue-level settings such as long polling (`ReceiveMessageWaitTimeSeconds`), visibility timeout, message retention period, and dead letter queue redrive policies are not configured through Dapr metadata. These must be set directly on the SQS queue using the AWS CLI or console, as shown in the next section.

### FIFO Queue Configuration

For FIFO queues, the queue name must end with the `.fifo` suffix. FIFO-specific settings like deduplication and message grouping are configured on the SQS queue itself, not through Dapr component metadata.

```yaml
  metadata:
    - name: queueName
      value: "payment-events.fifo"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secrets
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secrets
        key: secretKey
```

## Creating the Queue

```bash
# Standard queue
aws sqs create-queue \
  --queue-name order-processing \
  --region us-east-1

# DLQ
aws sqs create-queue \
  --queue-name order-processing-dlq \
  --region us-east-1

# Get the DLQ ARN and set redrive policy
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/order-processing-dlq \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/order-processing \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

# Enable long polling (20 seconds) and set visibility timeout
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/order-processing \
  --attributes '{"ReceiveMessageWaitTimeSeconds":"20","VisibilityTimeout":"60"}'
```

## Producing Messages to SQS

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function enqueueOrder(order) {
  await client.binding.send("order-queue", "create", {
    orderId: order.id,
    customerId: order.customerId,
    items: order.items,
    totalAmount: order.totalAmount,
    enqueuedAt: new Date().toISOString(),
  });

  console.log(`Order ${order.id} enqueued for processing`);
}

await enqueueOrder({
  id: "ORD-2026-001",
  customerId: "CUST-42",
  items: [{ sku: "WIDGET-A", quantity: 2 }],
  totalAmount: 49.98,
});
```

## Consuming Messages from SQS

When Dapr polls SQS and retrieves a message, it POSTs to your app endpoint:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/order-queue", async (req, res) => {
  const order = req.body;

  console.log(`Processing order ${order.orderId}`);

  try {
    // Validate input
    if (!order.orderId || !order.customerId) {
      throw new Error("Invalid order: missing required fields");
    }

    // Process the order
    await processOrder(order);

    // Return 200 to acknowledge - Dapr deletes the message
    res.status(200).send("OK");
  } catch (err) {
    // Return 500 to leave message visible for retry
    // After maxReceiveCount failures, SQS moves the message to the DLQ
    console.error("Error processing order, will retry:", err.message);
    res.status(500).send(err.message);
  }
});

app.listen(3000);
```

## Long Polling Configuration

Long polling reduces empty responses and costs. Configure long polling directly on your SQS queue by setting the `ReceiveMessageWaitTimeSeconds` attribute to up to 20 seconds. SQS will wait that long for a message before returning an empty response. This is set at the AWS queue level, not through Dapr metadata.

## Monitoring Queue Depth

```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/order-processing \
  --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible \
  --region us-east-1
```

## Summary

The Dapr AWS SQS binding provides both output (enqueue) and input (consume) capabilities for reliable message queuing. Configure dead letter queues for messages that fail repeatedly, use long polling to reduce costs, and rely on Dapr's standard HTTP response codes to control message acknowledgment and retry behavior. FIFO queues add ordered delivery and deduplication for order-sensitive workloads.
