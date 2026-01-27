# How to Implement Kafka Consumers with At-Least-Once Semantics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, Consumers, At-Least-Once, Message Processing, Delivery Semantics

Description: Learn how to implement Kafka consumers with at-least-once delivery semantics, including offset management, error handling, and idempotency patterns.

---

> At-least-once delivery means your message will always be processed, but you must design your system to handle duplicates gracefully.

Kafka's delivery semantics determine how reliably messages flow from producers to consumers. Understanding and implementing at-least-once semantics correctly is essential for building reliable event-driven systems. This guide covers everything from offset management to idempotent consumer design with practical code examples.

---

## Table of Contents

1. Delivery Semantics Overview
2. Manual Offset Commit Strategies
3. Commit After Processing Pattern
4. Error Handling and Retry Logic
5. Idempotent Consumers
6. Deduplication Strategies
7. Batch Processing with Commits
8. Consumer Configuration for Reliability
9. Monitoring Consumer Lag
10. Testing Delivery Guarantees

---

## 1. Delivery Semantics Overview

Kafka supports three delivery semantics, each with different trade-offs:

| Semantic | Description | When Messages Are Lost | When Duplicates Occur |
|----------|-------------|------------------------|----------------------|
| At-most-once | Process first, commit later (or auto-commit) | Consumer crashes after commit but before processing | Never |
| At-least-once | Commit only after successful processing | Never | Consumer crashes after processing but before commit |
| Exactly-once | Transactional processing with idempotent producers | Never | Never (but adds complexity and overhead) |

**At-least-once** is the most common choice for production systems because:
- It guarantees no message loss
- It is simpler to implement than exactly-once
- Duplicate handling can be addressed at the application layer

The key principle: **Commit offsets only after you have successfully processed the message.**

---

## 2. Manual Offset Commit Strategies

Disable auto-commit and take control of when offsets are committed.

### Python Example (confluent-kafka)

```python
from confluent_kafka import Consumer, KafkaError

# Configure consumer with manual offset management
config = {
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'order-processor',
    'auto.offset.reset': 'earliest',
    # Disable auto-commit for manual control
    'enable.auto.commit': False,
}

consumer = Consumer(config)
consumer.subscribe(['orders'])

try:
    while True:
        # Poll for messages with 1 second timeout
        msg = consumer.poll(timeout=1.0)

        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            raise Exception(msg.error())

        # Process the message
        process_order(msg.value())

        # Commit only after successful processing
        consumer.commit(msg)

except KeyboardInterrupt:
    pass
finally:
    consumer.close()
```

### Java Example (kafka-clients)

```java
import org.apache.kafka.clients.consumer.*;
import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class AtLeastOnceConsumer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-processor");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        // Disable auto-commit
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
            consumer.subscribe(Collections.singletonList("orders"));

            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

                for (ConsumerRecord<String, String> record : records) {
                    // Process each message
                    processOrder(record.value());

                    // Commit after each message (synchronous)
                    consumer.commitSync(Collections.singletonMap(
                        new TopicPartition(record.topic(), record.partition()),
                        new OffsetAndMetadata(record.offset() + 1)
                    ));
                }
            }
        }
    }

    private static void processOrder(String order) {
        // Business logic here
        System.out.println("Processing: " + order);
    }
}
```

---

## 3. Commit After Processing Pattern

The commit-after-processing pattern ensures at-least-once delivery by structuring your consumer loop correctly.

### Pattern Structure

```
1. Poll messages
2. Process message(s)
3. Commit offset(s)
4. Repeat
```

### Synchronous vs Asynchronous Commits

| Commit Type | Pros | Cons | Use When |
|-------------|------|------|----------|
| Synchronous | Blocks until confirmed, simpler error handling | Higher latency | Processing critical data |
| Asynchronous | Better throughput | May lose commits on crash | High-throughput, can tolerate occasional reprocessing |

### Python - Synchronous Commit

```python
def consume_with_sync_commit(consumer):
    """
    Synchronous commit blocks until the broker confirms.
    Safest option for at-least-once semantics.
    """
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            handle_error(msg.error())
            continue

        try:
            # Process first
            process_message(msg)
            # Then commit (blocks until confirmed)
            consumer.commit(asynchronous=False)
        except ProcessingError as e:
            # Do not commit on failure - message will be redelivered
            log_error(f"Processing failed: {e}")
            # Optionally: send to dead letter queue
            send_to_dlq(msg, e)
```

