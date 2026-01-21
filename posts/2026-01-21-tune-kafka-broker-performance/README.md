# How to Tune Kafka Broker Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Performance Tuning, JVM Tuning, Broker Configuration, Disk I/O, Operating System

Description: A comprehensive guide to tuning Apache Kafka broker performance including OS settings, JVM configuration, disk I/O optimization, and network tuning for maximum throughput.

---

Optimizing Apache Kafka broker performance requires tuning at multiple levels - from the operating system and JVM to Kafka-specific configurations. This guide covers comprehensive tuning strategies to maximize throughput, minimize latency, and ensure stable operations.

## Understanding Kafka Performance Factors

Kafka broker performance depends on:

- Disk I/O throughput and latency
- Network bandwidth and latency
- JVM heap size and garbage collection
- Operating system settings
- Kafka configuration parameters

## Operating System Tuning

### File Descriptor Limits

Kafka requires many file descriptors for partition log segments and network connections.

```bash
# Check current limits
ulimit -n

# Set in /etc/security/limits.conf
kafka soft nofile 128000
kafka hard nofile 128000

# Or set system-wide in /etc/sysctl.conf
fs.file-max = 500000
```

### Virtual Memory Settings

```bash
# Add to /etc/sysctl.conf

# Reduce swappiness - Kafka prefers to avoid swap
vm.swappiness = 1

# Increase dirty ratio for better write batching
vm.dirty_ratio = 80
vm.dirty_background_ratio = 5

# Allow more memory to be allocated for network buffers
net.core.wmem_max = 16777216
net.core.rmem_max = 16777216

# Apply changes
sysctl -p
```

### Network Tuning

```bash
# Add to /etc/sysctl.conf

# TCP buffer sizes
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216

# Connection backlog
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535

# TCP keepalive
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6

# Disable TCP slow start after idle
net.ipv4.tcp_slow_start_after_idle = 0

# Enable TCP window scaling
net.ipv4.tcp_window_scaling = 1
```

### Disk I/O Scheduling

Choose the appropriate I/O scheduler for your storage:

```bash
# For SSDs, use 'none' or 'noop'
echo none > /sys/block/sda/queue/scheduler

# For HDDs, use 'deadline' or 'mq-deadline'
echo deadline > /sys/block/sda/queue/scheduler

# Increase read-ahead for sequential workloads
echo 4096 > /sys/block/sda/queue/read_ahead_kb

# Make persistent via udev rule
# /etc/udev/rules.d/60-scheduler.rules
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/scheduler}="none"
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/read_ahead_kb}="4096"
```

### Filesystem Settings

```bash
# Mount options for ext4 (recommended for Kafka)
# Add to /etc/fstab
/dev/sdb1 /var/kafka-logs ext4 defaults,noatime,nodiratime,data=writeback 0 2

# For XFS (also good choice)
/dev/sdb1 /var/kafka-logs xfs defaults,noatime,nodiratime 0 2
```

## JVM Tuning

### Heap Size Configuration

```bash
# Set in kafka-server-start.sh or as environment variable
export KAFKA_HEAP_OPTS="-Xms6g -Xmx6g"

# Recommended: 6-8GB heap for most production workloads
# Never exceed 32GB (compressed OOPs threshold)
```

### G1 Garbage Collector Settings

For Kafka 2.0+ with Java 11+, G1GC is recommended:

```bash
export KAFKA_JVM_PERFORMANCE_OPTS="-server \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=20 \
  -XX:InitiatingHeapOccupancyPercent=35 \
  -XX:G1HeapRegionSize=16M \
  -XX:MinMetaspaceFreeRatio=50 \
  -XX:MaxMetaspaceFreeRatio=80 \
  -XX:+ExplicitGCInvokesConcurrent \
  -XX:+ParallelRefProcEnabled \
  -XX:+DisableExplicitGC \
  -Djava.awt.headless=true"
```

### Complete JVM Configuration Script

```bash
#!/bin/bash
# kafka-jvm-opts.sh

KAFKA_HEAP_OPTS="-Xms6g -Xmx6g"

KAFKA_JVM_PERFORMANCE_OPTS="-server \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=20 \
  -XX:InitiatingHeapOccupancyPercent=35 \
  -XX:G1HeapRegionSize=16M \
  -XX:+UnlockExperimentalVMOptions \
  -XX:+ParallelRefProcEnabled \
  -XX:+UseStringDeduplication \
  -XX:+DisableExplicitGC \
  -XX:+AlwaysPreTouch \
  -XX:+ExitOnOutOfMemoryError \
  -Djava.awt.headless=true \
  -Dcom.sun.management.jmxremote \
  -Dcom.sun.management.jmxremote.authenticate=false \
  -Dcom.sun.management.jmxremote.ssl=false \
  -Dcom.sun.management.jmxremote.port=9999"

export KAFKA_HEAP_OPTS
export KAFKA_JVM_PERFORMANCE_OPTS
```

