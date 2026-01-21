# How to Handle Poison Messages in Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Poison Messages, Dead Letter Queue, Error Handling, Consumer, Resilience

Description: A comprehensive guide to handling poison messages in Kafka consumers, covering dead letter queues, retry strategies, circuit breakers, and patterns for building resilient message processing pipelines.

---

Poison messages are messages that cause consumer failures repeatedly, blocking partition processing. Without proper handling, a single bad message can halt your entire consumer pipeline. This guide covers strategies for detecting, handling, and recovering from poison messages.

## Understanding Poison Messages

### What Makes a Message Poisonous?

- **Deserialization failures**: Malformed JSON, schema mismatches
- **Business logic failures**: Invalid data, missing required fields
- **External dependency failures**: Database errors, API timeouts
- **Resource exhaustion**: Message too large, out of memory

### Impact Without Handling

```
Without poison message handling:
[msg1] -> processed
[msg2] -> processed
[msg3 - POISON] -> FAIL -> retry -> FAIL -> retry -> FAIL...
[msg4] -> blocked
[msg5] -> blocked
```

## Dead Letter Queue Pattern

The most common solution is routing failed messages to a dead letter queue (DLQ) for later analysis.

### Java DLQ Implementation

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.internals.RecordHeader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

public class DLQConsumer {
    private final Consumer<String, String> consumer;
    private final Producer<String, String> producer;
    private final String dlqTopic;
    private final int maxRetries;

    public DLQConsumer(String bootstrapServers, String groupId,
                       String sourceTopic, int maxRetries) {
        // Consumer setup
        Properties consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        consumerProps.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);

        this.consumer = new KafkaConsumer<>(consumerProps);
        consumer.subscribe(Collections.singletonList(sourceTopic));

        // Producer for DLQ
        Properties producerProps = new Properties();
        producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(ProducerConfig.ACKS_CONFIG, "all");

