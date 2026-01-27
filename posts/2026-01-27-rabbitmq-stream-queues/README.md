# How to Build RabbitMQ Stream Queues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RabbitMQ, Stream Queues, Message Queues, Event Streaming, Distributed Systems, AMQP, High Throughput, Offset-Based Consumption

Description: A comprehensive guide to building RabbitMQ Stream Queues for high-throughput, replay-capable message streaming. Learn stream concepts, offset-based consumption, time-based retention, and performance optimization patterns.

---

> Stream queues bring the best of both worlds: RabbitMQ's operational simplicity with Kafka-like replay capabilities. They are designed for scenarios where you need to consume messages multiple times, replay from any point, or handle millions of messages per second.

RabbitMQ Stream Queues were introduced in RabbitMQ 3.9 as a new queue type optimized for high-throughput, persistent, replicated messaging with support for offset-based consumption. Unlike classic or quorum queues, streams allow multiple consumers to read from any point in the log without affecting other consumers.

This guide walks through stream queue concepts, configuration, consumption patterns, retention policies, and performance characteristics with practical code examples you can apply immediately.

---

## Table of Contents

1. Understanding Stream Queues
2. Stream Queue Architecture
3. Creating and Configuring Streams
4. Publishing to Streams
5. Offset-Based Consumption
6. Time-Based Retention
7. Consumer Groups and Single Active Consumer
8. Performance Characteristics
9. Monitoring and Observability
10. Best Practices Summary

---

## 1. Understanding Stream Queues

Stream queues differ fundamentally from classic RabbitMQ queues:

| Feature | Classic Queue | Quorum Queue | Stream Queue |
|---------|---------------|--------------|--------------|
| Message Storage | Memory + Disk | Disk (Raft) | Append-only Log |
| Consumption Model | Destructive | Destructive | Non-destructive |
| Replay Capability | No | No | Yes |
| Consumer Offset Tracking | Server-managed | Server-managed | Client-managed |
| Throughput | Medium | Medium | Very High |
| Message Ordering | Per-queue | Per-queue | Per-partition |
| Replication | Mirroring (deprecated) | Raft consensus | Raft consensus |

When to use stream queues:

- **Event sourcing**: Replay events to rebuild application state
- **Audit logs**: Maintain immutable records that multiple systems can consume
- **High-throughput ingestion**: Handle millions of messages per second
- **Fan-out patterns**: Multiple independent consumers reading the same data
- **Time-travel debugging**: Replay from a specific point to investigate issues

---

## 2. Stream Queue Architecture

Stream queues use an append-only log structure similar to Apache Kafka:

```mermaid
graph TD
    subgraph "Stream Queue Architecture"
        P1[Producer 1] -->|Publish| S[Stream Queue]
        P2[Producer 2] -->|Publish| S
        P3[Producer 3] -->|Publish| S

        S -->|Segment 1| SEG1[Messages 0-999]
        S -->|Segment 2| SEG2[Messages 1000-1999]
        S -->|Segment 3| SEG3[Messages 2000-2999]

        SEG1 --> C1[Consumer A<br/>Offset: 500]
        SEG2 --> C2[Consumer B<br/>Offset: 1500]
        SEG3 --> C3[Consumer C<br/>Offset: 2800]
    end

    style S fill:#f9f,stroke:#333,stroke-width:2px
    style SEG1 fill:#bbf,stroke:#333
    style SEG2 fill:#bbf,stroke:#333
    style SEG3 fill:#bbf,stroke:#333
```

Key architectural concepts:

- **Segments**: Messages are stored in segment files on disk
- **Offsets**: Each message has a unique, monotonically increasing offset
- **Non-destructive reads**: Consuming does not remove messages
- **Retention-based cleanup**: Old segments are deleted based on time or size policies

---

## 3. Creating and Configuring Streams

### Using the RabbitMQ Management CLI

```bash
# Create a stream queue with default settings
rabbitmqadmin declare queue name=events queue_type=stream

# Create a stream with specific retention policies
rabbitmqadmin declare queue name=events queue_type=stream \
    arguments='{"x-max-length-bytes": 10737418240, "x-max-age": "7D", "x-stream-max-segment-size-bytes": 104857600}'
```

### Using the HTTP API

```bash
# Create a stream queue via HTTP API
curl -u guest:guest -X PUT \
    -H "Content-Type: application/json" \
    -d '{
        "durable": true,
        "arguments": {
            "x-queue-type": "stream",
            "x-max-length-bytes": 10737418240,
            "x-max-age": "7D",
            "x-stream-max-segment-size-bytes": 104857600
        }
    }' \
    http://localhost:15672/api/queues/%2f/events
```

### Using Node.js with amqplib

