# How to Configure RabbitMQ High Availability Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, High Availability, Clustering, Quorum Queues, Mirrored Queues, DevOps, Infrastructure, Reliability

Description: Learn how to configure RabbitMQ for high availability using quorum queues, cluster setup, and proper failover strategies.

---

> High availability in RabbitMQ means your messages survive node failures. Without proper HA configuration, a single node crash can cause message loss and service disruption.

RabbitMQ offers multiple approaches to high availability. Understanding when to use each is critical for building reliable messaging infrastructure.

---

## HA Options Overview

```mermaid
flowchart TD
    subgraph "RabbitMQ HA Options"
        QQ[Quorum Queues] -->|Recommended| R1[Raft consensus<br/>Strong consistency<br/>Automatic failover]
        MQ[Mirrored Queues] -->|Deprecated| R2[Classic mirroring<br/>Eventual consistency<br/>Manual policies]
        SQ[Streams] -->|Append-only| R3[Log-based<br/>Replay support<br/>High throughput]
    end
```

---

## Cluster Setup

Before configuring HA queues, you need a RabbitMQ cluster.

### Docker Compose Cluster

```yaml
# docker-compose.yml
version: '3.8'

services:
  rabbitmq-1:
    image: rabbitmq:3.12-management
    hostname: rabbitmq-1
    environment:
      RABBITMQ_ERLANG_COOKIE: "secret-cookie-here"
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq-1-data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - rabbitmq-cluster

  rabbitmq-2:
    image: rabbitmq:3.12-management
    hostname: rabbitmq-2
    environment:
      RABBITMQ_ERLANG_COOKIE: "secret-cookie-here"
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq-2-data:/var/lib/rabbitmq
    depends_on:
      - rabbitmq-1
    networks:
      - rabbitmq-cluster

  rabbitmq-3:
    image: rabbitmq:3.12-management
    hostname: rabbitmq-3
    environment:
      RABBITMQ_ERLANG_COOKIE: "secret-cookie-here"
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq-3-data:/var/lib/rabbitmq
    depends_on:
      - rabbitmq-1
    networks:
      - rabbitmq-cluster

volumes:
  rabbitmq-1-data:
  rabbitmq-2-data:
  rabbitmq-3-data:

networks:
  rabbitmq-cluster:
    driver: bridge
```

### Join Nodes to Cluster

```bash
#!/bin/bash
# cluster-setup.sh

# Run on rabbitmq-2 to join the cluster
docker exec rabbitmq-2 rabbitmqctl stop_app
docker exec rabbitmq-2 rabbitmqctl reset
docker exec rabbitmq-2 rabbitmqctl join_cluster rabbit@rabbitmq-1
docker exec rabbitmq-2 rabbitmqctl start_app

# Run on rabbitmq-3 to join the cluster
docker exec rabbitmq-3 rabbitmqctl stop_app
docker exec rabbitmq-3 rabbitmqctl reset
docker exec rabbitmq-3 rabbitmqctl join_cluster rabbit@rabbitmq-1
docker exec rabbitmq-3 rabbitmqctl start_app

# Verify cluster status
docker exec rabbitmq-1 rabbitmqctl cluster_status
```

---

## Quorum Queues (Recommended)

Quorum queues are the recommended HA queue type in RabbitMQ 3.8+. They use the Raft consensus algorithm for replication.

```mermaid
flowchart LR
    subgraph "Quorum Queue Replication"
        P[Publisher] --> L[Leader Node]
        L -->|Replicate| F1[Follower 1]
        L -->|Replicate| F2[Follower 2]
        F1 -->|Ack| L
        F2 -->|Ack| L
        L -->|Confirm| P
    end

    subgraph "Read Path"
        C[Consumer] --> L
        L -->|Deliver| C
    end
```

### Creating Quorum Queues

**Node.js:**

```javascript
// quorum-queue.js
const amqp = require('amqplib');

async function createQuorumQueue() {
    // Connect to any node in the cluster
    const connection = await amqp.connect('amqp://admin:password@localhost:5672');
    const channel = await connection.createChannel();

    // Declare a quorum queue
    // Quorum queues are always durable - the durable flag is ignored
    await channel.assertQueue('orders-queue', {
        durable: true,
        arguments: {
            // This is what makes it a quorum queue
            'x-queue-type': 'quorum',

            // Number of replicas (default: cluster size, max 5 recommended)
            // Odd numbers work best for Raft consensus
            'x-quorum-initial-group-size': 3,

            // Delivery limit before dead-lettering
            // Prevents infinite redelivery loops
            'x-delivery-limit': 5,

            // Dead letter exchange for failed messages
            'x-dead-letter-exchange': 'dlx',
            'x-dead-letter-routing-key': 'orders.failed'
        }
    });

    console.log('Quorum queue created');

    // Declare dead letter exchange and queue
    await channel.assertExchange('dlx', 'direct', { durable: true });
    await channel.assertQueue('orders-failed', { durable: true });
    await channel.bindQueue('orders-failed', 'dlx', 'orders.failed');

    await channel.close();
    await connection.close();
}

createQuorumQueue();
```

