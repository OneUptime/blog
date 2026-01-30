# How to Build Redis PubSub Patterns Advanced

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Redis, Messaging, PubSub, Real-time

Description: Implement advanced Redis pub/sub patterns with pattern subscriptions, message routing, and reliable message delivery strategies.

---

Redis Pub/Sub provides a lightweight messaging system for real-time communication between application components. While the basic publish/subscribe model is straightforward, building production-ready systems requires understanding pattern subscriptions, proper client handling, and working around the inherent limitations of the protocol.

This guide covers practical implementations you can deploy today, along with strategies for handling the cases where vanilla Pub/Sub falls short.

## Understanding the Pub/Sub Model

Redis Pub/Sub operates on a fire-and-forget principle. Publishers send messages to channels without knowing who (if anyone) receives them. Subscribers listen to channels and receive messages in real-time. There is no message persistence, no acknowledgment mechanism, and no replay capability.

This architecture diagram shows the basic flow:

```
┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│  Publisher   │────────>│   Redis     │────────>│  Subscriber  │
│   Client     │         │   Server    │         │   Client A   │
└──────────────┘         │             │         └──────────────┘
                         │  Channel:   │
┌──────────────┐         │  "events"   │         ┌──────────────┐
│  Publisher   │────────>│             │────────>│  Subscriber  │
│   Client     │         │             │         │   Client B   │
└──────────────┘         └─────────────┘         └──────────────┘
```

## Basic SUBSCRIBE and PUBLISH Operations

Let's start with the fundamental commands. The following example demonstrates a basic publisher and subscriber setup using Node.js with the ioredis library.

First, install the required dependency:

```bash
npm install ioredis
```

Here is the subscriber implementation that connects to Redis and listens for messages on a specific channel:

```javascript
// subscriber.js
const Redis = require('ioredis');

const subscriber = new Redis({
    host: 'localhost',
    port: 6379,
    // Retry strategy for reconnection
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Handle connection events
subscriber.on('connect', () => {
    console.log('Subscriber connected to Redis');
});

subscriber.on('error', (err) => {
    console.error('Subscriber error:', err.message);
});

// Subscribe to the 'notifications' channel
subscriber.subscribe('notifications', (err, count) => {
    if (err) {
        console.error('Failed to subscribe:', err.message);
        return;
    }
    console.log(`Subscribed to ${count} channel(s)`);
});

// Handle incoming messages
subscriber.on('message', (channel, message) => {
    console.log(`Received on ${channel}: ${message}`);

    // Parse JSON messages
    try {
        const data = JSON.parse(message);
        processNotification(data);
    } catch (e) {
        console.log('Non-JSON message received');
    }
});

function processNotification(data) {
    console.log('Processing:', data.type, data.payload);
}
```

The publisher sends messages to the channel. Note that publishers use a separate Redis connection:

```javascript
// publisher.js
const Redis = require('ioredis');

const publisher = new Redis({
    host: 'localhost',
    port: 6379
});

// Publish a simple string message
async function publishMessage(channel, message) {
    const subscriberCount = await publisher.publish(channel, message);
    console.log(`Message sent to ${subscriberCount} subscriber(s)`);
    return subscriberCount;
}

// Publish structured data as JSON
async function publishNotification(type, payload) {
    const message = JSON.stringify({
        type: type,
        payload: payload,
        timestamp: Date.now()
    });

    return publishMessage('notifications', message);
}

// Example usage
async function main() {
    await publishNotification('user_signup', { userId: 12345, email: 'user@example.com' });
    await publishNotification('order_placed', { orderId: 'ORD-789', amount: 99.99 });

    // Close the connection when done
    publisher.quit();
}

main();
```

## Pattern Subscriptions with PSUBSCRIBE

Pattern subscriptions allow you to subscribe to multiple channels using glob-style patterns. This is useful for topic-based routing where channels follow a naming convention.

The supported patterns are:

| Pattern | Description | Example Match |
|---------|-------------|---------------|
| `*` | Matches any sequence of characters | `user.*` matches `user.login`, `user.logout` |
| `?` | Matches exactly one character | `log.?` matches `log.a`, `log.1` |
| `[abc]` | Matches characters in brackets | `event.[abc]` matches `event.a`, `event.b` |

