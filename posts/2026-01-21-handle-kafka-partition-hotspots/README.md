# How to Handle Kafka Partition Hotspots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Partition Hotspots, Load Balancing, Performance, Data Skew, Partitioning Strategy

Description: A comprehensive guide to detecting and fixing Apache Kafka partition hotspots, including key design strategies, custom partitioners, and monitoring techniques.

---

Partition hotspots occur when messages are unevenly distributed across Kafka partitions, causing some partitions to receive significantly more traffic than others. This leads to uneven broker load, consumer lag, and performance degradation. This guide covers how to detect, prevent, and fix partition hotspots.

## Understanding Partition Hotspots

Hotspots typically occur due to:

- **Key skew**: Some keys receive far more messages than others
- **Poor key design**: Using low-cardinality keys
- **Default partitioner**: Hash-based partitioning with skewed key distribution
- **Time-based patterns**: Traffic spikes for specific keys at certain times

## Detecting Partition Hotspots

### Java Detection Tool

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

public class PartitionHotspotDetector {

    private final AdminClient adminClient;
    private final String bootstrapServers;

    public PartitionHotspotDetector(String bootstrapServers) {
        this.bootstrapServers = bootstrapServers;
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.adminClient = AdminClient.create(props);
    }

    public Map<Integer, PartitionMetrics> analyzePartitions(String topic)
            throws ExecutionException, InterruptedException {

        Map<Integer, PartitionMetrics> metrics = new HashMap<>();

        // Get topic description
        TopicDescription description = adminClient
            .describeTopics(Collections.singletonList(topic))
            .topicNameValues()
            .get(topic)
            .get();

        // Prepare offset queries
        Map<TopicPartition, OffsetSpec> earliestOffsets = new HashMap<>();
        Map<TopicPartition, OffsetSpec> latestOffsets = new HashMap<>();

        for (int i = 0; i < description.partitions().size(); i++) {
            TopicPartition tp = new TopicPartition(topic, i);
            earliestOffsets.put(tp, OffsetSpec.earliest());
            latestOffsets.put(tp, OffsetSpec.latest());
        }

        // Get offsets
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> earliest =
            adminClient.listOffsets(earliestOffsets).all().get();
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> latest =
            adminClient.listOffsets(latestOffsets).all().get();

        // Calculate metrics
        long totalMessages = 0;
        for (int i = 0; i < description.partitions().size(); i++) {
            TopicPartition tp = new TopicPartition(topic, i);

            long earliestOffset = earliest.get(tp).offset();
            long latestOffset = latest.get(tp).offset();
            long messageCount = latestOffset - earliestOffset;

            int leader = description.partitions().get(i).leader().id();

            metrics.put(i, new PartitionMetrics(i, messageCount, leader,
                earliestOffset, latestOffset));
            totalMessages += messageCount;
        }

        // Calculate distribution percentages
        for (PartitionMetrics pm : metrics.values()) {
            pm.setPercentage(totalMessages > 0 ?
                (pm.messageCount * 100.0 / totalMessages) : 0);
        }

        return metrics;
    }

    public void printHotspotReport(String topic)
            throws ExecutionException, InterruptedException {

        Map<Integer, PartitionMetrics> metrics = analyzePartitions(topic);

        // Calculate statistics
        List<Long> counts = metrics.values().stream()
            .map(m -> m.messageCount)
            .collect(Collectors.toList());

        long total = counts.stream().mapToLong(Long::longValue).sum();
        double average = total / (double) counts.size();
        double stdDev = calculateStdDev(counts, average);

        // Determine expected percentage
        double expectedPct = 100.0 / metrics.size();

        System.out.println("\n" + "=".repeat(70));
        System.out.println("PARTITION HOTSPOT ANALYSIS: " + topic);
        System.out.println("=".repeat(70));

        System.out.printf("%n%-12s %-15s %-12s %-12s %-10s%n",
            "Partition", "Messages", "Percentage", "Leader", "Status");
        System.out.println("-".repeat(70));

        for (int i = 0; i < metrics.size(); i++) {
            PartitionMetrics pm = metrics.get(i);
            String status = getHotspotStatus(pm.percentage, expectedPct);

            System.out.printf("%-12d %-15d %-12.2f%% %-12d %-10s%n",
                pm.partition, pm.messageCount, pm.percentage, pm.leader, status);
        }

        System.out.println("-".repeat(70));
        System.out.printf("Total Messages: %d%n", total);
        System.out.printf("Average per partition: %.0f%n", average);
        System.out.printf("Standard Deviation: %.2f%n", stdDev);
        System.out.printf("Coefficient of Variation: %.2f%%%n",
            (stdDev / average) * 100);

        // Identify hotspots
        System.out.println("\nHOTSPOT SUMMARY:");
        int hotspots = 0;
        int coldspots = 0;

        for (PartitionMetrics pm : metrics.values()) {
            if (pm.percentage > expectedPct * 1.5) {
                System.out.printf("  HOT: Partition %d has %.2fx expected load%n",
                    pm.partition, pm.percentage / expectedPct);
                hotspots++;
            } else if (pm.percentage < expectedPct * 0.5) {
                System.out.printf("  COLD: Partition %d has %.2fx expected load%n",
                    pm.partition, pm.percentage / expectedPct);
                coldspots++;
            }
        }

        if (hotspots == 0 && coldspots == 0) {
            System.out.println("  No significant hotspots detected");
        }
    }

