# How to Build IoT Dashboard Backend with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Dashboard, WebSocket, State Management

Description: Learn how to build a scalable IoT dashboard backend using Dapr state for device data and pub/sub for real-time WebSocket updates.

---

An IoT dashboard backend serves two functions: providing current device state for initial page loads, and streaming real-time updates as new telemetry arrives. Dapr state management handles the fast lookup path while pub/sub feeds the WebSocket streaming path.

## Dashboard Backend Architecture

```text
Browser -> REST API (initial load) -> Dapr State Store
        -> WebSocket (real-time)   -> Dapr Pub/Sub -> WebSocket Push
Devices -> Telemetry Pipeline      -> Dapr State + Pub/Sub
```

## REST API for Initial Dashboard Load

```python
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json

app = Flask(__name__)

@app.route('/dashboard/fleet', methods=['GET'])
def get_fleet_overview():
    """Return current state of all devices for initial dashboard render."""
    with DaprClient() as client:
        # Get list of active devices
        devices_data = client.get_state('statestore', 'active-devices').data
        device_ids = json.loads(devices_data or '[]')

        fleet = []
        for device_id in device_ids:
            summary_data = client.get_state('statestore', f'device-summary:{device_id}').data
            if summary_data:
                fleet.append(json.loads(summary_data))

    return jsonify({
        "totalDevices": len(device_ids),
        "onlineDevices": sum(1 for d in fleet if d.get('status') == 'connected'),
        "devices": fleet
    })

@app.route('/dashboard/devices/<device_id>', methods=['GET'])
def get_device_detail(device_id: str):
    """Return detailed view for a specific device."""
    with DaprClient() as client:
        summary_data = client.get_state('statestore', f'device-summary:{device_id}').data
        config_data = client.get_state('statestore', f'device-config:{device_id}').data
        alerts_data = client.get_state('statestore', f'device-alerts:{device_id}').data

    if not summary_data:
        return jsonify({"error": "Device not found"}), 404

    return jsonify({
        "summary": json.loads(summary_data),
        "config": json.loads(config_data or '{}'),
        "activeAlerts": json.loads(alerts_data or '[]')
    })
```

## WebSocket Server for Real-Time Updates

```javascript
const WebSocket = require('ws');
const { DaprServer } = require('@dapr/dapr');

const wss = new WebSocket.Server({ port: 8081 });
const subscriptions = new Map(); // clientId -> Set<deviceId>
const clients = new Map(); // clientId -> WebSocket

wss.on('connection', (ws) => {
  const clientId = generateId();
  clients.set(clientId, ws);
  subscriptions.set(clientId, new Set());

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'subscribe') {
      subscriptions.get(clientId).add(msg.deviceId);
    }
    if (msg.type === 'unsubscribe') {
      subscriptions.get(clientId).delete(msg.deviceId);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    subscriptions.delete(clientId);
  });

  ws.send(JSON.stringify({ type: 'connected', clientId }));
});

function pushToSubscribers(deviceId, data) {
  const message = JSON.stringify({ type: 'telemetry', deviceId, data });
  for (const [clientId, deviceIds] of subscriptions.entries()) {
    if (deviceIds.has(deviceId) || deviceIds.has('*')) {
      const ws = clients.get(clientId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}
```

## Subscribe to Telemetry and Alerts

```javascript
const daprServer = new DaprServer({ serverPort: "3001" });

(async () => {
  // Push telemetry updates to subscribed clients
  await daprServer.pubsub.subscribe('pubsub', 'device-state-changes', async (event) => {
    pushToSubscribers(event.deviceId, event);
  });

  // Push alert notifications
  await daprServer.pubsub.subscribe('pubsub', 'alert-triggered', async (alert) => {
    const message = JSON.stringify({ type: 'alert', ...alert });
    for (const ws of clients.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  });

  await daprServer.start();
})();
```

## Frontend Connection Logic

```javascript
const ws = new WebSocket('ws://dashboard-backend:8081');

ws.onopen = () => {
  // Subscribe to specific devices
  ws.send(JSON.stringify({ type: 'subscribe', deviceId: 'sensor-001' }));
  ws.send(JSON.stringify({ type: 'subscribe', deviceId: 'sensor-002' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'telemetry') updateDeviceCard(msg.deviceId, msg.data);
  if (msg.type === 'alert') showAlert(msg);
};
```

## Scale the Dashboard Backend

For multiple dashboard backend replicas, use Redis pub/sub as a backplane:

```python
# Dapr state provides shared device data across replicas
# Redis backplane synchronizes WebSocket push across nodes

import redis
r = redis.Redis(host='redis', port=6379)
pubsub = r.pubsub()

# Subscribe to internal channel
pubsub.subscribe('dashboard-internal')

for message in pubsub.listen():
    if message['type'] == 'message':
        event = json.loads(message['data'])
        push_to_local_subscribers(event['deviceId'], event['data'])
```

## Summary

The IoT dashboard backend uses Dapr state for fast initial page loads of current device state, and Dapr pub/sub to stream real-time telemetry and alerts to WebSocket clients. Clients subscribe to specific device IDs and receive push updates only for their selected devices. Scale horizontally by using a Redis backplane to synchronize WebSocket push across multiple dashboard backend replicas while Dapr state provides shared device data.