### Python - Asynchronous Commit with Callback

```python
def commit_callback(err, partitions):
    """Called when async commit completes."""
    if err:
        log_error(f"Commit failed: {err}")
    else:
        for p in partitions:
            log_debug(f"Committed {p.topic}[{p.partition}]@{p.offset}")

def consume_with_async_commit(consumer):
    """
    Asynchronous commit for higher throughput.
    Use callback to track commit failures.
    """
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            handle_error(msg.error())
            continue

        try:
            process_message(msg)
            # Async commit with callback
            consumer.commit(asynchronous=True, callback=commit_callback)
        except ProcessingError as e:
            log_error(f"Processing failed: {e}")
            send_to_dlq(msg, e)
```

---

## 4. Error Handling and Retry Logic

Robust error handling prevents message loss and handles transient failures.

### Retry with Exponential Backoff

```python
import time
from functools import wraps

def retry_with_backoff(max_retries=3, base_delay=1.0, max_delay=60.0):
    """
    Decorator for retrying operations with exponential backoff.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except TransientError as e:
                    retries += 1
                    if retries >= max_retries:
                        raise MaxRetriesExceeded(f"Failed after {max_retries} attempts: {e}")

                    # Calculate delay with exponential backoff
                    delay = min(base_delay * (2 ** retries), max_delay)
                    log_warning(f"Retry {retries}/{max_retries} after {delay}s: {e}")
                    time.sleep(delay)
            return None
        return wrapper
    return decorator

@retry_with_backoff(max_retries=3, base_delay=1.0)
def process_order(order_data):
    """Process order with automatic retry on transient failures."""
    # Validate order
    order = parse_order(order_data)

    # Call external service (may fail transiently)
    inventory_service.reserve(order.items)

    # Persist to database
    database.save_order(order)

    return order
```

### Dead Letter Queue Pattern

```python
from confluent_kafka import Producer

class ConsumerWithDLQ:
    def __init__(self, consumer_config, dlq_topic='orders-dlq'):
        self.consumer = Consumer(consumer_config)
        self.producer = Producer({'bootstrap.servers': consumer_config['bootstrap.servers']})
        self.dlq_topic = dlq_topic
        self.max_retries = 3

    def send_to_dlq(self, msg, error, retry_count):
        """Send failed message to dead letter queue with metadata."""
        headers = [
            ('original-topic', msg.topic().encode()),
            ('original-partition', str(msg.partition()).encode()),
            ('original-offset', str(msg.offset()).encode()),
            ('error-message', str(error).encode()),
            ('retry-count', str(retry_count).encode()),
            ('failed-at', str(time.time()).encode()),
        ]

        self.producer.produce(
            topic=self.dlq_topic,
            key=msg.key(),
            value=msg.value(),
            headers=headers,
            callback=self.delivery_callback
        )
        self.producer.flush()

    def delivery_callback(self, err, msg):
        if err:
            log_error(f"DLQ delivery failed: {err}")

    def consume(self):
        """Main consume loop with DLQ support."""
        self.consumer.subscribe(['orders'])

        while True:
            msg = self.consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                continue

            retry_count = 0
            success = False

            while retry_count < self.max_retries and not success:
                try:
                    process_order(msg.value())
                    success = True
                except TransientError as e:
                    retry_count += 1
                    time.sleep(2 ** retry_count)
                except PermanentError as e:
                    # Non-retryable error - send to DLQ immediately
                    self.send_to_dlq(msg, e, retry_count)
                    success = True  # Move on to next message

            if not success:
                # Max retries exceeded
                self.send_to_dlq(msg, "Max retries exceeded", retry_count)

            # Commit only after handling (success or DLQ)
            self.consumer.commit(msg)
```

---

## 5. Idempotent Consumers

Since at-least-once may deliver duplicates, your consumer must handle them safely.

### What Makes a Consumer Idempotent?

An idempotent consumer produces the same result whether a message is processed once or multiple times.

