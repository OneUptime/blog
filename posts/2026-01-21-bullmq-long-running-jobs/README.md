# How to Handle Long-Running Jobs in BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Long-Running Jobs, Progress Tracking, Timeouts, Background Jobs

Description: A comprehensive guide to handling long-running jobs in BullMQ, including progress tracking, timeout configuration, stall detection, checkpointing, and strategies for managing jobs that take minutes or hours to complete.

---

Long-running jobs - those that take minutes or even hours to complete - require special handling in BullMQ. Without proper configuration, these jobs can be incorrectly marked as stalled, lose progress on failure, or cause resource issues. This guide covers everything you need to know about managing long-running jobs effectively.

## Understanding Long-Running Job Challenges

Long-running jobs face several challenges:
- **Stall detection**: BullMQ may think a job is stuck
- **Progress visibility**: Users need to see job status
- **Failure recovery**: Lost work when jobs fail partway through
- **Resource management**: Memory and connection issues over time
- **Timeout configuration**: Preventing premature termination

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Queue for long-running jobs
const queue = new Queue('long-running', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: false, // Keep for status checking
  },
});
```

## Configuring Timeouts and Stall Detection

Properly configure timeout and stall settings:

```typescript
const worker = new Worker('long-running', async (job) => {
  // Your long-running process
  return await processLongTask(job);
}, {
  connection,
  // Lock duration - how long before job is considered stalled
  lockDuration: 300000, // 5 minutes

  // How often to check for stalled jobs
  stalledInterval: 60000, // 1 minute

  // Max times a job can be recovered from stalled state
  maxStalledCount: 2,

  // Overall concurrency
  concurrency: 2,
});
```

## Progress Tracking

Report progress throughout job execution:

```typescript
interface LongJobData {
  taskId: string;
  items: string[];
}

interface LongJobResult {
  processedCount: number;
  duration: number;
}

const worker = new Worker<LongJobData, LongJobResult>('long-running', async (job) => {
  const { items } = job.data;
  const startTime = Date.now();

  console.log(`Starting job ${job.id} with ${items.length} items`);

  for (let i = 0; i < items.length; i++) {
    // Process each item
    await processItem(items[i]);

    // Update progress (0-100)
    const progress = Math.round(((i + 1) / items.length) * 100);
    await job.updateProgress(progress);

    // Log milestone
    if (progress % 10 === 0) {
      console.log(`Job ${job.id}: ${progress}% complete`);
    }
  }

  return {
    processedCount: items.length,
    duration: Date.now() - startTime,
  };
}, { connection });

// Monitor progress from outside
async function monitorJobProgress(jobId: string) {
  const job = await queue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress,
    data: job.data,
  };
}
```

## Detailed Progress with Stages

Track progress across multiple stages:

```typescript
interface StageProgress {
  currentStage: string;
  stageProgress: number;
  overallProgress: number;
  stages: {
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startedAt?: number;
    completedAt?: number;
  }[];
  logs: string[];
}

class LongRunningJobProcessor {
  private queue: Queue;

  constructor(connection: Redis) {
    this.queue = new Queue('staged-jobs', { connection });
  }

  async processWithStages(job: Job) {
    const stages = [
      { name: 'initialization', weight: 5 },
      { name: 'data-fetch', weight: 15 },
      { name: 'processing', weight: 60 },
      { name: 'validation', weight: 10 },
      { name: 'finalization', weight: 10 },
    ];

    const progress: StageProgress = {
      currentStage: '',
      stageProgress: 0,
      overallProgress: 0,
      stages: stages.map(s => ({ name: s.name, status: 'pending' })),
      logs: [],
    };

    let completedWeight = 0;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      progress.currentStage = stage.name;
      progress.stages[i].status = 'in_progress';
      progress.stages[i].startedAt = Date.now();
      progress.logs.push(`Starting stage: ${stage.name}`);

      await job.updateProgress(progress);

      try {
        // Execute stage with progress callback
        await this.executeStage(stage.name, job, (stageProgress) => {
          progress.stageProgress = stageProgress;
          progress.overallProgress = completedWeight + (stage.weight * stageProgress / 100);
          job.updateProgress(progress);
        });

        progress.stages[i].status = 'completed';
        progress.stages[i].completedAt = Date.now();
        completedWeight += stage.weight;
        progress.overallProgress = completedWeight;
        progress.logs.push(`Completed stage: ${stage.name}`);

      } catch (error) {
        progress.stages[i].status = 'failed';
        progress.logs.push(`Failed stage: ${stage.name} - ${error.message}`);
        await job.updateProgress(progress);
        throw error;
      }
    }

