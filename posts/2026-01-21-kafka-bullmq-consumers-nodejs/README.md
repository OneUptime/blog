# How to Build Kafka and BullMQ Consumers in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, BullMQ, Node.js, Message Queue, Redis, Event-Driven, TypeScript, Backend

Description: Learn how to build reliable message consumers in Node.js using Kafka and BullMQ. This guide covers consumer configuration, error handling, retry strategies, and best practices for processing messages at scale.

---

> Message queues are essential for building scalable, decoupled systems. Kafka excels at high-throughput event streaming across distributed systems, while BullMQ provides a simpler queue solution backed by Redis. This guide shows you how to build reliable consumers for both.

Choosing between Kafka and BullMQ depends on your needs. Kafka handles massive throughput and provides durable event logs, making it ideal for event sourcing and data pipelines. BullMQ is simpler to operate and perfect for background job processing, scheduled tasks, and moderate-scale message handling.

---

## Prerequisites

Before starting, ensure you have:
- Node.js 18 or higher
- Docker for running Kafka and Redis
- Basic understanding of TypeScript
- Familiarity with async/await patterns

---

## Part 1: Building Kafka Consumers

Kafka consumers read messages from topics and process them. Let us start by setting up Kafka and building a production-ready consumer.

### Setting Up Kafka with Docker

```yaml
# docker-compose.yml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
```

Start the services:

```bash
docker-compose up -d
```

### Project Setup for Kafka

```bash
mkdir kafka-consumer
cd kafka-consumer
npm init -y
npm install kafkajs uuid
npm install -D typescript @types/node @types/uuid ts-node
npx tsc --init
```

### Building the Kafka Consumer

Create a robust consumer with proper error handling and graceful shutdown.

```typescript
// src/kafka/consumer.ts
import { Kafka, Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs';

// Configuration interface for the consumer
interface KafkaConsumerConfig {
  brokers: string[];
  groupId: string;
  clientId: string;
  topics: string[];
}

// Message handler type
type MessageHandler = (
  topic: string,
  partition: number,
  message: KafkaMessage
) => Promise<void>;

export class KafkaConsumerService {
  private kafka: Kafka;
  private consumer: Consumer;
  private config: KafkaConsumerConfig;
  private handlers = new Map<string, MessageHandler>();
  private isRunning = false;

  constructor(config: KafkaConsumerConfig) {
    this.config = config;

    // Initialize the Kafka client
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      // Retry configuration for connection issues
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
      },
    });

    // Create the consumer with group coordination
    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      // Control how often offsets are committed
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      // Start from the earliest message if no offset exists
      // Use 'latest' to only receive new messages
    });
  }

  // Register a handler for a specific topic
  registerHandler(topic: string, handler: MessageHandler): void {
    this.handlers.set(topic, handler);
    console.log(`Registered handler for topic: ${topic}`);
  }

  // Start consuming messages
  async start(): Promise<void> {
    console.log('Connecting to Kafka...');

    // Connect to the Kafka cluster
    await this.consumer.connect();
    console.log('Connected to Kafka');

    // Subscribe to all configured topics
    for (const topic of this.config.topics) {
      await this.consumer.subscribe({
        topic,
        fromBeginning: false, // Set true to read all historical messages
      });
      console.log(`Subscribed to topic: ${topic}`);
    }

    this.isRunning = true;

    // Start processing messages
    await this.consumer.run({
      // Process one message at a time for simplicity
      // Set partitionsConsumedConcurrently for parallel processing
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload);
      },
    });

    console.log('Kafka consumer started');
  }

  // Process a single message
  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const messageId = message.key?.toString() || 'unknown';

    console.log(`Processing message from ${topic}[${partition}]: ${messageId}`);

    const handler = this.handlers.get(topic);

    if (!handler) {
      console.warn(`No handler registered for topic: ${topic}`);
      return;
    }

    const startTime = Date.now();

    try {
      await handler(topic, partition, message);

      console.log(
        `Message ${messageId} processed in ${Date.now() - startTime}ms`
      );
    } catch (error) {
      // Log the error but do not crash
      // Kafka will automatically retry based on your configuration
      console.error(`Error processing message ${messageId}:`, error);

      // For critical errors, you might want to:
      // 1. Send to a dead letter queue
      // 2. Alert the team
      // 3. Pause the consumer

      // Re-throw to trigger Kafka's retry mechanism
      throw error;
    }
  }

  // Graceful shutdown
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('Stopping Kafka consumer...');
    this.isRunning = false;

    // Disconnect gracefully
    // This commits any pending offsets and leaves the consumer group
    await this.consumer.disconnect();
    console.log('Kafka consumer stopped');
  }
}
```

### Creating Message Handlers

Define handlers for different message types.