| Operation Type | Naturally Idempotent | Requires Design |
|----------------|---------------------|-----------------|
| Upsert (insert or update) | Yes | No |
| Insert (create new) | No | Yes |
| Increment counter | No | Yes |
| Send notification | No | Yes |

### Idempotency Key Pattern

```python
import hashlib
import redis

class IdempotentConsumer:
    def __init__(self, redis_client):
        self.redis = redis_client
        # TTL for idempotency keys (7 days)
        self.key_ttl = 7 * 24 * 60 * 60

    def get_idempotency_key(self, msg):
        """
        Generate unique key for message.
        Use message key if available, otherwise hash the content.
        """
        if msg.key():
            return f"processed:{msg.topic()}:{msg.key().decode()}"

        # Fallback: hash topic + partition + offset
        unique_id = f"{msg.topic()}-{msg.partition()}-{msg.offset()}"
        return f"processed:{hashlib.sha256(unique_id.encode()).hexdigest()}"

    def is_duplicate(self, msg):
        """Check if message was already processed."""
        key = self.get_idempotency_key(msg)
        return self.redis.exists(key)

    def mark_processed(self, msg):
        """Mark message as processed."""
        key = self.get_idempotency_key(msg)
        self.redis.setex(key, self.key_ttl, "1")

    def process_idempotently(self, msg, processor_func):
        """
        Process message idempotently.
        Skips if already processed, marks as processed after success.
        """
        if self.is_duplicate(msg):
            log_info(f"Skipping duplicate: {self.get_idempotency_key(msg)}")
            return None

        # Process the message
        result = processor_func(msg.value())

        # Mark as processed
        self.mark_processed(msg)

        return result
```

### Database-Level Idempotency

```python
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

class OrderProcessor:
    def __init__(self, db_url):
        self.engine = create_engine(db_url)

    def process_order(self, order_data):
        """
        Process order idempotently using database constraints.
        Uses order_id as natural idempotency key.
        """
        order = parse_order(order_data)

        with self.engine.begin() as conn:
            try:
                # Insert with unique constraint on order_id
                conn.execute(text("""
                    INSERT INTO orders (order_id, customer_id, total, status, created_at)
                    VALUES (:order_id, :customer_id, :total, :status, NOW())
                """), {
                    'order_id': order.id,
                    'customer_id': order.customer_id,
                    'total': order.total,
                    'status': 'pending'
                })

                # Process order items
                for item in order.items:
                    conn.execute(text("""
                        INSERT INTO order_items (order_id, product_id, quantity, price)
                        VALUES (:order_id, :product_id, :quantity, :price)
                    """), {
                        'order_id': order.id,
                        'product_id': item.product_id,
                        'quantity': item.quantity,
                        'price': item.price
                    })

                return {'status': 'created', 'order_id': order.id}

            except IntegrityError:
                # Duplicate order_id - already processed
                log_info(f"Order {order.id} already exists, skipping")
                return {'status': 'duplicate', 'order_id': order.id}
```

---

## 6. Deduplication Strategies

Different deduplication approaches for different scenarios.

### Strategy 1: Message Key Deduplication

```python
class KeyBasedDeduplicator:
    """
    Use Kafka message keys for deduplication.
    Best when producers set meaningful keys (order_id, event_id, etc.)
    """
    def __init__(self, cache_client, ttl_seconds=3600):
        self.cache = cache_client
        self.ttl = ttl_seconds

    def dedupe_key(self, msg):
        # Use message key directly
        return f"seen:{msg.key().decode()}" if msg.key() else None

    def should_process(self, msg):
        key = self.dedupe_key(msg)
        if not key:
            # No key - cannot deduplicate, process anyway
            return True

        # SETNX returns True if key was set (new message)
        is_new = self.cache.setnx(key, "1")
        if is_new:
            self.cache.expire(key, self.ttl)
        return is_new
```

### Strategy 2: Content Hash Deduplication

