# How to Create Kafka Interceptors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kafka, Java, Messaging, Observability

Description: Implement Kafka producer and consumer interceptors for message tracing, metrics collection, header injection, and cross-cutting concerns.

---

Kafka interceptors provide a mechanism to inspect and modify records as they flow through producers and consumers. They sit in the processing pipeline and execute custom logic without changing your core application code. This makes them ideal for cross-cutting concerns like tracing, metrics, encryption, and audit logging.

In this guide, you will learn how to implement both producer and consumer interceptors, chain multiple interceptors together, and apply them to real-world use cases.

## Understanding Kafka Interceptors

Interceptors operate at two points in the Kafka message lifecycle:

1. **Producer interceptors** execute before a record is serialized and sent to a broker
2. **Consumer interceptors** execute after a record is fetched from a broker but before it reaches your application

| Interceptor Type | Interface | Execution Point | Common Use Cases |
|------------------|-----------|-----------------|------------------|
| Producer | `ProducerInterceptor<K, V>` | Before send | Add headers, tracing, metrics |
| Consumer | `ConsumerInterceptor<K, V>` | After poll | Validate, decrypt, track consumption |

## The ProducerInterceptor Interface

The `ProducerInterceptor` interface defines three methods you must implement.

```java
package org.apache.kafka.clients.producer;

import org.apache.kafka.common.Configurable;

public interface ProducerInterceptor<K, V> extends Configurable {

    // Called before the record is serialized and sent
    ProducerRecord<K, V> onSend(ProducerRecord<K, V> record);

    // Called when the send has been acknowledged (success or failure)
    void onAcknowledgement(RecordMetadata metadata, Exception exception);

    // Called when the interceptor is closed
    void close();
}
```

### Method Lifecycle

| Method | When Called | Thread Safety | Can Modify Record |
|--------|-------------|---------------|-------------------|
| `configure()` | Once during producer initialization | Single thread | N/A |
| `onSend()` | Before each record is sent | Producer thread | Yes |
| `onAcknowledgement()` | After broker acknowledges | I/O thread | No |
| `close()` | When producer is closed | Single thread | N/A |

## Building a Producer Interceptor

Let us start with a practical example that adds tracing headers to every outgoing message.

### Tracing Header Interceptor

This interceptor injects a unique trace ID and timestamp into each record's headers.

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.producer.ProducerInterceptor;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.header.Headers;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

public class TracingProducerInterceptor<K, V> implements ProducerInterceptor<K, V> {

    private String applicationName;

    @Override
    public void configure(Map<String, ?> configs) {
        // Extract custom configuration passed to the interceptor
        this.applicationName = (String) configs.getOrDefault(
            "interceptor.tracing.application.name",
            "unknown-app"
        );
    }

    @Override
    public ProducerRecord<K, V> onSend(ProducerRecord<K, V> record) {
        // Generate a unique trace ID for this message
        String traceId = UUID.randomUUID().toString();
        long timestamp = System.currentTimeMillis();

        // Access the record's headers
        Headers headers = record.headers();

        // Add tracing headers
        headers.add("x-trace-id", traceId.getBytes(StandardCharsets.UTF_8));
        headers.add("x-timestamp", String.valueOf(timestamp).getBytes(StandardCharsets.UTF_8));
        headers.add("x-source-app", applicationName.getBytes(StandardCharsets.UTF_8));

        // Return the modified record
        // The original record is mutable, so we return the same instance
        return record;
    }

    @Override
    public void onAcknowledgement(RecordMetadata metadata, Exception exception) {
        // This runs in the I/O thread, keep it fast and non-blocking
        if (exception != null) {
            System.err.println("Failed to send record: " + exception.getMessage());
        }
    }

