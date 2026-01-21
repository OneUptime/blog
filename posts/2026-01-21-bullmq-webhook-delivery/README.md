# How to Build a Webhook Delivery System with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Webhooks, HTTP Delivery, Event-Driven, Retry Logic, Reliability

Description: A comprehensive guide to building a reliable webhook delivery system with BullMQ, including retry strategies, signature verification, rate limiting, delivery tracking, and handling failures gracefully.

---

Webhook delivery requires reliability, retries, and careful handling of failures. BullMQ provides the perfect foundation for building a robust webhook system that ensures events reach their destinations even when endpoints are temporarily unavailable. This guide covers building a production-ready webhook delivery system.

## Basic Webhook Queue Setup

Create a simple webhook delivery queue:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import crypto from 'crypto';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

interface WebhookJobData {
  webhookId: string;
  url: string;
  event: string;
  payload: Record<string, any>;
  secret?: string;
  headers?: Record<string, string>;
  metadata?: {
    subscriptionId: string;
    customerId: string;
  };
}

interface WebhookResult {
  success: boolean;
  statusCode: number;
  responseBody?: string;
  duration: number;
  attempt: number;
}

const webhookQueue = new Queue<WebhookJobData>('webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 60000, // Start with 1 minute
    },
    removeOnComplete: {
      age: 86400, // Keep for 24 hours
      count: 10000,
    },
    removeOnFail: {
      age: 604800, // Keep failed for 7 days
    },
  },
});