        this.producer = new KafkaProducer<>(producerProps);
        this.dlqTopic = sourceTopic + "-dlq";
        this.maxRetries = maxRetries;
    }

    public void consume(MessageProcessor processor) {
        Map<TopicPartition, OffsetAndMetadata> offsetsToCommit = new HashMap<>();

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(1000));

                for (ConsumerRecord<String, String> record : records) {
                    try {
                        processor.process(record);
                    } catch (Exception e) {
                        handleFailedMessage(record, e);
                    }

                    // Track offset for commit
                    offsetsToCommit.put(
                        new TopicPartition(record.topic(), record.partition()),
                        new OffsetAndMetadata(record.offset() + 1)
                    );
                }

                if (!offsetsToCommit.isEmpty()) {
                    consumer.commitSync(offsetsToCommit);
                    offsetsToCommit.clear();
                }
            }
        } finally {
            consumer.close();
            producer.close();
        }
    }

    private void handleFailedMessage(ConsumerRecord<String, String> record,
                                     Exception exception) {
        System.err.printf("Failed to process message: topic=%s, partition=%d, offset=%d, error=%s%n",
            record.topic(), record.partition(), record.offset(), exception.getMessage());

        // Send to DLQ
        ProducerRecord<String, String> dlqRecord = new ProducerRecord<>(
            dlqTopic, record.key(), record.value());

        // Add metadata headers
        dlqRecord.headers()
            .add(new RecordHeader("dlq.original.topic",
                record.topic().getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("dlq.original.partition",
                String.valueOf(record.partition()).getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("dlq.original.offset",
                String.valueOf(record.offset()).getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("dlq.original.timestamp",
                String.valueOf(record.timestamp()).getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("dlq.error.message",
                exception.getMessage().getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("dlq.error.class",
                exception.getClass().getName().getBytes(StandardCharsets.UTF_8)))
            .add(new RecordHeader("dlq.timestamp",
                String.valueOf(System.currentTimeMillis()).getBytes(StandardCharsets.UTF_8)));

        try {
            producer.send(dlqRecord).get();  // Sync send to ensure delivery
            System.out.println("Sent to DLQ: " + dlqRecord);
        } catch (Exception e) {
            System.err.println("Failed to send to DLQ: " + e.getMessage());
            // Log to file as last resort
        }
    }

    interface MessageProcessor {
        void process(ConsumerRecord<String, String> record) throws Exception;
    }
}
```

### Python DLQ Implementation

```python
from confluent_kafka import Consumer, Producer, TopicPartition
from typing import Callable, Dict, Any
import json
import traceback
import time

class DLQConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str,
                 source_topic: str, max_retries: int = 3):
        self.consumer_config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
        }
        self.consumer = Consumer(self.consumer_config)
        self.consumer.subscribe([source_topic])

        self.producer_config = {
            'bootstrap.servers': bootstrap_servers,
            'acks': 'all',
        }
        self.producer = Producer(self.producer_config)

        self.dlq_topic = f"{source_topic}-dlq"
        self.max_retries = max_retries

    def consume(self, processor: Callable[[Any], None]):
        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Consumer error: {msg.error()}")
                    continue

                try:
                    processor(msg)
                except Exception as e:
                    self._handle_failed_message(msg, e)

                # Commit after processing (success or DLQ)
                self.consumer.commit(msg)

        finally:
            self.consumer.close()
            self.producer.flush()

    def _handle_failed_message(self, msg, exception: Exception):
        print(f"Failed to process message: {exception}")

        headers = [
            ('dlq.original.topic', msg.topic().encode()),
            ('dlq.original.partition', str(msg.partition()).encode()),
            ('dlq.original.offset', str(msg.offset()).encode()),
            ('dlq.error.message', str(exception).encode()),
            ('dlq.error.class', type(exception).__name__.encode()),
            ('dlq.timestamp', str(int(time.time() * 1000)).encode()),
            ('dlq.stacktrace', traceback.format_exc().encode()),
        ]

        # Preserve original headers
        if msg.headers():
            for key, value in msg.headers():
                headers.append((f'dlq.original.header.{key}', value))

        self.producer.produce(
            self.dlq_topic,
            key=msg.key(),
            value=msg.value(),
            headers=headers,
            callback=self._delivery_callback
        )
        self.producer.flush()

    def _delivery_callback(self, err, msg):
        if err:
            print(f"Failed to send to DLQ: {err}")
        else:
            print(f"Sent to DLQ: {msg.topic()}[{msg.partition()}] @ {msg.offset()}")


def main():
    consumer = DLQConsumer(
        'localhost:9092',
        'my-consumer-group',
        'orders'
    )

    def process_order(msg):
        order = json.loads(msg.value().decode())
        if 'order_id' not in order:
            raise ValueError("Missing order_id")
        print(f"Processing order: {order['order_id']}")

    consumer.consume(process_order)


if __name__ == '__main__':
    main()
```

## Retry with Exponential Backoff

### Java Retry Implementation

```java
public class RetryConsumer {
    private final Consumer<String, String> consumer;
    private final Producer<String, String> producer;
    private final String retryTopic;
    private final String dlqTopic;
    private final int maxRetries;

    public void consume(MessageProcessor processor) {
        while (true) {
            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofMillis(1000));

            for (ConsumerRecord<String, String> record : records) {
                int retryCount = getRetryCount(record);

                try {
                    processor.process(record);
                } catch (RetriableException e) {
                    if (retryCount < maxRetries) {
                        scheduleRetry(record, retryCount + 1, e);
                    } else {
                        sendToDLQ(record, e);
                    }
                } catch (Exception e) {
                    // Non-retriable, send directly to DLQ
                    sendToDLQ(record, e);
                }
            }

            consumer.commitSync();
        }
    }

    private int getRetryCount(ConsumerRecord<String, String> record) {
        var header = record.headers().lastHeader("retry.count");
        if (header == null) return 0;
        return Integer.parseInt(new String(header.value(), StandardCharsets.UTF_8));
    }

    private void scheduleRetry(ConsumerRecord<String, String> record,
                               int retryCount, Exception exception) {
        // Calculate backoff delay
        long delay = calculateBackoff(retryCount);

        ProducerRecord<String, String> retryRecord = new ProducerRecord<>(
            retryTopic,
            null,
            System.currentTimeMillis() + delay,  // Scheduled timestamp
            record.key(),
            record.value()
        );

        retryRecord.headers()
            .add("retry.count", String.valueOf(retryCount).getBytes())
            .add("retry.original.topic", record.topic().getBytes())
            .add("retry.error", exception.getMessage().getBytes())
            .add("retry.scheduled.time",
                String.valueOf(System.currentTimeMillis() + delay).getBytes());

        producer.send(retryRecord);
        System.out.printf("Scheduled retry %d for message (delay: %dms)%n",
            retryCount, delay);
    }

    private long calculateBackoff(int retryCount) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
        return (long) Math.pow(2, retryCount - 1) * 1000;
    }

    private void sendToDLQ(ConsumerRecord<String, String> record, Exception e) {
        // Similar to previous DLQ implementation
    }

    // Custom exception for retriable errors
    public static class RetriableException extends Exception {
        public RetriableException(String message) {
            super(message);
        }
    }
}
```

### Retry Topic Consumer

```java
public class RetryTopicConsumer {
    private final Consumer<String, String> consumer;
    private final Producer<String, String> producer;