```typescript
// stream-setup.ts
// Creates a RabbitMQ stream queue with retention policies

import amqp from 'amqplib';

interface StreamConfig {
    name: string;
    maxLengthBytes?: number;  // Maximum size in bytes (e.g., 10GB)
    maxAge?: string;          // Retention period (e.g., "7D", "12h", "30m")
    maxSegmentSizeBytes?: number;  // Segment file size (default: 500MB)
}

async function createStream(config: StreamConfig): Promise<void> {
    // Connect to RabbitMQ
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    // Build stream arguments
    // These configure the stream's retention and storage behavior
    const args: Record<string, any> = {
        'x-queue-type': 'stream',  // Required: declares this as a stream queue
    };

    // x-max-length-bytes: Total maximum size of the stream
    // When exceeded, oldest segments are deleted
    if (config.maxLengthBytes) {
        args['x-max-length-bytes'] = config.maxLengthBytes;
    }

    // x-max-age: Time-based retention
    // Messages older than this are eligible for deletion
    // Format: "Y" (years), "M" (months), "D" (days), "h" (hours), "m" (minutes), "s" (seconds)
    if (config.maxAge) {
        args['x-max-age'] = config.maxAge;
    }

    // x-stream-max-segment-size-bytes: Size of each segment file
    // Smaller segments = more granular retention, larger segments = better write performance
    if (config.maxSegmentSizeBytes) {
        args['x-stream-max-segment-size-bytes'] = config.maxSegmentSizeBytes;
    }

    // Declare the stream queue
    // durable: true is required for streams (they are always durable)
    await channel.assertQueue(config.name, {
        durable: true,
        arguments: args,
    });

    console.log(`Stream '${config.name}' created successfully`);
    console.log('Configuration:', args);

    await channel.close();
    await connection.close();
}

// Example: Create an events stream with 10GB max size, 7-day retention
createStream({
    name: 'events',
    maxLengthBytes: 10 * 1024 * 1024 * 1024,  // 10 GB
    maxAge: '7D',                              // 7 days
    maxSegmentSizeBytes: 100 * 1024 * 1024,   // 100 MB segments
}).catch(console.error);
```

### Using Python with pika

```python
# stream_setup.py
# Creates a RabbitMQ stream queue with retention policies

import pika
from typing import Optional

def create_stream(
    name: str,
    max_length_bytes: Optional[int] = None,
    max_age: Optional[str] = None,
    max_segment_size_bytes: Optional[int] = None
) -> None:
    """
    Create a RabbitMQ stream queue with specified retention policies.

    Args:
        name: Name of the stream queue
        max_length_bytes: Maximum total size in bytes
        max_age: Retention period (e.g., "7D", "12h", "30m")
        max_segment_size_bytes: Size of each segment file
    """
    # Establish connection
    connection = pika.BlockingConnection(
        pika.ConnectionParameters('localhost')
    )
    channel = connection.channel()

    # Build stream arguments
    arguments = {
        'x-queue-type': 'stream',  # Required for stream queues
    }

    # Add optional retention policies
    if max_length_bytes:
        arguments['x-max-length-bytes'] = max_length_bytes

    if max_age:
        arguments['x-max-age'] = max_age

    if max_segment_size_bytes:
        arguments['x-stream-max-segment-size-bytes'] = max_segment_size_bytes

    # Declare the stream queue
    channel.queue_declare(
        queue=name,
        durable=True,  # Streams are always durable
        arguments=arguments
    )

    print(f"Stream '{name}' created successfully")
    print(f"Configuration: {arguments}")

    connection.close()

# Example usage
if __name__ == '__main__':
    create_stream(
        name='events',
        max_length_bytes=10 * 1024 * 1024 * 1024,  # 10 GB
        max_age='7D',                               # 7 days
        max_segment_size_bytes=100 * 1024 * 1024   # 100 MB segments
    )
```

---

## 4. Publishing to Streams

Publishing to streams works similarly to classic queues, but with some optimizations:

### Basic Publishing with Node.js

