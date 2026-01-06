# How to Build a Graceful Shutdown Handler in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Reliability, DevOps, Kubernetes

Description: Learn to implement graceful shutdown in Node.js applications with SIGTERM handling, connection draining, and health check transitions for zero-downtime deployments.

---

When your Node.js application receives a shutdown signal, it can either crash immediately (leaving requests half-processed and connections dangling) or shut down gracefully (completing in-flight requests, closing connections cleanly, and transitioning health checks). The difference matters for reliability, data integrity, and user experience.

## Why Graceful Shutdown Matters

| Scenario | Without Graceful Shutdown | With Graceful Shutdown |
|----------|---------------------------|------------------------|
| Deploy | Requests dropped, 502 errors | Zero dropped requests |
| Scale down | Connections terminated | Connections drained |
| Pod eviction | Data corruption risk | Clean state |
| Database | Open transactions | Committed or rolled back |

## Basic Shutdown Handler

```javascript
const express = require('express');
const app = express();

let server;
let isShuttingDown = false;

// Track active connections
const connections = new Set();

app.get('/', (req, res) => {
  // Simulate work
  setTimeout(() => {
    res.json({ status: 'ok' });
  }, 100);
});

// Start server
server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// Track connections
server.on('connection', (socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});

// Graceful shutdown handler
async function shutdown(signal) {
  console.log(`Received ${signal}, starting graceful shutdown...`);

  if (isShuttingDown) {
    console.log('Shutdown already in progress');
    return;
  }
  isShuttingDown = true;

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error closing server:', err);
      process.exit(1);
    }
    console.log('Server closed');
    process.exit(0);
  });

  // Force close connections after timeout
  const forceCloseTimeout = setTimeout(() => {
    console.log('Forcing remaining connections closed');
    for (const socket of connections) {
      socket.destroy();
    }
    process.exit(1);
  }, 30000); // 30 second timeout

  // Clean up timeout if server closes gracefully
  server.once('close', () => {
    clearTimeout(forceCloseTimeout);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

## Complete Production Implementation

```javascript
const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');

class GracefulShutdownManager {
  constructor(options = {}) {
    this.shutdownTimeout = options.timeout || 30000;
    this.isShuttingDown = false;
    this.connections = new Set();
    this.cleanupHandlers = [];
    this.server = null;
  }

  // Register resources that need cleanup
  registerCleanup(name, handler) {
    this.cleanupHandlers.push({ name, handler });
  }

  // Track HTTP connections
  trackConnections(server) {
    this.server = server;

    server.on('connection', (socket) => {
      this.connections.add(socket);
      socket.on('close', () => this.connections.delete(socket));
    });
  }

  // Main shutdown handler
  async shutdown(signal) {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress');
      return;
    }

    console.log(`\n[Shutdown] Received ${signal}`);
    this.isShuttingDown = true;
    const startTime = Date.now();