Here is an implementation that uses pattern subscriptions for a multi-tenant application:

```javascript
// pattern-subscriber.js
const Redis = require('ioredis');

const subscriber = new Redis();

// Subscribe to all events for a specific tenant
subscriber.psubscribe('tenant:*:events', (err, count) => {
    if (err) {
        console.error('Pattern subscribe failed:', err.message);
        return;
    }
    console.log(`Subscribed to ${count} pattern(s)`);
});

// Subscribe to all order-related events across tenants
subscriber.psubscribe('*:orders:*', (err, count) => {
    if (err) {
        console.error('Pattern subscribe failed:', err.message);
        return;
    }
    console.log(`Subscribed to ${count} pattern(s)`);
});

// Handle pattern-matched messages
// Note: 'pmessage' event is different from 'message'
subscriber.on('pmessage', (pattern, channel, message) => {
    console.log(`Pattern: ${pattern}`);
    console.log(`Channel: ${channel}`);
    console.log(`Message: ${message}`);

    // Extract tenant ID from channel name
    const parts = channel.split(':');
    const tenantId = parts[1];

    routeMessage(tenantId, channel, JSON.parse(message));
});

function routeMessage(tenantId, channel, data) {
    // Route to tenant-specific handler
    console.log(`Routing message for tenant ${tenantId}`);

    if (channel.includes(':orders:')) {
        handleOrderEvent(tenantId, data);
    } else if (channel.includes(':users:')) {
        handleUserEvent(tenantId, data);
    }
}

function handleOrderEvent(tenantId, data) {
    console.log(`Order event for tenant ${tenantId}:`, data);
}

function handleUserEvent(tenantId, data) {
    console.log(`User event for tenant ${tenantId}:`, data);
}
```

The publisher for this pattern-based system:

```javascript
// pattern-publisher.js
const Redis = require('ioredis');

const publisher = new Redis();

class TenantEventPublisher {
    constructor(tenantId) {
        this.tenantId = tenantId;
    }

    async publishOrderCreated(order) {
        const channel = `tenant:${this.tenantId}:orders:created`;
        const message = JSON.stringify({
            event: 'order_created',
            data: order,
            timestamp: new Date().toISOString()
        });

        return publisher.publish(channel, message);
    }

    async publishOrderUpdated(orderId, changes) {
        const channel = `tenant:${this.tenantId}:orders:updated`;
        const message = JSON.stringify({
            event: 'order_updated',
            orderId: orderId,
            changes: changes,
            timestamp: new Date().toISOString()
        });

        return publisher.publish(channel, message);
    }

    async publishUserAction(userId, action) {
        const channel = `tenant:${this.tenantId}:users:${action}`;
        const message = JSON.stringify({
            event: `user_${action}`,
            userId: userId,
            timestamp: new Date().toISOString()
        });

        return publisher.publish(channel, message);
    }
}

// Usage
async function main() {
    const tenant1Publisher = new TenantEventPublisher('acme-corp');
    const tenant2Publisher = new TenantEventPublisher('globex-inc');

    await tenant1Publisher.publishOrderCreated({
        orderId: 'ORD-001',
        items: ['widget', 'gadget'],
        total: 149.99
    });

    await tenant2Publisher.publishUserAction('user-456', 'login');

    publisher.quit();
}

main();
```

## Client Handling and Connection Management

Production systems need proper connection handling, including reconnection logic, connection pooling, and graceful shutdown.

Here is a robust client wrapper that handles these concerns:

```javascript
// redis-pubsub-client.js
const Redis = require('ioredis');
const EventEmitter = require('events');

class RedisPubSubClient extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            host: config.host || 'localhost',
            port: config.port || 6379,
            password: config.password || undefined,
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            ...config
        };

        this.subscriber = null;
        this.publisher = null;
        this.subscriptions = new Set();
        this.patternSubscriptions = new Set();
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    async connect() {
        const redisOptions = {
            host: this.config.host,
            port: this.config.port,
            password: this.config.password,
            retryStrategy: (times) => {
                this.reconnectAttempts = times;

                if (times > this.config.maxReconnectAttempts) {
                    this.emit('maxReconnectAttemptsReached');
                    return null; // Stop retrying
                }

                const delay = Math.min(times * 100, 3000);
                console.log(`Reconnecting in ${delay}ms (attempt ${times})`);
                return delay;
            }
        };

        // Create separate connections for pub and sub
        this.subscriber = new Redis(redisOptions);
        this.publisher = new Redis(redisOptions);

        this.setupEventHandlers();

        // Wait for both connections
        await Promise.all([
            this.waitForConnection(this.subscriber),
            this.waitForConnection(this.publisher)
        ]);

        this.isConnected = true;
        this.emit('connected');

        return this;
    }

    waitForConnection(client) {
        return new Promise((resolve, reject) => {
            if (client.status === 'ready') {
                resolve();
                return;
            }

            client.once('ready', resolve);
            client.once('error', reject);
        });
    }

    setupEventHandlers() {
        this.subscriber.on('message', (channel, message) => {
            this.emit('message', { channel, message, pattern: null });
        });

        this.subscriber.on('pmessage', (pattern, channel, message) => {
            this.emit('message', { channel, message, pattern });
        });

        this.subscriber.on('error', (err) => {
            this.emit('error', err);
        });

        this.subscriber.on('close', () => {
            this.isConnected = false;
            this.emit('disconnected');
        });

        this.subscriber.on('ready', async () => {
            // Resubscribe after reconnection
            if (this.subscriptions.size > 0 || this.patternSubscriptions.size > 0) {
                await this.resubscribe();
            }
        });
    }

    async resubscribe() {
        console.log('Resubscribing to channels after reconnection');

        for (const channel of this.subscriptions) {
            await this.subscriber.subscribe(channel);
        }

        for (const pattern of this.patternSubscriptions) {
            await this.subscriber.psubscribe(pattern);
        }
    }

    async subscribe(channel) {
        this.subscriptions.add(channel);
        return this.subscriber.subscribe(channel);
    }

    async psubscribe(pattern) {
        this.patternSubscriptions.add(pattern);
        return this.subscriber.psubscribe(pattern);
    }

    async unsubscribe(channel) {
        this.subscriptions.delete(channel);
        return this.subscriber.unsubscribe(channel);
    }

    async punsubscribe(pattern) {
        this.patternSubscriptions.delete(pattern);
        return this.subscriber.punsubscribe(pattern);
    }

    async publish(channel, message) {
        if (typeof message === 'object') {
            message = JSON.stringify(message);
        }
        return this.publisher.publish(channel, message);
    }

    async disconnect() {
        this.subscriptions.clear();
        this.patternSubscriptions.clear();

        await Promise.all([
            this.subscriber.quit(),
            this.publisher.quit()
        ]);

        this.isConnected = false;
        this.emit('disconnected');
    }
}

module.exports = RedisPubSubClient;
```

Usage of the client wrapper:

```javascript
// app.js
const RedisPubSubClient = require('./redis-pubsub-client');

async function main() {
    const client = new RedisPubSubClient({
        host: 'localhost',
        port: 6379,
        maxReconnectAttempts: 5
    });

    client.on('connected', () => {
        console.log('Connected to Redis');
    });

    client.on('disconnected', () => {
        console.log('Disconnected from Redis');
    });

    client.on('error', (err) => {
        console.error('Redis error:', err.message);
    });

    client.on('message', ({ channel, message, pattern }) => {
        console.log('Received message:', {
            channel,
            message,
            matchedPattern: pattern
        });
    });

    await client.connect();

    // Subscribe to channels and patterns
    await client.subscribe('notifications');
    await client.psubscribe('events:*');

    // Publish some messages
    await client.publish('notifications', { type: 'alert', text: 'Hello' });
    await client.publish('events:user:login', { userId: 123 });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('Shutting down...');
        await client.disconnect();
        process.exit(0);
    });
}

main();
```

## Message Routing Patterns

Different applications require different routing strategies. Here are several common patterns.

