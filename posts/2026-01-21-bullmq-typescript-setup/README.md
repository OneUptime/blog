# How to Set Up BullMQ with TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, TypeScript, Node.js, Redis, Job Queue, Background Jobs

Description: A comprehensive guide to setting up BullMQ with TypeScript for type-safe job queues, including project configuration, job definitions, workers, and best practices for production applications.

---

BullMQ is a powerful job queue library for Node.js built on top of Redis. When combined with TypeScript, you get type-safe job definitions, better IDE support, and fewer runtime errors. This guide walks you through setting up a production-ready BullMQ project with TypeScript.

## Prerequisites

Before starting, ensure you have:

- Node.js 18 or later
- Redis 6.2 or later running locally or remotely
- Basic familiarity with TypeScript and Node.js

## Project Setup

Start by creating a new project and installing the required dependencies:

```bash
mkdir bullmq-typescript-example
cd bullmq-typescript-example
npm init -y
npm install bullmq ioredis
npm install -D typescript @types/node ts-node nodemon
```

Initialize TypeScript configuration:

```bash
npx tsc --init
```

Update your `tsconfig.json` for optimal BullMQ development:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Update your `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts",
    "worker": "ts-node src/worker.ts"
  }
}
```

## Defining Type-Safe Job Data

Create a directory structure for your project:

```bash
mkdir -p src/jobs src/queues src/workers src/types
```

First, define your job data types in `src/types/jobs.ts`:

```typescript
// src/types/jobs.ts

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export interface ImageProcessingJobData {
  imageUrl: string;
  operations: Array<{
    type: 'resize' | 'crop' | 'rotate' | 'compress';
    params: Record<string, number | string>;
  }>;
  outputFormat: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export interface ReportGenerationJobData {
  reportType: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  userId: string;
  format: 'pdf' | 'csv' | 'xlsx';
}

export interface WebhookDeliveryJobData {
  url: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  maxRetries?: number;
}

// Union type for all job data
export type JobData =
  | EmailJobData
  | ImageProcessingJobData
  | ReportGenerationJobData
  | WebhookDeliveryJobData;

// Job result types
export interface EmailJobResult {
  messageId: string;
  sentAt: Date;
}

export interface ImageProcessingJobResult {
  outputUrl: string;
  dimensions: { width: number; height: number };
  fileSize: number;
}

export interface ReportGenerationJobResult {
  reportUrl: string;
  generatedAt: Date;
  rowCount: number;
}

export interface WebhookDeliveryJobResult {
  statusCode: number;
  responseBody?: string;
  deliveredAt: Date;
}
```

## Creating a Type-Safe Queue Factory

Create a reusable queue factory in `src/queues/queue-factory.ts`:

```typescript
// src/queues/queue-factory.ts

import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

// Shared Redis connection for all queues
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Default queue options
const defaultQueueOptions: Partial<QueueOptions> = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
};

// Type-safe queue factory
export function createQueue<TData, TResult = void>(
  name: string,
  options?: Partial<QueueOptions>
): Queue<TData, TResult> {
  return new Queue<TData, TResult>(name, {
    ...defaultQueueOptions,
    ...options,
  });
}

// Export connection for workers
export { connection };
```

## Setting Up Queues

Create individual queue instances in `src/queues/index.ts`:

```typescript
// src/queues/index.ts

import { createQueue } from './queue-factory';
import {
  EmailJobData,
  EmailJobResult,
  ImageProcessingJobData,
  ImageProcessingJobResult,
  ReportGenerationJobData,
  ReportGenerationJobResult,
  WebhookDeliveryJobData,
  WebhookDeliveryJobResult,
} from '../types/jobs';

// Email queue with specific options
export const emailQueue = createQueue<EmailJobData, EmailJobResult>(
  'email',
  {
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  }
);

// Image processing queue
export const imageQueue = createQueue<ImageProcessingJobData, ImageProcessingJobResult>(
  'image-processing',
  {
    defaultJobOptions: {
      attempts: 3,
      timeout: 300000, // 5 minutes
    },
  }
);

// Report generation queue
export const reportQueue = createQueue<ReportGenerationJobData, ReportGenerationJobResult>(
  'report-generation',
  {
    defaultJobOptions: {
      attempts: 2,
      timeout: 600000, // 10 minutes
    },
  }
);

// Webhook delivery queue with rate limiting
export const webhookQueue = createQueue<WebhookDeliveryJobData, WebhookDeliveryJobResult>(
  'webhook-delivery',
  {
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  }
);
```