    public void consumeRetryTopic(String retryTopic, String originalTopic) {
        consumer.subscribe(Collections.singletonList(retryTopic));

        while (true) {
            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofMillis(1000));

            for (ConsumerRecord<String, String> record : records) {
                // Check if ready for retry
                long scheduledTime = getScheduledTime(record);

                if (System.currentTimeMillis() >= scheduledTime) {
                    // Forward back to original topic
                    ProducerRecord<String, String> forwardRecord =
                        new ProducerRecord<>(originalTopic, record.key(), record.value());

                    // Copy retry headers
                    record.headers().forEach(h -> forwardRecord.headers().add(h));

                    producer.send(forwardRecord);
                } else {
                    // Not ready yet, pause and reprocess later
                    // In production, use a delay queue or scheduled task
                    Thread.sleep(scheduledTime - System.currentTimeMillis());
                }
            }

            consumer.commitSync();
        }
    }

    private long getScheduledTime(ConsumerRecord<String, String> record) {
        var header = record.headers().lastHeader("retry.scheduled.time");
        if (header == null) return 0;
        return Long.parseLong(new String(header.value(), StandardCharsets.UTF_8));
    }
}
```

## Circuit Breaker Pattern

Prevent cascading failures by temporarily stopping processing when error rates are high.

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class CircuitBreakerConsumer {
    private final Consumer<String, String> consumer;
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicLong lastFailureTime = new AtomicLong(0);
    private final AtomicLong circuitOpenTime = new AtomicLong(0);

    private final int failureThreshold = 5;
    private final long resetTimeoutMs = 60000;  // 1 minute
    private final long halfOpenTimeoutMs = 30000;  // 30 seconds

    enum CircuitState { CLOSED, OPEN, HALF_OPEN }

    public void consume(MessageProcessor processor) {
        while (true) {
            CircuitState state = getCircuitState();

            if (state == CircuitState.OPEN) {
                System.out.println("Circuit OPEN, waiting...");
                sleep(5000);
                continue;
            }

            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofMillis(1000));

            if (state == CircuitState.HALF_OPEN && !records.isEmpty()) {
                // Test with single message
                ConsumerRecord<String, String> testRecord =
                    records.iterator().next();
                try {
                    processor.process(testRecord);
                    closeCircuit();
                } catch (Exception e) {
                    openCircuit();
                    handleFailedMessage(testRecord, e);
                }
                consumer.commitSync();
                continue;
            }

            for (ConsumerRecord<String, String> record : records) {
                try {
                    processor.process(record);
                    recordSuccess();
                } catch (Exception e) {
                    recordFailure();
                    handleFailedMessage(record, e);

                    if (failureCount.get() >= failureThreshold) {
                        openCircuit();
                        break;  // Stop processing current batch
                    }
                }
            }

            consumer.commitSync();
        }
    }

    private CircuitState getCircuitState() {
        long openTime = circuitOpenTime.get();

        if (openTime == 0) {
            return CircuitState.CLOSED;
        }

        long elapsed = System.currentTimeMillis() - openTime;

        if (elapsed < halfOpenTimeoutMs) {
            return CircuitState.OPEN;
        } else if (elapsed < resetTimeoutMs) {
            return CircuitState.HALF_OPEN;
        } else {
            return CircuitState.CLOSED;
        }
    }

    private void openCircuit() {
        circuitOpenTime.set(System.currentTimeMillis());
        System.out.println("Circuit OPENED at " + circuitOpenTime.get());
    }

    private void closeCircuit() {
        circuitOpenTime.set(0);
        failureCount.set(0);
        System.out.println("Circuit CLOSED");
    }

    private void recordSuccess() {
        // Decay failure count on success
        failureCount.updateAndGet(c -> Math.max(0, c - 1));
    }

    private void recordFailure() {
        failureCount.incrementAndGet();
        lastFailureTime.set(System.currentTimeMillis());
    }

    private void handleFailedMessage(ConsumerRecord<String, String> record,
                                     Exception e) {
        // Send to DLQ
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) {}
    }
}
```

## Deserialization Error Handling

Handle messages that fail during deserialization before they even reach your processor.