**Python:**

```python
# quorum_queue.py
import pika

def create_quorum_queue():
    """Create a quorum queue with proper HA configuration"""

    # Connect to cluster
    credentials = pika.PlainCredentials('admin', 'password')
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host='localhost',
            credentials=credentials
        )
    )
    channel = connection.channel()

    # Define quorum queue arguments
    queue_args = {
        # Specify quorum queue type
        'x-queue-type': 'quorum',

        # Initial number of replicas
        'x-quorum-initial-group-size': 3,

        # Maximum delivery attempts
        'x-delivery-limit': 5,

        # Configure dead lettering
        'x-dead-letter-exchange': 'dlx',
        'x-dead-letter-routing-key': 'orders.failed',

        # Optional: Set memory limit per queue member
        'x-max-in-memory-length': 10000
    }

    # Declare the quorum queue
    channel.queue_declare(
        queue='orders-queue',
        durable=True,  # Always true for quorum queues
        arguments=queue_args
    )

    print("Quorum queue 'orders-queue' created")

    # Set up dead letter infrastructure
    channel.exchange_declare(
        exchange='dlx',
        exchange_type='direct',
        durable=True
    )

    channel.queue_declare(
        queue='orders-failed',
        durable=True
    )

    channel.queue_bind(
        queue='orders-failed',
        exchange='dlx',
        routing_key='orders.failed'
    )

    connection.close()


if __name__ == '__main__':
    create_quorum_queue()
```

### Quorum Queue Properties

| Property | Description |
|----------|-------------|
| `x-queue-type` | Set to `quorum` |
| `x-quorum-initial-group-size` | Number of replicas (default: cluster size) |
| `x-delivery-limit` | Max redeliveries before dead-lettering |
| `x-max-in-memory-length` | Messages kept in memory per replica |
| `x-max-in-memory-bytes` | Memory limit per replica |

---

## Publishing to HA Queues

For maximum reliability, use publisher confirms with persistent messages:

```javascript
// reliable-publisher.js
const amqp = require('amqplib');

class HAPublisher {
    constructor(urls) {
        // Multiple URLs for failover
        this.urls = urls;
        this.currentUrlIndex = 0;
        this.connection = null;
        this.channel = null;
    }

    async connect() {
        // Try each URL until one succeeds
        for (let i = 0; i < this.urls.length; i++) {
            const urlIndex = (this.currentUrlIndex + i) % this.urls.length;
            const url = this.urls[urlIndex];

            try {
                this.connection = await amqp.connect(url);
                this.currentUrlIndex = urlIndex;

                // Use confirm channel for publisher confirms
                this.channel = await this.connection.createConfirmChannel();

                // Handle connection events
                this.connection.on('close', () => this._onClose());
                this.connection.on('error', (err) => this._onError(err));

                console.log(`Connected to ${url}`);
                return;

            } catch (error) {
                console.warn(`Failed to connect to ${url}: ${error.message}`);
            }
        }

        throw new Error('Failed to connect to any RabbitMQ node');
    }

    async publish(queue, message, options = {}) {
        const content = Buffer.from(JSON.stringify(message));

        // Publish with persistence and wait for confirm
        return new Promise((resolve, reject) => {
            this.channel.sendToQueue(
                queue,
                content,
                {
                    persistent: true,  // Survive broker restart
                    contentType: 'application/json',
                    ...options
                },
                (err, ok) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(ok);
                    }
                }
            );
        });
    }

    _onClose() {
        console.log('Connection closed, reconnecting...');
        this.currentUrlIndex = (this.currentUrlIndex + 1) % this.urls.length;
        setTimeout(() => this.connect(), 1000);
    }

    _onError(err) {
        console.error('Connection error:', err.message);
    }

    async close() {
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
    }
}

// Usage with multiple nodes
async function main() {
    const publisher = new HAPublisher([
        'amqp://admin:password@rabbitmq-1:5672',
        'amqp://admin:password@rabbitmq-2:5672',
        'amqp://admin:password@rabbitmq-3:5672'
    ]);

    await publisher.connect();

    // Publish message - will be replicated across cluster
    await publisher.publish('orders-queue', {
        orderId: '12345',
        customer: 'john@example.com',
        total: 99.99
    });

    console.log('Message published and confirmed');

    await publisher.close();
}

main();
```

