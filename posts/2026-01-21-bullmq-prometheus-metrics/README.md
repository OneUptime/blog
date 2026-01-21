# How to Export BullMQ Metrics to Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Prometheus, Monitoring, Metrics, Grafana, Observability

Description: A comprehensive guide to exporting BullMQ metrics to Prometheus, including setting up metric collectors, creating custom metrics, building Grafana dashboards, and implementing alerting rules for queue monitoring.

---

Prometheus is the industry standard for metrics collection and monitoring. Integrating BullMQ with Prometheus provides powerful insights into queue performance, job throughput, and system health. This guide covers setting up comprehensive BullMQ metrics export to Prometheus.

## Setting Up Prometheus Client

Install the required packages:

```bash
npm install prom-client bullmq ioredis
```

## Basic Metrics Setup

Create a metrics exporter for BullMQ:

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Create a custom registry
const register = new Registry();

// Collect default Node.js metrics
collectDefaultMetrics({ register });

// Define BullMQ metrics
const jobsProcessed = new Counter({
  name: 'bullmq_jobs_processed_total',
  help: 'Total number of processed jobs',
  labelNames: ['queue', 'status'],
  registers: [register],
});

const jobsActive = new Gauge({
  name: 'bullmq_jobs_active',
  help: 'Number of currently active jobs',
  labelNames: ['queue'],
  registers: [register],
});

const jobsWaiting = new Gauge({
  name: 'bullmq_jobs_waiting',
  help: 'Number of jobs waiting to be processed',
  labelNames: ['queue'],
  registers: [register],
});

const jobsDelayed = new Gauge({
  name: 'bullmq_jobs_delayed',
  help: 'Number of delayed jobs',
  labelNames: ['queue'],
  registers: [register],
});

const jobsFailed = new Gauge({
  name: 'bullmq_jobs_failed',
  help: 'Number of failed jobs',
  labelNames: ['queue'],
  registers: [register],
});

const jobDuration = new Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue', 'job_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export { register, jobsProcessed, jobsActive, jobsWaiting, jobsDelayed, jobsFailed, jobDuration };
```

## BullMQ Metrics Collector

Create a comprehensive metrics collector:

```typescript
import { Queue, QueueEvents } from 'bullmq';

interface QueueMetricsConfig {
  queue: Queue;
  queueEvents: QueueEvents;
}

class BullMQMetricsCollector {
  private queues: Map<string, QueueMetricsConfig> = new Map();
  private jobStartTimes: Map<string, number> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(private connection: Redis) {}

  addQueue(name: string): void {
    if (this.queues.has(name)) return;

    const queue = new Queue(name, { connection: this.connection });
    const queueEvents = new QueueEvents(name, { connection: this.connection });

    this.setupEventListeners(name, queueEvents);
    this.queues.set(name, { queue, queueEvents });
  }

  private setupEventListeners(queueName: string, queueEvents: QueueEvents): void {
    queueEvents.on('active', ({ jobId }) => {
      this.jobStartTimes.set(`${queueName}:${jobId}`, Date.now());
    });

    queueEvents.on('completed', ({ jobId }) => {
      jobsProcessed.inc({ queue: queueName, status: 'completed' });
      this.recordJobDuration(queueName, jobId, 'completed');
    });

    queueEvents.on('failed', ({ jobId }) => {
      jobsProcessed.inc({ queue: queueName, status: 'failed' });
      this.recordJobDuration(queueName, jobId, 'failed');
    });

    queueEvents.on('stalled', ({ jobId }) => {
      jobsProcessed.inc({ queue: queueName, status: 'stalled' });
    });
  }

  private recordJobDuration(queueName: string, jobId: string, status: string): void {
    const key = `${queueName}:${jobId}`;
    const startTime = this.jobStartTimes.get(key);

    if (startTime) {
      const duration = (Date.now() - startTime) / 1000;
      jobDuration.observe({ queue: queueName, job_name: 'default' }, duration);
      this.jobStartTimes.delete(key);
    }
  }

  startPolling(intervalMs: number = 5000): void {
    this.updateInterval = setInterval(() => this.updateGauges(), intervalMs);
    this.updateGauges(); // Initial update
  }

