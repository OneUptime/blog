# How to Fix "Consumer Cancelled" Errors in RabbitMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Consumer, Troubleshooting, Error Handling, Node.js, Python, Message Queue, DevOps

Description: Learn how to diagnose and fix consumer cancelled errors in RabbitMQ, including queue deletion, connection issues, and proper consumer recovery strategies.

---

> A "consumer cancelled" notification means RabbitMQ has terminated your consumer subscription. This can happen unexpectedly and cause message processing to stop silently if not handled properly.

Consumer cancellation is a critical event that requires proper handling to maintain reliable message processing.

---

## Understanding Consumer Cancellation

```mermaid
flowchart TD
    subgraph "Cancellation Causes"
        Q[Queue Deleted] -->|Server-initiated| C[Consumer Cancelled]
        P[Policy Change] -->|Server-initiated| C
        HA[HA Failover] -->|Server-initiated| C
        CL[Client Request] -->|Client-initiated| C
        CH[Channel Close] -->|Connection issue| C
    end

    C --> N[Consumer Notification]
    N --> R{Recovery<br/>Strategy?}
    R -->|Resubscribe| S1[Re-consume same queue]
    R -->|Fail| S2[Log and alert]
    R -->|Reconnect| S3[New connection/channel]
```

---

## Common Causes

### 1. Queue Deletion

The most common cause is when the queue a consumer is subscribed to gets deleted.

```bash
# This will cause all consumers on the queue to be cancelled
rabbitmqctl delete_queue my-queue

# Or via management API
curl -X DELETE http://admin:password@localhost:15672/api/queues/%2f/my-queue
```

### 2. Queue Policy Changes

Changing queue policies can trigger consumer cancellation:

```bash
# Applying a policy that changes queue type can cancel consumers
rabbitmqctl set_policy ha-policy "^ha\." '{"ha-mode":"all"}'
```

### 3. HA Queue Failover

When a mirrored queue fails over to another node, consumers may be cancelled.

### 4. Exclusive Queue Owner Disconnect

If an exclusive queue's owning connection closes, the queue is deleted:

```javascript
// Exclusive queues are deleted when connection closes
// This will cancel any consumers if the connection drops
channel.assertQueue('', { exclusive: true });
```

### 5. Auto-delete Queue Empty

Auto-delete queues are removed when the last consumer unsubscribes:

```javascript
// Queue will be deleted when last consumer cancels
channel.assertQueue('temp-queue', { autoDelete: true });
```

---

## Detecting Consumer Cancellation

### Node.js with amqplib

```javascript
// detect-cancellation.js
const amqp = require('amqplib');

async function consumeWithCancellationHandling() {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    const queue = 'my-queue';

    // Ensure queue exists
    await channel.assertQueue(queue, { durable: true });

    // Set up consumer
    const { consumerTag } = await channel.consume(
        queue,
        (msg) => {
            if (msg === null) {
                // This happens when consumer is cancelled
                console.log('Consumer was cancelled by server');
                return;
            }

            console.log('Received:', msg.content.toString());
            channel.ack(msg);
        },
        { noAck: false }
    );

    console.log(`Consumer started with tag: ${consumerTag}`);

    // Handle channel events
    channel.on('cancel', (consumerTag) => {
        // This event fires when consumer is cancelled server-side
        console.log(`Consumer ${consumerTag} was cancelled`);
        // Implement recovery logic here
        recoverConsumer(channel, queue);
    });

    channel.on('error', (err) => {
        console.error('Channel error:', err.message);
    });

    channel.on('close', () => {
        console.log('Channel closed');
    });

    return { channel, consumerTag };
}

async function recoverConsumer(channel, queue) {
    console.log('Attempting to recover consumer...');

    try {
        // Check if queue still exists
        await channel.checkQueue(queue);

        // Re-subscribe to the queue
        const { consumerTag } = await channel.consume(
            queue,
            (msg) => {
                if (msg !== null) {
                    console.log('Received:', msg.content.toString());
                    channel.ack(msg);
                }
            },
            { noAck: false }
        );

        console.log(`Consumer recovered with tag: ${consumerTag}`);

    } catch (error) {
        if (error.code === 404) {
            console.error('Queue no longer exists, cannot recover');
        } else {
            console.error('Recovery failed:', error.message);
        }
    }
}

consumeWithCancellationHandling();
```

