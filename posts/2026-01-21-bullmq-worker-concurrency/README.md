# How to Configure BullMQ Worker Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Concurrency, Performance, Worker Configuration, Parallel Processing

Description: A comprehensive guide to configuring BullMQ worker concurrency, including parallel job processing, resource management, dynamic concurrency adjustment, and strategies for optimizing throughput while maintaining system stability.

---

Worker concurrency determines how many jobs a single worker can process simultaneously. Proper concurrency configuration is crucial for maximizing throughput while avoiding resource exhaustion. This guide covers how to configure and optimize BullMQ worker concurrency for different workload types.

## Understanding Concurrency in BullMQ

Concurrency in BullMQ specifies the maximum number of jobs a worker will process in parallel:

```typescript
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Worker with concurrency of 5
const worker = new Worker('tasks', async (job) => {
  console.log(`Processing job ${job.id}`);
  await processJob(job.data);
  return { success: true };
}, {
  connection,
  concurrency: 5, // Process up to 5 jobs simultaneously
});
```

## Choosing the Right Concurrency

### For CPU-Bound Jobs

CPU-intensive tasks should have lower concurrency:

```typescript
// Image processing, data transformation, calculations
const cpuWorker = new Worker('cpu-intensive', async (job) => {
  // Heavy computation
  return await processImage(job.data);
}, {
  connection,
  concurrency: 2, // Low concurrency - limited by CPU cores
});
```

### For I/O-Bound Jobs

I/O-heavy tasks can handle higher concurrency:

```typescript
// API calls, database queries, file operations
const ioWorker = new Worker('io-intensive', async (job) => {
  // Waiting for external service
  return await callExternalAPI(job.data);
}, {
  connection,
  concurrency: 20, // Higher concurrency - mostly waiting
});
```

### For Mixed Workloads

Balance based on the bottleneck:

```typescript
// Mix of computation and I/O
const mixedWorker = new Worker('mixed-tasks', async (job) => {
  const data = await fetchData(job.data.url);    // I/O
  const result = transformData(data);             // CPU
  await saveResult(result);                       // I/O
  return result;
}, {
  connection,
  concurrency: 5, // Moderate concurrency
});
```

## Concurrency Calculation Guidelines

```typescript
interface ConcurrencyConfig {
  workloadType: 'cpu' | 'io' | 'mixed';
  avgJobDuration: number;      // milliseconds
  targetThroughput: number;    // jobs per second
  availableMemory: number;     // MB
  memoryPerJob: number;        // MB
}

function calculateOptimalConcurrency(config: ConcurrencyConfig): number {
  const { workloadType, avgJobDuration, targetThroughput, availableMemory, memoryPerJob } = config;

  // Based on throughput requirement
  const throughputBasedConcurrency = Math.ceil(targetThroughput * (avgJobDuration / 1000));

  // Based on memory
  const memoryBasedConcurrency = Math.floor(availableMemory / memoryPerJob);

  // Based on workload type
  const typeMultiplier = {
    cpu: 1,    // 1x CPU cores
    io: 10,    // 10x for I/O bound
    mixed: 3,  // 3x for mixed
  };

  const cpuCores = require('os').cpus().length;
  const typeBasedConcurrency = cpuCores * typeMultiplier[workloadType];

  // Take the minimum to avoid overload
  const optimal = Math.min(
    throughputBasedConcurrency,
    memoryBasedConcurrency,
    typeBasedConcurrency
  );

  console.log(`Concurrency calculation:
    Throughput-based: ${throughputBasedConcurrency}
    Memory-based: ${memoryBasedConcurrency}
    Type-based: ${typeBasedConcurrency}
    Optimal: ${optimal}`);

  return Math.max(1, optimal);
}

// Example usage
const concurrency = calculateOptimalConcurrency({
  workloadType: 'io',
  avgJobDuration: 500,      // 500ms average
  targetThroughput: 100,    // 100 jobs/second
  availableMemory: 1024,    // 1GB
  memoryPerJob: 50,         // 50MB per job
});
```

## Dynamic Concurrency Adjustment

Adjust concurrency based on system load:

```typescript
import os from 'os';

class AdaptiveConcurrencyWorker {
  private worker: Worker;
  private baseConcurrency: number;
  private currentConcurrency: number;
  private monitorInterval?: NodeJS.Timer;

  constructor(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    connection: Redis,
    baseConcurrency: number = 10
  ) {
    this.baseConcurrency = baseConcurrency;
    this.currentConcurrency = baseConcurrency;

    this.worker = new Worker(queueName, processor, {
      connection,
      concurrency: baseConcurrency,
    });

    this.startMonitoring();
  }

  private startMonitoring() {
    this.monitorInterval = setInterval(async () => {
      const newConcurrency = await this.calculateNewConcurrency();

      if (newConcurrency !== this.currentConcurrency) {
        console.log(`Adjusting concurrency: ${this.currentConcurrency} -> ${newConcurrency}`);
        this.worker.concurrency = newConcurrency;
        this.currentConcurrency = newConcurrency;
      }
    }, 10000); // Check every 10 seconds
  }

  private async calculateNewConcurrency(): Promise<number> {
    // Get system metrics
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const eventLoopLag = await this.getEventLoopLag();

    console.log(`Metrics - CPU: ${cpuUsage}%, Memory: ${memoryUsage}%, EventLoop: ${eventLoopLag}ms`);

    let targetConcurrency = this.baseConcurrency;

    // Reduce concurrency if CPU is high
    if (cpuUsage > 80) {
      targetConcurrency = Math.floor(this.currentConcurrency * 0.8);
    } else if (cpuUsage < 50) {
      targetConcurrency = Math.ceil(this.currentConcurrency * 1.1);
    }

    // Reduce if memory is high
    if (memoryUsage > 85) {
      targetConcurrency = Math.floor(targetConcurrency * 0.7);
    }

    // Reduce if event loop is lagging
    if (eventLoopLag > 100) {
      targetConcurrency = Math.floor(targetConcurrency * 0.8);
    }

    // Clamp to reasonable bounds
    const minConcurrency = 1;
    const maxConcurrency = this.baseConcurrency * 2;

    return Math.max(minConcurrency, Math.min(targetConcurrency, maxConcurrency));
  }

  private getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime.bigint();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime.bigint();

        const elapsedTime = Number(endTime - startTime) / 1000; // microseconds
        const totalCPU = endUsage.user + endUsage.system;
        const cpuPercent = (totalCPU / elapsedTime) * 100;

        resolve(Math.min(100, cpuPercent));
      }, 100);
    });
  }

  private getMemoryUsage(): number {
    const used = process.memoryUsage();
    const total = os.totalmem();
    return (used.heapUsed / total) * 100;
  }

  private getEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        resolve(Date.now() - start);
      });
    });
  }

  async close() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    await this.worker.close();
  }
}
```

## Per-Queue Concurrency Configuration

Configure different concurrency for different job types:

```typescript
interface QueueConcurrencyConfig {
  name: string;
  concurrency: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
}

class MultiConcurrencyWorkerManager {
  private workers: Map<string, Worker> = new Map();

  constructor(
    private connection: Redis,
    configs: QueueConcurrencyConfig[]
  ) {
    for (const config of configs) {
      this.createWorker(config);
    }
  }

  private createWorker(config: QueueConcurrencyConfig) {
    const worker = new Worker(config.name, async (job) => {
      return await this.processJob(config.name, job);
    }, {
      connection: this.connection,
      concurrency: config.concurrency,
      limiter: config.rateLimit,
    });

    worker.on('completed', (job) => {
      console.log(`[${config.name}] Job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      console.error(`[${config.name}] Job ${job?.id} failed:`, error.message);
    });

    this.workers.set(config.name, worker);
    console.log(`Created worker for ${config.name} with concurrency ${config.concurrency}`);
  }

  private async processJob(queueName: string, job: Job) {
    // Dispatch to appropriate processor
    return { processed: true, queue: queueName };
  }

  async close() {
    await Promise.all([...this.workers.values()].map(w => w.close()));
  }
}

// Usage
const manager = new MultiConcurrencyWorkerManager(connection, [
  { name: 'email', concurrency: 20 },           // High concurrency for I/O
  { name: 'image-processing', concurrency: 2 }, // Low for CPU-intensive
  { name: 'api-calls', concurrency: 10, rateLimit: { max: 50, duration: 1000 } },
  { name: 'reports', concurrency: 3 },          // Moderate for mixed
]);
```

## Memory-Aware Concurrency

Adjust concurrency based on memory consumption:

```typescript
class MemoryAwareWorker {
  private worker: Worker;
  private maxMemoryMB: number;
  private memoryPerJobMB: number;
  private activeJobs = 0;

