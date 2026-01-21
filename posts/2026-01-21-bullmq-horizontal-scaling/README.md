# How to Scale BullMQ Workers Horizontally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Horizontal Scaling, Load Balancing, Distributed Systems, Performance

Description: A comprehensive guide to scaling BullMQ workers horizontally across multiple processes and nodes, including multi-process workers, distributed deployment patterns, and strategies for handling high-throughput job processing.

---

Horizontal scaling allows you to increase job processing capacity by adding more worker instances. BullMQ is designed for distributed processing, making it straightforward to scale across multiple processes and machines. This guide covers patterns and best practices for scaling your BullMQ workers.

## Understanding Horizontal Scaling in BullMQ

BullMQ uses Redis as a central coordination point, allowing multiple workers to process jobs from the same queue safely. Each worker instance can run on different processes, servers, or containers.

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import cluster from 'cluster';
import os from 'os';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Basic worker that can be scaled
const worker = new Worker('tasks', async (job) => {
  console.log(`Worker ${process.pid} processing job ${job.id}`);
  return { processed: true, worker: process.pid };
}, {
  connection,
  concurrency: 5,
});
```

## Multi-Process Scaling with Node.js Cluster

Use Node.js cluster module to utilize all CPU cores:

```typescript
// cluster-worker.ts
import cluster from 'cluster';
import os from 'os';
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';

const numCPUs = os.cpus().length;
const WORKERS_PER_CPU = 1;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} starting ${numCPUs * WORKERS_PER_CPU} workers`);

  // Fork workers
  for (let i = 0; i < numCPUs * WORKERS_PER_CPU; i++) {
    cluster.fork();
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

  // Handle messages from workers
  cluster.on('message', (worker, message) => {
    console.log(`Message from worker ${worker.id}:`, message);
  });

} else {
  // Worker process
  const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
  });

  const worker = new Worker('tasks', async (job) => {
    console.log(`Worker ${process.pid} processing job ${job.id}`);
    // Process job
    return { processed: true, workerId: process.pid };
  }, {
    connection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    process.send?.({ type: 'completed', jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    process.send?.({ type: 'failed', jobId: job?.id, error: error.message });
  });

  console.log(`Worker ${process.pid} started`);
}
```

## Worker Pool with Dynamic Scaling

Create a worker pool that can scale up and down:

```typescript
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { fork, ChildProcess } from 'child_process';

interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  queueName: string;
  concurrencyPerWorker: number;
}

class WorkerPool {
  private workers: Map<number, ChildProcess> = new Map();
  private config: WorkerPoolConfig;
  private nextWorkerId = 0;

  constructor(config: WorkerPoolConfig) {
    this.config = config;
  }

  async start() {
    // Start minimum workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.addWorker();
    }
    console.log(`Started ${this.config.minWorkers} workers`);
  }

  async addWorker(): Promise<number> {
    if (this.workers.size >= this.config.maxWorkers) {
      throw new Error('Maximum workers reached');
    }

    const workerId = this.nextWorkerId++;
    const worker = fork('./worker-process.js', [], {
      env: {
        ...process.env,
        WORKER_ID: workerId.toString(),
        QUEUE_NAME: this.config.queueName,
        CONCURRENCY: this.config.concurrencyPerWorker.toString(),
      },
    });

    worker.on('exit', (code) => {
      console.log(`Worker ${workerId} exited with code ${code}`);
      this.workers.delete(workerId);

      // Restart if unexpected exit and below minimum
      if (code !== 0 && this.workers.size < this.config.minWorkers) {
        console.log('Restarting worker to maintain minimum');
        this.addWorker();
      }
    });

    worker.on('message', (message: any) => {
      this.handleWorkerMessage(workerId, message);
    });

    this.workers.set(workerId, worker);
    return workerId;
  }

  async removeWorker(): Promise<boolean> {
    if (this.workers.size <= this.config.minWorkers) {
      return false;
    }

    const [workerId, worker] = [...this.workers.entries()][this.workers.size - 1];
    worker.send({ type: 'shutdown' });

    return new Promise((resolve) => {
      worker.on('exit', () => {
        this.workers.delete(workerId);
        resolve(true);
      });

      // Force kill after timeout
      setTimeout(() => {
        if (this.workers.has(workerId)) {
          worker.kill('SIGKILL');
        }
      }, 30000);
    });
  }

  async scaleToSize(targetSize: number) {
    targetSize = Math.max(this.config.minWorkers, Math.min(targetSize, this.config.maxWorkers));

    while (this.workers.size < targetSize) {
      await this.addWorker();
    }

    while (this.workers.size > targetSize) {
      await this.removeWorker();
    }
  }

  private handleWorkerMessage(workerId: number, message: any) {
    console.log(`Worker ${workerId}:`, message);
  }

  getWorkerCount(): number {
    return this.workers.size;
  }

  async shutdown() {
    console.log('Shutting down worker pool...');
    const shutdownPromises = [...this.workers.entries()].map(([id, worker]) => {
      return new Promise<void>((resolve) => {
        worker.send({ type: 'shutdown' });
        worker.on('exit', () => resolve());
        setTimeout(() => {
          worker.kill('SIGKILL');
          resolve();
        }, 30000);
      });
    });

    await Promise.all(shutdownPromises);
    console.log('Worker pool shut down');
  }
}

// worker-process.js
const { Worker } = require('bullmq');
const { Redis } = require('ioredis');

const workerId = process.env.WORKER_ID;
const queueName = process.env.QUEUE_NAME;
const concurrency = parseInt(process.env.CONCURRENCY || '5');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

const worker = new Worker(queueName, async (job) => {
  console.log(`Worker ${workerId} processing job ${job.id}`);
  return { workerId, jobId: job.id };
}, { connection, concurrency });

process.on('message', async (message) => {
  if (message.type === 'shutdown') {
    await worker.close();
    process.exit(0);
  }
});
```

