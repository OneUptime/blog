# How to Tune Kafka Producer Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Producer Tuning, Performance Optimization, Throughput, Latency

Description: Learn how to tune Kafka producer performance with optimal batch size, linger time, compression, and acknowledgment settings for maximum throughput and reliability.

---

Producer tuning significantly impacts Kafka throughput, latency, and reliability. This guide covers key configurations and techniques for optimizing producer performance.

## Key Producer Settings

### Batching Configuration

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

// Batch size in bytes (default 16KB)
props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);  // 64KB

// Wait time to fill batch (default 0ms)
props.put(ProducerConfig.LINGER_MS_CONFIG, 10);

// Buffer memory for unsent records (default 32MB)
props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864);  // 64MB
```

### Batching Impact

| batch.size | linger.ms | Throughput | Latency |
|------------|-----------|------------|---------|
| 16KB | 0 | Low | Low |
| 64KB | 5 | Medium | Medium |
| 128KB | 20 | High | Higher |
| 256KB | 100 | Maximum | High |

## Compression

```java
// Compression type: none, gzip, snappy, lz4, zstd
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");
```

### Compression Comparison

| Type | CPU | Ratio | Speed | Recommendation |
|------|-----|-------|-------|----------------|
| none | None | 1:1 | Fastest | Testing only |
| lz4 | Low | ~2x | Fast | General purpose |
| snappy | Low | ~2x | Fast | Low CPU |
| zstd | Medium | ~3x | Medium | Best ratio |
| gzip | High | ~3x | Slow | Max compression |

## Acknowledgment Settings

```java
// acks: 0, 1, all
props.put(ProducerConfig.ACKS_CONFIG, "all");

// For acks=all, works with broker min.insync.replicas
```

### Acks Impact

| acks | Durability | Latency | Throughput |
|------|------------|---------|------------|
| 0 | None | Lowest | Highest |
| 1 | Leader only | Low | High |
| all | Full ISR | Higher | Lower |

## Retries and Timeouts

```java
// Retries (default MAX_INT with idempotence)
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);

// Retry backoff
props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, 100);

// Delivery timeout (includes retries)
props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 120000);

// Request timeout
props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 30000);
```

## In-Flight Requests

```java
// Max requests without ack (default 5)
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

// For strict ordering with retries, use 1 (or enable idempotence)
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
```

## High Throughput Configuration

```java
public static Properties highThroughputConfig() {
    Properties props = new Properties();
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

    // Serialization
    props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
    props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

    // Batching - larger batches, wait longer
    props.put(ProducerConfig.BATCH_SIZE_CONFIG, 131072);  // 128KB
    props.put(ProducerConfig.LINGER_MS_CONFIG, 50);
    props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 134217728);  // 128MB

    // Compression
    props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

    // Acknowledgments - leader only for speed
    props.put(ProducerConfig.ACKS_CONFIG, "1");

    // High in-flight requests
    props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 10);

    return props;
}
```

## Low Latency Configuration

```java
public static Properties lowLatencyConfig() {
    Properties props = new Properties();
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

    // Serialization
    props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
    props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

    // Batching - minimal waiting
    props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);  // 16KB default
    props.put(ProducerConfig.LINGER_MS_CONFIG, 0);

    // No compression for speed
    props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "none");

    // Leader ack only
    props.put(ProducerConfig.ACKS_CONFIG, "1");

    return props;
}
```

## Reliable Configuration

```java
public static Properties reliableConfig() {
    Properties props = new Properties();
    props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

    // Serialization
    props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
    props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

    // Moderate batching
    props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);  // 64KB
    props.put(ProducerConfig.LINGER_MS_CONFIG, 10);

    // Compression
    props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

    // Full durability
    props.put(ProducerConfig.ACKS_CONFIG, "all");

    // Idempotence for exactly-once
    props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

    // Retries
    props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
    props.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 300000);

    // In-flight with idempotence (up to 5 allowed)
    props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

    return props;
}
```

## Async vs Sync Sending

### Async (Higher Throughput)

```java
// Async with callback
producer.send(record, (metadata, exception) -> {
    if (exception != null) {
        handleError(exception);
    } else {
        handleSuccess(metadata);
    }
});
```

### Sync (Guaranteed Order)

```java
// Sync - blocks until ack
RecordMetadata metadata = producer.send(record).get();
```

## Monitoring Producer Metrics

```java
// Get producer metrics
Map<MetricName, ? extends Metric> metrics = producer.metrics();

// Key metrics
metrics.forEach((name, metric) -> {
    if (name.name().equals("record-send-rate") ||
        name.name().equals("record-send-total") ||
        name.name().equals("record-error-rate") ||
        name.name().equals("request-latency-avg") ||
        name.name().equals("batch-size-avg") ||
        name.name().equals("compression-rate-avg")) {
        System.out.printf("%s: %s%n", name.name(), metric.metricValue());
    }
});
```

### Key Metrics to Monitor

| Metric | Description | Target |
|--------|-------------|--------|
| record-send-rate | Records/sec | Maximize |
| request-latency-avg | Avg latency ms | Minimize |
| batch-size-avg | Bytes per batch | Near batch.size |
| compression-rate-avg | Compression ratio | < 1.0 |
| record-error-rate | Errors/sec | 0 |
| buffer-available-bytes | Free buffer | > 0 |

## Performance Testing

```java
public class ProducerBenchmark {
    public static void benchmark(Properties props, int messageCount, int messageSize) {
        try (Producer<String, byte[]> producer = new KafkaProducer<>(props)) {
            byte[] payload = new byte[messageSize];
            new Random().nextBytes(payload);

            long start = System.currentTimeMillis();

            for (int i = 0; i < messageCount; i++) {
                producer.send(new ProducerRecord<>("benchmark-topic", String.valueOf(i), payload));
            }

            producer.flush();
            long duration = System.currentTimeMillis() - start;

            double throughput = (double) messageCount / duration * 1000;
            double mbps = (double) messageCount * messageSize / duration * 1000 / 1024 / 1024;

            System.out.printf("Sent %d messages in %d ms%n", messageCount, duration);
            System.out.printf("Throughput: %.2f msg/sec, %.2f MB/sec%n", throughput, mbps);
        }
    }
}
```

## Best Practices Summary

| Goal | Settings |
|------|----------|
| Max throughput | Large batch, high linger, lz4, acks=1 |
| Low latency | Small batch, linger=0, no compression |
| Reliability | acks=all, idempotence, retries |
| Balanced | 64KB batch, 10ms linger, lz4, acks=all |

Tune producers based on your specific requirements, balancing throughput, latency, and durability guarantees.