---

## Consuming from HA Queues

```mermaid
flowchart TD
    subgraph "Consumer Failover"
        C[Consumer] -->|Connect| N1[Node 1<br/>Leader]
        N1 -->|Deliver| C

        N1 -.->|Node fails| X[X]

        C -->|Reconnect| N2[Node 2<br/>New Leader]
        N2 -->|Redeliver unacked| C
    end
```

**Resilient consumer with automatic reconnection:**

```python
# ha_consumer.py
import pika
import time
from typing import Callable, List, Optional

class HAConsumer:
    """High-availability consumer with automatic failover"""

    def __init__(self, hosts: List[str], credentials: pika.PlainCredentials):
        self.hosts = hosts
        self.credentials = credentials
        self.current_host_index = 0
        self.connection: Optional[pika.BlockingConnection] = None
        self.channel = None
        self.should_reconnect = True

    def connect(self) -> bool:
        """Connect to cluster with failover"""

        # Try each host
        for i in range(len(self.hosts)):
            host_index = (self.current_host_index + i) % len(self.hosts)
            host = self.hosts[host_index]

            try:
                params = pika.ConnectionParameters(
                    host=host,
                    credentials=self.credentials,
                    heartbeat=60,
                    blocked_connection_timeout=300,
                    connection_attempts=3,
                    retry_delay=1
                )

                self.connection = pika.BlockingConnection(params)
                self.channel = self.connection.channel()

                # Set QoS for fair dispatch
                self.channel.basic_qos(prefetch_count=10)

                self.current_host_index = host_index
                print(f"Connected to {host}")
                return True

            except Exception as e:
                print(f"Failed to connect to {host}: {e}")

        return False

    def consume(self, queue: str, callback: Callable):
        """Start consuming with automatic reconnection"""

        while self.should_reconnect:
            try:
                if not self.connection or self.connection.is_closed:
                    if not self.connect():
                        print("Failed to connect to any host, retrying in 5s...")
                        time.sleep(5)
                        continue

                # Set up consumer
                self.channel.basic_consume(
                    queue=queue,
                    on_message_callback=self._wrap_callback(callback),
                    auto_ack=False
                )

                print(f"Consuming from {queue}")
                self.channel.start_consuming()

            except pika.exceptions.ConnectionClosedByBroker:
                print("Connection closed by broker, reconnecting...")
                self.current_host_index = (self.current_host_index + 1) % len(self.hosts)
                time.sleep(1)

            except pika.exceptions.AMQPChannelError as e:
                print(f"Channel error: {e}, reconnecting...")
                time.sleep(1)

            except pika.exceptions.AMQPConnectionError:
                print("Connection lost, reconnecting...")
                self.current_host_index = (self.current_host_index + 1) % len(self.hosts)
                time.sleep(1)

    def _wrap_callback(self, callback: Callable):
        """Wrap callback with error handling"""

        def wrapper(ch, method, properties, body):
            try:
                callback(body)
                ch.basic_ack(delivery_tag=method.delivery_tag)

            except Exception as e:
                print(f"Message processing failed: {e}")
                # Requeue on failure (will be redelivered)
                ch.basic_nack(
                    delivery_tag=method.delivery_tag,
                    requeue=True
                )

        return wrapper

    def stop(self):
        """Stop consuming and close connection"""
        self.should_reconnect = False
        if self.channel:
            self.channel.stop_consuming()
        if self.connection:
            self.connection.close()


# Usage
def process_order(body):
    import json
    order = json.loads(body)
    print(f"Processing order: {order['orderId']}")
    # Process the order...

if __name__ == '__main__':
    credentials = pika.PlainCredentials('admin', 'password')

    consumer = HAConsumer(
        hosts=['rabbitmq-1', 'rabbitmq-2', 'rabbitmq-3'],
        credentials=credentials
    )

    try:
        consumer.consume('orders-queue', process_order)
    except KeyboardInterrupt:
        consumer.stop()
```

---

## Monitoring Quorum Queue Health