```python
import hashlib
import json

class ContentHashDeduplicator:
    """
    Hash message content for deduplication.
    Use when messages lack unique keys but have deterministic content.
    """
    def __init__(self, cache_client, ttl_seconds=3600):
        self.cache = cache_client
        self.ttl = ttl_seconds

    def compute_hash(self, msg):
        # Normalize and hash content
        content = msg.value()
        if isinstance(content, bytes):
            content = content.decode('utf-8')

        # Sort keys for consistent hashing if JSON
        try:
            parsed = json.loads(content)
            normalized = json.dumps(parsed, sort_keys=True)
        except json.JSONDecodeError:
            normalized = content

        return hashlib.sha256(normalized.encode()).hexdigest()

    def should_process(self, msg):
        content_hash = self.compute_hash(msg)
        key = f"hash:{content_hash}"

        is_new = self.cache.setnx(key, "1")
        if is_new:
            self.cache.expire(key, self.ttl)
        return is_new
```

### Strategy 3: Sliding Window Deduplication

```python
import time

class SlidingWindowDeduplicator:
    """
    Deduplicate within a time window.
    Useful for high-volume streams where storing all keys is impractical.
    """
    def __init__(self, redis_client, window_seconds=300):
        self.redis = redis_client
        self.window = window_seconds

    def should_process(self, msg):
        key = msg.key().decode() if msg.key() else self.compute_hash(msg)
        sorted_set_key = f"dedupe:window:{msg.topic()}"
        now = time.time()

        # Remove old entries outside window
        self.redis.zremrangebyscore(sorted_set_key, 0, now - self.window)

        # Check if key exists in window
        score = self.redis.zscore(sorted_set_key, key)
        if score is not None:
            return False  # Duplicate within window

        # Add key with current timestamp
        self.redis.zadd(sorted_set_key, {key: now})
        self.redis.expire(sorted_set_key, self.window * 2)

        return True
```

---

## 7. Batch Processing with Commits

Process messages in batches for better throughput while maintaining at-least-once guarantees.

### Batch Commit Pattern

```python
class BatchConsumer:
    def __init__(self, consumer_config, batch_size=100, batch_timeout=5.0):
        self.consumer = Consumer(consumer_config)
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout

    def consume_batches(self, topic, processor_func):
        """
        Consume messages in batches with at-least-once semantics.
        Commits only after entire batch is processed successfully.
        """
        self.consumer.subscribe([topic])
        batch = []
        batch_start = time.time()

        while True:
            msg = self.consumer.poll(timeout=0.1)

            if msg and not msg.error():
                batch.append(msg)

            # Check if batch is ready
            batch_full = len(batch) >= self.batch_size
            batch_timeout = (time.time() - batch_start) >= self.batch_timeout

            if batch and (batch_full or batch_timeout):
                try:
                    # Process entire batch
                    processor_func(batch)

                    # Commit highest offset per partition
                    self.commit_batch(batch)

                    log_info(f"Processed and committed batch of {len(batch)} messages")

                except Exception as e:
                    # Batch failed - do not commit
                    # Messages will be redelivered on next poll
                    log_error(f"Batch processing failed: {e}")
                    # Optionally: process messages individually to isolate failures
                    self.process_individually(batch, processor_func)

                # Reset batch
                batch = []
                batch_start = time.time()

    def commit_batch(self, batch):
        """Commit the highest offset for each partition in the batch."""
        offsets = {}
        for msg in batch:
            tp = (msg.topic(), msg.partition())
            current = offsets.get(tp, -1)
            if msg.offset() > current:
                offsets[tp] = msg.offset()

        # Build offset map for commit
        from confluent_kafka import TopicPartition
        commit_offsets = [
            TopicPartition(topic, partition, offset + 1)
            for (topic, partition), offset in offsets.items()
        ]

        self.consumer.commit(offsets=commit_offsets, asynchronous=False)

    def process_individually(self, batch, processor_func):
        """Fallback: process messages one by one to isolate failures."""
        for msg in batch:
            try:
                processor_func([msg])
                self.consumer.commit(msg)
            except Exception as e:
                log_error(f"Individual message failed: {e}")
                send_to_dlq(msg, e)
                self.consumer.commit(msg)  # Commit after DLQ
```

### Java Batch Processing

