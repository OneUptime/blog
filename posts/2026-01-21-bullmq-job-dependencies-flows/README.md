# How to Implement Job Dependencies with BullMQ Flows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Job Flows, Workflow, DAG, Parent-Child Jobs

Description: A comprehensive guide to implementing job dependencies using BullMQ Flows, including parent-child relationships, complex workflow orchestration, error handling in flows, and patterns for building reliable multi-step job pipelines.

---

BullMQ Flows enable you to create complex job dependencies where parent jobs wait for their children to complete. This powerful feature is essential for building multi-step workflows, data pipelines, and orchestrated processing systems. This guide covers everything from basic flows to advanced workflow patterns.

## Understanding BullMQ Flows

A flow in BullMQ consists of:
- A **parent job** that depends on child jobs
- **Child jobs** that must complete before the parent can proceed
- A **tree structure** where jobs can have multiple children

```typescript
import { FlowProducer, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Create a flow producer
const flowProducer = new FlowProducer({ connection });

// Define a simple flow
const flow = await flowProducer.add({
  name: 'parent-job',
  queueName: 'parent-queue',
  data: { step: 'final' },
  children: [
    {
      name: 'child-1',
      queueName: 'child-queue',
      data: { task: 'first' },
    },
    {
      name: 'child-2',
      queueName: 'child-queue',
      data: { task: 'second' },
    },
  ],
});
```

## Basic Flow Patterns

### Simple Parent-Child Flow

```typescript
interface ParentJobData {
  orderId: string;
  type: 'order-processing';
}

interface ChildJobData {
  orderId: string;
  task: string;
}

const flowProducer = new FlowProducer({ connection });

// Create an order processing flow
async function createOrderFlow(orderId: string) {
  return flowProducer.add({
    name: 'complete-order',
    queueName: 'orders',
    data: { orderId, type: 'order-processing' },
    children: [
      {
        name: 'validate-payment',
        queueName: 'payments',
        data: { orderId, task: 'validate' },
      },
      {
        name: 'check-inventory',
        queueName: 'inventory',
        data: { orderId, task: 'check' },
      },
      {
        name: 'calculate-shipping',
        queueName: 'shipping',
        data: { orderId, task: 'calculate' },
      },
    ],
  });
}

// Workers for each queue
const paymentWorker = new Worker('payments', async (job) => {
  console.log(`Validating payment for order ${job.data.orderId}`);
  // Simulate payment validation
  return { valid: true, amount: 99.99 };
}, { connection });

const inventoryWorker = new Worker('inventory', async (job) => {
  console.log(`Checking inventory for order ${job.data.orderId}`);
  return { available: true, items: ['item1', 'item2'] };
}, { connection });

const shippingWorker = new Worker('shipping', async (job) => {
  console.log(`Calculating shipping for order ${job.data.orderId}`);
  return { method: 'standard', cost: 5.99 };
}, { connection });

// Parent worker - runs after all children complete
const orderWorker = new Worker('orders', async (job) => {
  console.log(`Completing order ${job.data.orderId}`);

  // Access children's results
  const childrenValues = await job.getChildrenValues();
  console.log('Children results:', childrenValues);

  return {
    status: 'completed',
    orderId: job.data.orderId,
    childResults: childrenValues,
  };
}, { connection });
```

### Nested Flows (Multi-Level Dependencies)

```typescript
async function createNestedFlow() {
  return flowProducer.add({
    name: 'root-job',
    queueName: 'root',
    data: { level: 0 },
    children: [
      {
        name: 'level-1-a',
        queueName: 'level-1',
        data: { level: 1, branch: 'a' },
        children: [
          {
            name: 'level-2-a1',
            queueName: 'level-2',
            data: { level: 2, branch: 'a1' },
          },
          {
            name: 'level-2-a2',
            queueName: 'level-2',
            data: { level: 2, branch: 'a2' },
          },
        ],
      },
      {
        name: 'level-1-b',
        queueName: 'level-1',
        data: { level: 1, branch: 'b' },
        children: [
          {
            name: 'level-2-b1',
            queueName: 'level-2',
            data: { level: 2, branch: 'b1' },
          },
        ],
      },
    ],
  });
}
```

## Accessing Parent and Children Data

### Getting Children Results in Parent