### Fan-out Pattern

Fan-out broadcasts a message to all subscribers on a channel. This is the default Pub/Sub behavior.

```javascript
// fan-out-example.js
const Redis = require('ioredis');

class FanOutPublisher {
    constructor() {
        this.publisher = new Redis();
    }

    async broadcastSystemAlert(alert) {
        // All subscribers to 'system:alerts' receive this
        return this.publisher.publish('system:alerts', JSON.stringify({
            severity: alert.severity,
            message: alert.message,
            source: alert.source,
            timestamp: Date.now()
        }));
    }

    async broadcastConfigChange(configKey, newValue) {
        // All application instances receive config updates
        return this.publisher.publish('config:updates', JSON.stringify({
            key: configKey,
            value: newValue,
            timestamp: Date.now()
        }));
    }
}

// Multiple subscribers receive the same message
class SystemAlertSubscriber {
    constructor(instanceId) {
        this.instanceId = instanceId;
        this.subscriber = new Redis();
    }

    async start() {
        await this.subscriber.subscribe('system:alerts', 'config:updates');

        this.subscriber.on('message', (channel, message) => {
            const data = JSON.parse(message);

            if (channel === 'system:alerts') {
                console.log(`[${this.instanceId}] Alert: ${data.message}`);
            } else if (channel === 'config:updates') {
                console.log(`[${this.instanceId}] Config ${data.key} = ${data.value}`);
                this.applyConfigChange(data.key, data.value);
            }
        });
    }

    applyConfigChange(key, value) {
        // Apply the configuration change to this instance
        console.log(`Applying config change: ${key}`);
    }
}
```

### Topic-based Routing

Topic-based routing uses channel naming conventions to route messages to specific handlers.

```javascript
// topic-router.js
const Redis = require('ioredis');

class TopicRouter {
    constructor() {
        this.subscriber = new Redis();
        this.handlers = new Map();
    }

    // Register a handler for a specific topic pattern
    registerHandler(topicPattern, handler) {
        this.handlers.set(topicPattern, handler);
    }

    async start() {
        // Subscribe to all topics using pattern
        await this.subscriber.psubscribe('topic:*');

        this.subscriber.on('pmessage', (pattern, channel, message) => {
            const topic = channel.replace('topic:', '');
            this.routeMessage(topic, JSON.parse(message));
        });
    }

    routeMessage(topic, data) {
        // Find matching handler
        for (const [pattern, handler] of this.handlers) {
            if (this.matchesTopic(topic, pattern)) {
                handler(topic, data);
                return;
            }
        }

        console.log(`No handler for topic: ${topic}`);
    }

    matchesTopic(topic, pattern) {
        // Convert pattern to regex
        // 'orders.*' becomes /^orders\..*$/
        // 'users.#' becomes /^users\..*$/ (# matches multiple segments)
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '[^.]+')
            .replace(/#/g, '.*');

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(topic);
    }
}

// Usage
async function main() {
    const router = new TopicRouter();

    router.registerHandler('orders.*', (topic, data) => {
        console.log(`Order event [${topic}]:`, data);
    });

    router.registerHandler('users.#', (topic, data) => {
        console.log(`User event [${topic}]:`, data);
    });

    router.registerHandler('payments.completed', (topic, data) => {
        console.log(`Payment completed:`, data);
    });

    await router.start();

    // Publisher
    const publisher = new Redis();
    await publisher.publish('topic:orders.created', JSON.stringify({ orderId: 1 }));
    await publisher.publish('topic:users.profile.updated', JSON.stringify({ userId: 2 }));
    await publisher.publish('topic:payments.completed', JSON.stringify({ paymentId: 3 }));
}

main();
```

### Request-Reply Pattern

Implementing request-reply on top of Pub/Sub requires correlation IDs and temporary reply channels.