```typescript
// src/kafka/handlers/order-handler.ts
import { KafkaMessage } from 'kafkajs';

// Define the expected message structure
interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  createdAt: string;
}

export async function handleOrderCreated(
  topic: string,
  partition: number,
  message: KafkaMessage
): Promise<void> {
  // Parse the message value
  const value = message.value?.toString();

  if (!value) {
    console.warn('Received message with no value');
    return;
  }

  // Deserialize the event
  const event: OrderCreatedEvent = JSON.parse(value);

  console.log(`Processing order: ${event.orderId}`);
  console.log(`Customer: ${event.customerId}`);
  console.log(`Items: ${event.items.length}`);
  console.log(`Total: $${event.totalAmount.toFixed(2)}`);

  // Simulate processing time
  await processOrder(event);

  console.log(`Order ${event.orderId} processing complete`);
}

async function processOrder(event: OrderCreatedEvent): Promise<void> {
  // Your business logic here
  // Examples:
  // - Update inventory
  // - Send confirmation email
  // - Trigger fulfillment workflow

  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### Running the Kafka Consumer

```typescript
// src/kafka/index.ts
import { KafkaConsumerService } from './consumer';
import { handleOrderCreated } from './handlers/order-handler';

async function main() {
  const consumer = new KafkaConsumerService({
    brokers: ['localhost:9092'],
    groupId: 'order-processing-service',
    clientId: 'order-processor-1',
    topics: ['order-created', 'order-updated'],
  });

  // Register message handlers
  consumer.registerHandler('order-created', handleOrderCreated);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutdown signal received');
    await consumer.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start consuming
  try {
    await consumer.start();
    console.log('Consumer is running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('Failed to start consumer:', error);
    process.exit(1);
  }
}

main();
```

---

## Part 2: Building BullMQ Consumers

BullMQ provides a simpler queue abstraction backed by Redis. It excels at job processing with features like retries, delays, and rate limiting.

### Setting Up Redis

```bash
# Add Redis to your docker-compose.yml or run standalone
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Project Setup for BullMQ

```bash
mkdir bullmq-consumer
cd bullmq-consumer
npm init -y
npm install bullmq ioredis uuid
npm install -D typescript @types/node @types/uuid ts-node
npx tsc --init
```

### Building the BullMQ Worker

BullMQ uses workers to process jobs from queues.

```typescript
// src/bullmq/worker.ts
import { Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

// Job data interface
interface JobData {
  [key: string]: any;
}

// Job result interface
interface JobResult {
  success: boolean;
  message?: string;
  data?: any;
}

// Job processor function type
type JobProcessor<T extends JobData, R extends JobResult> = (
  job: Job<T>
) => Promise<R>;

// Worker configuration
interface WorkerConfig {
  queueName: string;
  redisUrl: string;
  concurrency: number;
}

export class BullMQWorkerService<T extends JobData, R extends JobResult> {
  private worker: Worker<T, R>;
  private queueEvents: QueueEvents;
  private config: WorkerConfig;
  private connection: Redis;

  constructor(config: WorkerConfig, processor: JobProcessor<T, R>) {
    this.config = config;

    // Create Redis connection
    this.connection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
    });

    // Create the worker
    this.worker = new Worker<T, R>(
      config.queueName,
      async (job: Job<T>) => {
        return this.processJob(job, processor);
      },
      {
        connection: this.connection,
        concurrency: config.concurrency,
        // Stalled job detection
        stalledInterval: 30000,
        // Lock duration before job is considered stalled
        lockDuration: 30000,
      }
    );

    // Set up queue events for monitoring
    this.queueEvents = new QueueEvents(config.queueName, {
      connection: this.connection.duplicate(),
    });

    this.setupEventHandlers();
  }

  private async processJob(
    job: Job<T>,
    processor: JobProcessor<T, R>
  ): Promise<R> {
    const startTime = Date.now();
    console.log(`Starting job ${job.id} (${job.name}), attempt ${job.attemptsMade + 1}`);

    try {
      // Update progress to indicate job has started
      await job.updateProgress(0);

      // Execute the processor
      const result = await processor(job);

      // Mark as complete
      await job.updateProgress(100);

      console.log(
        `Job ${job.id} completed in ${Date.now() - startTime}ms`
      );

      return result;
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);

      // Add error details to job for debugging
      await job.log(`Error: ${(error as Error).message}`);

      throw error; // BullMQ will handle retries
    }
  }

  private setupEventHandlers(): void {
    // Worker events
    this.worker.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed with result:`, result);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`Job ${jobId} has stalled`);
    });

    // Queue events
    this.queueEvents.on('waiting', ({ jobId }) => {
      console.log(`Job ${jobId} is waiting`);
    });

    this.queueEvents.on('active', ({ jobId, prev }) => {
      console.log(`Job ${jobId} is active (was ${prev})`);
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      console.log(`Job ${jobId} progress: ${data}%`);
    });
  }

  // Pause the worker
  async pause(): Promise<void> {
    await this.worker.pause();
    console.log('Worker paused');
  }

  // Resume the worker
  async resume(): Promise<void> {
    await this.worker.resume();
    console.log('Worker resumed');
  }

  // Graceful shutdown
  async close(): Promise<void> {
    console.log('Closing BullMQ worker...');

    // Close the worker (waits for active jobs to complete)
    await this.worker.close();

    // Close queue events
    await this.queueEvents.close();

    // Close Redis connection
    await this.connection.quit();

    console.log('BullMQ worker closed');
  }
}
```

### Creating a Queue Service for Adding Jobs

```typescript
// src/bullmq/queue.ts
import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

