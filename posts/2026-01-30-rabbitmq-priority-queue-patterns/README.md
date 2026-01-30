# How to Implement RabbitMQ Priority Queue Patterns

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RabbitMQ, Priority Queues, Messaging, Patterns

Description: Configure RabbitMQ priority queues for message ordering by importance with proper consumer handling and performance considerations.

---

Message queues typically follow first-in-first-out (FIFO) ordering, but real applications often need to process urgent messages before regular ones. RabbitMQ priority queues let you assign importance levels to messages, ensuring critical work gets handled first. This guide covers declaring priority queues, publishing prioritized messages, consumer configuration, internal mechanics, and performance trade-offs.

## When to Use Priority Queues

| Scenario | Priority Use |
|----------|--------------|
| **Payment processing** | Failed payment retries over new payments |
| **Alert handling** | Critical alerts before informational ones |
| **Email delivery** | Password resets before marketing emails |
| **Task scheduling** | User-triggered jobs before batch jobs |
| **API rate limiting** | Premium tier requests before free tier |

Priority queues work best when you have clear priority distinctions and can tolerate the overhead they introduce.

## Declaring a Priority Queue

Priority queues require the `x-max-priority` argument when declaring. This argument sets the maximum priority level the queue supports (1-255, though 1-10 is recommended).

The following code declares a queue supporting 10 priority levels in Node.js using amqplib.

```javascript
// Declare a priority queue with max priority of 10
// Higher x-max-priority values use more memory per message
const amqp = require('amqplib');

async function setupPriorityQueue() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  // Declare queue with x-max-priority argument
  // Once declared, you cannot change the max priority
  await channel.assertQueue('task_queue', {
    durable: true,
    arguments: {
      'x-max-priority': 10  // Support priorities 0-10
    }
  });

  console.log('Priority queue created');
  return { connection, channel };
}

setupPriorityQueue().catch(console.error);
```

The same declaration in Python using pika.

```python
# Python priority queue declaration using pika
# The x-max-priority argument must match across all declarations
import pika

def setup_priority_queue():
    connection = pika.BlockingConnection(
        pika.ConnectionParameters('localhost')
    )
    channel = connection.channel()

    # Declare queue with priority support
    channel.queue_declare(
        queue='task_queue',
        durable=True,
        arguments={'x-max-priority': 10}
    )

    print('Priority queue created')
    return connection, channel

connection, channel = setup_priority_queue()
```

## Priority Level Guidelines

Choosing the right number of priority levels affects memory usage and sorting overhead.

| Priority Levels | Memory Overhead | Use Case |
|-----------------|-----------------|----------|
| **1-3** | Minimal | Simple high/medium/low |
| **4-5** | Low | Multiple business tiers |
| **6-10** | Moderate | Fine-grained prioritization |
| **11-255** | High | Rarely justified |

For most applications, 3-5 priority levels provide enough flexibility without significant overhead.

```javascript
// Define named priority constants for clarity
// Using constants prevents magic numbers throughout your code
const PRIORITY = {
  CRITICAL: 10,    // System alerts, payment failures
  HIGH: 7,         // User-triggered actions
  NORMAL: 5,       // Standard operations
  LOW: 3,          // Background jobs
  BULK: 1          // Batch processing, reports
};

module.exports = { PRIORITY };
```

## Publishing Messages with Priority

When publishing, set the priority property in the message options. Messages without a priority default to 0.

```javascript
// Publisher that sends messages with different priorities
const amqp = require('amqplib');

const PRIORITY = {
  CRITICAL: 10,
  HIGH: 7,
  NORMAL: 5,
  LOW: 3,
  BULK: 1
};

async function publishWithPriority(channel, queue, message, priority) {
  const content = Buffer.from(JSON.stringify(message));

  // Set priority in publish options
  // Also set persistent: true for durability
  channel.sendToQueue(queue, content, {
    persistent: true,
    priority: priority,
    contentType: 'application/json',
    timestamp: Date.now()
  });

  console.log(`Published message with priority ${priority}`);
}

async function main() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertQueue('task_queue', {
    durable: true,
    arguments: { 'x-max-priority': 10 }
  });

  // Publish messages with different priorities
  await publishWithPriority(
    channel, 'task_queue',
    { type: 'payment_retry', orderId: '12345' },
    PRIORITY.CRITICAL
  );

  await publishWithPriority(
    channel, 'task_queue',
    { type: 'send_email', template: 'welcome' },
    PRIORITY.NORMAL
  );

  await publishWithPriority(
    channel, 'task_queue',
    { type: 'generate_report', reportId: 'weekly' },
    PRIORITY.BULK
  );

  await connection.close();
}

main().catch(console.error);
```