```javascript
// request-reply.js
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class RequestReplyClient {
    constructor() {
        this.publisher = new Redis();
        this.subscriber = new Redis();
        this.pendingRequests = new Map();
        this.replyChannel = `replies:${uuidv4()}`;
    }

    async start() {
        await this.subscriber.subscribe(this.replyChannel);

        this.subscriber.on('message', (channel, message) => {
            const reply = JSON.parse(message);
            const pending = this.pendingRequests.get(reply.correlationId);

            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(reply.correlationId);
                pending.resolve(reply.data);
            }
        });
    }

    async request(channel, data, timeoutMs = 5000) {
        const correlationId = uuidv4();

        const promise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error('Request timeout'));
            }, timeoutMs);

            this.pendingRequests.set(correlationId, { resolve, reject, timeout });
        });

        await this.publisher.publish(channel, JSON.stringify({
            correlationId: correlationId,
            replyTo: this.replyChannel,
            data: data
        }));

        return promise;
    }

    async close() {
        await this.subscriber.quit();
        await this.publisher.quit();
    }
}

class RequestReplyServer {
    constructor() {
        this.subscriber = new Redis();
        this.publisher = new Redis();
        this.handlers = new Map();
    }

    registerHandler(channel, handler) {
        this.handlers.set(channel, handler);
    }

    async start() {
        for (const channel of this.handlers.keys()) {
            await this.subscriber.subscribe(channel);
        }

        this.subscriber.on('message', async (channel, message) => {
            const request = JSON.parse(message);
            const handler = this.handlers.get(channel);

            if (handler) {
                try {
                    const result = await handler(request.data);
                    await this.sendReply(request.replyTo, request.correlationId, result);
                } catch (err) {
                    await this.sendReply(request.replyTo, request.correlationId, {
                        error: err.message
                    });
                }
            }
        });
    }

    async sendReply(replyChannel, correlationId, data) {
        await this.publisher.publish(replyChannel, JSON.stringify({
            correlationId: correlationId,
            data: data
        }));
    }
}

// Usage example
async function main() {
    // Server side
    const server = new RequestReplyServer();

    server.registerHandler('services:user:get', async (data) => {
        // Simulate database lookup
        return {
            id: data.userId,
            name: 'John Doe',
            email: 'john@example.com'
        };
    });

    await server.start();

    // Client side
    const client = new RequestReplyClient();
    await client.start();

    try {
        const user = await client.request('services:user:get', { userId: 123 });
        console.log('Received user:', user);
    } catch (err) {
        console.error('Request failed:', err.message);
    }

    await client.close();
}

main();
```

## Understanding Pub/Sub Limitations

Redis Pub/Sub has several important limitations you must understand before choosing it for your system.

| Limitation | Description | Mitigation Strategy |
|------------|-------------|---------------------|
| No persistence | Messages are lost if no subscribers are connected | Use Redis Streams for durability |
| No acknowledgment | Publisher does not know if message was processed | Implement application-level ACKs |
| No replay | Cannot retrieve historical messages | Store messages separately if needed |
| Memory usage | Many pattern subscriptions increase memory | Limit pattern complexity |
| Blocking commands | Subscriber connection cannot run other commands | Use separate connections |
| No message queue | Messages are not queued for offline subscribers | Use Lists or Streams for queuing |

Here is code that demonstrates the persistence problem:

```javascript
// persistence-problem.js
const Redis = require('ioredis');

async function demonstratePersistenceProblem() {
    const publisher = new Redis();
    const subscriber = new Redis();

    // Publish BEFORE subscriber connects
    console.log('Publishing message before subscription...');
    const count1 = await publisher.publish('channel', 'message-1');
    console.log(`Subscribers who received message-1: ${count1}`); // 0

    // Now subscribe
    await subscriber.subscribe('channel');

    subscriber.on('message', (channel, message) => {
        console.log(`Received: ${message}`);
    });

    // Wait a moment for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Publish AFTER subscriber connects
    console.log('Publishing message after subscription...');
    const count2 = await publisher.publish('channel', 'message-2');
    console.log(`Subscribers who received message-2: ${count2}`); // 1

    // message-1 is lost forever

    await new Promise(resolve => setTimeout(resolve, 100));
    await subscriber.quit();
    await publisher.quit();
}

demonstratePersistenceProblem();
```

## Comparing Pub/Sub with Redis Streams

Redis Streams provide a more robust alternative when you need persistence, consumer groups, or message acknowledgment.

