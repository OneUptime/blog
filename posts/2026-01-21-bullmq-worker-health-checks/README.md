# How to Implement Worker Health Checks for BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Health Checks, Kubernetes, Monitoring, Observability

Description: A comprehensive guide to implementing health checks for BullMQ workers, including liveness and readiness probes, Kubernetes integration, Redis connectivity checks, and monitoring worker health in production environments.

---

Health checks are essential for running BullMQ workers in production, especially in containerized environments like Kubernetes. They enable orchestrators to detect unhealthy workers and take corrective action. This guide covers implementing comprehensive health checks for BullMQ workers.

## Understanding Health Check Types

There are three main types of health checks:

1. **Liveness** - Is the process alive and not stuck?
2. **Readiness** - Can the worker accept and process jobs?
3. **Startup** - Has the worker completed initialization?

```typescript
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import express from 'express';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Health state tracking
interface HealthState {
  isAlive: boolean;
  isReady: boolean;
  isStarted: boolean;
  lastJobProcessed: number | null;
  errors: string[];
}

const healthState: HealthState = {
  isAlive: true,
  isReady: false,
  isStarted: false,
  lastJobProcessed: null,
  errors: [],
};

// Worker
const worker = new Worker('tasks', async (job) => {
  healthState.lastJobProcessed = Date.now();
  return { processed: true };
}, { connection });

worker.on('ready', () => {
  healthState.isStarted = true;
  healthState.isReady = true;
});

worker.on('error', (error) => {
  healthState.errors.push(error.message);
  if (healthState.errors.length > 10) {
    healthState.errors.shift();
  }
});
```

## Basic Health Check Server

Create a health check HTTP server:

```typescript
import express from 'express';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

class HealthCheckServer {
  private app: express.Application;
  private worker: Worker;
  private connection: Redis;
  private state = {
    isReady: false,
    isStarted: false,
    startTime: Date.now(),
    jobsProcessed: 0,
    lastError: null as string | null,
  };

  constructor(worker: Worker, connection: Redis, port: number = 8080) {
    this.worker = worker;
    this.connection = connection;
    this.app = express();

    this.setupEndpoints();
    this.setupWorkerEvents();

    this.app.listen(port, () => {
      console.log(`Health check server running on port ${port}`);
    });
  }

  private setupEndpoints() {
    // Liveness - is the process running?
    this.app.get('/health/live', (req, res) => {
      res.json({
        status: 'alive',
        uptime: Date.now() - this.state.startTime,
      });
    });

    // Readiness - can accept jobs?
    this.app.get('/health/ready', async (req, res) => {
      const checks = await this.runReadinessChecks();

      if (checks.healthy) {
        res.json({ status: 'ready', checks });
      } else {
        res.status(503).json({ status: 'not_ready', checks });
      }
    });

    // Startup - has initialization completed?
    this.app.get('/health/startup', (req, res) => {
      if (this.state.isStarted) {
        res.json({ status: 'started' });
      } else {
        res.status(503).json({ status: 'starting' });
      }
    });

    // Detailed health information
    this.app.get('/health', async (req, res) => {
      const details = await this.getDetailedHealth();
      const statusCode = details.healthy ? 200 : 503;
      res.status(statusCode).json(details);
    });
  }

  private setupWorkerEvents() {
    this.worker.on('ready', () => {
      this.state.isStarted = true;
      this.state.isReady = true;
    });

    this.worker.on('completed', () => {
      this.state.jobsProcessed++;
    });

    this.worker.on('failed', (job, error) => {
      this.state.lastError = error.message;
    });

    this.worker.on('error', (error) => {
      this.state.lastError = error.message;
    });
  }

  private async runReadinessChecks() {
    const checks = {
      redis: await this.checkRedis(),
      worker: this.checkWorker(),
      healthy: true,
    };

    checks.healthy = checks.redis.healthy && checks.worker.healthy;
    return checks;
  }

  private async checkRedis(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    try {
      await this.connection.ping();
      return {
        healthy: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private checkWorker(): { healthy: boolean; running: boolean; paused: boolean } {
    const running = this.worker.isRunning();
    const paused = this.worker.isPaused();

    return {
      healthy: running && !paused,
      running,
      paused,
    };
  }

  private async getDetailedHealth() {
    const redisCheck = await this.checkRedis();
    const workerCheck = this.checkWorker();

    return {
      healthy: redisCheck.healthy && workerCheck.healthy && this.state.isReady,
      uptime: Date.now() - this.state.startTime,
      worker: {
        ...workerCheck,
        concurrency: this.worker.concurrency,
        jobsProcessed: this.state.jobsProcessed,
      },
      redis: redisCheck,
      lastError: this.state.lastError,
    };
  }
}
```

## Comprehensive Health Checker

Implement detailed health checks:

```typescript
interface HealthCheckResult {
  name: string;
  healthy: boolean;
  message?: string;
  latency?: number;
  metadata?: Record<string, unknown>;
}

class ComprehensiveHealthChecker {
  private worker: Worker;
  private queue: Queue;
  private connection: Redis;
  private checksConfig: {
    maxRedisLatency: number;
    maxEventLoopLag: number;
    maxMemoryPercent: number;
    staleJobThreshold: number;
  };

  constructor(
    worker: Worker,
    queue: Queue,
    connection: Redis,
    config?: Partial<typeof ComprehensiveHealthChecker.prototype.checksConfig>
  ) {
    this.worker = worker;
    this.queue = queue;
    this.connection = connection;
    this.checksConfig = {
      maxRedisLatency: 100,      // 100ms
      maxEventLoopLag: 50,       // 50ms
      maxMemoryPercent: 90,      // 90%
      staleJobThreshold: 300000, // 5 minutes
      ...config,
    };
  }

  async runAllChecks(): Promise<{
    healthy: boolean;
    checks: HealthCheckResult[];
    summary: string;
  }> {
    const checks = await Promise.all([
      this.checkRedisConnection(),
      this.checkRedisLatency(),
      this.checkWorkerStatus(),
      this.checkMemoryUsage(),
      this.checkEventLoopLag(),
      this.checkQueueHealth(),
      this.checkStalledJobs(),
    ]);

    const healthy = checks.every(c => c.healthy);
    const failedChecks = checks.filter(c => !c.healthy);

    return {
      healthy,
      checks,
      summary: healthy
        ? 'All health checks passed'
        : `Failed checks: ${failedChecks.map(c => c.name).join(', ')}`,
    };
  }

  private async checkRedisConnection(): Promise<HealthCheckResult> {
    try {
      const result = await this.connection.ping();
      return {
        name: 'redis_connection',
        healthy: result === 'PONG',
        message: result === 'PONG' ? 'Connected' : 'Unexpected response',
      };
    } catch (error) {
      return {
        name: 'redis_connection',
        healthy: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkRedisLatency(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      await this.connection.ping();
      const latency = Date.now() - startTime;
      return {
        name: 'redis_latency',
        healthy: latency < this.checksConfig.maxRedisLatency,
        latency,
        message: latency < this.checksConfig.maxRedisLatency
          ? 'Latency acceptable'
          : `High latency: ${latency}ms`,
      };
    } catch (error) {
      return {
        name: 'redis_latency',
        healthy: false,
        message: error instanceof Error ? error.message : 'Ping failed',
      };
    }
  }

  private checkWorkerStatus(): Promise<HealthCheckResult> {
    const running = this.worker.isRunning();
    const paused = this.worker.isPaused();

    return Promise.resolve({
      name: 'worker_status',
      healthy: running && !paused,
      message: running
        ? paused
          ? 'Worker is paused'
          : 'Worker is running'
        : 'Worker is not running',
      metadata: { running, paused, concurrency: this.worker.concurrency },
    });
  }

  private checkMemoryUsage(): Promise<HealthCheckResult> {
    const used = process.memoryUsage();
    const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;

    return Promise.resolve({
      name: 'memory_usage',
      healthy: heapUsedPercent < this.checksConfig.maxMemoryPercent,
      message: `Heap usage: ${heapUsedPercent.toFixed(1)}%`,
      metadata: {
        heapUsed: used.heapUsed,
        heapTotal: used.heapTotal,
        rss: used.rss,
        external: used.external,
      },
    });
  }

  private checkEventLoopLag(): Promise<HealthCheckResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        resolve({
          name: 'event_loop_lag',
          healthy: lag < this.checksConfig.maxEventLoopLag,
          latency: lag,
          message: lag < this.checksConfig.maxEventLoopLag
            ? 'Event loop healthy'
            : `High event loop lag: ${lag}ms`,
        });
      });
    });
  }

  private async checkQueueHealth(): Promise<HealthCheckResult> {
    try {
      const counts = await this.queue.getJobCounts();
      const totalWaiting = counts.waiting + counts.delayed;

      return {
        name: 'queue_health',
        healthy: true,
        message: `Queue has ${totalWaiting} pending jobs`,
        metadata: counts,
      };
    } catch (error) {
      return {
        name: 'queue_health',
        healthy: false,
        message: error instanceof Error ? error.message : 'Failed to get queue stats',
      };
    }
  }

  private async checkStalledJobs(): Promise<HealthCheckResult> {
    try {
      const active = await this.queue.getActive();
      const now = Date.now();

      const stalledJobs = active.filter(job => {
        const processedOn = job.processedOn || job.timestamp;
        return now - processedOn > this.checksConfig.staleJobThreshold;
      });

      return {
        name: 'stalled_jobs',
        healthy: stalledJobs.length === 0,
        message: stalledJobs.length === 0
          ? 'No stalled jobs'
          : `${stalledJobs.length} potentially stalled jobs`,
        metadata: {
          activeJobs: active.length,
          stalledJobs: stalledJobs.length,
          stalledJobIds: stalledJobs.slice(0, 5).map(j => j.id),
        },
      };
    } catch (error) {
      return {
        name: 'stalled_jobs',
        healthy: false,
        message: error instanceof Error ? error.message : 'Failed to check stalled jobs',
      };
    }
  }
}
```

