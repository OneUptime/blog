# How to Set Up BullMQ in a Monorepo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Monorepo, TypeScript, Node.js, Turborepo, pnpm, Shared Types

Description: A comprehensive guide to setting up BullMQ in a monorepo architecture with shared job types, queue configurations, and best practices for maintaining consistency across multiple services.

---

Monorepos are increasingly popular for managing multiple related projects in a single repository. When using BullMQ in a monorepo, you can share job types, queue configurations, and utilities across services, ensuring type safety and consistency. This guide shows you how to structure a BullMQ setup in a monorepo using Turborepo and pnpm.

## Project Structure

Here's the recommended monorepo structure for BullMQ:

```
my-monorepo/
├── apps/
│   ├── api/                    # API service that enqueues jobs
│   ├── worker-email/           # Email processing worker
│   ├── worker-notifications/   # Notification processing worker
│   └── dashboard/              # Admin dashboard for monitoring
├── packages/
│   ├── queue-types/            # Shared job type definitions
│   ├── queue-client/           # Queue client library
│   ├── queue-worker/           # Worker utilities and base classes
│   └── config/                 # Shared configuration
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Setting Up the Monorepo

Initialize the monorepo with pnpm:

```bash
mkdir bullmq-monorepo
cd bullmq-monorepo
pnpm init
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Create root `package.json`:

```json
{
  "name": "bullmq-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true
  }
}
```

## Creating the Shared Types Package

Create the queue-types package:

```bash
mkdir -p packages/queue-types/src
```

`packages/queue-types/package.json`:

```json
{
  "name": "@monorepo/queue-types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

`packages/queue-types/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

`packages/queue-types/src/index.ts`:

```typescript
// Queue names as constants
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  REPORT: 'report',
  WEBHOOK: 'webhook',
  IMAGE_PROCESSING: 'image-processing',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Email job types
export interface EmailJobData {
  type: 'transactional' | 'marketing' | 'notification';
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  template: string;
  templateData: Record<string, unknown>;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

export interface EmailJobResult {
  messageId: string;
  provider: string;
  sentAt: string;
  recipients: string[];
}

// Notification job types
export interface NotificationJobData {
  userId: string;
  type: 'push' | 'sms' | 'in-app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: string[];
}

export interface NotificationJobResult {
  delivered: boolean;
  channel: string;
  deliveredAt: string;
  externalId?: string;
}

// Report job types
export interface ReportJobData {
  reportType: 'sales' | 'users' | 'analytics' | 'custom';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, unknown>;
  format: 'pdf' | 'csv' | 'xlsx';
  recipientEmail: string;
  userId: string;
}

export interface ReportJobResult {
  reportUrl: string;
  generatedAt: string;
  fileSize: number;
  rowCount: number;
}

// Webhook job types
export interface WebhookJobData {
  eventType: string;
  payload: Record<string, unknown>;
  targetUrl: string;
  headers?: Record<string, string>;
  secret?: string;
  retryCount?: number;
}

export interface WebhookJobResult {
  statusCode: number;
  responseTime: number;
  deliveredAt: string;
}

// Image processing job types
export interface ImageProcessingJobData {
  sourceUrl: string;
  operations: ImageOperation[];
  outputFormat: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  callbackUrl?: string;
}

export type ImageOperation =
  | { type: 'resize'; width: number; height?: number; fit?: 'cover' | 'contain' | 'fill' }
  | { type: 'crop'; x: number; y: number; width: number; height: number }
  | { type: 'rotate'; angle: 90 | 180 | 270 }
  | { type: 'blur'; sigma: number }
  | { type: 'sharpen'; sigma?: number }
  | { type: 'watermark'; imageUrl: string; position: 'center' | 'corner' };

export interface ImageProcessingJobResult {
  outputUrl: string;
  dimensions: { width: number; height: number };
  fileSize: number;
  processingTime: number;
}

// Job registry for type-safe queue operations
export interface JobRegistry {
  [QUEUE_NAMES.EMAIL]: {
    data: EmailJobData;
    result: EmailJobResult;
  };
  [QUEUE_NAMES.NOTIFICATION]: {
    data: NotificationJobData;
    result: NotificationJobResult;
  };
  [QUEUE_NAMES.REPORT]: {
    data: ReportJobData;
    result: ReportJobResult;
  };
  [QUEUE_NAMES.WEBHOOK]: {
    data: WebhookJobData;
    result: WebhookJobResult;
  };
  [QUEUE_NAMES.IMAGE_PROCESSING]: {
    data: ImageProcessingJobData;
    result: ImageProcessingJobResult;
  };
}

// Utility types
export type JobDataFor<Q extends QueueName> = JobRegistry[Q]['data'];
export type JobResultFor<Q extends QueueName> = JobRegistry[Q]['result'];

// Job options
export interface StandardJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | { count: number; age: number };
  removeOnFail?: boolean | { count: number; age: number };
}
```

