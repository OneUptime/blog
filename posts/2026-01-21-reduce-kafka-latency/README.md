# How to Reduce Kafka End-to-End Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Latency, Performance, Low Latency, Producer Configuration, Consumer Configuration

Description: A comprehensive guide to reducing Apache Kafka end-to-end latency through producer, broker, and consumer optimizations for real-time streaming applications.

---

End-to-end latency in Apache Kafka - the time from when a producer sends a message to when a consumer receives it - is critical for real-time applications. This guide covers strategies to minimize latency at every stage of the message pipeline.

## Understanding Kafka Latency Components

Total end-to-end latency consists of:

1. **Producer latency**: Time to batch, compress, and send
2. **Network latency**: Time for message to reach broker
3. **Broker latency**: Time to write to disk and replicate
4. **Consumer latency**: Time to fetch and process

```
Total Latency = Producer Batching + Network (Send) + Broker Write +
                Replication + Network (Fetch) + Consumer Processing
```

## Measuring Baseline Latency

Before optimizing, establish your baseline latency.

### Java Latency Measurement Tool

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.*;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class KafkaLatencyMeasurement {

    private final String bootstrapServers;
    private final String topic;

    public KafkaLatencyMeasurement(String bootstrapServers, String topic) {
        this.bootstrapServers = bootstrapServers;
        this.topic = topic;
    }

    public void measureEndToEndLatency(int numMessages) throws Exception {
        Properties producerProps = new Properties();
        producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        producerProps.put(ProducerConfig.ACKS_CONFIG, "1");

        Properties consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG,
            "latency-test-" + System.currentTimeMillis());
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        consumerProps.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 1);
        consumerProps.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1);

        ConcurrentHashMap<String, Long> sendTimes = new ConcurrentHashMap<>();
        List<Long> latencies = Collections.synchronizedList(new ArrayList<>());
        AtomicBoolean running = new AtomicBoolean(true);

        // Start consumer in background
        Thread consumerThread = new Thread(() -> {
            try (KafkaConsumer<String, String> consumer =
                    new KafkaConsumer<>(consumerProps)) {
                consumer.subscribe(Collections.singletonList(topic));

                while (running.get() || !sendTimes.isEmpty()) {
                    ConsumerRecords<String, String> records =
                        consumer.poll(Duration.ofMillis(10));

                    long receiveTime = System.nanoTime();

                    for (ConsumerRecord<String, String> record : records) {
                        String key = record.key();
                        Long sendTime = sendTimes.remove(key);

                        if (sendTime != null) {
                            long latencyNanos = receiveTime - sendTime;
                            latencies.add(latencyNanos);
                        }
                    }
                }
            }
        });
        consumerThread.start();

        // Give consumer time to subscribe
        Thread.sleep(2000);

        // Produce messages
        try (KafkaProducer<String, String> producer =
                new KafkaProducer<>(producerProps)) {

            for (int i = 0; i < numMessages; i++) {
                String key = "key-" + i;
                String value = "message-" + i;

                sendTimes.put(key, System.nanoTime());

                producer.send(new ProducerRecord<>(topic, key, value));

                // Small delay to avoid overwhelming
                if (i % 100 == 0) {
                    Thread.sleep(10);
                }
            }

            producer.flush();
        }

        // Wait for all messages to be received
        Thread.sleep(5000);
        running.set(false);
        consumerThread.join();

        // Calculate statistics
        if (!latencies.isEmpty()) {
            Collections.sort(latencies);

            long sum = latencies.stream().mapToLong(Long::longValue).sum();
            double avgMs = (sum / latencies.size()) / 1_000_000.0;
            double p50Ms = latencies.get(latencies.size() / 2) / 1_000_000.0;
            double p95Ms = latencies.get((int) (latencies.size() * 0.95)) / 1_000_000.0;
            double p99Ms = latencies.get((int) (latencies.size() * 0.99)) / 1_000_000.0;
            double minMs = latencies.get(0) / 1_000_000.0;
            double maxMs = latencies.get(latencies.size() - 1) / 1_000_000.0;

            System.out.println("\n=== End-to-End Latency Results ===");
            System.out.printf("Messages: %d%n", latencies.size());
            System.out.printf("Min: %.2f ms%n", minMs);
            System.out.printf("Avg: %.2f ms%n", avgMs);
            System.out.printf("P50: %.2f ms%n", p50Ms);
            System.out.printf("P95: %.2f ms%n", p95Ms);
            System.out.printf("P99: %.2f ms%n", p99Ms);
            System.out.printf("Max: %.2f ms%n", maxMs);
        }
    }

    public static void main(String[] args) throws Exception {
        KafkaLatencyMeasurement measurement =
            new KafkaLatencyMeasurement("localhost:9092", "latency-test");
        measurement.measureEndToEndLatency(10000);
    }
}
```

## Producer Latency Optimization

### Low-Latency Producer Configuration

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;

public class LowLatencyProducer {

    public static KafkaProducer<String, String> createLowLatencyProducer(
            String bootstrapServers) {

        Properties props = new Properties();

        // Basic configuration
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        // Low latency settings

        // Send immediately without waiting for batch to fill
        props.put(ProducerConfig.LINGER_MS_CONFIG, 0);

        // Small batch size to send quickly
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);

        // Acks=1 for lower latency (trade-off with durability)
        props.put(ProducerConfig.ACKS_CONFIG, "1");

        // Disable compression for lowest latency
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "none");

        // Reduce buffer memory to force faster sends
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 33554432);

        // Faster metadata refresh
        props.put(ProducerConfig.METADATA_MAX_AGE_CONFIG, 30000);

        // Connection settings
        props.put(ProducerConfig.CONNECTIONS_MAX_IDLE_MS_CONFIG, 540000);
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 10000);

        // Retry settings
        props.put(ProducerConfig.RETRIES_CONFIG, 0);

        return new KafkaProducer<>(props);
    }

    public static void main(String[] args) throws Exception {
        try (KafkaProducer<String, String> producer =
                createLowLatencyProducer("localhost:9092")) {

            for (int i = 0; i < 1000; i++) {
                long startTime = System.nanoTime();

                producer.send(
                    new ProducerRecord<>("low-latency-topic", "key", "value"),
                    (metadata, exception) -> {
                        if (exception == null) {
                            long latency = (System.nanoTime() - startTime) / 1_000_000;
                            System.out.printf("Sent to partition %d, latency: %d ms%n",
                                metadata.partition(), latency);
                        }
                    }
                );
            }
        }
    }
}
```