    @Override
    public void close() {
        // Clean up any resources
        // This interceptor has no resources to release
    }
}
```

### Metrics Collection Interceptor

This interceptor tracks message throughput and latency metrics.

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.producer.ProducerInterceptor;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class MetricsProducerInterceptor<K, V> implements ProducerInterceptor<K, V> {

    // Thread-safe counters for metrics
    private final AtomicLong messagesSent = new AtomicLong(0);
    private final AtomicLong messagesAcked = new AtomicLong(0);
    private final AtomicLong messagesFailed = new AtomicLong(0);

    // Track send timestamps for latency calculation
    private final ConcurrentHashMap<String, Long> sendTimestamps = new ConcurrentHashMap<>();

    @Override
    public void configure(Map<String, ?> configs) {
        // Initialize metrics reporter if needed
    }

    @Override
    public ProducerRecord<K, V> onSend(ProducerRecord<K, V> record) {
        // Increment send counter
        long count = messagesSent.incrementAndGet();

        // Store timestamp for latency tracking
        // Use topic-partition-offset as a unique key (offset not available yet)
        // We use a hash of the record as a simple correlation key
        String correlationKey = String.valueOf(System.nanoTime());
        sendTimestamps.put(correlationKey, System.currentTimeMillis());

        // Add correlation key as header for later matching
        record.headers().add(
            "x-metrics-correlation",
            correlationKey.getBytes()
        );

        // Log every 1000 messages
        if (count % 1000 == 0) {
            System.out.println("Metrics: sent=" + count +
                ", acked=" + messagesAcked.get() +
                ", failed=" + messagesFailed.get());
        }

        return record;
    }

    @Override
    public void onAcknowledgement(RecordMetadata metadata, Exception exception) {
        if (exception == null) {
            messagesAcked.incrementAndGet();
        } else {
            messagesFailed.incrementAndGet();
        }
    }

    @Override
    public void close() {
        // Final metrics report
        System.out.println("Final Metrics: sent=" + messagesSent.get() +
            ", acked=" + messagesAcked.get() +
            ", failed=" + messagesFailed.get());
    }
}
```

## The ConsumerInterceptor Interface

The consumer interceptor interface follows a similar pattern but operates on consumed records.

```java
package org.apache.kafka.clients.consumer;

import org.apache.kafka.common.Configurable;

public interface ConsumerInterceptor<K, V> extends Configurable {

    // Called after records are fetched but before they are returned to the application
    ConsumerRecords<K, V> onConsume(ConsumerRecords<K, V> records);

    // Called when offsets are committed
    void onCommit(Map<TopicPartition, OffsetAndMetadata> offsets);

    // Called when the interceptor is closed
    void close();
}
```

### Consumer Interceptor Methods

| Method | When Called | Purpose |
|--------|-------------|---------|
| `configure()` | Once during consumer initialization | Load configuration |
| `onConsume()` | After poll() fetches records | Inspect or filter records |
| `onCommit()` | After offsets are committed | Track commit progress |
| `close()` | When consumer is closed | Release resources |

## Building a Consumer Interceptor

### Trace Extraction Interceptor

This interceptor extracts tracing headers and makes them available for downstream processing.

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.consumer.ConsumerInterceptor;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.Header;

import java.nio.charset.StandardCharsets;
import java.util.Map;

public class TracingConsumerInterceptor<K, V> implements ConsumerInterceptor<K, V> {

    // Thread-local storage for trace context
    // This allows your application code to access the trace ID
    private static final ThreadLocal<String> CURRENT_TRACE_ID = new ThreadLocal<>();

    public static String getCurrentTraceId() {
        return CURRENT_TRACE_ID.get();
    }

    @Override
    public void configure(Map<String, ?> configs) {
        // Configuration initialization
    }

    @Override
    public ConsumerRecords<K, V> onConsume(ConsumerRecords<K, V> records) {
        // Process each record to extract trace information
        for (ConsumerRecord<K, V> record : records) {
            Header traceHeader = record.headers().lastHeader("x-trace-id");

            if (traceHeader != null) {
                String traceId = new String(traceHeader.value(), StandardCharsets.UTF_8);

                // Store in thread-local for access by application code
                CURRENT_TRACE_ID.set(traceId);

                // Log for debugging
                System.out.println("Processing message with trace-id: " + traceId +
                    " from topic: " + record.topic() +
                    " partition: " + record.partition() +
                    " offset: " + record.offset());
            }
        }

        // Return records unchanged
        // Consumer interceptors typically should not filter records
        return records;
    }

