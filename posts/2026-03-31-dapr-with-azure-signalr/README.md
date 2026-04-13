# How to Use Dapr with Azure SignalR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, SignalR, Real-Time, Binding, WebSocket

Description: Use the Dapr Azure SignalR output binding to push real-time notifications and updates to web clients from microservices without managing WebSocket connections.

---

Azure SignalR Service manages WebSocket connections at scale, allowing backend services to push real-time updates to thousands of connected clients. Dapr's SignalR binding lets any microservice send messages to connected clients or broadcast to groups without managing connection state.

## Create an Azure SignalR Service

```bash
# Create SignalR service instance
az signalr create \
  --name my-dapr-signalr \
  --resource-group my-rg \
  --location eastus \
  --sku Standard_S1 \
  --service-mode Default \
  --enable-message-logs true

# Get the connection string
SIGNALR_CONN_STR=$(az signalr key list \
  --name my-dapr-signalr \
  --resource-group my-rg \
  --query "primaryConnectionString" --output tsv)

kubectl create secret generic signalr-secret \
  --from-literal=connectionString="$SIGNALR_CONN_STR"
```

## Configure the Dapr SignalR Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: signalr-binding
  namespace: default
spec:
  type: bindings.azure.signalr
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: signalr-secret
      key: connectionString
  - name: hub
    value: notifications
```

## Send a Message to a Specific User

```python
import requests
import json

def send_to_user(user_id: str, event: str, data: dict):
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/signalr-binding",
        json={
            "operation": "create",
            "data": json.dumps(data),
            "metadata": {
                "user": user_id,
                "hub": "notifications"
            }
        }
    )
    resp.raise_for_status()
    print(f"Message sent to user: {user_id}")

# Notify a user that their order shipped
send_to_user("user-123", "orderShipped", {
    "orderId": "order-001",
    "trackingNumber": "1Z999AA10123456784",
    "estimatedDelivery": "2026-04-02"
})
```

## Broadcast to a Group

```python
def send_to_group(group: str, message: dict):
    requests.post(
        "http://localhost:3500/v1.0/bindings/signalr-binding",
        json={
            "operation": "create",
            "data": json.dumps(message),
            "metadata": {
                "group": group,
                "hub": "notifications"
            }
        }
    ).raise_for_status()

# Send low-stock alert to all warehouse staff
send_to_group("warehouse-staff", {
    "type": "LOW_STOCK_ALERT",
    "product": "WIDGET-A",
    "currentStock": 5,
    "reorderLevel": 20
})
```

## Broadcast to All Connected Clients

```python
def broadcast(message: dict):
    requests.post(
        "http://localhost:3500/v1.0/bindings/signalr-binding",
        json={
            "operation": "create",
            "data": json.dumps(message),
            "metadata": {
                "hub": "notifications"
            }
        }
    ).raise_for_status()

# Broadcast system maintenance announcement
broadcast({
    "type": "MAINTENANCE_SCHEDULED",
    "startTime": "2026-04-01T02:00:00Z",
    "duration": "30 minutes",
    "message": "Scheduled maintenance tonight at 2 AM UTC"
})
```

## React Frontend Client

```javascript
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
    .withUrl('/api/negotiate')
    .withAutomaticReconnect()
    .build();

connection.on('notifications', (message) => {
    const data = JSON.parse(message);
    console.log('Received:', data);
    handleNotification(data);
});

function handleNotification(data) {
    switch (data.type) {
        case 'orderShipped':
            showOrderShippedToast(data);
            break;
        case 'LOW_STOCK_ALERT':
            showWarehouseAlert(data);
            break;
        case 'MAINTENANCE_SCHEDULED':
            showMaintenanceBanner(data);
            break;
    }
}

await connection.start();
```

## Summary

Dapr's Azure SignalR binding enables microservices to push real-time updates to web clients without managing WebSocket connections or connection state. Services send messages to individual users, groups, or all connected clients through a simple HTTP POST to the Dapr binding. This decouples real-time notification logic from connection management, making it easy to add push notifications to any service in the architecture.