| Feature | Pub/Sub | Streams |
|---------|---------|---------|
| Message persistence | No | Yes |
| Consumer groups | No | Yes |
| Message acknowledgment | No | Yes (XACK) |
| Message replay | No | Yes (XRANGE, XREAD) |
| Blocking reads | Yes | Yes |
| Pattern matching | Yes (PSUBSCRIBE) | No |
| Latency | Lower | Slightly higher |
| Memory usage | Lower | Higher (stores messages) |
| Use case | Real-time broadcast | Reliable message processing |

Here is a comparison implementation showing both approaches:

```javascript
// pubsub-vs-streams.js
const Redis = require('ioredis');

// Pub/Sub implementation
class PubSubMessaging {
    constructor() {
        this.publisher = new Redis();
        this.subscriber = new Redis();
    }

    async publish(channel, message) {
        return this.publisher.publish(channel, JSON.stringify(message));
    }

    async subscribe(channel, callback) {
        await this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch, msg) => {
            if (ch === channel) {
                callback(JSON.parse(msg));
            }
        });
    }
}

// Streams implementation
class StreamMessaging {
    constructor() {
        this.redis = new Redis();
        this.consumerGroup = 'mygroup';
        this.consumerId = `consumer-${process.pid}`;
    }

    async publish(stream, message) {
        // XADD adds message to stream with auto-generated ID
        return this.redis.xadd(stream, '*', 'data', JSON.stringify(message));
    }

    async createConsumerGroup(stream) {
        try {
            // Create consumer group starting from the beginning
            await this.redis.xgroup('CREATE', stream, this.consumerGroup, '0', 'MKSTREAM');
        } catch (err) {
            // Group already exists
            if (!err.message.includes('BUSYGROUP')) {
                throw err;
            }
        }
    }

    async subscribe(stream, callback) {
        await this.createConsumerGroup(stream);

        // Continuously read new messages
        while (true) {
            const results = await this.redis.xreadgroup(
                'GROUP', this.consumerGroup, this.consumerId,
                'BLOCK', 5000,
                'COUNT', 10,
                'STREAMS', stream, '>'
            );

            if (results) {
                for (const [streamName, messages] of results) {
                    for (const [id, fields] of messages) {
                        const data = JSON.parse(fields[1]);
                        await callback(data, id);

                        // Acknowledge the message
                        await this.redis.xack(stream, this.consumerGroup, id);
                    }
                }
            }
        }
    }

    async readHistory(stream, count = 100) {
        // Read historical messages
        const messages = await this.redis.xrange(stream, '-', '+', 'COUNT', count);
        return messages.map(([id, fields]) => ({
            id: id,
            data: JSON.parse(fields[1])
        }));
    }
}

// Usage comparison
async function comparePubSubAndStreams() {
    console.log('=== Pub/Sub Example ===');
    const pubsub = new PubSubMessaging();

    pubsub.subscribe('events', (data) => {
        console.log('Pub/Sub received:', data);
    });

    await new Promise(r => setTimeout(r, 100));
    await pubsub.publish('events', { type: 'test', value: 1 });

    console.log('\n=== Streams Example ===');
    const streams = new StreamMessaging();

    // Publish some messages
    await streams.publish('events-stream', { type: 'test', value: 1 });
    await streams.publish('events-stream', { type: 'test', value: 2 });

    // Read history
    const history = await streams.readHistory('events-stream');
    console.log('Stream history:', history);

    // Start consuming (this would run continuously)
    // streams.subscribe('events-stream', async (data, id) => {
    //     console.log('Stream received:', data, 'ID:', id);
    // });
}

comparePubSubAndStreams();
```

## Hybrid Approach for Reliable Messaging

When you need the real-time characteristics of Pub/Sub but cannot afford to lose messages, use a hybrid approach.