### Python with pika

```python
# detect_cancellation.py
import pika
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResilientConsumer:
    """Consumer with cancellation detection and recovery"""

    def __init__(self, host: str, queue: str):
        self.host = host
        self.queue = queue
        self.connection: Optional[pika.BlockingConnection] = None
        self.channel = None
        self.consumer_tag: Optional[str] = None
        self.should_consume = True

    def connect(self):
        """Establish connection and channel"""
        params = pika.ConnectionParameters(
            host=self.host,
            heartbeat=60,
            blocked_connection_timeout=300
        )

        self.connection = pika.BlockingConnection(params)
        self.channel = self.connection.channel()

        # Declare queue (will not error if exists)
        self.channel.queue_declare(
            queue=self.queue,
            durable=True
        )

        # Set QoS
        self.channel.basic_qos(prefetch_count=10)

        logger.info(f"Connected to {self.host}")

    def on_message(self, channel, method, properties, body):
        """Handle incoming messages"""
        try:
            logger.info(f"Received: {body.decode()}")
            # Process message...
            channel.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            logger.error(f"Processing error: {e}")
            channel.basic_nack(
                delivery_tag=method.delivery_tag,
                requeue=True
            )

    def on_cancel(self, method_frame):
        """Handle consumer cancellation from server"""
        logger.warning(f"Consumer was cancelled: {method_frame}")

        # The consumer_tag is in the method frame
        cancelled_tag = method_frame.method.consumer_tag
        logger.info(f"Cancelled consumer tag: {cancelled_tag}")

        # Attempt recovery
        self._recover()

    def _recover(self):
        """Attempt to recover the consumer"""
        logger.info("Attempting consumer recovery...")

        try:
            # Check if queue exists
            self.channel.queue_declare(
                queue=self.queue,
                durable=True,
                passive=True  # Only check, don't create
            )

            # Re-subscribe
            self._subscribe()
            logger.info("Consumer recovered successfully")

        except pika.exceptions.ChannelClosedByBroker as e:
            if e.reply_code == 404:
                logger.error(f"Queue {self.queue} no longer exists")
                # Could recreate queue or alert operator
            else:
                raise

    def _subscribe(self):
        """Subscribe to the queue"""
        self.consumer_tag = self.channel.basic_consume(
            queue=self.queue,
            on_message_callback=self.on_message,
            auto_ack=False,
            # Enable cancel notifications
            # This tells RabbitMQ to notify us of server-initiated cancellations
            arguments={'x-cancel-on-ha-failover': True}
        )

        # Register cancellation callback
        self.channel.add_on_cancel_callback(self.on_cancel)

        logger.info(f"Subscribed with consumer tag: {self.consumer_tag}")

    def start(self):
        """Start consuming messages"""
        self.connect()
        self._subscribe()

        logger.info(f"Starting consumer on queue: {self.queue}")

        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            self.stop()

    def stop(self):
        """Stop consuming and close connection"""
        self.should_consume = False

        if self.channel and self.consumer_tag:
            self.channel.basic_cancel(self.consumer_tag)

        if self.connection:
            self.connection.close()

        logger.info("Consumer stopped")


if __name__ == '__main__':
    consumer = ResilientConsumer('localhost', 'my-queue')
    consumer.start()
```

---

## Robust Consumer Pattern

Implement a consumer that handles all cancellation scenarios:

```javascript
// robust-consumer.js
const amqp = require('amqplib');
const EventEmitter = require('events');

class RobustConsumer extends EventEmitter {
    constructor(config) {
        super();
        this.config = {
            url: 'amqp://localhost',
            queue: 'my-queue',
            prefetch: 10,
            reconnectDelay: 1000,
            maxReconnectDelay: 30000,
            ...config
        };

        this.connection = null;
        this.channel = null;
        this.consumerTag = null;
        this.isConsuming = false;
        this.shouldReconnect = true;
        this.currentDelay = this.config.reconnectDelay;
    }

    async start() {
        this.shouldReconnect = true;
        await this._connect();
    }

    async _connect() {
        try {
            // Establish connection
            this.connection = await amqp.connect(this.config.url, {
                heartbeat: 60
            });

            this.currentDelay = this.config.reconnectDelay;

            // Connection event handlers
            this.connection.on('error', (err) => {
                console.error('Connection error:', err.message);
                this.emit('error', err);
            });

            this.connection.on('close', () => {
                console.log('Connection closed');
                this.isConsuming = false;
                this._scheduleReconnect();
            });

            // Create channel
            this.channel = await this.connection.createChannel();

            // Channel event handlers
            this.channel.on('error', (err) => {
                console.error('Channel error:', err.message);
            });

            this.channel.on('close', () => {
                console.log('Channel closed');
                this.isConsuming = false;
            });

            // Handle consumer cancellation
            this.channel.on('cancel', (consumerTag) => {
                console.log(`Consumer ${consumerTag} was cancelled by server`);
                this.emit('cancelled', consumerTag);
                this._handleCancellation();
            });

            // Set up consumer
            await this._setupConsumer();

            this.emit('connected');
            console.log('Consumer connected and ready');

        } catch (error) {
            console.error('Connection failed:', error.message);
            this._scheduleReconnect();
        }
    }

    async _setupConsumer() {
        // Set prefetch
        await this.channel.prefetch(this.config.prefetch);

        // Assert queue exists
        await this.channel.assertQueue(this.config.queue, {
            durable: true
        });

        // Start consuming
        const result = await this.channel.consume(
            this.config.queue,
            (msg) => this._onMessage(msg),
            { noAck: false }
        );

        this.consumerTag = result.consumerTag;
        this.isConsuming = true;

        console.log(`Consuming from ${this.config.queue} with tag ${this.consumerTag}`);
    }

    _onMessage(msg) {
        if (msg === null) {
            // Consumer was cancelled
            console.log('Received null message - consumer cancelled');
            this._handleCancellation();
            return;
        }

        // Emit message for external handling
        this.emit('message', msg, (ack = true, requeue = false) => {
            if (ack) {
                this.channel.ack(msg);
            } else {
                this.channel.nack(msg, false, requeue);
            }
        });
    }

    async _handleCancellation() {
        console.log('Handling consumer cancellation...');
        this.isConsuming = false;

        if (!this.shouldReconnect) {
            return;
        }

        // Try to resubscribe on same channel
        try {
            await this._checkQueueExists();
            await this._setupConsumer();
            console.log('Consumer resubscribed successfully');
            this.emit('recovered');

        } catch (error) {
            console.error('Resubscription failed:', error.message);

            if (error.code === 404) {
                // Queue was deleted
                this.emit('queueDeleted', this.config.queue);

                // Option 1: Try to recreate queue
                // await this._recreateQueue();

                // Option 2: Give up and alert
                console.error('Queue no longer exists, stopping consumer');
                this.shouldReconnect = false;
                return;
            }

            // For other errors, schedule reconnect
            this._scheduleReconnect();
        }
    }

    async _checkQueueExists() {
        // checkQueue throws if queue doesn't exist
        await this.channel.checkQueue(this.config.queue);
    }

    _scheduleReconnect() {
        if (!this.shouldReconnect) {
            return;
        }

        console.log(`Reconnecting in ${this.currentDelay}ms...`);

        setTimeout(async () => {
            await this._connect();
        }, this.currentDelay);

        // Exponential backoff
        this.currentDelay = Math.min(
            this.currentDelay * 2,
            this.config.maxReconnectDelay
        );
    }

    async stop() {
        this.shouldReconnect = false;

        if (this.channel && this.consumerTag) {
            try {
                await this.channel.cancel(this.consumerTag);
            } catch (error) {
                // Ignore errors during shutdown
            }
        }

        if (this.connection) {
            await this.connection.close();
        }

        console.log('Consumer stopped');
    }
}

// Usage
async function main() {
    const consumer = new RobustConsumer({
        url: 'amqp://localhost',
        queue: 'orders-queue',
        prefetch: 10
    });

    consumer.on('message', (msg, ack) => {
        try {
            const order = JSON.parse(msg.content.toString());
            console.log('Processing order:', order.id);

            // Process the order...

            ack(true);  // Acknowledge success

        } catch (error) {
            console.error('Processing failed:', error);
            ack(false, true);  // Nack and requeue
        }
    });

    consumer.on('cancelled', (tag) => {
        console.log(`Consumer ${tag} was cancelled`);
    });

    consumer.on('queueDeleted', (queue) => {
        console.error(`Queue ${queue} was deleted!`);
        // Send alert...
    });

    consumer.on('error', (err) => {
        console.error('Consumer error:', err);
    });

    await consumer.start();

    // Handle shutdown
    process.on('SIGINT', async () => {
        console.log('Shutting down...');
        await consumer.stop();
        process.exit(0);
    });
}

main();
```

