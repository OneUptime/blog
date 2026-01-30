# How to Implement Kafka Exactly-Once Transactions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kafka, Messaging, Transactions, Data Consistency

Description: Achieve exactly-once semantics in Kafka with idempotent producers, transactional messaging, and consumer offset management.

---

## Introduction

Apache Kafka traditionally provides at-least-once delivery guarantees. Messages might be delivered more than once due to producer retries, consumer failures, or network issues. For many applications, this is acceptable. However, financial transactions, inventory systems, and other critical workloads require stronger guarantees.

Kafka 0.11 introduced exactly-once semantics (EOS) through two mechanisms:

1. **Idempotent producers** - Prevent duplicate messages from retries
2. **Transactional messaging** - Atomic writes across multiple partitions with coordinated consumer offset commits

This guide walks through implementing both mechanisms with production-ready Java code.

## Understanding the Delivery Guarantees

Before diving into implementation, let's clarify what each guarantee means:

| Guarantee | Description | Duplicates | Data Loss |
|-----------|-------------|------------|-----------|
| At-most-once | Messages may be lost, never duplicated | No | Possible |
| At-least-once | Messages never lost, may be duplicated | Possible | No |
| Exactly-once | Messages delivered exactly one time | No | No |

## Part 1: Idempotent Producers

Idempotent producers solve the duplicate message problem that occurs during retries. When a producer sends a message and doesn't receive an acknowledgment (due to network issues or broker failure), it retries. Without idempotence, this retry creates a duplicate message.

### How Idempotent Producers Work

Kafka assigns each producer a unique Producer ID (PID) and tracks sequence numbers for each topic-partition. If a broker receives a message with a sequence number it has already seen, it discards the duplicate and returns success to the producer.

### Basic Idempotent Producer Configuration

The following configuration enables idempotency. Note that enabling idempotence automatically sets `acks=all`, `retries=Integer.MAX_VALUE`, and `max.in.flight.requests.per.connection=5`.

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class IdempotentProducerExample {

    public static KafkaProducer<String, String> createIdempotentProducer(String bootstrapServers) {
        Properties props = new Properties();

        // Cluster connection
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);

        // Serialization
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // Enable idempotence - this is the key setting
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // These are set automatically when idempotence is enabled,
        // but explicit configuration improves code readability
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

        return new KafkaProducer<>(props);
    }

    public static void main(String[] args) {
        String bootstrapServers = "localhost:9092";

        try (KafkaProducer<String, String> producer = createIdempotentProducer(bootstrapServers)) {
            for (int i = 0; i < 100; i++) {
                ProducerRecord<String, String> record = new ProducerRecord<>(
                    "orders",                    // topic
                    "order-" + i,               // key
                    "{\"orderId\": " + i + "}"  // value
                );

                producer.send(record, (metadata, exception) -> {
                    if (exception != null) {
                        System.err.println("Failed to send message: " + exception.getMessage());
                    } else {
                        System.out.printf("Sent to partition %d at offset %d%n",
                            metadata.partition(), metadata.offset());
                    }
                });
            }
        }
    }
}
```

### Limitations of Idempotent Producers

Idempotent producers only guarantee exactly-once within a single partition during a single producer session. They do not help with:

- Multi-partition atomic writes
- Coordinating producer writes with consumer offset commits
- Cross-session deduplication (after producer restart)

For these scenarios, you need transactional messaging.

## Part 2: Transactional Producers

Transactions extend exactly-once guarantees across multiple partitions and integrate with consumer offset management. A transaction groups multiple sends and offset commits into an atomic unit - either all succeed or all are rolled back.

### Transaction Lifecycle

1. Initialize the transactional producer (once per producer instance)
2. Begin a transaction
3. Send messages to one or more topics/partitions
4. Optionally commit consumer offsets as part of the transaction
5. Commit or abort the transaction

### Transactional Producer Configuration

Transactional producers require a `transactional.id` that uniquely identifies the producer across restarts. Kafka uses this ID to fence zombie producers and recover incomplete transactions.

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class TransactionalProducerConfig {

    public static KafkaProducer<String, String> createTransactionalProducer(
            String bootstrapServers,
            String transactionalId) {

        Properties props = new Properties();

        // Cluster connection
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);

        // Serialization
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // Transactional configuration
        // This ID must be unique per producer and stable across restarts
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, transactionalId);

        // Idempotence is automatically enabled with transactions
        // but explicit setting documents the dependency
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        // Transaction timeout - how long the coordinator waits before aborting
        // Default is 60 seconds, adjust based on your processing time
        props.put(ProducerConfig.TRANSACTION_TIMEOUT_CONFIG, 30000);

        return new KafkaProducer<>(props);
    }
}
```

