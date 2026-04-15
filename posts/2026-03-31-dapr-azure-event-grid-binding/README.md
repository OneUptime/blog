# How to Use Dapr Azure Event Grid Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Event Grid, Binding, Event-Driven

Description: Learn how to configure the Dapr Azure Event Grid binding to publish and subscribe to cloud events using Azure Event Grid for event-driven microservice architectures.

---

## What Is the Dapr Azure Event Grid Binding?

Azure Event Grid is a managed event routing service that delivers events from Azure services and custom sources to subscribers using a push model. The Dapr Azure Event Grid binding supports both output (publishing events) and input (receiving events via webhook) modes.

## Setting Up the Event Grid Binding Component

### Output Binding - Publishing Events

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-publisher
  namespace: default
spec:
  type: bindings.azure.eventgrid
  version: v1
  metadata:
    - name: topicEndpoint
      value: "https://my-topic.eastus-1.eventgrid.azure.net/api/events"
    - name: accessKey
      secretKeyRef:
        name: eventgrid-secrets
        key: accessKey
```

```bash
kubectl create secret generic eventgrid-secrets \
  --from-literal=accessKey=<event-grid-topic-key>
```

## Creating the Event Grid Topic

```bash
az eventgrid topic create \
  --name my-app-events \
  --resource-group my-rg \
  --location eastus

# Get the endpoint and key
az eventgrid topic show \
  --name my-app-events \
  --resource-group my-rg \
  --query endpoint

az eventgrid topic key list \
  --name my-app-events \
  --resource-group my-rg \
  --query key1
```

## Publishing Events to Event Grid

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function publishOrderEvent(order, eventType) {
  await client.binding.send("event-publisher", "create", {
    id: `${order.orderId}-${Date.now()}`,
    subject: `/orders/${order.orderId}`,
    eventType: `com.example.orders.${eventType}`,
    eventTime: new Date().toISOString(),
    dataVersion: "1.0",
    data: {
      orderId: order.orderId,
      customerId: order.customerId,
      status: order.status,
      totalAmount: order.totalAmount,
    },
  });

  console.log(`Published ${eventType} event for order ${order.orderId}`);
}

await publishOrderEvent({ orderId: "ORD-001", customerId: "CUST-42", status: "PLACED", totalAmount: 99.99 }, "placed");
await publishOrderEvent({ orderId: "ORD-001", customerId: "CUST-42", status: "SHIPPED", totalAmount: 99.99 }, "shipped");
```

## Receiving Events as an Input Binding

Configure the binding to receive events via webhook subscription:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: event-receiver
spec:
  type: bindings.azure.eventgrid
  version: v1
  metadata:
    - name: azureTenantId
      value: "<your-tenant-id>"
    - name: azureSubscriptionId
      value: "<your-subscription-id>"
    - name: azureClientId
      value: "<your-client-id>"
    - name: azureClientSecret
      secretKeyRef:
        name: eventgrid-secrets
        key: azureClientSecret
    - name: accessKey
      secretKeyRef:
        name: eventgrid-secrets
        key: accessKey
    - name: topicEndpoint
      value: "https://my-topic.eastus-1.eventgrid.azure.net/api/events"
    - name: scope
      value: "/subscriptions/<your-subscription-id>/resourceGroups/my-rg/providers/Microsoft.EventGrid/topics/my-app-events"
    - name: subscriberEndpoint
      value: "https://my-service.example.com/api/v1/bindings/event-receiver"
    - name: handshakePort
      value: "8080"
    - name: eventSubscriptionName
      value: "dapr-subscription"
```

## Handling Incoming Events

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/event-receiver", async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];

  for (const event of events) {
    // Respond to subscription validation challenge
    if (event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
      return res.json({
        ValidationResponse: event.data.validationCode,
      });
    }

    console.log(`Received event: ${event.eventType}`);
    console.log("Subject:", event.subject);
    console.log("Data:", JSON.stringify(event.data));

    try {
      await handleEvent(event);
    } catch (err) {
      console.error("Failed to handle event:", err);
      return res.status(500).send(err.message);
    }
  }

  res.status(200).send("OK");
});

async function handleEvent(event) {
  switch (event.eventType) {
    case "com.example.orders.placed":
      await processNewOrder(event.data);
      break;
    case "com.example.orders.shipped":
      await notifyCustomer(event.data);
      break;
    case "Microsoft.Storage.BlobCreated":
      await processBlobUpload(event.data);
      break;
    default:
      console.log(`Unhandled event type: ${event.eventType}`);
  }
}

app.listen(3000);
```

## Setting Up Event Subscriptions

Create a webhook subscription manually if not using the binding's auto-subscription:

```bash
az eventgrid event-subscription create \
  --name dapr-order-processor \
  --source-resource-id /subscriptions/{sub}/resourceGroups/my-rg/providers/Microsoft.EventGrid/topics/my-app-events \
  --endpoint https://my-service.example.com/api/v1/bindings/event-receiver \
  --endpoint-type webhook \
  --included-event-types com.example.orders.placed com.example.orders.shipped
```

## Summary

The Dapr Azure Event Grid binding supports both publishing events to Event Grid topics and receiving events via webhook subscriptions. This enables event-driven communication between microservices and Azure services without managing Event Grid SDK subscriptions. Use event filtering and routing rules to direct specific event types to the right service endpoints.
