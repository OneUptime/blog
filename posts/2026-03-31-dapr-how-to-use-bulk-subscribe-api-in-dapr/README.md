# How to Use Bulk Subscribe API in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Bulk Subscribe, Performance, Microservice

Description: Improve throughput and efficiency in Dapr pub/sub by using the bulk subscribe API to receive and process batches of messages in a single request.

---

## What is Bulk Subscribe

The Dapr bulk subscribe API allows your service to receive multiple messages in a single HTTP/gRPC call instead of one message at a time. This dramatically reduces the overhead of individual HTTP calls per message when processing high-throughput topics.

Benefits of bulk subscribe:
- Reduced network overhead from fewer HTTP roundtrips
- Better CPU utilization through batch processing
- Higher throughput for message-heavy workloads
- Ability to use database batch inserts or bulk API calls

## How Bulk Subscribe Differs from Regular Subscribe

| Feature | Regular Subscribe | Bulk Subscribe |
|---------|------------------|----------------|
| Messages per delivery | 1 | Many (configurable) |
| Response | Single status | Per-message status map |
| Throughput | Lower | Higher |
| Code complexity | Lower | Slightly higher |
| Best for | Low-volume, complex processing | High-volume, batch processing |

## Enabling Bulk Subscribe in Subscription

Declare bulk subscribe in your declarative subscription:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orders-bulk-subscription
spec:
  pubsubname: pubsub
  topic: orders
  routes:
    default: /orders/bulk-process
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 1000
```

Parameters:
- `maxMessagesCount`: Maximum messages to batch (default: 100)
- `maxAwaitDurationMs`: Maximum wait time to fill a batch (default: 1000ms)

## Implementing a Bulk Subscribe Handler in Python

The bulk handler receives a list of messages and must return a per-message status response:

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        'pubsubname': 'pubsub',
        'topic': 'orders',
        'route': '/orders/bulk-process',
        'bulkSubscribe': {
            'enabled': True,
            'maxMessagesCount': 100,
            'maxAwaitDurationMs': 1000
        }
    }])

@app.route('/orders/bulk-process', methods=['POST'])
def bulk_process_orders():
    bulk_message = request.get_json()
    
    # The bulk message contains an array of entries
    entries = bulk_message.get('entries', [])
    
    print(f"Received batch of {len(entries)} messages")
    
    statuses = []
    
    # Collect all orders for batch processing
    orders_to_process = []
    entry_map = {}
    
    for entry in entries:
        entry_id = entry.get('entryId')
        cloud_event = entry.get('event', {})
        order_data = cloud_event.get('data', {})
        
        orders_to_process.append(order_data)
        entry_map[order_data.get('orderId')] = entry_id
    
    # Process all orders in a batch (e.g., bulk database insert)
    try:
        results = batch_save_orders(orders_to_process)
        
        for order, success in zip(orders_to_process, results):
            entry_id = entry_map.get(order.get('orderId'))
            status = "SUCCESS" if success else "RETRY"
            statuses.append({
                "entryId": entry_id,
                "status": status
            })
    except Exception as e:
        print(f"Batch processing error: {e}")
        # Mark all as RETRY on batch failure
        for entry in entries:
            statuses.append({
                "entryId": entry.get('entryId'),
                "status": "RETRY"
            })
    
    return jsonify({"statuses": statuses})

def batch_save_orders(orders: list) -> list:
    """Batch insert orders into database"""
    # Simulated bulk insert - returns list of success booleans
    print(f"Batch inserting {len(orders)} orders")
    # db.bulk_insert("orders", orders)  # Your actual DB call
    return [True] * len(orders)
```

## Bulk Subscribe with Node.js

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.get('/dapr/subscribe', (req, res) => {
  res.json([{
    pubsubname: 'pubsub',
    topic: 'orders',
    route: '/orders/bulk-process',
    bulkSubscribe: {
      enabled: true,
      maxMessagesCount: 50,
      maxAwaitDurationMs: 500
    }
  }]);
});

app.post('/orders/bulk-process', async (req, res) => {
  const { entries } = req.body;
  
  console.log(`Processing batch of ${entries.length} messages`);
  
  const statuses = [];
  
  // Extract all orders for batch processing
  const orders = entries.map(entry => ({
    entryId: entry.entryId,
    order: entry.event.data
  }));
  
  // Process in parallel with Promise.allSettled
  const results = await Promise.allSettled(
    orders.map(({ order }) => processOrder(order))
  );
  
  results.forEach((result, index) => {
    statuses.push({
      entryId: orders[index].entryId,
      status: result.status === 'fulfilled' ? 'SUCCESS' : 'RETRY',
      error: result.status === 'rejected' ? result.reason?.message : undefined
    });
  });
  
  res.json({ statuses });
});

async function processOrder(order) {
  // Simulate order processing
  if (!order.orderId) {
    throw new Error('Missing orderId');
  }
  console.log(`Processed order ${order.orderId}`);
}

app.listen(3000, () => console.log('Bulk subscriber listening on port 3000'));
```

## Understanding the Bulk Message Format

The incoming bulk message structure:

```json
{
  "topic": "orders",
  "metadata": {},
  "entries": [
    {
      "entryId": "unique-entry-id-1",
      "event": {
        "specversion": "1.0",
        "id": "cloud-event-id-1",
        "source": "publisher-service",
        "type": "com.dapr.event.sent",
        "data": {
          "orderId": "order-001",
          "total": 99.99
        }
      },
      "contentType": "application/json",
      "metadata": {}
    },
    {
      "entryId": "unique-entry-id-2",
      "event": {
        "specversion": "1.0",
        "id": "cloud-event-id-2",
        "source": "publisher-service",
        "type": "com.dapr.event.sent",
        "data": {
          "orderId": "order-002",
          "total": 149.99
        }
      },
      "contentType": "application/json",
      "metadata": {}
    }
  ]
}
```

## Response Format

Your handler must return per-message statuses:

```json
{
  "statuses": [
    {
      "entryId": "unique-entry-id-1",
      "status": "SUCCESS"
    },
    {
      "entryId": "unique-entry-id-2",
      "status": "RETRY"
    }
  ]
}
```

Valid status values:
- `SUCCESS`: Message processed successfully
- `RETRY`: Message will be redelivered by Dapr
- `DROP`: Message is discarded (a warning is logged, but the message will not be retried)

This allows partial batch success - some messages succeed, others are retried, and poison messages can be dropped.

## When to Use Bulk Subscribe

Use bulk subscribe when:
- Processing more than 1000 messages per second
- Your backend supports batch operations (bulk DB inserts, batch API calls)
- Messages are small and overhead per message is significant
- You want to reduce broker polling frequency

Continue using regular subscribe when:
- Message processing is complex and varies greatly per message
- You need strict per-message error handling
- Message volume is low (under 100/second)

## Summary

Dapr's bulk subscribe API delivers multiple messages per HTTP call, dramatically improving throughput for high-volume topics. Enable it with `bulkSubscribe.enabled: true` in your subscription, implement the batch handler to process messages as a group (using bulk database inserts or batch API calls), and return per-message statuses via the `statuses` array to allow partial batch success and individual message retries.