```java
import org.apache.kafka.common.serialization.Deserializer;
import org.apache.kafka.common.errors.SerializationException;

public class SafeDeserializer<T> implements Deserializer<T> {
    private final Deserializer<T> delegate;
    private final T fallbackValue;

    public SafeDeserializer(Deserializer<T> delegate, T fallbackValue) {
        this.delegate = delegate;
        this.fallbackValue = fallbackValue;
    }

    @Override
    public T deserialize(String topic, byte[] data) {
        try {
            return delegate.deserialize(topic, data);
        } catch (SerializationException e) {
            System.err.printf("Deserialization failed for topic %s: %s%n",
                topic, e.getMessage());
            return fallbackValue;
        }
    }

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        delegate.configure(configs, isKey);
    }

    @Override
    public void close() {
        delegate.close();
    }
}

// Usage
public class DeserializationErrorHandler {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "safe-consumer");

        // Use wrapper deserializer
        Deserializer<String> safeDeserializer = new SafeDeserializer<>(
            new StringDeserializer(),
            null  // Return null for bad messages
        );

        Consumer<String, String> consumer = new KafkaConsumer<>(
            props,
            new StringDeserializer(),
            safeDeserializer
        );

        // In consume loop, check for null values
        for (ConsumerRecord<String, String> record : records) {
            if (record.value() == null) {
                // Handle deserialization failure
                handleDeserializationError(record);
                continue;
            }
            // Normal processing
        }
    }
}
```

## DLQ Reprocessing

Process messages from the DLQ after fixing the underlying issue.

```java
public class DLQReprocessor {
    private final Consumer<String, String> dlqConsumer;
    private final Producer<String, String> producer;

    public void reprocess(String dlqTopic, MessageFilter filter,
                          MessageTransformer transformer) {
        dlqConsumer.subscribe(Collections.singletonList(dlqTopic));

        while (true) {
            ConsumerRecords<String, String> records =
                dlqConsumer.poll(Duration.ofSeconds(5));

            if (records.isEmpty()) {
                System.out.println("DLQ empty, reprocessing complete");
                break;
            }

            for (ConsumerRecord<String, String> record : records) {
                // Get original topic from headers
                String originalTopic = getOriginalTopic(record);

                // Check if message should be reprocessed
                if (!filter.shouldReprocess(record)) {
                    System.out.println("Skipping message: " + record.offset());
                    continue;
                }

                // Transform if needed
                String transformedValue = transformer.transform(record.value());

                // Send back to original topic
                ProducerRecord<String, String> replayRecord =
                    new ProducerRecord<>(originalTopic, record.key(), transformedValue);

                // Add header to indicate reprocessed
                replayRecord.headers().add("reprocessed.from.dlq", "true".getBytes());
                replayRecord.headers().add("reprocessed.timestamp",
                    String.valueOf(System.currentTimeMillis()).getBytes());

                producer.send(replayRecord);
            }

            dlqConsumer.commitSync();
        }
    }

    private String getOriginalTopic(ConsumerRecord<String, String> record) {
        var header = record.headers().lastHeader("dlq.original.topic");
        return new String(header.value(), StandardCharsets.UTF_8);
    }

    interface MessageFilter {
        boolean shouldReprocess(ConsumerRecord<String, String> record);
    }

    interface MessageTransformer {
        String transform(String value);
    }
}
```

## Best Practices

### 1. Always Use a DLQ

```java
// Every consumer should have a DLQ
String dlqTopic = sourceTopic + "-dlq";
```

### 2. Include Rich Metadata

```java
// Headers should contain enough info to debug
headers.add("error.message", exception.getMessage());
headers.add("error.stacktrace", getStackTrace(exception));
headers.add("original.topic", record.topic());
headers.add("original.partition", record.partition());
headers.add("original.offset", record.offset());
headers.add("original.timestamp", record.timestamp());
headers.add("processing.host", hostname);
```

### 3. Monitor DLQ Size

```java
// Alert when DLQ grows
if (dlqMessageCount > threshold) {
    alert("DLQ size exceeded threshold: " + dlqMessageCount);
}
```

### 4. Distinguish Retriable vs Non-Retriable

```java
try {
    process(record);
} catch (TransientException e) {
    // Retry
} catch (ValidationException e) {
    // DLQ immediately
}
```

## Conclusion

Handling poison messages is essential for building resilient Kafka consumers:

1. **Implement DLQ** for all consumers
2. **Use retries with backoff** for transient failures
3. **Add circuit breakers** to prevent cascading failures
4. **Handle deserialization errors** gracefully
5. **Plan for DLQ reprocessing** after fixes

These patterns ensure your consumer pipelines continue processing even when individual messages fail, while preserving failed messages for analysis and reprocessing.