  stopPolling(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async updateGauges(): Promise<void> {
    for (const [name, { queue }] of this.queues) {
      try {
        const [waiting, active, delayed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getDelayedCount(),
          queue.getFailedCount(),
        ]);

        jobsWaiting.set({ queue: name }, waiting);
        jobsActive.set({ queue: name }, active);
        jobsDelayed.set({ queue: name }, delayed);
        jobsFailed.set({ queue: name }, failed);
      } catch (error) {
        console.error(`Error updating metrics for queue ${name}:`, error);
      }
    }
  }

  async close(): Promise<void> {
    this.stopPolling();
    for (const { queue, queueEvents } of this.queues.values()) {
      await queueEvents.close();
      await queue.close();
    }
  }
}

export { BullMQMetricsCollector };
```

## Express Metrics Endpoint

Expose metrics via HTTP:

```typescript
import express from 'express';
import { register, BullMQMetricsCollector } from './metrics';

const app = express();

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Initialize metrics collector
const metricsCollector = new BullMQMetricsCollector(connection);
metricsCollector.addQueue('emails');
metricsCollector.addQueue('orders');
metricsCollector.addQueue('notifications');
metricsCollector.startPolling(5000);

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end((error as Error).message);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const server = app.listen(9090, () => {
  console.log('Metrics server running on http://localhost:9090/metrics');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await metricsCollector.close();
  server.close();
});
```

## Advanced Metrics

Add more detailed metrics:

```typescript
import { Counter, Gauge, Histogram, Summary } from 'prom-client';

// Job-specific metrics
const jobAttempts = new Histogram({
  name: 'bullmq_job_attempts',
  help: 'Number of attempts per job',
  labelNames: ['queue', 'job_name', 'final_status'],
  buckets: [1, 2, 3, 4, 5, 10],
  registers: [register],
});

const jobWaitTime = new Histogram({
  name: 'bullmq_job_wait_time_seconds',
  help: 'Time job spent waiting before processing',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600],
  registers: [register],
});

