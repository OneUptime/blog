# How to Use Dapr with Azure Event Grid

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Event Grid, Binding, Event, Webhook

Description: Use Dapr with Azure Event Grid to receive and publish cloud events, enabling reactive architectures that respond to Azure resource events and custom application events.

---

Azure Event Grid is a fully managed event routing service that supports push-based event delivery to webhook endpoints. Dapr's Event Grid binding lets services receive events from Azure resources (Blob Storage, Resource Manager, etc.) and publish custom events to Event Grid topics.

## Create an Event Grid Topic

```bash
# Create custom Event Grid topic
az eventgrid topic create \
  --name my-dapr-events \
  --resource-group my-rg \
  --location eastus

# Get topic endpoint and key
TOPIC_ENDPOINT=$(az eventgrid topic show \
  --name my-dapr-events \
  --resource-group my-rg \
  --query "endpoint" --output tsv)

TOPIC_KEY=$(az eventgrid topic key list \
  --name my-dapr-events \
  --resource-group my-rg \
  --query "key1" --output tsv)

kubectl create secret generic eventgrid-secret \
  --from-literal=accessKey="$TOPIC_KEY"
```

## Configure the Dapr Event Grid Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eventgrid-binding
  namespace: default
spec:
  type: bindings.azure.eventgrid
  version: v1
  metadata:
  - name: topicEndpoint
    value: https://my-dapr-events.eastus-1.eventgrid.azure.net/api/events
  - name: accessKey
    secretKeyRef:
      name: eventgrid-secret
      key: accessKey
  - name: handshakePort
    value: "8080"
  - name: subscriberEndpoint
    value: "https://my-app.example.com/eventgrid-binding"
  - name: eventSubscriptionName
    value: dapr-subscription
```

## Publish Events to Event Grid

```python
import requests
import json
from datetime import datetime

def publish_event(event_type: str, subject: str, data: dict):
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/eventgrid-binding",
        json={
            "operation": "create",
            "data": json.dumps([{
                "id": f"evt-{datetime.utcnow().timestamp()}",
                "subject": subject,
                "data": data,
                "eventType": event_type,
                "eventTime": datetime.utcnow().isoformat() + "Z",
                "dataVersion": "1.0"
            }])
        }
    )
    resp.raise_for_status()
    print(f"Published event: {event_type}")

publish_event(
    event_type="OrderPlaced",
    subject="/orders/order-001",
    data={
        "orderId": "order-001",
        "customerId": "cust-123",
        "total": 99.99
    }
)
```

## Receive Events from Event Grid

Dapr handles the Event Grid subscription handshake automatically. Implement the endpoint:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/eventgrid-binding', methods=['POST'])
def handle_event():
    events = request.json

    for event in events:
        # Event Grid sends a validation event on subscription creation
        if event.get('eventType') == 'Microsoft.EventGrid.SubscriptionValidationEvent':
            validation_code = event['data']['validationCode']
            print(f"Validating subscription: {validation_code}")
            return jsonify({"validationResponse": validation_code})

        # Handle application events
        event_type = event.get('eventType')
        subject = event.get('subject')
        data = event.get('data', {})

        print(f"Event received: {event_type}, Subject: {subject}")

        if event_type == 'OrderPlaced':
            handle_order_placed(data)
        elif event_type == 'Microsoft.Storage.BlobCreated':
            handle_blob_created(data)

    return jsonify({"status": "ok"}), 200

def handle_order_placed(data: dict):
    print(f"Processing new order: {data['orderId']}")

def handle_blob_created(data: dict):
    print(f"New blob: {data['url']}")

if __name__ == '__main__':
    app.run(port=8080)
```

## Subscribe to Azure Resource Events

```bash
# Subscribe to Azure Blob Storage events
az eventgrid event-subscription create \
  --name blob-dapr-subscription \
  --source-resource-id "/subscriptions/SUB_ID/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mydaprstorage" \
  --endpoint-type webhook \
  --endpoint "https://my-app.example.com/eventgrid-binding" \
  --included-event-types "Microsoft.Storage.BlobCreated" "Microsoft.Storage.BlobDeleted"
```

## Summary

Dapr's Azure Event Grid binding enables services to publish custom events to Event Grid topics and receive push-delivered events from Azure resources and custom event sources. Event Grid's push model eliminates polling, reducing latency and compute costs for event-driven workflows. The Dapr binding handles subscription validation automatically, simplifying the implementation of webhook-based event receivers.
