# How to Configure Message Queue Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Message Queue, RabbitMQ, Testing, Integration Testing, DevOps

Description: Learn to test message queue integrations effectively, including producer and consumer testing, dead letter queue handling, retry logic, and message ordering verification.

---

Message queues add asynchronous communication between services, which introduces testing complexities. Messages can be lost, duplicated, or delivered out of order. This guide covers testing strategies for RabbitMQ and similar message queue systems to ensure reliable message processing.

## Queue Testing Architecture

```mermaid
flowchart TD
    A[Producer Test] --> B[Test Exchange]
    B --> C[Test Queue]
    C --> D[Consumer Test]
    D --> E{Process OK?}
    E -->|No| F[Dead Letter Queue]
    E -->|Yes| G[Ack Message]
    F --> H[DLQ Consumer Test]
```

## Test Environment Setup

Use Testcontainers to spin up RabbitMQ for testing:

```typescript
// setup.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import amqp, { Connection, Channel } from 'amqplib';

let container: StartedTestContainer;
let connection: Connection;
let channel: Channel;

export async function setupRabbitMQ(): Promise<{
    connection: Connection;
    channel: Channel;
    url: string;
}> {
    // Start RabbitMQ container
    container = await new GenericContainer('rabbitmq:3.12-management')
        .withExposedPorts(5672, 15672)
        .withEnvironment({
            RABBITMQ_DEFAULT_USER: 'test',
            RABBITMQ_DEFAULT_PASS: 'test',
        })
        .start();

    const host = container.getHost();
    const port = container.getMappedPort(5672);
    const url = `amqp://test:test@${host}:${port}`;

    // Connect to RabbitMQ
    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    return { connection, channel, url };
}

export async function teardownRabbitMQ(): Promise<void> {
    if (channel) await channel.close();
    if (connection) await connection.close();
    if (container) await container.stop();
}

// Setup test queues and exchanges
export async function setupTestTopology(channel: Channel): Promise<void> {
    // Main exchange
    await channel.assertExchange('test.exchange', 'topic', { durable: true });

    // Main queue
    await channel.assertQueue('test.queue', {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': 'test.dlx',
            'x-dead-letter-routing-key': 'dead',
        },
    });
    await channel.bindQueue('test.queue', 'test.exchange', 'test.#');

    // Dead letter exchange and queue
    await channel.assertExchange('test.dlx', 'direct', { durable: true });
    await channel.assertQueue('test.dlq', { durable: true });
    await channel.bindQueue('test.dlq', 'test.dlx', 'dead');
}
```

## Producer Testing

Test that messages are published correctly:

```typescript
// producer.test.ts
import { Channel } from 'amqplib';
import { setupRabbitMQ, teardownRabbitMQ, setupTestTopology } from './setup';
import { OrderProducer } from '../producers/order.producer';

