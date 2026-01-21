# How to Process Jobs in Batches with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Batch Processing, Bulk Operations, Performance, Job Queue

Description: A comprehensive guide to batch processing with BullMQ, including bulk job operations, grouping jobs for batch processing, optimizing throughput, and implementing efficient data processing patterns.

---

Batch processing is essential for efficient handling of large volumes of jobs. Instead of processing items one at a time, grouping them into batches can significantly improve throughput and reduce overhead. This guide covers various batch processing patterns with BullMQ.

## Adding Jobs in Bulk

BullMQ provides `addBulk` for efficiently adding multiple jobs:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue('bulk-queue', { connection });

// Add multiple jobs at once
const jobs = await queue.addBulk([
  { name: 'task', data: { id: 1, action: 'process' } },
  { name: 'task', data: { id: 2, action: 'process' } },
  { name: 'task', data: { id: 3, action: 'process' } },
  { name: 'task', data: { id: 4, action: 'process' } },
  { name: 'task', data: { id: 5, action: 'process' } },
]);

console.log(`Added ${jobs.length} jobs`);
```

## Bulk Job Addition with Options

Configure individual job options in bulk operations:

```typescript
interface TaskJobData {
  userId: string;
  taskType: string;
  payload: Record<string, unknown>;
}

class BulkJobService {
  private queue: Queue<TaskJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('tasks', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
      },
    });
  }

  async addTasks(tasks: TaskJobData[]) {
    const jobDefinitions = tasks.map((task, index) => ({
      name: `task-${task.taskType}`,
      data: task,
      opts: {
        priority: this.getPriority(task.taskType),
        delay: index * 100, // Stagger jobs
        jobId: `task_${task.userId}_${Date.now()}_${index}`,
      },
    }));

    return this.queue.addBulk(jobDefinitions);
  }

  private getPriority(taskType: string): number {
    const priorities: Record<string, number> = {
      critical: 1,
      high: 2,
      normal: 5,
      low: 10,
    };
    return priorities[taskType] || 5;
  }

  // Add delayed bulk jobs
  async scheduleTasksForLater(tasks: TaskJobData[], delayMs: number) {
    const jobDefinitions = tasks.map((task, index) => ({
      name: 'scheduled-task',
      data: task,
      opts: {
        delay: delayMs + index * 50, // Stagger slightly
      },
    }));

    return this.queue.addBulk(jobDefinitions);
  }
}
```

## Batch Processing Pattern

Collect jobs and process them in batches:

```typescript
interface BatchableJobData {
  itemId: string;
  action: string;
  data: Record<string, unknown>;
}

class BatchProcessor {
  private queue: Queue<BatchableJobData>;
  private batchQueue: Queue<{ items: BatchableJobData[] }>;
  private pendingItems: BatchableJobData[] = [];
  private batchSize: number = 100;
  private flushInterval: number = 5000;
  private flushTimer: NodeJS.Timer | null = null;

  constructor(connection: Redis) {
    this.queue = new Queue('items', { connection });
    this.batchQueue = new Queue('batches', { connection });
    this.startFlushTimer();
  }

  // Add item to pending batch
  async addItem(item: BatchableJobData) {
    this.pendingItems.push(item);

    if (this.pendingItems.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  // Add multiple items
  async addItems(items: BatchableJobData[]) {
    for (const item of items) {
      await this.addItem(item);
    }
  }

  // Flush pending items as a batch
  private async flushBatch() {
    if (this.pendingItems.length === 0) return;

    const batch = this.pendingItems.splice(0, this.batchSize);
    await this.batchQueue.add('process-batch', { items: batch });
    console.log(`Flushed batch of ${batch.length} items`);
  }

  // Timer-based flush
  private startFlushTimer() {
    this.flushTimer = setInterval(async () => {
      if (this.pendingItems.length > 0) {
        await this.flushBatch();
      }
    }, this.flushInterval);
  }

  async close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushBatch(); // Flush remaining items
  }
}

// Batch worker
const batchWorker = new Worker<{ items: BatchableJobData[] }>(
  'batches',
  async (job) => {
    const { items } = job.data;
    console.log(`Processing batch of ${items.length} items`);

    const results = await processBatchItems(items);

    return {
      processedCount: items.length,
      successCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
    };
  },
  { connection }
);
```

## Chunked Processing for Large Datasets

Process large datasets in manageable chunks:

```typescript
interface DataImportJob {
  importId: string;
  sourceUrl: string;
  totalRecords: number;
}

interface ChunkJob {
  importId: string;
  chunkIndex: number;
  startIndex: number;
  endIndex: number;
  records: any[];
}

class ChunkedImportService {
  private masterQueue: Queue<DataImportJob>;
  private chunkQueue: Queue<ChunkJob>;
  private chunkSize: number = 1000;

  constructor(connection: Redis) {
    this.masterQueue = new Queue('data-import', { connection });
    this.chunkQueue = new Queue('import-chunks', { connection });
    this.createWorkers(connection);
  }