```typescript
// stream-publisher.ts
// High-throughput publisher for RabbitMQ stream queues

import amqp, { Channel, Connection } from 'amqplib';

interface PublisherConfig {
    streamName: string;
    batchSize: number;      // Number of messages to batch before confirming
    flushIntervalMs: number; // Max time to wait before flushing batch
}

class StreamPublisher {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private pendingMessages: number = 0;
    private config: PublisherConfig;

    constructor(config: PublisherConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        // Connect to RabbitMQ
        this.connection = await amqp.connect('amqp://localhost');
        this.channel = await this.connection.createChannel();

        // Enable publisher confirms for reliability
        // This ensures messages are persisted before acknowledging
        await this.channel.confirmChannel();

        // Assert the stream exists
        await this.channel.assertQueue(this.config.streamName, {
            durable: true,
            arguments: { 'x-queue-type': 'stream' },
        });

        console.log(`Publisher connected to stream: ${this.config.streamName}`);
    }

    async publish(message: object): Promise<void> {
        if (!this.channel) {
            throw new Error('Publisher not connected');
        }

        const content = Buffer.from(JSON.stringify(message));

        // Publish with persistence enabled
        // For streams, messages are always persisted to disk
        this.channel.sendToQueue(
            this.config.streamName,
            content,
            {
                persistent: true,  // Ensure durability
                contentType: 'application/json',
                timestamp: Date.now(),
            }
        );

        this.pendingMessages++;

        // Wait for confirmation after batch size is reached
        if (this.pendingMessages >= this.config.batchSize) {
            await this.flush();
        }
    }

    async flush(): Promise<void> {
        if (!this.channel || this.pendingMessages === 0) {
            return;
        }

        // Wait for all pending messages to be confirmed
        await this.channel.waitForConfirms();
        console.log(`Flushed ${this.pendingMessages} messages`);
        this.pendingMessages = 0;
    }

    async close(): Promise<void> {
        await this.flush();
        await this.channel?.close();
        await this.connection?.close();
    }
}

// Example: Publish events at high throughput
async function main() {
    const publisher = new StreamPublisher({
        streamName: 'events',
        batchSize: 1000,        // Batch 1000 messages
        flushIntervalMs: 100,   // Or flush every 100ms
    });

    await publisher.connect();

    // Simulate high-throughput publishing
    const startTime = Date.now();
    const totalMessages = 100000;

    for (let i = 0; i < totalMessages; i++) {
        await publisher.publish({
            eventId: `evt-${i}`,
            eventType: 'user.action',
            timestamp: new Date().toISOString(),
            payload: { userId: i % 1000, action: 'click' },
        });
    }

    await publisher.close();

    const duration = Date.now() - startTime;
    console.log(`Published ${totalMessages} messages in ${duration}ms`);
    console.log(`Throughput: ${Math.round(totalMessages / (duration / 1000))} msg/sec`);
}

main().catch(console.error);
```

### Using the Native Stream Protocol (Higher Performance)

For maximum performance, use the native stream protocol with the RabbitMQ Stream client:

```typescript
// stream-native-publisher.ts
// Native stream protocol publisher for maximum throughput

import { Client, Producer } from 'rabbitmq-stream-js-client';

async function nativeStreamPublisher() {
    // Connect using the native stream protocol (port 5552)
    const client = await Client.connect({
        hostname: 'localhost',
        port: 5552,           // Stream protocol port (not AMQP 5672)
        username: 'guest',
        password: 'guest',
        vhost: '/',
    });

    // Create the stream if it doesn't exist
    await client.createStream({
        stream: 'high-throughput-events',
        arguments: {
            'max-length-bytes': 10 * 1024 * 1024 * 1024,  // 10 GB
            'max-age': '7D',
        },
    });

    // Create a producer with sub-batching for maximum throughput
    const producer = await client.declareProducer({
        stream: 'high-throughput-events',
        // Sub-entry batching: groups multiple messages into one network call
        // This dramatically improves throughput at the cost of slight latency
        maxFrameSize: 1048576,  // 1 MB max frame
    });

    const startTime = Date.now();
    const totalMessages = 1000000;

    // Publish messages in batches
    const batchSize = 10000;
    for (let batch = 0; batch < totalMessages / batchSize; batch++) {
        const messages = [];
        for (let i = 0; i < batchSize; i++) {
            const msgNum = batch * batchSize + i;
            messages.push(
                Buffer.from(JSON.stringify({
                    id: msgNum,
                    timestamp: Date.now(),
                    data: `event-${msgNum}`,
                }))
            );
        }

        // Send batch and wait for confirmation
        await producer.sendBatch(messages);
    }

    const duration = Date.now() - startTime;
    console.log(`Published ${totalMessages} messages in ${duration}ms`);
    console.log(`Throughput: ${Math.round(totalMessages / (duration / 1000))} msg/sec`);

    await producer.close();
    await client.close();
}

nativeStreamPublisher().catch(console.error);
```

---

## 5. Offset-Based Consumption

The key differentiator of stream queues is offset-based consumption. Consumers can start reading from any point in the stream:

```mermaid
graph LR
    subgraph "Offset Specifications"
        FIRST[first<br/>Oldest message]
        LAST[last<br/>Newest message]
        NEXT[next<br/>Wait for new]
        OFFSET[offset: N<br/>Specific position]
        TS[timestamp: T<br/>Point in time]
    end

    subgraph "Stream"
        M1[Msg 0] --> M2[Msg 1] --> M3[Msg 2] --> M4[...] --> M5[Msg N]
    end

    FIRST -.-> M1
    OFFSET -.-> M3
    LAST -.-> M5

    style FIRST fill:#9f9,stroke:#333
    style LAST fill:#f99,stroke:#333
    style NEXT fill:#99f,stroke:#333
    style OFFSET fill:#ff9,stroke:#333
    style TS fill:#f9f,stroke:#333
```

### Consuming with Offset Specifications