    @Override
    public void onCommit(Map<TopicPartition, OffsetAndMetadata> offsets) {
        // Log committed offsets for debugging
        offsets.forEach((partition, offsetMeta) -> {
            System.out.println("Committed offset " + offsetMeta.offset() +
                " for " + partition.topic() + "-" + partition.partition());
        });
    }

    @Override
    public void close() {
        // Clean up thread-local
        CURRENT_TRACE_ID.remove();
    }
}
```

### Message Validation Interceptor

This interceptor validates incoming messages and logs invalid records.

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.consumer.ConsumerInterceptor;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ValidationConsumerInterceptor<K, V> implements ConsumerInterceptor<K, V> {

    private long validRecords = 0;
    private long invalidRecords = 0;

    @Override
    public void configure(Map<String, ?> configs) {
        // Load validation rules from configuration
    }

    @Override
    public ConsumerRecords<K, V> onConsume(ConsumerRecords<K, V> records) {
        // Build a map of valid records by partition
        Map<TopicPartition, List<ConsumerRecord<K, V>>> validRecordsMap = new HashMap<>();

        for (TopicPartition partition : records.partitions()) {
            List<ConsumerRecord<K, V>> partitionRecords = records.records(partition);
            List<ConsumerRecord<K, V>> validList = new ArrayList<>();

            for (ConsumerRecord<K, V> record : partitionRecords) {
                if (isValid(record)) {
                    validList.add(record);
                    validRecords++;
                } else {
                    invalidRecords++;
                    logInvalidRecord(record);
                }
            }

            if (!validList.isEmpty()) {
                validRecordsMap.put(partition, validList);
            }
        }

        // Return only valid records
        return new ConsumerRecords<>(validRecordsMap);
    }

    private boolean isValid(ConsumerRecord<K, V> record) {
        // Implement your validation logic here
        // Example: check that value is not null and key exists
        if (record.value() == null) {
            return false;
        }

        // Check for required headers
        if (record.headers().lastHeader("x-message-type") == null) {
            return false;
        }

        return true;
    }

    private void logInvalidRecord(ConsumerRecord<K, V> record) {
        System.err.println("Invalid record detected: " +
            "topic=" + record.topic() +
            ", partition=" + record.partition() +
            ", offset=" + record.offset() +
            ", key=" + record.key());
    }

    @Override
    public void onCommit(Map<TopicPartition, OffsetAndMetadata> offsets) {
        // Track commit events
    }

    @Override
    public void close() {
        System.out.println("Validation stats: valid=" + validRecords +
            ", invalid=" + invalidRecords);
    }
}
```

## Configuring Interceptors

Interceptors are configured through producer or consumer properties.

### Producer Configuration

```java
package com.example.kafka;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class ProducerWithInterceptors {

    public static KafkaProducer<String, String> createProducer() {
        Properties props = new Properties();

        // Standard producer configuration
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // Configure interceptors - comma-separated list of fully qualified class names
        props.put(
            ProducerConfig.INTERCEPTOR_CLASSES_CONFIG,
            "com.example.kafka.interceptors.TracingProducerInterceptor," +
            "com.example.kafka.interceptors.MetricsProducerInterceptor"
        );

        // Custom interceptor configuration
        props.put("interceptor.tracing.application.name", "order-service");

        return new KafkaProducer<>(props);
    }
}
```

### Consumer Configuration

```java
package com.example.kafka;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.util.Properties;

public class ConsumerWithInterceptors {

    public static KafkaConsumer<String, String> createConsumer() {
        Properties props = new Properties();

        // Standard consumer configuration
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "my-consumer-group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        // Configure interceptors
        props.put(
            ConsumerConfig.INTERCEPTOR_CLASSES_CONFIG,
            "com.example.kafka.interceptors.TracingConsumerInterceptor," +
            "com.example.kafka.interceptors.ValidationConsumerInterceptor"
        );

        return new KafkaConsumer<>(props);
    }
}
```