## Creating the Queue Client Package

Create the queue-client package:

```bash
mkdir -p packages/queue-client/src
```

`packages/queue-client/package.json`:

```json
{
  "name": "@monorepo/queue-client",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "@monorepo/queue-types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

`packages/queue-client/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../queue-types" }
  ]
}
```

`packages/queue-client/src/connection.ts`:

```typescript
import { Redis } from 'ioredis';

export interface RedisConnectionOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  tls?: boolean;
}

let sharedConnection: Redis | null = null;

export function getRedisConnection(options?: RedisConnectionOptions): Redis {
  if (sharedConnection) {
    return sharedConnection;
  }

  sharedConnection = new Redis({
    host: options?.host || process.env.REDIS_HOST || 'localhost',
    port: options?.port || parseInt(process.env.REDIS_PORT || '6379'),
    password: options?.password || process.env.REDIS_PASSWORD,
    db: options?.db || parseInt(process.env.REDIS_DB || '0'),
    tls: options?.tls ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  sharedConnection.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  return sharedConnection;
}

export async function closeConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
}
```

`packages/queue-client/src/queues.ts`:

```typescript
import { Queue, QueueOptions, Job, JobsOptions } from 'bullmq';
import {
  QueueName,
  QUEUE_NAMES,
  JobDataFor,
  JobResultFor,
  StandardJobOptions,
} from '@monorepo/queue-types';
import { getRedisConnection } from './connection';

// Queue instances cache
const queues = new Map<QueueName, Queue>();

// Default queue options
const defaultQueueOptions: Partial<QueueOptions> = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600,
    },
  },
};

// Get or create a queue
export function getQueue<Q extends QueueName>(
  queueName: Q,
  options?: Partial<QueueOptions>
): Queue<JobDataFor<Q>, JobResultFor<Q>> {
  if (!queues.has(queueName)) {
    const queue = new Queue<JobDataFor<Q>, JobResultFor<Q>>(queueName, {
      connection: getRedisConnection(),
      ...defaultQueueOptions,
      ...options,
    });
    queues.set(queueName, queue as Queue);
  }
  return queues.get(queueName) as Queue<JobDataFor<Q>, JobResultFor<Q>>;
}

// Type-safe job addition
export async function addJob<Q extends QueueName>(
  queueName: Q,
  jobName: string,
  data: JobDataFor<Q>,
  options?: StandardJobOptions
): Promise<Job<JobDataFor<Q>, JobResultFor<Q>>> {
  const queue = getQueue(queueName);
  return queue.add(jobName, data, options as JobsOptions);
}

// Bulk add jobs
export async function addBulkJobs<Q extends QueueName>(
  queueName: Q,
  jobs: Array<{
    name: string;
    data: JobDataFor<Q>;
    opts?: StandardJobOptions;
  }>
): Promise<Job<JobDataFor<Q>, JobResultFor<Q>>[]> {
  const queue = getQueue(queueName);
  return queue.addBulk(
    jobs.map((job) => ({
      name: job.name,
      data: job.data,
      opts: job.opts as JobsOptions,
    }))
  );
}

