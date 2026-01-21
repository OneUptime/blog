# How to Implement Manual Offset Commit in Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Offset Management, Consumer, At-Least-Once, Exactly-Once, Java, Python

Description: A comprehensive guide to implementing manual offset commit in Kafka consumers, covering commit strategies, at-least-once and exactly-once semantics, error handling, and best practices for reliable message processing.

---

Manual offset commit gives you precise control over when Kafka marks messages as processed. This is essential for implementing at-least-once or exactly-once delivery semantics. This guide covers different commit strategies and their trade-offs.

## Understanding Offset Commits

### Auto Commit vs Manual Commit

| Feature | Auto Commit | Manual Commit |
|---------|-------------|---------------|
| Control | Time-based | Application-controlled |
| Delivery | At-most-once risk | At-least-once guaranteed |
| Complexity | Simple | More code required |
| Use Case | Non-critical data | Business-critical processing |

### Commit Types

- **Synchronous**: Blocks until commit completes
- **Asynchronous**: Non-blocking, uses callback
- **Per-partition**: Commit specific partition offsets

## Disabling Auto Commit

### Java Configuration

```java
Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "my-group");
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
    "org.apache.kafka.common.serialization.StringDeserializer");
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
    "org.apache.kafka.common.serialization.StringDeserializer");

// Disable auto commit
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

// Optional: Set auto.offset.reset for new groups
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
```

### Python Configuration

```python
config = {
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'my-group',
    'enable.auto.commit': False,
    'auto.offset.reset': 'earliest',
}
consumer = Consumer(config)
```

## Synchronous Commit Strategies

### Commit After Each Message

Safest but slowest approach - guarantees at-most-one message loss on failure.

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import java.time.Duration;
import java.util.*;

public class PerMessageCommitConsumer {
    private final Consumer<String, String> consumer;

    public PerMessageCommitConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

        this.consumer = new KafkaConsumer<>(props);
    }

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    // Process message
                    processRecord(record);

                    // Commit offset for this specific message
                    Map<TopicPartition, OffsetAndMetadata> offsetToCommit =
                        Collections.singletonMap(
                            new TopicPartition(record.topic(), record.partition()),
                            new OffsetAndMetadata(record.offset() + 1)
                        );

                    consumer.commitSync(offsetToCommit);
                }
            }
        } finally {
            consumer.close();
        }
    }

    private void processRecord(ConsumerRecord<String, String> record) {
        System.out.printf("Processing: partition=%d, offset=%d, value=%s%n",
            record.partition(), record.offset(), record.value());
    }
}
```

### Commit After Batch

Better performance, may reprocess batch on failure.

```java
public class BatchCommitConsumer {
    private final Consumer<String, String> consumer;

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                if (records.isEmpty()) continue;

                // Process all records in batch
                for (ConsumerRecord<String, String> record : records) {
                    processRecord(record);
                }

                // Commit all offsets after successful batch processing
                consumer.commitSync();
                System.out.printf("Committed %d records%n", records.count());
            }
        } finally {
            consumer.close();
        }
    }
}
```

### Commit at Intervals

Balance between safety and performance.

```java
public class IntervalCommitConsumer {
    private final Consumer<String, String> consumer;
    private long lastCommitTime = System.currentTimeMillis();
    private final long commitIntervalMs = 5000;
    private final Map<TopicPartition, OffsetAndMetadata> currentOffsets =
        new HashMap<>();

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    processRecord(record);