## Chaining Multiple Interceptors

When you configure multiple interceptors, they execute in order. Understanding the execution sequence helps you design interceptor chains correctly.

### Producer Interceptor Chain

```
Record Created
     |
     v
+--------------------+
| Interceptor 1      |  <- First in list, executes first
| onSend()           |
+--------------------+
     |
     v
+--------------------+
| Interceptor 2      |  <- Second in list
| onSend()           |
+--------------------+
     |
     v
Serialization & Send
     |
     v
+--------------------+
| Interceptor 2      |  <- Acknowledgements in reverse order
| onAcknowledgement()|
+--------------------+
     |
     v
+--------------------+
| Interceptor 1      |
| onAcknowledgement()|
+--------------------+
```

### Interceptor Ordering Example

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.producer.ProducerInterceptor;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;

import java.util.Map;

public class OrderedInterceptorDemo {

    // First interceptor - adds base headers
    public static class FirstInterceptor<K, V> implements ProducerInterceptor<K, V> {

        @Override
        public void configure(Map<String, ?> configs) {}

        @Override
        public ProducerRecord<K, V> onSend(ProducerRecord<K, V> record) {
            System.out.println("First interceptor: adding base header");
            record.headers().add("x-interceptor-order", "1".getBytes());
            return record;
        }

        @Override
        public void onAcknowledgement(RecordMetadata metadata, Exception exception) {
            System.out.println("First interceptor: acknowledgement received");
        }

        @Override
        public void close() {}
    }

    // Second interceptor - can see headers from first interceptor
    public static class SecondInterceptor<K, V> implements ProducerInterceptor<K, V> {

        @Override
        public void configure(Map<String, ?> configs) {}

        @Override
        public ProducerRecord<K, V> onSend(ProducerRecord<K, V> record) {
            // Verify first interceptor ran
            if (record.headers().lastHeader("x-interceptor-order") != null) {
                System.out.println("Second interceptor: first interceptor header found");
            }
            record.headers().add("x-interceptor-order", "2".getBytes());
            return record;
        }

        @Override
        public void onAcknowledgement(RecordMetadata metadata, Exception exception) {
            System.out.println("Second interceptor: acknowledgement received");
        }

        @Override
        public void close() {}
    }
}
```

## Advanced Use Cases

### Message Encryption Interceptor

This example demonstrates encrypting message values before sending.

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.producer.ProducerInterceptor;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.Map;

public class EncryptionProducerInterceptor implements ProducerInterceptor<String, String> {

    private SecretKeySpec secretKey;
    private static final String ALGORITHM = "AES";

    @Override
    public void configure(Map<String, ?> configs) {
        // Load encryption key from configuration
        String keyString = (String) configs.get("interceptor.encryption.key");
        if (keyString == null) {
            throw new IllegalArgumentException("Encryption key not provided");
        }

        // Create secret key (in production, use proper key management)
        byte[] keyBytes = keyString.getBytes();
        byte[] keyPadded = new byte[16];
        System.arraycopy(keyBytes, 0, keyPadded, 0, Math.min(keyBytes.length, 16));
        this.secretKey = new SecretKeySpec(keyPadded, ALGORITHM);
    }

    @Override
    public ProducerRecord<String, String> onSend(ProducerRecord<String, String> record) {
        try {
            // Encrypt the message value
            String encryptedValue = encrypt(record.value());

            // Mark the message as encrypted via header
            record.headers().add("x-encrypted", "true".getBytes());

            // Create a new record with encrypted value
            return new ProducerRecord<>(
                record.topic(),
                record.partition(),
                record.timestamp(),
                record.key(),
                encryptedValue,
                record.headers()
            );
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    private String encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey);
        byte[] encryptedBytes = cipher.doFinal(value.getBytes());
        return Base64.getEncoder().encodeToString(encryptedBytes);
    }

    @Override
    public void onAcknowledgement(RecordMetadata metadata, Exception exception) {
        // No action needed
    }

    @Override
    public void close() {
        // Clear sensitive data
        this.secretKey = null;
    }
}
```

