# How to Stream Redis Changes to Apache Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kafka, Stream, CDC, Pipeline

Description: Learn how to capture Redis keyspace events and stream them to Apache Kafka for downstream processing, analytics, and event-driven architectures.

---

Streaming Redis changes to Kafka creates a durable, replayable event log from your fast in-memory store. This is useful for audit trails, downstream consumers, and decoupling services that react to Redis state changes.

## Architecture Overview

```text
Redis (keyspace events) -> Redis Source Connector -> Kafka Topic -> Consumers
```

Redis publishes keyspace notifications when keys are created, updated, or deleted. A Kafka connector subscribes to those notifications and forwards them to Kafka topics.

## Step 1: Enable Keyspace Notifications in Redis

```bash
redis-cli CONFIG SET notify-keyspace-events KEA
```

The flags mean:
- `K` - keyspace events
- `E` - keyevent events
- `A` - alias for `g$lshzxetd`, covers most command classes (set, del, expire, etc.)

Verify it's set:

```bash
redis-cli CONFIG GET notify-keyspace-events
```

## Step 2: Install the Redis Kafka Source Connector

Using Confluent Hub:

```bash
confluent-hub install jaredpetersen/kafka-connect-redis:1.2.3
```

Or download the JAR and place it in your Kafka Connect plugins directory.

## Step 3: Configure the Connector

Create a connector config file `redis-source.json`:

```json
{
  "name": "redis-source-connector",
  "config": {
    "connector.class": "io.github.jaredpetersen.kafkaconnectredis.source.RedisSourceConnector",
    "tasks.max": "1",
    "redis.uri": "redis://localhost:6379",
    "redis.channels.pattern.enabled": "true",
    "redis.channels": "__keyevent@0__:*",
    "topic": "redis-keyevents"
  }
}
```

Deploy it:

```bash
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @redis-source.json
```

## Step 4: Consume Events from Kafka

A Python consumer to process Redis change events:

```python
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    "redis-keyevents",
    bootstrap_servers=["localhost:9092"],
    value_deserializer=lambda m: m.decode("utf-8"),
    auto_offset_reset="earliest",
    group_id="redis-change-processor"
)

for message in consumer:
    key = message.key.decode("utf-8") if message.key else None
    event = message.value
    print(f"Key: {key}, Event: {event}")
    # Handle the change: enrich, route, store
```

## Step 5: Capture Full Key Values

Keyspace events only include the key name, not the value. Fetch the value in your consumer:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

for message in consumer:
    redis_key = message.value
    key_type = r.type(redis_key)

    if key_type == "string":
        value = r.get(redis_key)
    elif key_type == "hash":
        value = r.hgetall(redis_key)
    else:
        value = None

    print(f"{redis_key} ({key_type}): {value}")
```

## Filtering Specific Event Types

To capture only SET operations, use a targeted channel:

```json
{
  "redis.channels": "__keyevent@0__:set"
}
```

To capture hash field updates specifically, listen to `hset` events:

```json
{
  "redis.channels": "__keyevent@0__:hset"
}
```

## Monitoring the Pipeline

```bash
# Check connector status
curl http://localhost:8083/connectors/redis-source-connector/status

# View Kafka topic messages
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic redis-keyevents --from-beginning
```

## Summary

Streaming Redis changes to Kafka requires enabling keyspace notifications, deploying a Redis source connector, and writing consumers that hydrate event data from Redis. This pattern enables event-driven architectures where downstream services react to state changes without polling Redis directly.
