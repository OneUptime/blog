# How to Use BullMQ Flow Producer for Job Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Job Pipelines, Workflow Orchestration, DAG, Flow Producer

Description: A comprehensive guide to using BullMQ Flow Producer for building complex job pipelines and workflows, including parent-child dependencies, parallel execution, result aggregation, and orchestrating multi-step processes.

---

BullMQ Flow Producer enables building complex job pipelines where jobs have dependencies on other jobs. This is essential for workflows like data processing pipelines, order fulfillment systems, or any multi-step process where steps must complete in a specific order. This guide covers how to use Flow Producer effectively.

## Understanding Flow Producer

Flow Producer creates job hierarchies where parent jobs wait for their children to complete:

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

// Create a simple flow
const flow = await flowProducer.add({
  name: 'parent-job',
  queueName: 'parent-queue',
  data: { type: 'aggregate' },
  children: [
    {
      name: 'child-1',
      queueName: 'child-queue',
      data: { item: 1 },
    },
    {
      name: 'child-2',
      queueName: 'child-queue',
      data: { item: 2 },
    },
  ],
});
```

## Building Multi-Stage Pipelines

Create pipelines with multiple processing stages:

```typescript
interface PipelineStageData {
  pipelineId: string;
  stage: string;
  input?: any;
}

class DataPipeline {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async createPipeline(inputData: any) {
    const pipelineId = `pipeline_${Date.now()}`;