## Kafka Broker Configuration

### Core Broker Settings

```properties
# server.properties

############################# Server Basics #############################

# Broker ID - unique per broker
broker.id=1

# Listeners
listeners=PLAINTEXT://0.0.0.0:9092
advertised.listeners=PLAINTEXT://broker1.example.com:9092

############################# Log Basics #############################

# Log directories - use multiple disks for better I/O
log.dirs=/data1/kafka-logs,/data2/kafka-logs,/data3/kafka-logs

# Number of partitions for auto-created topics
num.partitions=12

# Default replication factor
default.replication.factor=3
min.insync.replicas=2

############################# Log Retention Policy #############################

# Retention by time
log.retention.hours=168

# Retention by size (per partition)
log.retention.bytes=-1

# Segment size and roll settings
log.segment.bytes=1073741824
log.roll.hours=168

# Log cleanup settings
log.cleaner.enable=true
log.cleanup.policy=delete

############################# Network Settings #############################

# Number of network threads
num.network.threads=8

# Number of I/O threads
num.io.threads=16

# Socket buffer sizes
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Maximum number of queued requests
queued.max.requests=500

############################# Replication Settings #############################

# Threads for fetching from leaders
num.replica.fetchers=4

# Replica socket settings
replica.socket.receive.buffer.bytes=65536
replica.fetch.max.bytes=10485760
replica.fetch.wait.max.ms=500

# ISR shrink/expand intervals
replica.lag.time.max.ms=30000

############################# Request Processing #############################

# Request timeout
request.timeout.ms=30000

# Background threads
background.threads=10

# Compression
compression.type=producer
```

### High Throughput Configuration

```properties
# Optimized for high throughput workloads

# Increase network threads for more concurrent connections
num.network.threads=12
num.io.threads=24

# Larger socket buffers
socket.send.buffer.bytes=1048576
socket.receive.buffer.bytes=1048576

# Allow larger requests
socket.request.max.bytes=209715200

# More queued requests
queued.max.requests=1000

# Faster replication
num.replica.fetchers=8
replica.fetch.max.bytes=52428800

# Larger log segments
log.segment.bytes=2147483648

# Flush settings - let OS handle most flushing
log.flush.interval.messages=50000
log.flush.interval.ms=10000
```

## Java Monitoring and Tuning Code

### JMX Metrics Collection