## Creating Type-Safe Workers

Create a worker factory in `src/workers/worker-factory.ts`:

```typescript
// src/workers/worker-factory.ts

import { Worker, WorkerOptions, Job, Processor } from 'bullmq';
import { connection } from '../queues/queue-factory';

// Default worker options
const defaultWorkerOptions: Partial<WorkerOptions> = {
  connection,
  concurrency: 5,
  limiter: {
    max: 100,
    duration: 1000,
  },
};

// Type-safe worker factory
export function createWorker<TData, TResult = void>(
  queueName: string,
  processor: Processor<TData, TResult>,
  options?: Partial<WorkerOptions>
): Worker<TData, TResult> {
  const worker = new Worker<TData, TResult>(
    queueName,
    processor,
    {
      ...defaultWorkerOptions,
      ...options,
    }
  );

  // Set up event handlers
  worker.on('completed', (job: Job<TData, TResult>) => {
    console.log(`Job ${job.id} completed in queue ${queueName}`);
  });

  worker.on('failed', (job: Job<TData, TResult> | undefined, error: Error) => {
    console.error(`Job ${job?.id} failed in queue ${queueName}:`, error.message);
  });

  worker.on('error', (error: Error) => {
    console.error(`Worker error in queue ${queueName}:`, error.message);
  });

  return worker;
}
```

## Implementing Job Processors

Create individual processors for each job type in `src/workers/processors/`:

```typescript
// src/workers/processors/email.processor.ts

import { Job } from 'bullmq';
import { EmailJobData, EmailJobResult } from '../../types/jobs';

export async function processEmailJob(
  job: Job<EmailJobData, EmailJobResult>
): Promise<EmailJobResult> {
  const { to, subject, body, attachments } = job.data;

  // Log progress
  await job.updateProgress(10);
  console.log(`Processing email job ${job.id}: Sending to ${to}`);

  // Simulate email sending
  await job.updateProgress(50);

  // In production, use a real email service like SendGrid, AWS SES, etc.
  const result: EmailJobResult = {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sentAt: new Date(),
  };

  await job.updateProgress(100);
  console.log(`Email sent successfully: ${result.messageId}`);

  return result;
}
```

```typescript
// src/workers/processors/image.processor.ts

import { Job } from 'bullmq';
import { ImageProcessingJobData, ImageProcessingJobResult } from '../../types/jobs';

export async function processImageJob(
  job: Job<ImageProcessingJobData, ImageProcessingJobResult>
): Promise<ImageProcessingJobResult> {
  const { imageUrl, operations, outputFormat, quality } = job.data;

  console.log(`Processing image job ${job.id}: ${imageUrl}`);

  // Track progress through operations
  const totalOps = operations.length;
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    console.log(`Applying operation: ${op.type}`);
    await job.updateProgress(Math.round(((i + 1) / totalOps) * 80));

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Simulate output
  const result: ImageProcessingJobResult = {
    outputUrl: `https://cdn.example.com/processed/${job.id}.${outputFormat}`,
    dimensions: { width: 800, height: 600 },
    fileSize: 150000,
  };

  await job.updateProgress(100);
  return result;
}
```

```typescript
// src/workers/processors/webhook.processor.ts

import { Job } from 'bullmq';
import { WebhookDeliveryJobData, WebhookDeliveryJobResult } from '../../types/jobs';

