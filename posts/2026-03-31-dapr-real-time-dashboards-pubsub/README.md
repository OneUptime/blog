# How to Build Real-Time Dashboards with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Real-Time, Dashboard, WebSocket

Description: Learn how to build real-time dashboards by combining Dapr pub/sub for backend event streaming with WebSockets for frontend updates.

---

Real-time dashboards require low-latency data pipelines from source events to the browser. Dapr pub/sub handles reliable message delivery between backend services, while a WebSocket server bridges the gap between the message broker and connected browser clients. This guide shows you how to wire these together.

## Architecture Overview

```text
Data Source -> Dapr Publisher -> Message Broker -> Dapr Subscriber -> WebSocket Server -> Browser
```

Backend services publish metrics or events via Dapr. A WebSocket bridge service subscribes to those topics and pushes updates to connected clients.

## Publish Metrics Events

A metrics collector service publishes data every second:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function publishMetrics() {
  const metrics = {
    timestamp: Date.now(),
    cpuUsage: getCpuUsage(),
    memoryUsage: getMemoryUsage(),
    requestRate: getRequestRate()
  };

  await client.pubsub.publish('pubsub', 'dashboard-metrics', metrics);
}

setInterval(publishMetrics, 1000);
```

## Create the WebSocket Bridge Subscriber

The bridge subscribes to Dapr events and forwards them to WebSocket clients:

```javascript
const express = require('express');
const WebSocket = require('ws');
const app = express();
app.use(express.json());

const wss = new WebSocket.Server({ port: 8081 });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Dapr subscription endpoint
app.post('/dashboard-metrics', (req, res) => {
  broadcast(req.body.data);
  res.sendStatus(200);
});

app.listen(3000);
```

## Configure the Subscription

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: dashboard-metrics-sub
spec:
  pubsubname: pubsub
  topic: dashboard-metrics
  routes:
    default: /dashboard-metrics
```

## Frontend JavaScript Client

Connect to the WebSocket server and update the dashboard:

```javascript
const ws = new WebSocket('ws://dashboard-backend:8081');

ws.onmessage = (event) => {
  const metrics = JSON.parse(event.data);

  document.getElementById('cpu').textContent = `${metrics.cpuUsage}%`;
  document.getElementById('memory').textContent = `${metrics.memoryUsage}MB`;
  document.getElementById('requests').textContent = `${metrics.requestRate}/s`;

  updateChart(metrics);
};

ws.onclose = () => {
  setTimeout(() => reconnect(), 3000);
};
```

## Handle Multiple Dashboard Topics

Use Dapr's topic routing to fan out different event types:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: dashboard-multi-sub
spec:
  pubsubname: pubsub
  topic: dashboard-events
  routes:
    rules:
    - match: event.data.type == "metrics"
      path: /metrics
    - match: event.data.type == "alerts"
      path: /alerts
    default: /events
```

## Scale the WebSocket Bridge

For multiple WebSocket server replicas, use Redis as a WebSocket pub/sub backplane:

```javascript
const Redis = require('ioredis');
const subscriber = new Redis({ host: 'redis' });
const publisher = new Redis({ host: 'redis' });

subscriber.subscribe('dashboard-channel');
subscriber.on('message', (channel, message) => broadcast(message));

app.post('/dashboard-metrics', (req, res) => {
  publisher.publish('dashboard-channel', JSON.stringify(req.body.data));
  res.sendStatus(200);
});
```

## Summary

Real-time dashboards with Dapr pub/sub use Dapr as the reliable event pipeline between backend data sources and a WebSocket bridge service. The bridge subscribes to Dapr topics and forwards incoming messages to all connected browser clients via WebSocket. Scale horizontally by adding a Redis backplane to synchronize messages across multiple WebSocket bridge replicas.