### Corresponding Decryption Consumer Interceptor

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.consumer.ConsumerInterceptor;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.header.Header;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DecryptionConsumerInterceptor implements ConsumerInterceptor<String, String> {

    private SecretKeySpec secretKey;
    private static final String ALGORITHM = "AES";

    @Override
    public void configure(Map<String, ?> configs) {
        String keyString = (String) configs.get("interceptor.encryption.key");
        if (keyString == null) {
            throw new IllegalArgumentException("Encryption key not provided");
        }

        byte[] keyBytes = keyString.getBytes();
        byte[] keyPadded = new byte[16];
        System.arraycopy(keyBytes, 0, keyPadded, 0, Math.min(keyBytes.length, 16));
        this.secretKey = new SecretKeySpec(keyPadded, ALGORITHM);
    }

    @Override
    public ConsumerRecords<String, String> onConsume(ConsumerRecords<String, String> records) {
        Map<TopicPartition, List<ConsumerRecord<String, String>>> decryptedRecords = new HashMap<>();

        for (TopicPartition partition : records.partitions()) {
            List<ConsumerRecord<String, String>> partitionRecords = records.records(partition);
            List<ConsumerRecord<String, String>> decryptedList = new ArrayList<>();

            for (ConsumerRecord<String, String> record : partitionRecords) {
                Header encryptedHeader = record.headers().lastHeader("x-encrypted");

                if (encryptedHeader != null &&
                    "true".equals(new String(encryptedHeader.value(), StandardCharsets.UTF_8))) {

                    try {
                        String decryptedValue = decrypt(record.value());

                        // Create new record with decrypted value
                        ConsumerRecord<String, String> decryptedRecord = new ConsumerRecord<>(
                            record.topic(),
                            record.partition(),
                            record.offset(),
                            record.timestamp(),
                            record.timestampType(),
                            record.serializedKeySize(),
                            record.serializedValueSize(),
                            record.key(),
                            decryptedValue,
                            record.headers(),
                            record.leaderEpoch()
                        );
                        decryptedList.add(decryptedRecord);
                    } catch (Exception e) {
                        System.err.println("Decryption failed for record at offset: " + record.offset());
                        decryptedList.add(record);
                    }
                } else {
                    decryptedList.add(record);
                }
            }

            decryptedRecords.put(partition, decryptedList);
        }

        return new ConsumerRecords<>(decryptedRecords);
    }

    private String decrypt(String encryptedValue) throws Exception {
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, secretKey);
        byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedValue));
        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }

    @Override
    public void onCommit(Map<TopicPartition, OffsetAndMetadata> offsets) {
        // No action needed
    }

    @Override
    public void close() {
        this.secretKey = null;
    }
}
```

## Error Handling Best Practices

Interceptors should handle errors gracefully to avoid disrupting message flow.

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.producer.ProducerInterceptor;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;

import java.util.Map;

public class ResilientInterceptor<K, V> implements ProducerInterceptor<K, V> {

    private boolean failOpen = true;

    @Override
    public void configure(Map<String, ?> configs) {
        // Configure fail-open or fail-closed behavior
        Object failOpenConfig = configs.get("interceptor.fail.open");
        if (failOpenConfig != null) {
            this.failOpen = Boolean.parseBoolean(failOpenConfig.toString());
        }
    }

    @Override
    public ProducerRecord<K, V> onSend(ProducerRecord<K, V> record) {
        try {
            // Your interceptor logic here
            return doIntercept(record);
        } catch (Exception e) {
            if (failOpen) {
                // Log error and return original record
                System.err.println("Interceptor error (fail-open): " + e.getMessage());
                return record;
            } else {
                // Propagate exception to stop the send
                throw new RuntimeException("Interceptor failed", e);
            }
        }
    }

    private ProducerRecord<K, V> doIntercept(ProducerRecord<K, V> record) {
        // Actual interceptor logic
        return record;
    }

    @Override
    public void onAcknowledgement(RecordMetadata metadata, Exception exception) {
        try {
            // Acknowledgement handling
        } catch (Exception e) {
            // Always catch exceptions in onAcknowledgement
            // This runs in the I/O thread and must not throw
            System.err.println("Error in onAcknowledgement: " + e.getMessage());
        }
    }

    @Override
    public void close() {
        // Cleanup
    }
}
```

