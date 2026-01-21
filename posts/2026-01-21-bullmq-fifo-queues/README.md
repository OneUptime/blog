# How to Implement FIFO Queues with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, FIFO, Queue Ordering, Job Queue, Sequential Processing

Description: A comprehensive guide to implementing FIFO (First-In-First-Out) queues with BullMQ, including strict ordering guarantees, ordered processing by key, handling concurrent workers, and patterns for sequential job execution.

---

FIFO (First-In-First-Out) queues ensure jobs are processed in the exact order they were added. While BullMQ is designed for high-throughput parallel processing, many use cases require strict ordering - such as processing user events in sequence, maintaining transaction order, or handling dependent operations. This guide covers how to implement FIFO behavior with BullMQ.

## Understanding FIFO in BullMQ

By default, BullMQ processes jobs in FIFO order when using a single worker with concurrency of 1. However, multiple workers or higher concurrency can break this ordering. Here's how to ensure strict FIFO processing.

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Basic FIFO queue with single-threaded processing
const queue = new Queue('fifo-queue', { connection });

// Worker with concurrency 1 for strict FIFO
const worker = new Worker('fifo-queue', async (job) => {
  console.log(`Processing job ${job.id} - ${job.data.sequence}`);
  return { processed: job.data.sequence };
}, {
  connection,
  concurrency: 1, // Critical for FIFO
});
```

## Strict Global FIFO

Ensure jobs are processed in exact order globally:

```typescript
interface SequentialJobData {
  sequence: number;
  payload: Record<string, unknown>;
  timestamp: number;
}

class StrictFIFOQueue {
  private queue: Queue<SequentialJobData>;
  private worker: Worker<SequentialJobData>;
  private sequenceCounter: number = 0;

  constructor(connection: Redis) {
    this.queue = new Queue('strict-fifo', {
      connection,
      defaultJobOptions: {
        // Disable automatic retries to maintain order
        attempts: 1,
        // Don't remove completed jobs immediately for verification
        removeOnComplete: false,
      },
    });

    this.worker = new Worker('strict-fifo', this.processJob.bind(this), {
      connection,
      concurrency: 1, // Single job at a time
      lockDuration: 60000, // Long lock to prevent other workers
    });
  }

  async addJob(payload: Record<string, unknown>) {
    const sequence = ++this.sequenceCounter;
    return this.queue.add('sequential-task', {
      sequence,
      payload,
      timestamp: Date.now(),
    }, {
      // Use timestamp to ensure proper ordering
      timestamp: Date.now(),
      // Custom job ID for predictable ordering
      jobId: `seq_${sequence.toString().padStart(10, '0')}`,
    });
  }

  private async processJob(job: Job<SequentialJobData>) {
    console.log(`Processing sequence ${job.data.sequence}`);
    // Your processing logic here
    return { sequence: job.data.sequence, processedAt: Date.now() };
  }

  async verifyOrder(): Promise<boolean> {
    const completed = await this.queue.getCompleted();
    const sorted = [...completed].sort((a, b) =>
      (a.returnvalue.sequence - b.returnvalue.sequence)
    );

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].processedOn! < sorted[i - 1].processedOn!) {
        console.error('Order violation detected!');
        return false;
      }
    }
    return true;
  }
}
```

## FIFO by Key (Ordered per Entity)

Process jobs in order per key while allowing parallel processing across keys:

```typescript
interface KeyedJobData {
  key: string; // Grouping key (e.g., userId, orderId)
  action: string;
  data: Record<string, unknown>;
  sequence: number;
}

class KeyedFIFOQueue {
  private queue: Queue<KeyedJobData>;
  private keySequences: Map<string, number> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('keyed-fifo', { connection });
  }

  async addJob(key: string, action: string, data: Record<string, unknown>) {
    // Get next sequence for this key
    const sequence = (this.keySequences.get(key) || 0) + 1;
    this.keySequences.set(key, sequence);

    return this.queue.add('keyed-task', {
      key,
      action,
      data,
      sequence,
    }, {
      // Use LIFO: false to ensure FIFO within groups
      lifo: false,
    });
  }

  createWorker(connection: Redis) {
    // Track currently processing keys
    const processingKeys = new Set<string>();
    const pendingJobs = new Map<string, Job<KeyedJobData>[]>();

    return new Worker<KeyedJobData>('keyed-fifo', async (job) => {
      const { key } = job.data;

      // Wait if this key is being processed
      while (processingKeys.has(key)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      processingKeys.add(key);
      try {
        console.log(`Processing ${key}:${job.data.sequence} - ${job.data.action}`);
        const result = await this.processKeyedJob(job);
        return result;
      } finally {
        processingKeys.delete(key);
      }
    }, {
      connection,
      concurrency: 10, // Process multiple keys in parallel
    });
  }

  private async processKeyedJob(job: Job<KeyedJobData>) {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      key: job.data.key,
      sequence: job.data.sequence,
      processedAt: Date.now(),
    };
  }
}
```

## Using BullMQ Groups for FIFO

BullMQ Pro provides built-in group support. For open-source, implement similar behavior:

```typescript
interface GroupedJobData {
  groupId: string;
  payload: Record<string, unknown>;
}