### Basic Transaction Pattern

This example demonstrates the fundamental transaction pattern: initialize once, then wrap each batch of sends in begin/commit blocks.

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.errors.ProducerFencedException;
import org.apache.kafka.common.errors.OutOfOrderSequenceException;
import org.apache.kafka.common.errors.AuthorizationException;

public class BasicTransactionExample {

    public void runTransactionalProducer() {
        String bootstrapServers = "localhost:9092";
        String transactionalId = "payment-processor-1";

        KafkaProducer<String, String> producer =
            TransactionalProducerConfig.createTransactionalProducer(bootstrapServers, transactionalId);

        // Initialize transactions - call exactly once before any transactional operations
        // This registers the producer with the transaction coordinator and
        // aborts any pending transactions from previous instances with the same transactional.id
        producer.initTransactions();

        try {
            // Begin a new transaction
            producer.beginTransaction();

            // All sends within the transaction are buffered
            producer.send(new ProducerRecord<>("payments", "pay-001", "{\"amount\": 100.00}"));
            producer.send(new ProducerRecord<>("audit-log", "pay-001", "{\"action\": \"payment_created\"}"));
            producer.send(new ProducerRecord<>("notifications", "user-123", "{\"message\": \"Payment received\"}"));

            // Commit makes all messages visible atomically
            producer.commitTransaction();
            System.out.println("Transaction committed successfully");

        } catch (ProducerFencedException | OutOfOrderSequenceException | AuthorizationException e) {
            // Fatal errors - cannot recover, must close producer
            System.err.println("Fatal transaction error: " + e.getMessage());
            producer.close();
            throw e;

        } catch (Exception e) {
            // Abort on any other error
            System.err.println("Transaction failed, aborting: " + e.getMessage());
            producer.abortTransaction();
        }
    }
}
```

### Transaction Error Handling

Different exceptions require different handling strategies. The following table summarizes the correct response to each error type:

| Exception | Cause | Recovery Action |
|-----------|-------|-----------------|
| ProducerFencedException | Another producer with same transactional.id started | Close producer, restart with new instance |
| OutOfOrderSequenceException | Broker rejected message due to sequence gap | Close producer, restart |
| AuthorizationException | Missing permissions for transactional operations | Fix ACLs, restart |
| TimeoutException | Transaction coordinator not responding | Abort and retry |
| KafkaException | Various recoverable errors | Abort and retry |

### Robust Transaction Handler

This production-ready class implements proper error handling and retry logic for transactional operations.

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.errors.ProducerFencedException;
import org.apache.kafka.common.errors.OutOfOrderSequenceException;
import org.apache.kafka.common.errors.AuthorizationException;
import org.apache.kafka.common.KafkaException;

import java.util.List;
import java.util.function.Supplier;

public class RobustTransactionHandler {

    private final KafkaProducer<String, String> producer;
    private final int maxRetries;
    private final long retryBackoffMs;

    public RobustTransactionHandler(
            String bootstrapServers,
            String transactionalId,
            int maxRetries,
            long retryBackoffMs) {

        this.producer = TransactionalProducerConfig.createTransactionalProducer(
            bootstrapServers, transactionalId);
        this.maxRetries = maxRetries;
        this.retryBackoffMs = retryBackoffMs;

        // Initialize transactions once at startup
        this.producer.initTransactions();
    }

    /**
     * Execute a batch of sends within a transaction with automatic retry.
     *
     * @param recordSupplier Supplies the records to send, called on each retry
     * @return true if transaction committed, false if all retries exhausted
     */
    public boolean executeTransaction(Supplier<List<ProducerRecord<String, String>>> recordSupplier) {
        int attempts = 0;

        while (attempts < maxRetries) {
            attempts++;

            try {
                producer.beginTransaction();

                List<ProducerRecord<String, String>> records = recordSupplier.get();
                for (ProducerRecord<String, String> record : records) {
                    producer.send(record);
                }

                producer.commitTransaction();
                return true;

            } catch (ProducerFencedException | OutOfOrderSequenceException | AuthorizationException e) {
                // Fatal errors - no point retrying
                throw new RuntimeException("Fatal transaction error, cannot recover", e);

            } catch (KafkaException e) {
                // Recoverable error - abort and retry
                System.err.printf("Transaction attempt %d failed: %s%n", attempts, e.getMessage());

                try {
                    producer.abortTransaction();
                } catch (Exception abortException) {
                    System.err.println("Failed to abort transaction: " + abortException.getMessage());
                }

                if (attempts < maxRetries) {
                    sleep(retryBackoffMs * attempts);  // Exponential backoff
                }
            }
        }

        return false;
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public void close() {
        producer.close();
    }
}
```