    private String getHotspotStatus(double actual, double expected) {
        double ratio = actual / expected;
        if (ratio > 2.0) return "HOT";
        if (ratio > 1.5) return "WARM";
        if (ratio < 0.5) return "COLD";
        return "OK";
    }

    private double calculateStdDev(List<Long> values, double mean) {
        double sumSquaredDiff = values.stream()
            .mapToDouble(v -> Math.pow(v - mean, 2))
            .sum();
        return Math.sqrt(sumSquaredDiff / values.size());
    }

    public void close() {
        adminClient.close();
    }

    static class PartitionMetrics {
        int partition;
        long messageCount;
        int leader;
        long earliestOffset;
        long latestOffset;
        double percentage;

        PartitionMetrics(int partition, long messageCount, int leader,
                        long earliestOffset, long latestOffset) {
            this.partition = partition;
            this.messageCount = messageCount;
            this.leader = leader;
            this.earliestOffset = earliestOffset;
            this.latestOffset = latestOffset;
        }

        void setPercentage(double percentage) {
            this.percentage = percentage;
        }
    }

    public static void main(String[] args) throws Exception {
        PartitionHotspotDetector detector =
            new PartitionHotspotDetector("localhost:9092");

        try {
            detector.printHotspotReport("my-topic");
        } finally {
            detector.close();
        }
    }
}
```

### Python Detection Tool

```python
from confluent_kafka import Consumer, TopicPartition
from confluent_kafka.admin import AdminClient
import statistics
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class PartitionStats:
    partition: int
    message_count: int
    leader: int
    percentage: float = 0.0

class HotspotDetector:
    def __init__(self, bootstrap_servers: str):
        self.admin_client = AdminClient({
            'bootstrap.servers': bootstrap_servers
        })
        self.bootstrap_servers = bootstrap_servers

    def get_partition_distribution(self, topic: str) -> Dict[int, PartitionStats]:
        """Analyze message distribution across partitions."""
        metadata = self.admin_client.list_topics(timeout=10)

        if topic not in metadata.topics:
            raise ValueError(f"Topic {topic} not found")

        topic_metadata = metadata.topics[topic]
        num_partitions = len(topic_metadata.partitions)

        # Create consumer to get offsets
        consumer = Consumer({
            'bootstrap.servers': self.bootstrap_servers,
            'group.id': 'hotspot-detector',
            'enable.auto.commit': False
        })

        stats = {}
        total_messages = 0

        for partition_id in range(num_partitions):
            tp = TopicPartition(topic, partition_id)

            # Get watermarks
            low, high = consumer.get_watermark_offsets(tp)
            message_count = high - low

            # Get leader
            partition_info = topic_metadata.partitions[partition_id]
            leader = partition_info.leader

            stats[partition_id] = PartitionStats(
                partition=partition_id,
                message_count=message_count,
                leader=leader
            )
            total_messages += message_count

        consumer.close()

        # Calculate percentages
        for stat in stats.values():
            stat.percentage = (stat.message_count / total_messages * 100
                             if total_messages > 0 else 0)

        return stats

    def detect_hotspots(self, topic: str,
                       threshold: float = 1.5) -> Tuple[List[int], List[int]]:
        """Detect hot and cold partitions."""
        stats = self.get_partition_distribution(topic)
        num_partitions = len(stats)
        expected_pct = 100.0 / num_partitions

        hotspots = []
        coldspots = []

        for partition_id, stat in stats.items():
            if stat.percentage > expected_pct * threshold:
                hotspots.append(partition_id)
            elif stat.percentage < expected_pct / threshold:
                coldspots.append(partition_id)

        return hotspots, coldspots

    def print_report(self, topic: str):
        """Print detailed hotspot analysis report."""
        stats = self.get_partition_distribution(topic)
        num_partitions = len(stats)
        expected_pct = 100.0 / num_partitions

        counts = [s.message_count for s in stats.values()]
        total = sum(counts)
        avg = statistics.mean(counts) if counts else 0
        std_dev = statistics.stdev(counts) if len(counts) > 1 else 0

        print("\n" + "=" * 70)
        print(f"PARTITION HOTSPOT ANALYSIS: {topic}")
        print("=" * 70)

        print(f"\n{'Partition':<12} {'Messages':<15} {'Percentage':<12} "
              f"{'Leader':<12} {'Status':<10}")
        print("-" * 70)

        for partition_id in sorted(stats.keys()):
            stat = stats[partition_id]
            ratio = stat.percentage / expected_pct if expected_pct > 0 else 0

            if ratio > 2.0:
                status = "HOT"
            elif ratio > 1.5:
                status = "WARM"
            elif ratio < 0.5:
                status = "COLD"
            else:
                status = "OK"

            print(f"{stat.partition:<12} {stat.message_count:<15} "
                  f"{stat.percentage:<11.2f}% {stat.leader:<12} {status:<10}")

        print("-" * 70)
        print(f"Total Messages: {total:,}")
        print(f"Average per partition: {avg:,.0f}")
        print(f"Standard Deviation: {std_dev:,.2f}")
        print(f"Coefficient of Variation: {(std_dev/avg*100) if avg > 0 else 0:.2f}%")

        # Hotspot summary
        print("\nHOTSPOT SUMMARY:")
        hotspots, coldspots = self.detect_hotspots(topic)

        if hotspots:
            for p in hotspots:
                ratio = stats[p].percentage / expected_pct
                print(f"  HOT: Partition {p} has {ratio:.2f}x expected load")

        if coldspots:
            for p in coldspots:
                ratio = stats[p].percentage / expected_pct
                print(f"  COLD: Partition {p} has {ratio:.2f}x expected load")

        if not hotspots and not coldspots:
            print("  No significant hotspots detected")