## Kubernetes Integration

Configure health checks for Kubernetes:

```typescript
// health-server.ts
import express from 'express';
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';

class KubernetesHealthServer {
  private app: express.Application;
  private healthChecker: ComprehensiveHealthChecker;
  private isShuttingDown = false;

  constructor(
    worker: Worker,
    queue: Queue,
    connection: Redis,
    port: number = 8080
  ) {
    this.app = express();
    this.healthChecker = new ComprehensiveHealthChecker(worker, queue, connection);

    this.setupEndpoints();
    this.app.listen(port);
  }

  private setupEndpoints() {
    // Liveness probe - check if process is alive
    this.app.get('/healthz', async (req, res) => {
      if (this.isShuttingDown) {
        return res.status(503).json({ status: 'shutting_down' });
      }

      // Simple liveness check
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Readiness probe - check if ready to accept traffic
    this.app.get('/ready', async (req, res) => {
      if (this.isShuttingDown) {
        return res.status(503).json({ status: 'shutting_down' });
      }

      const health = await this.healthChecker.runAllChecks();

      if (health.healthy) {
        res.json({ status: 'ready', checks: health.checks });
      } else {
        res.status(503).json({
          status: 'not_ready',
          summary: health.summary,
          checks: health.checks,
        });
      }
    });

    // Startup probe - check if app has started
    this.app.get('/startup', (req, res) => {
      // Return 200 once the server is up
      res.json({ status: 'started' });
    });

    // Detailed health for debugging
    this.app.get('/health/detailed', async (req, res) => {
      const health = await this.healthChecker.runAllChecks();
      res.json(health);
    });
  }

  setShuttingDown() {
    this.isShuttingDown = true;
  }
}

// Kubernetes deployment yaml reference:
/*
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /startup
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 30
*/
```

## Self-Healing Worker

Implement auto-recovery based on health checks:

```typescript
class SelfHealingWorker {
  private worker: Worker | null = null;
  private connection: Redis;
  private queueName: string;
  private processor: (job: Job) => Promise<any>;
  private healthCheckInterval?: NodeJS.Timer;
  private restartCount = 0;
  private maxRestarts = 5;
  private restartCooldown = 60000;
  private lastRestartTime = 0;

  constructor(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    connection: Redis
  ) {
    this.queueName = queueName;
    this.processor = processor;
    this.connection = connection;
  }

  async start() {
    await this.createWorker();
    this.startHealthMonitoring();
  }

  private async createWorker() {
    this.worker = new Worker(this.queueName, this.processor, {
      connection: this.connection,
      concurrency: 5,
    });

    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
      this.handleWorkerError(error);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed:`, error.message);
    });

    console.log('Worker created');
  }

  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.checkHealth();

      if (!isHealthy) {
        console.warn('Health check failed, attempting recovery...');
        await this.attemptRecovery();
      }
    }, 30000); // Check every 30 seconds
  }

  private async checkHealth(): Promise<boolean> {
    try {
      // Check Redis connection
      const pong = await this.connection.ping();
      if (pong !== 'PONG') return false;

      // Check worker is running
      if (!this.worker?.isRunning()) return false;

      // Check event loop
      const lagPromise = new Promise<number>((resolve) => {
        const start = Date.now();
        setImmediate(() => resolve(Date.now() - start));
      });
      const lag = await lagPromise;
      if (lag > 100) return false;

      return true;
    } catch (error) {
      console.error('Health check error:', error);
      return false;
    }
  }

  private async handleWorkerError(error: Error) {
    // Check for fatal errors that require restart
    const fatalErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
    const isFatal = fatalErrors.some(e => error.message.includes(e));

    if (isFatal) {
      await this.attemptRecovery();
    }
  }

  private async attemptRecovery() {
    const now = Date.now();

    // Check cooldown
    if (now - this.lastRestartTime < this.restartCooldown) {
      console.log('Recovery in cooldown period, skipping');
      return;
    }

    // Check restart limit
    if (this.restartCount >= this.maxRestarts) {
      console.error('Max restart attempts reached, giving up');
      process.exit(1);
    }

    this.restartCount++;
    this.lastRestartTime = now;

    console.log(`Attempting recovery (attempt ${this.restartCount}/${this.maxRestarts})`);

    try {
      // Close existing worker
      if (this.worker) {
        await this.worker.close();
        this.worker = null;
      }

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create new worker
      await this.createWorker();

      console.log('Recovery successful');
    } catch (error) {
      console.error('Recovery failed:', error);
    }
  }

  async stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.worker) {
      await this.worker.close();
    }
  }
}
```

## Metrics Export for Monitoring

Export health metrics for Prometheus:

```typescript
import { Registry, Gauge, Counter, Histogram } from 'prom-client';

