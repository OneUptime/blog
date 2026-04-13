# How to Use Dapr with Azure Event Hubs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Event Hub, Pub/Sub, Streaming

Description: Configure Dapr pub/sub with Azure Event Hubs for high-throughput event streaming, including consumer groups, checkpointing, and partition-key-based ordering.

---

Azure Event Hubs is a high-throughput event streaming platform capable of ingesting millions of events per second. Dapr's Event Hubs pub/sub component lets microservices publish and consume events with automatic checkpointing and consumer group management.

## Create an Event Hubs Namespace

```bash
# Create Event Hubs namespace
az eventhubs namespace create \
  --name my-dapr-eventhubs \
  --resource-group my-rg \
  --location eastus \
  --sku Standard \
  --capacity 1

# Create an Event Hub (topic equivalent)
az eventhubs eventhub create \
  --name order-events \
  --namespace-name my-dapr-eventhubs \
  --resource-group my-rg \
  --partition-count 4 \
  --message-retention 1

# Create a consumer group for each subscriber
az eventhubs eventhub consumer-group create \
  --consumer-group-name inventory-consumer \
  --eventhub-name order-events \
  --namespace-name my-dapr-eventhubs \
  --resource-group my-rg
```

## Configure Dapr Event Hubs Pub/Sub

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eventhubs-pubsub
  namespace: default
spec:
  type: pubsub.azure.eventhubs
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: eventhubs-secret
      key: connectionString
  - name: storageAccountName
    value: mydaprstorage
  - name: storageAccountKey
    secretKeyRef:
      name: azure-storage-secret
      key: storageKey
  - name: storageContainerName
    value: checkpoints
  - name: consumerID
    value: inventory-consumer
```

With managed identity:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eventhubs-pubsub
spec:
  type: pubsub.azure.eventhubs
  version: v1
  metadata:
  - name: eventHubNamespace
    value: my-dapr-eventhubs.servicebus.windows.net
  - name: storageAccountName
    value: mydaprstorage
  - name: storageContainerName
    value: checkpoints
  - name: azureClientId
    value: ""
```

## Publish Events to Event Hubs

```python
import requests

def publish_event(event: dict):
    resp = requests.post(
        "http://localhost:3500/v1.0/publish/eventhubs-pubsub/order-events",
        json=event,
        headers={"Content-Type": "application/json"},
        params={
            "metadata.partitionKey": event.get("customerId", "default")
        }
    )
    resp.raise_for_status()
    print(f"Event published: {event['id']}")

publish_event({
    "id": "order-001",
    "customerId": "cust-123",
    "status": "PLACED",
    "total": 99.99,
    "timestamp": "2026-03-31T10:00:00Z"
})
```

## Subscribe to Event Hubs

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "eventhubs-pubsub",
        "topic": "order-events",
        "route": "/order-events"
    }])

@app.route('/order-events', methods=['POST'])
def handle_event():
    event = request.json
    order = event.get('data', {})
    partition_key = event.get('metadata', {}).get('partitionKey', 'unknown')

    print(f"Received order {order['id']} from partition: {partition_key}")
    process_inventory(order)
    return jsonify({"status": "SUCCESS"})

def process_inventory(order: dict):
    print(f"Updating inventory for order: {order['id']}")

if __name__ == '__main__':
    app.run(port=8080)
```

## Check Consumer Group Lag

```bash
# Show consumer group details
az eventhubs eventhub consumer-group show \
  --consumer-group-name inventory-consumer \
  --eventhub-name order-events \
  --namespace-name my-dapr-eventhubs \
  --resource-group my-rg

# Monitor partition-level metrics (offset lag) via Azure Monitor
az monitor metrics list \
  --resource /subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.EventHub/namespaces/my-dapr-eventhubs/eventhubs/order-events \
  --metric IncomingMessages OutgoingMessages \
  --interval PT1M
```

## Summary

Dapr's Azure Event Hubs pub/sub component provides high-throughput event streaming with automatic checkpointing via Azure Blob Storage. Partition keys ensure ordered delivery of related events, and consumer groups allow multiple independent subscribers to process the same event stream. The managed identity authentication option eliminates connection string management for production deployments on AKS.