### Synchronous Low-Latency Producer

For guaranteed low latency on individual messages:

```java
public class SynchronousLowLatencyProducer {

    private final KafkaProducer<String, String> producer;

    public SynchronousLowLatencyProducer(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        // Ultra-low latency settings
        props.put(ProducerConfig.LINGER_MS_CONFIG, 0);
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 1);  // No batching
        props.put(ProducerConfig.ACKS_CONFIG, "1");
        props.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 5000);

        this.producer = new KafkaProducer<>(props);
    }

    public long sendSync(String topic, String key, String value)
            throws Exception {
        long startTime = System.nanoTime();

        producer.send(new ProducerRecord<>(topic, key, value)).get();

        return (System.nanoTime() - startTime) / 1_000_000;
    }

    public void close() {
        producer.close();
    }
}
```

## Consumer Latency Optimization

### Low-Latency Consumer Configuration

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.StringDeserializer;
import java.time.Duration;
import java.util.*;

public class LowLatencyConsumer {

    public static KafkaConsumer<String, String> createLowLatencyConsumer(
            String bootstrapServers, String groupId) {

        Properties props = new Properties();

        // Basic configuration
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());

        // Low latency settings

        // Return immediately when any data is available
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1);

        // Do not wait for data
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 1);

        // Smaller max fetch to reduce processing time
        props.put(ConsumerConfig.MAX_PARTITION_FETCH_BYTES_CONFIG, 262144);

        // More frequent polling
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);

        // Faster session timeout for quicker rebalancing
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 10000);
        props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 3000);

        // Auto commit settings
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);
        props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 1000);

        return new KafkaConsumer<>(props);
    }

    public void consumeWithLatencyTracking(String topic) {
        try (KafkaConsumer<String, String> consumer =
                createLowLatencyConsumer("localhost:9092", "low-latency-group")) {

            consumer.subscribe(Collections.singletonList(topic));

            while (true) {
                // Poll with very short timeout for low latency
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(1));

                long pollTime = System.currentTimeMillis();

                for (ConsumerRecord<String, String> record : records) {
                    // Calculate fetch latency from record timestamp
                    long fetchLatency = pollTime - record.timestamp();

                    System.out.printf("Partition: %d, Offset: %d, Fetch latency: %d ms%n",
                        record.partition(), record.offset(), fetchLatency);

                    // Process message immediately
                    processMessage(record);
                }
            }
        }
    }

    private void processMessage(ConsumerRecord<String, String> record) {
        // Minimal processing for low latency
    }
}
```

## Python Low-Latency Configuration

```python
from confluent_kafka import Producer, Consumer
import time
from typing import Dict, List
import statistics