```java
import javax.management.*;
import javax.management.remote.*;
import java.util.*;

public class KafkaBrokerMetrics {

    private final MBeanServerConnection mbsc;

    public KafkaBrokerMetrics(String host, int jmxPort) throws Exception {
        String url = String.format("service:jmx:rmi:///jndi/rmi://%s:%d/jmxrmi",
            host, jmxPort);
        JMXServiceURL serviceUrl = new JMXServiceURL(url);
        JMXConnector connector = JMXConnectorFactory.connect(serviceUrl);
        this.mbsc = connector.getMBeanServerConnection();
    }

    public Map<String, Object> getBrokerMetrics() throws Exception {
        Map<String, Object> metrics = new HashMap<>();

        // Messages in per second
        metrics.put("messagesInPerSec", getMBeanValue(
            "kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec",
            "OneMinuteRate"));

        // Bytes in per second
        metrics.put("bytesInPerSec", getMBeanValue(
            "kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec",
            "OneMinuteRate"));

        // Bytes out per second
        metrics.put("bytesOutPerSec", getMBeanValue(
            "kafka.server:type=BrokerTopicMetrics,name=BytesOutPerSec",
            "OneMinuteRate"));

        // Request queue size
        metrics.put("requestQueueSize", getMBeanValue(
            "kafka.network:type=RequestChannel,name=RequestQueueSize",
            "Value"));

        // Response queue size
        metrics.put("responseQueueSize", getMBeanValue(
            "kafka.network:type=RequestChannel,name=ResponseQueueSize",
            "Value"));

        // Under replicated partitions
        metrics.put("underReplicatedPartitions", getMBeanValue(
            "kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions",
            "Value"));

        // Active controller count
        metrics.put("activeControllerCount", getMBeanValue(
            "kafka.controller:type=KafkaController,name=ActiveControllerCount",
            "Value"));

        // Request latency
        metrics.put("produceRequestLatencyMs", getMBeanValue(
            "kafka.network:type=RequestMetrics,name=TotalTimeMs,request=Produce",
            "Mean"));

        metrics.put("fetchRequestLatencyMs", getMBeanValue(
            "kafka.network:type=RequestMetrics,name=TotalTimeMs,request=FetchConsumer",
            "Mean"));

        return metrics;
    }

    private Object getMBeanValue(String objectName, String attribute)
            throws Exception {
        ObjectName name = new ObjectName(objectName);
        return mbsc.getAttribute(name, attribute);
    }

    public void printMetricsSummary() throws Exception {
        Map<String, Object> metrics = getBrokerMetrics();

        System.out.println("\n=== Kafka Broker Metrics ===");
        System.out.printf("Messages In/sec: %.2f%n", metrics.get("messagesInPerSec"));
        System.out.printf("Bytes In/sec: %.2f MB/s%n",
            ((Double) metrics.get("bytesInPerSec")) / 1024 / 1024);
        System.out.printf("Bytes Out/sec: %.2f MB/s%n",
            ((Double) metrics.get("bytesOutPerSec")) / 1024 / 1024);
        System.out.printf("Request Queue Size: %s%n", metrics.get("requestQueueSize"));
        System.out.printf("Under Replicated Partitions: %s%n",
            metrics.get("underReplicatedPartitions"));
        System.out.printf("Produce Latency: %.2f ms%n", metrics.get("produceRequestLatencyMs"));
        System.out.printf("Fetch Latency: %.2f ms%n", metrics.get("fetchRequestLatencyMs"));
    }

    public static void main(String[] args) throws Exception {
        KafkaBrokerMetrics metrics = new KafkaBrokerMetrics("localhost", 9999);
        metrics.printMetricsSummary();
    }
}
```

### Performance Benchmark Tool

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.*;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class KafkaPerformanceBenchmark {

    private final String bootstrapServers;
    private final String topic;

    public KafkaPerformanceBenchmark(String bootstrapServers, String topic) {
        this.bootstrapServers = bootstrapServers;
        this.topic = topic;
    }

    public void runProducerBenchmark(int numMessages, int messageSizeBytes,
                                     int numThreads) throws Exception {

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            ByteArraySerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "1");
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 65536);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864);

        byte[] payload = new byte[messageSizeBytes];
        new Random().nextBytes(payload);

        AtomicLong totalMessages = new AtomicLong(0);
        AtomicLong totalBytes = new AtomicLong(0);
        AtomicLong totalLatency = new AtomicLong(0);

        ExecutorService executor = Executors.newFixedThreadPool(numThreads);
        long startTime = System.currentTimeMillis();

        int messagesPerThread = numMessages / numThreads;

        List<Future<?>> futures = new ArrayList<>();

        for (int t = 0; t < numThreads; t++) {
            futures.add(executor.submit(() -> {
                try (KafkaProducer<String, byte[]> producer =
                        new KafkaProducer<>(props)) {

                    for (int i = 0; i < messagesPerThread; i++) {
                        long sendStart = System.currentTimeMillis();

                        producer.send(new ProducerRecord<>(topic, payload),
                            (metadata, exception) -> {
                                if (exception == null) {
                                    totalMessages.incrementAndGet();
                                    totalBytes.addAndGet(messageSizeBytes);
                                    totalLatency.addAndGet(
                                        System.currentTimeMillis() - sendStart);
                                }
                            });
                    }

                    producer.flush();
                }
            }));
        }

        for (Future<?> future : futures) {
            future.get();
        }

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;

        executor.shutdown();

        double throughputMsgs = totalMessages.get() / (duration / 1000.0);
        double throughputMB = totalBytes.get() / 1024.0 / 1024.0 / (duration / 1000.0);
        double avgLatency = totalLatency.get() / (double) totalMessages.get();

        System.out.println("\n=== Producer Benchmark Results ===");
        System.out.printf("Total messages: %d%n", totalMessages.get());
        System.out.printf("Total bytes: %.2f MB%n", totalBytes.get() / 1024.0 / 1024.0);
        System.out.printf("Duration: %d ms%n", duration);
        System.out.printf("Throughput: %.2f messages/sec%n", throughputMsgs);
        System.out.printf("Throughput: %.2f MB/sec%n", throughputMB);
        System.out.printf("Average latency: %.2f ms%n", avgLatency);
    }

    public void runConsumerBenchmark(int numMessages) throws Exception {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "benchmark-consumer");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            ByteArrayDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1048576);
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1000);

        try (KafkaConsumer<String, byte[]> consumer = new KafkaConsumer<>(props)) {
            consumer.subscribe(Collections.singletonList(topic));

            long messagesConsumed = 0;
            long bytesConsumed = 0;
            long startTime = System.currentTimeMillis();

            while (messagesConsumed < numMessages) {
                ConsumerRecords<String, byte[]> records = consumer.poll(
                    java.time.Duration.ofMillis(1000));

                for (ConsumerRecord<String, byte[]> record : records) {
                    messagesConsumed++;
                    bytesConsumed += record.value().length;
                }
            }

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            double throughputMsgs = messagesConsumed / (duration / 1000.0);
            double throughputMB = bytesConsumed / 1024.0 / 1024.0 / (duration / 1000.0);

            System.out.println("\n=== Consumer Benchmark Results ===");
            System.out.printf("Total messages: %d%n", messagesConsumed);
            System.out.printf("Total bytes: %.2f MB%n", bytesConsumed / 1024.0 / 1024.0);
            System.out.printf("Duration: %d ms%n", duration);
            System.out.printf("Throughput: %.2f messages/sec%n", throughputMsgs);
            System.out.printf("Throughput: %.2f MB/sec%n", throughputMB);
        }
    }

    public static void main(String[] args) throws Exception {
        KafkaPerformanceBenchmark benchmark = new KafkaPerformanceBenchmark(
            "localhost:9092", "benchmark-topic");

        // Run producer benchmark
        benchmark.runProducerBenchmark(1000000, 1024, 4);

        // Run consumer benchmark
        benchmark.runConsumerBenchmark(1000000);
    }
}
```

## Python Performance Tuning Script

```python
from confluent_kafka import Producer, Consumer
from confluent_kafka.admin import AdminClient, NewTopic
import time
import threading
import statistics
from typing import List, Dict
import json

