# How to Implement Health Checks and Readiness Probes in Node.js for Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Kubernetes, Reliability, DevOps, Monitoring

Description: Learn to implement health checks and readiness probes in Node.js applications for Kubernetes, including dependency checking, graceful degradation, and proper probe configuration.

---

Kubernetes uses health checks to determine if your application is running correctly (liveness) and ready to receive traffic (readiness). Poorly implemented health checks lead to cascading failures, unnecessary restarts, and dropped requests during deployments.

For more on graceful shutdown patterns, see our guide on [building graceful shutdown handlers in Node.js](https://oneuptime.com/blog/post/2026-01-06-nodejs-graceful-shutdown-handler/view).

## Understanding Kubernetes Probes

| Probe | Purpose | Failure Action |
|-------|---------|----------------|
| **Liveness** | Is the process alive? | Restart container |
| **Readiness** | Can it handle traffic? | Remove from service |
| **Startup** | Has it finished starting? | Wait, then use liveness |

## Basic Health Check Endpoints

```javascript
const express = require('express');
const app = express();

// Simple liveness - is the process responding?
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness - can we handle traffic?
let isReady = false;

app.get('/health/ready', (req, res) => {
  if (isReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

// Mark ready after initialization
async function initialize() {
  await connectToDatabase();
  await warmUpCache();
  isReady = true;
}

initialize();
```

## Comprehensive Health Check Implementation

```javascript
// health/index.js
class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.isShuttingDown = false;
  }

  // Register a health check
  register(name, checkFn, options = {}) {
    this.checks.set(name, {
      fn: checkFn,
      critical: options.critical ?? true, // If critical, affects readiness
      timeout: options.timeout ?? 5000,
      lastResult: null,
      lastCheck: null,
    });
  }

  // Run a single check with timeout
  async runCheck(name, check) {
    const start = Date.now();

    try {
      const result = await Promise.race([
        check.fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
        ),
      ]);

      check.lastResult = {
        status: 'healthy',
        latency: Date.now() - start,
        ...result,
      };
    } catch (error) {
      check.lastResult = {
        status: 'unhealthy',
        error: error.message,
        latency: Date.now() - start,
      };
    }

    check.lastCheck = new Date().toISOString();
    return check.lastResult;
  }

  // Run all checks
  async runAllChecks() {
    const results = {};

    await Promise.all(
      Array.from(this.checks.entries()).map(async ([name, check]) => {
        results[name] = await this.runCheck(name, check);
      })
    );

    return results;
  }

  // Liveness: Is the process fundamentally working?
  async getLiveness() {
    // Basic check - can we run JavaScript?
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      status: 'ok',
      uptime: Math.floor(uptime),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
    };
  }

  // Readiness: Can we handle traffic?
  async getReadiness() {
    if (this.isShuttingDown) {
      return {
        ready: false,
        reason: 'shutting down',
        checks: {},
      };
    }

    const results = await this.runAllChecks();

    // Check if any critical checks failed
    const criticalFailures = Array.from(this.checks.entries())
      .filter(([name, check]) => check.critical && results[name]?.status === 'unhealthy')
      .map(([name]) => name);

    const ready = criticalFailures.length === 0;

    return {
      ready,
      reason: ready ? null : `Critical checks failed: ${criticalFailures.join(', ')}`,
      checks: results,
    };
  }

  setShuttingDown() {
    this.isShuttingDown = true;
  }
}

module.exports = { HealthChecker };
```

## Registering Dependency Checks

```javascript
const { HealthChecker } = require('./health');
const { Pool } = require('pg');
const Redis = require('ioredis');

const health = new HealthChecker();

// Database health check
const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });

health.register('database', async () => {
  const client = await dbPool.connect();
  try {
    const result = await client.query('SELECT 1 as ok');
    return { connected: true };
  } finally {
    client.release();
  }
}, { critical: true, timeout: 3000 });

// Redis health check
const redis = new Redis(process.env.REDIS_URL);

health.register('redis', async () => {
  const pong = await redis.ping();
  return { connected: pong === 'PONG' };
}, { critical: true, timeout: 2000 });

// External API health check (non-critical)
health.register('payment-api', async () => {
  const response = await fetch('https://api.stripe.com/v1/health', {
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status };
}, { critical: false, timeout: 5000 }); // Non-critical - can degrade gracefully

// Disk space check
const os = require('os');
const { statfs } = require('fs/promises');

health.register('disk', async () => {
  const stats = await statfs('/');
  const freePercent = (stats.bfree / stats.blocks) * 100;
  return {
    freePercent: Math.round(freePercent),
    healthy: freePercent > 10, // Alert if < 10% free
  };
}, { critical: false, timeout: 1000 });

module.exports = { health, dbPool, redis };
```

## Express Routes

```javascript
const express = require('express');
const { health } = require('./health-setup');

const app = express();

// Liveness probe endpoint
app.get('/health/live', async (req, res) => {
  try {
    const status = await health.getLiveness();
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

// Readiness probe endpoint
app.get('/health/ready', async (req, res) => {
  try {
    const status = await health.getReadiness();
    res.status(status.ready ? 200 : 503).json(status);
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
    });
  }
});

// Detailed health endpoint (for debugging, not for probes)
app.get('/health', async (req, res) => {
  const [liveness, readiness] = await Promise.all([
    health.getLiveness(),
    health.getReadiness(),
  ]);

  res.json({
    timestamp: new Date().toISOString(),
    liveness,
    readiness,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  health.setShuttingDown();
  // Continue serving requests for a short time
  setTimeout(() => process.exit(0), 10000);
});
```

## Kubernetes Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodejs-app
spec:
  replicas: 3
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: app
          image: my-nodejs-app:latest
          ports:
            - containerPort: 3000

          # Startup probe - for slow-starting apps
          startupProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 30  # 30 * 5 = 150 seconds max startup

          # Liveness probe - is the container still running?
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 0
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          # Readiness probe - can it handle traffic?
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 0
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
            successThreshold: 1

          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## Probe Configuration Best Practices

| Setting | Liveness | Readiness | Why |
|---------|----------|-----------|-----|
| **initialDelaySeconds** | Use startupProbe instead | 0 | Startup probe handles initialization |
| **periodSeconds** | 10-30 | 5-10 | Readiness needs faster updates |
| **timeoutSeconds** | 5 | 3 | Readiness should be quick |
| **failureThreshold** | 3 | 2 | Readiness should react faster |
| **successThreshold** | 1 | 1 | Default is fine |

## Common Mistakes

### 1. Checking Dependencies in Liveness Probe

```javascript
// BAD: Database check in liveness
app.get('/health/live', async (req, res) => {
  const dbOk = await checkDatabase(); // If DB is down, pod restarts
  // Restarting won't fix a database outage!
  res.status(dbOk ? 200 : 500).json({ status: dbOk ? 'ok' : 'error' });
});

// GOOD: Only check if process is alive
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
```

### 2. Expensive Health Checks

```javascript
// BAD: Expensive query in probe
app.get('/health/ready', async (req, res) => {
  const count = await db.query('SELECT COUNT(*) FROM large_table'); // Slow!
  res.status(200).json({ status: 'ok', count });
});

// GOOD: Simple connectivity check
app.get('/health/ready', async (req, res) => {
  await db.query('SELECT 1');
  res.status(200).json({ status: 'ok' });
});
```

### 3. Not Handling Shutdown

```javascript
// BAD: No shutdown handling
app.get('/health/ready', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// GOOD: Fail readiness during shutdown
let shuttingDown = false;

process.on('SIGTERM', () => {
  shuttingDown = true;
});

app.get('/health/ready', (req, res) => {
  if (shuttingDown) {
    return res.status(503).json({ status: 'shutting down' });
  }
  res.status(200).json({ status: 'ok' });
});
```

## Metrics Integration

```javascript
const prometheus = require('prom-client');

// Health check metrics
const healthCheckDuration = new prometheus.Histogram({
  name: 'health_check_duration_seconds',
  help: 'Health check duration',
  labelNames: ['check', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

const healthCheckStatus = new prometheus.Gauge({
  name: 'health_check_status',
  help: 'Health check status (1 = healthy, 0 = unhealthy)',
  labelNames: ['check'],
});

// Update metrics when running checks
async function runCheckWithMetrics(name, check) {
  const timer = healthCheckDuration.startTimer({ check: name });

  try {
    const result = await check.fn();
    timer({ status: 'success' });
    healthCheckStatus.set({ check: name }, 1);
    return { status: 'healthy', ...result };
  } catch (error) {
    timer({ status: 'error' });
    healthCheckStatus.set({ check: name }, 0);
    return { status: 'unhealthy', error: error.message };
  }
}
```

## Summary

| Probe | Check | Failure Means |
|-------|-------|---------------|
| **Liveness** | Process alive | Restart container |
| **Readiness** | Dependencies OK | Remove from traffic |
| **Startup** | Initialization complete | Keep waiting |

Health checks are critical for reliable Kubernetes deployments. Keep liveness probes simple, make readiness probes comprehensive but fast, and always handle graceful shutdown to prevent dropped requests during deployments.
