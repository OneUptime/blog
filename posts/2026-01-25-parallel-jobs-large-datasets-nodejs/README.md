# How to Process Large Datasets with Parallel Jobs in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, TypeScript, Performance, Parallel Processing, Worker Threads, Data Processing

Description: Learn how to process large datasets efficiently in Node.js using parallel jobs, worker threads, and batching strategies that maximize throughput while avoiding memory issues.

---

Processing large datasets in Node.js requires careful consideration of memory limits, CPU utilization, and concurrency control. A naive approach of loading everything into memory or processing items one by one will either crash your application or take forever to complete. This guide covers practical patterns for parallel data processing that scale to millions of records.

## The Challenge

Node.js runs JavaScript in a single thread by default. Processing a million records sequentially means your application is idle waiting for I/O most of the time. Loading the entire dataset into memory will exhaust heap space. We need strategies that:

- Process items concurrently without overwhelming resources
- Stream data to avoid memory bloat
- Utilize multiple CPU cores for CPU-bound work
- Handle failures gracefully without losing progress

## Concurrency Control Patterns

Let's start with the foundational pattern: controlling how many items process simultaneously.

```typescript
// Simple concurrency limiter using a semaphore pattern
// Prevents starting more than N concurrent operations
class ConcurrencyLimiter {
  private running: number = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if we're at the limit
    if (this.running >= this.limit) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      // Release next waiting task
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// Usage example: limit to 10 concurrent API calls
async function fetchUserData(userIds: string[]): Promise<User[]> {
  const limiter = new ConcurrencyLimiter(10);

  const promises = userIds.map(id =>
    limiter.execute(() => fetchUser(id))
  );

  return Promise.all(promises);
}
```

## Batch Processing with Streams

For truly large datasets, we need to stream data rather than load it all at once. This pattern reads from a database cursor or file stream and processes items in controlled batches.

```typescript
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

// Configuration for batch processing
interface BatchConfig {
  batchSize: number;       // Items per batch
  concurrency: number;     // Parallel batches
  onProgress?: (processed: number, total?: number) => void;
}

// Process items in batches with controlled concurrency
// Uses Node.js streams to handle memory efficiently
async function processBatches<T, R>(
  source: AsyncIterable<T>,
  processor: (batch: T[]) => Promise<R[]>,
  config: BatchConfig
): Promise<R[]> {
  const { batchSize, concurrency, onProgress } = config;
  const limiter = new ConcurrencyLimiter(concurrency);
  const results: R[] = [];
  let processed = 0;

  let batch: T[] = [];
  const pendingBatches: Promise<void>[] = [];

  for await (const item of source) {
    batch.push(item);

    if (batch.length >= batchSize) {
      const currentBatch = batch;
      batch = [];

      // Process batch with concurrency control
      const batchPromise = limiter.execute(async () => {
        const batchResults = await processor(currentBatch);
        results.push(...batchResults);
        processed += currentBatch.length;
        onProgress?.(processed);
      });

      pendingBatches.push(batchPromise);
    }
  }

  // Process remaining items
  if (batch.length > 0) {
    const finalBatch = limiter.execute(async () => {
      const batchResults = await processor(batch);
      results.push(...batchResults);
      processed += batch.length;
      onProgress?.(processed);
    });
    pendingBatches.push(finalBatch);
  }

  await Promise.all(pendingBatches);
  return results;
}
```

## Database Cursor Streaming

When processing database records, use cursors to stream results instead of loading everything at once.