interface QueueConfig {
  queueName: string;
  redisUrl: string;
}

export class BullMQQueueService<T> {
  private queue: Queue<T>;
  private connection: Redis;

  constructor(config: QueueConfig) {
    this.connection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue<T>(config.queueName, {
      connection: this.connection,
      defaultJobOptions: {
        // Default retry configuration
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // Start with 1 second
        },
        // Remove completed jobs after 1 hour
        removeOnComplete: {
          age: 3600,
          count: 1000,
        },
        // Keep failed jobs for debugging
        removeOnFail: {
          age: 86400, // 24 hours
        },
      },
    });
  }

  // Add a job to the queue
  async addJob(name: string, data: T, options?: JobsOptions): Promise<string> {
    const job = await this.queue.add(name, data, options);
    console.log(`Added job ${job.id} (${name}) to queue`);
    return job.id!;
  }

  // Add a delayed job
  async addDelayedJob(
    name: string,
    data: T,
    delayMs: number
  ): Promise<string> {
    const job = await this.queue.add(name, data, {
      delay: delayMs,
    });
    console.log(`Added delayed job ${job.id} (${name}), delay: ${delayMs}ms`);
    return job.id!;
  }

  // Add a scheduled job using cron
  async addRepeatingJob(
    name: string,
    data: T,
    cronPattern: string
  ): Promise<void> {
    await this.queue.add(name, data, {
      repeat: {
        pattern: cronPattern,
      },
    });
    console.log(`Added repeating job (${name}) with pattern: ${cronPattern}`);
  }

  // Add multiple jobs in bulk
  async addBulk(
    jobs: Array<{ name: string; data: T; options?: JobsOptions }>
  ): Promise<string[]> {
    const result = await this.queue.addBulk(jobs);
    console.log(`Added ${result.length} jobs to queue`);
    return result.map(job => job.id!);
  }

  // Get queue statistics
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  // Clean old jobs
  async clean(grace: number, status: 'completed' | 'failed'): Promise<void> {
    const count = await this.queue.clean(grace, 1000, status);
    console.log(`Cleaned ${count.length} ${status} jobs`);
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
```

### Example: Email Sending Worker

```typescript
// src/bullmq/workers/email-worker.ts
import { Job } from 'bullmq';
import { BullMQWorkerService } from '../worker';

// Define job data structure
interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
}

// Define result structure
interface EmailJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// The processor function
async function processEmailJob(
  job: Job<EmailJobData>
): Promise<EmailJobResult> {
  const { to, subject, body, templateId, variables } = job.data;

  console.log(`Sending email to ${to}: ${subject}`);

  // Update progress as we go
  await job.updateProgress(10);

  try {
    // Simulate email sending
    // Replace with actual email service integration
    await sendEmail(to, subject, body);

    await job.updateProgress(100);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate occasional failures for retry demonstration
  if (Math.random() < 0.1) {
    throw new Error('Email service temporarily unavailable');
  }

  console.log(`Email sent to ${to}`);
}

// Create and export the worker
export function createEmailWorker(): BullMQWorkerService<EmailJobData, EmailJobResult> {
  return new BullMQWorkerService<EmailJobData, EmailJobResult>(
    {
      queueName: 'email-queue',
      redisUrl: 'redis://localhost:6379',
      concurrency: 5, // Process 5 emails concurrently
    },
    processEmailJob
  );
}
```

### Running BullMQ Workers

```typescript
// src/bullmq/index.ts
import { createEmailWorker } from './workers/email-worker';
import { BullMQQueueService } from './queue';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

async function main() {
  // Create the queue for adding jobs
  const emailQueue = new BullMQQueueService<EmailJobData>({
    queueName: 'email-queue',
    redisUrl: 'redis://localhost:6379',
  });

  // Create and start the worker
  const emailWorker = createEmailWorker();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutdown signal received');
    await emailWorker.close();
    await emailQueue.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('Email worker started. Adding sample jobs...');

  // Add some sample jobs
  await emailQueue.addJob('welcome-email', {
    to: 'user@example.com',
    subject: 'Welcome to our service',
    body: 'Thank you for signing up!',
  });

  await emailQueue.addJob('notification', {
    to: 'user@example.com',
    subject: 'Your order has shipped',
    body: 'Track your package at...',
  });

  // Add a delayed job
  await emailQueue.addDelayedJob(
    'reminder',
    {
      to: 'user@example.com',
      subject: 'Complete your profile',
      body: 'You have not finished setting up your profile.',
    },
    5000 // 5 seconds delay
  );

  // Check queue stats periodically
  setInterval(async () => {
    const stats = await emailQueue.getStats();
    console.log('Queue stats:', stats);
  }, 10000);

  console.log('Worker is running. Press Ctrl+C to stop.');
}

main().catch(console.error);
```

---

## Best Practices for Both Systems

### Error Handling and Retries

```typescript
// src/common/retry-strategy.ts

// Exponential backoff with jitter
export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 60000
): number {
  // Exponential: 1s, 2s, 4s, 8s, 16s, ...
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (random 0-25% variation) to prevent thundering herd
  const jitter = cappedDelay * Math.random() * 0.25;

  return Math.floor(cappedDelay + jitter);
}