def main():
    detector = HotspotDetector("localhost:9092")
    detector.print_report("my-topic")


if __name__ == '__main__':
    main()
```

## Preventing Hotspots with Better Key Design

### Key Design Principles

```java
public class KeyDesignExamples {

    // BAD: Low cardinality key
    public String badKey_Country(String country) {
        return country;  // Only ~200 possible values
    }

    // GOOD: Compound key for better distribution
    public String goodKey_CountryUser(String country, String userId) {
        return country + "-" + userId;
    }

    // BAD: Time-based key with hour granularity
    public String badKey_HourBucket(long timestamp) {
        return String.valueOf(timestamp / 3600000);  // All traffic in same hour goes to same partition
    }

    // GOOD: Add randomness or user identifier
    public String goodKey_TimeUser(long timestamp, String userId) {
        return String.format("%d-%s", timestamp / 3600000, userId);
    }

    // GOOD: Use random suffix for high-volume keys
    public String goodKey_WithSalt(String baseKey, int numBuckets) {
        int salt = ThreadLocalRandom.current().nextInt(numBuckets);
        return baseKey + "-" + salt;
    }
}
```

### Salted Key Strategy

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;
import java.util.concurrent.ThreadLocalRandom;

public class SaltedKeyProducer {

    private final KafkaProducer<String, String> producer;
    private final int saltBuckets;

    public SaltedKeyProducer(String bootstrapServers, int saltBuckets) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        this.producer = new KafkaProducer<>(props);
        this.saltBuckets = saltBuckets;
    }

    public void sendWithSaltedKey(String topic, String baseKey, String value) {
        // Add random salt to distribute hot keys
        int salt = ThreadLocalRandom.current().nextInt(saltBuckets);
        String saltedKey = baseKey + "#" + salt;

        producer.send(new ProducerRecord<>(topic, saltedKey, value),
            (metadata, exception) -> {
                if (exception != null) {
                    System.err.println("Send failed: " + exception.getMessage());
                }
            });
    }

    public void close() {
        producer.close();
    }

    public static void main(String[] args) {
        // Use 10 salt buckets to spread a hot key across ~10 partitions
        SaltedKeyProducer producer = new SaltedKeyProducer("localhost:9092", 10);

        try {
            // Hot key "user-123" will now be spread across partitions
            for (int i = 0; i < 100000; i++) {
                producer.sendWithSaltedKey("orders", "user-123",
                    "order-" + i);
            }
        } finally {
            producer.close();
        }
    }
}
```

## Custom Partitioners

### Power of Two Choices Partitioner

