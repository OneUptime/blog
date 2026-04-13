# How to Use Dapr with Azure Service Bus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Service Bus, Pub/Sub, Messaging, Queue

Description: Configure Dapr pub/sub with Azure Service Bus topics and queues for reliable enterprise messaging with sessions, dead-letter queues, and scheduled message delivery.

---

Azure Service Bus provides enterprise-grade messaging with topics, queues, sessions, and dead-letter queues. Dapr's Service Bus pub/sub component supports both topics (fan-out) and queues (point-to-point) with full message lifecycle management.

## Create a Service Bus Namespace

```bash
# Create Service Bus namespace
az servicebus namespace create \
  --name my-dapr-servicebus \
  --resource-group my-rg \
  --location eastus \
  --sku Standard

# Create a topic
az servicebus topic create \
  --name order-events \
  --namespace-name my-dapr-servicebus \
  --resource-group my-rg \
  --max-size-in-megabytes 1024 \
  --default-message-time-to-live P14D

# Create subscriptions
az servicebus topic subscription create \
  --name inventory-sub \
  --topic-name order-events \
  --namespace-name my-dapr-servicebus \
  --resource-group my-rg \
  --dead-lettering-on-message-expiration true \
  --max-delivery-count 3

# Get connection string
CONN_STR=$(az servicebus namespace authorization-rule keys list \
  --namespace-name my-dapr-servicebus \
  --resource-group my-rg \
  --name RootManageSharedAccessKey \
  --query "primaryConnectionString" --output tsv)

kubectl create secret generic servicebus-secret \
  --from-literal=connectionString="$CONN_STR"
```

## Configure Dapr Service Bus Pub/Sub

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
  namespace: default
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: servicebus-secret
      key: connectionString
  - name: maxDeliveryCount
    value: "3"
  - name: lockDurationInSec
    value: "30"
  - name: defaultMessageTimeToLiveInSec
    value: "1209600"
  - name: autoDeleteOnIdleInSec
    value: "0"
```

With managed identity:

```yaml
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: namespaceName
    value: my-dapr-servicebus.servicebus.windows.net
  - name: azureClientId
    value: ""
```

## Publish Messages

```python
import requests

def publish_order_event(order: dict, scheduled_enqueue_time: str = None):
    url = "http://localhost:3500/v1.0/publish/servicebus-pubsub/order-events"
    params = {}
    if scheduled_enqueue_time:
        params["metadata.ScheduledEnqueueTimeUtc"] = scheduled_enqueue_time

    requests.post(
        url,
        json=order,
        headers={"Content-Type": "application/json"},
        params=params
    ).raise_for_status()

# Immediate publish
publish_order_event({
    "id": "order-001",
    "customerId": "cust-123",
    "status": "PLACED",
    "total": 149.99
})

# Scheduled message delivery (future processing)
publish_order_event(
    {"id": "order-002", "status": "SCHEDULED"},
    scheduled_enqueue_time="2026-04-01T09:00:00.000Z"
)
```

## Subscribe with Session Support

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "servicebus-pubsub",
        "topic": "order-events",
        "route": "/order-events",
        "metadata": {
            "requireSessions": "false"
        }
    }])

@app.route('/order-events', methods=['POST'])
def handle_event():
    event = request.json
    order = event.get('data', {})
    delivery_count = int(event.get('metadata', {}).get('DeliveryCount', 1))

    print(f"Order: {order['id']}, Delivery count: {delivery_count}")

    try:
        process_order(order)
        return jsonify({"status": "SUCCESS"})
    except Exception as e:
        if delivery_count >= 3:
            print(f"Max retries exceeded, moving to DLQ: {e}")
            return jsonify({"status": "DROP"})
        return jsonify({"status": "RETRY"})

def process_order(order: dict):
    print(f"Processing: {order['id']}")

if __name__ == '__main__':
    app.run(port=8080)
```

## Summary

Dapr's Azure Service Bus pub/sub component provides enterprise messaging capabilities including scheduled delivery, dead-letter queues, and delivery count tracking. The component supports both connection string and managed identity authentication. Service Bus sessions enable ordered message processing, and the delivery count metadata allows subscribers to implement progressive retry strategies before routing messages to the dead-letter queue.