class KafkaBenchmark:
    def __init__(self, bootstrap_servers: str):
        self.bootstrap_servers = bootstrap_servers
        self.admin_client = AdminClient({
            'bootstrap.servers': bootstrap_servers
        })

    def create_benchmark_topic(self, topic: str, partitions: int = 12):
        """Create a topic for benchmarking."""
        new_topic = NewTopic(topic, num_partitions=partitions, replication_factor=1)
        self.admin_client.create_topics([new_topic])
        print(f"Created topic: {topic}")
        time.sleep(2)

    def run_producer_benchmark(self, topic: str, num_messages: int,
                               message_size: int, config: Dict) -> Dict:
        """Run producer benchmark with given configuration."""
        producer_config = {
            'bootstrap.servers': self.bootstrap_servers,
            **config
        }

        producer = Producer(producer_config)
        payload = b'x' * message_size

        delivered = [0]
        errors = [0]
        latencies = []

        def delivery_callback(err, msg):
            if err:
                errors[0] += 1
            else:
                delivered[0] += 1

        start_time = time.time()

        for i in range(num_messages):
            send_time = time.time()
            producer.produce(topic, payload, callback=delivery_callback)

            if i % 10000 == 0:
                producer.poll(0)

        producer.flush()
        end_time = time.time()

        duration = end_time - start_time
        throughput_msgs = delivered[0] / duration
        throughput_mb = (delivered[0] * message_size) / 1024 / 1024 / duration

        return {
            'messages': delivered[0],
            'errors': errors[0],
            'duration_seconds': duration,
            'throughput_msgs_per_sec': throughput_msgs,
            'throughput_mb_per_sec': throughput_mb
        }

    def compare_configurations(self, topic: str, configs: List[Dict],
                               num_messages: int = 100000,
                               message_size: int = 1024):
        """Compare different producer configurations."""
        results = []

        for i, config in enumerate(configs):
            print(f"\nRunning benchmark {i + 1}/{len(configs)}...")
            print(f"Config: {config}")

            result = self.run_producer_benchmark(
                topic, num_messages, message_size, config)
            result['config'] = config
            results.append(result)

            print(f"Throughput: {result['throughput_msgs_per_sec']:.2f} msgs/sec")
            print(f"Throughput: {result['throughput_mb_per_sec']:.2f} MB/sec")

            time.sleep(5)  # Cool down between tests

        return results


