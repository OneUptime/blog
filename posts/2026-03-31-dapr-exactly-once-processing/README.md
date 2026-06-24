# How to Implement Exactly-Once Processing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Idempotency, Messaging, State

Description: Learn how to achieve exactly-once message processing in Dapr by combining idempotency keys, state store deduplication, and the transactional outbox pattern.

---

## The Challenge of Exactly-Once Processing

Distributed messaging systems guarantee at-least-once delivery - messages may be delivered more than once due to retries or failures. True exactly-once processing requires making your handlers idempotent: processing the same message multiple times produces the same outcome as processing it once.

In Dapr, you implement exactly-once semantics by tracking processed message IDs in a state store before and after processing.

## Strategy: Idempotency with State Store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: keyPrefix
    value: name
```

## Publisher: Include Idempotency Key

Always include a unique, deterministic message ID in every published event:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();

async function publishOrderCreated(order) {
  // Use a deterministic ID based on the business event, not a random UUID
  // This way, retrying the publish doesn't create duplicate events
  const messageId = `order-created-${order.orderId}`;

  await client.pubsub.publish('pubsub', 'orders', {
    messageId,           // idempotency key
    orderId: order.orderId,
    customerId: order.customerId,
    amount: order.amount,
    timestamp: new Date().toISOString(),
  });
}
```

## Subscriber: Idempotent Handler

```python
from fastapi import FastAPI, Request
from dapr.clients import DaprClient
import json

app = FastAPI()

@app.post('/orders')
async def handle_order(request: Request):
    event = await request.json()
    data = event.get('data', {})
    message_id = data.get('messageId')

    if not message_id:
        return {"status": "DROP", "message": "Missing messageId"}

    with DaprClient() as dapr:
        # Check if this message was already processed
        dedup_key = f"processed:{message_id}"
        result = dapr.get_state(store_name="statestore", key=dedup_key)

        if result.data:
            # Already processed - return success without re-processing
            print(f"Duplicate message detected: {message_id}, skipping")
            return {"status": "SUCCESS"}

        # Process the message
        order_id = data.get('orderId')
        amount = data.get('amount')
        print(f"Processing order {order_id} for ${amount}")
        process_order(data)

        # Mark as processed in the state store
        dapr.save_state(
            store_name="statestore",
            key=dedup_key,
            value=json.dumps({
                "processedAt": "2026-03-31T12:00:00Z",
                "orderId": order_id
            }),
            state_metadata={"ttlInSeconds": "86400"}  # expire after 24h
        )

    return {"status": "SUCCESS"}
```

## Using Dapr Transactions for Atomic Processing

For operations that update multiple state keys atomically (e.g., recording a dedup marker alongside business state), use `ExecuteStateTransaction`:

```go
package main

import (
    "context"
    "encoding/json"
    dapr "github.com/dapr/go-sdk/client"
)

func processExactlyOnce(ctx context.Context, client dapr.Client, message Message) error {
    dedupKey := "processed:" + message.ID

    // Check if already processed
    item, err := client.GetState(ctx, "statestore", dedupKey, nil)
    if err != nil {
        return err
    }
    if item.Value != nil {
        // Already processed
        return nil
    }

    // Execute business logic
    result, err := executeBusiness(message)
    if err != nil {
        return err
    }

    // Atomically save the business result and the dedup marker
    processed, _ := json.Marshal(map[string]string{
        "messageId": message.ID,
        "status":    "processed",
    })
    resultData, _ := json.Marshal(result)

    ops := []*dapr.StateOperation{
        {
            Type: dapr.StateOperationTypeUpsert,
            Item: &dapr.SetStateItem{
                Key:   dedupKey,
                Value: processed,
            },
        },
        {
            Type: dapr.StateOperationTypeUpsert,
            Item: &dapr.SetStateItem{
                Key:   "order-result:" + message.ID,
                Value: resultData,
            },
        },
    }

    return client.ExecuteStateTransaction(ctx, "statestore", nil, ops)
}
```

## CloudEvents Message ID

Dapr CloudEvents automatically include an `id` field that you can use as the idempotency key:

```python
@app.post('/orders')
async def handle_order(request: Request):
    cloud_event = await request.json()
    # CloudEvents 'id' field is unique per event
    event_id = cloud_event.get('id')
    # Use event_id as your dedup key
```

## Summary

Exactly-once processing in Dapr is achieved through idempotent handlers that check a dedup key in the state store before processing. Use deterministic message IDs (not random UUIDs) so that publisher retries are also idempotent. Set a TTL on dedup keys to avoid unbounded state growth, and consider using transactional state operations when processing and recording must be atomic.