## Part 3: Read-Committed Isolation

For transactions to provide end-to-end exactly-once semantics, consumers must be configured to only read committed messages. By default, consumers read all messages including those from incomplete transactions.

### Consumer Isolation Levels

| Isolation Level | Behavior |
|-----------------|----------|
| read_uncommitted | Reads all messages, including uncommitted (default) |
| read_committed | Only reads messages from committed transactions |

### Configuring a Read-Committed Consumer

```java
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class ReadCommittedConsumer {

    public static KafkaConsumer<String, String> createReadCommittedConsumer(
            String bootstrapServers,
            String groupId) {

        Properties props = new Properties();

        // Cluster connection
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);

        // Deserialization
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        // Read-committed isolation - only see committed transaction messages
        props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");

        // Disable auto-commit when using transactions
        // We will commit offsets as part of the producer transaction
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

        // Start from earliest if no committed offset exists
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        return new KafkaConsumer<>(props);
    }

    public void consumeMessages() {
        String bootstrapServers = "localhost:9092";
        String groupId = "payment-consumer-group";

        try (KafkaConsumer<String, String> consumer =
                createReadCommittedConsumer(bootstrapServers, groupId)) {

            consumer.subscribe(Collections.singletonList("payments"));

            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

                for (ConsumerRecord<String, String> record : records) {
                    System.out.printf("Received: key=%s, value=%s, partition=%d, offset=%d%n",
                        record.key(), record.value(), record.partition(), record.offset());

                    // Process the record
                    processPayment(record);
                }

                // Manual commit after processing
                consumer.commitSync();
            }
        }
    }

    private void processPayment(ConsumerRecord<String, String> record) {
        // Business logic here
    }
}
```

### Impact of Read-Committed on Latency

Read-committed consumers may experience slightly higher latency because they wait for transactions to complete. The consumer's position advances only up to the Last Stable Offset (LSO), which is the offset of the first message in an open transaction. Messages after the LSO are buffered until the transaction commits or aborts.

## Part 4: Consume-Transform-Produce Pattern

The most common use case for Kafka transactions is the consume-transform-produce pattern. This pattern reads messages from input topics, processes them, and writes results to output topics while committing consumer offsets atomically.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TRANSACTION BOUNDARY                      │
│                                                                  │
│  ┌──────────┐      ┌──────────────┐      ┌──────────────────┐  │
│  │  Input   │      │              │      │  Output Topic(s) │  │
│  │  Topic   │─────►│  Transform   │─────►│                  │  │
│  │          │      │              │      │  + Offset Commit │  │
│  └──────────┘      └──────────────┘      └──────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Complete Consume-Transform-Produce Implementation

This implementation demonstrates the full pattern with proper error handling, offset management, and transaction coordination.