def benchmark_producer_configs():
    """Benchmark different producer configurations."""
    benchmark = KafkaBenchmark("localhost:9092")

    # Create benchmark topic
    benchmark.create_benchmark_topic("perf-test")

    configs = [
        # Baseline
        {
            'acks': '1',
            'batch.size': 16384,
            'linger.ms': 0,
            'compression.type': 'none'
        },
        # Batching optimized
        {
            'acks': '1',
            'batch.size': 65536,
            'linger.ms': 5,
            'compression.type': 'none'
        },
        # With compression
        {
            'acks': '1',
            'batch.size': 65536,
            'linger.ms': 5,
            'compression.type': 'lz4'
        },
        # Maximum throughput
        {
            'acks': '1',
            'batch.size': 131072,
            'linger.ms': 10,
            'compression.type': 'lz4',
            'buffer.memory': 67108864
        },
        # High durability
        {
            'acks': 'all',
            'batch.size': 65536,
            'linger.ms': 5,
            'compression.type': 'lz4'
        }
    ]

    results = benchmark.compare_configurations("perf-test", configs)

    print("\n" + "=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)

    for i, result in enumerate(results):
        print(f"\nConfig {i + 1}:")
        print(f"  Acks: {result['config'].get('acks')}")
        print(f"  Batch size: {result['config'].get('batch.size')}")
        print(f"  Linger.ms: {result['config'].get('linger.ms')}")
        print(f"  Compression: {result['config'].get('compression.type')}")
        print(f"  Throughput: {result['throughput_msgs_per_sec']:.2f} msgs/sec")
        print(f"  Throughput: {result['throughput_mb_per_sec']:.2f} MB/sec")


if __name__ == '__main__':
    benchmark_producer_configs()
```

## Disk Performance Verification

```bash
#!/bin/bash
# disk-benchmark.sh - Benchmark disk performance for Kafka

DISK="/dev/sdb"
TEST_DIR="/var/kafka-logs"

echo "=== Disk Performance Benchmark ==="
echo "Testing: $DISK"
echo ""

# Sequential write test
echo "Sequential Write Test:"
fio --name=seq_write --filename=$TEST_DIR/fio_test \
    --rw=write --bs=1M --size=4G --numjobs=1 \
    --time_based --runtime=60 --group_reporting

# Sequential read test
echo ""
echo "Sequential Read Test:"
fio --name=seq_read --filename=$TEST_DIR/fio_test \
    --rw=read --bs=1M --size=4G --numjobs=1 \
    --time_based --runtime=60 --group_reporting

# Random write test (simulates small message writes)
echo ""
echo "Random Write Test (4K blocks):"
fio --name=rand_write --filename=$TEST_DIR/fio_test \
    --rw=randwrite --bs=4k --size=1G --numjobs=4 \
    --time_based --runtime=60 --group_reporting

# Cleanup
rm -f $TEST_DIR/fio_test
```

## Monitoring Dashboard Metrics

Key metrics to monitor for performance tuning:

```yaml
# prometheus-kafka-alerts.yml
groups:
  - name: kafka-performance
    rules:
      - alert: HighRequestQueueTime
        expr: kafka_network_requestmetrics_requestqueuetimems{quantile="0.99"} > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High request queue time on broker

      - alert: HighProduceLatency
        expr: kafka_network_requestmetrics_totaltimems{request="Produce",quantile="0.99"} > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High produce latency

      - alert: LowDiskThroughput
        expr: rate(kafka_server_brokertopicmetrics_bytesinpersec[5m]) < 10000000
        for: 10m
        labels:
          severity: info
        annotations:
          summary: Low disk throughput detected
```

## Best Practices Summary

### 1. Hardware Recommendations

- SSDs for log directories (NVMe preferred)
- Multiple disks for parallel I/O
- Dedicated network interfaces for replication
- At least 64GB RAM per broker

### 2. Configuration Checklist

```properties
# Production checklist
num.network.threads=8
num.io.threads=16
num.replica.fetchers=4
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
log.flush.interval.messages=10000
log.flush.interval.ms=1000
```

### 3. Regular Performance Testing

Run benchmarks regularly to detect performance degradation:

```bash
# Weekly performance test
bin/kafka-producer-perf-test.sh \
  --topic perf-test \
  --num-records 1000000 \
  --record-size 1024 \
  --throughput -1 \
  --producer-props bootstrap.servers=localhost:9092
```

## Conclusion

Kafka broker performance tuning requires attention to multiple layers - operating system, JVM, and Kafka configuration. Start with OS-level optimizations like file descriptors and network settings, then tune JVM garbage collection for predictable latency, and finally optimize Kafka-specific settings based on your workload characteristics. Regular benchmarking helps identify bottlenecks and validate tuning changes. Always test configuration changes in a staging environment before applying them to production.
