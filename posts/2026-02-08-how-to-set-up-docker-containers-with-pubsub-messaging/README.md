# How to Set Up Docker Containers with Pub/Sub Messaging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Pub/Sub, Messaging, Redis, NATS, Event Streaming, Microservices, DevOps

Description: Set up publish-subscribe messaging between Docker containers using Redis Pub/Sub, NATS, and other message brokers for real-time communication.

---

Publish/Subscribe (Pub/Sub) messaging decouples services by letting publishers send messages to topics without knowing who receives them. Subscribers listen to topics they care about and receive messages in real time. This pattern is fundamental to building reactive, event-driven systems with Docker containers.

Unlike request-response communication, Pub/Sub lets you add new subscribers without modifying publishers. This makes your architecture extensible and loosely coupled. This guide covers setting up Pub/Sub with three popular brokers: Redis, NATS, and RabbitMQ.

## Redis Pub/Sub

Redis includes a lightweight Pub/Sub system. It requires no additional infrastructure if you already use Redis for caching. Messages are fire-and-forget, meaning subscribers only receive messages published while they are connected.

Start Redis with Docker Compose:

```yaml
# docker-compose.yml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Create a publisher service that sends events to Redis channels:

```python
# publisher/app.py
# Publishes order events to Redis Pub/Sub channels

import redis
import json
import time
import random
import os

REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