```java
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerGroupMetadata;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.ProducerFencedException;
import org.apache.kafka.common.errors.OutOfOrderSequenceException;
import org.apache.kafka.common.errors.AuthorizationException;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;

import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

public class ConsumeTransformProduce {

    private final KafkaConsumer<String, String> consumer;
    private final KafkaProducer<String, String> producer;
    private final String inputTopic;
    private final String outputTopic;
    private volatile boolean running = true;

    public ConsumeTransformProduce(
            String bootstrapServers,
            String consumerGroupId,
            String transactionalId,
            String inputTopic,
            String outputTopic) {

        this.inputTopic = inputTopic;
        this.outputTopic = outputTopic;
        this.consumer = createConsumer(bootstrapServers, consumerGroupId);
        this.producer = createProducer(bootstrapServers, transactionalId);
    }

    private KafkaConsumer<String, String> createConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        // Critical: read_committed ensures we only process committed messages
        props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");

        // Disable auto-commit - we commit offsets within the transaction
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

        return new KafkaConsumer<>(props);
    }

    private KafkaProducer<String, String> createProducer(String bootstrapServers, String transactionalId) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, transactionalId);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        return new KafkaProducer<>(props);
    }

    public void start() {
        // Initialize producer transactions
        producer.initTransactions();

        // Subscribe to input topic
        consumer.subscribe(Collections.singletonList(inputTopic));

        System.out.println("Starting consume-transform-produce loop");

        while (running) {
            try {
                processRecordBatch();
            } catch (ProducerFencedException | OutOfOrderSequenceException | AuthorizationException e) {
                // Fatal errors - shutdown required
                System.err.println("Fatal error, shutting down: " + e.getMessage());
                running = false;
            }
        }

        shutdown();
    }

    private void processRecordBatch() {
        // Poll for records
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

        if (records.isEmpty()) {
            return;
        }

        try {
            // Begin transaction for this batch
            producer.beginTransaction();

            // Process each record and send to output topic
            for (ConsumerRecord<String, String> record : records) {
                String transformedValue = transform(record);

                ProducerRecord<String, String> outputRecord = new ProducerRecord<>(
                    outputTopic,
                    record.key(),
                    transformedValue
                );

                producer.send(outputRecord);
            }

            // Build offset map for all partitions in this batch
            Map<TopicPartition, OffsetAndMetadata> offsetsToCommit = new HashMap<>();
            for (TopicPartition partition : records.partitions()) {
                var partitionRecords = records.records(partition);
                long lastOffset = partitionRecords.get(partitionRecords.size() - 1).offset();

                // Commit offset is the next offset to read, hence +1
                offsetsToCommit.put(partition, new OffsetAndMetadata(lastOffset + 1));
            }

            // Commit offsets as part of the transaction
            // This is the key to exactly-once: output writes and offset commits are atomic
            producer.sendOffsetsToTransaction(offsetsToCommit, consumer.groupMetadata());

            // Commit the transaction - makes all sends and offset commits visible
            producer.commitTransaction();

            System.out.printf("Committed transaction with %d records%n", records.count());

        } catch (Exception e) {
            System.err.println("Error processing batch, aborting transaction: " + e.getMessage());
            producer.abortTransaction();

            // Seek back to last committed offsets to reprocess the batch
            resetToLastCommittedOffsets();
        }
    }

    private String transform(ConsumerRecord<String, String> record) {
        // Your transformation logic here
        // This example adds processing metadata
        return String.format("{\"original\": %s, \"processed_at\": %d}",
            record.value(), System.currentTimeMillis());
    }

    private void resetToLastCommittedOffsets() {
        // Get committed offsets for all assigned partitions
        for (TopicPartition partition : consumer.assignment()) {
            OffsetAndMetadata committed = consumer.committed(partition);
            if (committed != null) {
                consumer.seek(partition, committed.offset());
            } else {
                consumer.seekToBeginning(Collections.singleton(partition));
            }
        }
    }

    public void stop() {
        running = false;
    }

    private void shutdown() {
        System.out.println("Shutting down");
        consumer.close();
        producer.close();
    }

    public static void main(String[] args) {
        ConsumeTransformProduce processor = new ConsumeTransformProduce(
            "localhost:9092",
            "transform-group",
            "transform-producer-1",
            "raw-events",
            "processed-events"
        );

        // Add shutdown hook for graceful termination
        Runtime.getRuntime().addShutdownHook(new Thread(processor::stop));

        processor.start();
    }
}
```

## Part 5: Handling Consumer Group Rebalances

Consumer group rebalances require special handling in transactional applications. When a rebalance occurs mid-transaction, you must abort the current transaction and let the new partition owner process those messages.

### Rebalance-Aware Consumer Implementation

