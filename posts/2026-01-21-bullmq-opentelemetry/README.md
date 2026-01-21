# How to Instrument BullMQ with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, OpenTelemetry, Tracing, Observability, Distributed Tracing, APM

Description: A comprehensive guide to instrumenting BullMQ with OpenTelemetry for distributed tracing, including span creation, context propagation, metrics collection, and integrating with observability platforms like Jaeger and Zipkin.

---

OpenTelemetry provides vendor-neutral instrumentation for distributed tracing and metrics. Integrating BullMQ with OpenTelemetry enables end-to-end visibility across your distributed system, tracking jobs from creation through processing. This guide covers comprehensive OpenTelemetry instrumentation for BullMQ.

## Setting Up OpenTelemetry

Install the required packages:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http
npm install @opentelemetry/sdk-trace-node @opentelemetry/sdk-metrics
npm install bullmq ioredis
```

## Basic Tracing Setup

Initialize OpenTelemetry before any other imports:

```typescript
// tracing.ts - Must be imported first
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'bullmq-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry shut down'))
    .catch((err) => console.error('Error shutting down OpenTelemetry', err))
    .finally(() => process.exit(0));
});

export { sdk };
```

## BullMQ Instrumentation Class

Create a custom instrumentation for BullMQ:

```typescript
import { trace, context, SpanKind, SpanStatusCode, Span } from '@opentelemetry/api';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

const tracer = trace.getTracer('bullmq-instrumentation', '1.0.0');

interface TracedJobData {
  _traceContext?: {
    traceId: string;
    spanId: string;
    traceFlags: number;
  };
  [key: string]: any;
}

class InstrumentedQueue {
  private queue: Queue;
  private queueEvents: QueueEvents;

  constructor(name: string, connection: Redis) {
    this.queue = new Queue(name, { connection });
    this.queueEvents = new QueueEvents(name, { connection });
  }