---

## Consumer Recovery Flow

```mermaid
flowchart TD
    S[Start] --> C[Consuming]
    C -->|Message| P[Process]
    P --> C

    C -->|Cancel Event| D{Queue<br/>Exists?}
    D -->|Yes| R[Resubscribe]
    R --> C

    D -->|No| Q{Recreate<br/>Queue?}
    Q -->|Yes| CR[Create Queue]
    CR --> R
    Q -->|No| A[Alert and Stop]

    C -->|Connection Lost| RE[Reconnect]
    RE --> C
```

---

## Handling HA Failover Cancellations

When using mirrored queues, consumers are cancelled during failover:

```python
# ha_failover_consumer.py
import pika
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HAConsumer:
    """Consumer that handles HA failover gracefully"""

    def __init__(self, hosts: list, queue: str):
        self.hosts = hosts
        self.queue = queue
        self.current_host_idx = 0
        self.connection = None
        self.channel = None
        self.consumer_tag = None

    def connect(self):
        """Connect to cluster with failover"""
        for i in range(len(self.hosts)):
            idx = (self.current_host_idx + i) % len(self.hosts)
            host = self.hosts[idx]

            try:
                params = pika.ConnectionParameters(
                    host=host,
                    heartbeat=30,  # Lower heartbeat for faster failure detection
                    blocked_connection_timeout=60
                )

                self.connection = pika.BlockingConnection(params)
                self.channel = self.connection.channel()
                self.current_host_idx = idx

                logger.info(f"Connected to {host}")
                return True

            except Exception as e:
                logger.warning(f"Failed to connect to {host}: {e}")

        return False

    def on_cancel(self, frame):
        """Handle HA failover cancellation"""
        logger.warning("Consumer cancelled - likely HA failover")

        # Short delay to allow failover to complete
        time.sleep(2)

        # Attempt to resubscribe
        self._subscribe()

    def _subscribe(self):
        """Subscribe to queue with cancel notification"""
        # Set QoS
        self.channel.basic_qos(prefetch_count=10)

        # Subscribe with HA failover notification enabled
        self.consumer_tag = self.channel.basic_consume(
            queue=self.queue,
            on_message_callback=self.on_message,
            auto_ack=False
        )

        # Register cancel callback
        self.channel.add_on_cancel_callback(self.on_cancel)

        logger.info(f"Subscribed to {self.queue}")

    def on_message(self, ch, method, props, body):
        """Process message"""
        try:
            logger.info(f"Received: {body.decode()}")
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def run(self):
        """Main consumer loop with reconnection"""
        while True:
            try:
                if not self.connection or self.connection.is_closed:
                    if not self.connect():
                        logger.error("Failed to connect, retrying in 5s")
                        time.sleep(5)
                        continue

                    self._subscribe()

                self.channel.start_consuming()

            except pika.exceptions.ConnectionClosedByBroker:
                logger.warning("Broker closed connection")
                self.current_host_idx = (self.current_host_idx + 1) % len(self.hosts)
                time.sleep(1)

            except pika.exceptions.AMQPConnectionError:
                logger.warning("Connection lost")
                self.current_host_idx = (self.current_host_idx + 1) % len(self.hosts)
                time.sleep(1)

            except KeyboardInterrupt:
                break

        self.stop()

    def stop(self):
        """Clean shutdown"""
        if self.connection and not self.connection.is_closed:
            self.connection.close()
        logger.info("Consumer stopped")


if __name__ == '__main__':
    consumer = HAConsumer(
        hosts=['rabbitmq-1', 'rabbitmq-2', 'rabbitmq-3'],
        queue='ha-queue'
    )
    consumer.run()
```