describe('Order Producer', () => {
    let channel: Channel;
    let producer: OrderProducer;

    beforeAll(async () => {
        const setup = await setupRabbitMQ();
        channel = setup.channel;
        await setupTestTopology(channel);
        producer = new OrderProducer(channel);
    });

    afterAll(async () => {
        await teardownRabbitMQ();
    });

    beforeEach(async () => {
        // Purge queues before each test
        await channel.purgeQueue('test.queue');
        await channel.purgeQueue('test.dlq');
    });

    test('publishes order message with correct routing key', async () => {
        const order = {
            id: 'order-123',
            userId: 'user-456',
            items: [{ productId: 'prod-1', quantity: 2 }],
            total: 59.98,
        };

        await producer.publishOrderCreated(order);

        // Consume message to verify
        const message = await new Promise<any>((resolve) => {
            channel.consume('test.queue', (msg) => {
                if (msg) {
                    channel.ack(msg);
                    resolve(JSON.parse(msg.content.toString()));
                }
            });
        });

        expect(message.orderId).toBe('order-123');
        expect(message.userId).toBe('user-456');
        expect(message.total).toBe(59.98);
    });

    test('includes message headers', async () => {
        const order = { id: 'order-789', userId: 'user-1', items: [], total: 0 };

        await producer.publishOrderCreated(order);

        const message = await new Promise<any>((resolve) => {
            channel.consume('test.queue', (msg) => {
                if (msg) {
                    channel.ack(msg);
                    resolve({
                        content: JSON.parse(msg.content.toString()),
                        properties: msg.properties,
                    });
                }
            });
        });

        // Verify headers
        expect(message.properties.messageId).toBeDefined();
        expect(message.properties.timestamp).toBeDefined();
        expect(message.properties.contentType).toBe('application/json');
        expect(message.properties.headers?.source).toBe('order-service');
    });

    test('handles publish confirmation', async () => {
        // Enable publisher confirms
        await channel.confirmSelect();

        const order = { id: 'order-confirm', userId: 'user-1', items: [], total: 0 };

        // Publish and wait for confirmation
        const confirmed = await producer.publishWithConfirmation(order);

        expect(confirmed).toBe(true);
    });

    test('message is persistent', async () => {
        const order = { id: 'order-persist', userId: 'user-1', items: [], total: 0 };

        await producer.publishOrderCreated(order);

        const message = await new Promise<any>((resolve) => {
            channel.consume('test.queue', (msg) => {
                if (msg) {
                    channel.ack(msg);
                    resolve(msg);
                }
            });
        });

        // deliveryMode 2 = persistent
        expect(message.properties.deliveryMode).toBe(2);
    });
});
```

## Consumer Testing

Test message consumption and processing:

```typescript
// consumer.test.ts
import { Channel, ConsumeMessage } from 'amqplib';
import { setupRabbitMQ, teardownRabbitMQ, setupTestTopology } from './setup';
import { OrderConsumer } from '../consumers/order.consumer';
import { OrderService } from '../services/order.service';

describe('Order Consumer', () => {
    let channel: Channel;
    let consumer: OrderConsumer;
    let mockOrderService: jest.Mocked<OrderService>;

    beforeAll(async () => {
        const setup = await setupRabbitMQ();
        channel = setup.channel;
        await setupTestTopology(channel);

        mockOrderService = {
            processOrder: jest.fn(),
            getOrder: jest.fn(),
        } as any;

        consumer = new OrderConsumer(channel, mockOrderService);
    });

    afterAll(async () => {
        await teardownRabbitMQ();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await channel.purgeQueue('test.queue');
        await channel.purgeQueue('test.dlq');
    });

    test('processes valid message and acknowledges', async () => {
        mockOrderService.processOrder.mockResolvedValue({ success: true });

        // Publish test message
        channel.publish(
            'test.exchange',
            'test.order.created',
            Buffer.from(JSON.stringify({
                orderId: 'order-123',
                userId: 'user-456',
            })),
            { contentType: 'application/json' }
        );

        // Start consumer
        await consumer.start('test.queue');

        // Wait for processing
        await waitFor(() => mockOrderService.processOrder.mock.calls.length > 0);

        expect(mockOrderService.processOrder).toHaveBeenCalledWith({
            orderId: 'order-123',
            userId: 'user-456',
        });

        // Verify message was acknowledged (queue should be empty)
        const queueInfo = await channel.checkQueue('test.queue');
        expect(queueInfo.messageCount).toBe(0);
    });

    test('rejects invalid message to dead letter queue', async () => {
        // Publish invalid message (missing required field)
        channel.publish(
            'test.exchange',
            'test.order.created',
            Buffer.from(JSON.stringify({
                // Missing orderId
                userId: 'user-456',
            })),
            { contentType: 'application/json' }
        );

        await consumer.start('test.queue');

        // Wait for DLQ to receive message
        await waitFor(async () => {
            const dlqInfo = await channel.checkQueue('test.dlq');
            return dlqInfo.messageCount > 0;
        });

        const dlqInfo = await channel.checkQueue('test.dlq');
        expect(dlqInfo.messageCount).toBe(1);
    });

    test('handles processing failure with retry', async () => {
        // First call fails, second succeeds
        mockOrderService.processOrder
            .mockRejectedValueOnce(new Error('Temporary failure'))
            .mockResolvedValueOnce({ success: true });

        channel.publish(
            'test.exchange',
            'test.order.created',
            Buffer.from(JSON.stringify({
                orderId: 'order-retry',
                userId: 'user-789',
            })),
            {
                contentType: 'application/json',
                headers: { 'x-retry-count': 0 },
            }
        );

        await consumer.start('test.queue');

        // Wait for retry
        await waitFor(() => mockOrderService.processOrder.mock.calls.length >= 2);

        expect(mockOrderService.processOrder).toHaveBeenCalledTimes(2);
    });

    test('respects prefetch limit', async () => {
        // Set prefetch to 1
        await channel.prefetch(1);

        let processingCount = 0;
        let maxConcurrent = 0;

        mockOrderService.processOrder.mockImplementation(async () => {
            processingCount++;
            maxConcurrent = Math.max(maxConcurrent, processingCount);
            await new Promise(r => setTimeout(r, 100));
            processingCount--;
            return { success: true };
        });

        // Publish multiple messages
        for (let i = 0; i < 5; i++) {
            channel.publish(
                'test.exchange',
                'test.order.created',
                Buffer.from(JSON.stringify({ orderId: `order-${i}`, userId: 'user-1' })),
                { contentType: 'application/json' }
            );
        }

        await consumer.start('test.queue');

        // Wait for all messages to be processed
        await waitFor(() => mockOrderService.processOrder.mock.calls.length >= 5);

        // With prefetch 1, should never process more than 1 concurrently
        expect(maxConcurrent).toBe(1);
    });
});

