# How to Configure Istio for Node.js Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Node.js, Kubernetes, Service Mesh, JavaScript

Description: Practical guide to running Node.js applications in an Istio service mesh with proper health checks, graceful shutdown, and performance tuning.

---

Node.js applications tend to play well with Istio because they are lightweight, start fast, and usually handle HTTP natively. But there are still some configurations you need to get right for everything to work smoothly. This guide covers the specific setup needed for Node.js apps running in an Istio mesh, from deployment configuration to graceful shutdown handling.

## Basic Deployment Configuration

Here is a solid starting point for deploying a Node.js app with Istio:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
      version: v1
  template:
    metadata:
      labels:
        app: user-service
        version: v1
    spec:
      containers:
      - name: user-service
        image: myregistry/user-service:1.0.0
        ports:
        - name: http-web
          containerPort: 3000
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
```

The port name `http-web` is important - it tells Istio this is an HTTP port so it can apply HTTP-level routing, metrics, and tracing.

## Service Definition

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: production
spec:
  selector:
    app: user-service
  ports:
  - name: http-web
    port: 3000
    targetPort: http-web
```

## Health Check Configuration

Node.js apps should expose dedicated health check endpoints. Here is a simple Express.js example:

```javascript
const express = require('express');
const app = express();

let isReady = false;

// Startup: connect to dependencies
async function initialize() {
  await connectToDatabase();
  await connectToRedis();
  isReady = true;
}

// Liveness probe - is the process alive and not deadlocked?
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe - can the service handle traffic?
app.get('/ready', (req, res) => {
  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

initialize().then(() => {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
});
```

Configure the probes in your deployment:

```yaml
containers:
- name: user-service
  livenessProbe:
    httpGet:
      path: /healthz
      port: 3000
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /ready
      port: 3000
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /healthz
      port: 3000
    periodSeconds: 2
    failureThreshold: 15
```

Node.js apps typically start much faster than Java apps, so the initialDelaySeconds can be lower. The startup probe gives the app up to 30 seconds (15 failures * 2 second period) to become live.

## Graceful Shutdown

This is where many Node.js deployments get it wrong. When Kubernetes sends a SIGTERM signal, your app needs to stop accepting new connections and finish processing existing ones. At the same time, the Istio sidecar is also shutting down, and you need to coordinate them.

```javascript
const http = require('http');
const express = require('express');
const app = express();

// Your routes here
app.get('/api/users', (req, res) => {
  // ... handler
});

const server = http.createServer(app);

server.listen(3000, () => {
  console.log('Server running on port 3000');
});

// Graceful shutdown
let isShuttingDown = false;

process.on('SIGTERM', () => {
  console.log('SIGTERM received, starting graceful shutdown');
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(() => {
    console.log('All connections closed, exiting');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 25000);
});

// Middleware to reject new requests during shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.status(503).json({ error: 'Server is shutting down' });
    return;
  }
  next();
});
```

Add a preStop hook to give the sidecar time to drain:

```yaml
containers:
- name: user-service
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 5"]
spec:
  terminationGracePeriodSeconds: 30
```

## Handling Sidecar Startup

Node.js apps start fast, often faster than the Istio sidecar. If your app tries to make HTTP calls during startup (connecting to a config service, loading data from an API), those calls will fail because the sidecar is not ready.

Option 1: Use holdApplicationUntilProxyStarts:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

Option 2: Add retry logic to your startup code:

```javascript
const axios = require('axios');

async function fetchConfigWithRetry(url, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      return response.data;
    } catch (err) {
      console.log(`Config fetch attempt ${i + 1} failed, retrying in 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`Failed to fetch config after ${maxRetries} retries`);
}
```

## Trace Header Propagation

For distributed tracing to work across services, your Node.js app needs to forward trace headers. Here is a middleware approach:

```javascript
const TRACE_HEADERS = [
  'x-request-id',
  'x-b3-traceid',
  'x-b3-spanid',
  'x-b3-parentspanid',
  'x-b3-sampled',
  'x-b3-flags',
  'b3',
  'traceparent',
  'tracestate'
];

function extractTraceHeaders(req) {
  const headers = {};
  for (const header of TRACE_HEADERS) {
    if (req.headers[header]) {
      headers[header] = req.headers[header];
    }
  }
  return headers;
}

// Store headers in async local storage for downstream calls
const { AsyncLocalStorage } = require('async_hooks');
const traceStorage = new AsyncLocalStorage();

// Middleware to capture trace headers
app.use((req, res, next) => {
  const traceHeaders = extractTraceHeaders(req);
  traceStorage.run(traceHeaders, () => next());
});

// Helper to get trace headers for outgoing requests
function getTraceHeaders() {
  return traceStorage.getStore() || {};
}

// Usage in a route handler
app.get('/api/orders', async (req, res) => {
  const traceHeaders = getTraceHeaders();
  const products = await axios.get('http://product-service:3000/products', {
    headers: traceHeaders
  });
  res.json({ orders: [], products: products.data });
});
```

Using `AsyncLocalStorage` means you do not need to pass trace headers through every function call. Any code running in the context of a request can access them.

## Traffic Management for Node.js Services

Configure retries and timeouts appropriate for Node.js:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: user-service
  namespace: production
spec:
  hosts:
  - user-service
  http:
  - route:
    - destination:
        host: user-service
        port:
          number: 3000
    timeout: 15s
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: 5xx,reset,connect-failure
```

Node.js apps typically have lower timeouts than Java apps because they handle I/O asynchronously and respond faster.

## Circuit Breaking

Protect your Node.js service from being overwhelmed:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: user-service
  namespace: production
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 15s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

Node.js runs on a single thread, so it is more susceptible to overload than multi-threaded runtimes. Circuit breaking at the mesh level adds an important layer of protection.

## Resource Tuning

Node.js is single-threaded, so giving it more than 1 CPU core does not help a single process. If you need more throughput, use the cluster module or run more replicas:

```yaml
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 512Mi
```

For the sidecar, Node.js apps with moderate traffic do fine with:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "50m"
    sidecar.istio.io/proxyMemory: "64Mi"
    sidecar.istio.io/proxyCPULimit: "500m"
    sidecar.istio.io/proxyMemoryLimit: "256Mi"
```

## WebSocket Support

If your Node.js app uses WebSockets (common with Socket.io), Istio handles them automatically over HTTP/1.1 upgrade. Just make sure your VirtualService does not set a timeout that would kill long-lived WebSocket connections:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: websocket-service
spec:
  hosts:
  - websocket-service
  http:
  - match:
    - headers:
        upgrade:
          exact: websocket
    route:
    - destination:
        host: websocket-service
        port:
          number: 3000
    timeout: 0s
```

Setting `timeout: 0s` disables the timeout for WebSocket connections.

Node.js apps are generally easy to integrate with Istio. The main things to get right are port naming, health checks, trace header propagation, and graceful shutdown. Once those are configured, you get the full benefit of the mesh with minimal overhead.