## Auto-Scaling Based on Queue Depth

Automatically scale workers based on queue size:

```typescript
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

interface AutoScalerConfig {
  queueName: string;
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number;   // Queue depth to trigger scale up
  scaleDownThreshold: number; // Queue depth to trigger scale down
  checkIntervalMs: number;
  cooldownMs: number;
}

class QueueAutoScaler {
  private queue: Queue;
  private workerPool: WorkerPool;
  private config: AutoScalerConfig;
  private lastScaleTime: number = 0;

  constructor(connection: Redis, config: AutoScalerConfig) {
    this.config = config;
    this.queue = new Queue(config.queueName, { connection });
    this.workerPool = new WorkerPool({
      minWorkers: config.minWorkers,
      maxWorkers: config.maxWorkers,
      queueName: config.queueName,
      concurrencyPerWorker: 5,
    });
  }

  async start() {
    await this.workerPool.start();
    this.startMonitoring();
  }

  private startMonitoring() {
    setInterval(async () => {
      await this.checkAndScale();
    }, this.config.checkIntervalMs);
  }

  private async checkAndScale() {
    const now = Date.now();

    // Check cooldown
    if (now - this.lastScaleTime < this.config.cooldownMs) {
      return;
    }

    const counts = await this.queue.getJobCounts();
    const waitingCount = counts.waiting + counts.delayed;
    const currentWorkers = this.workerPool.getWorkerCount();

    console.log(`Queue depth: ${waitingCount}, Workers: ${currentWorkers}`);

    if (waitingCount > this.config.scaleUpThreshold && currentWorkers < this.config.maxWorkers) {
      // Scale up
      const newSize = Math.min(currentWorkers + 1, this.config.maxWorkers);
      console.log(`Scaling up to ${newSize} workers`);
      await this.workerPool.scaleToSize(newSize);
      this.lastScaleTime = now;
    } else if (waitingCount < this.config.scaleDownThreshold && currentWorkers > this.config.minWorkers) {
      // Scale down
      const newSize = Math.max(currentWorkers - 1, this.config.minWorkers);
      console.log(`Scaling down to ${newSize} workers`);
      await this.workerPool.scaleToSize(newSize);
      this.lastScaleTime = now;
    }
  }
}

// Usage
const autoScaler = new QueueAutoScaler(connection, {
  queueName: 'tasks',
  minWorkers: 2,
  maxWorkers: 10,
  scaleUpThreshold: 1000,   // Scale up when > 1000 jobs waiting
  scaleDownThreshold: 100,  // Scale down when < 100 jobs waiting
  checkIntervalMs: 10000,   // Check every 10 seconds
  cooldownMs: 60000,        // Wait 1 minute between scaling actions
});

autoScaler.start();
```