  async startImport(sourceUrl: string, totalRecords: number) {
    const importId = `import_${Date.now()}`;

    return this.masterQueue.add('import', {
      importId,
      sourceUrl,
      totalRecords,
    });
  }

  private createWorkers(connection: Redis) {
    // Master worker - splits data into chunks
    new Worker<DataImportJob>('data-import', async (job) => {
      const { importId, sourceUrl, totalRecords } = job.data;

      console.log(`Starting import ${importId} with ${totalRecords} records`);

      // Calculate chunks
      const numChunks = Math.ceil(totalRecords / this.chunkSize);

      // Create chunk jobs
      const chunkJobs = [];
      for (let i = 0; i < numChunks; i++) {
        const startIndex = i * this.chunkSize;
        const endIndex = Math.min(startIndex + this.chunkSize, totalRecords);

        // Fetch this chunk of data
        const records = await fetchRecordsRange(sourceUrl, startIndex, endIndex);

        chunkJobs.push({
          name: 'process-chunk',
          data: {
            importId,
            chunkIndex: i,
            startIndex,
            endIndex,
            records,
          },
        });

        await job.updateProgress((i + 1) / numChunks * 50); // 50% for splitting
      }

      // Add all chunk jobs
      await this.chunkQueue.addBulk(chunkJobs);

      // Wait for all chunks to complete (or use flows for this)
      return {
        importId,
        totalRecords,
        chunks: numChunks,
        status: 'chunks_created',
      };
    }, { connection });

    // Chunk worker - processes individual chunks
    new Worker<ChunkJob>('import-chunks', async (job) => {
      const { importId, chunkIndex, records } = job.data;

      console.log(`Processing chunk ${chunkIndex} for import ${importId}`);

      let processed = 0;
      const errors: any[] = [];

      for (let i = 0; i < records.length; i++) {
        try {
          await processRecord(records[i]);
          processed++;
        } catch (error) {
          errors.push({ index: i, error: error.message });
        }

        if (i % 100 === 0) {
          await job.updateProgress((i / records.length) * 100);
        }
      }

      return {
        chunkIndex,
        totalRecords: records.length,
        processed,
        errors: errors.length,
        errorDetails: errors.slice(0, 10), // First 10 errors
      };
    }, {
      connection,
      concurrency: 5, // Process 5 chunks in parallel
    });
  }
}
```

## Aggregating Results from Batch Jobs

Collect and aggregate results from multiple batch jobs:

```typescript
import { FlowProducer, Queue, Worker } from 'bullmq';

interface BatchItemData {
  batchId: string;
  itemIndex: number;
  data: any;
}

interface AggregationData {
  batchId: string;
  totalItems: number;
}

class BatchWithAggregation {
  private flowProducer: FlowProducer;
  private itemQueue: Queue<BatchItemData>;
  private aggregateQueue: Queue<AggregationData>;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
    this.itemQueue = new Queue('batch-items', { connection });
    this.aggregateQueue = new Queue('batch-aggregate', { connection });
    this.createWorkers(connection);
  }

  async processBatch(items: any[]) {
    const batchId = `batch_${Date.now()}`;

    // Create a flow with all items as children of the aggregation job
    const children = items.map((item, index) => ({
      name: 'process-item',
      queueName: 'batch-items',
      data: {
        batchId,
        itemIndex: index,
        data: item,
      },
    }));

    return this.flowProducer.add({
      name: 'aggregate-results',
      queueName: 'batch-aggregate',
      data: {
        batchId,
        totalItems: items.length,
      },
      children,
    });
  }

  private createWorkers(connection: Redis) {
    // Item worker
    new Worker<BatchItemData>('batch-items', async (job) => {
      const { itemIndex, data } = job.data;

      // Process individual item
      const result = await processItem(data);

      return {
        itemIndex,
        success: true,
        result,
      };
    }, {
      connection,
      concurrency: 10,
    });

    // Aggregation worker
    new Worker<AggregationData>('batch-aggregate', async (job) => {
      const childValues = await job.getChildrenValues();
      const results = Object.values(childValues);

      const successCount = results.filter((r: any) => r.success).length;
      const failedCount = results.length - successCount;

      // Aggregate all results
      const aggregatedData = results
        .filter((r: any) => r.success)
        .map((r: any) => r.result);

      return {
        batchId: job.data.batchId,
        totalItems: job.data.totalItems,
        successCount,
        failedCount,
        summary: calculateSummary(aggregatedData),
      };
    }, { connection });
  }
}
```

## Sliding Window Batch Processing

Process items using a sliding window approach:

```typescript
class SlidingWindowProcessor {
  private queue: Queue;
  private windowSize: number = 100;
  private windowDuration: number = 1000; // 1 second
  private currentWindow: any[] = [];
  private windowStart: number = Date.now();

  constructor(connection: Redis) {
    this.queue = new Queue('windowed-processing', { connection });
    this.startWindowTimer();
  }

  async addItem(item: any) {
    this.currentWindow.push({
      item,
      timestamp: Date.now(),
    });

    // Check window size
    if (this.currentWindow.length >= this.windowSize) {
      await this.processWindow();
    }
  }