                    // Track current offset
                    currentOffsets.put(
                        new TopicPartition(record.topic(), record.partition()),
                        new OffsetAndMetadata(record.offset() + 1)
                    );
                }

                // Commit at intervals
                long now = System.currentTimeMillis();
                if (now - lastCommitTime >= commitIntervalMs) {
                    if (!currentOffsets.isEmpty()) {
                        consumer.commitSync(currentOffsets);
                        currentOffsets.clear();
                        lastCommitTime = now;
                    }
                }
            }
        } finally {
            // Final commit
            if (!currentOffsets.isEmpty()) {
                consumer.commitSync(currentOffsets);
            }
            consumer.close();
        }
    }
}
```

## Asynchronous Commit

### Basic Async Commit

```java
public class AsyncCommitConsumer {
    private final Consumer<String, String> consumer;

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    processRecord(record);
                }

                // Async commit with callback
                consumer.commitAsync((offsets, exception) -> {
                    if (exception != null) {
                        System.err.println("Commit failed: " + exception.getMessage());
                        // Could implement retry logic here
                    } else {
                        System.out.println("Committed offsets: " + offsets);
                    }
                });
            }
        } finally {
            // Sync commit on shutdown for safety
            try {
                consumer.commitSync();
            } finally {
                consumer.close();
            }
        }
    }
}
```

### Async with Retry

```java
public class AsyncRetryCommitConsumer {
    private final Consumer<String, String> consumer;
    private final AtomicInteger asyncCommitFailures = new AtomicInteger(0);
    private final int maxAsyncFailures = 3;

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    processRecord(record);
                }

                if (!records.isEmpty()) {
                    commitWithRetry();
                }
            }
        } finally {
            consumer.commitSync();
            consumer.close();
        }
    }

    private void commitWithRetry() {
        consumer.commitAsync((offsets, exception) -> {
            if (exception != null) {
                int failures = asyncCommitFailures.incrementAndGet();
                System.err.printf("Async commit failed (%d): %s%n",
                    failures, exception.getMessage());

                // Fall back to sync commit after too many failures
                if (failures >= maxAsyncFailures) {
                    System.out.println("Falling back to sync commit");
                    try {
                        consumer.commitSync();
                        asyncCommitFailures.set(0);
                    } catch (Exception e) {
                        System.err.println("Sync commit also failed: " +
                            e.getMessage());
                    }
                }
            } else {
                asyncCommitFailures.set(0);
            }
        });
    }
}
```

## Python Manual Commit Examples

### Synchronous Commit

```python
from confluent_kafka import Consumer, TopicPartition
import json

class ManualCommitConsumer:
    def __init__(self, bootstrap_servers, group_id):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
        }
        self.consumer = Consumer(self.config)

    def consume_with_per_message_commit(self, topic):
        self.consumer.subscribe([topic])

        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Error: {msg.error()}")
                    continue

                # Process message
                self.process_message(msg)

                # Commit this specific offset
                self.consumer.commit(
                    offsets=[TopicPartition(
                        msg.topic(),
                        msg.partition(),
                        msg.offset() + 1
                    )],
                    asynchronous=False
                )

        finally:
            self.consumer.close()

    def consume_with_batch_commit(self, topic, batch_size=100):
        self.consumer.subscribe([topic])
        batch = []

        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    if batch:
                        self._commit_batch(batch)
                        batch = []
                    continue

                if msg.error():
                    print(f"Error: {msg.error()}")
                    continue

                # Process and add to batch
                self.process_message(msg)
                batch.append(msg)

                # Commit when batch is full
                if len(batch) >= batch_size:
                    self._commit_batch(batch)
                    batch = []

        finally:
            if batch:
                self._commit_batch(batch)
            self.consumer.close()

    def _commit_batch(self, batch):
        # Build offsets from batch
        offsets = {}
        for msg in batch:
            key = (msg.topic(), msg.partition())
            if key not in offsets or msg.offset() > offsets[key]:
                offsets[key] = msg.offset()

        commit_offsets = [
            TopicPartition(topic, partition, offset + 1)
            for (topic, partition), offset in offsets.items()
        ]

        self.consumer.commit(offsets=commit_offsets, asynchronous=False)
        print(f"Committed batch of {len(batch)} messages")

    def process_message(self, msg):
        print(f"Processing: partition={msg.partition()}, "
              f"offset={msg.offset()}, value={msg.value().decode()}")


def main():
    consumer = ManualCommitConsumer('localhost:9092', 'manual-commit-group')
    consumer.consume_with_batch_commit('my-topic', batch_size=50)


if __name__ == '__main__':
    main()
```

### Async Commit with Callback

```python
from confluent_kafka import Consumer, TopicPartition