---

## Monitoring Consumer Cancellations

Track cancellation events for alerting:

```python
# monitor_cancellations.py
import subprocess
import json
from datetime import datetime
from collections import defaultdict

class CancellationMonitor:
    """Monitor and track consumer cancellations"""

    def __init__(self):
        self.cancellation_counts = defaultdict(int)
        self.last_check = None

    def get_consumer_count(self) -> dict:
        """Get current consumer count per queue"""
        result = subprocess.run(
            ['rabbitmqctl', 'list_queues',
             'name', 'consumers', '--formatter=json'],
            capture_output=True,
            text=True
        )

        queues = json.loads(result.stdout)
        return {q['name']: q['consumers'] for q in queues}

    def check_for_issues(self) -> list:
        """Check for potential cancellation issues"""
        issues = []

        consumers = self.get_consumer_count()

        for queue, count in consumers.items():
            if count == 0:
                issues.append(f"WARNING: Queue {queue} has no consumers")

        # Check connection churn (high rate of connections/disconnections)
        result = subprocess.run(
            ['rabbitmqctl', 'list_connections',
             'state', '--formatter=json'],
            capture_output=True,
            text=True
        )

        connections = json.loads(result.stdout)
        closing = sum(1 for c in connections if c.get('state') == 'closing')

        if closing > 5:
            issues.append(f"WARNING: {closing} connections in closing state")

        return issues

    def log_status(self):
        """Log current consumer status"""
        consumers = self.get_consumer_count()

        print(f"\n=== Consumer Status @ {datetime.now()} ===")
        for queue, count in sorted(consumers.items()):
            print(f"  {queue}: {count} consumers")

        issues = self.check_for_issues()
        if issues:
            print("\nIssues detected:")
            for issue in issues:
                print(f"  {issue}")


if __name__ == '__main__':
    import time

    monitor = CancellationMonitor()

    while True:
        monitor.log_status()
        time.sleep(30)
```

---

## Best Practices

1. **Always handle null messages** - A null message indicates consumer cancellation

2. **Register cancel callbacks** - Get notified immediately when cancelled

3. **Implement automatic recovery** - Resubscribe when possible

4. **Use durable queues** - Avoid auto-delete and exclusive queues for important workloads

5. **Monitor consumer counts** - Alert when queues have zero consumers

6. **Handle HA failover** - Enable `x-cancel-on-ha-failover` for explicit notification

7. **Log cancellation events** - Track patterns and investigate frequent cancellations

8. **Test cancellation scenarios** - Delete queues in staging to verify your handling

---

## Conclusion

Consumer cancellation errors require proper handling to maintain reliable message processing. Key takeaways:

- **Detect cancellations** via callbacks and null messages
- **Implement recovery logic** that resubscribes automatically
- **Handle edge cases** like deleted queues and HA failover
- **Monitor consumer health** and alert on zero-consumer queues
- **Test your recovery code** before production issues occur

---

*Managing RabbitMQ consumers? [OneUptime](https://oneuptime.com) monitors your queue consumer health and alerts you instantly when consumers are cancelled or queues become unprocessed.*