const jobDataSize = new Histogram({
  name: 'bullmq_job_data_size_bytes',
  help: 'Size of job data payload',
  labelNames: ['queue'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [register],
});

// Queue health metrics
const queuePaused = new Gauge({
  name: 'bullmq_queue_paused',
  help: 'Whether the queue is paused (1) or not (0)',
  labelNames: ['queue'],
  registers: [register],
});

const redisMemoryUsage = new Gauge({
  name: 'bullmq_redis_memory_usage_bytes',
  help: 'Redis memory usage for queue keys',
  labelNames: ['queue'],
  registers: [register],
});

// Worker metrics
const workersActive = new Gauge({
  name: 'bullmq_workers_active',
  help: 'Number of active workers',
  labelNames: ['queue'],
  registers: [register],
});

const workerConcurrency = new Gauge({
  name: 'bullmq_worker_concurrency',
  help: 'Worker concurrency setting',
  labelNames: ['queue', 'worker_id'],
  registers: [register],
});

// Rate metrics
const jobThroughput = new Counter({
  name: 'bullmq_job_throughput_total',
  help: 'Jobs processed per time window',
  labelNames: ['queue'],
  registers: [register],
});

// Error metrics
const jobErrors = new Counter({
  name: 'bullmq_job_errors_total',
  help: 'Total job errors by type',
  labelNames: ['queue', 'error_type'],
  registers: [register],
});
```

## Enhanced Metrics Collector

Implement the advanced metrics:

```typescript
class EnhancedBullMQMetricsCollector {
  private queues: Map<string, Queue> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private jobMetadata: Map<string, { addedAt: number; dataSize: number }> = new Map();

  constructor(private connection: Redis) {}

  addQueue(name: string): void {
    const queue = new Queue(name, { connection: this.connection });
    const events = new QueueEvents(name, { connection: this.connection });

    this.queues.set(name, queue);
    this.queueEvents.set(name, events);

    this.setupDetailedListeners(name, queue, events);
  }

  private setupDetailedListeners(name: string, queue: Queue, events: QueueEvents): void {
    events.on('waiting', async ({ jobId }) => {
      const job = await queue.getJob(jobId);
      if (job) {
        const dataSize = JSON.stringify(job.data).length;
        this.jobMetadata.set(`${name}:${jobId}`, {
          addedAt: job.timestamp,
          dataSize,
        });

        jobDataSize.observe({ queue: name }, dataSize);
      }
    });

    events.on('active', async ({ jobId }) => {
      const metadata = this.jobMetadata.get(`${name}:${jobId}`);
      if (metadata) {
        const waitTime = (Date.now() - metadata.addedAt) / 1000;
        jobWaitTime.observe({ queue: name }, waitTime);
      }
    });

    events.on('completed', async ({ jobId }) => {
      const job = await queue.getJob(jobId);
      if (job) {
        jobAttempts.observe(
          { queue: name, job_name: job.name, final_status: 'completed' },
          job.attemptsMade
        );
        jobThroughput.inc({ queue: name });
      }
      this.jobMetadata.delete(`${name}:${jobId}`);
    });

    events.on('failed', async ({ jobId, failedReason }) => {
      const job = await queue.getJob(jobId);
      if (job) {
        jobAttempts.observe(
          { queue: name, job_name: job.name, final_status: 'failed' },
          job.attemptsMade
        );

        // Categorize error type
        const errorType = this.categorizeError(failedReason);
        jobErrors.inc({ queue: name, error_type: errorType });
      }
      this.jobMetadata.delete(`${name}:${jobId}`);
    });
  }

  private categorizeError(reason: string): string {
    if (reason.includes('timeout')) return 'timeout';
    if (reason.includes('connection')) return 'connection';
    if (reason.includes('memory')) return 'memory';
    if (reason.includes('validation')) return 'validation';
    return 'unknown';
  }

  async updateQueueHealthMetrics(): Promise<void> {
    for (const [name, queue] of this.queues) {
      try {
        // Check if paused
        const isPaused = await queue.isPaused();
        queuePaused.set({ queue: name }, isPaused ? 1 : 0);

        // Estimate Redis memory usage
        const memoryUsage = await this.estimateQueueMemory(name);
        redisMemoryUsage.set({ queue: name }, memoryUsage);
      } catch (error) {
        console.error(`Error updating health metrics for ${name}:`, error);
      }
    }
  }

  private async estimateQueueMemory(queueName: string): Promise<number> {
    const keys = await this.connection.keys(`bull:${queueName}:*`);
    let totalMemory = 0;

    for (const key of keys.slice(0, 100)) { // Sample first 100 keys
      const memory = await this.connection.memory('USAGE', key);
      if (memory) totalMemory += memory;
    }

    // Extrapolate if sampling
    if (keys.length > 100) {
      totalMemory = (totalMemory / 100) * keys.length;
    }

    return totalMemory;
  }
}
```

## Worker Metrics Integration

Add metrics to workers:

```typescript
import { Worker, Job } from 'bullmq';

class MetricizedWorker {
  private worker: Worker;
  private workerId: string;

  constructor(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    concurrency: number,
    connection: Redis
  ) {
    this.workerId = `worker_${process.pid}_${Date.now()}`;

    this.worker = new Worker(
      queueName,
      async (job) => {
        const startTime = Date.now();
        try {
          const result = await processor(job);
          return result;
        } finally {
          const duration = (Date.now() - startTime) / 1000;
          jobDuration.observe(
            { queue: queueName, job_name: job.name },
            duration
          );
        }
      },
      {
        connection,
        concurrency,
      }
    );

    // Record worker concurrency
    workerConcurrency.set(
      { queue: queueName, worker_id: this.workerId },
      concurrency
    );

    this.setupWorkerMetrics(queueName);
  }

  private setupWorkerMetrics(queueName: string): void {
    this.worker.on('active', () => {
      workersActive.inc({ queue: queueName });
    });

    this.worker.on('completed', () => {
      workersActive.dec({ queue: queueName });
    });

    this.worker.on('failed', () => {
      workersActive.dec({ queue: queueName });
    });

    this.worker.on('error', (error) => {
      jobErrors.inc({ queue: queueName, error_type: 'worker_error' });
    });

    this.worker.on('stalled', () => {
      jobErrors.inc({ queue: queueName, error_type: 'stalled' });
    });
  }

  async close(): Promise<void> {
    const queueName = this.worker.name;
    workerConcurrency.remove({ queue: queueName, worker_id: this.workerId });
    await this.worker.close();
  }
}
```

## Prometheus Configuration

Configure Prometheus to scrape metrics:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'bullmq'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 5s
    metrics_path: /metrics

  # If you have multiple instances
  - job_name: 'bullmq-workers'
    static_configs:
      - targets:
          - 'worker1:9090'
          - 'worker2:9090'
          - 'worker3:9090'
```

## Grafana Dashboard

Create a Grafana dashboard JSON:

```json
{
  "dashboard": {
    "title": "BullMQ Metrics",
    "panels": [
      {
        "title": "Jobs by Status",
        "type": "stat",
        "targets": [
          {
            "expr": "bullmq_jobs_waiting",
            "legendFormat": "Waiting"
          },
          {
            "expr": "bullmq_jobs_active",
            "legendFormat": "Active"
          },
          {
            "expr": "bullmq_jobs_delayed",
            "legendFormat": "Delayed"
          },
          {
            "expr": "bullmq_jobs_failed",
            "legendFormat": "Failed"
          }
        ]
      },
      {
        "title": "Job Processing Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(bullmq_jobs_processed_total[5m])",
            "legendFormat": "{{queue}} - {{status}}"
          }
        ]
      },
      {
        "title": "Job Duration (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(bullmq_job_duration_seconds_bucket[5m]))",
            "legendFormat": "{{queue}}"
          }
        ]
      },
      {
        "title": "Queue Depth",
        "type": "graph",
        "targets": [
          {
            "expr": "bullmq_jobs_waiting + bullmq_jobs_delayed",
            "legendFormat": "{{queue}}"
          }
        ]
      }
    ]
  }
}
```

## Alerting Rules

Define Prometheus alerting rules:

```yaml
# alerts.yml
groups:
  - name: bullmq
    rules:
      - alert: BullMQHighFailureRate
        expr: |
          rate(bullmq_jobs_processed_total{status="failed"}[5m]) /
          rate(bullmq_jobs_processed_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High job failure rate on {{ $labels.queue }}
          description: More than 10% of jobs are failing on queue {{ $labels.queue }}

      - alert: BullMQQueueBacklog
        expr: bullmq_jobs_waiting > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Large queue backlog on {{ $labels.queue }}
          description: Queue {{ $labels.queue }} has {{ $value }} jobs waiting

      - alert: BullMQSlowProcessing
        expr: |
          histogram_quantile(0.95, rate(bullmq_job_duration_seconds_bucket[5m])) > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Slow job processing on {{ $labels.queue }}
          description: 95th percentile processing time exceeds 60 seconds

      - alert: BullMQNoWorkers
        expr: bullmq_workers_active == 0 and bullmq_jobs_waiting > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: No active workers for {{ $labels.queue }}
          description: Queue {{ $labels.queue }} has jobs but no workers

      - alert: BullMQQueuePaused
        expr: bullmq_queue_paused == 1
        for: 5m
        labels:
          severity: info
        annotations:
          summary: Queue {{ $labels.queue }} is paused
          description: Queue has been paused for more than 5 minutes

      - alert: BullMQHighMemoryUsage
        expr: bullmq_redis_memory_usage_bytes > 1073741824
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: High Redis memory usage for {{ $labels.queue }}
          description: Queue {{ $labels.queue }} is using over 1GB of Redis memory
```

## Docker Compose Setup

Complete setup with Prometheus and Grafana:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
      - '9090:9090'
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9091:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts.yml:/etc/prometheus/alerts.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

## Best Practices

1. **Use labels wisely** - Too many labels increase cardinality.

2. **Set appropriate bucket sizes** - Match your application's SLOs.

3. **Poll gauges periodically** - Avoid excessive Redis queries.

4. **Alert on symptoms** - Focus on user-facing impact.

5. **Include rate metrics** - Show trends, not just absolute values.

6. **Monitor memory usage** - Prevent Redis memory issues.

7. **Track job wait times** - Important for latency SLOs.

8. **Use summaries for percentiles** - When bucket sizes are unclear.

9. **Clean up stale metrics** - Remove metrics for deleted queues.

10. **Test your alerts** - Verify alerts fire correctly.

## Conclusion

Exporting BullMQ metrics to Prometheus enables powerful monitoring and alerting capabilities. By tracking job counts, processing times, error rates, and queue health, you gain visibility into your queue system's performance. Combined with Grafana dashboards and alerting rules, you can proactively identify and resolve issues before they impact users.