    // Create a pipeline: extract -> transform -> load -> notify
    return this.flowProducer.add({
      name: 'notify',
      queueName: 'pipeline-notify',
      data: { pipelineId, stage: 'notify' },
      children: [
        {
          name: 'load',
          queueName: 'pipeline-load',
          data: { pipelineId, stage: 'load' },
          children: [
            {
              name: 'transform',
              queueName: 'pipeline-transform',
              data: { pipelineId, stage: 'transform' },
              children: [
                {
                  name: 'extract',
                  queueName: 'pipeline-extract',
                  data: { pipelineId, stage: 'extract', input: inputData },
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
  console.log(`Extracting data for pipeline ${job.data.pipelineId}`);
  const extracted = await extractData(job.data.input);
  return { records: extracted, count: extracted.length };
}, { connection });

const transformWorker = new Worker('pipeline-transform', async (job) => {
  const childValues = await job.getChildrenValues();
  const extractResult = Object.values(childValues)[0] as any;

  console.log(`Transforming ${extractResult.count} records`);
  const transformed = await transformData(extractResult.records);
  return { records: transformed, count: transformed.length };
}, { connection });

const loadWorker = new Worker('pipeline-load', async (job) => {
  const childValues = await job.getChildrenValues();
  const transformResult = Object.values(childValues)[0] as any;

  console.log(`Loading ${transformResult.count} records`);
  await loadData(transformResult.records);
  return { loaded: transformResult.count };
}, { connection });

const notifyWorker = new Worker('pipeline-notify', async (job) => {
  const childValues = await job.getChildrenValues();
  const loadResult = Object.values(childValues)[0] as any;

  console.log(`Pipeline complete, loaded ${loadResult.loaded} records`);
  await sendNotification(job.data.pipelineId, loadResult);
  return { pipelineId: job.data.pipelineId, success: true };
}, { connection });
```

## Parallel Processing with Fan-Out

Process multiple items in parallel then aggregate:

```typescript
class ParallelProcessor {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async processInParallel(items: any[]) {
    const batchId = `batch_${Date.now()}`;

    // Create parallel children
    const children = items.map((item, index) => ({
      name: `process-item-${index}`,
      queueName: 'item-processor',
      data: { batchId, index, item },
    }));

    // Parent aggregates all children results
    return this.flowProducer.add({
      name: 'aggregate-results',
      queueName: 'aggregator',
      data: { batchId, totalItems: items.length },
      children,
    });
  }
}

// Item processor worker
const itemWorker = new Worker('item-processor', async (job) => {
  const { index, item } = job.data;
  console.log(`Processing item ${index}`);

  const result = await processItem(item);
  return { index, result, success: true };
}, {
  connection,
  concurrency: 10, // Process 10 items in parallel
});

// Aggregator worker
const aggregatorWorker = new Worker('aggregator', async (job) => {
  const childValues = await job.getChildrenValues();
  const results = Object.values(childValues) as any[];

  // Sort by index to maintain order
  results.sort((a, b) => a.index - b.index);

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  return {
    batchId: job.data.batchId,
    totalItems: job.data.totalItems,
    successful,
    failed,
    results: results.map(r => r.result),
  };
}, { connection });
```

## Complex Workflow with Multiple Dependencies

Build workflows with complex dependency graphs:

```typescript
interface OrderProcessingData {
  orderId: string;
  items: Array<{ productId: string; quantity: number }>;
  customerId: string;
  shippingAddress: any;
}

class OrderWorkflow {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async processOrder(order: OrderProcessingData) {
    // Workflow:
    // 1. Validate order (parallel: validate items, validate customer)
    // 2. Process payment
    // 3. Fulfill order (parallel: reserve inventory, prepare shipping)
    // 4. Send confirmation

    return this.flowProducer.add({
      name: 'send-confirmation',
      queueName: 'order-confirmation',
      data: { orderId: order.orderId },
      children: [
        {
          name: 'fulfill-order',
          queueName: 'order-fulfillment',
          data: { orderId: order.orderId },
          children: [
            {
              name: 'reserve-inventory',
              queueName: 'inventory',
              data: { orderId: order.orderId, items: order.items },
              children: [
                {
                  name: 'process-payment',
                  queueName: 'payment',
                  data: { orderId: order.orderId, customerId: order.customerId },
                  children: [
                    {
                      name: 'validate-order',
                      queueName: 'validation',
                      data: { orderId: order.orderId },
                      children: [
                        {
                          name: 'validate-items',
                          queueName: 'item-validation',
                          data: { items: order.items },
                        },
                        {
                          name: 'validate-customer',
                          queueName: 'customer-validation',
                          data: { customerId: order.customerId },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: 'prepare-shipping',
              queueName: 'shipping',
              data: { orderId: order.orderId, address: order.shippingAddress },
              children: [
                {
                  name: 'process-payment',
                  queueName: 'payment',
                  data: { orderId: order.orderId, customerId: order.customerId },
                  // This references the same payment job, creating a diamond dependency
                },
              ],
            },
          ],
        },
      ],
    });
  }
}
```

## Getting Results from Child Jobs

Access child job results in parent:

```typescript
const parentWorker = new Worker('parent-queue', async (job) => {
  // Get all children values
  const childrenValues = await job.getChildrenValues();

  // childrenValues is an object keyed by "queueName:jobId"
  // Example: { "child-queue:123": { result: "value" } }

  console.log('All children completed with:', childrenValues);

  // Process results
  const results = Object.entries(childrenValues).map(([key, value]) => {
    const [queueName, jobId] = key.split(':');
    return { queueName, jobId, value };
  });

  // Aggregate results
  const aggregated = results.reduce((acc, r) => {
    acc.total += (r.value as any).count || 0;
    return acc;
  }, { total: 0 });

  return aggregated;
}, { connection });
```

## Flow with Job Options

Configure individual job options within flows:

```typescript
await flowProducer.add({
  name: 'parent',
  queueName: 'parent-queue',
  data: { type: 'aggregate' },
  opts: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    priority: 1,
  },
  children: [
    {
      name: 'critical-child',
      queueName: 'child-queue',
      data: { critical: true },
      opts: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        priority: 0, // Highest priority
      },
    },
    {
      name: 'optional-child',
      queueName: 'child-queue',
      data: { optional: true },
      opts: {
        attempts: 1,
        failParentOnFailure: false, // Don't fail parent if this fails
      },
    },
  ],
});
```

## Monitoring Flow Progress

Track overall flow progress:

```typescript
class FlowProgressTracker {
  private queue: Queue;
  private queueEvents: QueueEvents;
  private flowStatus: Map<string, {
    totalJobs: number;
    completed: number;
    failed: number;
    active: number;
  }> = new Map();

  constructor(queueName: string, connection: Redis) {
    this.queue = new Queue(queueName, { connection });
    this.queueEvents = new QueueEvents(queueName, { connection });
    this.setupListeners();
  }

  private setupListeners() {
    this.queueEvents.on('completed', ({ jobId }) => {
      this.updateFlowStatus(jobId, 'completed');
    });

    this.queueEvents.on('failed', ({ jobId }) => {
      this.updateFlowStatus(jobId, 'failed');
    });
  }

  private async updateFlowStatus(jobId: string, event: 'completed' | 'failed') {
    // Update flow tracking logic
  }

  async getFlowProgress(parentJobId: string): Promise<{
    progress: number;
    status: string;
    jobs: { id: string; name: string; state: string }[];
  }> {
    const job = await this.queue.getJob(parentJobId);
    if (!job) {
      return { progress: 0, status: 'not_found', jobs: [] };
    }

    const dependencies = await job.getDependencies();
    const allJobs: any[] = [];

    // Collect all dependency jobs
    if (dependencies.processed) {
      for (const [key, childJob] of Object.entries(dependencies.processed)) {
        allJobs.push({
          key,
          state: 'completed',
          result: childJob,
        });
      }
    }

    if (dependencies.unprocessed) {
      for (const key of dependencies.unprocessed) {
        allJobs.push({
          key,
          state: 'pending',
        });
      }
    }

    const completed = allJobs.filter(j => j.state === 'completed').length;
    const total = allJobs.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    const parentState = await job.getState();

    return {
      progress,
      status: parentState,
      jobs: allJobs,
    };
  }
}
```

## Error Handling in Flows

Handle errors at different levels of the flow:

```typescript
// Configure child failure behavior
await flowProducer.add({
  name: 'resilient-parent',
  queueName: 'parent',
  data: {},
  opts: {
    attempts: 2,
  },
  children: [
    {
      name: 'must-succeed',
      queueName: 'critical',
      data: {},
      opts: {
        attempts: 5,
        failParentOnFailure: true, // Default - parent fails if this fails
      },
    },
    {
      name: 'optional-task',
      queueName: 'optional',
      data: {},
      opts: {
        attempts: 2,
        failParentOnFailure: false, // Parent continues even if this fails
      },
    },
  ],
});

// Worker that checks for failed optional children
const parentWorker = new Worker('parent', async (job) => {
  const childrenValues = await job.getChildrenValues();

  // Check which children succeeded
  const results = Object.entries(childrenValues);

  // Handle partial success
  const successful = results.filter(([_, v]) => v !== null);
  const failed = results.filter(([_, v]) => v === null);

  if (failed.length > 0) {
    console.log(`Some optional children failed: ${failed.map(f => f[0]).join(', ')}`);
  }

  return {
    totalChildren: results.length,
    successful: successful.length,
    failed: failed.length,
  };
}, { connection });
```

## Dynamic Flow Generation

Generate flows dynamically based on input:

```typescript
class DynamicFlowBuilder {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async buildProcessingFlow(config: {
    sources: string[];
    transformations: string[];
    destinations: string[];
  }) {
    const flowId = `flow_${Date.now()}`;

    // Build source extraction children
    const sourceChildren = config.sources.map((source, i) => ({
      name: `extract-${source}`,
      queueName: 'extraction',
      data: { flowId, source, index: i },
    }));

    // Build transformation chain
    let transformChildren = sourceChildren;
    for (const transform of config.transformations) {
      transformChildren = [{
        name: `transform-${transform}`,
        queueName: 'transformation',
        data: { flowId, transform },
        children: transformChildren,
      }];
    }

    // Build destination loading children (all depend on transformations)
    const loadChildren = config.destinations.map((dest, i) => ({
      name: `load-${dest}`,
      queueName: 'loading',
      data: { flowId, destination: dest, index: i },
      children: transformChildren,
    }));

    // Final aggregation
    return this.flowProducer.add({
      name: 'complete-flow',
      queueName: 'flow-completion',
      data: { flowId, config },
      children: loadChildren,
    });
  }
}
```

## Best Practices

1. **Keep flows shallow when possible** - Deep nesting increases complexity.

2. **Use unique job IDs** - Makes tracking and debugging easier.

3. **Handle partial failures** - Use `failParentOnFailure: false` for optional steps.

4. **Monitor flow progress** - Track completion across all children.

5. **Set appropriate timeouts** - Long-running children need longer timeouts.

6. **Clean up completed flows** - Configure `removeOnComplete` appropriately.

7. **Test flow structures** - Verify dependencies work as expected.

8. **Document flow architecture** - Complex flows need documentation.

9. **Log flow IDs** - Include flow identifiers in all job logs.

10. **Consider idempotency** - Children may be retried after failures.

## Conclusion

BullMQ Flow Producer is a powerful tool for building complex job pipelines and workflows. By defining parent-child relationships, you can orchestrate multi-step processes where each step depends on the completion of previous steps. Whether you're building ETL pipelines, order processing systems, or any workflow with dependencies, Flow Producer provides the foundation for reliable, scalable job orchestration.