## Consumer Prefetch Configuration

Consumer prefetch count dramatically affects priority queue behavior. With a high prefetch, the consumer grabs multiple messages at once, and RabbitMQ cannot reorder already-delivered messages. A prefetch of 1 ensures proper priority ordering but reduces throughput.

```javascript
// Consumer with prefetch=1 for strict priority ordering
const amqp = require('amqplib');

async function startConsumer() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  await channel.assertQueue('task_queue', {
    durable: true,
    arguments: { 'x-max-priority': 10 }
  });

  // CRITICAL: Set prefetch to 1 for priority ordering
  // With prefetch > 1, lower priority messages may be
  // delivered before higher priority ones arrive
  await channel.prefetch(1);

  console.log('Waiting for messages...');

  channel.consume('task_queue', async (msg) => {
    if (msg === null) return;

    const content = JSON.parse(msg.content.toString());
    const priority = msg.properties.priority || 0;

    console.log(`Processing priority ${priority}: ${content.type}`);

    // Simulate work
    await processTask(content);

    // Acknowledge after successful processing
    channel.ack(msg);
  }, {
    noAck: false  // Manual acknowledgment
  });
}

async function processTask(task) {
  const duration = Math.random() * 1000 + 500;
  await new Promise(resolve => setTimeout(resolve, duration));
  console.log(`Completed: ${task.type}`);
}

startConsumer().catch(console.error);
```

## Prefetch Trade-offs

| Prefetch | Priority Accuracy | Throughput | Use When |
|----------|-------------------|------------|----------|
| **1** | Exact ordering | Lower | Priority is critical |
| **2-5** | Mostly correct | Moderate | Balance needed |
| **10+** | Approximate | Higher | Throughput matters more |

The right prefetch depends on your requirements. For payment processing where priority is critical, use prefetch=1. For log processing where approximate ordering is acceptable, higher prefetch improves throughput.

## Priority Queue Internals

RabbitMQ maintains a separate sub-queue for each priority level. When a consumer requests a message, RabbitMQ checks the highest priority sub-queue first, then works down. This means:

1. Each priority level adds memory overhead
2. Publishing to any priority is O(1)
3. Consuming scans from highest to lowest priority
4. Empty priority levels add minimal overhead

```
Internal Structure:

Priority 10: [msg] [msg]           <- Checked first
Priority  9: [empty]
Priority  8: [msg]
Priority  7: [empty]
Priority  6: [msg] [msg] [msg]
Priority  5: [msg]
Priority  4: [empty]
Priority  3: [msg] [msg]
Priority  2: [empty]
Priority  1: [msg] [msg] [msg]
Priority  0: [msg]                 <- Checked last
```

Messages within the same priority level follow FIFO ordering.

## Memory and Performance Impact

Priority queues consume more memory than standard queues. The overhead scales with the max priority setting and queue depth.

| Configuration | Memory | Publish Rate | Consume Rate |
|---------------|--------|--------------|--------------|
| **Standard queue** | Baseline | 50k msg/s | 30k msg/s |
| **Priority 1-3** | +5-10% | 45k msg/s | 28k msg/s |
| **Priority 1-10** | +10-20% | 40k msg/s | 25k msg/s |
| **Priority 1-255** | +50%+ | 25k msg/s | 15k msg/s |

These numbers vary based on message size, hardware, and workload patterns. Always benchmark with your specific use case.

Monitor queue metrics using the RabbitMQ management API at `http://localhost:15672/api/queues/%2F/queue_name`. Track `messages_ready`, `messages_unacknowledged`, and `memory` to understand queue health and capacity.

## Handling Priority Inversion

Priority inversion occurs when low-priority messages block high-priority ones. This happens when a consumer is processing a long-running low-priority task while high-priority messages arrive.