    return progress;
  }

  private async executeStage(
    stageName: string,
    job: Job,
    onProgress: (progress: number) => void
  ) {
    switch (stageName) {
      case 'initialization':
        await this.initialize(job.data, onProgress);
        break;
      case 'data-fetch':
        await this.fetchData(job.data, onProgress);
        break;
      case 'processing':
        await this.processData(job.data, onProgress);
        break;
      case 'validation':
        await this.validate(job.data, onProgress);
        break;
      case 'finalization':
        await this.finalize(job.data, onProgress);
        break;
    }
  }

  // Stage implementations...
  private async initialize(data: any, onProgress: (p: number) => void) {
    onProgress(50);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onProgress(100);
  }

  private async fetchData(data: any, onProgress: (p: number) => void) {
    for (let i = 0; i <= 100; i += 10) {
      onProgress(i);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private async processData(data: any, onProgress: (p: number) => void) {
    for (let i = 0; i <= 100; i += 5) {
      onProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  private async validate(data: any, onProgress: (p: number) => void) {
    onProgress(50);
    await new Promise(resolve => setTimeout(resolve, 500));
    onProgress(100);
  }

  private async finalize(data: any, onProgress: (p: number) => void) {
    onProgress(100);
  }
}
```

## Keeping Jobs Alive

Extend lock duration to prevent stalling:

```typescript
const worker = new Worker('long-running', async (job) => {
  const items = job.data.items;
  const lockExtensionInterval = 60000; // 1 minute

  // Set up lock extension
  const lockExtender = setInterval(async () => {
    try {
      await job.extendLock(job.token!, lockExtensionInterval);
      console.log(`Extended lock for job ${job.id}`);
    } catch (error) {
      console.error(`Failed to extend lock for job ${job.id}:`, error);
    }
  }, lockExtensionInterval - 5000); // Extend 5 seconds before expiry

  try {
    for (let i = 0; i < items.length; i++) {
      await processItem(items[i]);
      await job.updateProgress(((i + 1) / items.length) * 100);
    }

    return { success: true, processed: items.length };
  } finally {
    clearInterval(lockExtender);
  }
}, {
  connection,
  lockDuration: 120000, // 2 minutes initial lock
});
```

## Checkpointing for Resume

Save progress to resume after failures:

```typescript
interface CheckpointedJobData {
  taskId: string;
  totalItems: number;
  checkpoint?: {
    processedCount: number;
    lastProcessedId: string;
    intermediateResults: any[];
  };
}

class CheckpointedProcessor {
  private queue: Queue<CheckpointedJobData>;
  private redis: Redis;

  constructor(connection: Redis) {
    this.queue = new Queue('checkpointed-jobs', { connection });
    this.redis = connection;
  }

  async process(job: Job<CheckpointedJobData>) {
    const { taskId, totalItems } = job.data;
    const checkpointKey = `checkpoint:${taskId}`;

    // Load existing checkpoint
    let checkpoint = await this.loadCheckpoint(checkpointKey);

    const startIndex = checkpoint?.processedCount || 0;
    const results = checkpoint?.intermediateResults || [];

    console.log(`Resuming job ${taskId} from index ${startIndex}`);

    for (let i = startIndex; i < totalItems; i++) {
      // Process item
      const result = await this.processItem(i);
      results.push(result);

      // Save checkpoint every 10 items
      if ((i + 1) % 10 === 0) {
        checkpoint = {
          processedCount: i + 1,
          lastProcessedId: `item_${i}`,
          intermediateResults: results,
        };
        await this.saveCheckpoint(checkpointKey, checkpoint);
        console.log(`Checkpoint saved at index ${i + 1}`);
      }

      await job.updateProgress(((i + 1) / totalItems) * 100);
    }

    // Clear checkpoint on completion
    await this.redis.del(checkpointKey);

    return { taskId, totalProcessed: totalItems, results };
  }

  private async loadCheckpoint(key: string) {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  private async saveCheckpoint(key: string, checkpoint: any) {
    await this.redis.set(key, JSON.stringify(checkpoint), 'EX', 86400); // 24 hour expiry
  }

  private async processItem(index: number) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { index, processed: true };
  }
}
```

## Chunked Processing for Very Long Jobs

Break very long jobs into chunks:

```typescript
import { FlowProducer } from 'bullmq';

interface MasterJobData {
  jobId: string;
  totalRecords: number;
  chunkSize: number;
}

interface ChunkJobData {
  jobId: string;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
}

class ChunkedLongJobProcessor {
  private flowProducer: FlowProducer;
  private masterQueue: Queue<MasterJobData>;
  private chunkQueue: Queue<ChunkJobData>;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
    this.masterQueue = new Queue('master-jobs', { connection });
    this.chunkQueue = new Queue('chunk-jobs', { connection });
    this.createWorkers(connection);
  }

  async submitLongJob(totalRecords: number, chunkSize: number = 1000) {
    const jobId = `long_job_${Date.now()}`;
    const numChunks = Math.ceil(totalRecords / chunkSize);

    // Create chunks as children of master job
    const children = [];
    for (let i = 0; i < numChunks; i++) {
      children.push({
        name: `chunk-${i}`,
        queueName: 'chunk-jobs',
        data: {
          jobId,
          chunkIndex: i,
          startOffset: i * chunkSize,
          endOffset: Math.min((i + 1) * chunkSize, totalRecords),
        },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      });
    }

    return this.flowProducer.add({
      name: 'master-job',
      queueName: 'master-jobs',
      data: { jobId, totalRecords, chunkSize },
      children,
    });
  }

  private createWorkers(connection: Redis) {
    // Chunk worker - handles individual chunks
    new Worker<ChunkJobData>('chunk-jobs', async (job) => {
      const { jobId, chunkIndex, startOffset, endOffset } = job.data;
      const chunkSize = endOffset - startOffset;

      console.log(`Processing chunk ${chunkIndex} (${startOffset}-${endOffset})`);

      const results = [];
      for (let i = 0; i < chunkSize; i++) {
        results.push(await this.processRecord(startOffset + i));
        await job.updateProgress((i + 1) / chunkSize * 100);
      }

      return {
        chunkIndex,
        processedCount: chunkSize,
        results,
      };
    }, {
      connection,
      concurrency: 5, // Process multiple chunks in parallel
      lockDuration: 300000,
    });

    // Master worker - aggregates results
    new Worker<MasterJobData>('master-jobs', async (job) => {
      const childResults = await job.getChildrenValues();

      const allResults = Object.values(childResults)
        .sort((a: any, b: any) => a.chunkIndex - b.chunkIndex)
        .flatMap((r: any) => r.results);

      return {
        jobId: job.data.jobId,
        totalProcessed: allResults.length,
        completedAt: new Date().toISOString(),
      };
    }, { connection });
  }

  private async processRecord(index: number) {
    await new Promise(resolve => setTimeout(resolve, 10));
    return { index, processed: true };
  }
}
```

## Timeout Handling

Handle timeouts gracefully:

```typescript
interface TimeoutJobData {
  taskId: string;
  maxDuration: number; // milliseconds
}

class TimeoutAwareProcessor {
  async process(job: Job<TimeoutJobData>) {
    const { maxDuration } = job.data;
    const startTime = Date.now();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('JOB_TIMEOUT'));
      }, maxDuration);
    });

    const processingPromise = this.doWork(job, startTime, maxDuration);

    try {
      return await Promise.race([processingPromise, timeoutPromise]);
    } catch (error) {
      if (error.message === 'JOB_TIMEOUT') {
        // Save checkpoint for resume
        await this.saveTimeoutCheckpoint(job);
        throw new Error(`Job timed out after ${maxDuration}ms`);
      }
      throw error;
    }
  }

  private async doWork(job: Job<TimeoutJobData>, startTime: number, maxDuration: number) {
    const items = 1000;
    const results = [];

    for (let i = 0; i < items; i++) {
      // Check time remaining
      const elapsed = Date.now() - startTime;
      if (elapsed > maxDuration * 0.9) {
        // 90% of timeout reached - stop gracefully
        console.log('Approaching timeout, stopping gracefully');
        break;
      }

      results.push(await this.processItem(i));
      await job.updateProgress((i + 1) / items * 100);
    }

    return { processed: results.length };
  }

  private async processItem(index: number) {
    await new Promise(resolve => setTimeout(resolve, 10));
    return { index };
  }

  private async saveTimeoutCheckpoint(job: Job<TimeoutJobData>) {
    // Save current state for resume
    console.log(`Saving checkpoint for timed out job ${job.id}`);
  }
}
```

## Monitoring Long-Running Jobs

Track and alert on long-running jobs:

```typescript
class LongJobMonitor {
  private queue: Queue;
  private alertThreshold: number = 3600000; // 1 hour