    // Set up force shutdown timeout
    const forceShutdownTimer = setTimeout(() => {
      console.error('[Shutdown] Timeout exceeded, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Step 1: Stop accepting new connections
      console.log('[Shutdown] Stopping HTTP server...');
      await this.closeServer();
      console.log('[Shutdown] HTTP server stopped');

      // Step 2: Run cleanup handlers in reverse order
      for (let i = this.cleanupHandlers.length - 1; i >= 0; i--) {
        const { name, handler } = this.cleanupHandlers[i];
        console.log(`[Shutdown] Cleaning up: ${name}...`);

        try {
          await Promise.race([
            handler(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
            ),
          ]);
          console.log(`[Shutdown] ${name} cleaned up`);
        } catch (error) {
          console.error(`[Shutdown] Error cleaning up ${name}:`, error.message);
        }
      }

      // Step 3: Close remaining connections
      if (this.connections.size > 0) {
        console.log(`[Shutdown] Closing ${this.connections.size} remaining connections`);
        for (const socket of this.connections) {
          socket.destroy();
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[Shutdown] Completed in ${duration}ms`);

      clearTimeout(forceShutdownTimer);
      process.exit(0);
    } catch (error) {
      console.error('[Shutdown] Error during shutdown:', error);
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  }

  closeServer() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }

      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Check if shutting down (for middleware)
  isTerminating() {
    return this.isShuttingDown;
  }
}

// Usage
const shutdown = new GracefulShutdownManager({ timeout: 30000 });

// Express app
const app = express();

// Middleware to reject new requests during shutdown
app.use((req, res, next) => {
  if (shutdown.isTerminating()) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Server is shutting down',
    });
    return;
  }
  next();
});

app.get('/', async (req, res) => {
  await new Promise(r => setTimeout(r, 100));
  res.json({ status: 'ok' });
});

// Database pool
const dbPool = new Pool({
  host: process.env.DB_HOST,
  max: 20,
});

shutdown.registerCleanup('database', async () => {
  await dbPool.end();
});

// Redis client
const redis = new Redis(process.env.REDIS_URL);

shutdown.registerCleanup('redis', async () => {
  await redis.quit();
});

// Start server
const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

shutdown.trackConnections(server);

// Register signal handlers
process.on('SIGTERM', () => shutdown.shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown.shutdown('SIGINT'));
```

## Health Check Transitions

Update health checks to reflect shutdown state:

```javascript
class HealthCheckManager {
  constructor() {
    this.isReady = false;
    this.isLive = true;
    this.isTerminating = false;
  }

  setReady(ready) {
    this.isReady = ready;
  }

  setTerminating() {
    this.isTerminating = true;
    this.isReady = false;
  }

  // Kubernetes liveness probe - is the process running correctly?
  getLivenessStatus() {
    return {
      status: this.isLive ? 'ok' : 'error',
      httpStatus: this.isLive ? 200 : 500,
    };
  }

  // Kubernetes readiness probe - can we handle traffic?
  getReadinessStatus() {
    const ready = this.isReady && !this.isTerminating;
    return {
      status: ready ? 'ok' : 'not ready',
      httpStatus: ready ? 200 : 503,
      details: {
        ready: this.isReady,
        terminating: this.isTerminating,
      },
    };
  }
}

const health = new HealthCheckManager();

// Health endpoints
app.get('/health/live', (req, res) => {
  const status = health.getLivenessStatus();
  res.status(status.httpStatus).json(status);
});

app.get('/health/ready', (req, res) => {
  const status = health.getReadinessStatus();
  res.status(status.httpStatus).json(status);
});

// Startup sequence
async function startup() {
  try {
    // Connect to database
    await dbPool.connect();
    console.log('Database connected');

    // Connect to Redis
    await redis.ping();
    console.log('Redis connected');

    // Mark as ready
    health.setReady(true);
    console.log('Application ready');
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

// Shutdown sequence
async function shutdown(signal) {
  // Mark as not ready immediately
  health.setTerminating();

  // Wait for load balancer to stop sending traffic
  console.log('Waiting for load balancer drain...');
  await new Promise(r => setTimeout(r, 5000));

  // Continue with shutdown...
}

startup();
```

## Kubernetes Configuration

Configure Kubernetes to work with graceful shutdown:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodejs-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 45  # Must be > shutdown timeout
      containers:
        - name: app
          image: my-nodejs-app
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
          lifecycle:
            preStop:
              exec:
                # Give time for endpoints to be removed
                command: ["sleep", "5"]
```

## Handling Long-Running Operations

For operations that take longer than the shutdown timeout:

```javascript
class LongRunningTaskManager {
  constructor() {
    this.activeTasks = new Map();
    this.taskIdCounter = 0;
  }

  startTask(name) {
    const taskId = ++this.taskIdCounter;
    this.activeTasks.set(taskId, {
      name,
      startedAt: Date.now(),
    });

    return {
      taskId,
      complete: () => this.activeTasks.delete(taskId),
      checkpoint: (state) => {
        // Save checkpoint for resumption
        const task = this.activeTasks.get(taskId);
        if (task) {
          task.checkpoint = state;
        }
      },
    };
  }

  getActiveTasks() {
    return Array.from(this.activeTasks.entries()).map(([id, task]) => ({
      id,
      ...task,
      duration: Date.now() - task.startedAt,
    }));
  }

  async waitForTasks(timeout = 10000) {
    const startTime = Date.now();

    while (this.activeTasks.size > 0) {
      if (Date.now() - startTime > timeout) {
        const remaining = this.getActiveTasks();
        console.warn('Tasks still running at shutdown:', remaining);
        return remaining;
      }
      await new Promise(r => setTimeout(r, 100));
    }

    return [];
  }
}

const taskManager = new LongRunningTaskManager();

app.post('/reports/generate', async (req, res) => {
  const task = taskManager.startTask('generate-report');

  try {
    // Long-running operation with checkpoints
    const data = await fetchData();
    task.checkpoint({ stage: 'data-fetched' });

    const processed = await processData(data);
    task.checkpoint({ stage: 'processed' });

    const report = await generateReport(processed);
    task.complete();

    res.json(report);
  } catch (error) {
    task.complete();
    throw error;
  }
});

// During shutdown
shutdown.registerCleanup('long-running-tasks', async () => {
  const remaining = await taskManager.waitForTasks(10000);
  if (remaining.length > 0) {
    // Save checkpoints for resumption after restart
    await saveCheckpoints(remaining);
  }
});
```

## WebSocket Connection Draining

```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ server });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);

  ws.on('close', () => wsClients.delete(ws));
});

shutdown.registerCleanup('websocket', async () => {
  console.log(`Closing ${wsClients.size} WebSocket connections`);

  // Send close message to all clients
  for (const ws of wsClients) {
    ws.send(JSON.stringify({
      type: 'server-shutdown',
      message: 'Server is shutting down, please reconnect',
    }));

    // Close gracefully
    ws.close(1001, 'Server shutting down');
  }

  // Wait for connections to close
  const maxWait = 5000;
  const startTime = Date.now();

  while (wsClients.size > 0 && Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 100));
  }

