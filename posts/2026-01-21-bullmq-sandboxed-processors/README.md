# How to Use BullMQ Sandboxed Processors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Sandboxed Processor, Process Isolation, Fault Tolerance, Memory Management

Description: A comprehensive guide to using BullMQ sandboxed processors for isolated job execution, including separate process workers, memory leak prevention, crash isolation, and patterns for running untrusted code safely.

---

Sandboxed processors in BullMQ run job processing code in separate child processes, providing isolation from the main worker process. This is valuable for memory leak prevention, crash isolation, and running potentially unsafe code. This guide covers how to implement and use sandboxed processors effectively.

## Understanding Sandboxed Processors

A sandboxed processor runs in a separate Node.js process:

- **Isolation**: Crashes don't affect the main worker
- **Memory management**: Process can be restarted to free memory
- **CPU isolation**: Heavy computation doesn't block the event loop
- **Security**: Untrusted code runs in isolation

```typescript
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import path from 'path';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Using a sandboxed processor
const worker = new Worker('tasks', path.join(__dirname, 'processor.js'), {
  connection,
  concurrency: 5,
});
```

## Basic Sandboxed Processor Setup

Create the processor file:

```typescript
// processor.ts (compile to processor.js)
import { Job, SandboxedJob } from 'bullmq';

// Export the processor function
export default async function (job: SandboxedJob) {
  console.log(`Processing job ${job.id} in sandboxed process ${process.pid}`);

  // Update progress
  await job.updateProgress(50);

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));

  await job.updateProgress(100);

  return {
    processed: true,
    processId: process.pid,
    timestamp: Date.now(),
  };
}
```

Main worker file:

```typescript
// worker.ts
import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import path from 'path';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'sandboxed-tasks',
  path.join(__dirname, 'processor.js'),
  {
    connection,
    concurrency: 5,
    useWorkerThreads: false, // Use child processes (default)
  }
);

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log('Sandboxed worker started');
```

## Using Worker Threads Instead of Child Processes

For lighter isolation, use worker threads:

```typescript
const worker = new Worker(
  'threaded-tasks',
  path.join(__dirname, 'processor.js'),
  {
    connection,
    concurrency: 10,
    useWorkerThreads: true, // Use worker threads
  }
);
```

## Processor with Dependencies

Access external services in sandboxed processor:

```typescript
// processor-with-deps.ts
import { SandboxedJob } from 'bullmq';
import { Redis } from 'ioredis';

// Initialize dependencies once per process
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }
  return redis;
}

export default async function (job: SandboxedJob) {
  const redis = getRedis();

  // Use Redis in the processor
  const cachedResult = await redis.get(`cache:${job.data.key}`);
  if (cachedResult) {
    return JSON.parse(cachedResult);
  }

  // Process the job
  const result = await processData(job.data);

  // Cache the result
  await redis.set(`cache:${job.data.key}`, JSON.stringify(result), 'EX', 3600);

  return result;
}

async function processData(data: any) {
  // Processing logic
  return { processed: true, data };
}

// Clean up on process exit
process.on('exit', () => {
  redis?.quit();
});
```

## Memory-Safe Processor

Implement memory management in sandboxed processors:

```typescript
// memory-safe-processor.ts
import { SandboxedJob } from 'bullmq';

// Track memory usage
let processedCount = 0;
const MAX_JOBS_BEFORE_RESTART = 1000;
const MEMORY_THRESHOLD_MB = 500;

export default async function (job: SandboxedJob) {
  // Check if process should restart
  await checkMemoryAndRestart();

  processedCount++;

  try {
    const result = await processJob(job);
    return result;
  } finally {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}

async function checkMemoryAndRestart() {
  const used = process.memoryUsage();
  const heapUsedMB = used.heapUsed / 1024 / 1024;

  if (heapUsedMB > MEMORY_THRESHOLD_MB) {
    console.log(`Memory threshold exceeded (${heapUsedMB.toFixed(1)}MB), requesting restart`);
    // The process will exit and be respawned by BullMQ
    process.exit(0);
  }

  if (processedCount >= MAX_JOBS_BEFORE_RESTART) {
    console.log(`Processed ${MAX_JOBS_BEFORE_RESTART} jobs, requesting restart`);
    process.exit(0);
  }
}

async function processJob(job: SandboxedJob) {
  // Your processing logic
  return { processed: true };
}
```

## Handling Crashes in Sandboxed Processors

The main worker handles processor crashes:

```typescript
// worker-with-crash-handling.ts
import { Worker, Queue } from 'bullmq';
import path from 'path';

const worker = new Worker(
  'crash-safe-tasks',
  path.join(__dirname, 'processor.js'),
  {
    connection,
    concurrency: 5,
    // Processor restart settings
    settings: {
      stalledInterval: 30000,
      maxStalledCount: 2,
    },
  }
);

// Handle processor crashes
worker.on('error', (error) => {
  console.error('Worker error (possibly processor crash):', error);
});

worker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} stalled - processor may have crashed`);
});

// The worker will automatically respawn the processor on crash
```

## Processor with Timeout

Implement per-job timeouts:

```typescript
// timeout-processor.ts
import { SandboxedJob } from 'bullmq';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export default async function (job: SandboxedJob) {
  const timeout = job.data.timeout || DEFAULT_TIMEOUT;

  const result = await Promise.race([
    processJob(job),
    timeoutPromise(timeout),
  ]);

  return result;
}