// Get queue metrics
export async function getQueueMetrics(queueName: QueueName) {
  const queue = getQueue(queueName);
  const [counts, isPaused] = await Promise.all([
    queue.getJobCounts(),
    queue.isPaused(),
  ]);
  return { ...counts, isPaused };
}

// Close all queues
export async function closeAllQueues(): Promise<void> {
  await Promise.all(
    Array.from(queues.values()).map((queue) => queue.close())
  );
  queues.clear();
}
```

`packages/queue-client/src/services/email.service.ts`:

```typescript
import { Job } from 'bullmq';
import { QUEUE_NAMES, EmailJobData, EmailJobResult } from '@monorepo/queue-types';
import { addJob, getQueue } from '../queues';

export class EmailService {
  private queueName = QUEUE_NAMES.EMAIL;

  async sendEmail(data: EmailJobData): Promise<Job<EmailJobData, EmailJobResult>> {
    const priority = this.getPriority(data.priority);
    return addJob(this.queueName, 'send-email', data, { priority });
  }

  async sendScheduledEmail(
    data: EmailJobData,
    scheduledAt: Date
  ): Promise<Job<EmailJobData, EmailJobResult>> {
    const delay = scheduledAt.getTime() - Date.now();
    return addJob(this.queueName, 'send-email', data, {
      delay: Math.max(0, delay),
    });
  }

  async sendBulkEmails(
    emails: EmailJobData[]
  ): Promise<Job<EmailJobData, EmailJobResult>[]> {
    const queue = getQueue(this.queueName);
    return queue.addBulk(
      emails.map((data, index) => ({
        name: 'send-email',
        data,
        opts: {
          priority: this.getPriority(data.priority),
          delay: index * 50, // Stagger emails
        },
      }))
    );
  }

  async getEmailStatus(jobId: string) {
    const queue = getQueue(this.queueName);
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id,
      state,
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      timestamps: {
        created: job.timestamp,
        processed: job.processedOn,
        finished: job.finishedOn,
      },
    };
  }

  private getPriority(priority?: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'low':
        return 10;
      default:
        return 5;
    }
  }
}

export const emailService = new EmailService();
```

`packages/queue-client/src/index.ts`:

```typescript
export * from './connection';
export * from './queues';
export * from './services/email.service';