```typescript
// stream-consumer.ts
// Demonstrates different offset-based consumption patterns

import { Client, Consumer, OffsetSpecification } from 'rabbitmq-stream-js-client';

// Define offset specification types
type OffsetSpec =
    | { type: 'first' }      // Start from the beginning
    | { type: 'last' }       // Start from the most recent message
    | { type: 'next' }       // Start from new messages only
    | { type: 'offset'; value: bigint }    // Start from specific offset
    | { type: 'timestamp'; value: Date };  // Start from specific time

async function createConsumer(
    streamName: string,
    consumerName: string,
    offsetSpec: OffsetSpec
): Promise<void> {
    const client = await Client.connect({
        hostname: 'localhost',
        port: 5552,
        username: 'guest',
        password: 'guest',
    });

    // Convert our offset spec to the library format
    let offset: OffsetSpecification;
    switch (offsetSpec.type) {
        case 'first':
            // Start from the very first message in the stream
            // Use this for: full replay, initial data load, event sourcing rebuild
            offset = OffsetSpecification.first();
            break;
        case 'last':
            // Start from the last chunk written to the stream
            // Use this for: catching up to recent state
            offset = OffsetSpecification.last();
            break;
        case 'next':
            // Only receive new messages (nothing historical)
            // Use this for: real-time processing, notifications
            offset = OffsetSpecification.next();
            break;
        case 'offset':
            // Start from a specific offset number
            // Use this for: resuming after crash, checkpointing
            offset = OffsetSpecification.offset(offsetSpec.value);
            break;
        case 'timestamp':
            // Start from messages published at or after this time
            // Use this for: time-travel debugging, replaying from incident
            offset = OffsetSpecification.timestamp(offsetSpec.value);
            break;
    }

    // Track the last processed offset for checkpointing
    let lastProcessedOffset: bigint = BigInt(0);

    const consumer = await client.declareConsumer({
        stream: streamName,
        name: consumerName,  // Named consumers can store offsets server-side
        offset: offset,
    }, (message) => {
        // message.offset contains the message's position in the stream
        const offset = message.offset;
        const content = message.content.toString();

        console.log(`[${consumerName}] Offset ${offset}: ${content}`);

        // Store offset for checkpointing
        lastProcessedOffset = offset;
    });

    console.log(`Consumer '${consumerName}' started with offset spec: ${offsetSpec.type}`);

    // Graceful shutdown with offset storage
    process.on('SIGINT', async () => {
        console.log(`\nShutting down. Last offset: ${lastProcessedOffset}`);

        // Store offset for resumption (you would persist this to a database)
        // On restart, use { type: 'offset', value: lastProcessedOffset + 1n }

        await consumer.close();
        await client.close();
        process.exit(0);
    });
}

// Example: Different consumption scenarios
async function main() {
    const streamName = 'events';

    // Scenario 1: Full replay from beginning
    // await createConsumer(streamName, 'full-replay', { type: 'first' });

    // Scenario 2: Real-time only (no history)
    // await createConsumer(streamName, 'realtime-processor', { type: 'next' });

    // Scenario 3: Resume from checkpoint (offset 5000)
    // await createConsumer(streamName, 'checkpoint-consumer', {
    //     type: 'offset',
    //     value: BigInt(5000)
    // });

    // Scenario 4: Replay from specific time (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await createConsumer(streamName, 'time-travel-consumer', {
        type: 'timestamp',
        value: oneHourAgo
    });
}

main().catch(console.error);
```

### Implementing Checkpointing

```typescript
// checkpoint-consumer.ts
// Consumer with durable offset checkpointing

import { Client, OffsetSpecification } from 'rabbitmq-stream-js-client';
import { createClient } from 'redis';

interface CheckpointStore {
    getOffset(consumerId: string): Promise<bigint | null>;
    saveOffset(consumerId: string, offset: bigint): Promise<void>;
}

// Redis-based checkpoint storage
class RedisCheckpointStore implements CheckpointStore {
    private client;

    constructor() {
        this.client = createClient();
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async getOffset(consumerId: string): Promise<bigint | null> {
        const value = await this.client.get(`checkpoint:${consumerId}`);
        return value ? BigInt(value) : null;
    }

    async saveOffset(consumerId: string, offset: bigint): Promise<void> {
        await this.client.set(`checkpoint:${consumerId}`, offset.toString());
    }

    async close(): Promise<void> {
        await this.client.quit();
    }
}

async function checkpointedConsumer() {
    const consumerId = 'order-processor';
    const streamName = 'orders';
    const checkpointInterval = 1000; // Checkpoint every 1000 messages

    // Initialize checkpoint store
    const checkpointStore = new RedisCheckpointStore();
    await checkpointStore.connect();

    // Get last checkpoint
    const lastCheckpoint = await checkpointStore.getOffset(consumerId);
    console.log(`Last checkpoint: ${lastCheckpoint ?? 'none'}`);

    // Connect to stream
    const client = await Client.connect({
        hostname: 'localhost',
        port: 5552,
        username: 'guest',
        password: 'guest',
    });

    // Determine starting offset
    // If we have a checkpoint, start from the next offset
    // Otherwise, start from the beginning
    const startOffset = lastCheckpoint
        ? OffsetSpecification.offset(lastCheckpoint + BigInt(1))
        : OffsetSpecification.first();

    let messagesProcessed = 0;
    let lastOffset: bigint = lastCheckpoint ?? BigInt(0);

    const consumer = await client.declareConsumer({
        stream: streamName,
        offset: startOffset,
    }, async (message) => {
        // Process the message
        const order = JSON.parse(message.content.toString());
        console.log(`Processing order ${order.id} at offset ${message.offset}`);

        // Your business logic here
        // await processOrder(order);

        lastOffset = message.offset;
        messagesProcessed++;

        // Periodic checkpointing
        // This batches checkpoint writes for efficiency
        if (messagesProcessed % checkpointInterval === 0) {
            await checkpointStore.saveOffset(consumerId, lastOffset);
            console.log(`Checkpoint saved at offset ${lastOffset}`);
        }
    });

    // Save checkpoint on shutdown
    process.on('SIGINT', async () => {
        console.log('Shutting down...');
        await checkpointStore.saveOffset(consumerId, lastOffset);
        console.log(`Final checkpoint at offset ${lastOffset}`);
        await consumer.close();
        await client.close();
        await checkpointStore.close();
        process.exit(0);
    });
}

checkpointedConsumer().catch(console.error);
```