class AsyncCommitConsumer:
    def __init__(self, bootstrap_servers, group_id):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
        }
        self.consumer = Consumer(self.config)
        self.pending_commits = 0

    def commit_callback(self, err, partitions):
        self.pending_commits -= 1
        if err:
            print(f"Commit failed: {err}")
        else:
            for p in partitions:
                print(f"Committed: {p.topic}[{p.partition}] @ {p.offset}")

    def consume(self, topic):
        self.consumer.subscribe([topic])

        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Error: {msg.error()}")
                    continue

                self.process_message(msg)

                # Async commit
                self.pending_commits += 1
                self.consumer.commit(asynchronous=True,
                                    callback=self.commit_callback)

        finally:
            # Final sync commit
            self.consumer.commit(asynchronous=False)
            self.consumer.close()

    def process_message(self, msg):
        print(f"Processing: {msg.value().decode()}")
```

## Handling Failures

### Transactional Processing Pattern

```java
public class TransactionalConsumer {
    private final Consumer<String, String> consumer;
    private final ExternalDatabase database;

    public void consumeWithTransaction(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    try {
                        // Start external transaction
                        database.beginTransaction();

                        // Process record
                        processAndStore(record);

                        // Commit Kafka offset within same transaction context
                        Map<TopicPartition, OffsetAndMetadata> offset =
                            Collections.singletonMap(
                                new TopicPartition(record.topic(), record.partition()),
                                new OffsetAndMetadata(record.offset() + 1)
                            );
                        consumer.commitSync(offset);

                        // Commit external transaction
                        database.commit();

                    } catch (Exception e) {
                        // Rollback everything
                        database.rollback();
                        System.err.println("Processing failed: " + e.getMessage());
                        // Don't commit offset - will reprocess
                    }
                }
            }
        } finally {
            consumer.close();
        }
    }

    private void processAndStore(ConsumerRecord<String, String> record) {
        // Store in database
        database.insert(record.key(), record.value());
    }
}
```

### Idempotent Processing

```java
public class IdempotentConsumer {
    private final Consumer<String, String> consumer;
    private final Set<String> processedIds = ConcurrentHashMap.newKeySet();
    private final IdempotencyStore store;

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                Map<TopicPartition, OffsetAndMetadata> offsetsToCommit =
                    new HashMap<>();

                for (ConsumerRecord<String, String> record : records) {
                    String messageId = extractMessageId(record);

                    // Check if already processed
                    if (store.isProcessed(messageId)) {
                        System.out.println("Skipping duplicate: " + messageId);
                    } else {
                        // Process message
                        processRecord(record);

                        // Mark as processed
                        store.markProcessed(messageId);
                    }

                    // Track offset regardless (already processed or newly processed)
                    offsetsToCommit.put(
                        new TopicPartition(record.topic(), record.partition()),
                        new OffsetAndMetadata(record.offset() + 1)
                    );
                }

                if (!offsetsToCommit.isEmpty()) {
                    consumer.commitSync(offsetsToCommit);
                }
            }
        } finally {
            consumer.close();
        }
    }

    private String extractMessageId(ConsumerRecord<String, String> record) {
        // Use header or derive from content
        return record.topic() + "-" + record.partition() + "-" + record.offset();
    }
}
```

## Best Practices

### 1. Always Commit After Processing

```java
// WRONG - Commit before processing
consumer.commitSync();
processRecord(record);

// CORRECT - Commit after processing
processRecord(record);
consumer.commitSync();
```

### 2. Use Sync Commit on Shutdown

```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    try {
        consumer.commitSync();  // Final sync commit
    } finally {
        consumer.close();
    }
}));
```

### 3. Track Per-Partition Offsets

```java
Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();

for (ConsumerRecord<String, String> record : records) {
    processRecord(record);
    offsets.put(
        new TopicPartition(record.topic(), record.partition()),
        new OffsetAndMetadata(record.offset() + 1)  // +1 for next offset
    );
}
```

### 4. Handle Commit Failures

```java
try {
    consumer.commitSync();
} catch (CommitFailedException e) {
    // Rebalance occurred, partitions may have been reassigned
    System.err.println("Commit failed due to rebalance: " + e.getMessage());
    // Records may be reprocessed by another consumer
}
```

## Conclusion

Manual offset commit provides precise control over message acknowledgment:

1. **Choose commit strategy** based on your durability requirements
2. **Use synchronous commit** for at-least-once guarantees
3. **Use async commit** for better performance with acceptable risk
4. **Handle failures** with idempotent processing
5. **Always sync commit on shutdown** to prevent message loss

The right strategy depends on your specific requirements for message delivery guarantees and processing performance.