```typescript
// Stream records from PostgreSQL using a cursor
// Memory usage stays constant regardless of dataset size
import { Pool, PoolClient } from 'pg';
import Cursor from 'pg-cursor';

async function* streamFromDatabase<T>(
  pool: Pool,
  query: string,
  params: any[] = [],
  batchSize: number = 1000
): AsyncGenerator<T> {
  const client = await pool.connect();

  try {
    const cursor = client.query(new Cursor(query, params));

    while (true) {
      const rows = await new Promise<T[]>((resolve, reject) => {
        cursor.read(batchSize, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (rows.length === 0) break;

      for (const row of rows) {
        yield row;
      }
    }

    cursor.close();
  } finally {
    client.release();
  }
}

// Usage: process millions of users efficiently
async function processAllUsers(pool: Pool): Promise<void> {
  const userStream = streamFromDatabase<User>(
    pool,
    'SELECT * FROM users WHERE active = true ORDER BY id',
    [],
    1000
  );

  await processBatches(
    userStream,
    async (users) => {
      // Process batch of users
      return Promise.all(users.map(user => updateUserMetrics(user)));
    },
    {
      batchSize: 100,
      concurrency: 5,
      onProgress: (count) => console.log(`Processed ${count} users`),
    }
  );
}
```

## Worker Threads for CPU-Bound Tasks

When processing involves CPU-intensive work (parsing, encryption, image processing), use Worker Threads to leverage multiple cores.

```typescript
// main.ts - Coordinator that distributes work to workers
import { Worker } from 'worker_threads';
import os from 'os';

interface WorkerTask<T> {
  id: string;
  data: T;
}

interface WorkerResult<R> {
  id: string;
  result?: R;
  error?: string;
}

// Worker pool manages a fixed number of worker threads
// Distributes tasks and collects results
class WorkerPool<T, R> {
  private workers: Worker[] = [];
  private taskQueue: Array<{
    task: WorkerTask<T>;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private availableWorkers: Worker[] = [];

  constructor(
    private workerPath: string,
    poolSize: number = os.cpus().length
  ) {
    // Create worker threads
    for (let i = 0; i < poolSize; i++) {
      this.createWorker();
    }
  }

  private createWorker(): void {
    const worker = new Worker(this.workerPath);

    worker.on('message', (result: WorkerResult<R>) => {
      // Find and resolve the pending task
      const taskIndex = this.taskQueue.findIndex(t => t.task.id === result.id);

      if (taskIndex !== -1) {
        const { resolve, reject } = this.taskQueue[taskIndex];
        this.taskQueue.splice(taskIndex, 1);

        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.result!);
        }
      }

      // Mark worker as available and process next task
      this.availableWorkers.push(worker);
      this.processQueue();
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      // Replace failed worker
      const index = this.workers.indexOf(worker);
      if (index !== -1) {
        this.workers.splice(index, 1);
        this.createWorker();
      }
    });

    this.workers.push(worker);
    this.availableWorkers.push(worker);
  }

  private processQueue(): void {
    while (this.availableWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.availableWorkers.pop()!;
      const { task } = this.taskQueue[0]; // Keep in queue until complete
      worker.postMessage(task);
    }
  }

  // Submit a task to the pool
  async execute(data: T): Promise<R> {
    const task: WorkerTask<T> = {
      id: `${Date.now()}-${Math.random().toString(36)}`,
      data,
    };

    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  // Process multiple items in parallel
  async map(items: T[]): Promise<R[]> {
    return Promise.all(items.map(item => this.execute(item)));
  }

  // Cleanup workers
  async terminate(): Promise<void> {
    await Promise.all(this.workers.map(w => w.terminate()));
    this.workers = [];
    this.availableWorkers = [];
  }
}
```

```typescript
// worker.ts - Worker thread that processes tasks
import { parentPort } from 'worker_threads';

interface WorkerTask<T> {
  id: string;
  data: T;
}

interface WorkerResult<R> {
  id: string;
  result?: R;
  error?: string;
}

// CPU-intensive processing function
function processData(data: any): any {
  // Example: complex data transformation
  // This runs on a separate thread, not blocking the main event loop
  const result = {
    processed: true,
    checksum: calculateChecksum(data),
    transformed: transformData(data),
  };

  return result;
}

function calculateChecksum(data: any): string {
  // Simulate CPU-intensive work
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function transformData(data: any): any {
  // Apply transformations
  return data;
}

// Listen for tasks from main thread
parentPort?.on('message', (task: WorkerTask<any>) => {
  try {
    const result = processData(task.data);

    const response: WorkerResult<any> = {
      id: task.id,
      result,
    };

    parentPort?.postMessage(response);
  } catch (error) {
    const response: WorkerResult<any> = {
      id: task.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    parentPort?.postMessage(response);
  }
});
```