## Testing Interceptors

Unit testing interceptors requires mocking the Kafka record types.

```java
package com.example.kafka.interceptors;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.header.Header;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TracingProducerInterceptorTest {

    private TracingProducerInterceptor<String, String> interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new TracingProducerInterceptor<>();

        Map<String, Object> configs = new HashMap<>();
        configs.put("interceptor.tracing.application.name", "test-app");
        interceptor.configure(configs);
    }

    @Test
    void shouldAddTraceIdHeader() {
        // Given
        ProducerRecord<String, String> record = new ProducerRecord<>(
            "test-topic",
            "key",
            "value"
        );

        // When
        ProducerRecord<String, String> result = interceptor.onSend(record);

        // Then
        Header traceIdHeader = result.headers().lastHeader("x-trace-id");
        assertNotNull(traceIdHeader, "Trace ID header should be present");

        String traceId = new String(traceIdHeader.value(), StandardCharsets.UTF_8);
        assertFalse(traceId.isEmpty(), "Trace ID should not be empty");
    }

    @Test
    void shouldAddSourceAppHeader() {
        // Given
        ProducerRecord<String, String> record = new ProducerRecord<>(
            "test-topic",
            "key",
            "value"
        );

        // When
        ProducerRecord<String, String> result = interceptor.onSend(record);

        // Then
        Header sourceAppHeader = result.headers().lastHeader("x-source-app");
        assertNotNull(sourceAppHeader);

        String sourceApp = new String(sourceAppHeader.value(), StandardCharsets.UTF_8);
        assertEquals("test-app", sourceApp);
    }
}
```

## Performance Considerations

Interceptors run in the critical path of message processing. Keep these guidelines in mind:

| Consideration | Recommendation |
|---------------|----------------|
| Execution time | Keep `onSend()` and `onConsume()` fast (under 1ms) |
| Blocking operations | Never block in interceptors, use async patterns |
| Memory allocation | Minimize object creation to reduce GC pressure |
| Thread safety | Use thread-safe data structures for shared state |
| Exception handling | Always catch exceptions to prevent message loss |

### Avoiding Common Pitfalls

```java
// BAD: Making HTTP calls in onSend
@Override
public ProducerRecord<K, V> onSend(ProducerRecord<K, V> record) {
    // This blocks the producer thread
    httpClient.post(record.value()); // DO NOT DO THIS
    return record;
}

// GOOD: Queue work for async processing
@Override
public ProducerRecord<K, V> onSend(ProducerRecord<K, V> record) {
    // Queue for async processing
    asyncQueue.offer(record.value());
    return record;
}
```

## Summary

Kafka interceptors provide a clean way to implement cross-cutting concerns without modifying application code. Key takeaways:

1. Use `ProducerInterceptor` for adding headers, tracing, and metrics before messages are sent
2. Use `ConsumerInterceptor` for validating, decrypting, and tracking consumed messages
3. Chain multiple interceptors by listing them in order in the configuration
4. Handle errors gracefully to avoid disrupting message flow
5. Keep interceptor logic fast and non-blocking
6. Test interceptors thoroughly before deploying to production

Interceptors work well for observability, security, and compliance requirements. They integrate seamlessly with existing Kafka applications and require only configuration changes to enable.