```bash
#!/bin/bash
# monitor-quorum-queues.sh

# List all quorum queues with their status
rabbitmqctl list_queues \
    name \
    type \
    leader \
    members \
    online \
    messages \
    --formatter=json | jq '.[] | select(.type == "quorum")'

# Check quorum queue metrics
rabbitmqctl list_queues \
    name \
    messages \
    messages_ready \
    messages_unacknowledged \
    consumers \
    --formatter=json | jq '.'

# Check for queues with unavailable members
rabbitmqctl list_queues name online members --formatter=json | \
    jq '.[] | select((.online | length) < (.members | length))'
```

**Python monitoring script:**

```python
# monitor_ha.py
import subprocess
import json
from dataclasses import dataclass
from typing import List

@dataclass
class QuorumQueueStatus:
    name: str
    leader: str
    members: List[str]
    online: List[str]
    messages: int

    @property
    def is_healthy(self) -> bool:
        """Queue is healthy if majority of members are online"""
        return len(self.online) > len(self.members) // 2

    @property
    def replication_factor(self) -> int:
        return len(self.members)

    @property
    def available_replicas(self) -> int:
        return len(self.online)

def get_quorum_queue_status() -> List[QuorumQueueStatus]:
    """Get status of all quorum queues"""

    result = subprocess.run(
        ['rabbitmqctl', 'list_queues',
         'name', 'type', 'leader', 'members', 'online', 'messages',
         '--formatter=json'],
        capture_output=True,
        text=True
    )

    queues = json.loads(result.stdout)

    return [
        QuorumQueueStatus(
            name=q['name'],
            leader=q.get('leader', ''),
            members=q.get('members', []),
            online=q.get('online', []),
            messages=q.get('messages', 0)
        )
        for q in queues
        if q.get('type') == 'quorum'
    ]

def check_ha_health():
    """Check health of all quorum queues"""

    queues = get_quorum_queue_status()
    issues = []

    for q in queues:
        if not q.is_healthy:
            issues.append(
                f"CRITICAL: Queue {q.name} has only {q.available_replicas}/"
                f"{q.replication_factor} replicas online"
            )
        elif q.available_replicas < q.replication_factor:
            issues.append(
                f"WARNING: Queue {q.name} has {q.available_replicas}/"
                f"{q.replication_factor} replicas online"
            )

    return issues

if __name__ == '__main__':
    issues = check_ha_health()

    if issues:
        for issue in issues:
            print(issue)
        exit(1)
    else:
        print("All quorum queues healthy")
        exit(0)
```

---

## Network Partitions

```mermaid
flowchart TD
    subgraph "Network Partition Scenario"
        subgraph "Partition A"
            N1[Node 1]
            N2[Node 2]
        end

        subgraph "Partition B"
            N3[Node 3]
        end

        N1 <-->|OK| N2
        N1 -.->|Partitioned| N3
        N2 -.->|Partitioned| N3
    end
```

Configure partition handling in `rabbitmq.conf`:

```ini
# rabbitmq.conf

# Partition handling mode
# Options: ignore, pause_minority, autoheal
cluster_partition_handling = pause_minority

# For quorum queues, Raft handles partitions automatically
# pause_minority is recommended for classic queues
```

**Partition handling modes:**

| Mode | Behavior |
|------|----------|
| `ignore` | Do nothing (may cause split-brain) |
| `pause_minority` | Pause nodes in minority partition |
| `autoheal` | Restart nodes in losing partition |

---

## Best Practices

1. **Use quorum queues** - They are the modern, recommended approach for HA

2. **Odd number of nodes** - 3 or 5 nodes work best for Raft consensus

3. **Set delivery limits** - Prevent infinite redelivery with `x-delivery-limit`

4. **Use dead letter exchanges** - Capture messages that exceed delivery limits

5. **Monitor replica health** - Alert when replicas go offline

6. **Use publisher confirms** - Ensure messages are replicated before confirming

7. **Connect to multiple nodes** - Implement client-side failover

8. **Configure partition handling** - Use `pause_minority` to prevent split-brain

9. **Set appropriate quorum size** - More replicas means more durability but slower writes

10. **Test failover regularly** - Verify your HA setup works before you need it

---

## Conclusion

High availability in RabbitMQ requires proper cluster setup and queue configuration. Key takeaways:

- **Quorum queues** provide strong consistency with Raft consensus
- **Configure replication** based on your durability requirements
- **Implement client failover** to handle node failures gracefully
- **Monitor replica health** to catch issues before they cause outages
- **Handle partitions properly** to prevent data inconsistency

---

*Running RabbitMQ in production? [OneUptime](https://oneuptime.com) monitors your RabbitMQ clusters, tracks queue health, and alerts you to node failures and partition events before they impact your applications.*