## Job Queue with Progress Tracking

For long-running jobs, track progress and support resumption.

```typescript
// Job queue with checkpointing for resumable processing
interface Job<T> {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  lastProcessedId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  metadata: T;
}

class JobProcessor<T, R> {
  private jobs: Map<string, Job<T>> = new Map();

  // Create a new job
  async createJob(
    id: string,
    totalItems: number,
    metadata: T
  ): Promise<Job<T>> {
    const job: Job<T> = {
      id,
      status: 'pending',
      totalItems,
      processedItems: 0,
      lastProcessedId: null,
      startedAt: null,
      completedAt: null,
      error: null,
      metadata,
    };

    this.jobs.set(id, job);
    return job;
  }

  // Process job with automatic checkpointing
  async processJob(
    jobId: string,
    getItems: (afterId: string | null, limit: number) => Promise<Array<{ id: string; data: any }>>,
    processor: (item: any) => Promise<R>,
    options: {
      batchSize: number;
      concurrency: number;
      checkpointInterval: number; // Save progress every N items
    }
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'running';
    job.startedAt = new Date();

    const limiter = new ConcurrencyLimiter(options.concurrency);
    let itemsSinceCheckpoint = 0;

    try {
      while (true) {
        // Fetch next batch, resuming from last checkpoint
        const items = await getItems(job.lastProcessedId, options.batchSize);

        if (items.length === 0) break;

        // Process items concurrently
        const results = await Promise.all(
          items.map(item =>
            limiter.execute(async () => {
              await processor(item.data);
              return item.id;
            })
          )
        );

        // Update progress
        job.processedItems += results.length;
        job.lastProcessedId = results[results.length - 1];
        itemsSinceCheckpoint += results.length;

        // Checkpoint progress
        if (itemsSinceCheckpoint >= options.checkpointInterval) {
          await this.saveCheckpoint(job);
          itemsSinceCheckpoint = 0;
          console.log(`Job ${jobId}: ${job.processedItems}/${job.totalItems} processed`);
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      await this.saveCheckpoint(job);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      await this.saveCheckpoint(job);
      throw error;
    }
  }

  // Save job state for resumption
  private async saveCheckpoint(job: Job<T>): Promise<void> {
    // In production, save to database
    this.jobs.set(job.id, { ...job });
  }

  // Resume a failed or interrupted job
  async resumeJob(
    jobId: string,
    getItems: (afterId: string | null, limit: number) => Promise<Array<{ id: string; data: any }>>,
    processor: (item: any) => Promise<R>,
    options: {
      batchSize: number;
      concurrency: number;
      checkpointInterval: number;
    }
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (job.status === 'completed') {
      console.log(`Job ${jobId} already completed`);
      return;
    }

    console.log(`Resuming job ${jobId} from item ${job.lastProcessedId}`);
    await this.processJob(jobId, getItems, processor, options);
  }
}
```

## Processing Pipeline

For complex transformations, build a processing pipeline where each stage can run in parallel.