```typescript
const parentWorker = new Worker('parent-queue', async (job) => {
  // Get all children values (keyed by queue:jobId)
  const childrenValues = await job.getChildrenValues();

  // childrenValues looks like:
  // {
  //   'child-queue:job-id-1': { result: 'from child 1' },
  //   'child-queue:job-id-2': { result: 'from child 2' },
  // }

  console.log('All children completed with:', childrenValues);

  // Aggregate results
  const allResults = Object.values(childrenValues);

  return {
    parentResult: 'processed',
    childCount: allResults.length,
    aggregatedData: allResults,
  };
}, { connection });
```

### Getting Parent Data in Child

```typescript
const childWorker = new Worker('child-queue', async (job) => {
  // Access parent job info
  const parentKey = job.parentKey;

  if (parentKey) {
    const [parentQueueName, parentId] = parentKey.split(':');
    const parentQueue = new Queue(parentQueueName, { connection });
    const parentJob = await parentQueue.getJob(parentId);

    if (parentJob) {
      console.log('Parent job data:', parentJob.data);
    }
  }

  return { processed: true };
}, { connection });
```

## Data Pipeline Example

Build a complete data processing pipeline:

```typescript
interface DataPipelineConfig {
  sourceFile: string;
  outputFormat: 'json' | 'csv' | 'parquet';
  transformations: string[];
}

class DataPipelineOrchestrator {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async createPipeline(config: DataPipelineConfig) {
    const pipelineId = `pipeline_${Date.now()}`;

    return this.flowProducer.add({
      name: 'finalize-pipeline',
      queueName: 'pipeline-finalize',
      data: {
        pipelineId,
        outputFormat: config.outputFormat,
      },
      children: [
        {
          name: 'transform-data',
          queueName: 'pipeline-transform',
          data: {
            pipelineId,
            transformations: config.transformations,
          },
          children: [
            {
              name: 'validate-data',
              queueName: 'pipeline-validate',
              data: { pipelineId },
              children: [
                {
                  name: 'extract-data',
                  queueName: 'pipeline-extract',
                  data: {
                    pipelineId,
                    sourceFile: config.sourceFile,
                  },
                },
              ],
            },
          ],
        },
      ],
    });
  }
}

// Workers for each stage
const extractWorker = new Worker('pipeline-extract', async (job) => {
  console.log(`Extracting data from ${job.data.sourceFile}`);
  // Read and parse source file
  const rawData = await readFile(job.data.sourceFile);
  return { records: rawData.length, data: rawData };
}, { connection });

const validateWorker = new Worker('pipeline-validate', async (job) => {
  const childResults = await job.getChildrenValues();
  const extractedData = Object.values(childResults)[0];

  console.log(`Validating ${extractedData.records} records`);
  // Validate data
  const validRecords = extractedData.data.filter(isValid);

  return {
    validCount: validRecords.length,
    invalidCount: extractedData.records - validRecords.length,
    data: validRecords,
  };
}, { connection });

const transformWorker = new Worker('pipeline-transform', async (job) => {
  const childResults = await job.getChildrenValues();
  const validatedData = Object.values(childResults)[0];

  console.log(`Applying transformations: ${job.data.transformations.join(', ')}`);

  let data = validatedData.data;
  for (const transform of job.data.transformations) {
    data = applyTransformation(data, transform);
  }

  return { transformedCount: data.length, data };
}, { connection });

const finalizeWorker = new Worker('pipeline-finalize', async (job) => {
  const childResults = await job.getChildrenValues();
  const transformedData = Object.values(childResults)[0];

  console.log(`Finalizing pipeline with ${transformedData.transformedCount} records`);

  // Write output in specified format
  const outputPath = await writeOutput(
    transformedData.data,
    job.data.outputFormat
  );

  return {
    pipelineId: job.data.pipelineId,
    status: 'completed',
    outputPath,
    recordCount: transformedData.transformedCount,
  };
}, { connection });
```

## Dynamic Flow Generation

Create flows dynamically based on input:

```typescript
interface ImageProcessingConfig {
  images: string[];
  operations: ('resize' | 'compress' | 'watermark')[];
}

class ImageProcessingPipeline {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async processImages(config: ImageProcessingConfig) {
    const batchId = `batch_${Date.now()}`;

    // Create child jobs for each image
    const imageChildren = config.images.map((imageUrl, index) => ({
      name: `process-image-${index}`,
      queueName: 'image-processing',
      data: {
        batchId,
        imageUrl,
        operations: config.operations,
        index,
      },
    }));

    return this.flowProducer.add({
      name: 'complete-batch',
      queueName: 'batch-completion',
      data: {
        batchId,
        totalImages: config.images.length,
      },
      children: imageChildren,
    });
  }
}

// Image processing worker
const imageWorker = new Worker('image-processing', async (job) => {
  const { imageUrl, operations, index } = job.data;

  console.log(`Processing image ${index}: ${imageUrl}`);
  await job.updateProgress(10);

  let processedUrl = imageUrl;
  for (let i = 0; i < operations.length; i++) {
    processedUrl = await applyOperation(processedUrl, operations[i]);
    await job.updateProgress(10 + ((i + 1) / operations.length) * 80);
  }

  await job.updateProgress(100);

  return {
    originalUrl: imageUrl,
    processedUrl,
    operations: operations,
  };
}, { connection });

// Batch completion worker
const batchWorker = new Worker('batch-completion', async (job) => {
  const childResults = await job.getChildrenValues();

  const results = Object.values(childResults);
  const successCount = results.filter(r => r.processedUrl).length;

  return {
    batchId: job.data.batchId,
    totalImages: job.data.totalImages,
    successCount,
    failedCount: job.data.totalImages - successCount,
    results,
  };
}, { connection });
```

## Error Handling in Flows

Handle failures gracefully in flow hierarchies:

```typescript
class ResilientFlowOrchestrator {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async createResilientFlow(data: any) {
    return this.flowProducer.add({
      name: 'parent-with-retry',
      queueName: 'parent',
      data,
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
      children: [
        {
          name: 'critical-child',
          queueName: 'critical',
          data: { critical: true },
          opts: {
            attempts: 5, // More retries for critical tasks
            backoff: { type: 'exponential', delay: 2000 },
          },
        },
        {
          name: 'optional-child',
          queueName: 'optional',
          data: { optional: true },
          opts: {
            attempts: 2,
            failParentOnFailure: false, // Don't fail parent if this fails
          },
        },
      ],
    });
  }
}

// Worker with error handling
const criticalWorker = new Worker('critical', async (job) => {
  try {
    const result = await performCriticalTask(job.data);
    return result;
  } catch (error) {
    console.error(`Critical task failed: ${error.message}`);

    // Check if we should retry
    if (isTransientError(error)) {
      throw error; // Will be retried
    }

    // Non-retryable error - fail permanently
    throw new Error(`PERMANENT: ${error.message}`);
  }
}, { connection });

// Handle flow events
const queueEvents = new QueueEvents('parent', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Flow completed: ${jobId}`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Flow failed: ${jobId}`, failedReason);
});
```

## Getting Flow Status

Monitor the status of entire flows:

```typescript
class FlowStatusTracker {
  private flowProducer: FlowProducer;

  constructor(private connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async getFlowStatus(flowJobId: string, queueName: string) {
    const queue = new Queue(queueName, { connection: this.connection });
    const job = await queue.getJob(flowJobId);

    if (!job) {
      return null;
    }

    const status = await this.getJobTreeStatus(job);
    return status;
  }

  private async getJobTreeStatus(job: Job): Promise<any> {
    const state = await job.getState();
    const progress = job.progress;

    // Get children status
    const dependencies = await job.getDependencies();
    const childrenStatus: any[] = [];

    if (dependencies.processed) {
      for (const [key, childJob] of Object.entries(dependencies.processed)) {
        if (childJob) {
          childrenStatus.push({
            key,
            state: 'completed',
            returnvalue: childJob.returnvalue,
          });
        }
      }
    }

    if (dependencies.unprocessed) {
      for (const key of dependencies.unprocessed) {
        const [queueName, jobId] = key.split(':');
        const childQueue = new Queue(queueName, { connection: this.connection });
        const childJob = await childQueue.getJob(jobId);
        if (childJob) {
          const childState = await childJob.getState();
          childrenStatus.push({
            key,
            state: childState,
            progress: childJob.progress,
          });
        }
      }
    }

    return {
      jobId: job.id,
      name: job.name,
      state,
      progress,
      data: job.data,
      children: childrenStatus,
    };
  }
}
```

## Complex Workflow Example: Video Processing