---

## 6. Time-Based Retention

Stream queues support both size-based and time-based retention policies:

```mermaid
graph TD
    subgraph "Retention Policies"
        SIZE[Size-Based<br/>x-max-length-bytes]
        TIME[Time-Based<br/>x-max-age]
        BOTH[Combined<br/>Whichever triggers first]
    end

    subgraph "Segment Cleanup"
        SEG1[Segment 1<br/>Age: 8 days] -->|Deleted| X1[X]
        SEG2[Segment 2<br/>Age: 5 days] --> KEEP1[Keep]
        SEG3[Segment 3<br/>Age: 2 days] --> KEEP2[Keep]
        SEG4[Segment 4<br/>Age: 0 days] --> KEEP3[Keep]
    end

    TIME -->|7D policy| SEG1

    style X1 fill:#f66,stroke:#333
    style KEEP1 fill:#6f6,stroke:#333
    style KEEP2 fill:#6f6,stroke:#333
    style KEEP3 fill:#6f6,stroke:#333
```

### Configuring Retention Policies

```typescript
// retention-config.ts
// Different retention policy configurations for various use cases

import amqp from 'amqplib';

interface RetentionConfig {
    maxLengthBytes?: number;  // Size-based retention
    maxAge?: string;          // Time-based retention
    maxSegmentSize?: number;  // Segment size affects cleanup granularity
}

const retentionPresets: Record<string, RetentionConfig> = {
    // High-throughput events with short retention
    // Good for: Real-time analytics, session events
    'high-throughput': {
        maxLengthBytes: 50 * 1024 * 1024 * 1024,  // 50 GB
        maxAge: '24h',                             // 24 hours
        maxSegmentSize: 500 * 1024 * 1024,        // 500 MB segments
    },

    // Audit logs with long retention
    // Good for: Compliance, debugging, forensics
    'audit-log': {
        maxLengthBytes: 100 * 1024 * 1024 * 1024, // 100 GB
        maxAge: '90D',                             // 90 days
        maxSegmentSize: 1024 * 1024 * 1024,       // 1 GB segments
    },

    // Event sourcing with unlimited time retention
    // Good for: CQRS systems, state reconstruction
    'event-sourcing': {
        maxLengthBytes: 500 * 1024 * 1024 * 1024, // 500 GB (size-limited only)
        // No maxAge - keep forever until size limit
        maxSegmentSize: 256 * 1024 * 1024,        // 256 MB segments
    },

    // Development/testing with minimal retention
    'development': {
        maxLengthBytes: 1 * 1024 * 1024 * 1024,   // 1 GB
        maxAge: '1h',                              // 1 hour
        maxSegmentSize: 50 * 1024 * 1024,         // 50 MB segments
    },
};

async function createStreamWithRetention(
    streamName: string,
    preset: keyof typeof retentionPresets
): Promise<void> {
    const config = retentionPresets[preset];
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    const args: Record<string, any> = {
        'x-queue-type': 'stream',
    };

    if (config.maxLengthBytes) {
        args['x-max-length-bytes'] = config.maxLengthBytes;
    }
    if (config.maxAge) {
        args['x-max-age'] = config.maxAge;
    }
    if (config.maxSegmentSize) {
        args['x-stream-max-segment-size-bytes'] = config.maxSegmentSize;
    }

    await channel.assertQueue(streamName, {
        durable: true,
        arguments: args,
    });

    console.log(`Created stream '${streamName}' with '${preset}' retention policy`);
    console.log('Configuration:', config);

    await channel.close();
    await connection.close();
}

// Example: Create streams for different use cases
async function main() {
    await createStreamWithRetention('user-events', 'high-throughput');
    await createStreamWithRetention('audit-trail', 'audit-log');
    await createStreamWithRetention('domain-events', 'event-sourcing');
}

main().catch(console.error);
```