```typescript
// Multi-stage processing pipeline
// Each stage transforms data and passes to the next
type PipelineStage<TIn, TOut> = (input: TIn) => Promise<TOut>;

class ProcessingPipeline {
  private stages: Array<{
    name: string;
    fn: PipelineStage<any, any>;
    concurrency: number;
  }> = [];

  // Add a processing stage
  addStage<TIn, TOut>(
    name: string,
    fn: PipelineStage<TIn, TOut>,
    concurrency: number = 10
  ): this {
    this.stages.push({ name, fn, concurrency });
    return this;
  }

  // Process items through all stages
  async process<T>(items: T[]): Promise<any[]> {
    let currentItems: any[] = items;

    for (const stage of this.stages) {
      console.log(`Running stage: ${stage.name}`);
      const limiter = new ConcurrencyLimiter(stage.concurrency);

      currentItems = await Promise.all(
        currentItems.map(item =>
          limiter.execute(() => stage.fn(item))
        )
      );

      // Filter out nulls (items that should be skipped)
      currentItems = currentItems.filter(item => item !== null);

      console.log(`Stage ${stage.name}: ${currentItems.length} items`);
    }

    return currentItems;
  }
}

// Usage example: ETL pipeline
async function runEtlPipeline(records: RawRecord[]): Promise<void> {
  const pipeline = new ProcessingPipeline()
    .addStage('validate', async (record) => {
      // Skip invalid records
      if (!isValid(record)) return null;
      return record;
    }, 20)
    .addStage('transform', async (record) => {
      // Transform data format
      return transformRecord(record);
    }, 10)
    .addStage('enrich', async (record) => {
      // Add external data
      const enriched = await fetchEnrichmentData(record.id);
      return { ...record, ...enriched };
    }, 5)
    .addStage('load', async (record) => {
      // Write to destination
      await writeToDatabase(record);
      return record;
    }, 10);

  await pipeline.process(records);
}
```

## Memory-Efficient File Processing

When processing large files, stream them line by line.

```typescript
import fs from 'fs';
import readline from 'readline';

// Process large files line by line
// Memory usage stays constant regardless of file size
async function* readLinesFromFile(filePath: string): AsyncGenerator<string> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    yield line;
  }
}

// Process CSV file with batching
async function processLargeCsv(
  filePath: string,
  processor: (rows: Record<string, string>[]) => Promise<void>
): Promise<void> {
  const lines = readLinesFromFile(filePath);
  let headers: string[] = [];
  let batch: Record<string, string>[] = [];
  const batchSize = 1000;
  let lineNumber = 0;

  for await (const line of lines) {
    lineNumber++;

    // First line is headers
    if (lineNumber === 1) {
      headers = line.split(',').map(h => h.trim());
      continue;
    }

    // Parse row
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    batch.push(row);

    // Process batch when full
    if (batch.length >= batchSize) {
      await processor(batch);
      batch = [];
      console.log(`Processed ${lineNumber} lines`);
    }
  }

  // Process remaining rows
  if (batch.length > 0) {
    await processor(batch);
  }

  console.log(`Completed: ${lineNumber} total lines`);
}
```

## Error Handling and Retries

Wrap processing with error handling that does not fail the entire batch.

```typescript
// Process items with individual error handling
// Failed items are collected for retry or manual review
interface ProcessResult<T, R> {
  successful: Array<{ input: T; output: R }>;
  failed: Array<{ input: T; error: string }>;
}

async function processWithErrorHandling<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    concurrency: number;
    retries: number;
    retryDelay: number;
  }
): Promise<ProcessResult<T, R>> {
  const limiter = new ConcurrencyLimiter(options.concurrency);
  const result: ProcessResult<T, R> = { successful: [], failed: [] };

  await Promise.all(
    items.map(item =>
      limiter.execute(async () => {
        let lastError: Error | null = null;

        // Try with retries
        for (let attempt = 0; attempt <= options.retries; attempt++) {
          try {
            const output = await processor(item);
            result.successful.push({ input: item, output });
            return;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < options.retries) {
              await sleep(options.retryDelay * Math.pow(2, attempt));
            }
          }
        }

        // All retries failed
        result.failed.push({
          input: item,
          error: lastError?.message || 'Unknown error',
        });
      })
    )
  );

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Summary

| Pattern | Use Case | Key Benefit |
|---------|----------|-------------|
| Concurrency limiter | I/O-bound operations | Prevents overwhelming external services |
| Batch streaming | Database records | Constant memory usage |
| Worker threads | CPU-bound tasks | Utilizes multiple cores |
| Checkpointing | Long-running jobs | Resumable after failures |
| Pipeline stages | Complex transformations | Modularity and parallel stages |
| Error collection | Unreliable operations | Partial success without total failure |

Processing large datasets in Node.js requires combining these patterns based on your specific workload. For I/O-bound work, concurrency control and streaming are usually sufficient. For CPU-bound processing, worker threads unlock true parallelism. For mission-critical jobs, add checkpointing to ensure progress is never lost.