## Distributed Worker Deployment

Deploy workers across multiple machines:

```typescript
// config/worker-config.ts
export interface WorkerNodeConfig {
  nodeId: string;
  queues: {
    name: string;
    concurrency: number;
    priority?: number;
  }[];
  redisConfig: {
    host: string;
    port: number;
    password?: string;
  };
}

// Get config from environment or config service
export function getWorkerConfig(): WorkerNodeConfig {
  return {
    nodeId: process.env.NODE_ID || `worker-${process.pid}`,
    queues: JSON.parse(process.env.QUEUE_CONFIG || '[]'),
    redisConfig: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
  };
}

// distributed-worker.ts
import { Worker, Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { getWorkerConfig, WorkerNodeConfig } from './config/worker-config';

class DistributedWorkerNode {
  private workers: Map<string, Worker> = new Map();
  private config: WorkerNodeConfig;
  private connection: Redis;
  private heartbeatInterval?: NodeJS.Timer;

  constructor() {
    this.config = getWorkerConfig();
    this.connection = new Redis({
      ...this.config.redisConfig,
      maxRetriesPerRequest: null,
    });
  }

  async start() {
    console.log(`Starting worker node: ${this.config.nodeId}`);

    // Create workers for each configured queue
    for (const queueConfig of this.config.queues) {
      const worker = new Worker(queueConfig.name, async (job) => {
        return await this.processJob(queueConfig.name, job);
      }, {
        connection: this.connection,
        concurrency: queueConfig.concurrency,
      });

      this.setupWorkerEvents(worker, queueConfig.name);
      this.workers.set(queueConfig.name, worker);

      console.log(`Started worker for queue ${queueConfig.name} with concurrency ${queueConfig.concurrency}`);
    }

    // Start heartbeat
    this.startHeartbeat();

    // Register node
    await this.registerNode();
  }

  private async processJob(queueName: string, job: Job) {
    const startTime = Date.now();
    console.log(`[${this.config.nodeId}] Processing ${queueName}:${job.id}`);

    // Your processing logic here
    const result = await performTask(job.data);

    console.log(`[${this.config.nodeId}] Completed ${queueName}:${job.id} in ${Date.now() - startTime}ms`);
    return result;
  }

  private setupWorkerEvents(worker: Worker, queueName: string) {
    worker.on('completed', (job) => {
      this.reportMetric('completed', queueName, job.id!);
    });

    worker.on('failed', (job, error) => {
      this.reportMetric('failed', queueName, job?.id || 'unknown', error.message);
    });

    worker.on('error', (error) => {
      console.error(`[${this.config.nodeId}] Worker error on ${queueName}:`, error);
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
    }, 5000);
  }

  private async sendHeartbeat() {
    const status = {
      nodeId: this.config.nodeId,
      timestamp: Date.now(),
      queues: Object.fromEntries(
        await Promise.all(
          [...this.workers.entries()].map(async ([name, worker]) => {
            return [name, {
              running: await worker.isRunning(),
              // Add more metrics as needed
            }];
          })
        )
      ),
    };

    await this.connection.hset(
      'worker:heartbeats',
      this.config.nodeId,
      JSON.stringify(status)
    );
    await this.connection.expire('worker:heartbeats', 30);
  }

  private async registerNode() {
    await this.connection.sadd('worker:nodes', this.config.nodeId);
  }

  private async unregisterNode() {
    await this.connection.srem('worker:nodes', this.config.nodeId);
    await this.connection.hdel('worker:heartbeats', this.config.nodeId);
  }

  private reportMetric(type: string, queue: string, jobId: string, error?: string) {
    // Send to monitoring system
    console.log(`[METRIC] ${type} ${queue}:${jobId} ${error || ''}`);
  }

  async shutdown() {
    console.log(`[${this.config.nodeId}] Shutting down...`);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    await Promise.all(
      [...this.workers.values()].map(worker => worker.close())
    );

    await this.unregisterNode();
    await this.connection.quit();

    console.log(`[${this.config.nodeId}] Shutdown complete`);
  }
}

// Start the worker node
const node = new DistributedWorkerNode();
node.start();

process.on('SIGTERM', () => node.shutdown());
process.on('SIGINT', () => node.shutdown());
```

## Load Balancing Strategies

Implement different load balancing approaches:

```typescript
// Round-robin queue assignment
class RoundRobinAssigner {
  private queues: string[];
  private currentIndex = 0;

  constructor(queues: string[]) {
    this.queues = queues;
  }

  getNextQueue(): string {
    const queue = this.queues[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.queues.length;
    return queue;
  }
}

// Weighted queue assignment
class WeightedQueueAssigner {
  private queues: { name: string; weight: number }[];
  private totalWeight: number;

  constructor(queues: { name: string; weight: number }[]) {
    this.queues = queues;
    this.totalWeight = queues.reduce((sum, q) => sum + q.weight, 0);
  }

  getNextQueue(): string {
    let random = Math.random() * this.totalWeight;
    for (const queue of this.queues) {
      random -= queue.weight;
      if (random <= 0) {
        return queue.name;
      }
    }
    return this.queues[this.queues.length - 1].name;
  }
}

// Queue depth-based assignment
class DepthBasedAssigner {
  private queues: Map<string, Queue>;

  constructor(queueNames: string[], connection: Redis) {
    this.queues = new Map(
      queueNames.map(name => [name, new Queue(name, { connection })])
    );
  }

  async getNextQueue(): Promise<string> {
    const depths = await Promise.all(
      [...this.queues.entries()].map(async ([name, queue]) => {
        const counts = await queue.getJobCounts();
        return { name, depth: counts.waiting };
      })
    );

    // Return queue with lowest depth
    depths.sort((a, b) => a.depth - b.depth);
    return depths[0].name;
  }
}
```

## Monitoring Scaled Workers

Track metrics across scaled workers:

```typescript
import { Redis } from 'ioredis';

interface WorkerMetrics {
  nodeId: string;
  processedCount: number;
  failedCount: number;
  avgProcessingTime: number;
  lastSeen: number;
}

class ScaledWorkerMonitor {
  private redis: Redis;
  private metricsKey = 'worker:metrics';

  constructor(connection: Redis) {
    this.redis = connection;
  }

  async getAllWorkerMetrics(): Promise<WorkerMetrics[]> {
    const heartbeats = await this.redis.hgetall('worker:heartbeats');
    const metrics: WorkerMetrics[] = [];

    for (const [nodeId, data] of Object.entries(heartbeats)) {
      const parsed = JSON.parse(data);
      metrics.push({
        nodeId,
        ...parsed,
        lastSeen: parsed.timestamp,
      });
    }

    return metrics;
  }

  async getActiveWorkerCount(): Promise<number> {
    const metrics = await this.getAllWorkerMetrics();
    const now = Date.now();
    const activeThreshold = 30000; // 30 seconds

    return metrics.filter(m => now - m.lastSeen < activeThreshold).length;
  }

  async getTotalThroughput(): Promise<number> {
    const metrics = await this.getAllWorkerMetrics();
    return metrics.reduce((sum, m) => sum + (m.processedCount || 0), 0);
  }

  async getHealthStatus(): Promise<{ healthy: number; unhealthy: number; total: number }> {
    const metrics = await this.getAllWorkerMetrics();
    const now = Date.now();
    const healthyThreshold = 15000;

    const healthy = metrics.filter(m => now - m.lastSeen < healthyThreshold).length;

    return {
      healthy,
      unhealthy: metrics.length - healthy,
      total: metrics.length,
    };
  }
}
```

## Best Practices

1. **Use shared Redis connection pool** - Configure Redis for multiple concurrent connections.

2. **Implement graceful shutdown** - Allow in-flight jobs to complete during scaling down.

3. **Monitor worker health** - Use heartbeats to detect failed workers.

4. **Set appropriate concurrency** - Balance between parallelism and resource usage.

5. **Use auto-scaling** - Scale based on queue depth and processing time.

6. **Implement idempotent jobs** - Handle potential duplicate processing during scaling.

7. **Distribute across availability zones** - Spread workers for high availability.

8. **Use connection pooling** - Optimize Redis connections across workers.

9. **Monitor and alert** - Track scaling events and worker health.

10. **Test at scale** - Verify behavior with many workers processing concurrently.

## Conclusion

Horizontal scaling with BullMQ allows you to handle increasing workloads by adding more worker instances. Whether using Node.js cluster, container orchestration, or distributed deployments, the key is proper coordination through Redis and appropriate monitoring. Implement auto-scaling based on queue metrics to automatically adjust capacity to demand.