```javascript
// hybrid-messaging.js
const Redis = require('ioredis');

class HybridMessaging {
    constructor() {
        this.redis = new Redis();
        this.publisher = new Redis();
        this.subscriber = new Redis();
    }

    async publish(channel, message) {
        const messageWithId = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            data: message
        };

        const serialized = JSON.stringify(messageWithId);

        // Store in stream for persistence
        await this.redis.xadd(
            `stream:${channel}`,
            'MAXLEN', '~', 10000, // Keep approximately 10000 messages
            '*',
            'message', serialized
        );

        // Publish for real-time delivery
        await this.publisher.publish(channel, serialized);

        return messageWithId.id;
    }

    async subscribe(channel, callback, options = {}) {
        const { replayFrom = null } = options;

        // Replay missed messages if requested
        if (replayFrom) {
            await this.replayMessages(channel, replayFrom, callback);
        }

        // Subscribe for real-time messages
        await this.subscriber.subscribe(channel);

        this.subscriber.on('message', (ch, msg) => {
            if (ch === channel) {
                const message = JSON.parse(msg);
                callback(message);
            }
        });
    }

    async replayMessages(channel, fromTimestamp, callback) {
        const streamKey = `stream:${channel}`;

        // Read messages from the stream starting from timestamp
        const messages = await this.redis.xrange(
            streamKey,
            fromTimestamp,
            '+'
        );

        console.log(`Replaying ${messages.length} missed messages`);

        for (const [id, fields] of messages) {
            const message = JSON.parse(fields[1]);
            callback(message);
        }
    }

    async getLastProcessedId(consumerId) {
        return this.redis.get(`consumer:${consumerId}:lastId`);
    }

    async setLastProcessedId(consumerId, messageId) {
        return this.redis.set(`consumer:${consumerId}:lastId`, messageId);
    }
}

// Consumer that tracks its position
class ReliableConsumer {
    constructor(consumerId) {
        this.consumerId = consumerId;
        this.messaging = new HybridMessaging();
        this.lastProcessedTimestamp = null;
    }

    async start(channel) {
        // Get last processed timestamp
        const lastId = await this.messaging.getLastProcessedId(this.consumerId);

        // Subscribe with replay from last position
        await this.messaging.subscribe(channel, async (message) => {
            await this.processMessage(message);
        }, {
            replayFrom: lastId || '0'
        });
    }

    async processMessage(message) {
        console.log(`Processing message ${message.id}:`, message.data);

        // Process the message...

        // Update last processed position
        await this.messaging.setLastProcessedId(this.consumerId, message.timestamp);
    }
}

// Usage
async function main() {
    const messaging = new HybridMessaging();

    // Publish some messages
    await messaging.publish('orders', { orderId: 1, status: 'created' });
    await messaging.publish('orders', { orderId: 2, status: 'created' });

    // Consumer connects and replays missed messages
    const consumer = new ReliableConsumer('worker-1');
    await consumer.start('orders');
}

main();
```

## Monitoring and Debugging Pub/Sub

Redis provides commands to monitor Pub/Sub activity. Here is a monitoring utility:

```javascript
// pubsub-monitor.js
const Redis = require('ioredis');

class PubSubMonitor {
    constructor() {
        this.redis = new Redis();
    }

    async getActiveChannels(pattern = '*') {
        // PUBSUB CHANNELS returns active channels matching pattern
        return this.redis.pubsub('CHANNELS', pattern);
    }

    async getSubscriberCount(channels) {
        // PUBSUB NUMSUB returns subscriber count for each channel
        const result = await this.redis.pubsub('NUMSUB', ...channels);

        // Convert flat array to object
        const counts = {};
        for (let i = 0; i < result.length; i += 2) {
            counts[result[i]] = result[i + 1];
        }
        return counts;
    }

    async getPatternSubscriberCount() {
        // PUBSUB NUMPAT returns total pattern subscriptions
        return this.redis.pubsub('NUMPAT');
    }

    async printStatus() {
        console.log('=== Pub/Sub Status ===');

        const channels = await this.getActiveChannels();
        console.log('Active channels:', channels);

        if (channels.length > 0) {
            const counts = await this.getSubscriberCount(channels);
            console.log('Subscriber counts:', counts);
        }

        const patternCount = await this.getPatternSubscriberCount();
        console.log('Pattern subscriptions:', patternCount);
    }

    async monitorMessages() {
        // Create a new connection in MONITOR mode
        const monitor = new Redis();

        console.log('Starting message monitor...');

        await monitor.monitor((err, monitor) => {
            monitor.on('monitor', (time, args) => {
                if (args[0] === 'PUBLISH') {
                    console.log(`[${new Date(time * 1000).toISOString()}] PUBLISH ${args[1]}`);
                }
            });
        });
    }
}

// Usage
async function main() {
    const monitor = new PubSubMonitor();

    // Print current status
    await monitor.printStatus();

    // Optional: start monitoring all commands
    // await monitor.monitorMessages();
}

main();
```

