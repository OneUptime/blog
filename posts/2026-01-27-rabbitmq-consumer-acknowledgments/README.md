# How to Implement RabbitMQ Consumers with Acknowledgments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Consumers, Acknowledgments, Message Processing, Reliability

Description: Learn how to implement reliable RabbitMQ consumers using manual acknowledgments, negative acknowledgments, and requeue strategies.

---

> Message acknowledgments are the foundation of reliable message processing. Without proper acknowledgment handling, messages can be lost during consumer crashes or processed multiple times during failures. Getting acknowledgments right is essential for building robust message-driven systems.

## Auto-Ack vs Manual Acknowledgment

RabbitMQ supports two acknowledgment modes. Auto-ack removes messages from the queue immediately upon delivery - simple but risky. Manual acknowledgment gives you control over when messages are considered processed.

| Mode | Behavior | Risk |
|------|----------|------|
| **Auto-ack** | Message removed on delivery | Lost if consumer crashes |
| **Manual ack** | Message removed on explicit ack | Requires proper handling |

```javascript
const amqp = require('amqplib');

async function setupConsumer() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const queue = 'tasks';
  await channel.assertQueue(queue, { durable: true });

  // Auto-ack mode - dangerous for important messages
  // Message is removed immediately when delivered
  channel.consume(queue, (msg) => {
    console.log('Received:', msg.content.toString());
    // If we crash here, message is lost forever
  }, { noAck: true });

  // Manual ack mode - recommended for reliability
  // Message stays in queue until explicitly acknowledged
  channel.consume(queue, (msg) => {
    console.log('Received:', msg.content.toString());
    // Message will be redelivered if we crash before ack
  }, { noAck: false });
}
```

## Basic.Ack for Successful Processing

When your consumer successfully processes a message, send a basic.ack to tell RabbitMQ to remove it from the queue.

```javascript
const amqp = require('amqplib');

async function reliableConsumer() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const queue = 'orders';
  await channel.assertQueue(queue, { durable: true });

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const order = JSON.parse(msg.content.toString());

      // Process the order
      await processOrder(order);

      // Acknowledge success - message removed from queue
      // deliveryTag identifies this specific message
      channel.ack(msg);
      console.log(`Order ${order.id} processed and acknowledged`);

    } catch (error) {
      console.error('Processing failed:', error.message);
      // Handle failure (covered in next section)
    }
  }, { noAck: false });
}

async function processOrder(order) {
  // Simulate order processing
  await saveToDatabase(order);
  await sendConfirmationEmail(order.email);
  await updateInventory(order.items);
}
```

## Basic.Nack and Basic.Reject for Failures

When processing fails, you have two options: basic.nack and basic.reject. Both can requeue messages, but nack supports multiple acknowledgments.

```javascript
channel.consume(queue, async (msg) => {
  if (!msg) return;

  try {
    const data = JSON.parse(msg.content.toString());
    await processMessage(data);
    channel.ack(msg);

  } catch (error) {
    // Determine if error is retryable
    const isRetryable = isTransientError(error);

    if (isRetryable) {
      // Requeue the message - it goes back to the queue
      // Second parameter: requeue = true
      channel.nack(msg, false, true);
      console.log('Transient error, message requeued');
    } else {
      // Permanent failure - don't requeue
      // Message goes to dead-letter exchange if configured
      channel.nack(msg, false, false);
      console.log('Permanent error, message rejected');
    }
  }
}, { noAck: false });

// basic.reject works similarly but for single messages only
channel.consume(queue, async (msg) => {
  if (!msg) return;

  try {
    await processMessage(JSON.parse(msg.content.toString()));
    channel.ack(msg);
  } catch (error) {
    // reject(message, requeue)
    channel.reject(msg, false); // Don't requeue
  }
}, { noAck: false });

function isTransientError(error) {
  // Network timeouts, temporary unavailability
  return error.code === 'ETIMEDOUT' ||
         error.code === 'ECONNRESET' ||
         error.message.includes('temporarily unavailable');
}
```

## Requeue vs Dead-Letter Strategies

Requeueing failed messages can create infinite loops if the message itself is the problem. Use dead-letter exchanges to handle poison messages.