### Monitoring Retention and Disk Usage

```bash
# Check stream statistics via CLI
rabbitmqctl list_queues name type messages message_bytes \
    --formatter pretty_table \
    | grep stream

# Via HTTP API
curl -s -u guest:guest \
    http://localhost:15672/api/queues/%2f/events \
    | jq '{
        name: .name,
        type: .type,
        messages: .messages,
        message_bytes: .message_bytes,
        segments: .arguments["x-stream-max-segment-size-bytes"],
        max_age: .arguments["x-max-age"],
        max_bytes: .arguments["x-max-length-bytes"]
    }'
```

---

## 7. Consumer Groups and Single Active Consumer

For scenarios where you need coordinated consumption across multiple instances:

```mermaid
graph TD
    subgraph "Single Active Consumer Pattern"
        S[Stream Queue] --> SAC{Single Active<br/>Consumer}
        SAC -->|Active| C1[Consumer 1<br/>Processing]
        SAC -.->|Standby| C2[Consumer 2<br/>Waiting]
        SAC -.->|Standby| C3[Consumer 3<br/>Waiting]
    end

    subgraph "Failover"
        C1 -->|Fails| FAIL[X]
        FAIL -->|Promotes| C2
    end

    style C1 fill:#9f9,stroke:#333
    style C2 fill:#ff9,stroke:#333
    style C3 fill:#ff9,stroke:#333
    style FAIL fill:#f66,stroke:#333
```

### Single Active Consumer Configuration

```typescript
// single-active-consumer.ts
// Ensures only one consumer processes messages at a time with automatic failover

import { Client, OffsetSpecification } from 'rabbitmq-stream-js-client';

interface SingleActiveConfig {
    streamName: string;
    consumerGroup: string;  // Group name for coordination
    instanceId: string;     // Unique identifier for this instance
}

async function createSingleActiveConsumer(config: SingleActiveConfig) {
    const client = await Client.connect({
        hostname: 'localhost',
        port: 5552,
        username: 'guest',
        password: 'guest',
    });

    // Single Active Consumer is enabled by setting a consumer name
    // RabbitMQ coordinates so only one consumer with this name is active
    const consumer = await client.declareConsumer({
        stream: config.streamName,
        // The 'name' property enables Single Active Consumer
        // All consumers with the same name compete for active status
        name: config.consumerGroup,
        offset: OffsetSpecification.first(),
        // Optional: configure what happens during consumer handoff
        properties: {
            // 'single-active-consumer': true is implicit when name is set
        },
    }, (message) => {
        console.log(`[${config.instanceId}] Processing: ${message.content.toString()}`);
        // Only the active consumer receives messages
        // Standby consumers wait until the active one disconnects
    });

    console.log(`Consumer '${config.instanceId}' joined group '${config.consumerGroup}'`);
    console.log('Waiting to become active (if standby)...');

    return { client, consumer };
}

// Example: Run multiple instances of this for high availability
const instanceId = process.env.INSTANCE_ID || `instance-${process.pid}`;

createSingleActiveConsumer({
    streamName: 'orders',
    consumerGroup: 'order-processors',
    instanceId: instanceId,
}).catch(console.error);
```

### Super Streams for Partitioning

For true horizontal scaling, use Super Streams (partitioned streams):

```typescript
// super-stream.ts
// Partitioned streams for parallel processing

import { Client } from 'rabbitmq-stream-js-client';

async function createSuperStream() {
    const client = await Client.connect({
        hostname: 'localhost',
        port: 5552,
        username: 'guest',
        password: 'guest',
    });

    // Create a super stream with 3 partitions
    // Messages are distributed across partitions by routing key
    await client.createSuperStream({
        streamName: 'orders',
        numberOfPartitions: 3,
        // Optional: binding keys for routing
        // bindingKeys: ['region-us', 'region-eu', 'region-asia'],
        arguments: {
            'max-length-bytes': 10 * 1024 * 1024 * 1024,
            'max-age': '7D',
        },
    });

    console.log('Super stream "orders" created with 3 partitions');

    // This creates:
    // - orders (the super stream - an exchange)
    // - orders-0 (partition stream)
    // - orders-1 (partition stream)
    // - orders-2 (partition stream)

    await client.close();
}

async function publishToSuperStream() {
    const client = await Client.connect({
        hostname: 'localhost',
        port: 5552,
        username: 'guest',
        password: 'guest',
    });

    // Create producer that routes to partitions
    const producer = await client.declareSuperStreamProducer({
        superStream: 'orders',
        // Route by a key in the message (e.g., customer ID)
        // All messages with the same key go to the same partition
        routingStrategy: 'hash',
    });

    // Publish with routing key
    for (let i = 0; i < 1000; i++) {
        const customerId = `customer-${i % 100}`; // 100 different customers
        await producer.send(
            Buffer.from(JSON.stringify({
                orderId: i,
                customerId,
                amount: Math.random() * 100
            })),
            { routingKey: customerId }  // Route by customer
        );
    }

    console.log('Published 1000 orders across partitions');
    await producer.close();
    await client.close();
}

// Run setup and publish
createSuperStream()
    .then(publishToSuperStream)
    .catch(console.error);
```

