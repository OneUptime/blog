# How to Use Dapr with Azure Storage Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Storage Queue, Pub/Sub, Messaging

Description: Configure Dapr pub/sub with Azure Storage Queues as a simple, low-cost message queue for decoupling microservices with at-least-once delivery guarantees.

---

Azure Storage Queues are a simple, durable, low-cost message queue service built into Azure Storage. Dapr supports Storage Queues as an input/output binding, making it a good choice for basic messaging scenarios where Azure Service Bus overhead is not needed.

## Create a Storage Queue

```bash
# Create storage account if not already created
az storage account create \
  --name mydaprqueues \
  --resource-group my-rg \
  --location eastus \
  --sku Standard_LRS

# Create a queue
az storage queue create \
  --name order-events \
  --account-name mydaprqueues

# Get the account key
STORAGE_KEY=$(az storage account keys list \
  --account-name mydaprqueues \
  --resource-group my-rg \
  --query "[0].value" --output tsv)

kubectl create secret generic azure-queue-secret \
  --from-literal=storageKey="$STORAGE_KEY"
```

## Configure Dapr Storage Queues Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderqueue
  namespace: default
spec:
  type: bindings.azure.storagequeues
  version: v1
  metadata:
  - name: accountName
    value: mydaprqueues
  - name: accountKey
    secretKeyRef:
      name: azure-queue-secret
      key: storageKey
  - name: queueName
    value: order-events
  - name: endpoint
    value: https://mydaprqueues.queue.core.windows.net
  - name: ttlInSeconds
    value: "86400"
  - name: visibilityTimeout
    value: "30s"
  - name: decodeBase64
    value: "false"
```

## Send Messages via Output Binding

```python
import requests

def publish_order(order: dict):
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/orderqueue",
        json={
            "operation": "create",
            "data": order
        },
        headers={"Content-Type": "application/json"}
    )
    resp.raise_for_status()
    print(f"Order queued: {order['id']}")

# Publish orders
for i in range(5):
    publish_order({
        "id": f"order-{i:03d}",
        "customerId": f"cust-{i}",
        "total": 50.00 * (i + 1),
        "items": [{"sku": f"ITEM-{i}", "qty": 1}]
    })
```

## Receive Messages via Input Binding

```python
from flask import Flask, request, jsonify
import time

app = Flask(__name__)

# Dapr invokes this route for each message from the queue.
# The route name must match the binding component name.
@app.route('/orderqueue', methods=['POST'])
def process_order():
    order = request.json

    print(f"Processing order: {order['id']}")
    print(f"Total: ${order['total']}")

    try:
        fulfill_order(order)
        return jsonify({"success": True}), 200
    except Exception as e:
        print(f"Processing failed: {e}")
        # Return non-200 so the message stays in the queue
        # and is retried after visibility timeout
        return jsonify({"success": False}), 500

def fulfill_order(order: dict):
    # Simulate processing
    time.sleep(0.1)
    print(f"Order fulfilled: {order['id']}")

if __name__ == '__main__':
    app.run(port=8080)
```

## Set Message TTL

```python
# Send with custom TTL via binding metadata
requests.post(
    "http://localhost:3500/v1.0/bindings/orderqueue",
    json={
        "operation": "create",
        "data": {"id": "order-flash", "type": "flash-sale", "expiresIn": "1h"},
        "metadata": {
            "ttlInSeconds": "3600"
        }
    },
    headers={"Content-Type": "application/json"}
).raise_for_status()
```

## Comparison with Azure Service Bus

```bash
# Azure Storage Queues - when to use:
# - Simple FIFO messaging
# - Messages up to 64KB
# - Default 7 days message retention (configurable up to indefinite)
# - No topic/subscription fan-out needed
# - Cost-sensitive workloads (lower per-operation cost)

# Azure Service Bus - when to use:
# - Sessions for ordered processing
# - Topics with multiple subscriptions (fan-out)
# - Messages up to 256KB (Standard) or 100MB (Premium)
# - Up to 14 days message retention (Basic), unlimited (Standard/Premium)
# - Dead-letter queue with detailed reason
# - Scheduled delivery
```

## Summary

Azure Storage Queues with Dapr provide a simple, low-cost messaging solution for decoupling microservices. The Dapr binding abstraction allows switching from Storage Queues to another queue backend later with minimal application code changes. For basic work queue patterns with modest throughput requirements, Storage Queues offer the lowest operational complexity and cost.