```java
import org.apache.kafka.clients.consumer.*;
import java.time.Duration;
import java.util.*;

public class BatchConsumer {
    private final KafkaConsumer<String, String> consumer;
    private final int batchSize;
    private final long batchTimeoutMs;

    public BatchConsumer(Properties props, int batchSize, long batchTimeoutMs) {
        // Ensure auto-commit is disabled
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        this.consumer = new KafkaConsumer<>(props);
        this.batchSize = batchSize;
        this.batchTimeoutMs = batchTimeoutMs;
    }

    public void consumeBatches(String topic, BatchProcessor processor) {
        consumer.subscribe(Collections.singletonList(topic));
        List<ConsumerRecord<String, String>> batch = new ArrayList<>();
        long batchStart = System.currentTimeMillis();

        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));

            for (ConsumerRecord<String, String> record : records) {
                batch.add(record);
            }

            boolean batchFull = batch.size() >= batchSize;
            boolean timedOut = (System.currentTimeMillis() - batchStart) >= batchTimeoutMs;

            if (!batch.isEmpty() && (batchFull || timedOut)) {
                try {
                    // Process batch
                    processor.process(batch);

                    // Commit highest offsets
                    commitBatch(batch);

                    System.out.println("Committed batch of " + batch.size() + " messages");

                } catch (Exception e) {
                    System.err.println("Batch failed: " + e.getMessage());
                    // Handle failure - process individually or send to DLQ
                }

                batch.clear();
                batchStart = System.currentTimeMillis();
            }
        }
    }

    private void commitBatch(List<ConsumerRecord<String, String>> batch) {
        Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();

        for (ConsumerRecord<String, String> record : batch) {
            TopicPartition tp = new TopicPartition(record.topic(), record.partition());
            long currentOffset = offsets.getOrDefault(tp, new OffsetAndMetadata(0)).offset();

            if (record.offset() + 1 > currentOffset) {
                offsets.put(tp, new OffsetAndMetadata(record.offset() + 1));
            }
        }

        consumer.commitSync(offsets);
    }

    @FunctionalInterface
    interface BatchProcessor {
        void process(List<ConsumerRecord<String, String>> records) throws Exception;
    }
}
```

---

## 8. Consumer Configuration for Reliability

Key configuration settings that affect delivery guarantees.

### Recommended Settings for At-Least-Once

```python
# Python (confluent-kafka)
config = {
    'bootstrap.servers': 'kafka1:9092,kafka2:9092,kafka3:9092',
    'group.id': 'order-processor',

    # Offset management
    'enable.auto.commit': False,           # Manual commit only
    'auto.offset.reset': 'earliest',       # Start from beginning if no offset

    # Session management
    'session.timeout.ms': 30000,           # 30 seconds
    'heartbeat.interval.ms': 10000,        # 10 seconds (1/3 of session timeout)
    'max.poll.interval.ms': 300000,        # 5 minutes for processing

    # Fetch settings
    'fetch.min.bytes': 1,                  # Respond immediately
    'fetch.max.wait.ms': 500,              # Max wait for fetch.min.bytes
    'max.partition.fetch.bytes': 1048576,  # 1MB per partition

    # Reliability
    'isolation.level': 'read_committed',   # Only read committed messages
}
```

### Java Configuration

```java
Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka1:9092,kafka2:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-processor");

// Offset management
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

// Session management
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10000);
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);

// Fetch settings
props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1);
props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
props.put(ConsumerConfig.MAX_PARTITION_FETCH_BYTES_CONFIG, 1048576);

// Reliability
props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");

// Deserializers
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
```

### Configuration Explained

| Setting | Purpose | Recommendation |
|---------|---------|----------------|
| `enable.auto.commit` | Auto-commit offsets periodically | `false` for at-least-once |
| `auto.offset.reset` | What to do when no offset exists | `earliest` to not miss messages |
| `session.timeout.ms` | Time before consumer is considered dead | 30-60 seconds |
| `max.poll.interval.ms` | Max time between polls before rebalance | Based on processing time |
| `isolation.level` | Read uncommitted or committed messages | `read_committed` for transactional producers |

---

## 9. Monitoring Consumer Lag

Consumer lag indicates how far behind your consumer is from the latest messages.