```java
import org.apache.kafka.clients.producer.Partitioner;
import org.apache.kafka.common.Cluster;
import org.apache.kafka.common.PartitionInfo;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;

public class PowerOfTwoChoicesPartitioner implements Partitioner {

    // Track approximate message counts per partition
    private final ConcurrentHashMap<String, AtomicLong[]> partitionCounts =
        new ConcurrentHashMap<>();

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {

        List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
        int numPartitions = partitions.size();

        // Initialize counters for topic
        partitionCounts.computeIfAbsent(topic, t -> {
            AtomicLong[] counts = new AtomicLong[numPartitions];
            for (int i = 0; i < numPartitions; i++) {
                counts[i] = new AtomicLong(0);
            }
            return counts;
        });

        AtomicLong[] counts = partitionCounts.get(topic);

        if (keyBytes == null) {
            // No key: use power of two choices
            int choice1 = ThreadLocalRandom.current().nextInt(numPartitions);
            int choice2 = ThreadLocalRandom.current().nextInt(numPartitions);

            // Pick the partition with fewer messages
            int chosen = counts[choice1].get() <= counts[choice2].get() ?
                choice1 : choice2;

            counts[chosen].incrementAndGet();
            return chosen;
        }

        // With key: use standard hash partitioning
        return Math.abs(Arrays.hashCode(keyBytes) % numPartitions);
    }

    @Override
    public void close() {
        partitionCounts.clear();
    }

    @Override
    public void configure(Map<String, ?> configs) {}
}
```

### Weighted Round Robin Partitioner

```java
import org.apache.kafka.clients.producer.Partitioner;
import org.apache.kafka.common.Cluster;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class WeightedRoundRobinPartitioner implements Partitioner {

    private final AtomicInteger counter = new AtomicInteger(0);
    private int[] weights;
    private int totalWeight;

    @Override
    public void configure(Map<String, ?> configs) {
        // Configure weights per partition
        // Format: "partition_weights" -> "1,2,1,1" (partition 1 gets 2x traffic)
        String weightStr = (String) configs.get("partition_weights");
        if (weightStr != null) {
            String[] parts = weightStr.split(",");
            weights = new int[parts.length];
            totalWeight = 0;
            for (int i = 0; i < parts.length; i++) {
                weights[i] = Integer.parseInt(parts[i].trim());
                totalWeight += weights[i];
            }
        }
    }

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {

        int numPartitions = cluster.partitionsForTopic(topic).size();

        if (keyBytes != null) {
            // Key-based partitioning
            return Math.abs(Arrays.hashCode(keyBytes) % numPartitions);
        }

        if (weights == null || weights.length != numPartitions) {
            // Default to round-robin
            return Math.abs(counter.getAndIncrement() % numPartitions);
        }

        // Weighted selection
        int position = Math.abs(counter.getAndIncrement() % totalWeight);
        int cumulative = 0;

        for (int i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (position < cumulative) {
                return i;
            }
        }

        return 0;
    }

    @Override
    public void close() {}
}
```

## Python Custom Partitioner

```python
from confluent_kafka import Producer
import random
from typing import Optional
import hashlib

class HotspotAwareProducer:
    def __init__(self, bootstrap_servers: str, num_partitions: int):
        self.num_partitions = num_partitions
        self.partition_counts = [0] * num_partitions

        # Confluent Kafka doesn't support custom partitioners directly,
        # so we implement it in the produce call
        self.producer = Producer({
            'bootstrap.servers': bootstrap_servers,
        })

    def _power_of_two_choices(self) -> int:
        """Select partition using power of two choices algorithm."""
        choice1 = random.randint(0, self.num_partitions - 1)
        choice2 = random.randint(0, self.num_partitions - 1)

        # Pick the less loaded partition
        if self.partition_counts[choice1] <= self.partition_counts[choice2]:
            return choice1
        return choice2

    def _hash_partition(self, key: bytes) -> int:
        """Hash-based partition selection."""
        hash_value = int(hashlib.md5(key).hexdigest(), 16)
        return hash_value % self.num_partitions

    def produce(self, topic: str, key: Optional[str], value: str,
               use_load_balancing: bool = True):
        """Produce message with hotspot-aware partitioning."""

        if key is not None:
            # Use hash partitioning for keyed messages
            partition = self._hash_partition(key.encode())
        elif use_load_balancing:
            # Use power of two choices for keyless messages
            partition = self._power_of_two_choices()
        else:
            # Random partition
            partition = random.randint(0, self.num_partitions - 1)

        self.partition_counts[partition] += 1

        self.producer.produce(
            topic,
            key=key.encode() if key else None,
            value=value.encode(),
            partition=partition
        )

    def produce_with_salted_key(self, topic: str, base_key: str,
                                value: str, salt_buckets: int = 10):
        """Produce with salted key to spread hot keys."""
        salt = random.randint(0, salt_buckets - 1)
        salted_key = f"{base_key}#{salt}"

        self.producer.produce(
            topic,
            key=salted_key.encode(),
            value=value.encode()
        )

    def flush(self):
        self.producer.flush()

    def get_partition_distribution(self) -> dict:
        """Get current partition distribution."""
        total = sum(self.partition_counts)
        return {
            i: {
                'count': count,
                'percentage': (count / total * 100) if total > 0 else 0
            }
            for i, count in enumerate(self.partition_counts)
        }


def main():
    producer = HotspotAwareProducer("localhost:9092", 12)

    # Simulate producing messages
    for i in range(100000):
        # Some messages with hot key
        if i % 100 < 80:
            producer.produce_with_salted_key("orders", "hot-user", f"order-{i}")
        else:
            producer.produce("orders", f"user-{i}", f"order-{i}")

    producer.flush()

    # Print distribution
    print("\nPartition Distribution:")
    for partition, stats in producer.get_partition_distribution().items():
        print(f"  Partition {partition}: {stats['count']} ({stats['percentage']:.2f}%)")


if __name__ == '__main__':
    main()
```