```java
import org.apache.kafka.clients.consumer.ConsumerRebalanceListener;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.common.TopicPartition;

import java.util.Collection;
import java.util.concurrent.atomic.AtomicBoolean;

public class RebalanceAwareProcessor implements ConsumerRebalanceListener {

    private final KafkaConsumer<String, String> consumer;
    private final KafkaProducer<String, String> producer;
    private final AtomicBoolean transactionInProgress;

    public RebalanceAwareProcessor(
            KafkaConsumer<String, String> consumer,
            KafkaProducer<String, String> producer) {
        this.consumer = consumer;
        this.producer = producer;
        this.transactionInProgress = new AtomicBoolean(false);
    }

    @Override
    public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
        // Called before rebalance - abort any in-progress transaction
        if (transactionInProgress.get()) {
            System.out.println("Rebalance triggered, aborting current transaction");
            try {
                producer.abortTransaction();
            } catch (Exception e) {
                System.err.println("Error aborting transaction during rebalance: " + e.getMessage());
            }
            transactionInProgress.set(false);
        }

        System.out.println("Partitions revoked: " + partitions);
    }

    @Override
    public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
        // Called after rebalance with new partition assignment
        System.out.println("Partitions assigned: " + partitions);

        // Seek to last committed offsets for new partitions
        for (TopicPartition partition : partitions) {
            var committed = consumer.committed(partition);
            if (committed != null) {
                consumer.seek(partition, committed.offset());
                System.out.printf("Partition %s: seeking to committed offset %d%n",
                    partition, committed.offset());
            }
        }
    }

    public void beginTransaction() {
        producer.beginTransaction();
        transactionInProgress.set(true);
    }

    public void commitTransaction() {
        producer.commitTransaction();
        transactionInProgress.set(false);
    }

    public void abortTransaction() {
        producer.abortTransaction();
        transactionInProgress.set(false);
    }

    public boolean isTransactionInProgress() {
        return transactionInProgress.get();
    }
}
```

## Part 6: Transactional ID Management

The `transactional.id` configuration is critical for transaction recovery and zombie fencing. Choosing the right strategy depends on your deployment model.

### Transactional ID Strategies

| Strategy | Use Case | Example |
|----------|----------|---------|
| Static per instance | Fixed number of consumers | `order-processor-1`, `order-processor-2` |
| Partition-based | Dynamic scaling | `order-processor-partition-0` |
| Consumer group based | Simple deployments | `order-processor-{groupId}-{memberId}` |

### Static Transactional ID Example

For deployments with a fixed number of processing instances:

```java
public class StaticTransactionalIdProvider {

    private final String applicationName;
    private final int instanceId;

    public StaticTransactionalIdProvider(String applicationName, int instanceId) {
        this.applicationName = applicationName;
        this.instanceId = instanceId;
    }

    public String getTransactionalId() {
        return String.format("%s-txn-%d", applicationName, instanceId);
    }
}
```

### Partition-Based Transactional ID

For applications that process specific partitions:

```java
import org.apache.kafka.common.TopicPartition;

import java.util.Set;

public class PartitionBasedTransactionalIdProvider {

    private final String applicationName;

    public PartitionBasedTransactionalIdProvider(String applicationName) {
        this.applicationName = applicationName;
    }

    /**
     * Generate transactional ID based on assigned partitions.
     * This ensures each partition is processed by exactly one transactional producer.
     */
    public String getTransactionalId(Set<TopicPartition> assignedPartitions) {
        // Sort partitions for deterministic ID generation
        StringBuilder sb = new StringBuilder(applicationName);
        sb.append("-txn");

        assignedPartitions.stream()
            .sorted((a, b) -> {
                int topicCompare = a.topic().compareTo(b.topic());
                return topicCompare != 0 ? topicCompare :
                    Integer.compare(a.partition(), b.partition());
            })
            .forEach(tp -> sb.append("-").append(tp.topic()).append("-").append(tp.partition()));

        return sb.toString();
    }
}
```

## Part 7: Monitoring and Metrics

Monitoring transactional producers requires tracking both standard producer metrics and transaction-specific metrics.

### Key Metrics to Monitor

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| txn-init-time-ns-total | Time spent initializing transactions | > 30 seconds |
| txn-begin-time-ns-total | Time spent beginning transactions | > 5 seconds |
| txn-send-offsets-time-ns-total | Time committing offsets | > 10 seconds |
| txn-commit-time-ns-total | Time committing transactions | > 30 seconds |
| txn-abort-time-ns-total | Time aborting transactions | > 10 seconds |

### Metrics Collection Example

