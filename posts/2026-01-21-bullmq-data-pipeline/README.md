# How to Build a Data Processing Pipeline with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Data Pipeline, ETL, Stream Processing, Data Engineering, Batch Processing

Description: A comprehensive guide to building data processing pipelines with BullMQ, including ETL workflows, stream processing, data transformation, aggregation, and handling large-scale data operations.

---

Data processing pipelines are essential for ETL operations, analytics, and data transformation. BullMQ provides an excellent foundation for building scalable, reliable pipelines that can handle large volumes of data. This guide covers building production-ready data pipelines.

## Basic Pipeline Setup

Create a simple data processing pipeline:

```typescript
import { Queue, Worker, FlowProducer, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Pipeline stage queues
const extractQueue = new Queue('pipeline-extract', { connection });
const transformQueue = new Queue('pipeline-transform', { connection });
const loadQueue = new Queue('pipeline-load', { connection });

// Extract worker
const extractWorker = new Worker(
  'pipeline-extract',
  async (job) => {
    const { source, query, batchSize } = job.data;

    await job.log(`Extracting from ${source}`);

    // Simulate data extraction
    const records = await extractFromSource(source, query, batchSize);

    await job.log(`Extracted ${records.length} records`);

    return {
      records,
      source,
      extractedAt: new Date().toISOString(),
    };
  },
  { connection, concurrency: 2 }
);

// Transform worker
const transformWorker = new Worker(
  'pipeline-transform',
  async (job) => {
    const childValues = await job.getChildrenValues();
    const extractResult = Object.values(childValues)[0] as any;

    await job.log(`Transforming ${extractResult.records.length} records`);

    const transformed = await transformRecords(extractResult.records);

    return {
      records: transformed,
      transformedAt: new Date().toISOString(),
    };
  },
  { connection, concurrency: 3 }
);

// Load worker
const loadWorker = new Worker(
  'pipeline-load',
  async (job) => {
    const childValues = await job.getChildrenValues();
    const transformResult = Object.values(childValues)[0] as any;

    await job.log(`Loading ${transformResult.records.length} records`);

    const loadedCount = await loadToDestination(transformResult.records);

    return {
      loadedCount,
      loadedAt: new Date().toISOString(),
    };
  },
  { connection, concurrency: 2 }
);

// Helper functions
async function extractFromSource(source: string, query: any, batchSize: number): Promise<any[]> {
  // Implementation for data extraction
  return [];
}

async function transformRecords(records: any[]): Promise<any[]> {
  // Implementation for data transformation
  return records;
}

async function loadToDestination(records: any[]): Promise<number> {
  // Implementation for data loading
  return records.length;
}
```

## ETL Pipeline with Flows

Create a complete ETL pipeline using BullMQ Flows:

```typescript
interface ETLConfig {
  pipelineId: string;
  source: {
    type: 'database' | 'api' | 'file';
    config: Record<string, any>;
  };
  transforms: Array<{
    type: string;
    config: Record<string, any>;
  }>;
  destination: {
    type: 'database' | 'api' | 'file';
    config: Record<string, any>;
  };
}

class ETLPipeline {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
    this.setupWorkers(connection);
  }

  private setupWorkers(connection: Redis): void {
    // Extract worker
    new Worker(
      'etl-extract',
      async (job) => {
        const { source } = job.data;
        await job.log(`Starting extraction from ${source.type}`);

        let records: any[] = [];

        switch (source.type) {
          case 'database':
            records = await this.extractFromDatabase(source.config);
            break;
          case 'api':
            records = await this.extractFromAPI(source.config);
            break;
          case 'file':
            records = await this.extractFromFile(source.config);
            break;
        }

        await job.log(`Extracted ${records.length} records`);

        return { records, count: records.length };
      },
      { connection, concurrency: 2 }
    );

    // Transform worker
    new Worker(
      'etl-transform',
      async (job) => {
        const { transforms } = job.data;
        const childValues = await job.getChildrenValues();
        let records = (Object.values(childValues)[0] as any).records;

        for (const transform of transforms) {
          await job.log(`Applying transform: ${transform.type}`);
          records = await this.applyTransform(records, transform);
        }

        return { records, count: records.length };
      },
      { connection, concurrency: 3 }
    );

    // Load worker
    new Worker(
      'etl-load',
      async (job) => {
        const { destination } = job.data;
        const childValues = await job.getChildrenValues();
        const { records } = Object.values(childValues)[0] as any;

        await job.log(`Loading ${records.length} records to ${destination.type}`);

        let loaded = 0;

        switch (destination.type) {
          case 'database':
            loaded = await this.loadToDatabase(records, destination.config);
            break;
          case 'api':
            loaded = await this.loadToAPI(records, destination.config);
            break;
          case 'file':
            loaded = await this.loadToFile(records, destination.config);
            break;
        }

        return { loaded, completedAt: new Date().toISOString() };
      },
      { connection, concurrency: 2 }
    );
  }

  async runPipeline(config: ETLConfig): Promise<any> {
    return this.flowProducer.add({
      name: 'load',
      queueName: 'etl-load',
      data: { destination: config.destination, pipelineId: config.pipelineId },
      children: [
        {
          name: 'transform',
          queueName: 'etl-transform',
          data: { transforms: config.transforms, pipelineId: config.pipelineId },
          children: [
            {
              name: 'extract',
              queueName: 'etl-extract',
              data: { source: config.source, pipelineId: config.pipelineId },
            },
          ],
        },
      ],
    });
  }

  private async extractFromDatabase(config: any): Promise<any[]> {
    // Database extraction logic
    return [];
  }

  private async extractFromAPI(config: any): Promise<any[]> {
    // API extraction logic
    return [];
  }

  private async extractFromFile(config: any): Promise<any[]> {
    // File extraction logic
    return [];
  }

  private async applyTransform(records: any[], transform: any): Promise<any[]> {
    switch (transform.type) {
      case 'filter':
        return records.filter((r) => this.evaluateCondition(r, transform.config.condition));
      case 'map':
        return records.map((r) => this.applyMapping(r, transform.config.mapping));
      case 'aggregate':
        return this.aggregateRecords(records, transform.config);
      case 'deduplicate':
        return this.deduplicateRecords(records, transform.config.key);
      default:
        return records;
    }
  }

  private evaluateCondition(record: any, condition: any): boolean {
    // Condition evaluation logic
    return true;
  }

  private applyMapping(record: any, mapping: any): any {
    const result: any = {};
    for (const [targetField, sourceField] of Object.entries(mapping)) {
      result[targetField] = record[sourceField as string];
    }
    return result;
  }

  private aggregateRecords(records: any[], config: any): any[] {
    // Aggregation logic
    return records;
  }

  private deduplicateRecords(records: any[], key: string): any[] {
    const seen = new Set();
    return records.filter((r) => {
      const k = r[key];
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  private async loadToDatabase(records: any[], config: any): Promise<number> {
    // Database loading logic
    return records.length;
  }

  private async loadToAPI(records: any[], config: any): Promise<number> {
    // API loading logic
    return records.length;
  }

  private async loadToFile(records: any[], config: any): Promise<number> {
    // File loading logic
    return records.length;
  }
}
```

## Parallel Processing Pipeline

Process data in parallel:

```typescript
interface ParallelPipelineJobData {
  pipelineId: string;
  sourceQuery: any;
  chunkSize: number;
  parallelism: number;
}

class ParallelDataPipeline {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
    this.setupWorkers(connection);
  }

  private setupWorkers(connection: Redis): void {
    // Splitter worker - divides data into chunks
    new Worker(
      'pipeline-split',
      async (job) => {
        const { sourceQuery, chunkSize } = job.data;

        await job.log('Counting total records');
        const totalCount = await this.countRecords(sourceQuery);

        const chunks = Math.ceil(totalCount / chunkSize);
        await job.log(`Splitting into ${chunks} chunks`);

        return {
          totalCount,
          chunkSize,
          chunks,
          offsets: Array.from({ length: chunks }, (_, i) => i * chunkSize),
        };
      },
      { connection }
    );

    // Chunk processor worker
    new Worker(
      'pipeline-process-chunk',
      async (job) => {
        const { sourceQuery, offset, limit, chunkIndex } = job.data;

        await job.log(`Processing chunk ${chunkIndex}: offset=${offset}, limit=${limit}`);

        // Extract chunk
        const records = await this.extractChunk(sourceQuery, offset, limit);

        // Process records
        const processed = await this.processRecords(records);

        // Load chunk
        const loaded = await this.loadRecords(processed);

        await job.updateProgress(100);

        return {
          chunkIndex,
          processedCount: processed.length,
          loadedCount: loaded,
        };
      },
      { connection, concurrency: 5 }
    );

    // Aggregator worker - combines results
    new Worker(
      'pipeline-aggregate',
      async (job) => {
        const childValues = await job.getChildrenValues();
        const results = Object.values(childValues) as any[];

        const totalProcessed = results.reduce((sum, r) => sum + r.processedCount, 0);
        const totalLoaded = results.reduce((sum, r) => sum + r.loadedCount, 0);

        return {
          chunks: results.length,
          totalProcessed,
          totalLoaded,
          completedAt: new Date().toISOString(),
        };
      },
      { connection }
    );
  }

  async runParallelPipeline(config: ParallelPipelineJobData): Promise<any> {
    // First, split the data
    const splitQueue = new Queue('pipeline-split', { connection });
    const splitJob = await splitQueue.add('split', config);

    // Wait for split to complete
    const splitEvents = new QueueEvents('pipeline-split', { connection });
    const splitResult = await splitJob.waitUntilFinished(splitEvents, 60000) as any;

    // Create parallel chunk processing jobs
    const chunkChildren = splitResult.offsets.map((offset: number, index: number) => ({
      name: `chunk-${index}`,
      queueName: 'pipeline-process-chunk',
      data: {
        sourceQuery: config.sourceQuery,
        offset,
        limit: config.chunkSize,
        chunkIndex: index,
      },
    }));

    // Create flow with aggregation
    return this.flowProducer.add({
      name: 'aggregate',
      queueName: 'pipeline-aggregate',
      data: { pipelineId: config.pipelineId },
      children: chunkChildren,
    });
  }

  private async countRecords(query: any): Promise<number> {
    // Implementation
    return 10000;
  }

  private async extractChunk(query: any, offset: number, limit: number): Promise<any[]> {
    // Implementation
    return [];
  }

  private async processRecords(records: any[]): Promise<any[]> {
    // Implementation
    return records;
  }

  private async loadRecords(records: any[]): Promise<number> {
    // Implementation
    return records.length;
  }
}
```

## Stream Processing Pipeline

Process data as a continuous stream:

```typescript
interface StreamConfig {
  sourceStream: string;
  processingWindow: number; // milliseconds
  batchSize: number;
}

class StreamProcessingPipeline {
  private inputQueue: Queue;
  private outputQueue: Queue;
  private buffer: any[] = [];
  private lastFlush: number = Date.now();

  constructor(connection: Redis, private config: StreamConfig) {
    this.inputQueue = new Queue('stream-input', { connection });
    this.outputQueue = new Queue('stream-output', { connection });

    this.setupWorkers(connection);
    this.startWindowFlush();
  }

  private setupWorkers(connection: Redis): void {
    // Input processor - collects events
    new Worker(
      'stream-input',
      async (job) => {
        this.buffer.push({
          data: job.data,
          timestamp: Date.now(),
        });

        if (this.buffer.length >= this.config.batchSize) {
          await this.flushBuffer();
        }

        return { buffered: true };
      },
      { connection, concurrency: 10 }
    );

    // Batch processor
    new Worker(
      'stream-batch',
      async (job) => {
        const { events } = job.data;

        await job.log(`Processing batch of ${events.length} events`);

        // Aggregate events
        const aggregated = this.aggregateEvents(events);

        // Process aggregations
        const results = await this.processAggregations(aggregated);

        return results;
      },
      { connection, concurrency: 2 }
    );
  }

  private startWindowFlush(): void {
    setInterval(async () => {
      if (this.buffer.length > 0 && Date.now() - this.lastFlush >= this.config.processingWindow) {
        await this.flushBuffer();
      }
    }, 1000);
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];
    this.lastFlush = Date.now();

    const batchQueue = new Queue('stream-batch', { connection });
    await batchQueue.add('process', {
      events,
      windowStart: events[0].timestamp,
      windowEnd: events[events.length - 1].timestamp,
    });
  }

  private aggregateEvents(events: any[]): Map<string, any> {
    const aggregations = new Map();

    for (const event of events) {
      const key = event.data.key || 'default';

      if (!aggregations.has(key)) {
        aggregations.set(key, {
          count: 0,
          sum: 0,
          events: [],
        });
      }

      const agg = aggregations.get(key);
      agg.count++;
      agg.sum += event.data.value || 0;
      agg.events.push(event);
    }

    return aggregations;
  }

  private async processAggregations(aggregations: Map<string, any>): Promise<any> {
    const results = [];

    for (const [key, agg] of aggregations) {
      results.push({
        key,
        count: agg.count,
        sum: agg.sum,
        avg: agg.sum / agg.count,
      });
    }

    return results;
  }

  async ingest(event: any): Promise<Job> {
    return this.inputQueue.add('event', event);
  }
}
```

## Data Validation Pipeline

Validate data quality:

```typescript
interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  config: any;
}

interface ValidationJobData {
  records: any[];
  rules: ValidationRule[];
  failOnError: boolean;
}

class DataValidationPipeline {
  private queue: Queue<ValidationJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('data-validation', { connection });

    new Worker<ValidationJobData>(
      'data-validation',
      async (job) => this.validate(job),
      { connection, concurrency: 3 }
    );
  }

  async validateData(data: ValidationJobData): Promise<Job<ValidationJobData>> {
    return this.queue.add('validate', data);
  }

  private async validate(job: Job<ValidationJobData>): Promise<any> {
    const { records, rules, failOnError } = job.data;
    const validRecords: any[] = [];
    const invalidRecords: Array<{ record: any; errors: string[] }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const errors = this.validateRecord(record, rules);

      if (errors.length === 0) {
        validRecords.push(record);
      } else {
        invalidRecords.push({ record, errors });

        if (failOnError) {
          throw new Error(`Validation failed at record ${i}: ${errors.join(', ')}`);
        }
      }

      if (i % 100 === 0) {
        await job.updateProgress((i / records.length) * 100);
      }
    }

    return {
      totalRecords: records.length,
      validCount: validRecords.length,
      invalidCount: invalidRecords.length,
      validRecords,
      invalidRecords,
      validationRate: (validRecords.length / records.length) * 100,
    };
  }

  private validateRecord(record: any, rules: ValidationRule[]): string[] {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = record[rule.field];

      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push(`${rule.field} is required`);
          }
          break;

        case 'type':
          if (typeof value !== rule.config.expectedType) {
            errors.push(`${rule.field} should be ${rule.config.expectedType}`);
          }
          break;

        case 'range':
          if (value < rule.config.min || value > rule.config.max) {
            errors.push(`${rule.field} should be between ${rule.config.min} and ${rule.config.max}`);
          }
          break;

        case 'pattern':
          if (!new RegExp(rule.config.pattern).test(value)) {
            errors.push(`${rule.field} does not match pattern`);
          }
          break;

        case 'custom':
          if (!rule.config.validator(value, record)) {
            errors.push(rule.config.message || `${rule.field} validation failed`);
          }
          break;
      }
    }

    return errors;
  }
}
```