```javascript
async function setupWithDeadLetter() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // Dead-letter exchange for failed messages
  await channel.assertExchange('dlx', 'direct', { durable: true });
  await channel.assertQueue('dead-letters', { durable: true });
  await channel.bindQueue('dead-letters', 'dlx', 'failed');

  // Main queue with dead-letter configuration
  await channel.assertQueue('tasks', {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dlx',
      'x-dead-letter-routing-key': 'failed',
    },
  });

  // Track retry attempts using message headers
  channel.consume('tasks', async (msg) => {
    if (!msg) return;

    const retryCount = (msg.properties.headers?.['x-retry-count'] || 0);
    const maxRetries = 3;

    try {
      await processMessage(JSON.parse(msg.content.toString()));
      channel.ack(msg);

    } catch (error) {
      if (retryCount < maxRetries && isRetryable(error)) {
        // Republish with incremented retry count
        channel.publish('', 'tasks', msg.content, {
          headers: { 'x-retry-count': retryCount + 1 },
          persistent: true,
        });
        channel.ack(msg); // Ack original to avoid duplicate
        console.log(`Retry ${retryCount + 1}/${maxRetries}`);
      } else {
        // Max retries exceeded or non-retryable error
        // nack without requeue sends to dead-letter exchange
        channel.nack(msg, false, false);
        console.log('Message sent to dead-letter queue');
      }
    }
  }, { noAck: false });
}
```

## Prefetch Count (QoS) Configuration

Prefetch limits how many unacknowledged messages a consumer can hold. This prevents fast publishers from overwhelming slow consumers and enables fair distribution across multiple consumers.

```javascript
async function setupWithPrefetch() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // Prefetch count of 10 means this consumer will receive
  // at most 10 unacknowledged messages at a time
  // global=false applies per-consumer, not per-channel
  await channel.prefetch(10, false);

  await channel.assertQueue('heavy-tasks', { durable: true });

  channel.consume('heavy-tasks', async (msg) => {
    if (!msg) return;

    // With prefetch=10, RabbitMQ sends up to 10 messages
    // then waits until we ack before sending more
    await processHeavyTask(JSON.parse(msg.content.toString()));
    channel.ack(msg);
    // After ack, RabbitMQ can send another message
  }, { noAck: false });
}

// Choosing the right prefetch value
// Low value (1-5): Fair distribution, higher latency
// High value (50-100): Better throughput, less fair
// Start with prefetch=1 and increase based on metrics
```

## Multiple Acknowledgments

When processing batches, you can acknowledge multiple messages at once using the `multiple` flag. This reduces network round trips.

```javascript
async function batchAcknowledgment() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.prefetch(100); // Receive up to 100 messages
  await channel.assertQueue('events', { durable: true });

  let batch = [];
  let lastDeliveryTag = null;

  channel.consume('events', async (msg) => {
    if (!msg) return;

    batch.push(msg);
    lastDeliveryTag = msg.fields.deliveryTag;

    // Process in batches of 50
    if (batch.length >= 50) {
      try {
        // Process all messages in the batch
        await processBatch(batch.map(m => JSON.parse(m.content.toString())));

        // Ack all messages up to and including lastDeliveryTag
        // multiple=true acks this message and all previous unacked messages
        channel.ack(batch[batch.length - 1], true);
        console.log(`Batch of ${batch.length} messages acknowledged`);

        batch = [];
      } catch (error) {
        // Nack all messages in batch
        channel.nack(batch[batch.length - 1], true, true);
        batch = [];
      }
    }
  }, { noAck: false });

  // Flush remaining messages periodically
  setInterval(async () => {
    if (batch.length > 0) {
      try {
        await processBatch(batch.map(m => JSON.parse(m.content.toString())));
        channel.ack(batch[batch.length - 1], true);
        batch = [];
      } catch (error) {
        channel.nack(batch[batch.length - 1], true, true);
        batch = [];
      }
    }
  }, 5000);
}
```

## Unacked Message Handling

Unacknowledged messages remain in the queue and are redelivered when the consumer disconnects. Monitor and handle the `redelivered` flag to detect redeliveries.