class LowLatencyKafkaClient:
    def __init__(self, bootstrap_servers: str):
        self.bootstrap_servers = bootstrap_servers

    def create_low_latency_producer(self) -> Producer:
        """Create a producer optimized for low latency."""
        config = {
            'bootstrap.servers': self.bootstrap_servers,

            # Send immediately without waiting
            'linger.ms': 0,

            # Small batch size
            'batch.size': 16384,

            # Fast acknowledgment
            'acks': 1,

            # No compression for speed
            'compression.type': 'none',

            # Faster socket operations
            'socket.timeout.ms': 10000,
            'socket.keepalive.enable': True,

            # Queue settings
            'queue.buffering.max.messages': 100000,
            'queue.buffering.max.ms': 0,
        }

        return Producer(config)

    def create_low_latency_consumer(self, group_id: str) -> Consumer:
        """Create a consumer optimized for low latency."""
        config = {
            'bootstrap.servers': self.bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'latest',

            # Return immediately with any data
            'fetch.min.bytes': 1,

            # No wait time
            'fetch.wait.max.ms': 1,

            # Smaller fetch size
            'fetch.max.bytes': 262144,
            'max.partition.fetch.bytes': 262144,

            # Faster session management
            'session.timeout.ms': 10000,
            'heartbeat.interval.ms': 3000,

            # Auto commit for simplicity
            'enable.auto.commit': True,
            'auto.commit.interval.ms': 1000,
        }

        return Consumer(config)

    def measure_latency(self, topic: str, num_messages: int = 1000) -> Dict:
        """Measure end-to-end latency."""
        producer = self.create_low_latency_producer()
        consumer = self.create_low_latency_consumer(
            f'latency-test-{int(time.time())}')

        consumer.subscribe([topic])

        # Warm up consumer
        for _ in range(10):
            consumer.poll(0.1)

        latencies = []
        received = {}

        def delivery_callback(err, msg):
            if not err:
                received[msg.key().decode()] = time.time_ns()

        # Send messages with timestamps
        send_times = {}
        for i in range(num_messages):
            key = f'msg-{i}'
            send_times[key] = time.time_ns()
            producer.produce(
                topic,
                key=key.encode(),
                value=b'test-payload',
                callback=delivery_callback
            )
            producer.poll(0)

        producer.flush()

        # Consume and measure latency
        consumed = 0
        timeout = time.time() + 30

        while consumed < num_messages and time.time() < timeout:
            msg = consumer.poll(0.001)
            receive_time = time.time_ns()

            if msg and not msg.error():
                key = msg.key().decode()
                if key in send_times:
                    latency_ns = receive_time - send_times[key]
                    latencies.append(latency_ns / 1_000_000)  # Convert to ms
                    consumed += 1

        consumer.close()

        if latencies:
            latencies.sort()
            return {
                'count': len(latencies),
                'min_ms': min(latencies),
                'max_ms': max(latencies),
                'avg_ms': statistics.mean(latencies),
                'p50_ms': latencies[len(latencies) // 2],
                'p95_ms': latencies[int(len(latencies) * 0.95)],
                'p99_ms': latencies[int(len(latencies) * 0.99)],
            }

        return {}


def main():
    client = LowLatencyKafkaClient("localhost:9092")

    print("Measuring end-to-end latency...")
    results = client.measure_latency("latency-test", 10000)

    print("\n=== Latency Results ===")
    for key, value in results.items():
        if 'ms' in key:
            print(f"{key}: {value:.2f} ms")
        else:
            print(f"{key}: {value}")


if __name__ == '__main__':
    main()
```

## Broker Configuration for Low Latency

```properties
# server.properties - Low latency optimizations

# More network threads for faster processing
num.network.threads=8
num.io.threads=16

# Larger socket buffers
socket.send.buffer.bytes=1048576
socket.receive.buffer.bytes=1048576

# Reduce replica fetch latency
num.replica.fetchers=4
replica.fetch.wait.max.ms=100
replica.fetch.min.bytes=1

# Faster leader election
leader.imbalance.check.interval.seconds=30

# Log flush settings - balance between latency and durability
log.flush.interval.messages=1000
log.flush.interval.ms=100

# Request handling
queued.max.requests=500
request.timeout.ms=10000
```

## Network Optimization

### TCP Tuning for Low Latency

```bash
# /etc/sysctl.conf

# Disable Nagle's algorithm equivalent
net.ipv4.tcp_nodelay = 1

# Reduce TCP connection time
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1

# Faster keepalive
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6

# Increase socket buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
```

## Partitioning Strategy for Low Latency

```java
import org.apache.kafka.clients.producer.Partitioner;
import org.apache.kafka.common.Cluster;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

public class RoundRobinPartitioner implements Partitioner {

    private final AtomicInteger counter = new AtomicInteger(0);

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {
        int numPartitions = cluster.partitionsForTopic(topic).size();

        // Round-robin for even distribution and predictable latency
        return Math.abs(counter.getAndIncrement() % numPartitions);
    }

    @Override
    public void close() {}

    @Override
    public void configure(Map<String, ?> configs) {}
}
```

## Latency Monitoring Dashboard

Track these metrics for latency monitoring:

```yaml
# prometheus-latency-alerts.yml
groups:
  - name: kafka-latency
    rules:
      - alert: HighProduceLatency
        expr: histogram_quantile(0.99,
          rate(kafka_producer_request_latency_avg[5m])) > 50
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: P99 produce latency above 50ms

      - alert: HighFetchLatency
        expr: histogram_quantile(0.99,
          rate(kafka_consumer_fetch_latency_avg[5m])) > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: P99 fetch latency above 100ms

      - alert: HighEndToEndLatency
        expr: kafka_streams_processor_node_process_latency_avg > 100
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: End-to-end processing latency above 100ms
```

## Trade-offs and Considerations

### Latency vs Throughput

| Configuration | Low Latency | High Throughput |
|--------------|-------------|-----------------|
| linger.ms | 0 | 5-100 |
| batch.size | 16KB | 64KB-256KB |
| compression | none | lz4/zstd |
| acks | 1 | all |
| fetch.min.bytes | 1 | 1MB |

### Latency vs Durability

```java
// Ultra-low latency (less durable)
props.put(ProducerConfig.ACKS_CONFIG, "0");
props.put(ProducerConfig.RETRIES_CONFIG, 0);

// Balanced
props.put(ProducerConfig.ACKS_CONFIG, "1");
props.put(ProducerConfig.RETRIES_CONFIG, 1);

// High durability (higher latency)
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.RETRIES_CONFIG, 3);
```

## Best Practices Summary

1. **Producer Side**
   - Set `linger.ms=0` for immediate sends
   - Use small batch sizes
   - Disable compression for speed
   - Use `acks=1` for balance

2. **Consumer Side**
   - Set `fetch.min.bytes=1`
   - Set `fetch.max.wait.ms=1`
   - Poll frequently with short timeouts
   - Process messages asynchronously

3. **Broker Side**
   - Increase network and I/O threads
   - Use SSDs for log storage
   - Tune replica fetcher settings
   - Minimize replication lag

4. **Infrastructure**
   - Co-locate producers, brokers, and consumers
   - Use dedicated network interfaces
   - Tune OS network stack
   - Monitor and alert on latency percentiles

## Conclusion

Reducing Kafka end-to-end latency requires optimization at every layer - from producer configuration to network tuning to consumer settings. The key trade-offs are between latency, throughput, and durability. For ultra-low latency applications, you may need to sacrifice some throughput and durability guarantees. Always measure baseline latency before making changes, and continuously monitor latency percentiles in production to ensure your optimizations are effective.