## Pipeline Monitoring

Monitor pipeline execution:

```typescript
interface PipelineMetrics {
  pipelineId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  stages: Array<{
    name: string;
    startTime: Date;
    endTime?: Date;
    recordsProcessed: number;
    errors: number;
  }>;
  totalRecordsProcessed: number;
  totalErrors: number;
}

class PipelineMonitor {
  private redis: Redis;
  private metrics: Map<string, PipelineMetrics> = new Map();

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async startPipeline(pipelineId: string): Promise<void> {
    const metrics: PipelineMetrics = {
      pipelineId,
      startTime: new Date(),
      status: 'running',
      stages: [],
      totalRecordsProcessed: 0,
      totalErrors: 0,
    };

    this.metrics.set(pipelineId, metrics);
    await this.persistMetrics(pipelineId, metrics);
  }

  async recordStageStart(pipelineId: string, stageName: string): Promise<void> {
    const metrics = this.metrics.get(pipelineId);
    if (!metrics) return;

    metrics.stages.push({
      name: stageName,
      startTime: new Date(),
      recordsProcessed: 0,
      errors: 0,
    });

    await this.persistMetrics(pipelineId, metrics);
  }

  async recordStageComplete(
    pipelineId: string,
    stageName: string,
    recordsProcessed: number,
    errors: number = 0
  ): Promise<void> {
    const metrics = this.metrics.get(pipelineId);
    if (!metrics) return;

    const stage = metrics.stages.find((s) => s.name === stageName);
    if (stage) {
      stage.endTime = new Date();
      stage.recordsProcessed = recordsProcessed;
      stage.errors = errors;
    }

    metrics.totalRecordsProcessed += recordsProcessed;
    metrics.totalErrors += errors;

    await this.persistMetrics(pipelineId, metrics);
  }

  async completePipeline(pipelineId: string, success: boolean): Promise<void> {
    const metrics = this.metrics.get(pipelineId);
    if (!metrics) return;

    metrics.endTime = new Date();
    metrics.status = success ? 'completed' : 'failed';

    await this.persistMetrics(pipelineId, metrics);
  }

  private async persistMetrics(pipelineId: string, metrics: PipelineMetrics): Promise<void> {
    await this.redis.set(
      `pipeline:metrics:${pipelineId}`,
      JSON.stringify(metrics),
      'EX',
      86400 * 7 // Keep for 7 days
    );
  }

  async getMetrics(pipelineId: string): Promise<PipelineMetrics | null> {
    const data = await this.redis.get(`pipeline:metrics:${pipelineId}`);
    return data ? JSON.parse(data) : null;
  }
}
```

## Best Practices

1. **Use flows for dependencies** - Model pipeline stages as parent-child relationships.

2. **Process in chunks** - Avoid loading entire datasets into memory.

3. **Implement checkpoints** - Save progress for long-running pipelines.

4. **Validate early** - Catch data issues before expensive processing.

5. **Monitor throughput** - Track records processed per second.

6. **Handle failures gracefully** - Use dead letter queues for failed records.

7. **Implement idempotency** - Allow safe retries of failed stages.

8. **Use appropriate concurrency** - Balance speed with resource usage.

9. **Log progress** - Provide visibility into pipeline execution.

10. **Test with production-like data** - Verify performance at scale.

## Conclusion

BullMQ provides a solid foundation for building data processing pipelines. By using flows for stage dependencies, parallel processing for scalability, and proper monitoring, you can build pipelines that handle large volumes of data reliably. Remember to implement proper error handling and checkpointing for long-running processes.
