# How to Configure Health Checks for Express.js with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Express.js, Health Check, Node.js, Kubernetes

Description: Complete guide to implementing robust health checks for Express.js applications running in an Istio service mesh with Kubernetes probes.

---

Health checks are the foundation of reliable Kubernetes deployments, and getting them right for Express.js applications in an Istio mesh requires understanding how the three systems interact. Kubernetes uses probes to decide if your pod is alive and ready for traffic. Istio's sidecar intercepts and rewrites those probes. Your Express.js app needs to respond correctly to both.

This guide covers everything from basic health endpoints to advanced patterns with dependency checking and graceful shutdown.

## Basic Health Check Endpoints

Start with two separate endpoints - one for liveness and one for readiness:

```javascript
const express = require('express');
const app = express();

// Liveness: Is the process running and not deadlocked?
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: Date.now() });
});

// Readiness: Can the service handle traffic?
app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

This is a starting point, but production apps need more sophistication. The readiness check should verify that the app can actually serve requests, which means checking database connections, cache availability, and other critical dependencies.

## Production-Ready Health Checks

```javascript
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');

const app = express();
const redis = new Redis(process.env.REDIS_URL);

let isReady = false;
let isShuttingDown = false;

// Track connection states
const dependencies = {
  database: false,
  redis: false,
};

// Monitor MongoDB connection
mongoose.connection.on('connected', () => {
  dependencies.database = true;
});
mongoose.connection.on('disconnected', () => {
  dependencies.database = false;
});
mongoose.connection.on('error', () => {
  dependencies.database = false;
});

// Monitor Redis connection
redis.on('connect', () => {
  dependencies.redis = true;
});
redis.on('error', () => {
  dependencies.redis = false;
});
redis.on('close', () => {
  dependencies.redis = false;
});

// Liveness probe - should ONLY check if the process is healthy
// Do NOT check external dependencies here
app.get('/healthz', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }

  // Check event loop responsiveness
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage().heapUsed,
  });
});

// Readiness probe - checks if the app can serve traffic
app.get('/ready', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }

  if (!isReady) {
    return res.status(503).json({ status: 'initializing' });
  }

  const allHealthy = Object.values(dependencies).every(Boolean);

  if (allHealthy) {
    res.status(200).json({
      status: 'ready',
      dependencies,
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      dependencies,
    });
  }
});

// Detailed health check for debugging (not used by probes)
app.get('/health/details', (req, res) => {
  res.json({
    status: isReady && !isShuttingDown ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies,
    pid: process.pid,
    nodeVersion: process.version,
  });
});

// Application startup
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log('Connected to MongoDB');

    await redis.ping();
    console.log('Connected to Redis');

    isReady = true;
    console.log('Application is ready');
  } catch (err) {
    console.error('Startup error:', err.message);
    // Don't exit - let the readiness probe report not ready
    // and let the startup probe eventually kill the pod if needed
  }
}

const server = app.listen(3000, () => {
  console.log('Server running on port 3000');
  start();
});
```

## Kubernetes Probe Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
      version: v1
  template:
    metadata:
      labels:
        app: api-service
        version: v1
    spec:
      containers:
      - name: api-service
        image: myregistry/api-service:1.0.0
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
        startupProbe:
          httpGet:
            path: /healthz
            port: 3000
          periodSeconds: 2
          failureThreshold: 30
        livenessProbe:
          httpGet:
            path: /healthz
            port: 3000
          periodSeconds: 10
          failureThreshold: 3
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          periodSeconds: 5
          failureThreshold: 3
          timeoutSeconds: 5
```

The startup probe gives the app up to 60 seconds (30 * 2) to start. Express.js apps usually start in a few seconds, but database connections and initial data loading can take longer. Once the startup probe passes, the liveness and readiness probes take over.

## How Istio Handles These Probes

When Istio injects the sidecar, it rewrites your HTTP probes to go through the Envoy proxy on port 15020. The probe request path changes to include the original port and path as query parameters.

You can see the rewritten probes:

```bash
kubectl get pod api-service-xxx -o yaml | grep -A 10 "livenessProbe\|readinessProbe"
```

The rewriting is transparent - your Express.js app responds to the same path and port it always did. The sidecar handles the translation.

### When Probe Rewriting Causes Issues

In rare cases, the probe rewriting can cause problems:

1. If the sidecar is not ready when Kubernetes sends the first probe
2. If your app uses custom headers in probe responses that the sidecar strips

To disable rewriting:

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "false"
```

## Handling the Sidecar Startup Race

Express.js apps start very fast - often in under a second. The Istio sidecar takes longer. If your app makes HTTP calls during startup (connecting to config services, loading data from APIs), those calls will fail because the sidecar is not ready.

### Solution 1: Hold Application Start

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

### Solution 2: Retry Logic in Your App

```javascript
const axios = require('axios');

async function fetchWithRetry(url, options = {}, maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, { ...options, timeout: 5000 });
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = Math.min(1000 * attempt, 5000);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Use during startup
async function start() {
  const config = await fetchWithRetry('http://config-service:3000/config');
  // ... continue initialization
}
```

### Solution 3: Wait for Sidecar Before Starting

Add a small script that checks if the sidecar is ready before starting your app:

```bash
#!/bin/sh
# wait-for-sidecar.sh

echo "Waiting for Istio sidecar..."
until curl -s http://localhost:15020/healthz/ready > /dev/null 2>&1; do
  sleep 0.5