## Monitoring and Alerting

### Prometheus Metrics for Hotspot Detection

```yaml
# prometheus-rules.yml
groups:
  - name: kafka-hotspot-detection
    rules:
      # Alert when partition has 2x expected traffic
      - alert: KafkaPartitionHotspot
        expr: |
          (
            kafka_server_brokertopicmetrics_messagesinpersec{partition!=""}
            / ignoring(partition)
            group_left avg without(partition)(kafka_server_brokertopicmetrics_messagesinpersec)
          ) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Partition hotspot detected"
          description: "Partition {{ $labels.partition }} of topic {{ $labels.topic }} has {{ $value | humanize }}x average traffic"

      # Alert on high partition skew
      - alert: KafkaPartitionSkew
        expr: |
          stddev by(topic)(kafka_server_brokertopicmetrics_messagesinpersec{partition!=""})
          / avg by(topic)(kafka_server_brokertopicmetrics_messagesinpersec{partition!=""})
          > 0.5
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High partition skew detected"
          description: "Topic {{ $labels.topic }} has coefficient of variation {{ $value | humanize }}"
```

## Remediation Strategies

### 1. Increase Partition Count

```bash
# Increase partitions (cannot be reversed!)
bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --alter --topic my-topic --partitions 24
```

### 2. Migrate to Better Key Design

```java
// Migration strategy: dual-write during transition
public class KeyMigrationProducer {

    private final KafkaProducer<String, String> producer;
    private final boolean useLegacyKey;

    public void send(String topic, String legacyKey, String userId, String value) {
        String key;
        if (useLegacyKey) {
            key = legacyKey;  // Old key design
        } else {
            key = legacyKey + "-" + userId;  // New compound key
        }

        producer.send(new ProducerRecord<>(topic, key, value));
    }
}
```

### 3. Consumer-Side Aggregation

```python
# If hotspot is unavoidable, add more consumers for hot partitions
# using manual partition assignment

from confluent_kafka import Consumer, TopicPartition

class HotspotConsumer:
    def __init__(self, bootstrap_servers: str, hot_partitions: list):
        self.consumer = Consumer({
            'bootstrap.servers': bootstrap_servers,
            'group.id': 'hotspot-consumer',
            'enable.auto.commit': True
        })

        # Manually assign hot partitions to this consumer
        partitions = [TopicPartition('my-topic', p) for p in hot_partitions]
        self.consumer.assign(partitions)

    def consume(self):
        while True:
            msg = self.consumer.poll(1.0)
            if msg and not msg.error():
                self.process(msg)

    def process(self, msg):
        # Process message
        pass
```

## Best Practices

1. **Design keys carefully**: Use high-cardinality keys with even distribution
2. **Monitor continuously**: Set up alerts for partition skew
3. **Use salting for hot keys**: Add random suffixes when ordering is not required
4. **Consider custom partitioners**: Implement load-aware partitioning
5. **Plan for growth**: Start with enough partitions to allow redistribution
6. **Test with production-like data**: Validate key distribution before deployment

## Conclusion

Kafka partition hotspots can significantly impact cluster performance and consumer lag. The key to avoiding hotspots is thoughtful key design, continuous monitoring, and proactive remediation. Use the detection tools and strategies in this guide to identify hotspots early and implement appropriate fixes, whether through better key design, custom partitioners, or infrastructure changes.