  private startWindowTimer() {
    setInterval(async () => {
      const now = Date.now();
      if (now - this.windowStart >= this.windowDuration && this.currentWindow.length > 0) {
        await this.processWindow();
      }
    }, 100);
  }

  private async processWindow() {
    if (this.currentWindow.length === 0) return;

    const window = [...this.currentWindow];
    this.currentWindow = [];
    this.windowStart = Date.now();

    await this.queue.add('process-window', {
      windowId: `window_${Date.now()}`,
      items: window.map(w => w.item),
      windowStart: window[0].timestamp,
      windowEnd: window[window.length - 1].timestamp,
      itemCount: window.length,
    });
  }
}
```

## Parallel Batch Processing with Rate Limiting

Process batches in parallel while respecting rate limits:

```typescript
interface RateLimitedBatchJob {
  batchId: string;
  items: any[];
}

class RateLimitedBatchProcessor {
  private queue: Queue<RateLimitedBatchJob>;

  constructor(connection: Redis) {
    this.queue = new Queue('rate-limited-batch', { connection });
    this.createWorker(connection);
  }

  async addBatch(items: any[]) {
    const batchId = `batch_${Date.now()}`;
    return this.queue.add('process', { batchId, items });
  }

  private createWorker(connection: Redis) {
    new Worker<RateLimitedBatchJob>('rate-limited-batch', async (job) => {
      const { batchId, items } = job.data;

      console.log(`Processing batch ${batchId} with ${items.length} items`);

      const results: any[] = [];
      const batchSize = 10; // Process 10 items at a time

      for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);

        // Process chunk in parallel
        const chunkResults = await Promise.all(
          chunk.map(item => processItemWithRetry(item))
        );

        results.push(...chunkResults);

        // Update progress
        await job.updateProgress(((i + chunk.length) / items.length) * 100);

        // Rate limit: wait between chunks
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        batchId,
        totalItems: items.length,
        processedItems: results.length,
        successCount: results.filter(r => r.success).length,
      };
    }, {
      connection,
      concurrency: 3, // 3 batches in parallel
      limiter: {
        max: 5, // Max 5 batches per second
        duration: 1000,
      },
    });
  }
}
```

## Efficient Database Batch Operations

Batch database operations for better performance:

```typescript
interface DatabaseBatchJob {
  operation: 'insert' | 'update' | 'delete';
  table: string;
  records: any[];
}

class DatabaseBatchProcessor {
  private queue: Queue<DatabaseBatchJob>;

  constructor(connection: Redis) {
    this.queue = new Queue('db-batch', { connection });
    this.createWorker(connection);
  }

  async batchInsert(table: string, records: any[]) {
    // Split into chunks of 1000
    const chunks = this.chunkArray(records, 1000);

    const jobs = chunks.map((chunk, index) => ({
      name: 'batch-insert',
      data: {
        operation: 'insert' as const,
        table,
        records: chunk,
      },
      opts: {
        delay: index * 500, // Stagger chunks
      },
    }));

    return this.queue.addBulk(jobs);
  }

  async batchUpdate(table: string, records: any[]) {
    const chunks = this.chunkArray(records, 500); // Smaller chunks for updates

    const jobs = chunks.map(chunk => ({
      name: 'batch-update',
      data: {
        operation: 'update' as const,
        table,
        records: chunk,
      },
    }));

    return this.queue.addBulk(jobs);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private createWorker(connection: Redis) {
    new Worker<DatabaseBatchJob>('db-batch', async (job) => {
      const { operation, table, records } = job.data;

      console.log(`Executing ${operation} on ${table} with ${records.length} records`);

      switch (operation) {
        case 'insert':
          return await db.batchInsert(table, records);
        case 'update':
          return await db.batchUpdate(table, records);
        case 'delete':
          return await db.batchDelete(table, records);
      }
    }, {
      connection,
      concurrency: 2, // Limit concurrent DB operations
    });
  }
}
```

## Best Practices

1. **Choose appropriate batch sizes** - Balance memory usage with throughput.

2. **Implement progress tracking** - Update job progress during long batch operations.

3. **Handle partial failures** - Process what you can and report failures.

4. **Use transactions wisely** - Wrap batch operations in transactions when needed.

5. **Monitor memory usage** - Large batches can consume significant memory.

6. **Stagger bulk additions** - Add delays between jobs to prevent overwhelming workers.

7. **Implement checkpointing** - Save progress for resumable batch operations.

8. **Use flows for complex batches** - Leverage BullMQ flows for dependent batch operations.

9. **Set appropriate timeouts** - Long-running batches need longer timeouts.

10. **Test with realistic data sizes** - Verify batch processing works at scale.

## Conclusion

Batch processing with BullMQ enables efficient handling of large volumes of jobs. By grouping operations, using bulk APIs, and implementing proper chunking strategies, you can significantly improve throughput while maintaining reliability. Choose the pattern that best fits your use case, whether it's simple bulk additions, chunked processing, or complex aggregation workflows.