```typescript
interface VideoProcessingRequest {
  videoUrl: string;
  outputFormats: ('720p' | '1080p' | '4k')[];
  generateThumbnails: boolean;
  extractAudio: boolean;
}

class VideoProcessingWorkflow {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async processVideo(request: VideoProcessingRequest) {
    const jobId = `video_${Date.now()}`;

    const children: any[] = [];

    // Add transcoding jobs for each format
    for (const format of request.outputFormats) {
      children.push({
        name: `transcode-${format}`,
        queueName: 'video-transcode',
        data: {
          videoUrl: request.videoUrl,
          format,
          jobId,
        },
        opts: {
          attempts: 3,
          timeout: 3600000, // 1 hour
        },
      });
    }

    // Add thumbnail generation if requested
    if (request.generateThumbnails) {
      children.push({
        name: 'generate-thumbnails',
        queueName: 'thumbnail-generation',
        data: {
          videoUrl: request.videoUrl,
          count: 10,
          jobId,
        },
      });
    }

    // Add audio extraction if requested
    if (request.extractAudio) {
      children.push({
        name: 'extract-audio',
        queueName: 'audio-extraction',
        data: {
          videoUrl: request.videoUrl,
          format: 'mp3',
          jobId,
        },
      });
    }

    return this.flowProducer.add({
      name: 'finalize-video-processing',
      queueName: 'video-finalization',
      data: {
        jobId,
        originalUrl: request.videoUrl,
        requestedFormats: request.outputFormats,
      },
      children,
    });
  }
}

// Workers
const transcodeWorker = new Worker('video-transcode', async (job) => {
  const { videoUrl, format } = job.data;
  console.log(`Transcoding ${videoUrl} to ${format}`);

  // Simulate transcoding with progress
  for (let i = 0; i <= 100; i += 10) {
    await job.updateProgress(i);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    format,
    outputUrl: `https://cdn.example.com/videos/${job.data.jobId}/${format}.mp4`,
    duration: 120,
    size: format === '4k' ? 5000000000 : format === '1080p' ? 2000000000 : 1000000000,
  };
}, { connection, concurrency: 2 });

const thumbnailWorker = new Worker('thumbnail-generation', async (job) => {
  const { videoUrl, count } = job.data;
  console.log(`Generating ${count} thumbnails for ${videoUrl}`);

  const thumbnails = [];
  for (let i = 0; i < count; i++) {
    thumbnails.push(`https://cdn.example.com/thumbnails/${job.data.jobId}/thumb_${i}.jpg`);
    await job.updateProgress((i + 1) / count * 100);
  }

  return { thumbnails };
}, { connection });

const audioWorker = new Worker('audio-extraction', async (job) => {
  console.log(`Extracting audio from ${job.data.videoUrl}`);
  return {
    audioUrl: `https://cdn.example.com/audio/${job.data.jobId}.mp3`,
    duration: 120,
  };
}, { connection });

const finalizationWorker = new Worker('video-finalization', async (job) => {
  const childResults = await job.getChildrenValues();

  const outputs: any = {
    jobId: job.data.jobId,
    originalUrl: job.data.originalUrl,
    videos: [],
    thumbnails: [],
    audio: null,
  };

  for (const [key, result] of Object.entries(childResults)) {
    if (key.includes('transcode')) {
      outputs.videos.push(result);
    } else if (key.includes('thumbnail')) {
      outputs.thumbnails = result.thumbnails;
    } else if (key.includes('audio')) {
      outputs.audio = result;
    }
  }

  return outputs;
}, { connection });
```

## Best Practices

1. **Use descriptive job names** - Include context in names for easier debugging.

2. **Keep flows shallow** - Deep nesting increases complexity and debugging difficulty.

3. **Handle partial failures** - Use `failParentOnFailure: false` for optional steps.

4. **Monitor flow progress** - Aggregate child progress for overall flow status.

5. **Set appropriate timeouts** - Long-running children should have explicit timeouts.

6. **Clean up completed flows** - Configure `removeOnComplete` to manage memory.

7. **Use unique flow IDs** - Include identifiers for tracking related jobs.

8. **Test flows thoroughly** - Test various failure scenarios.

9. **Document flow structures** - Maintain diagrams of complex flows.

10. **Consider idempotency** - Child jobs should be idempotent for retry safety.

## Conclusion

BullMQ Flows provide a powerful way to orchestrate complex job dependencies. By structuring your workflows as parent-child relationships, you can build sophisticated data pipelines, multi-step processing systems, and coordinated job executions. With proper error handling and monitoring, flows enable you to manage complex asynchronous operations reliably and efficiently.