## Performance Considerations

When scaling Pub/Sub, keep these performance factors in mind.

### Connection Pooling for Publishers

```javascript
// publisher-pool.js
const Redis = require('ioredis');
const genericPool = require('generic-pool');

const publisherPool = genericPool.createPool({
    create: async () => {
        const client = new Redis({
            host: 'localhost',
            port: 6379
        });
        await new Promise(resolve => client.once('ready', resolve));
        return client;
    },
    destroy: async (client) => {
        await client.quit();
    }
}, {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000
});

async function publishWithPool(channel, message) {
    const client = await publisherPool.acquire();

    try {
        const count = await client.publish(channel, JSON.stringify(message));
        return count;
    } finally {
        await publisherPool.release(client);
    }
}

// Usage
async function main() {
    // Parallel publishes use different connections
    await Promise.all([
        publishWithPool('channel1', { data: 1 }),
        publishWithPool('channel2', { data: 2 }),
        publishWithPool('channel3', { data: 3 })
    ]);

    await publisherPool.drain();
    await publisherPool.clear();
}

main();
```

### Batching Messages

```javascript
// batch-publisher.js
const Redis = require('ioredis');

class BatchPublisher {
    constructor(options = {}) {
        this.redis = new Redis();
        this.batchSize = options.batchSize || 100;
        this.flushInterval = options.flushInterval || 100;
        this.buffer = new Map();
        this.timer = null;
    }

    publish(channel, message) {
        if (!this.buffer.has(channel)) {
            this.buffer.set(channel, []);
        }

        this.buffer.get(channel).push(message);

        // Check if we should flush
        if (this.buffer.get(channel).length >= this.batchSize) {
            this.flushChannel(channel);
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.flushInterval);
        }
    }

    async flushChannel(channel) {
        const messages = this.buffer.get(channel);
        if (!messages || messages.length === 0) return;

        this.buffer.set(channel, []);

        // Use pipeline for efficiency
        const pipeline = this.redis.pipeline();

        for (const message of messages) {
            pipeline.publish(channel, JSON.stringify(message));
        }

        await pipeline.exec();
        console.log(`Flushed ${messages.length} messages to ${channel}`);
    }

    async flush() {
        this.timer = null;

        for (const channel of this.buffer.keys()) {
            await this.flushChannel(channel);
        }
    }

    async close() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        await this.flush();
        await this.redis.quit();
    }
}

// Usage
async function main() {
    const publisher = new BatchPublisher({
        batchSize: 50,
        flushInterval: 200
    });

    // These will be batched
    for (let i = 0; i < 100; i++) {
        publisher.publish('events', { index: i, timestamp: Date.now() });
    }

    // Wait for flush
    await new Promise(r => setTimeout(r, 500));
    await publisher.close();
}

main();
```

## Conclusion

Redis Pub/Sub provides a fast, simple messaging system for real-time communication. Its fire-and-forget nature makes it ideal for scenarios where message loss is acceptable, such as live notifications, cache invalidation, and real-time analytics.

For production systems, remember these key points:

1. Use separate Redis connections for publishers and subscribers
2. Implement reconnection logic and resubscription after connection loss
3. Consider pattern subscriptions for flexible topic-based routing
4. Understand that messages are not persisted - use Streams when durability matters
5. Monitor your channels and subscriber counts to track system health

The hybrid approach combining Pub/Sub with Streams gives you the best of both worlds: real-time delivery with persistence for reliability. Choose the right tool based on your specific requirements for latency, durability, and message replay capabilities.
