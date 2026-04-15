# How to Configure Dapr with Azure Service Bus Topics Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Service Bus, Topic, Pub/Sub, Messaging, Microservice

Description: Configure Dapr pub/sub with Azure Service Bus Topics for fan-out messaging patterns, multiple subscriptions, and filtered message delivery.

---

## Overview

Azure Service Bus Topics enable fan-out messaging where a single published message can be delivered to multiple subscribers. Each subscriber receives its own copy of the message. This is ideal for event-driven architectures where multiple services need to react to the same domain event. Dapr's Service Bus Topics component maps Dapr topics to Service Bus topics and subscriptions automatically.

## Prerequisites

- Azure Service Bus namespace (Standard tier minimum for topics)
- Dapr CLI installed
- Azure CLI for resource management

## Creating Service Bus Resources

```bash
# Create namespace
az servicebus namespace create \
  --name dapr-sb-topics \
  --resource-group dapr-demo \
  --sku Standard

# Create a topic
az servicebus topic create \
  --name order-events \
  --namespace-name dapr-sb-topics \
  --resource-group dapr-demo

# Dapr creates subscriptions automatically, but you can pre-create them
az servicebus topic subscription create \
  --name inventory-service \
  --topic-name order-events \
  --namespace-name dapr-sb-topics \
  --resource-group dapr-demo
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-topics-pubsub
  namespace: default
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: servicebus-secret
        key: connectionString
    - name: maxConcurrentHandlers
      value: "5"
    - name: prefetchCount
      value: "20"
    - name: maxActiveMessages
      value: "100"
    - name: defaultMessageTimeToLiveInSec
      value: "3600"
```

## Publishing an Event

```bash
curl -X POST http://localhost:3500/v1.0/publish/servicebus-topics-pubsub/order-events \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-8001", "customerId": "C-42", "total": 299.99}'
```

## Subscribing - Inventory Service

```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/order-events', methods=['POST'])
def handle_order():
    event = request.json
    data = event.get('data', {})
    order_id = data.get('orderId')
    print(f"Inventory: reserving stock for order {order_id}")
    return '', 200

if __name__ == '__main__':
    app.run(port=5001)
```

## Subscribing - Notification Service

```python
from flask import Flask, request
app = Flask(__name__)

@app.route('/order-events', methods=['POST'])
def handle_order():
    event = request.json
    data = event.get('data', {})
    customer_id = data.get('customerId')
    print(f"Notifications: alerting customer {customer_id}")
    return '', 200

if __name__ == '__main__':
    app.run(port=5002)
```

Both services use the same topic name but Dapr creates separate Service Bus subscriptions for each `app-id`.

## Declarative Subscriptions

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-events-inventory
spec:
  pubsubname: servicebus-topics-pubsub
  topic: order-events
  routes:
    default: /order-events
```

## Message Filtering with SQL Rules

Azure Service Bus supports SQL-based subscription filters. Configure them via the Azure portal or CLI after Dapr creates the subscription to route only matching messages to specific subscribers.

```bash
az servicebus topic subscription rule create \
  --name premium-only \
  --subscription-name premium-notification-service \
  --topic-name order-events \
  --namespace-name dapr-sb-topics \
  --resource-group dapr-demo \
  --filter-sql-expression "total > 500"
```

## Summary

Dapr's Azure Service Bus Topics component enables fan-out messaging where multiple microservices independently process the same domain events. Each Dapr app-id gets its own Service Bus subscription, ensuring independent delivery. Service Bus SQL filters let you route subsets of messages to specific subscribers without changing application code.