Mitigate priority inversion with timeouts and task chunking.

```javascript
// Worker that prevents priority inversion through timeouts
const amqp = require('amqplib');

class PriorityAwareWorker {
  constructor(channel, queueName) {
    this.channel = channel;
    this.queueName = queueName;
    this.maxTaskDuration = 5000; // 5 second max per task
  }

  async start() {
    await this.channel.prefetch(1);

    this.channel.consume(this.queueName, async (msg) => {
      if (msg === null) return;

      const content = JSON.parse(msg.content.toString());

      try {
        // Process with timeout to prevent blocking
        await this.processWithTimeout(content, this.maxTaskDuration);
        this.channel.ack(msg);
      } catch (error) {
        if (error.message === 'Task timeout') {
          // Re-queue the task to allow higher priority work
          console.log(`Task timed out, re-queuing: ${content.type}`);
          this.channel.nack(msg, false, true);
        } else {
          console.error('Task failed:', error.message);
          this.channel.ack(msg);
        }
      }
    });
  }

  async processWithTimeout(task, timeout) {
    return Promise.race([
      this.processTask(task),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      )
    ]);
  }

  async processTask(task) {
    console.log(`Processing: ${task.type}`);
    await new Promise(r => setTimeout(r, Math.random() * 3000));
  }
}
```

## Alternative Pattern: Multiple Queues

For some use cases, separate queues per priority level give you more control than a single priority queue.

| Approach | Pros | Cons |
|----------|------|------|
| **Priority queue** | Single queue, simpler setup | Limited control over consumption rates |
| **Multiple queues** | Independent rate limiting, easier monitoring | More queues to manage |

```javascript
// Multi-queue pattern for priority handling
const amqp = require('amqplib');

class MultiQueuePriorityHandler {
  constructor() {
    this.queues = {
      high: { name: 'tasks_high', weight: 5 },
      normal: { name: 'tasks_normal', weight: 3 },
      low: { name: 'tasks_low', weight: 1 }
    };
  }

  async setup(channel) {
    for (const queue of Object.values(this.queues)) {
      await channel.assertQueue(queue.name, { durable: true });
    }
  }

  async publish(channel, message, priority) {
    let queueName;
    if (priority >= 7) {
      queueName = this.queues.high.name;
    } else if (priority >= 4) {
      queueName = this.queues.normal.name;
    } else {
      queueName = this.queues.low.name;
    }

    const content = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(queueName, content, { persistent: true });
  }

  async startWeightedConsumer(channel) {
    // Weighted round-robin consumption
    const consumeFromQueue = async (priority) => {
      const queue = this.queues[priority];
      const msg = await channel.get(queue.name, { noAck: false });

      if (msg) {
        const content = JSON.parse(msg.content.toString());
        await this.processTask(content);
        channel.ack(msg);
        return true;
      }
      return false;
    };

    while (true) {
      let processedAny = false;

      // Process based on weights - high gets 5x attention of low
      for (let i = 0; i < this.queues.high.weight; i++) {
        if (await consumeFromQueue('high')) processedAny = true;
      }
      for (let i = 0; i < this.queues.normal.weight; i++) {
        if (await consumeFromQueue('normal')) processedAny = true;
      }
      for (let i = 0; i < this.queues.low.weight; i++) {
        if (await consumeFromQueue('low')) processedAny = true;
      }

      if (!processedAny) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }

  async processTask(task) {
    await new Promise(r => setTimeout(r, Math.random() * 500));
  }
}
```

## Priority with Dead Letter Queues

Combine priority queues with dead letter exchanges for robust error handling.

