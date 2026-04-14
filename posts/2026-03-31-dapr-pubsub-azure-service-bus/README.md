# How to Set Up Dapr Pub/Sub with Azure Service Bus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Azure Service Bus, Azure, Messaging

Description: Configure Dapr pub/sub messaging with Azure Service Bus for enterprise-grade, cloud-native message brokering with sessions, dead-letter, and at-least-once delivery.

---

## Why Azure Service Bus with Dapr?

Azure Service Bus is a fully managed enterprise message broker with queues and topics. It provides at-least-once delivery, message sessions for ordering, dead-letter queues, scheduled messages, and built-in retry. Combined with Dapr, you get a portable pub/sub API that works identically across brokers.

## Prerequisites

- Azure subscription with a Service Bus namespace
- Dapr CLI initialized
- Azure CLI installed

## Creating Service Bus Resources

```bash
# Create resource group
az group create --name dapr-pubsub --location eastus

# Create Service Bus namespace (Standard or Premium tier)
az servicebus namespace create \
  --name my-dapr-servicebus \
  --resource-group dapr-pubsub \
  --sku Standard

# Get connection string
az servicebus namespace authorization-rule keys list \
  --namespace-name my-dapr-servicebus \
  --resource-group dapr-pubsub \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString \
  -o tsv
```

Topics and subscriptions are created automatically by Dapr when you first publish/subscribe.

## Configuring the Azure Service Bus Component

### With Connection String

```yaml
# pubsub-servicebus.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: servicebus-secret
      key: connectionString
  - name: maxDeliveryCount
    value: "10"
  - name: lockDurationInSec
    value: "60"
  - name: defaultMessageTimeToLiveInSec
    value: "86400"
  - name: autoDeleteOnIdleInSec
    value: "0"
  - name: disableEntityManagement
    value: "false"
```

Create the Kubernetes secret:

```bash
kubectl create secret generic servicebus-secret \
  --from-literal=connectionString="Endpoint=sb://my-dapr-servicebus.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=..."
```

### With Managed Identity (Recommended for Production)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: namespaceName
    value: "my-dapr-servicebus.servicebus.windows.net"
  - name: azureClientId
    value: "<managed-identity-client-id>"
```

Assign the "Azure Service Bus Data Owner" role to the managed identity.

## Publisher Service

```python
# publisher.py
import os
import requests
import time

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def publish(topic, data, metadata=None):
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/publish/pubsub/{topic}"
    if metadata:
        query = "&".join([f"metadata.{k}={v}" for k, v in metadata.items()])
        url = f"{url}?{query}"
    resp = requests.post(url, json=data,
                         headers={"Content-Type": "application/json"})
    resp.raise_for_status()
    return resp

# Publish an order event
publish("orders", {
    "orderId": "ORD-001",
    "customerId": "CUST-42",
    "amount": 199.99,
    "priority": "high"
})

# Publish with message session ID (for ordered delivery)
publish("orders", {
    "orderId": "ORD-002",
    "customerId": "CUST-42",
    "amount": 49.99
}, metadata={"sessionId": "CUST-42"})

# Schedule a message for future delivery
publish("reminders", {
    "userId": "USR-001",
    "message": "Your trial expires tomorrow"
}, metadata={"ScheduledEnqueueTimeUtc": "2026-04-01T09:00:00Z"})
```

## Subscriber Service

```python
# subscriber.py
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "pubsub",
            "topic": "orders",
            "route": "/handle-order"
        }
    ])

@app.route('/handle-order', methods=['POST'])
def handle_order():
    event = request.get_json()
    order = event.get("data", {})
    print(f"Processing: orderId={order.get('orderId')}, amount=${order.get('amount')}")

    try:
        # Your business logic here
        process_order(order)
        return jsonify({"status": "SUCCESS"})
    except TransientError:
        # Retry - Service Bus will redeliver
        return jsonify({"status": "RETRY"}), 200
    except Exception as e:
        print(f"Permanent error: {e}")
        # DROP moves to dead-letter queue
        return jsonify({"status": "DROP"}), 200

def process_order(order):
    print(f"Order {order['orderId']} processed")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

## Service Bus-Specific Metadata

Azure Service Bus supports rich message properties accessible via CloudEvent metadata:

```bash
# Publish with message properties
curl -X POST \
  "http://localhost:3500/v1.0/publish/pubsub/orders?metadata.MessageId=order-001&metadata.CorrelationId=session-42" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-003"}'
```

## Message Sessions for Ordered Delivery

To guarantee ordered processing per customer, use message sessions:

```yaml
  - name: disableEntityManagement
    value: "false"
  - name: requireSessions
    value: "true"
```

Publish with a session ID:

```python
publish("orders", order_data, metadata={"sessionId": "customer-42"})
```

All messages with the same session ID are processed sequentially by the same subscriber instance.

## Dead-Letter Queue

Failed messages (after `maxDeliveryCount` retries) are automatically moved to the dead-letter sub-queue. Access it via the Azure Portal or SDK:

```bash
# View dead-letter messages using Azure CLI
az servicebus topic subscription show \
  --namespace-name my-dapr-servicebus \
  --resource-group dapr-pubsub \
  --topic-name orders \
  --name myapp-order-subscriber \
  --query deadLetterMessageCount
```

## Node.js Example

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.get('/dapr/subscribe', (req, res) => {
  res.json([{
    pubsubname: 'pubsub',
    topic: 'orders',
    route: '/orders'
  }]);
});

app.post('/orders', async (req, res) => {
  const { data } = req.body;
  try {
    console.log(`Order received: ${data.orderId}`);
    await processOrder(data);
    res.json({ status: 'SUCCESS' });
  } catch (err) {
    if (err.isRetryable) {
      res.json({ status: 'RETRY' });
    } else {
      res.json({ status: 'DROP' });
    }
  }
});

app.listen(3001);
```

## Summary

Dapr pub/sub with Azure Service Bus brings enterprise messaging features - sessions, dead-letter queues, scheduled delivery, and at-least-once guarantees - through the same portable Dapr API. Use managed identity for keyless authentication in production. Message sessions enable ordered processing per partition key. The `SUCCESS`/`RETRY`/`DROP` response pattern integrates naturally with Service Bus's delivery count and dead-letter mechanisms.
