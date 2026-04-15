# How to Use Dapr AWS Kinesis Binding for Stream Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Kinesis, Binding, Stream Processing

Description: Learn how to configure the Dapr AWS Kinesis binding to produce and consume real-time data streams for event-driven microservices on AWS.

---

## What Is the Dapr AWS Kinesis Binding?

Amazon Kinesis Data Streams is a managed real-time data streaming service. The Dapr AWS Kinesis binding supports both input (consuming records) and output (producing records) operations, letting your microservices interact with Kinesis without managing the Kinesis SDK or shard iteration logic.

## Setting Up the Kinesis Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-stream
  namespace: default
spec:
  type: bindings.aws.kinesis
  version: v1
  metadata:
    - name: streamName
      value: "application-events"
    - name: consumerName
      value: "dapr-consumer"
    - name: mode
      value: "extended"
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

The `mode` parameter controls consumption:
- `shared` - uses the Kinesis Client Library (KCL) with shared throughput and DynamoDB-based checkpointing
- `extended` - uses Enhanced Fan-Out with dedicated throughput per consumer

## Creating the Kinesis Stream

```bash
aws kinesis create-stream \
  --stream-name application-events \
  --shard-count 4 \
  --region us-east-1
```

## Producing Records to Kinesis

Use the Kinesis binding as an output binding to publish events:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function publishEvent(eventType, payload, partitionKey) {
  await client.binding.send(
    "event-stream",
    "create",
    {
      eventType,
      payload,
      timestamp: new Date().toISOString(),
      version: "1.0",
    },
    {
      partitionKey: partitionKey || eventType,
    }
  );
  console.log(`Published ${eventType} event to Kinesis`);
}

// Publish various event types
await publishEvent("user.signup", { userId: "U-001", email: "alice@example.com" }, "user-events");
await publishEvent("order.placed", { orderId: "ORD-001", amount: 99.99 }, "order-events");
await publishEvent("payment.processed", { orderId: "ORD-001", status: "SUCCESS" }, "payment-events");
```

## Consuming Records from Kinesis

When used as an input binding, Dapr reads records from Kinesis and POSTs them to your app endpoint:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/event-stream", async (req, res) => {
  const record = req.body;

  console.log("Received Kinesis record:", record);

  try {
    await routeEvent(record);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Failed to process record:", err);
    res.status(500).send(err.message);
  }
});

async function routeEvent(record) {
  switch (record.eventType) {
    case "user.signup":
      await handleUserSignup(record.payload);
      break;
    case "order.placed":
      await handleOrderPlaced(record.payload);
      break;
    case "payment.processed":
      await handlePaymentProcessed(record.payload);
      break;
    default:
      console.log(`Unknown event type: ${record.eventType}`);
  }
}

app.listen(3000);
```

## Partitioning Strategies

Choose partition keys to distribute load evenly across shards and maintain ordering guarantees for related events:

```javascript
// Group by entity ID for ordering guarantees
await publishEvent("order.updated", payload, `order-${orderId}`);

// Group by user for user-scoped ordering
await publishEvent("user.action", payload, `user-${userId}`);
```

## Monitoring Kinesis Consumption

Check consumer lag using the AWS CLI:

```bash
aws kinesis describe-stream-summary \
  --stream-name application-events \
  --region us-east-1

aws kinesis list-shards \
  --stream-name application-events \
  --region us-east-1
```

## Summary

The Dapr AWS Kinesis binding simplifies real-time stream processing by abstracting shard management, polling logic, and SDK dependencies. Use it as an output binding to publish events with custom partition keys, or as an input binding to consume records via Dapr's standard endpoint routing. Extended Fan-Out mode provides dedicated per-consumer throughput for high-volume stream processing workloads.