```javascript
// Priority queue with dead letter handling
const amqp = require('amqplib');

async function setupWithDeadLetter(channel) {
  // Dead letter exchange for failed messages
  await channel.assertExchange('dlx', 'direct', { durable: true });

  // Retry queue with delay using message TTL
  await channel.assertQueue('task_queue_retry', {
    durable: true,
    arguments: {
      'x-max-priority': 10,
      'x-message-ttl': 30000,  // 30 second delay
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': 'task_queue'
    }
  });

  await channel.bindQueue('task_queue_retry', 'dlx', 'retry');

  // Main priority queue with dead letter routing
  await channel.assertQueue('task_queue', {
    durable: true,
    arguments: {
      'x-max-priority': 10,
      'x-dead-letter-exchange': 'dlx',
      'x-dead-letter-routing-key': 'retry'
    }
  });

  console.log('Priority queue with DLX configured');
}

async function consumeWithRetry(channel) {
  await channel.prefetch(1);

  channel.consume('task_queue', async (msg) => {
    if (msg === null) return;

    const content = JSON.parse(msg.content.toString());
    const retryCount = (msg.properties.headers?.['x-retry-count'] || 0);

    try {
      await processTask(content);
      channel.ack(msg);
    } catch (error) {
      if (retryCount < 3) {
        // Reject to dead letter queue, preserving priority
        channel.reject(msg, false);
      } else {
        console.error(`Max retries exceeded for: ${content.type}`);
        channel.ack(msg);
      }
    }
  });
}
```

## Testing Priority Queues

Verify your priority implementation works correctly with integration tests.

```javascript
// Integration test for priority queue behavior
const amqp = require('amqplib');
const assert = require('assert');

async function testPriorityOrdering() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  const testQueue = 'test_priority_queue';

  await channel.deleteQueue(testQueue).catch(() => {});
  await channel.assertQueue(testQueue, {
    durable: false,
    arguments: { 'x-max-priority': 10 }
  });

  // Publish messages in reverse priority order
  const messages = [
    { id: 1, priority: 1 },
    { id: 2, priority: 5 },
    { id: 3, priority: 10 },
    { id: 4, priority: 3 },
    { id: 5, priority: 7 }
  ];

  for (const msg of messages) {
    channel.sendToQueue(testQueue, Buffer.from(JSON.stringify(msg)), { priority: msg.priority });
  }

  await new Promise(r => setTimeout(r, 100));

  const received = [];
  await channel.prefetch(1);

  await new Promise((resolve) => {
    channel.consume(testQueue, (msg) => {
      if (msg === null) return;
      received.push(JSON.parse(msg.content.toString()));
      channel.ack(msg);
      if (received.length === messages.length) resolve();
    });
  });

  // Verify descending priority order
  const priorities = received.map(m => m.priority);
  assert.deepStrictEqual(priorities, [10, 7, 5, 3, 1]);
  console.log('Priority ordering test passed');

  await connection.close();
}

testPriorityOrdering().catch(console.error);
```

## Production Checklist

| Item | Check |
|------|-------|
| **Max priority** | Set to minimum needed (3-10 recommended) |
| **Consumer prefetch** | Set to 1 for strict ordering |
| **Queue durability** | Enabled for persistence |
| **Message persistence** | Set delivery_mode=2 |
| **Dead letter exchange** | Configured for failed messages |
| **Monitoring** | Queue depth and consumer lag alerts |

```javascript
// Production priority queue with dead letter exchange
async function setupProductionQueue(channel) {
  const config = { queueName: 'production_tasks', maxPriority: 10, dlxExchange: 'production_dlx' };

  await channel.assertExchange(config.dlxExchange, 'direct', { durable: true });
  await channel.assertQueue(config.queueName + '_failed', {
    durable: true,
    arguments: { 'x-max-priority': config.maxPriority }
  });
  await channel.bindQueue(config.queueName + '_failed', config.dlxExchange, config.queueName);

  await channel.assertQueue(config.queueName, {
    durable: true,
    arguments: {
      'x-max-priority': config.maxPriority,
      'x-dead-letter-exchange': config.dlxExchange,
      'x-dead-letter-routing-key': config.queueName
    }
  });

  return config;
}
```

## Summary

RabbitMQ priority queues provide a straightforward way to process important messages first. Key points to remember:

- Declare queues with `x-max-priority` argument (use 3-10 levels)
- Set priority on messages when publishing (0 is default)
- Use prefetch=1 for strict priority ordering
- Higher prefetch improves throughput but weakens ordering
- Monitor memory usage as priority queues have overhead
- Consider multiple queues for complex priority requirements
- Test priority behavior with integration tests

Priority queues work well for scenarios with clear importance distinctions. For more complex routing needs, consider combining with exchanges, dead letter queues, and multiple consumer configurations.