async function waitFor(
    predicate: () => boolean | Promise<boolean>,
    timeout = 5000
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await predicate()) return;
        await new Promise(r => setTimeout(r, 50));
    }
    throw new Error('Timeout waiting for condition');
}
```

## Dead Letter Queue Testing

Test DLQ handling:

```typescript
// dlq.test.ts
import { Channel } from 'amqplib';
import { setupRabbitMQ, teardownRabbitMQ, setupTestTopology } from './setup';
import { DLQProcessor } from '../processors/dlq.processor';

describe('Dead Letter Queue Processing', () => {
    let channel: Channel;
    let processor: DLQProcessor;

    beforeAll(async () => {
        const setup = await setupRabbitMQ();
        channel = setup.channel;
        await setupTestTopology(channel);
        processor = new DLQProcessor(channel);
    });

    afterAll(async () => {
        await teardownRabbitMQ();
    });

    test('captures death reason in DLQ message', async () => {
        // Publish to main queue
        channel.publish(
            'test.exchange',
            'test.order.created',
            Buffer.from('invalid json {'),
            { contentType: 'application/json' }
        );

        // Start consumer that will reject the message
        await channel.consume('test.queue', (msg) => {
            if (msg) {
                // Reject without requeue - sends to DLQ
                channel.nack(msg, false, false);
            }
        });

        // Wait for DLQ message
        await waitFor(async () => {
            const info = await channel.checkQueue('test.dlq');
            return info.messageCount > 0;
        });

        // Consume from DLQ
        const dlqMessage = await new Promise<any>((resolve) => {
            channel.consume('test.dlq', (msg) => {
                if (msg) {
                    channel.ack(msg);
                    resolve(msg);
                }
            });
        });

        // Check death headers
        const deathHeaders = dlqMessage.properties.headers['x-death'];
        expect(deathHeaders).toBeDefined();
        expect(deathHeaders[0].reason).toBe('rejected');
        expect(deathHeaders[0].queue).toBe('test.queue');
    });

    test('DLQ processor can requeue messages', async () => {
        // Put message in DLQ manually
        channel.sendToQueue(
            'test.dlq',
            Buffer.from(JSON.stringify({ orderId: 'order-requeue', userId: 'user-1' })),
            {
                contentType: 'application/json',
                headers: {
                    'x-original-exchange': 'test.exchange',
                    'x-original-routing-key': 'test.order.created',
                },
            }
        );

        // Process DLQ and requeue
        await processor.requeueMessage('test.dlq', 'test.exchange');

        // Verify message is back in main queue
        await waitFor(async () => {
            const info = await channel.checkQueue('test.queue');
            return info.messageCount > 0;
        });

        const mainQueueInfo = await channel.checkQueue('test.queue');
        expect(mainQueueInfo.messageCount).toBe(1);
    });
});
```

## Message Ordering Tests

Verify message ordering when required:

```typescript
// ordering.test.ts
import { Channel } from 'amqplib';
import { setupRabbitMQ, teardownRabbitMQ } from './setup';