  async add(
    jobName: string,
    data: Record<string, any>,
    options?: any
  ): Promise<Job> {
    return tracer.startActiveSpan(
      `bullmq.queue.add ${this.queue.name}`,
      {
        kind: SpanKind.PRODUCER,
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination': this.queue.name,
          'messaging.operation': 'add',
          'bullmq.job.name': jobName,
        },
      },
      async (span) => {
        try {
          // Inject trace context into job data
          const activeContext = context.active();
          const currentSpan = trace.getSpan(activeContext);
          const spanContext = currentSpan?.spanContext();

          const tracedData: TracedJobData = {
            ...data,
            _traceContext: spanContext
              ? {
                  traceId: spanContext.traceId,
                  spanId: spanContext.spanId,
                  traceFlags: spanContext.traceFlags,
                }
              : undefined,
          };

          const job = await this.queue.add(jobName, tracedData, options);

          span.setAttribute('bullmq.job.id', job.id || 'unknown');
          span.setStatus({ code: SpanStatusCode.OK });

          return job;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  async addBulk(jobs: Array<{ name: string; data: any; opts?: any }>): Promise<Job[]> {
    return tracer.startActiveSpan(
      `bullmq.queue.addBulk ${this.queue.name}`,
      {
        kind: SpanKind.PRODUCER,
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination': this.queue.name,
          'messaging.operation': 'addBulk',
          'bullmq.batch.size': jobs.length,
        },
      },
      async (span) => {
        try {
          const spanContext = trace.getSpan(context.active())?.spanContext();

          const tracedJobs = jobs.map((job) => ({
            ...job,
            data: {
              ...job.data,
              _traceContext: spanContext
                ? {
                    traceId: spanContext.traceId,
                    spanId: spanContext.spanId,
                    traceFlags: spanContext.traceFlags,
                  }
                : undefined,
            },
          }));

          const addedJobs = await this.queue.addBulk(tracedJobs);

          span.setAttribute(
            'bullmq.job.ids',
            addedJobs.map((j) => j.id).join(',')
          );
          span.setStatus({ code: SpanStatusCode.OK });

          return addedJobs;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  getQueue(): Queue {
    return this.queue;
  }

  async close(): Promise<void> {
    await this.queueEvents.close();
    await this.queue.close();
  }
}
```

## Instrumented Worker

Create a worker with trace context propagation:

```typescript
import { trace, context, SpanKind, SpanStatusCode, ROOT_CONTEXT } from '@opentelemetry/api';

class InstrumentedWorker {
  private worker: Worker;

  constructor(
    queueName: string,
    processor: (job: Job, span: Span) => Promise<any>,
    options: { connection: Redis; concurrency?: number }
  ) {
    this.worker = new Worker(
      queueName,
      async (job) => {
        const jobData = job.data as TracedJobData;
        const traceContext = jobData._traceContext;

        // Create parent context from propagated trace
        let parentContext = ROOT_CONTEXT;
        if (traceContext) {
          const remoteSpanContext = {
            traceId: traceContext.traceId,
            spanId: traceContext.spanId,
            traceFlags: traceContext.traceFlags,
            isRemote: true,
          };
          parentContext = trace.setSpanContext(ROOT_CONTEXT, remoteSpanContext);
        }

        return context.with(parentContext, () => {
          return tracer.startActiveSpan(
            `bullmq.worker.process ${queueName}`,
            {
              kind: SpanKind.CONSUMER,
              attributes: {
                'messaging.system': 'bullmq',
                'messaging.destination': queueName,
                'messaging.operation': 'process',
                'bullmq.job.id': job.id || 'unknown',
                'bullmq.job.name': job.name,
                'bullmq.job.attempts': job.attemptsMade,
              },
            },
            async (span) => {
              try {
                // Remove trace context from data before processing
                const { _traceContext, ...cleanData } = jobData;
                const cleanJob = { ...job, data: cleanData };

                const result = await processor(cleanJob as Job, span);

                span.setStatus({ code: SpanStatusCode.OK });
                return result;
              } catch (error) {
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: (error as Error).message,
                });
                span.recordException(error as Error);
                throw error;
              } finally {
                span.end();
              }
            }
          );
        });
      },
      options
    );

    this.setupEventListeners(queueName);
  }

  private setupEventListeners(queueName: string): void {
    this.worker.on('completed', (job) => {
      const span = tracer.startSpan(`bullmq.job.completed ${queueName}`, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'bullmq.job.id': job.id,
          'bullmq.job.name': job.name,
        },
      });
      span.end();
    });

    this.worker.on('failed', (job, error) => {
      const span = tracer.startSpan(`bullmq.job.failed ${queueName}`, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'bullmq.job.id': job?.id,
          'bullmq.job.name': job?.name,
          'bullmq.error.message': error.message,
        },
      });
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      span.end();
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
```

## Complete Example with Tracing

Full application with tracing:

```typescript
// app.ts
import './tracing'; // Must be first import
import express from 'express';
import { Redis } from 'ioredis';
import { trace, SpanKind, context } from '@opentelemetry/api';

const tracer = trace.getTracer('bullmq-app');

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Initialize instrumented queue and worker
const orderQueue = new InstrumentedQueue('orders', connection);

const orderWorker = new InstrumentedWorker(
  'orders',
  async (job, span) => {
    // Add custom attributes
    span.setAttribute('order.id', job.data.orderId);
    span.setAttribute('order.amount', job.data.amount);

    // Create child spans for sub-operations
    await tracer.startActiveSpan('validate-order', async (validateSpan) => {
      try {
        await validateOrder(job.data);
        validateSpan.setStatus({ code: SpanStatusCode.OK });
      } finally {
        validateSpan.end();
      }
    });

    await tracer.startActiveSpan('process-payment', async (paymentSpan) => {
      try {
        const result = await processPayment(job.data);
        paymentSpan.setAttribute('payment.transaction_id', result.transactionId);
        paymentSpan.setStatus({ code: SpanStatusCode.OK });
        return result;
      } finally {
        paymentSpan.end();
      }
    });

    await tracer.startActiveSpan('send-confirmation', async (confirmSpan) => {
      try {
        await sendConfirmation(job.data.email);
        confirmSpan.setStatus({ code: SpanStatusCode.OK });
      } finally {
        confirmSpan.end();
      }
    });

    return { processed: true, orderId: job.data.orderId };
  },
  { connection, concurrency: 5 }
);

const app = express();
app.use(express.json());

// API endpoint with tracing
app.post('/orders', async (req, res) => {
  const span = trace.getSpan(context.active());

  try {
    span?.setAttribute('http.request.body.order_id', req.body.orderId);

    const job = await orderQueue.add('process-order', {
      orderId: req.body.orderId,
      amount: req.body.amount,
      email: req.body.email,
    });

    span?.setAttribute('bullmq.job.id', job.id || 'unknown');

    res.json({
      success: true,
      jobId: job.id,
      traceId: span?.spanContext().traceId,
    });
  } catch (error) {
    span?.recordException(error as Error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await orderWorker.close();
  await orderQueue.close();
  await connection.quit();
});
```

## OpenTelemetry Metrics for BullMQ

Add custom metrics:

```typescript
import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('bullmq-metrics');

// Create metrics
const jobsProcessedCounter = meter.createCounter('bullmq.jobs.processed', {
  description: 'Number of jobs processed',
  unit: '1',
});

const jobDurationHistogram = meter.createHistogram('bullmq.job.duration', {
  description: 'Job processing duration',
  unit: 'ms',
});

const queueDepthGauge = meter.createObservableGauge('bullmq.queue.depth', {
  description: 'Current queue depth',
  unit: '1',
});

const activeJobsGauge = meter.createObservableGauge('bullmq.jobs.active', {
  description: 'Number of active jobs',
  unit: '1',
});

// Set up observable gauges
class MetricsCollector {
  private queues: Map<string, Queue> = new Map();

  addQueue(name: string, queue: Queue): void {
    this.queues.set(name, queue);
  }

  setupObservables(): void {
    queueDepthGauge.addCallback(async (result) => {
      for (const [name, queue] of this.queues) {
        const waiting = await queue.getWaitingCount();
        const delayed = await queue.getDelayedCount();
        result.observe(waiting + delayed, { queue: name });
      }
    });

    activeJobsGauge.addCallback(async (result) => {
      for (const [name, queue] of this.queues) {
        const active = await queue.getActiveCount();
        result.observe(active, { queue: name });
      }
    });
  }

  recordJobProcessed(queueName: string, status: string): void {
    jobsProcessedCounter.add(1, { queue: queueName, status });
  }

  recordJobDuration(queueName: string, durationMs: number): void {
    jobDurationHistogram.record(durationMs, { queue: queueName });
  }
}
```

## Flow Tracing

Trace jobs across flow hierarchies:

```typescript
import { FlowProducer } from 'bullmq';

class InstrumentedFlowProducer {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });
  }

  async add(flow: any): Promise<any> {
    return tracer.startActiveSpan(
      'bullmq.flow.add',
      {
        kind: SpanKind.PRODUCER,
        attributes: {
          'messaging.system': 'bullmq',
          'bullmq.flow.name': flow.name,
          'bullmq.flow.queue': flow.queueName,
        },
      },
      async (span) => {
        try {
          // Inject trace context into flow
          const spanContext = span.spanContext();
          const tracedFlow = this.injectTraceContext(flow, {
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            traceFlags: spanContext.traceFlags,
          });

          const result = await this.flowProducer.add(tracedFlow);

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: (error as Error).message,
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  private injectTraceContext(flow: any, traceContext: any): any {
    const traced = {
      ...flow,
      data: {
        ...flow.data,
        _traceContext: traceContext,
      },
    };

    if (flow.children) {
      traced.children = flow.children.map((child: any) =>
        this.injectTraceContext(child, traceContext)
      );
    }

    return traced;
  }
}
```

## Jaeger Setup

Configure Jaeger as the tracing backend:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
      - REDIS_HOST=redis
    depends_on:
      - redis
      - jaeger

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - '16686:16686' # UI
      - '4317:4317' # OTLP gRPC
      - '4318:4318' # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

## Custom Span Processors

Add custom processing to spans:

```typescript
import { SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-node';

class BullMQSpanProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  onStart(span: Span): void {
    // Add common attributes to all BullMQ spans
    if (span.name.startsWith('bullmq.')) {
      span.setAttribute('service.component', 'bullmq');
      span.setAttribute('environment', process.env.NODE_ENV || 'development');
    }
  }

  onEnd(span: ReadableSpan): void {
    // Log slow jobs
    if (
      span.name.includes('worker.process') &&
      span.duration[0] > 0 // More than 1 second
    ) {
      console.warn(
        `Slow job detected: ${span.name} took ${span.duration[0]}s ${span.duration[1]}ns`
      );
    }
  }
}
```

## Baggage for Context Propagation

Pass additional context through jobs:

```typescript
import { propagation, baggage, context } from '@opentelemetry/api';

class ContextAwareQueue extends InstrumentedQueue {
  async addWithBaggage(
    jobName: string,
    data: Record<string, any>,
    baggageItems: Record<string, string>,
    options?: any
  ): Promise<Job> {
    // Create baggage
    const baggageEntries = Object.entries(baggageItems).map(([key, value]) => [
      key,
      { value },
    ]);
    const bag = baggage.setEntries(baggage.getBaggage(context.active()) || baggage.createBaggage(), baggageEntries);

    const ctx = baggage.setBaggage(context.active(), bag);

    return context.with(ctx, () => {
      // Serialize baggage into job data
      const baggageData: Record<string, string> = {};
      bag.getAllEntries().forEach(([key, entry]) => {
        baggageData[key] = entry.value;
      });

      return this.add(
        jobName,
        {
          ...data,
          _baggage: baggageData,
        },
        options
      );
    });
  }
}

// In worker, restore baggage
class BaggageAwareWorker extends InstrumentedWorker {
  constructor(
    queueName: string,
    processor: (job: Job, span: Span, baggage: Record<string, string>) => Promise<any>,
    options: { connection: Redis; concurrency?: number }
  ) {
    super(
      queueName,
      async (job, span) => {
        const jobBaggage = job.data._baggage || {};

        // Add baggage items as span attributes
        Object.entries(jobBaggage).forEach(([key, value]) => {
          span.setAttribute(`baggage.${key}`, value as string);
        });

        // Remove baggage from data
        const { _baggage, ...cleanData } = job.data;

        return processor({ ...job, data: cleanData } as Job, span, jobBaggage);
      },
      options
    );
  }
}
```

## Best Practices

1. **Initialize early** - Import tracing setup before other modules.

2. **Propagate context** - Always pass trace context through job data.

3. **Use meaningful span names** - Include queue and operation type.

4. **Add relevant attributes** - Include job IDs, names, and business data.

5. **Handle errors properly** - Record exceptions and set error status.

6. **Create child spans** - Break down complex operations.

7. **Clean up resources** - Shut down SDK gracefully.

8. **Sample appropriately** - Configure sampling for high-volume queues.

9. **Use baggage for context** - Pass correlation IDs through jobs.

10. **Monitor trace backend** - Ensure traces are being collected.

## Conclusion

OpenTelemetry integration with BullMQ provides comprehensive distributed tracing capabilities. By propagating trace context through jobs and creating appropriate spans, you gain end-to-end visibility into your job processing pipeline. This visibility is invaluable for debugging issues, understanding performance bottlenecks, and monitoring system health across distributed services.