---

## 8. Performance Characteristics

Stream queues are optimized for specific workloads:

| Metric | Typical Performance | Notes |
|--------|---------------------|-------|
| Write Throughput | 1M+ msg/sec | With batching and native protocol |
| Read Throughput | 500K+ msg/sec per consumer | Non-blocking reads |
| Latency (P99) | < 5ms | End-to-end with confirms |
| Storage Efficiency | ~1 byte overhead per message | Minimal metadata |
| Replication | 3-way by default | Raft-based quorum |

### Performance Tuning

```typescript
// performance-tuning.ts
// Configuration for maximum throughput

import { Client } from 'rabbitmq-stream-js-client';

async function highPerformanceSetup() {
    const client = await Client.connect({
        hostname: 'localhost',
        port: 5552,
        username: 'guest',
        password: 'guest',
        // Connection-level tuning
        frameMax: 1048576,      // 1 MB frames for large batches
        heartbeat: 60,          // 60 second heartbeat
    });

    // Create optimized stream
    await client.createStream({
        stream: 'high-perf-events',
        arguments: {
            // Larger segments = fewer files = better sequential write performance
            'max-segment-size-bytes': 500 * 1024 * 1024,  // 500 MB

            // Size-based retention for predictable disk usage
            'max-length-bytes': 100 * 1024 * 1024 * 1024, // 100 GB

            // Initial cluster size (for new streams)
            'initial-cluster-size': 3,  // 3 replicas
        },
    });

    // High-throughput producer configuration
    const producer = await client.declareProducer({
        stream: 'high-perf-events',
        // Sub-entry batching: critical for performance
        // Groups multiple messages into single network frames
        // Trade-off: slightly higher latency for much higher throughput
        subEntrySize: 100,     // Batch up to 100 messages per sub-entry
        maxFrameSize: 1048576, // 1 MB max frame size
    });

    // High-throughput consumer configuration
    const consumer = await client.declareConsumer({
        stream: 'high-perf-events',
        offset: { type: 'first' },
        // Credit-based flow control
        // Higher credit = more messages buffered = higher throughput
        // Lower credit = less memory usage = better backpressure
        initialCredits: 50,  // Start with 50 message chunks
    }, (message) => {
        // Process message
    });

    return { client, producer, consumer };
}
```

### Benchmarking Script

```bash
#!/bin/bash
# benchmark-streams.sh
# Benchmark RabbitMQ stream performance

# Configuration
STREAM_NAME="benchmark-stream"
MESSAGE_COUNT=1000000
MESSAGE_SIZE=256
BATCH_SIZE=10000

# Using PerfTest (official RabbitMQ tool)
# Install: https://github.com/rabbitmq/rabbitmq-perf-test

echo "=== RabbitMQ Stream Benchmark ==="
echo "Messages: $MESSAGE_COUNT"
echo "Message size: $MESSAGE_SIZE bytes"
echo "Batch size: $BATCH_SIZE"
echo ""

# Create stream
rabbitmqadmin declare queue name=$STREAM_NAME queue_type=stream \
    arguments='{"x-max-length-bytes": 10737418240}'

# Run producer benchmark
echo "Starting producer benchmark..."
rabbitmq-perf-test \
    --uri "rabbitmq-stream://guest:guest@localhost:5552" \
    --stream-producer \
    --producers 1 \
    --consumers 0 \
    --stream $STREAM_NAME \
    --size $MESSAGE_SIZE \
    --confirm 1000 \
    --sub-entry-size $BATCH_SIZE \
    --time 30

# Run consumer benchmark
echo ""
echo "Starting consumer benchmark..."
rabbitmq-perf-test \
    --uri "rabbitmq-stream://guest:guest@localhost:5552" \
    --stream-consumer \
    --producers 0 \
    --consumers 1 \
    --stream $STREAM_NAME \
    --offset first \
    --time 30
```

---

## 9. Monitoring and Observability

### Key Metrics to Track

