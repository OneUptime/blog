# How to Use Bulk Publish API in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Bulk Publish, Performance, Microservice

Description: Learn how to publish multiple messages in a single Dapr API call using the bulk publish API to reduce overhead and improve throughput in high-volume scenarios.

---

## Why Use Bulk Publish?

Publishing messages one at a time in a loop creates per-request overhead: network round trips, sidecar processing, and broker write operations multiply with every message. Dapr's bulk publish API lets you send up to hundreds of messages in a single HTTP or gRPC call, dramatically reducing latency and improving throughput for batch-style producers.

## Bulk Publish via HTTP API

Use the `/v1.0/publish/bulk/{pubsubname}/{topic}` endpoint:

```bash
curl -s -X POST \
  http://localhost:3500/v1.0/publish/bulk/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '[
    {
      "entryId": "msg-001",
      "event": {"orderId": "ord-001", "status": "placed"},
      "contentType": "application/json"
    },
    {
      "entryId": "msg-002",
      "event": {"orderId": "ord-002", "status": "placed"},
      "contentType": "application/json"
    },
    {
      "entryId": "msg-003",
      "event": {"orderId": "ord-003", "status": "placed"},
      "contentType": "application/json"
    }
  ]'
```

Each entry in the array requires:
- `entryId`: A unique identifier for the entry in this batch (used to correlate partial failures)
- `event`: The message payload
- `contentType`: The content type of the payload

## Handling Partial Failures

The bulk publish API returns per-entry results. Some entries may fail while others succeed. The response body includes individual statuses:

```json
{
  "failedEntries": [
    {
      "entryId": "msg-002",
      "error": "BROKER_TOO_LARGE"
    }
  ]
}
```

Process partial failures in your code:

```javascript
async function bulkPublishOrders(orders) {
  const entries = orders.map((order, i) => ({
    entryId: `order-${order.id}`,
    event: order,
    contentType: "application/json",
  }));

  const response = await fetch(
    "http://localhost:3500/v1.0/publish/bulk/pubsub/orders",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries),
    }
  );

  const result = await response.json();

  if (result.failedEntries && result.failedEntries.length > 0) {
    console.warn(`${result.failedEntries.length} entries failed:`);
    for (const failed of result.failedEntries) {
      console.error(`  Entry ${failed.entryId}: ${failed.error}`);
      // Retry or dead-letter the failed entry
    }
  }

  return result;
}
```

## Using the JavaScript SDK for Bulk Publish

The Dapr JS SDK wraps the bulk publish API:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

async function publishOrderBatch(orders) {
  const messages = orders.map((order) => ({
    event: order,
    contentType: "application/json",
  }));

  const result = await client.pubsub.publishBulk("pubsub", "orders", messages);

  if (result.failedMessages.length > 0) {
    console.error("Some messages failed to publish:", result.failedMessages);
  }

  return result;
}
```

## Batch Size and Performance Tuning

Experiment with batch sizes to find the sweet spot for your broker and payload size:

```javascript
const BATCH_SIZE = 100;

async function publishAllOrders(orders) {
  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE);
    await publishOrderBatch(batch);
    console.log(`Published batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }
}
```

Typical sweet spots are 50-200 messages per batch depending on message size and broker configuration.

## Component Support

Not all Dapr pub/sub components support bulk publish natively. When native bulk is not supported, Dapr falls back to individual publishes automatically. Check component documentation for native bulk support status - Kafka, Azure Service Bus, and Azure Event Hubs have native support.

## Summary

Dapr's bulk publish API reduces per-message overhead by allowing you to send multiple messages in a single call, with per-entry result tracking for handling partial failures. Use batch sizes of 50-200 messages for best throughput, process `failedEntries` in your response handler, and use the SDK wrappers in JavaScript or Go to simplify the implementation.