def connect_redis():
    """Connect to Redis with retry logic."""
    for attempt in range(10):
        try:
            client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
            client.ping()
            print(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
            return client
        except redis.ConnectionError:
            print(f"Redis not ready, retrying... ({attempt + 1}/10)")
            time.sleep(2)
    raise Exception("Could not connect to Redis")

def publish_events():
    """Simulate order events and publish to Redis channels."""
    client = connect_redis()
    order_id = 1000

    while True:
        order_id += 1
        event = {
            "order_id": order_id,
            "customer": f"customer_{random.randint(1, 100)}",
            "amount": round(random.uniform(10.0, 500.0), 2),
            "timestamp": time.time(),
        }

        # Publish to the "orders" channel
        channel = "orders.created"
        client.publish(channel, json.dumps(event))
        print(f"Published to {channel}: order #{order_id}")

        time.sleep(2)

if __name__ == "__main__":
    publish_events()
```

Create a subscriber service that listens for events:

```python
# subscriber-email/app.py
# Subscribes to order events and sends email notifications

import redis
import json
import os
import time

REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

def connect_redis():
    """Connect to Redis with retry logic."""
    for attempt in range(10):
        try:
            client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
            client.ping()
            print(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
            return client
        except redis.ConnectionError:
            print(f"Redis not ready, retrying... ({attempt + 1}/10)")
            time.sleep(2)
    raise Exception("Could not connect to Redis")

def subscribe_and_process():
    """Subscribe to order events and process them."""
    client = connect_redis()
    pubsub = client.pubsub()

    # Subscribe to order channels using pattern matching
    pubsub.psubscribe("orders.*")
    print("Subscribed to orders.* channels")

    for message in pubsub.listen():
        if message["type"] == "pmessage":
            channel = message["channel"]
            data = json.loads(message["data"])

            print(f"Received on {channel}: order #{data['order_id']}")
            print(f"  Sending confirmation email to {data['customer']}")
            print(f"  Amount: ${data['amount']}")

if __name__ == "__main__":
    subscribe_and_process()
```

Create a second subscriber for analytics:

```python
# subscriber-analytics/app.py
# Subscribes to order events and tracks analytics

import redis
import json
import os
import time

REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

def connect_redis():
    for attempt in range(10):
        try:
            client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
            client.ping()
            return client
        except redis.ConnectionError:
            time.sleep(2)
    raise Exception("Could not connect to Redis")

def subscribe_and_analyze():
    """Subscribe to order events and track running totals."""
    client = connect_redis()
    pubsub = client.pubsub()
    pubsub.psubscribe("orders.*")

    total_orders = 0
    total_revenue = 0.0

    print("Analytics subscriber started")

    for message in pubsub.listen():
        if message["type"] == "pmessage":
            data = json.loads(message["data"])
            total_orders += 1
            total_revenue += data["amount"]

            print(f"Analytics: {total_orders} orders, ${total_revenue:.2f} total revenue")

if __name__ == "__main__":
    subscribe_and_analyze()
```

The full Docker Compose setup with publisher and multiple subscribers:

```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  publisher:
    build: ./publisher
    environment:
      REDIS_HOST: redis
    depends_on:
      redis:
        condition: service_healthy

  email-subscriber:
    build: ./subscriber-email
    environment:
      REDIS_HOST: redis
    depends_on:
      redis:
        condition: service_healthy

  analytics-subscriber:
    build: ./subscriber-analytics
    environment:
      REDIS_HOST: redis
    depends_on:
      redis:
        condition: service_healthy
```

## NATS for High-Performance Pub/Sub

NATS is a lightweight, high-performance messaging system designed for cloud-native applications. It handles millions of messages per second and supports features like request-reply, queue groups, and JetStream for persistent messaging.

Docker Compose configuration for NATS with monitoring:

```yaml
version: "3.8"

services:
  nats:
    image: nats:2.10-alpine
    ports:
      - "4222:4222"   # Client connections
      - "8222:8222"   # HTTP monitoring
    command: "--jetstream --http_port 8222"
    volumes:
      - nats-data:/data
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8222/healthz"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  nats-data:
```

A NATS publisher in Node.js:

```javascript
// nats-publisher/index.js
// Publishes events to NATS subjects

const { connect, StringCodec } = require("nats");

const sc = StringCodec();

async function main() {
  // Connect to NATS with retry
  let nc;
  for (let i = 0; i < 10; i++) {
    try {
      nc = await connect({
        servers: process.env.NATS_URL || "nats://nats:4222",
      });
      console.log("Connected to NATS");
      break;
    } catch (err) {
      console.log(`NATS not ready, retrying... (${i + 1}/10)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  let counter = 0;

  // Publish events every second
  setInterval(() => {
    counter++;
    const event = {
      id: counter,
      type: "sensor.reading",
      value: Math.random() * 100,
      unit: "celsius",
      timestamp: new Date().toISOString(),
    };

    // Publish to a hierarchical subject
    nc.publish("sensors.temperature.room1", sc.encode(JSON.stringify(event)));
    console.log(`Published sensor reading #${counter}`);
  }, 1000);
}

main().catch(console.error);
```

A NATS subscriber with wildcard matching:

```javascript
// nats-subscriber/index.js
// Subscribes to NATS subjects with wildcard patterns

const { connect, StringCodec } = require("nats");

const sc = StringCodec();

async function main() {
  let nc;
  for (let i = 0; i < 10; i++) {
    try {
      nc = await connect({
        servers: process.env.NATS_URL || "nats://nats:4222",
      });
      console.log("Connected to NATS");
      break;
    } catch (err) {
      console.log(`NATS not ready, retrying... (${i + 1}/10)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Subscribe to ALL sensor readings using wildcard
  const sub = nc.subscribe("sensors.>");
  console.log("Subscribed to sensors.>");

  for await (const msg of sub) {
    const data = JSON.parse(sc.decode(msg.data));
    console.log(`[${msg.subject}] Reading #${data.id}: ${data.value.toFixed(2)} ${data.unit}`);
  }
}

main().catch(console.error);
```

## NATS Queue Groups for Load Balancing

NATS queue groups distribute messages across multiple subscribers. Only one subscriber in the group receives each message.

```javascript
// nats-worker/index.js
// Uses NATS queue groups to distribute work across multiple workers

const { connect, StringCodec } = require("nats");
const sc = StringCodec();

async function main() {
  const nc = await connect({
    servers: process.env.NATS_URL || "nats://nats:4222",
  });

  const workerName = process.env.WORKER_NAME || "worker-1";

  // Subscribe with a queue group - NATS load-balances across the group
  const sub = nc.subscribe("tasks.process", { queue: "workers" });
  console.log(`${workerName}: Joined queue group "workers" on tasks.process`);

  for await (const msg of sub) {
    const task = JSON.parse(sc.decode(msg.data));
    console.log(`${workerName}: Processing task ${task.id}`);
    // Process the task...
  }
}

main().catch(console.error);
```

Scale workers with Compose:

```yaml
services:
  nats-worker:
    build: ./nats-worker
    environment:
      NATS_URL: nats://nats:4222
    deploy:
      replicas: 5
```

## Redis Streams for Persistent Pub/Sub

Redis Pub/Sub messages are ephemeral. If no subscriber is listening, messages are lost. Redis Streams provide persistent, replayable message logs.

A publisher using Redis Streams:

```python
# stream-publisher/app.py
# Publishes events to a Redis Stream for durable messaging

import redis
import json
import time
import random
import os

def publish_to_stream():
    """Publish events to a Redis Stream instead of Pub/Sub channels."""
    client = redis.Redis(
        host=os.environ.get("REDIS_HOST", "redis"),
        port=6379,
        decode_responses=True,
    )

    order_id = 0
    while True:
        order_id += 1
        event = {
            "order_id": str(order_id),
            "customer": f"customer_{random.randint(1, 100)}",
            "amount": str(round(random.uniform(10.0, 500.0), 2)),
        }

        # XADD adds to a stream - messages persist until explicitly deleted
        message_id = client.xadd("orders_stream", event, maxlen=10000)
        print(f"Published to stream: {message_id} - order #{order_id}")

        time.sleep(1)

if __name__ == "__main__":
    publish_to_stream()
```

A consumer group subscriber that processes messages reliably:

```python
# stream-consumer/app.py
# Consumes from a Redis Stream using consumer groups for reliable processing

import redis
import os
import time

REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
GROUP_NAME = os.environ.get("GROUP_NAME", "processors")
CONSUMER_NAME = os.environ.get("CONSUMER_NAME", "consumer-1")
STREAM = "orders_stream"

def consume_stream():
    client = redis.Redis(host=REDIS_HOST, port=6379, decode_responses=True)

    # Create consumer group if it does not exist
    try:
        client.xgroup_create(STREAM, GROUP_NAME, id="0", mkstream=True)
        print(f"Created consumer group: {GROUP_NAME}")
    except redis.ResponseError as e:
        if "BUSYGROUP" in str(e):
            print(f"Consumer group {GROUP_NAME} already exists")
        else:
            raise

    print(f"{CONSUMER_NAME}: Listening on {STREAM} (group: {GROUP_NAME})")

    while True:
        # Read new messages for this consumer
        messages = client.xreadgroup(
            GROUP_NAME, CONSUMER_NAME,
            {STREAM: ">"},
            count=10,
            block=5000,
        )

        for stream_name, entries in messages:
            for message_id, data in entries:
                print(f"{CONSUMER_NAME}: Processing {message_id} - order #{data['order_id']}, ${data['amount']}")

                # Acknowledge the message after successful processing
                client.xack(STREAM, GROUP_NAME, message_id)

if __name__ == "__main__":
    time.sleep(3)  # Wait for Redis
    consume_stream()
```

Docker Compose for the Redis Streams setup:

```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  stream-publisher:
    build: ./stream-publisher
    environment:
      REDIS_HOST: redis
    depends_on:
      - redis

  stream-consumer-1:
    build: ./stream-consumer
    environment:
      REDIS_HOST: redis
      GROUP_NAME: processors
      CONSUMER_NAME: consumer-1
    depends_on:
      - redis

  stream-consumer-2:
    build: ./stream-consumer
    environment:
      REDIS_HOST: redis
      GROUP_NAME: processors
      CONSUMER_NAME: consumer-2
    depends_on:
      - redis

volumes:
  redis-data:
```

## Choosing the Right Pub/Sub System

| Feature | Redis Pub/Sub | Redis Streams | NATS | RabbitMQ |
|---------|---------------|---------------|------|----------|
| Message persistence | No | Yes | Yes (JetStream) | Yes |
| Consumer groups | No | Yes | Yes | Yes |
| Speed | Very fast | Fast | Very fast | Fast |
| Setup complexity | Minimal | Low | Low | Medium |
| Memory usage | Minimal | Moderate | Low | Moderate |
| Best for | Real-time notifications | Event sourcing | High-throughput | Complex routing |

## Conclusion

Pub/Sub messaging transforms how Docker containers communicate. Publishers and subscribers evolve independently, new consumers join without affecting existing ones, and the system naturally scales by adding more subscriber instances. Start with Redis Pub/Sub if you already have Redis in your stack and need simple real-time messaging. Move to Redis Streams or NATS when you need message persistence and consumer groups. The pattern stays the same regardless of the broker - publish events to topics, subscribe to what you need, and let the broker handle the routing.