// Re-export types for convenience
export * from '@monorepo/queue-types';
```

## Creating the Queue Worker Package

Create the queue-worker package:

```bash
mkdir -p packages/queue-worker/src
```

`packages/queue-worker/package.json`:

```json
{
  "name": "@monorepo/queue-worker",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "@monorepo/queue-types": "workspace:*",
    "@monorepo/queue-client": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

`packages/queue-worker/src/base-worker.ts`:

```typescript
import { Worker, WorkerOptions, Job, Processor } from 'bullmq';
import { QueueName, JobDataFor, JobResultFor } from '@monorepo/queue-types';
import { getRedisConnection } from '@monorepo/queue-client';

export interface WorkerConfig {
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
  stalledInterval?: number;
  maxStalledCount?: number;
}

export abstract class BaseWorker<Q extends QueueName> {
  protected worker: Worker<JobDataFor<Q>, JobResultFor<Q>>;
  protected queueName: Q;

  constructor(queueName: Q, config: WorkerConfig = {}) {
    this.queueName = queueName;

    const options: WorkerOptions = {
      connection: getRedisConnection(),
      concurrency: config.concurrency || 5,
      limiter: config.limiter,
      stalledInterval: config.stalledInterval || 30000,
      maxStalledCount: config.maxStalledCount || 1,
    };

    this.worker = new Worker<JobDataFor<Q>, JobResultFor<Q>>(
      queueName,
      this.process.bind(this),
      options
    );

    this.setupEventHandlers();
  }

  protected abstract process(
    job: Job<JobDataFor<Q>, JobResultFor<Q>>
  ): Promise<JobResultFor<Q>>;

  private setupEventHandlers() {
    this.worker.on('completed', (job, result) => {
      this.onCompleted(job, result);
    });

    this.worker.on('failed', (job, error) => {
      this.onFailed(job, error);
    });

    this.worker.on('error', (error) => {
      this.onError(error);
    });

    this.worker.on('stalled', (jobId) => {
      this.onStalled(jobId);
    });
  }

  protected onCompleted(
    job: Job<JobDataFor<Q>, JobResultFor<Q>>,
    result: JobResultFor<Q>
  ): void {
    console.log(`[${this.queueName}] Job ${job.id} completed`);
  }

  protected onFailed(
    job: Job<JobDataFor<Q>, JobResultFor<Q>> | undefined,
    error: Error
  ): void {
    console.error(
      `[${this.queueName}] Job ${job?.id} failed:`,
      error.message
    );
  }

  protected onError(error: Error): void {
    console.error(`[${this.queueName}] Worker error:`, error.message);
  }

  protected onStalled(jobId: string): void {
    console.warn(`[${this.queueName}] Job ${jobId} stalled`);
  }

  async start(): Promise<void> {
    console.log(`[${this.queueName}] Worker started`);
  }

  async stop(): Promise<void> {
    await this.worker.close();
    console.log(`[${this.queueName}] Worker stopped`);
  }

  async pause(): Promise<void> {
    await this.worker.pause();
    console.log(`[${this.queueName}] Worker paused`);
  }

  async resume(): Promise<void> {
    this.worker.resume();
    console.log(`[${this.queueName}] Worker resumed`);
  }
}
```

`packages/queue-worker/src/worker-manager.ts`:

```typescript
import { BaseWorker } from './base-worker';
import { QueueName } from '@monorepo/queue-types';
import { closeConnection } from '@monorepo/queue-client';

export class WorkerManager {
  private workers: Map<string, BaseWorker<QueueName>> = new Map();
  private isShuttingDown = false;

  register<Q extends QueueName>(
    name: string,
    worker: BaseWorker<Q>
  ): void {
    this.workers.set(name, worker as BaseWorker<QueueName>);
  }

  async startAll(): Promise<void> {
    console.log(`Starting ${this.workers.size} workers...`);
    await Promise.all(
      Array.from(this.workers.values()).map((worker) => worker.start())
    );
    this.setupGracefulShutdown();
    console.log('All workers started');
  }

  async stopAll(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('Stopping all workers...');
    await Promise.all(
      Array.from(this.workers.values()).map((worker) => worker.stop())
    );
    await closeConnection();
    console.log('All workers stopped');
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}. Initiating graceful shutdown...`);
      await this.stopAll();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

