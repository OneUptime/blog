# How to Run Redpanda (Kafka-Compatible) in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Redpanda, Kafka, Streaming, Message Queues, DevOps

Description: Deploy Redpanda in Docker as a Kafka-compatible streaming platform without ZooKeeper, JVM, or complex configuration.

---

Redpanda is a Kafka-compatible streaming data platform written in C++. It implements the Kafka API, so any Kafka client library, tool, or application works with Redpanda without modification. The big difference is that Redpanda does not require ZooKeeper, does not run on the JVM, and starts in milliseconds instead of minutes.

For local development and testing, Redpanda is dramatically simpler than running a real Kafka cluster. You get a single binary with built-in schema registry and HTTP proxy, and it uses far less memory than Kafka.

## Quick Start

Run a single Redpanda node:

```bash
# Start Redpanda with all interfaces exposed
docker run -d \
  --name redpanda \
  -p 9092:9092 \
  -p 8081:8081 \
  -p 8082:8082 \
  -p 9644:9644 \
  docker.redpanda.com/redpandadata/redpanda:latest \
  redpanda start \
    --smp 1 \
    --memory 512M \
    --overprovisioned \
    --kafka-addr internal://0.0.0.0:9092,external://0.0.0.0:19092 \
    --advertise-kafka-addr internal://redpanda:9092,external://localhost:9092
```

Here is what each port provides:

- **9092** - Kafka-compatible API (producers and consumers connect here)
- **8081** - Schema Registry API
- **8082** - HTTP Proxy (Pandaproxy) for REST-based produce/consume
- **9644** - Admin API for cluster management

## Docker Compose Setup

The recommended way to run Redpanda for development:

```yaml
# docker-compose.yml - Redpanda with Console UI
version: "3.8"

services:
  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:latest
    command:
      - redpanda start
      - --smp 1
      - --memory 512M
      - --overprovisioned
      - --node-id 0
      - --kafka-addr internal://0.0.0.0:9092,external://0.0.0.0:19092
      - --advertise-kafka-addr internal://redpanda:9092,external://localhost:19092
      - --pandaproxy-addr internal://0.0.0.0:8082,external://0.0.0.0:18082
      - --advertise-pandaproxy-addr internal://redpanda:8082,external://localhost:18082
      - --schema-registry-addr internal://0.0.0.0:8081,external://0.0.0.0:18081
      - --advertise-schema-registry-addr internal://redpanda:8081,external://localhost:18081
    ports:
      # Kafka API
      - "19092:19092"
      # Schema Registry
      - "18081:18081"
      # HTTP Proxy
      - "18082:18082"
      # Admin API
      - "9644:9644"
    volumes:
      - redpanda_data:/var/lib/redpanda/data
    healthcheck:
      test: ["CMD", "rpk", "cluster", "health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  # Redpanda Console - Web UI for topic management
  console:
    image: docker.redpanda.com/redpandadata/console:latest
    ports:
      - "8080:8080"
    environment:
      CONFIG_FILEPATH: /tmp/config.yml
      CONSOLE_CONFIG_FILE: |
        kafka:
          brokers: ["redpanda:9092"]
          schemaRegistry:
            enabled: true
            urls: ["http://redpanda:8081"]
        redpanda:
          adminApi:
            enabled: true
            urls: ["http://redpanda:9644"]
    depends_on:
      redpanda:
        condition: service_healthy

volumes:
  redpanda_data:
```

Start the stack:

```bash
# Launch Redpanda and Console
docker compose up -d
```

Open `http://localhost:8080` for the Redpanda Console web UI.

## Working with Topics Using rpk

Redpanda ships with `rpk`, a powerful CLI tool for managing topics and producing/consuming messages:

```bash
# Create a topic with 3 partitions and replication factor of 1
docker exec redpanda rpk topic create orders -p 3 -r 1

# Create a compacted topic for maintaining latest state per key
docker exec redpanda rpk topic create user-profiles -p 3 -r 1 \
  -c cleanup.policy=compact

# List all topics
docker exec redpanda rpk topic list

# Get detailed topic information
docker exec redpanda rpk topic describe orders

# Produce messages interactively
docker exec -it redpanda rpk topic produce orders

# Produce a message with a key
echo "key1:value1" | docker exec -i redpanda rpk topic produce orders -f '%k:%v\n'

# Consume messages from the beginning
docker exec redpanda rpk topic consume orders --offset start

# Consume only new messages
docker exec redpanda rpk topic consume orders --offset end
```

## Using with Kafka Client Libraries

Since Redpanda is Kafka-compatible, any Kafka client works. Here is an example with Python:

```python
# producer.py - Produce messages to Redpanda using kafka-python
from kafka import KafkaProducer
import json
import time

# Connect to Redpanda (same as connecting to Kafka)
producer = KafkaProducer(
    bootstrap_servers=['localhost:19092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8') if k else None
)

# Produce order events
for i in range(100):
    order = {
        'order_id': f'ORD-{i:05d}',
        'customer_id': f'CUST-{i % 10}',
        'amount': round(10.0 + i * 1.5, 2),
        'timestamp': time.time()
    }

    # Send with a key for partition affinity
    future = producer.send(
        'orders',
        key=order['customer_id'],
        value=order
    )
    record = future.get(timeout=10)
    print(f"Sent order {order['order_id']} to partition {record.partition}")

producer.flush()
producer.close()
```

```python
# consumer.py - Consume messages from Redpanda using kafka-python
from kafka import KafkaConsumer
import json

# Create a consumer group
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:19092'],
    group_id='order-processor',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

print("Waiting for messages...")
for message in consumer:
    order = message.value
    print(f"Partition {message.partition} | "
          f"Offset {message.offset} | "
          f"Order: {order['order_id']} - ${order['amount']}")
```

## Schema Registry

Redpanda includes a built-in Schema Registry compatible with Confluent's Schema Registry API:

```bash
# Register an Avro schema
curl -X POST http://localhost:18081/subjects/orders-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"order_id\",\"type\":\"string\"},{\"name\":\"amount\",\"type\":\"double\"},{\"name\":\"timestamp\",\"type\":\"long\"}]}"
  }'

# List all registered subjects
curl http://localhost:18081/subjects

# Get the latest schema version
curl http://localhost:18081/subjects/orders-value/versions/latest
```

## HTTP Proxy (REST API)

Produce and consume messages over HTTP without a Kafka client library:

```bash
# Produce a message via HTTP
curl -X POST http://localhost:18082/topics/orders \
  -H "Content-Type: application/vnd.kafka.json.v2+json" \
  -d '{
    "records": [
      {"key": "CUST-001", "value": {"order_id": "ORD-99999", "amount": 42.50}}
    ]
  }'

# Create a consumer group via HTTP
curl -X POST http://localhost:18082/consumers/rest-group \
  -H "Content-Type: application/vnd.kafka.v2+json" \
  -d '{
    "name": "rest-consumer",
    "format": "json",
    "auto.offset.reset": "earliest"
  }'

# Subscribe to a topic
curl -X POST http://localhost:18082/consumers/rest-group/instances/rest-consumer/subscription \
  -H "Content-Type: application/vnd.kafka.v2+json" \
  -d '{"topics": ["orders"]}'

# Fetch messages
curl http://localhost:18082/consumers/rest-group/instances/rest-consumer/records \
  -H "Accept: application/vnd.kafka.json.v2+json"
```

## Three-Node Cluster

For testing replication and partition leader election:

```yaml
# docker-compose-cluster.yml - Three-node Redpanda cluster
version: "3.8"

services:
  redpanda-0:
    image: docker.redpanda.com/redpandadata/redpanda:latest
    command:
      - redpanda start
      - --smp 1
      - --memory 256M
      - --overprovisioned
      - --node-id 0
      - --seeds redpanda-0:33145
      - --kafka-addr internal://0.0.0.0:9092,external://0.0.0.0:19092
      - --advertise-kafka-addr internal://redpanda-0:9092,external://localhost:19092
    ports:
      - "19092:19092"
      - "9644:9644"
    volumes:
      - rp0_data:/var/lib/redpanda/data

  redpanda-1:
    image: docker.redpanda.com/redpandadata/redpanda:latest
    command:
      - redpanda start
      - --smp 1
      - --memory 256M
      - --overprovisioned
      - --node-id 1
      - --seeds redpanda-0:33145
      - --kafka-addr internal://0.0.0.0:9092,external://0.0.0.0:29092
      - --advertise-kafka-addr internal://redpanda-1:9092,external://localhost:29092
    ports:
      - "29092:29092"
    volumes:
      - rp1_data:/var/lib/redpanda/data

  redpanda-2:
    image: docker.redpanda.com/redpandadata/redpanda:latest
    command:
      - redpanda start
      - --smp 1
      - --memory 256M
      - --overprovisioned
      - --node-id 2
      - --seeds redpanda-0:33145
      - --kafka-addr internal://0.0.0.0:9092,external://0.0.0.0:39092
      - --advertise-kafka-addr internal://redpanda-2:9092,external://localhost:39092
    ports:
      - "39092:39092"
    volumes:
      - rp2_data:/var/lib/redpanda/data

volumes:
  rp0_data:
  rp1_data:
  rp2_data:
```

## Summary

Redpanda gives you Kafka compatibility without the operational complexity. No ZooKeeper, no JVM tuning, no garbage collection pauses. For local development, it starts instantly and uses a fraction of the resources that Kafka requires. The built-in Schema Registry and HTTP Proxy mean fewer containers to manage. Since it speaks the Kafka protocol, you can use it as a drop-in replacement for Kafka in your development environment and switch to either Redpanda or Kafka in production. The rpk CLI and the Console web UI make topic management straightforward from day one.