const webhookWorker = new Worker<WebhookJobData, WebhookResult>(
  'webhooks',
  async (job) => {
    const { url, event, payload, secret, headers } = job.data;
    const startTime = Date.now();

    // Generate signature if secret provided
    const signature = secret
      ? generateSignature(payload, secret)
      : undefined;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Webhook-Delivery': job.id || '',
        'X-Webhook-Timestamp': Date.now().toString(),
        ...(signature && { 'X-Webhook-Signature': signature }),
        ...headers,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const duration = Date.now() - startTime;
    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${responseBody}`);
    }

    return {
      success: true,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000), // Truncate
      duration,
      attempt: job.attemptsMade + 1,
    };
  },
  {
    connection,
    concurrency: 10,
  }
);

function generateSignature(payload: any, secret: string): string {
  const timestamp = Date.now();
  const data = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

webhookWorker.on('failed', (job, error) => {
  console.error(`Webhook ${job?.id} failed:`, error.message);
});
```

## Webhook Service with Subscriptions

Create a complete webhook service:

```typescript
interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  customerId: string;
  metadata?: Record<string, any>;
}

interface WebhookEvent {
  event: string;
  data: Record<string, any>;
  occurredAt: Date;
}

class WebhookService {
  private queue: Queue<WebhookJobData>;
  private subscriptions: Map<string, WebhookSubscription> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('webhooks', {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      },
    });
  }

  registerSubscription(subscription: WebhookSubscription): void {
    this.subscriptions.set(subscription.id, subscription);
  }

  unregisterSubscription(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  async emit(event: WebhookEvent): Promise<Job<WebhookJobData>[]> {
    const jobs: Job<WebhookJobData>[] = [];

    for (const subscription of this.subscriptions.values()) {
      if (!subscription.active) continue;
      if (!subscription.events.includes(event.event) && !subscription.events.includes('*')) {
        continue;
      }

      const job = await this.queue.add(
        event.event,
        {
          webhookId: `${subscription.id}_${Date.now()}`,
          url: subscription.url,
          event: event.event,
          payload: {
            event: event.event,
            data: event.data,
            occurredAt: event.occurredAt.toISOString(),
          },
          secret: subscription.secret,
          metadata: {
            subscriptionId: subscription.id,
            customerId: subscription.customerId,
          },
        },
        {
          jobId: `webhook_${subscription.id}_${event.event}_${Date.now()}`,
        }
      );

      jobs.push(job);
    }

    return jobs;
  }

  async emitToSubscription(
    subscriptionId: string,
    event: WebhookEvent
  ): Promise<Job<WebhookJobData> | null> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.active) {
      return null;
    }

    return this.queue.add(event.event, {
      webhookId: `${subscriptionId}_${Date.now()}`,
      url: subscription.url,
      event: event.event,
      payload: {
        event: event.event,
        data: event.data,
        occurredAt: event.occurredAt.toISOString(),
      },
      secret: subscription.secret,
      metadata: {
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
      },
    });
  }
}
```

## Rate-Limited Delivery

Implement per-endpoint rate limiting:

```typescript
class RateLimitedWebhookService {
  private queues: Map<string, Queue<WebhookJobData>> = new Map();
  private defaultLimits = { max: 10, duration: 1000 }; // 10 per second

  constructor(
    private connection: Redis,
    private endpointLimits: Map<string, { max: number; duration: number }> = new Map()
  ) {}

  private getQueueForEndpoint(endpoint: string): Queue<WebhookJobData> {
    const domain = new URL(endpoint).hostname;

    if (!this.queues.has(domain)) {
      const limits = this.endpointLimits.get(domain) || this.defaultLimits;

      const queue = new Queue<WebhookJobData>(`webhooks-${domain}`, {
        connection: this.connection,
      });

      new Worker<WebhookJobData>(
        `webhooks-${domain}`,
        async (job) => this.deliverWebhook(job),
        {
          connection: this.connection,
          limiter: limits,
        }
      );

      this.queues.set(domain, queue);
    }

    return this.queues.get(domain)!;
  }

  async deliver(webhook: WebhookJobData): Promise<Job<WebhookJobData>> {
    const queue = this.getQueueForEndpoint(webhook.url);
    return queue.add('deliver', webhook);
  }

  private async deliverWebhook(job: Job<WebhookJobData>): Promise<WebhookResult> {
    const { url, payload, secret } = job.data;
    const startTime = Date.now();

    const signature = secret ? generateSignature(payload, secret) : undefined;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature && { 'X-Webhook-Signature': signature }),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      success: true,
      statusCode: response.status,
      duration: Date.now() - startTime,
      attempt: job.attemptsMade + 1,
    };
  }

  setEndpointLimit(domain: string, max: number, duration: number): void {
    this.endpointLimits.set(domain, { max, duration });
  }
}
```

## Delivery Tracking

Track webhook delivery status:

```typescript
interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  statusCode?: number;
  duration?: number;
  error?: string;
  success: boolean;
}

interface DeliveryRecord {
  webhookId: string;
  subscriptionId: string;
  event: string;
  url: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed';
  attempts: DeliveryAttempt[];
  createdAt: Date;
  deliveredAt?: Date;
  failedAt?: Date;
}

class WebhookDeliveryTracker {
  private redis: Redis;

  constructor(connection: Redis) {
    this.redis = connection;
  }

  async recordAttempt(
    webhookId: string,
    attempt: DeliveryAttempt
  ): Promise<void> {
    const key = `webhook:delivery:${webhookId}`;

    await this.redis.rpush(
      `${key}:attempts`,
      JSON.stringify(attempt)
    );

    if (attempt.success) {
      await this.redis.hset(key, {
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
      });
    } else {
      await this.redis.hset(key, {
        lastAttemptAt: new Date().toISOString(),
        lastError: attempt.error || 'Unknown error',
      });
    }

    // Set expiry
    await this.redis.expire(key, 604800); // 7 days
    await this.redis.expire(`${key}:attempts`, 604800);
  }

  async markFailed(webhookId: string): Promise<void> {
    await this.redis.hset(`webhook:delivery:${webhookId}`, {
      status: 'failed',
      failedAt: new Date().toISOString(),
    });
  }

  async getDeliveryStatus(webhookId: string): Promise<DeliveryRecord | null> {
    const key = `webhook:delivery:${webhookId}`;
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    const attempts = await this.redis.lrange(`${key}:attempts`, 0, -1);

    return {
      webhookId,
      subscriptionId: data.subscriptionId,
      event: data.event,
      url: data.url,
      payload: JSON.parse(data.payload || '{}'),
      status: data.status as any,
      attempts: attempts.map((a) => JSON.parse(a)),
      createdAt: new Date(data.createdAt),
      deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : undefined,
      failedAt: data.failedAt ? new Date(data.failedAt) : undefined,
    };
  }

  async getFailedDeliveries(
    subscriptionId: string,
    limit: number = 100
  ): Promise<DeliveryRecord[]> {
    // Implementation would scan Redis for failed deliveries
    return [];
  }
}

// Integrate with worker
const tracker = new WebhookDeliveryTracker(connection);

const trackedWorker = new Worker<WebhookJobData>(
  'webhooks',
  async (job) => {
    const startTime = Date.now();
    let statusCode: number | undefined;
    let error: string | undefined;

    try {
      const response = await fetch(job.data.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.data.payload),
        signal: AbortSignal.timeout(30000),
      });

      statusCode = response.status;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await tracker.recordAttempt(job.data.webhookId, {
        attemptNumber: job.attemptsMade + 1,
        timestamp: new Date(),
        statusCode,
        duration: Date.now() - startTime,
        success: true,
      });

      return { success: true, statusCode };
    } catch (err) {
      error = (err as Error).message;

      await tracker.recordAttempt(job.data.webhookId, {
        attemptNumber: job.attemptsMade + 1,
        timestamp: new Date(),
        statusCode,
        duration: Date.now() - startTime,
        error,
        success: false,
      });

      throw err;
    }
  },
  { connection }
);

trackedWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 1) - 1) {
    await tracker.markFailed(job.data.webhookId);
  }
});
```

## Signature Verification

Implement secure webhook signatures:

```typescript
class WebhookSigner {
  static sign(payload: any, secret: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const data = `${ts}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');

    return `t=${ts},v1=${signature}`;
  }

  static verify(
    payload: any,
    signature: string,
    secret: string,
    toleranceSeconds: number = 300
  ): boolean {
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parseInt(parts.t);
    const providedSignature = parts.v1;

    // Check timestamp tolerance
    const age = Math.abs(Date.now() - timestamp) / 1000;
    if (age > toleranceSeconds) {
      throw new Error('Webhook timestamp too old');
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    return true;
  }
}

// Usage in webhook delivery
const signedWorker = new Worker<WebhookJobData>(
  'webhooks',
  async (job) => {
    const { url, payload, secret, event } = job.data;
    const timestamp = Date.now();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
      'X-Webhook-Timestamp': timestamp.toString(),
    };

    if (secret) {
      headers['X-Webhook-Signature'] = WebhookSigner.sign(payload, secret, timestamp);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return { success: true, statusCode: response.status };
  },
  { connection }
);
```

## Webhook API Endpoints

Create API endpoints for webhook management:

```typescript
import express from 'express';

function createWebhookRouter(
  webhookService: WebhookService,
  tracker: WebhookDeliveryTracker
): express.Router {
  const router = express.Router();

  // Create subscription
  router.post('/subscriptions', async (req, res) => {
    try {
      const { url, events, customerId } = req.body;

      const subscription: WebhookSubscription = {
        id: `sub_${Date.now()}`,
        url,
        events: events || ['*'],
        secret: crypto.randomBytes(32).toString('hex'),
        active: true,
        customerId,
      };

      webhookService.registerSubscription(subscription);

      res.json({
        id: subscription.id,
        secret: subscription.secret,
        url: subscription.url,
        events: subscription.events,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // List subscriptions
  router.get('/subscriptions', async (req, res) => {
    // Implementation
  });

  // Delete subscription
  router.delete('/subscriptions/:id', async (req, res) => {
    webhookService.unregisterSubscription(req.params.id);
    res.json({ success: true });
  });

  // Get delivery status
  router.get('/deliveries/:webhookId', async (req, res) => {
    try {
      const status = await tracker.getDeliveryStatus(req.params.webhookId);
      if (!status) {
        return res.status(404).json({ error: 'Delivery not found' });
      }
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Retry failed delivery
  router.post('/deliveries/:webhookId/retry', async (req, res) => {
    try {
      const status = await tracker.getDeliveryStatus(req.params.webhookId);
      if (!status) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      const job = await webhookService.emitToSubscription(status.subscriptionId, {
        event: status.event,
        data: status.payload.data,
        occurredAt: new Date(),
      });

      res.json({ success: true, jobId: job?.id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Test webhook endpoint
  router.post('/subscriptions/:id/test', async (req, res) => {
    try {
      const job = await webhookService.emitToSubscription(req.params.id, {
        event: 'test',
        data: { message: 'This is a test webhook' },
        occurredAt: new Date(),
      });

      res.json({ success: true, jobId: job?.id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
```

## Dead Letter Queue for Failed Webhooks

Handle permanently failed webhooks:

```typescript
class WebhookDLQHandler {
  private dlq: Queue<WebhookJobData>;
  private mainQueue: Queue<WebhookJobData>;

  constructor(connection: Redis) {
    this.mainQueue = new Queue('webhooks', { connection });
    this.dlq = new Queue('webhooks-dlq', { connection });

    // Listen for final failures
    const worker = new Worker<WebhookJobData>(
      'webhooks',
      async (job) => {
        // Processing handled elsewhere
        throw new Error('This worker only handles failures');
      },
      { connection }
    );

    worker.on('failed', async (job, error) => {
      if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
        // Move to DLQ
        await this.dlq.add('failed-webhook', {
          ...job.data,
          metadata: {
            ...job.data.metadata,
            originalJobId: job.id,
            failedAt: new Date().toISOString(),
            error: error.message,
            attempts: job.attemptsMade,
          },
        });
      }
    });
  }

  async getFailedWebhooks(limit: number = 100): Promise<Job<WebhookJobData>[]> {
    return this.dlq.getJobs(['waiting', 'completed'], 0, limit);
  }

  async retryFromDLQ(jobId: string): Promise<Job<WebhookJobData> | null> {
    const dlqJob = await this.dlq.getJob(jobId);
    if (!dlqJob) return null;

    const newJob = await this.mainQueue.add('retry', dlqJob.data, {
      attempts: 3, // Fresh attempts
    });

    await dlqJob.remove();
    return newJob;
  }

  async retryAllFromDLQ(): Promise<number> {
    const jobs = await this.dlq.getJobs(['waiting']);
    let retried = 0;

    for (const job of jobs) {
      await this.mainQueue.add('retry', job.data);
      await job.remove();
      retried++;
    }

    return retried;
  }
}
```

## Best Practices

1. **Use exponential backoff** - Start with minutes, not seconds.

2. **Implement signatures** - Verify webhooks are from your system.

3. **Set reasonable timeouts** - 30 seconds is typical.

4. **Rate limit per endpoint** - Respect customer infrastructure.

5. **Track delivery status** - Provide visibility to customers.

6. **Use dead letter queues** - Don't lose failed webhooks.

7. **Validate URLs** - Check endpoints before registering.

8. **Support manual retries** - Let customers trigger retries.

9. **Monitor delivery rates** - Alert on high failure rates.

10. **Document retry behavior** - Help customers understand timing.

## Conclusion

Building a webhook delivery system with BullMQ provides reliability and flexibility. By implementing retries with exponential backoff, signature verification, rate limiting, and delivery tracking, you create a system that customers can depend on. Remember to provide visibility into delivery status and handle permanent failures gracefully.