class GroupedFIFOQueue {
  private mainQueue: Queue<GroupedJobData>;
  private groupQueues: Map<string, Queue<GroupedJobData>> = new Map();

  constructor(private connection: Redis) {
    this.mainQueue = new Queue('grouped-jobs', { connection });
    this.setupMainWorker();
  }

  async addJob(groupId: string, payload: Record<string, unknown>) {
    // Get or create group queue
    if (!this.groupQueues.has(groupId)) {
      const groupQueue = new Queue<GroupedJobData>(`group-${groupId}`, {
        connection: this.connection,
      });
      this.groupQueues.set(groupId, groupQueue);

      // Create worker for this group with concurrency 1
      new Worker(`group-${groupId}`, this.processGroupJob.bind(this), {
        connection: this.connection,
        concurrency: 1, // FIFO within group
      });
    }

    const groupQueue = this.groupQueues.get(groupId)!;
    return groupQueue.add('task', { groupId, payload });
  }

  private setupMainWorker() {
    // Main worker just routes to group queues
    new Worker('grouped-jobs', async (job) => {
      const { groupId, payload } = job.data;
      const groupQueue = this.groupQueues.get(groupId);
      if (groupQueue) {
        await groupQueue.add('task', { groupId, payload });
      }
      return { routed: true };
    }, {
      connection: this.connection,
    });
  }

  private async processGroupJob(job: Job<GroupedJobData>) {
    console.log(`Processing group ${job.data.groupId}`);
    // Process in order within group
    return { processed: true };
  }
}
```

## Ordered Event Processing

Process events in order while handling dependencies:

```typescript
interface EventJobData {
  eventId: string;
  entityId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: number;
  previousEventId?: string;
}

class OrderedEventProcessor {
  private queue: Queue<EventJobData>;
  private processedEvents: Set<string> = new Set();
  private pendingEvents: Map<string, EventJobData> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('ordered-events', { connection });
    this.createWorker(connection);
  }

  async addEvent(event: Omit<EventJobData, 'timestamp'>) {
    return this.queue.add('event', {
      ...event,
      timestamp: Date.now(),
    }, {
      jobId: event.eventId,
    });
  }

  private createWorker(connection: Redis) {
    return new Worker<EventJobData>('ordered-events', async (job) => {
      const event = job.data;

      // Check if previous event has been processed
      if (event.previousEventId && !this.processedEvents.has(event.previousEventId)) {
        // Wait for previous event
        console.log(`Event ${event.eventId} waiting for ${event.previousEventId}`);
        this.pendingEvents.set(event.eventId, event);

        // Requeue for later processing
        throw new Error('DEPENDENCY_NOT_MET');
      }

      // Process event
      console.log(`Processing event ${event.eventId}: ${event.eventType}`);
      const result = await this.processEvent(event);

      // Mark as processed
      this.processedEvents.add(event.eventId);

      // Check for pending events that depend on this one
      await this.processDependentEvents(event.eventId);

      return result;
    }, {
      connection,
      concurrency: 1,
      settings: {
        backoffStrategy: () => 100, // Quick retry for dependency issues
      },
    });
  }

  private async processEvent(event: EventJobData) {
    // Your event processing logic
    return { eventId: event.eventId, processed: true };
  }

  private async processDependentEvents(processedEventId: string) {
    for (const [eventId, event] of this.pendingEvents) {
      if (event.previousEventId === processedEventId) {
        this.pendingEvents.delete(eventId);
        // Requeue the dependent event
        await this.queue.add('event', event, {
          jobId: eventId,
          priority: 1, // High priority
        });
      }
    }
  }
}
```

## FIFO with Acknowledgment Pattern

Ensure ordered processing with explicit acknowledgment:

```typescript
interface AcknowledgedJobData {
  messageId: string;
  payload: Record<string, unknown>;
}

class AcknowledgedFIFOQueue {
  private queue: Queue<AcknowledgedJobData>;
  private ackQueue: Queue<{ messageId: string }>;
  private lastAcknowledgedId: string | null = null;
  private pendingAcks: Map<string, () => void> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('ack-fifo', { connection });
    this.ackQueue = new Queue('ack-confirmations', { connection });
    this.createWorkers(connection);
  }

  async addMessage(messageId: string, payload: Record<string, unknown>) {
    return this.queue.add('message', { messageId, payload }, {
      jobId: messageId,
    });
  }

  async acknowledge(messageId: string) {
    return this.ackQueue.add('ack', { messageId });
  }

  private createWorkers(connection: Redis) {
    // Message processor
    new Worker<AcknowledgedJobData>('ack-fifo', async (job) => {
      const { messageId, payload } = job.data;

      console.log(`Processing message ${messageId}`);

      // Process message
      const result = await this.processMessage(payload);

      // Wait for acknowledgment
      await this.waitForAck(messageId);

      return result;
    }, {
      connection,
      concurrency: 1,
    });

    // Acknowledgment processor
    new Worker('ack-confirmations', async (job) => {
      const { messageId } = job.data;
      const resolver = this.pendingAcks.get(messageId);
      if (resolver) {
        resolver();
        this.pendingAcks.delete(messageId);
      }
      this.lastAcknowledgedId = messageId;
    }, {
      connection,
      concurrency: 1,
    });
  }

  private async processMessage(payload: Record<string, unknown>) {
    // Your processing logic
    return { processed: true };
  }

  private waitForAck(messageId: string): Promise<void> {
    return new Promise(resolve => {
      this.pendingAcks.set(messageId, resolve);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingAcks.has(messageId)) {
          this.pendingAcks.delete(messageId);
          resolve(); // Continue anyway
        }
      }, 30000);
    });
  }
}
```

## Transaction Log Processing

Process transaction logs in strict order:

```typescript
interface TransactionLogEntry {
  transactionId: string;
  accountId: string;
  operation: 'debit' | 'credit';
  amount: number;
  sequenceNumber: number;
}