```java
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.common.Metric;
import org.apache.kafka.common.MetricName;

import java.util.Map;

public class TransactionMetricsCollector {

    private final KafkaProducer<?, ?> producer;

    public TransactionMetricsCollector(KafkaProducer<?, ?> producer) {
        this.producer = producer;
    }

    public void logTransactionMetrics() {
        Map<MetricName, ? extends Metric> metrics = producer.metrics();

        metrics.forEach((name, metric) -> {
            if (name.name().startsWith("txn-")) {
                System.out.printf("Metric: %s = %s%n", name.name(), metric.metricValue());
            }
        });
    }

    public double getMetricValue(String metricName) {
        return producer.metrics().entrySet().stream()
            .filter(e -> e.getKey().name().equals(metricName))
            .findFirst()
            .map(e -> (Double) e.getValue().metricValue())
            .orElse(0.0);
    }
}
```

## Part 8: Testing Transactional Code

Testing exactly-once semantics requires verifying both the happy path and failure scenarios.

### Unit Test Example

```java
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.MockConsumer;
import org.apache.kafka.clients.consumer.OffsetResetStrategy;
import org.apache.kafka.clients.producer.MockProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringSerializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class TransactionalProcessorTest {

    private MockProducer<String, String> mockProducer;
    private MockConsumer<String, String> mockConsumer;

    @BeforeEach
    void setUp() {
        mockProducer = new MockProducer<>(
            true,  // autoComplete
            new StringSerializer(),
            new StringSerializer()
        );

        mockConsumer = new MockConsumer<>(OffsetResetStrategy.EARLIEST);
    }

    @Test
    void testTransactionCommit() {
        // Initialize transactional producer
        mockProducer.initTransactions();

        // Begin transaction
        mockProducer.beginTransaction();

        // Send records
        mockProducer.send(new ProducerRecord<>("output", "key1", "value1"));
        mockProducer.send(new ProducerRecord<>("output", "key2", "value2"));

        // Commit transaction
        mockProducer.commitTransaction();

        // Verify records were sent
        List<ProducerRecord<String, String>> history = mockProducer.history();
        assertEquals(2, history.size());
        assertTrue(mockProducer.transactionCommitted());
    }

    @Test
    void testTransactionAbort() {
        mockProducer.initTransactions();
        mockProducer.beginTransaction();

        mockProducer.send(new ProducerRecord<>("output", "key1", "value1"));

        // Simulate error and abort
        mockProducer.abortTransaction();

        assertTrue(mockProducer.transactionAborted());
    }

    @Test
    void testConsumeTransformProduce() {
        TopicPartition partition = new TopicPartition("input", 0);

        // Set up consumer
        mockConsumer.assign(Collections.singletonList(partition));
        mockConsumer.updateBeginningOffsets(Collections.singletonMap(partition, 0L));

        // Add test record
        mockConsumer.addRecord(new ConsumerRecord<>("input", 0, 0L, "key", "value"));

        // Poll and verify
        ConsumerRecords<String, String> records = mockConsumer.poll(java.time.Duration.ofMillis(100));
        assertEquals(1, records.count());

        ConsumerRecord<String, String> record = records.iterator().next();
        assertEquals("key", record.key());
        assertEquals("value", record.value());
    }
}
```

## Best Practices Summary

1. **Use unique transactional IDs** - Each producer instance needs a unique, stable `transactional.id` to prevent zombie fencing issues.

2. **Initialize transactions once** - Call `initTransactions()` exactly once per producer instance, not per transaction.

3. **Handle errors appropriately** - Distinguish between fatal errors (ProducerFencedException) that require producer restart and recoverable errors that just need transaction abort.

4. **Configure read_committed consumers** - Always use `isolation.level=read_committed` on consumers that read from transactionally-produced topics.

5. **Disable consumer auto-commit** - When using transactional offset commits, disable `enable.auto.commit` to prevent double commits.

6. **Keep transactions short** - Long-running transactions increase the chance of timeouts and block consumers reading uncommitted data.

7. **Monitor transaction metrics** - Track commit times, abort rates, and transaction durations to identify issues early.

8. **Test failure scenarios** - Unit test both successful commits and various failure modes including rebalances and timeouts.

## Conclusion

Implementing exactly-once semantics in Kafka requires understanding the interaction between idempotent producers, transactional messaging, and read-committed consumers. The consume-transform-produce pattern provides a robust foundation for building data pipelines that guarantee no duplicates or data loss.

Start with idempotent producers for simple single-partition deduplication. When you need atomic writes across partitions or coordinated offset commits, upgrade to full transactional messaging. Remember that exactly-once has performance implications, so measure the impact in your specific use case and use it where the stronger guarantees justify the overhead.