export const workerManager = new WorkerManager();
```

`packages/queue-worker/src/index.ts`:

```typescript
export * from './base-worker';
export * from './worker-manager';
```

## Creating an API Application

Create the API application:

```bash
mkdir -p apps/api/src
```

`apps/api/package.json`:

```json
{
  "name": "@monorepo/api",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node-dev --respawn src/index.ts",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "express": "^4.18.0",
    "@monorepo/queue-client": "workspace:*",
    "@monorepo/queue-types": "workspace:*"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

`apps/api/src/index.ts`:

```typescript
import express from 'express';
import {
  emailService,
  getQueueMetrics,
  QUEUE_NAMES,
} from '@monorepo/queue-client';

const app = express();
app.use(express.json());

// Send email endpoint
app.post('/api/emails', async (req, res) => {
  try {
    const job = await emailService.sendEmail(req.body);
    res.status(201).json({
      jobId: job.id,
      message: 'Email queued successfully',
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get email status
app.get('/api/emails/:jobId', async (req, res) => {
  try {
    const status = await emailService.getEmailStatus(req.params.jobId);
    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Queue metrics endpoint
app.get('/api/queues/metrics', async (req, res) => {
  try {
    const metrics = await Promise.all(
      Object.values(QUEUE_NAMES).map(async (name) => ({
        queue: name,
        ...(await getQueueMetrics(name)),
      }))
    );
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

## Creating a Worker Application

Create the email worker application:

```bash
mkdir -p apps/worker-email/src
```

`apps/worker-email/package.json`:

```json
{
  "name": "@monorepo/worker-email",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node-dev --respawn src/index.ts",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@monorepo/queue-types": "workspace:*",
    "@monorepo/queue-worker": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

`apps/worker-email/src/email.worker.ts`:

```typescript
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  EmailJobData,
  EmailJobResult,
} from '@monorepo/queue-types';
import { BaseWorker } from '@monorepo/queue-worker';

export class EmailWorker extends BaseWorker<typeof QUEUE_NAMES.EMAIL> {
  constructor() {
    super(QUEUE_NAMES.EMAIL, {
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 1000,
      },
    });
  }

  protected async process(
    job: Job<EmailJobData, EmailJobResult>
  ): Promise<EmailJobResult> {
    const { to, subject, template, templateData } = job.data;

    console.log(`Processing email job ${job.id}: ${subject} -> ${to}`);
    await job.updateProgress(10);

    // Render template
    const html = await this.renderTemplate(template, templateData);
    await job.updateProgress(30);

    // Send email (using your preferred email provider)
    const messageId = await this.sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    await job.updateProgress(100);

    return {
      messageId,
      provider: 'sendgrid',
      sentAt: new Date().toISOString(),
      recipients: Array.isArray(to) ? to : [to],
    };
  }

  private async renderTemplate(
    template: string,
    data: Record<string, unknown>
  ): Promise<string> {
    // Implement template rendering
    return `<html><body>Template: ${template}</body></html>`;
  }

  private async sendEmail(options: {
    to: string[];
    subject: string;
    html: string;
  }): Promise<string> {
    // Implement email sending
    return `msg_${Date.now()}`;
  }

  protected onCompleted(
    job: Job<EmailJobData, EmailJobResult>,
    result: EmailJobResult
  ): void {
    console.log(
      `Email sent to ${job.data.to}: messageId=${result.messageId}`
    );
  }

  protected onFailed(
    job: Job<EmailJobData, EmailJobResult> | undefined,
    error: Error
  ): void {
    console.error(`Failed to send email to ${job?.data.to}:`, error.message);
    // Add alerting/monitoring here
  }
}
```

`apps/worker-email/src/index.ts`:

```typescript
import { workerManager } from '@monorepo/queue-worker';
import { EmailWorker } from './email.worker';

async function main() {
  const emailWorker = new EmailWorker();
  workerManager.register('email', emailWorker);

  await workerManager.startAll();
  console.log('Email worker is running...');
}

main().catch((error) => {
  console.error('Failed to start email worker:', error);
  process.exit(1);
});
```

## Running the Monorepo

Install dependencies and build:

```bash
pnpm install
pnpm build
```

Run services in development:

```bash
# Terminal 1: Start API
pnpm --filter @monorepo/api dev

# Terminal 2: Start email worker
pnpm --filter @monorepo/worker-email dev
```

## Best Practices for Monorepo BullMQ Setup

1. **Centralize type definitions** - Keep all job types in a shared package to ensure consistency.

2. **Use workspace protocol** - Reference internal packages with `workspace:*` for automatic version management.

3. **Share connection configuration** - Create a shared connection module to avoid configuration drift.

4. **Implement base classes** - Use abstract base classes for workers to enforce consistent patterns.

5. **Version packages together** - Keep all queue-related packages at the same version.

6. **Use TypeScript project references** - Enable incremental builds with project references.

7. **Centralize job options** - Define default job options in the shared package.

8. **Create service classes** - Encapsulate queue operations in service classes for clean APIs.

9. **Document job contracts** - Add JSDoc comments to job interfaces for better developer experience.

10. **Test across packages** - Write integration tests that verify the entire queue flow.

## Conclusion

Setting up BullMQ in a monorepo provides significant benefits for teams building distributed systems. Shared types ensure consistency across services, centralized configuration reduces drift, and the monorepo structure makes it easy to refactor and evolve your job processing architecture. With proper package organization and TypeScript configuration, you get a maintainable and type-safe job queue system that scales with your team and application.