```typescript
// stream-metrics.ts
// Export stream metrics for monitoring

import { Client } from 'rabbitmq-stream-js-client';
import { register, Gauge, Counter } from 'prom-client';

// Define Prometheus metrics
const streamMessages = new Gauge({
    name: 'rabbitmq_stream_messages_total',
    help: 'Total messages in stream',
    labelNames: ['stream'],
});

const streamBytes = new Gauge({
    name: 'rabbitmq_stream_bytes_total',
    help: 'Total bytes in stream',
    labelNames: ['stream'],
});

const consumerOffset = new Gauge({
    name: 'rabbitmq_stream_consumer_offset',
    help: 'Current consumer offset',
    labelNames: ['stream', 'consumer'],
});

const messagesConsumed = new Counter({
    name: 'rabbitmq_stream_messages_consumed_total',
    help: 'Total messages consumed',
    labelNames: ['stream', 'consumer'],
});

const consumptionLag = new Gauge({
    name: 'rabbitmq_stream_consumption_lag',
    help: 'Messages behind head of stream',
    labelNames: ['stream', 'consumer'],
});

// Collect metrics via HTTP API
async function collectStreamMetrics(streamName: string) {
    const response = await fetch(
        `http://localhost:15672/api/queues/%2f/${streamName}`,
        {
            headers: {
                'Authorization': 'Basic ' + Buffer.from('guest:guest').toString('base64'),
            },
        }
    );

    const data = await response.json();

    streamMessages.set({ stream: streamName }, data.messages || 0);
    streamBytes.set({ stream: streamName }, data.message_bytes || 0);

    return data;
}

// Track consumer progress
function trackConsumerProgress(
    streamName: string,
    consumerName: string,
    currentOffset: bigint,
    headOffset: bigint
) {
    consumerOffset.set(
        { stream: streamName, consumer: consumerName },
        Number(currentOffset)
    );

    const lag = headOffset - currentOffset;
    consumptionLag.set(
        { stream: streamName, consumer: consumerName },
        Number(lag)
    );
}

// Expose metrics endpoint
import express from 'express';
const app = express();

app.get('/metrics', async (req, res) => {
    await collectStreamMetrics('events');
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
});

app.listen(9090, () => {
    console.log('Metrics available at http://localhost:9090/metrics');
});
```

### Grafana Dashboard Query Examples

```promql
# Stream throughput (messages/sec)
rate(rabbitmq_stream_messages_consumed_total[1m])

# Consumer lag trend
rabbitmq_stream_consumption_lag

# Storage growth rate
rate(rabbitmq_stream_bytes_total[5m])

# Alerting: Consumer falling behind
rabbitmq_stream_consumption_lag > 10000
```

---

## 10. Best Practices Summary

### Stream Design

| Practice | Do | Avoid |
|----------|-----|-------|
| Naming | Use descriptive names: `orders`, `user-events` | Generic names: `stream1`, `queue` |
| Partitioning | Use super streams for high throughput | Single stream for millions msg/sec |
| Retention | Set both size AND time limits | Unbounded streams (disk exhaustion) |
| Segment Size | 100-500 MB for most workloads | Very small (too many files) or very large (slow cleanup) |

### Publishing

| Practice | Do | Avoid |
|----------|-----|-------|
| Batching | Batch 100-1000 messages | Publishing one at a time |
| Confirms | Use publisher confirms | Fire-and-forget for important data |
| Protocol | Use native stream protocol (port 5552) | AMQP for high-throughput streams |
| Ordering | Route related messages by key | Random distribution when order matters |

### Consuming

| Practice | Do | Avoid |
|----------|-----|-------|
| Checkpointing | Store offsets periodically (every N messages) | Checkpoint every message (overhead) |
| Recovery | Resume from checkpoint + 1 | Restart from beginning |
| Parallelism | Use super streams + consumer groups | Single consumer for high throughput |
| Backpressure | Use credit-based flow control | Unbounded prefetch |

### Operations

| Practice | Do | Avoid |
|----------|-----|-------|
| Monitoring | Track lag, throughput, disk usage | Flying blind |
| Alerting | Alert on consumer lag > threshold | Ignoring lag |
| Capacity | Plan for 2x expected throughput | Running at 100% capacity |
| Testing | Benchmark before production | Assuming performance |

---

## Summary

RabbitMQ Stream Queues provide a powerful foundation for building high-throughput, replay-capable messaging systems. Key takeaways:

1. **Streams are append-only logs** - Messages are not deleted on consumption, enabling replay and multiple consumers
2. **Offset-based consumption** - Consumers control their position (first, last, specific offset, or timestamp)
3. **Time and size retention** - Configure how long data is kept with `x-max-age` and `x-max-length-bytes`
4. **Native protocol for performance** - Use port 5552 and batching for maximum throughput
5. **Super streams for scale** - Partition across multiple underlying streams for horizontal scaling

Stream queues bridge the gap between traditional message queues and event streaming platforms, giving you Kafka-like capabilities with RabbitMQ's operational simplicity.

---

*Need to monitor your RabbitMQ streams in production? [OneUptime](https://oneuptime.com) provides comprehensive observability for your message queues, including metrics, alerting, and distributed tracing across your entire infrastructure.*