describe('Message Ordering', () => {
    let channel: Channel;

    beforeAll(async () => {
        const setup = await setupRabbitMQ();
        channel = setup.channel;

        // Create ordered queue (single active consumer)
        await channel.assertQueue('ordered.queue', {
            durable: true,
            arguments: {
                'x-single-active-consumer': true,
            },
        });
    });

    afterAll(async () => {
        await teardownRabbitMQ();
    });

    test('messages are consumed in order', async () => {
        const messageCount = 100;
        const receivedOrder: number[] = [];

        // Publish messages in order
        for (let i = 0; i < messageCount; i++) {
            channel.sendToQueue(
                'ordered.queue',
                Buffer.from(JSON.stringify({ sequence: i })),
                { contentType: 'application/json' }
            );
        }

        // Consume and track order
        await new Promise<void>((resolve) => {
            channel.consume('ordered.queue', (msg) => {
                if (msg) {
                    const data = JSON.parse(msg.content.toString());
                    receivedOrder.push(data.sequence);
                    channel.ack(msg);

                    if (receivedOrder.length === messageCount) {
                        resolve();
                    }
                }
            });
        });

        // Verify order
        for (let i = 0; i < messageCount; i++) {
            expect(receivedOrder[i]).toBe(i);
        }
    });

    test('priority queue respects priority', async () => {
        // Create priority queue
        await channel.assertQueue('priority.queue', {
            durable: true,
            arguments: { 'x-max-priority': 10 },
        });

        // Publish messages with different priorities
        channel.sendToQueue(
            'priority.queue',
            Buffer.from(JSON.stringify({ id: 'low' })),
            { priority: 1 }
        );
        channel.sendToQueue(
            'priority.queue',
            Buffer.from(JSON.stringify({ id: 'high' })),
            { priority: 10 }
        );
        channel.sendToQueue(
            'priority.queue',
            Buffer.from(JSON.stringify({ id: 'medium' })),
            { priority: 5 }
        );

        // Allow messages to be routed
        await new Promise(r => setTimeout(r, 100));

        const received: string[] = [];

        // Consume all messages
        await new Promise<void>((resolve) => {
            channel.consume('priority.queue', (msg) => {
                if (msg) {
                    const data = JSON.parse(msg.content.toString());
                    received.push(data.id);
                    channel.ack(msg);

                    if (received.length === 3) {
                        resolve();
                    }
                }
            });
        });

        // Higher priority should come first
        expect(received[0]).toBe('high');
        expect(received[1]).toBe('medium');
        expect(received[2]).toBe('low');
    });
});
```

## CI Pipeline Configuration

```yaml
# .github/workflows/mq-tests.yaml
name: Message Queue Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      rabbitmq:
        image: rabbitmq:3.12-management
        ports:
          - 5672:5672
          - 15672:15672
        env:
          RABBITMQ_DEFAULT_USER: test
          RABBITMQ_DEFAULT_PASS: test
        options: >-
          --health-cmd "rabbitmq-diagnostics -q ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run queue tests
        run: npm test -- --testPathPattern=queue
        env:
          RABBITMQ_URL: amqp://test:test@localhost:5672
```

## Summary

| Test Type | Purpose | Focus |
|-----------|---------|-------|
| **Producer tests** | Correct message format | Headers, routing, persistence |
| **Consumer tests** | Proper handling | Ack/nack, processing, errors |
| **DLQ tests** | Failure handling | Death headers, requeuing |
| **Ordering tests** | Sequence guarantees | Priority, FIFO |

Message queue testing requires verifying both happy paths and failure scenarios. Focus on idempotency, retry behavior, and dead letter handling to build resilient message-driven systems.