class TransactionLogProcessor {
  private queue: Queue<TransactionLogEntry>;
  private accountSequences: Map<string, number> = new Map();

  constructor(connection: Redis) {
    this.queue = new Queue('transaction-log', { connection });
    this.createWorker(connection);
  }

  async addTransaction(entry: TransactionLogEntry) {
    return this.queue.add('transaction', entry, {
      jobId: `${entry.accountId}_${entry.sequenceNumber}`,
      // Use sequence number for ordering
      timestamp: entry.sequenceNumber,
    });
  }

  private createWorker(connection: Redis) {
    return new Worker<TransactionLogEntry>('transaction-log', async (job) => {
      const entry = job.data;
      const { accountId, sequenceNumber } = entry;

      // Check sequence
      const lastProcessed = this.accountSequences.get(accountId) || 0;

      if (sequenceNumber !== lastProcessed + 1) {
        if (sequenceNumber <= lastProcessed) {
          // Already processed - skip
          console.log(`Skipping duplicate: ${accountId}:${sequenceNumber}`);
          return { skipped: true };
        }
        // Out of order - wait for previous
        console.log(`Out of order: expected ${lastProcessed + 1}, got ${sequenceNumber}`);
        throw new Error('OUT_OF_ORDER');
      }

      // Process transaction
      const result = await this.processTransaction(entry);

      // Update sequence
      this.accountSequences.set(accountId, sequenceNumber);

      return result;
    }, {
      connection,
      concurrency: 1,
    });
  }

  private async processTransaction(entry: TransactionLogEntry) {
    console.log(`Processing ${entry.operation} of ${entry.amount} for ${entry.accountId}`);
    // Apply transaction to account
    return {
      transactionId: entry.transactionId,
      applied: true,
      newSequence: entry.sequenceNumber,
    };
  }
}
```

## Monitoring FIFO Order

Verify FIFO order is maintained:

```typescript
class FIFOMonitor {
  private processedJobs: Array<{ id: string; timestamp: number; sequence: number }> = [];

  recordProcessed(jobId: string, sequence: number) {
    this.processedJobs.push({
      id: jobId,
      timestamp: Date.now(),
      sequence,
    });
  }

  checkOrder(): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    for (let i = 1; i < this.processedJobs.length; i++) {
      const prev = this.processedJobs[i - 1];
      const curr = this.processedJobs[i];

      if (curr.sequence < prev.sequence) {
        violations.push(
          `Order violation: job ${curr.id} (seq ${curr.sequence}) processed after job ${prev.id} (seq ${prev.sequence})`
        );
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  getStats() {
    if (this.processedJobs.length === 0) {
      return { count: 0 };
    }

    const sequences = this.processedJobs.map(j => j.sequence);
    return {
      count: this.processedJobs.length,
      minSequence: Math.min(...sequences),
      maxSequence: Math.max(...sequences),
      gaps: this.findGaps(sequences),
    };
  }

  private findGaps(sequences: number[]): number[] {
    const sorted = [...new Set(sequences)].sort((a, b) => a - b);
    const gaps: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > 1) {
        for (let j = sorted[i - 1] + 1; j < sorted[i]; j++) {
          gaps.push(j);
        }
      }
    }

    return gaps;
  }
}
```

## Best Practices

1. **Use concurrency 1** - For strict FIFO, limit worker concurrency to 1.

2. **Single worker instance** - Run only one worker for strict global FIFO.

3. **Implement sequence numbers** - Track order explicitly in job data.

4. **Handle duplicates** - Implement idempotency for reprocessed jobs.

5. **Consider per-key FIFO** - Often you need order per entity, not global order.

6. **Monitor order violations** - Track and alert on ordering issues.

7. **Use job IDs wisely** - Include sequence in job IDs for debugging.

8. **Handle failures carefully** - Failed jobs can disrupt ordering.

9. **Test ordering under load** - Verify FIFO behavior at scale.

10. **Document ordering requirements** - Make ordering guarantees explicit.

## Conclusion

Implementing FIFO queues with BullMQ requires careful consideration of concurrency, worker count, and job ordering. While strict global FIFO requires single-threaded processing, per-key FIFO allows parallel processing while maintaining order within groups. Choose the pattern that matches your ordering requirements while maximizing throughput where possible.