  constructor(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    connection: Redis,
    options: {
      maxMemoryMB: number;
      memoryPerJobMB: number;
      maxConcurrency: number;
    }
  ) {
    this.maxMemoryMB = options.maxMemoryMB;
    this.memoryPerJobMB = options.memoryPerJobMB;

    this.worker = new Worker(queueName, async (job) => {
      return await this.wrappedProcessor(job, processor);
    }, {
      connection,
      concurrency: options.maxConcurrency,
    });
  }

  private async wrappedProcessor(job: Job, processor: (job: Job) => Promise<any>) {
    // Wait if memory is constrained
    while (!this.canAcceptJob()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.activeJobs++;
    try {
      return await processor(job);
    } finally {
      this.activeJobs--;
    }
  }

  private canAcceptJob(): boolean {
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const projectedMemory = currentMemory + this.memoryPerJobMB;

    if (projectedMemory > this.maxMemoryMB) {
      console.log(`Memory limit reached: ${currentMemory.toFixed(0)}MB / ${this.maxMemoryMB}MB`);
      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
      }
      return false;
    }

    return true;
  }

  async close() {
    await this.worker.close();
  }
}

// Usage (run with --expose-gc flag for gc())
const memoryWorker = new MemoryAwareWorker('heavy-jobs', async (job) => {
  // Process job that uses significant memory
  const largeData = await loadLargeDataset(job.data);
  return processData(largeData);
}, connection, {
  maxMemoryMB: 512,      // Max 512MB heap
  memoryPerJobMB: 100,   // Each job uses ~100MB
  maxConcurrency: 10,    // Max 10 concurrent jobs
});
```

## Concurrency with Rate Limiting

Combine concurrency with rate limiting:

```typescript
// High concurrency but rate limited
const rateLimitedWorker = new Worker('api-jobs', async (job) => {
  return await callRateLimitedAPI(job.data);
}, {
  connection,
  concurrency: 50,  // Can have 50 jobs "in flight"
  limiter: {
    max: 10,        // But only start 10 per second
    duration: 1000,
  },
});

// This allows 50 concurrent jobs but limits to 10 new jobs per second
// Useful when jobs have varying durations
```

## Monitoring Concurrency

Track concurrency metrics:

```typescript
class ConcurrencyMonitor {
  private worker: Worker;
  private metrics = {
    currentActive: 0,
    peakActive: 0,
    totalProcessed: 0,
    avgConcurrency: 0,
  };
  private samples: number[] = [];

  constructor(worker: Worker) {
    this.worker = worker;
    this.startTracking();
  }

  private startTracking() {
    // Sample active count every second
    setInterval(async () => {
      const activeCount = await this.worker.getActiveCount?.() || 0;
      this.samples.push(activeCount);

      // Keep last 60 samples (1 minute)
      if (this.samples.length > 60) {
        this.samples.shift();
      }

      this.metrics.currentActive = activeCount;
      this.metrics.peakActive = Math.max(this.metrics.peakActive, activeCount);
      this.metrics.avgConcurrency = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    }, 1000);

    this.worker.on('completed', () => {
      this.metrics.totalProcessed++;
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      configuredConcurrency: this.worker.concurrency,
      utilizationPercent: (this.metrics.avgConcurrency / this.worker.concurrency) * 100,
    };
  }

  logMetrics() {
    const metrics = this.getMetrics();
    console.log(`Concurrency Metrics:
      Configured: ${metrics.configuredConcurrency}
      Current: ${metrics.currentActive}
      Peak: ${metrics.peakActive}
      Average: ${metrics.avgConcurrency.toFixed(1)}
      Utilization: ${metrics.utilizationPercent.toFixed(1)}%
      Total Processed: ${metrics.totalProcessed}`);
  }
}
```

## Best Practices

1. **Start conservative** - Begin with lower concurrency and increase based on metrics.

2. **Match workload type** - CPU-bound needs lower concurrency than I/O-bound.

3. **Monitor resource usage** - Track CPU, memory, and event loop lag.

4. **Consider rate limits** - External APIs may limit how fast you can call them.

5. **Test under load** - Verify behavior at target concurrency.

6. **Use dynamic adjustment** - Adapt to changing conditions.

7. **Account for memory** - Each concurrent job consumes memory.

8. **Balance across queues** - Different queues may need different concurrency.

9. **Monitor utilization** - Low utilization may indicate room to increase.

10. **Set connection limits** - Ensure Redis connections match total concurrency.

## Conclusion

Proper concurrency configuration is essential for optimal BullMQ performance. By understanding your workload characteristics, monitoring system resources, and implementing dynamic adjustments, you can maximize throughput while maintaining system stability. Remember to test your configuration under realistic load conditions and adjust based on observed metrics.
