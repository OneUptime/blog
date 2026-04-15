# How to Use Dapr Azure SignalR Output Binding for Real-Time Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, SignalR, Binding, Real-Time

Description: Learn how to configure the Dapr Azure SignalR output binding to push real-time messages to connected web and mobile clients from backend microservices.

---

## What Is the Dapr Azure SignalR Output Binding?

Azure SignalR Service is a managed real-time messaging infrastructure that handles WebSocket connections at scale. The Dapr Azure SignalR output binding lets backend microservices push messages to connected clients without managing SignalR hubs or connection state directly.

## Setting Up Azure SignalR Service

```bash
az signalr create \
  --name my-signalr-service \
  --resource-group my-rg \
  --sku Standard_S1 \
  --unit-count 1 \
  --service-mode Default

# Get the connection string
az signalr key list \
  --name my-signalr-service \
  --resource-group my-rg \
  --query primaryConnectionString \
  --output tsv
```

## Configuring the SignalR Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: realtime-notifier
  namespace: default
spec:
  type: bindings.azure.signalr
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: signalr-secrets
        key: connectionString
    - name: hub
      value: "notifications"
```

```bash
kubectl create secret generic signalr-secrets \
  --from-literal=connectionString="Endpoint=https://my-signalr-service.service.signalr.net;AccessKey=...;Version=1.0;"
```

## Sending Messages to All Clients

Use the `create` operation to broadcast to all connected clients:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function broadcastSystemAlert(message, severity) {
  await client.binding.send("realtime-notifier", "create", {
    Target: "systemAlert",
    Arguments: [
      {
        message,
        severity,
        timestamp: new Date().toISOString(),
      },
    ],
  });

  console.log(`Broadcast system alert to all clients`);
}

await broadcastSystemAlert("Scheduled maintenance in 30 minutes", "warning");
```

## Sending Messages to a Specific User

```javascript
async function notifyUser(userId, eventType, data) {
  await client.binding.send(
    "realtime-notifier",
    "create",
    {
      Target: eventType,
      Arguments: [data],
    },
    {
      user: userId,
    }
  );

  console.log(`Sent ${eventType} to user ${userId}`);
}

// Notify a specific user their order shipped
await notifyUser("user-42", "orderStatusUpdate", {
  orderId: "ORD-001",
  status: "SHIPPED",
  trackingNumber: "1Z999AA10123456784",
  estimatedDelivery: "2026-04-02",
});
```

## Sending Messages to a Group

```javascript
async function notifyGroup(groupName, eventType, data) {
  await client.binding.send(
    "realtime-notifier",
    "create",
    {
      Target: eventType,
      Arguments: [data],
    },
    {
      group: groupName,
    }
  );
}

// Notify all team members of a workspace
await notifyGroup("workspace-99", "collaborationUpdate", {
  type: "document.edited",
  documentId: "doc-123",
  editedBy: "alice@example.com",
  timestamp: new Date().toISOString(),
});
```

## Frontend Client Integration

Connect a JavaScript client to the SignalR service and handle events:

```javascript
// Frontend code (browser)
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("/negotiate", {
    accessTokenFactory: () => getAuthToken(),
  })
  .withAutomaticReconnect()
  .build();

connection.on("orderStatusUpdate", (update) => {
  console.log(`Order ${update.orderId} is now ${update.status}`);
  updateOrderUI(update);
});

connection.on("systemAlert", (alert) => {
  showAlertBanner(alert.message, alert.severity);
});

await connection.start();
console.log("Connected to SignalR");
```

## Negotiation Endpoint

Your backend needs a negotiate endpoint that returns SignalR service connection info:

```javascript
app.get("/negotiate", async (req, res) => {
  const userId = req.user.id;
  const serviceUrl = process.env.SIGNALR_URL;
  const token = await generateSignalRToken(serviceUrl, userId);

  res.json({
    url: serviceUrl,
    accessToken: token,
  });
});
```

## Summary

The Dapr Azure SignalR output binding enables backend microservices to push real-time messages to web and mobile clients without managing SignalR hub state. Broadcast to all clients, target specific users, or message named groups using simple metadata parameters. This pattern is ideal for order status updates, live dashboards, collaborative editing notifications, and operational alerts.