```javascript
channel.consume('tasks', async (msg) => {
  if (!msg) return;

  // Check if this message was redelivered (previous consumer failed)
  const isRedelivery = msg.fields.redelivered;

  if (isRedelivery) {
    console.log('Processing redelivered message - previous attempt failed');
    // Consider: logging, alerting, or different processing logic
  }

  try {
    await processMessage(JSON.parse(msg.content.toString()));
    channel.ack(msg);
  } catch (error) {
    // For redelivered messages, be more cautious about requeueing
    if (isRedelivery) {
      // Already failed once, send to dead-letter
      channel.nack(msg, false, false);
    } else {
      // First failure, try requeue
      channel.nack(msg, false, true);
    }
  }
}, { noAck: false });
```

## Consumer Timeouts

RabbitMQ 3.12+ enforces consumer timeouts. If a consumer holds a message without acknowledging for too long, the connection is closed. Configure timeouts appropriately for long-running tasks.

```javascript
// RabbitMQ server configuration (rabbitmq.conf)
// consumer_timeout = 1800000  # 30 minutes in milliseconds

// For long-running tasks, use a different approach
async function longRunningTaskConsumer() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.prefetch(1); // Only one task at a time
  await channel.assertQueue('long-tasks', { durable: true });

  channel.consume('long-tasks', async (msg) => {
    if (!msg) return;

    const task = JSON.parse(msg.content.toString());

    // For very long tasks, ack immediately and track separately
    // This prevents timeout but requires external state management
    channel.ack(msg);

    try {
      await markTaskInProgress(task.id);
      await processLongRunningTask(task);
      await markTaskComplete(task.id);
    } catch (error) {
      await markTaskFailed(task.id);
      // Optionally republish for retry
      await republishForRetry(channel, task);
    }
  }, { noAck: false });
}

// Alternative: heartbeat-style progress updates
async function taskWithProgress(task) {
  const progressInterval = setInterval(() => {
    console.log(`Task ${task.id} still processing...`);
    // Update external tracking system
  }, 60000); // Every minute

  try {
    await actualLongProcess(task);
  } finally {
    clearInterval(progressInterval);
  }
}
```

## Error Handling Patterns

Robust error handling distinguishes between error types and handles each appropriately.

```javascript
class MessageProcessor {
  constructor(channel, queue) {
    this.channel = channel;
    this.queue = queue;
  }

  async start() {
    await this.channel.prefetch(10);

    this.channel.consume(this.queue, async (msg) => {
      if (!msg) return;

      const startTime = Date.now();

      try {
        const data = this.parseMessage(msg);
        await this.processWithTimeout(data, 30000);

        this.channel.ack(msg);
        this.logSuccess(msg, startTime);

      } catch (error) {
        await this.handleError(msg, error, startTime);
      }
    }, { noAck: false });
  }

  parseMessage(msg) {
    try {
      return JSON.parse(msg.content.toString());
    } catch (error) {
      // Parsing errors are never retryable
      throw new PermanentError('Invalid JSON', error);
    }
  }

  async processWithTimeout(data, timeout) {
    return Promise.race([
      this.process(data),
      new Promise((_, reject) =>
        setTimeout(() => reject(new TransientError('Processing timeout')), timeout)
      ),
    ]);
  }

  async handleError(msg, error, startTime) {
    const retryCount = msg.properties.headers?.['x-retry-count'] || 0;

    if (error instanceof PermanentError) {
      // Never retry - bad data, validation errors, etc.
      this.channel.nack(msg, false, false);
      this.logError(msg, error, 'permanent', startTime);

    } else if (error instanceof TransientError && retryCount < 3) {
      // Retry with backoff
      const delay = Math.pow(2, retryCount) * 1000;

      setTimeout(() => {
        this.channel.publish('', this.queue, msg.content, {
          headers: { 'x-retry-count': retryCount + 1 },
          persistent: true,
        });
        this.channel.ack(msg);
      }, delay);

      this.logError(msg, error, 'retry-scheduled', startTime);

    } else {
      // Max retries exceeded
      this.channel.nack(msg, false, false);
      this.logError(msg, error, 'max-retries', startTime);
    }
  }

  logSuccess(msg, startTime) {
    console.log({
      event: 'message_processed',
      deliveryTag: msg.fields.deliveryTag,
      duration: Date.now() - startTime,
    });
  }

  logError(msg, error, disposition, startTime) {
    console.error({
      event: 'message_failed',
      deliveryTag: msg.fields.deliveryTag,
      error: error.message,
      disposition,
      duration: Date.now() - startTime,
    });
  }
}

class PermanentError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'PermanentError';
    this.cause = cause;
  }
}

class TransientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TransientError';
  }
}
```