async function processJob(job: SandboxedJob) {
  // Actual processing logic
  await new Promise(resolve => setTimeout(resolve, 5000));
  return { success: true };
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Job timed out after ${ms}ms`));
    }, ms);
  });
}
```

## Multi-Queue Sandboxed Workers

Run different processors for different queues:

```typescript
// multi-queue-worker.ts
import { Worker } from 'bullmq';
import path from 'path';

const workers: Worker[] = [];

const queueConfigs = [
  {
    name: 'image-processing',
    processor: 'image-processor.js',
    concurrency: 3,
  },
  {
    name: 'video-transcoding',
    processor: 'video-processor.js',
    concurrency: 2,
  },
  {
    name: 'data-export',
    processor: 'export-processor.js',
    concurrency: 5,
  },
];

for (const config of queueConfigs) {
  const worker = new Worker(
    config.name,
    path.join(__dirname, 'processors', config.processor),
    {
      connection,
      concurrency: config.concurrency,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[${config.name}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[${config.name}] Job ${job?.id} failed:`, error.message);
  });

  workers.push(worker);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all(workers.map(w => w.close()));
  process.exit(0);
});
```

## Processor with Structured Logging

Implement logging in sandboxed processors:

```typescript
// logging-processor.ts
import { SandboxedJob } from 'bullmq';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  jobId: string;
  message: string;
  data?: any;
}

function log(level: LogEntry['level'], jobId: string, message: string, data?: any) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    jobId,
    message,
    data,
  };
  console.log(JSON.stringify(entry));
}

export default async function (job: SandboxedJob) {
  log('info', job.id!, 'Job started', { data: job.data });

  try {
    await job.updateProgress(10);
    log('info', job.id!, 'Progress: 10%');

    const result = await processJob(job);

    await job.updateProgress(100);
    log('info', job.id!, 'Job completed', { result });

    return result;
  } catch (error) {
    log('error', job.id!, 'Job failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

async function processJob(job: SandboxedJob) {
  // Processing logic
  return { success: true };
}
```

## Communicating Between Main Process and Processor

Share data using job data and results:

```typescript
// processor-with-communication.ts
import { SandboxedJob } from 'bullmq';

// Access environment variables set by main process
const config = {
  apiEndpoint: process.env.API_ENDPOINT,
  apiKey: process.env.API_KEY,
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
};

export default async function (job: SandboxedJob) {
  // Access job data
  const { taskType, payload, options } = job.data;

  // Use configuration from environment
  const result = await callAPI(config.apiEndpoint!, payload, {
    apiKey: config.apiKey!,
    maxRetries: options?.retries || config.maxRetries,
  });

  // Return result to main process via job result
  return {
    taskType,
    result,
    processedBy: process.pid,
    processorConfig: {
      endpoint: config.apiEndpoint,
      maxRetries: config.maxRetries,
    },
  };
}

async function callAPI(endpoint: string, payload: any, options: { apiKey: string; maxRetries: number }) {
  // API call implementation
  return { success: true };
}
```

## Testing Sandboxed Processors

Test processors in isolation:

```typescript
// processor.test.ts
import { Job } from 'bullmq';
import processor from './processor';

// Create a mock job
function createMockJob(data: any): Partial<Job> {
  return {
    id: 'test-job-1',
    data,
    name: 'test',
    updateProgress: jest.fn(),
    log: jest.fn(),
  };
}

describe('Sandboxed Processor', () => {
  it('should process job successfully', async () => {
    const mockJob = createMockJob({ key: 'test-value' });

    const result = await processor(mockJob as any);

    expect(result.processed).toBe(true);
    expect(mockJob.updateProgress).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const mockJob = createMockJob({ key: 'error-trigger' });

    await expect(processor(mockJob as any)).rejects.toThrow();
  });
});
```

## Monitoring Sandboxed Processors

Track processor metrics:

```typescript
// monitored-processor.ts
import { SandboxedJob } from 'bullmq';

// Metrics
const metrics = {
  jobsProcessed: 0,
  jobsFailed: 0,
  totalProcessingTime: 0,
  startTime: Date.now(),
};

// Report metrics periodically
setInterval(() => {
  const uptime = Date.now() - metrics.startTime;
  console.log(JSON.stringify({
    type: 'metrics',
    pid: process.pid,
    uptime,
    ...metrics,
    avgProcessingTime: metrics.jobsProcessed > 0
      ? metrics.totalProcessingTime / metrics.jobsProcessed
      : 0,
    memoryUsage: process.memoryUsage(),
  }));
}, 30000);

export default async function (job: SandboxedJob) {
  const startTime = Date.now();

  try {
    const result = await processJob(job);

    metrics.jobsProcessed++;
    metrics.totalProcessingTime += Date.now() - startTime;

    return result;
  } catch (error) {
    metrics.jobsFailed++;
    throw error;
  }
}

async function processJob(job: SandboxedJob) {
  return { success: true };
}
```

## Best Practices

1. **Keep processors stateless** - Don't rely on in-memory state between jobs.

2. **Initialize dependencies once** - Use lazy initialization for external services.

3. **Handle cleanup properly** - Clean up resources when the process exits.

4. **Implement memory monitoring** - Restart processors periodically to prevent leaks.

5. **Use structured logging** - JSON logs are easier to parse and aggregate.

6. **Set appropriate timeouts** - Prevent hung processors.

7. **Test processors in isolation** - Unit test processor logic independently.

8. **Monitor processor health** - Track metrics from sandboxed processes.

9. **Use worker threads for lighter isolation** - Less overhead than child processes.

10. **Handle graceful shutdown** - Clean up before process termination.

## Conclusion

Sandboxed processors provide valuable isolation for BullMQ jobs, protecting your main worker process from crashes, memory leaks, and CPU-heavy operations. By running job processing code in separate processes or worker threads, you can build more resilient job processing systems. Use sandboxed processors when you need isolation, memory management, or when running potentially unsafe code.