### Lag Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Consumer lag (messages) | Messages not yet consumed | Depends on throughput |
| Consumer lag (time) | Age of oldest unconsumed message | Based on SLA requirements |
| Commit rate | Offsets committed per second | Sudden drops |
| Rebalance rate | Consumer group rebalances | More than expected |

### Python Lag Monitoring

```python
from confluent_kafka import Consumer
from confluent_kafka.admin import AdminClient

class LagMonitor:
    def __init__(self, bootstrap_servers, group_id):
        self.admin = AdminClient({'bootstrap.servers': bootstrap_servers})
        self.consumer = Consumer({
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
        })

    def get_lag(self, topic):
        """Calculate consumer lag for a topic."""
        # Get committed offsets
        partitions = self.consumer.list_topics(topic).topics[topic].partitions
        topic_partitions = [TopicPartition(topic, p) for p in partitions]

        committed = self.consumer.committed(topic_partitions)

        # Get end offsets (latest)
        end_offsets = {}
        for tp in topic_partitions:
            low, high = self.consumer.get_watermark_offsets(tp)
            end_offsets[tp.partition] = high

        # Calculate lag
        total_lag = 0
        partition_lag = {}

        for tp in committed:
            if tp is None:
                continue
            current = tp.offset if tp.offset >= 0 else 0
            latest = end_offsets.get(tp.partition, 0)
            lag = latest - current
            partition_lag[tp.partition] = lag
            total_lag += lag

        return {
            'total_lag': total_lag,
            'partition_lag': partition_lag,
            'topic': topic,
            'group_id': self.consumer.consumer_group_metadata().group_id,
        }

    def report_lag(self, topic, metrics_client):
        """Report lag to monitoring system."""
        lag_data = self.get_lag(topic)

        # Send to monitoring
        metrics_client.gauge('kafka.consumer.lag.total', lag_data['total_lag'], tags={
            'topic': topic,
            'consumer_group': lag_data['group_id'],
        })

        for partition, lag in lag_data['partition_lag'].items():
            metrics_client.gauge('kafka.consumer.lag.partition', lag, tags={
                'topic': topic,
                'partition': str(partition),
                'consumer_group': lag_data['group_id'],
            })
```

### Alerting on Lag

```python
class LagAlerter:
    def __init__(self, lag_monitor, alerting_client):
        self.monitor = lag_monitor
        self.alerter = alerting_client
        self.thresholds = {
            'warning': 10000,   # 10k messages
            'critical': 100000, # 100k messages
        }

    def check_and_alert(self, topic):
        lag = self.monitor.get_lag(topic)
        total = lag['total_lag']

        if total >= self.thresholds['critical']:
            self.alerter.send_alert(
                severity='critical',
                title=f'Critical consumer lag on {topic}',
                message=f'Consumer group {lag["group_id"]} has {total} messages lag',
            )
        elif total >= self.thresholds['warning']:
            self.alerter.send_alert(
                severity='warning',
                title=f'High consumer lag on {topic}',
                message=f'Consumer group {lag["group_id"]} has {total} messages lag',
            )
```

---

## 10. Testing Delivery Guarantees

Verify your at-least-once implementation handles edge cases correctly.

### Unit Tests

```python
import pytest
from unittest.mock import Mock, patch

class TestIdempotentConsumer:
    def test_skips_duplicate_message(self):
        """Verify duplicate messages are not reprocessed."""
        redis_mock = Mock()
        redis_mock.exists.return_value = True  # Already processed

        consumer = IdempotentConsumer(redis_mock)
        msg = create_mock_message(key=b'order-123')
        processor = Mock()

        result = consumer.process_idempotently(msg, processor)

        assert result is None
        processor.assert_not_called()

    def test_processes_new_message(self):
        """Verify new messages are processed and marked."""
        redis_mock = Mock()
        redis_mock.exists.return_value = False  # Not processed

        consumer = IdempotentConsumer(redis_mock)
        msg = create_mock_message(key=b'order-456')
        processor = Mock(return_value={'status': 'ok'})

        result = consumer.process_idempotently(msg, processor)

        assert result == {'status': 'ok'}
        processor.assert_called_once()
        redis_mock.setex.assert_called_once()


class TestRetryLogic:
    def test_retries_on_transient_error(self):
        """Verify transient errors trigger retries."""
        processor = Mock(side_effect=[TransientError("timeout"), {'status': 'ok'}])

        result = retry_with_backoff(max_retries=3)(processor)()

        assert processor.call_count == 2
        assert result == {'status': 'ok'}

    def test_fails_after_max_retries(self):
        """Verify max retries are respected."""
        processor = Mock(side_effect=TransientError("always fails"))

        with pytest.raises(MaxRetriesExceeded):
            retry_with_backoff(max_retries=3)(processor)()

        assert processor.call_count == 3
```