## Testing Acknowledgment Flows

Test your acknowledgment logic thoroughly to ensure messages are handled correctly in all scenarios.

```javascript
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const amqp = require('amqplib');

describe('Message Acknowledgments', () => {
  let connection;
  let channel;
  const testQueue = 'test-acks';

  beforeEach(async () => {
    connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue(testQueue, { durable: false });
    await channel.purgeQueue(testQueue);
  });

  afterEach(async () => {
    await channel.deleteQueue(testQueue);
    await connection.close();
  });

  it('should ack successfully processed messages', async () => {
    // Publish a test message
    channel.sendToQueue(testQueue, Buffer.from(JSON.stringify({ id: 1 })));

    // Consume and ack
    await new Promise((resolve) => {
      channel.consume(testQueue, (msg) => {
        if (!msg) return;
        channel.ack(msg);
        resolve();
      }, { noAck: false });
    });

    // Verify queue is empty
    const { messageCount } = await channel.checkQueue(testQueue);
    assert.strictEqual(messageCount, 0);
  });

  it('should requeue on nack with requeue=true', async () => {
    channel.sendToQueue(testQueue, Buffer.from(JSON.stringify({ id: 2 })));

    let processCount = 0;

    await new Promise((resolve) => {
      channel.consume(testQueue, (msg) => {
        if (!msg) return;
        processCount++;

        if (processCount === 1) {
          // First attempt: nack with requeue
          channel.nack(msg, false, true);
        } else {
          // Second attempt: ack
          channel.ack(msg);
          resolve();
        }
      }, { noAck: false });
    });

    assert.strictEqual(processCount, 2);
  });

  it('should send to DLX on nack with requeue=false', async () => {
    // Setup DLX
    await channel.assertExchange('test-dlx', 'direct');
    const dlq = await channel.assertQueue('test-dlq');
    await channel.bindQueue(dlq.queue, 'test-dlx', 'dead');

    // Queue with DLX
    await channel.deleteQueue(testQueue);
    await channel.assertQueue(testQueue, {
      durable: false,
      arguments: {
        'x-dead-letter-exchange': 'test-dlx',
        'x-dead-letter-routing-key': 'dead',
      },
    });

    channel.sendToQueue(testQueue, Buffer.from(JSON.stringify({ id: 3 })));

    // Nack without requeue
    await new Promise((resolve) => {
      channel.consume(testQueue, (msg) => {
        if (!msg) return;
        channel.nack(msg, false, false);
        resolve();
      }, { noAck: false });
    });

    // Wait for DLX routing
    await new Promise(r => setTimeout(r, 100));

    // Verify message in DLQ
    const { messageCount } = await channel.checkQueue(dlq.queue);
    assert.strictEqual(messageCount, 1);
  });
});
```

## Best Practices Summary

| Practice | Recommendation |
|----------|----------------|
| **Acknowledgment mode** | Always use manual ack for important messages |
| **Prefetch count** | Start with 1, increase based on throughput needs |
| **Error handling** | Distinguish transient vs permanent errors |
| **Retry strategy** | Use exponential backoff with max retry limit |
| **Dead-letter queues** | Always configure for unprocessable messages |
| **Redelivery detection** | Check `redelivered` flag for special handling |
| **Timeouts** | Configure appropriate consumer timeouts |
| **Batch acks** | Use multiple=true for high-throughput scenarios |
| **Idempotency** | Design consumers to handle duplicate deliveries |
| **Monitoring** | Track ack rates, processing times, DLQ depth |

Message acknowledgments are critical for building reliable message-driven systems. Manual acknowledgments with proper error handling, dead-letter queues, and retry strategies ensure messages are processed exactly once under normal conditions and at least once during failures.

---

Monitor your RabbitMQ consumers and message queues with [OneUptime](https://oneuptime.com) - track consumer lag, dead-letter queue depth, and acknowledgment rates in real-time.