export async function processWebhookJob(
  job: Job<WebhookDeliveryJobData, WebhookDeliveryJobResult>
): Promise<WebhookDeliveryJobResult> {
  const { url, payload, headers } = job.data;

  console.log(`Delivering webhook ${job.id} to ${url}`);
  await job.updateProgress(10);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    await job.updateProgress(90);

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }

    const responseBody = await response.text();

    const result: WebhookDeliveryJobResult = {
      statusCode: response.status,
      responseBody,
      deliveredAt: new Date(),
    };

    await job.updateProgress(100);
    return result;
  } catch (error) {
    throw new Error(`Webhook delivery error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

## Starting Workers

Create the main worker file in `src/worker.ts`:

```typescript
// src/worker.ts

import { createWorker } from './workers/worker-factory';
import { processEmailJob } from './workers/processors/email.processor';
import { processImageJob } from './workers/processors/image.processor';
import { processWebhookJob } from './workers/processors/webhook.processor';
import {
  EmailJobData,
  EmailJobResult,
  ImageProcessingJobData,
  ImageProcessingJobResult,
  WebhookDeliveryJobData,
  WebhookDeliveryJobResult,
} from './types/jobs';

// Create workers
const emailWorker = createWorker<EmailJobData, EmailJobResult>(
  'email',
  processEmailJob,
  { concurrency: 10 }
);

const imageWorker = createWorker<ImageProcessingJobData, ImageProcessingJobResult>(
  'image-processing',
  processImageJob,
  { concurrency: 3 } // Lower concurrency for CPU-intensive tasks
);

const webhookWorker = createWorker<WebhookDeliveryJobData, WebhookDeliveryJobResult>(
  'webhook-delivery',
  processWebhookJob,
  {
    concurrency: 20,
    limiter: {
      max: 50,
      duration: 1000, // 50 requests per second
    },
  }
);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Closing workers...`);

  await Promise.all([
    emailWorker.close(),
    imageWorker.close(),
    webhookWorker.close(),
  ]);

  console.log('All workers closed. Exiting...');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log('Workers started. Waiting for jobs...');
```

## Adding Jobs to Queues

Create a service to add jobs in `src/services/job.service.ts`:

```typescript
// src/services/job.service.ts

import { JobsOptions } from 'bullmq';
import { emailQueue, imageQueue, webhookQueue, reportQueue } from '../queues';
import {
  EmailJobData,
  ImageProcessingJobData,
  ReportGenerationJobData,
  WebhookDeliveryJobData,
} from '../types/jobs';

export class JobService {
  // Add email job
  async sendEmail(data: EmailJobData, options?: JobsOptions) {
    const job = await emailQueue.add('send-email', data, {
      priority: 1,
      ...options,
    });
    console.log(`Email job created: ${job.id}`);
    return job;
  }

  // Add high-priority email job
  async sendUrgentEmail(data: EmailJobData) {
    return this.sendEmail(data, { priority: 0 });
  }

  // Add delayed email job
  async scheduleEmail(data: EmailJobData, delay: number) {
    return this.sendEmail(data, { delay });
  }

  // Add image processing job
  async processImage(data: ImageProcessingJobData, options?: JobsOptions) {
    const job = await imageQueue.add('process-image', data, options);
    console.log(`Image processing job created: ${job.id}`);
    return job;
  }

  // Add webhook delivery job
  async deliverWebhook(data: WebhookDeliveryJobData, options?: JobsOptions) {
    const job = await webhookQueue.add('deliver-webhook', data, {
      ...options,
      // Use URL as job ID to prevent duplicates
      jobId: `webhook_${Buffer.from(data.url).toString('base64')}_${Date.now()}`,
    });
    console.log(`Webhook job created: ${job.id}`);
    return job;
  }

  // Add report generation job
  async generateReport(data: ReportGenerationJobData, options?: JobsOptions) {
    const job = await reportQueue.add('generate-report', data, options);
    console.log(`Report generation job created: ${job.id}`);
    return job;
  }

  // Bulk add jobs
  async sendBulkEmails(emails: EmailJobData[]) {
    const jobs = emails.map((data, index) => ({
      name: 'send-email',
      data,
      opts: {
        priority: 2,
        delay: index * 100, // Stagger emails
      },
    }));

    const addedJobs = await emailQueue.addBulk(jobs);
    console.log(`Added ${addedJobs.length} email jobs`);
    return addedJobs;
  }
}

export const jobService = new JobService();
```

## Main Application Entry Point

Create the main entry point in `src/index.ts`:

```typescript
// src/index.ts

import { jobService } from './services/job.service';
import { emailQueue, imageQueue, webhookQueue } from './queues';

async function main() {
  console.log('BullMQ TypeScript Example');

  // Example: Add an email job
  await jobService.sendEmail({
    to: 'user@example.com',
    subject: 'Welcome to Our Service',
    body: '<h1>Welcome!</h1><p>Thank you for signing up.</p>',
  });

  // Example: Add a scheduled email
  await jobService.scheduleEmail(
    {
      to: 'user@example.com',
      subject: 'Follow-up Email',
      body: '<p>How are you enjoying our service?</p>',
    },
    60000 // 1 minute delay
  );

  // Example: Add image processing job
  await jobService.processImage({
    imageUrl: 'https://example.com/image.jpg',
    operations: [
      { type: 'resize', params: { width: 800, height: 600 } },
      { type: 'compress', params: { quality: 80 } },
    ],
    outputFormat: 'webp',
    quality: 85,
  });

  // Example: Add webhook delivery job
  await jobService.deliverWebhook({
    url: 'https://webhook.site/test',
    payload: {
      event: 'user.created',
      data: { userId: '123', email: 'user@example.com' },
    },
    headers: {
      'X-Webhook-Secret': 'secret123',
    },
  });

  // Example: Get queue metrics
  const emailCounts = await emailQueue.getJobCounts();
  console.log('Email queue counts:', emailCounts);

  // Keep process alive to see results
  console.log('Jobs added. Start the worker with: npm run worker');
}

main().catch(console.error);
```

## Advanced Type Patterns

For more complex scenarios, you can use discriminated unions and generic utilities:

```typescript
// src/types/advanced.ts

import { Job, Queue, Worker } from 'bullmq';

// Discriminated union for job types
export type JobDefinition =
  | { type: 'email'; data: EmailJobData }
  | { type: 'image'; data: ImageProcessingJobData }
  | { type: 'webhook'; data: WebhookDeliveryJobData };

// Generic job handler type
export type JobHandler<TData, TResult> = (
  job: Job<TData, TResult>
) => Promise<TResult>;

// Type-safe job registry
export interface JobRegistry {
  email: {
    data: EmailJobData;
    result: EmailJobResult;
  };
  'image-processing': {
    data: ImageProcessingJobData;
    result: ImageProcessingJobResult;
  };
  'webhook-delivery': {
    data: WebhookDeliveryJobData;
    result: WebhookDeliveryJobResult;
  };
}

// Utility type to get data type from registry
export type GetJobData<K extends keyof JobRegistry> = JobRegistry[K]['data'];
export type GetJobResult<K extends keyof JobRegistry> = JobRegistry[K]['result'];

// Type-safe queue getter
export function getTypedQueue<K extends keyof JobRegistry>(
  queueName: K
): Queue<GetJobData<K>, GetJobResult<K>> {
  // Implementation would return the appropriate queue
  throw new Error('Not implemented');
}
```

## Error Handling with Types

Create custom error types for better error handling:

```typescript
// src/types/errors.ts

export class JobProcessingError extends Error {
  constructor(
    message: string,
    public readonly jobId: string,
    public readonly queueName: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'JobProcessingError';
  }
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly retryDelay?: number
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

// Usage in processor
export async function processWithErrorHandling<TData, TResult>(
  job: Job<TData, TResult>,
  processor: (data: TData) => Promise<TResult>
): Promise<TResult> {
  try {
    return await processor(job.data);
  } catch (error) {
    if (error instanceof NonRetryableError) {
      // Move to dead letter queue or mark as permanently failed
      throw error;
    }
    if (error instanceof RetryableError) {
      // Will be retried with default backoff
      throw error;
    }
    // Wrap unknown errors
    throw new JobProcessingError(
      error instanceof Error ? error.message : 'Unknown error',
      job.id || 'unknown',
      job.queueName,
      error instanceof Error ? error : undefined
    );
  }
}
```

## Testing Type Safety

TypeScript will catch errors at compile time:

```typescript
// This will cause a TypeScript error - missing required field
await jobService.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  // Error: Property 'body' is missing
});

// This will cause a TypeScript error - wrong type
await jobService.processImage({
  imageUrl: 'https://example.com/image.jpg',
  operations: [
    { type: 'invalid-op', params: {} }, // Error: type must be 'resize' | 'crop' | 'rotate' | 'compress'
  ],
  outputFormat: 'webp',
});
```

## Best Practices

1. **Define job data interfaces** - Always create explicit interfaces for job data to ensure type safety across your application.

2. **Use discriminated unions** - When a queue handles multiple job types, use discriminated unions to ensure proper handling.

3. **Create factory functions** - Use factory functions for queues and workers to ensure consistent configuration.

4. **Separate concerns** - Keep job definitions, processors, and queue configurations in separate files.

5. **Handle errors properly** - Create custom error types to distinguish between retryable and non-retryable errors.

6. **Use strict mode** - Enable TypeScript strict mode for maximum type safety.

7. **Export types** - Export your job types so they can be shared across services in a distributed system.

## Conclusion

Setting up BullMQ with TypeScript provides significant benefits including compile-time type checking, better IDE support with autocomplete, and more maintainable code. The type system helps catch errors early and makes it easier to refactor job definitions as your application grows.

The combination of BullMQ's powerful features and TypeScript's type safety creates a robust foundation for building reliable background job processing systems. Whether you're sending emails, processing images, or delivering webhooks, type-safe queues help ensure your jobs are processed correctly.