  constructor(queue: Queue) {
    this.queue = queue;
  }

  async getRunningJobs() {
    const active = await this.queue.getActive();
    const now = Date.now();

    return active.map(job => ({
      id: job.id,
      name: job.name,
      startedAt: job.processedOn,
      runningTime: job.processedOn ? now - job.processedOn : 0,
      progress: job.progress,
      data: job.data,
    }));
  }

  async checkForLongRunning(): Promise<any[]> {
    const jobs = await this.getRunningJobs();
    const now = Date.now();

    return jobs.filter(job => job.runningTime > this.alertThreshold);
  }

  async getJobMetrics(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const now = Date.now();

    return {
      id: job.id,
      state,
      progress: job.progress,
      addedAt: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
      waitTime: job.processedOn ? job.processedOn - job.timestamp : now - job.timestamp,
      processingTime: job.processedOn
        ? (job.finishedOn || now) - job.processedOn
        : 0,
    };
  }

  startMonitoring(intervalMs: number = 60000) {
    setInterval(async () => {
      const longRunning = await this.checkForLongRunning();
      if (longRunning.length > 0) {
        console.warn(`Found ${longRunning.length} long-running jobs:`);
        longRunning.forEach(job => {
          console.warn(`  Job ${job.id}: running for ${Math.round(job.runningTime / 60000)} minutes`);
        });
      }
    }, intervalMs);
  }
}
```

## Best Practices

1. **Configure lock duration** - Set lockDuration longer than expected job duration.

2. **Extend locks proactively** - Use `extendLock` for jobs exceeding lock duration.

3. **Update progress frequently** - Regular progress updates show the job is alive.

4. **Implement checkpointing** - Save state periodically for recovery.

5. **Break into chunks** - Use flows to split very long jobs.

6. **Set appropriate timeouts** - Balance between completion and failure detection.

7. **Monitor actively** - Track long-running jobs and alert on anomalies.

8. **Handle graceful shutdown** - Save state when workers are stopping.

9. **Use staged progress** - Show detailed stage-by-stage progress.

10. **Test failure scenarios** - Verify recovery works correctly.

## Conclusion

Long-running jobs require careful handling in BullMQ to ensure reliability and visibility. By properly configuring timeouts, implementing progress tracking, and using checkpointing for recovery, you can build robust systems that handle jobs lasting minutes or hours. Remember to monitor your long-running jobs and implement alerting to catch issues before they become problems.