// Determine if an error is retryable
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network-related errors are usually transient
  const retryablePatterns = [
    'timeout',
    'econnrefused',
    'econnreset',
    'temporarily unavailable',
    'service unavailable',
    'rate limit',
    'too many requests',
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}
```

### Dead Letter Queues

```typescript
// src/common/dead-letter.ts
import { BullMQQueueService } from '../bullmq/queue';

interface DeadLetterEntry {
  originalQueue: string;
  jobId: string;
  jobData: any;
  error: string;
  failedAt: Date;
  attempts: number;
}

export class DeadLetterQueue {
  private queue: BullMQQueueService<DeadLetterEntry>;

  constructor(redisUrl: string) {
    this.queue = new BullMQQueueService<DeadLetterEntry>({
      queueName: 'dead-letter-queue',
      redisUrl,
    });
  }

  async add(entry: DeadLetterEntry): Promise<void> {
    await this.queue.addJob('failed-job', entry);
    console.log(`Job ${entry.jobId} sent to dead letter queue`);
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
```

### Health Checks

```typescript
// src/common/health.ts
import { Redis } from 'ioredis';
import { Kafka } from 'kafkajs';

export interface HealthStatus {
  healthy: boolean;
  kafka?: { connected: boolean; error?: string };
  redis?: { connected: boolean; error?: string };
}

export async function checkKafkaHealth(brokers: string[]): Promise<{
  connected: boolean;
  error?: string;
}> {
  const kafka = new Kafka({ brokers, clientId: 'health-check' });
  const admin = kafka.admin();

  try {
    await admin.connect();
    await admin.listTopics();
    await admin.disconnect();
    return { connected: true };
  } catch (error) {
    return { connected: false, error: (error as Error).message };
  }
}

export async function checkRedisHealth(url: string): Promise<{
  connected: boolean;
  error?: string;
}> {
  const redis = new Redis(url);

  try {
    await redis.ping();
    await redis.quit();
    return { connected: true };
  } catch (error) {
    return { connected: false, error: (error as Error).message };
  }
}
```

---

## When to Use Which

| Feature | Kafka | BullMQ |
|---------|-------|--------|
| Throughput | Millions of messages/sec | Thousands of jobs/sec |
| Message retention | Configurable (days/weeks) | Until processed |
| Ordering | Per partition | Per queue |
| Consumer groups | Native support | Single worker per queue |
| Delayed jobs | Not native | Built-in |
| Scheduled jobs | External tool needed | Built-in cron |
| Setup complexity | High (Zookeeper/KRaft) | Low (just Redis) |
| Best for | Event streaming, data pipelines | Background jobs, tasks |

---

## Conclusion

Both Kafka and BullMQ are powerful tools for building message-driven systems in Node.js. Kafka excels at high-throughput event streaming with durable logs, while BullMQ provides a simpler solution for job queues with built-in features like delays, retries, and scheduling.

Key takeaways:
- Use Kafka for event sourcing, data pipelines, and cross-service communication at scale
- Use BullMQ for background jobs, scheduled tasks, and moderate-scale message processing
- Always implement proper error handling and retry strategies
- Use dead letter queues for messages that fail repeatedly
- Monitor your consumers with health checks and metrics

Start with BullMQ if you are unsure, and migrate to Kafka when you need its advanced features.

---

*Running message consumers in production? [OneUptime](https://oneuptime.com) monitors your queue depths, consumer lag, and processing times to help you catch issues before they affect users.*