  // Force close remaining
  for (const ws of wsClients) {
    ws.terminate();
  }
});
```

## Queue Worker Shutdown

```javascript
const { Worker } = require('bullmq');

const worker = new Worker('orders', async (job) => {
  // Process job
  await processOrder(job.data);
}, {
  connection: redis,
});

shutdown.registerCleanup('queue-worker', async () => {
  console.log('Closing queue worker...');

  // Stop accepting new jobs
  await worker.pause();

  // Wait for current job to complete
  const activeJobs = await worker.getJobs(['active']);
  if (activeJobs.length > 0) {
    console.log(`Waiting for ${activeJobs.length} active jobs to complete`);

    // Wait up to 30 seconds for jobs to complete
    await Promise.race([
      new Promise(resolve => {
        const check = setInterval(async () => {
          const active = await worker.getJobs(['active']);
          if (active.length === 0) {
            clearInterval(check);
            resolve();
          }
        }, 1000);
      }),
      new Promise(resolve => setTimeout(resolve, 30000)),
    ]);
  }

  await worker.close();
  console.log('Queue worker closed');
});
```

## Testing Graceful Shutdown

```javascript
// test/graceful-shutdown.test.js
const request = require('supertest');
const { spawn } = require('child_process');

describe('Graceful Shutdown', () => {
  let serverProcess;

  beforeEach((done) => {
    serverProcess = spawn('node', ['app.js']);

    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Server started')) {
        done();
      }
    });
  });

  afterEach(() => {
    if (serverProcess) {
      serverProcess.kill('SIGKILL');
    }
  });

  it('should complete in-flight requests on SIGTERM', async () => {
    // Start a slow request
    const requestPromise = request('http://localhost:3000')
      .get('/slow')
      .timeout(10000);

    // Wait a bit then send SIGTERM
    await new Promise(r => setTimeout(r, 100));
    serverProcess.kill('SIGTERM');

    // Request should complete successfully
    const response = await requestPromise;
    expect(response.status).toBe(200);
  });

  it('should reject new requests during shutdown', async () => {
    serverProcess.kill('SIGTERM');

    // Small delay for shutdown to start
    await new Promise(r => setTimeout(r, 100));

    const response = await request('http://localhost:3000')
      .get('/')
      .catch(err => err.response);

    expect(response.status).toBe(503);
  });
});
```

## Summary

| Phase | Action | Duration |
|-------|--------|----------|
| **Signal received** | Mark as terminating, fail readiness | 0s |
| **Drain wait** | Wait for LB to stop traffic | 5s |
| **Stop server** | Stop accepting new connections | Immediate |
| **Process requests** | Complete in-flight requests | ~10s |
| **Close resources** | DB, Redis, queues | ~5s |
| **Force exit** | Kill remaining connections | At timeout |

Graceful shutdown is essential for reliable deployments. By handling signals properly, draining connections, and coordinating with Kubernetes health checks, you can deploy updates without dropping requests or corrupting data.