done
echo "Sidecar is ready, starting application..."
exec node app.js
```

Use it as your container command:

```yaml
containers:
- name: api-service
  command: ["/bin/sh", "/app/wait-for-sidecar.sh"]
```

## Event Loop Monitoring

A more sophisticated liveness check monitors the Node.js event loop. If the event loop is blocked, the app is effectively frozen:

```javascript
let lastEventLoopCheck = Date.now();
let eventLoopBlocked = false;

// Check event loop health every second
setInterval(() => {
  const now = Date.now();
  const delay = now - lastEventLoopCheck - 1000;
  lastEventLoopCheck = now;

  // If the event loop was blocked for more than 5 seconds
  eventLoopBlocked = delay > 5000;
}, 1000).unref();

app.get('/healthz', (req, res) => {
  if (eventLoopBlocked) {
    return res.status(503).json({
      status: 'unhealthy',
      reason: 'event loop blocked',
    });
  }

  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }

  res.status(200).json({ status: 'alive' });
});
```

The `.unref()` on the interval is important - it prevents the timer from keeping the process alive during shutdown.

## Graceful Shutdown with Health Checks

Proper shutdown coordination between Express.js, Kubernetes, and Istio:

```javascript
const http = require('http');
const express = require('express');

const app = express();
let isShuttingDown = false;

// Health check routes
app.get('/healthz', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }
  res.status(200).json({ status: 'alive' });
});

app.get('/ready', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }
  // ... readiness checks
  res.status(200).json({ status: 'ready' });
});

// Application routes
app.get('/api/data', (req, res) => {
  if (isShuttingDown) {
    res.set('Connection', 'close');
  }
  // ... handle request
  res.json({ data: [] });
});

const server = http.createServer(app);

server.listen(3000, () => {
  console.log('Server running on port 3000');
});

// Keep-alive connections should have a timeout
server.keepAliveTimeout = 65000; // Slightly higher than Envoy's idle timeout
server.headersTimeout = 66000;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(() => {
    console.log('Server closed');

    // Close database connections
    mongoose.connection.close(false, () => {
      redis.disconnect();
      console.log('All connections closed');
      process.exit(0);
    });
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced exit');
    process.exit(1);
  }, 25000);
});
```

In your deployment, add a preStop hook:

```yaml
containers:
- name: api-service
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 5"]
spec:
  terminationGracePeriodSeconds: 35
```

The shutdown sequence:
1. Kubernetes sends SIGTERM
2. preStop hook sleeps 5 seconds (sidecar drains connections)
3. Express sets isShuttingDown = true (health checks start returning 503)
4. server.close() stops accepting new connections
5. Existing requests finish processing
6. Connections close, process exits

## Multiple Health Check Patterns

For more complex applications, use a health check registry:

```javascript
class HealthCheckRegistry {
  constructor() {
    this.checks = new Map();
  }

  register(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  async runAll() {
    const results = {};
    let allHealthy = true;

    for (const [name, checkFn] of this.checks) {
      try {
        await Promise.race([
          checkFn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          ),
        ]);
        results[name] = { status: 'up' };
      } catch (err) {
        results[name] = { status: 'down', error: err.message };
        allHealthy = false;
      }
    }

    return { healthy: allHealthy, checks: results };
  }
}

const healthRegistry = new HealthCheckRegistry();

// Register checks
healthRegistry.register('database', async () => {
  await mongoose.connection.db.admin().ping();
});

healthRegistry.register('redis', async () => {
  await redis.ping();
});

healthRegistry.register('disk', async () => {
  const fs = require('fs').promises;
  await fs.access('/tmp', fs.constants.W_OK);
});

// Use in readiness probe
app.get('/ready', async (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }

  const result = await healthRegistry.runAll();

  if (result.healthy) {
    res.status(200).json({ status: 'ready', ...result });
  } else {
    res.status(503).json({ status: 'not ready', ...result });
  }
});
```

## Common Express.js + Istio Health Check Issues

**Keep-alive timeout mismatch**: Express's default keep-alive timeout (5 seconds) is shorter than Envoy's. This can cause "connection reset" errors. Set `server.keepAliveTimeout = 65000`.

**Request timeout on probes**: If your readiness check makes database calls that are slow, the probe might time out. Set `timeoutSeconds` in the probe configuration and make sure your dependency checks have their own timeouts.

**Probe requests in access logs**: Health check requests will appear in your application logs. Either filter them out or use a middleware that skips logging for health check paths:

```javascript
app.use((req, res, next) => {
  if (req.path === '/healthz' || req.path === '/ready') {
    return next(); // Skip logging middleware
  }
  // ... your logging middleware
  next();
});
```

**Memory leaks affecting liveness**: A memory leak will not trigger the liveness probe unless it causes the event loop to block or the process to crash. Add memory monitoring to your liveness check:

```javascript
app.get('/healthz', (req, res) => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

  // Flag as unhealthy if heap usage exceeds 90% of limit
  if (heapUsedMB > 450) { // Assuming 512Mi limit
    return res.status(503).json({
      status: 'unhealthy',
      reason: 'high memory usage',
      heapUsedMB: Math.round(heapUsedMB),
    });
  }

  res.status(200).json({ status: 'alive' });
});
```

Getting health checks right for Express.js in Istio comes down to three things: keep liveness checks simple (no external dependencies), make readiness checks thorough (check everything the app needs to serve traffic), and handle the shutdown sequence properly so the sidecar and Express.js shut down in the right order.
