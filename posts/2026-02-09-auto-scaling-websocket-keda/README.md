# How to Build Auto-Scaling WebSocket Servers with KEDA and Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WebSocket, KEDA, Kubernetes, Auto-Scaling, Real-Time

Description: Build auto-scaling WebSocket servers on Kubernetes using KEDA to scale based on connection count and message rate for efficient real-time communication infrastructure.

---

WebSocket servers pose unique scaling challenges. Traditional metrics like CPU and memory don't reflect connection load accurately. A server might be idle but handling thousands of connections. KEDA enables scaling based on actual WebSocket metrics like connection count and message throughput. This guide shows you how to build auto-scaling WebSocket infrastructure.

## Understanding WebSocket Scaling Challenges

WebSocket connections are long-lived. A single server can handle thousands of idle connections with minimal resources. But active connections sending frequent messages consume significant CPU and memory. Traditional autoscaling based on resource utilization fails to capture this nuance.

Connection distribution matters. New connections should route to least-loaded servers. But existing connections must maintain affinity to their server. This requires careful load balancing configuration.

KEDA solves these challenges by scaling based on application metrics. You expose connection count and message rate as Prometheus metrics. KEDA queries these metrics and scales your deployment accordingly.

## Setting Up Prometheus Metrics

Build a WebSocket server with metrics:

```javascript
// websocket-server.js
const WebSocket = require('ws');
const express = require('express');
const promClient = require('prom-client');

// Prometheus metrics
const register = new promClient.Registry();

const activeConnections = new promClient.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

const messagesReceived = new promClient.Counter({
  name: 'websocket_messages_received_total',
  help: 'Total number of messages received',
  registers: [register]
});

const messagesSent = new promClient.Counter({
  name: 'websocket_messages_sent_total',
  help: 'Total number of messages sent',
  registers: [register]
});

// WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  activeConnections.inc();
  console.log('New connection. Total:', wss.clients.size);

  ws.on('message', (message) => {
    messagesReceived.inc();
    console.log('Received:', message);

    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        messagesSent.inc();
      }
    });
  });

  ws.on('close', () => {
    activeConnections.dec();
    console.log('Connection closed. Total:', wss.clients.size);
  });

  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
});

// Metrics endpoint
const metricsApp = express();
metricsApp.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

metricsApp.listen(9090, () => {
  console.log('Metrics server on :9090');
});

console.log('WebSocket server listening on :8080');
```

Deploy the WebSocket server:

```yaml
# websocket-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-server
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: websocket-server
  template:
    metadata:
      labels:
        app: websocket-server
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: server
        image: your-registry/websocket-server:latest
        ports:
        - name: websocket
          containerPort: 8080
        - name: metrics
          containerPort: 9090
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 1000m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: websocket-server
spec:
  selector:
    app: websocket-server
  ports:
  - name: websocket
    port: 80
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
  # Important: Use session affinity for WebSocket
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 86400  # 24 hours
```

## Configuring KEDA for WebSocket Scaling

Create ServiceMonitor for Prometheus:

```yaml
# websocket-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: websocket-server
  namespace: default
spec:
  selector:
    matchLabels:
      app: websocket-server
  endpoints:
  - port: metrics
    interval: 15s
```

Configure KEDA ScaledObject:

```yaml
# websocket-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: websocket-server-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: websocket-server

  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 2    # Always keep 2 running
  maxReplicaCount: 50

  triggers:
  # Scale based on connections per pod
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: websocket_connections_per_pod
      threshold: "1000"  # Target 1000 connections per pod
      query: |
        sum(websocket_active_connections)
        /
        count(up{job="websocket-server"})

  # Also scale based on message rate
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: websocket_message_rate
      threshold: "100"  # Target 100 messages/sec per pod
      query: |
        sum(rate(websocket_messages_received_total[1m]))
        /
        count(up{job="websocket-server"})
```

## Implementing Connection-Aware Load Balancing

Use NGINX Ingress with least connections:

```yaml
# websocket-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: websocket-ingress
  annotations:
    nginx.ingress.kubernetes.io/websocket-services: websocket-server
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/upstream-hash-by: "$binary_remote_addr"
    # Use least connections for better distribution
    nginx.ingress.kubernetes.io/load-balance: least_conn
spec:
  ingressClassName: nginx
  rules:
  - host: ws.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: websocket-server
            port:
              number: 80
```

## Building a Scalable Chat Application

Complete chat server with Redis for pub/sub:

```javascript
// chat-server.js
const WebSocket = require('ws');
const Redis = require('ioredis');
const express = require('express');

// Redis for pub/sub across pods
const redis = new Redis({
  host: 'redis',
  port: 6379
});

const subscriber = new Redis({
  host: 'redis',
  port: 6379
});

// WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

// Subscribe to Redis channel
subscriber.subscribe('chat-messages');

subscriber.on('message', (channel, message) => {
  // Broadcast to all local connections
  const data = JSON.parse(message);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
});

wss.on('connection', (ws) => {
  console.log('New chat connection');

  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    // Publish to Redis (reaches all pods)
    await redis.publish('chat-messages', JSON.stringify({
      user: data.user,
      message: data.message,
      timestamp: Date.now()
    }));
  });
});
```

## Monitoring WebSocket Performance

Create comprehensive dashboards:

```promql
# Active connections
sum(websocket_active_connections)

# Connections per pod
websocket_active_connections

# Message throughput
rate(websocket_messages_received_total[5m])

# Connection distribution variance
stddev(websocket_active_connections)

# Average connections per pod
avg(websocket_active_connections)
```

Set up alerts:

```yaml
# websocket-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: websocket-alerts
spec:
  groups:
  - name: websocket
    interval: 30s
    rules:
    - alert: HighConnectionLoad
      expr: websocket_active_connections > 5000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "WebSocket pod has high connection count"

    - alert: UnbalancedConnections
      expr: stddev(websocket_active_connections) > 1000
      for: 10m
      labels:
        severity: info
      annotations:
        summary: "WebSocket connections unevenly distributed"
```

## Handling Connection Draining

Implement graceful shutdown:

```javascript
// graceful-shutdown.js
process.on('SIGTERM', () => {
  console.log('SIGTERM received, draining connections...');

  // Stop accepting new connections
  wss.close(() => {
    console.log('Stopped accepting connections');
  });

  // Close existing connections gracefully
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({
      type: 'server-shutdown',
      message: 'Server restarting, please reconnect'
    }));

    setTimeout(() => {
      client.close();
    }, 5000);
  });

  // Give connections time to close
  setTimeout(() => {
    process.exit(0);
  }, 30000);
});
```

Configure pod lifecycle:

```yaml
# deployment with lifecycle
spec:
  template:
    spec:
      containers:
      - name: server
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
      terminationGracePeriodSeconds: 60
```

## Best Practices

Monitor connection distribution. Ensure connections spread evenly across pods. High variance indicates load balancing issues.

Set appropriate connection limits. Don't let a single pod accumulate too many connections. Scale before reaching resource limits.

Implement reconnection logic. Clients should automatically reconnect when connections drop. Use exponential backoff to avoid thundering herd.

Use Redis or similar for cross-pod communication. WebSocket connections are pod-local. Use pub/sub for broadcasting across all pods.

Configure session affinity. Use ClientIP affinity to route reconnections to the same pod when possible.

Test scaling behavior. Simulate connection surges and verify KEDA scales appropriately. Ensure scale-down doesn't drop active connections.

## Conclusion

Building auto-scaling WebSocket infrastructure requires understanding both WebSocket-specific challenges and Kubernetes scaling patterns. KEDA enables scaling based on actual connection and message metrics rather than generic resource utilization. By combining proper metrics exposure, connection-aware load balancing, and graceful connection draining, you can build WebSocket systems that scale efficiently while maintaining reliable real-time communication. This approach handles both steady load and traffic spikes while optimizing resource usage.