### Integration Tests

```python
import pytest
from testcontainers.kafka import KafkaContainer

@pytest.fixture
def kafka_container():
    """Spin up Kafka for integration tests."""
    with KafkaContainer() as kafka:
        yield kafka

class TestAtLeastOnceDelivery:
    def test_message_redelivered_on_crash(self, kafka_container):
        """
        Verify messages are redelivered if consumer crashes before commit.
        """
        topic = 'test-orders'
        bootstrap = kafka_container.get_bootstrap_server()

        # Produce a message
        producer = Producer({'bootstrap.servers': bootstrap})
        producer.produce(topic, key='order-1', value='{"id": 1}')
        producer.flush()

        # Consumer 1: consume but do not commit
        consumer1 = Consumer({
            'bootstrap.servers': bootstrap,
            'group.id': 'test-group',
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
        })
        consumer1.subscribe([topic])

        msg1 = consumer1.poll(timeout=5.0)
        assert msg1 is not None
        assert msg1.key() == b'order-1'
        # Simulate crash - close without commit
        consumer1.close()

        # Consumer 2: should receive same message
        consumer2 = Consumer({
            'bootstrap.servers': bootstrap,
            'group.id': 'test-group',
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
        })
        consumer2.subscribe([topic])

        msg2 = consumer2.poll(timeout=5.0)
        assert msg2 is not None
        assert msg2.key() == b'order-1'  # Same message redelivered

        consumer2.commit(msg2)
        consumer2.close()

    def test_no_redelivery_after_commit(self, kafka_container):
        """
        Verify messages are not redelivered after successful commit.
        """
        topic = 'test-orders-2'
        bootstrap = kafka_container.get_bootstrap_server()

        # Produce a message
        producer = Producer({'bootstrap.servers': bootstrap})
        producer.produce(topic, key='order-2', value='{"id": 2}')
        producer.flush()

        # Consume and commit
        consumer1 = Consumer({
            'bootstrap.servers': bootstrap,
            'group.id': 'test-group-2',
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
        })
        consumer1.subscribe([topic])

        msg1 = consumer1.poll(timeout=5.0)
        assert msg1 is not None
        consumer1.commit(msg1)
        consumer1.close()

        # New consumer should not receive the message
        consumer2 = Consumer({
            'bootstrap.servers': bootstrap,
            'group.id': 'test-group-2',
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
        })
        consumer2.subscribe([topic])

        msg2 = consumer2.poll(timeout=2.0)
        assert msg2 is None  # No message - already committed

        consumer2.close()
```

---

## Best Practices Summary

1. **Disable auto-commit** - Always use `enable.auto.commit=false` for at-least-once semantics.

2. **Commit after processing** - Only commit offsets after successfully processing the message.

3. **Design idempotent consumers** - Use idempotency keys, database constraints, or deduplication to handle redeliveries.

4. **Implement proper error handling** - Use retries with backoff for transient errors and dead letter queues for permanent failures.

5. **Monitor consumer lag** - Track lag metrics and alert on thresholds to catch issues early.

6. **Use appropriate commit strategy** - Synchronous commits for critical data, asynchronous for high throughput.

7. **Configure timeouts correctly** - Set `max.poll.interval.ms` based on your processing time to avoid unnecessary rebalances.

8. **Test delivery guarantees** - Write integration tests that verify message redelivery and duplicate handling.

9. **Use batch commits wisely** - Batch processing improves throughput but increases the reprocessing window on failures.

10. **Set isolation level** - Use `read_committed` when consuming from topics with transactional producers.

---

*Need to monitor your Kafka consumers and track lag in real-time? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your message queues, with alerting on consumer lag and processing errors.*