class HealthMetricsExporter {
  private registry: Registry;
  private worker: Worker;
  private queue: Queue;

  // Gauges
  private workerRunning: Gauge;
  private activeJobs: Gauge;
  private waitingJobs: Gauge;
  private memoryUsage: Gauge;
  private eventLoopLag: Gauge;

  // Counters
  private healthChecksPassed: Counter;
  private healthChecksFailed: Counter;

  // Histogram
  private redisLatency: Histogram;

  constructor(worker: Worker, queue: Queue, connection: Redis) {
    this.registry = new Registry();
    this.worker = worker;
    this.queue = queue;

    this.setupMetrics();
    this.startCollecting();
  }

  private setupMetrics() {
    this.workerRunning = new Gauge({
      name: 'bullmq_worker_running',
      help: 'Whether the worker is running (1) or not (0)',
      registers: [this.registry],
    });

    this.activeJobs = new Gauge({
      name: 'bullmq_active_jobs',
      help: 'Number of currently active jobs',
      registers: [this.registry],
    });

    this.waitingJobs = new Gauge({
      name: 'bullmq_waiting_jobs',
      help: 'Number of waiting jobs',
      registers: [this.registry],
    });

    this.memoryUsage = new Gauge({
      name: 'bullmq_worker_memory_bytes',
      help: 'Worker memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.eventLoopLag = new Gauge({
      name: 'bullmq_event_loop_lag_ms',
      help: 'Event loop lag in milliseconds',
      registers: [this.registry],
    });

    this.healthChecksPassed = new Counter({
      name: 'bullmq_health_checks_passed_total',
      help: 'Total number of passed health checks',
      registers: [this.registry],
    });

    this.healthChecksFailed = new Counter({
      name: 'bullmq_health_checks_failed_total',
      help: 'Total number of failed health checks',
      registers: [this.registry],
    });

    this.redisLatency = new Histogram({
      name: 'bullmq_redis_latency_ms',
      help: 'Redis command latency in milliseconds',
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
      registers: [this.registry],
    });
  }

  private startCollecting() {
    setInterval(async () => {
      await this.collectMetrics();
    }, 5000);
  }

  private async collectMetrics() {
    // Worker status
    this.workerRunning.set(this.worker.isRunning() ? 1 : 0);

    // Queue counts
    const counts = await this.queue.getJobCounts();
    this.activeJobs.set(counts.active);
    this.waitingJobs.set(counts.waiting + counts.delayed);

    // Memory
    const mem = process.memoryUsage();
    this.memoryUsage.labels('heap_used').set(mem.heapUsed);
    this.memoryUsage.labels('heap_total').set(mem.heapTotal);
    this.memoryUsage.labels('rss').set(mem.rss);

    // Event loop lag
    const lag = await this.measureEventLoopLag();
    this.eventLoopLag.set(lag);
  }

  private measureEventLoopLag(): Promise<number> {
    return new Promise(resolve => {
      const start = Date.now();
      setImmediate(() => resolve(Date.now() - start));
    });
  }

  recordHealthCheck(passed: boolean) {
    if (passed) {
      this.healthChecksPassed.inc();
    } else {
      this.healthChecksFailed.inc();
    }
  }

  recordRedisLatency(latency: number) {
    this.redisLatency.observe(latency);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

## Best Practices

1. **Implement all three probe types** - Liveness, readiness, and startup serve different purposes.

2. **Keep liveness checks simple** - Liveness should just verify the process is running.

3. **Make readiness checks comprehensive** - Check all dependencies.

4. **Set appropriate timeouts** - Health checks should complete quickly.

5. **Include Redis connectivity** - Always verify Redis connection.

6. **Monitor event loop lag** - High lag indicates processing issues.

7. **Export metrics** - Enable monitoring and alerting.

8. **Handle graceful shutdown** - Return 503 during shutdown.

9. **Implement self-healing** - Automatically recover from failures.

10. **Log health check results** - Help with debugging issues.

## Conclusion

Health checks are critical for running BullMQ workers in production. By implementing comprehensive liveness, readiness, and startup probes, you enable orchestrators to manage worker lifecycle effectively. Combined with metrics export and self-healing capabilities, your workers can maintain high availability and automatically recover from transient issues.
