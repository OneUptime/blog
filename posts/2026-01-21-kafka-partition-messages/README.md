# How to Partition Messages Effectively in Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Partitioning, Message Keys, Custom Partitioner, Scalability, Java, Python

Description: A comprehensive guide to effective message partitioning in Kafka, covering key design strategies, custom partitioners, partition assignment, and best practices for scalable message distribution.

---

Partitioning is fundamental to Kafka's scalability and performance. Proper partition strategies ensure even load distribution, message ordering, and optimal consumer parallelism. This guide covers partition concepts, key design, custom partitioners, and best practices.

## Understanding Kafka Partitions

### Key Concepts

- **Partitions**: Ordered, immutable log segments within a topic
- **Partition Key**: Determines which partition receives a message
- **Ordering**: Messages with the same key go to the same partition, preserving order
- **Parallelism**: Each partition can be consumed by one consumer in a group

### Default Partitioning Behavior

Without a key, Kafka uses sticky partitioning (batching to same partition). With a key, it uses `murmur2(key) % numPartitions`.

## Key Design Strategies

### 1. Entity-Based Keys

```java
// User events - partition by user ID
producer.send(new ProducerRecord<>("user-events",
    userId,
    event));

// Order events - partition by order ID
producer.send(new ProducerRecord<>("orders",
    orderId,
    orderEvent));

// Device telemetry - partition by device ID
producer.send(new ProducerRecord<>("telemetry",
    deviceId,
    telemetryData));
```

### 2. Composite Keys

```java
// Combine multiple attributes
String compositeKey = tenantId + "-" + customerId;
producer.send(new ProducerRecord<>("events", compositeKey, event));

// Geographic partitioning
String geoKey = region + "-" + countryCode;
producer.send(new ProducerRecord<>("regional-data", geoKey, data));
```

### 3. Time-Based Keys

```java
// Partition by time window
String timeKey = LocalDate.now().toString();
producer.send(new ProducerRecord<>("daily-metrics", timeKey, metric));

// Hour-based partitioning
String hourKey = LocalDateTime.now()
    .truncatedTo(ChronoUnit.HOURS)
    .toString();
```

## Java Custom Partitioner

### Basic Custom Partitioner

```java
import org.apache.kafka.clients.producer.Partitioner;
import org.apache.kafka.common.Cluster;
import org.apache.kafka.common.PartitionInfo;
import java.util.List;
import java.util.Map;

public class CustomPartitioner implements Partitioner {

    @Override
    public void configure(Map<String, ?> configs) {
        // Initialize configuration
    }

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {

        List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
        int numPartitions = partitions.size();

        if (keyBytes == null) {
            // Round-robin for null keys
            return (int) (Math.random() * numPartitions);
        }

        // Custom partitioning logic
        String keyString = (String) key;
        return Math.abs(keyString.hashCode() % numPartitions);
    }

    @Override
    public void close() {
        // Cleanup resources
    }
}
```

### Priority-Based Partitioner

```java
import org.apache.kafka.clients.producer.Partitioner;
import org.apache.kafka.common.Cluster;
import org.apache.kafka.common.PartitionInfo;
import java.util.List;
import java.util.Map;

public class PriorityPartitioner implements Partitioner {
    private int highPriorityPartitions;
    private int totalPartitions;

    @Override
    public void configure(Map<String, ?> configs) {
        // Reserve first N partitions for high priority
        this.highPriorityPartitions = 3;
    }

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {

        List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
        totalPartitions = partitions.size();

        if (key == null) {
            return (int) (Math.random() * totalPartitions);
        }

        String keyString = (String) key;

        // High priority messages go to reserved partitions
        if (keyString.startsWith("HIGH:")) {
            String actualKey = keyString.substring(5);
            return Math.abs(actualKey.hashCode() % highPriorityPartitions);
        }

        // Normal messages go to remaining partitions
        int normalPartitions = totalPartitions - highPriorityPartitions;
        return highPriorityPartitions +
            Math.abs(keyString.hashCode() % normalPartitions);
    }

    @Override
    public void close() {}
}
```

### Region-Based Partitioner

```java
import org.apache.kafka.clients.producer.Partitioner;
import org.apache.kafka.common.Cluster;
import java.util.*;

public class RegionPartitioner implements Partitioner {
    private Map<String, List<Integer>> regionPartitions;

    @Override
    public void configure(Map<String, ?> configs) {
        // Map regions to partition ranges
        regionPartitions = new HashMap<>();
        regionPartitions.put("US", Arrays.asList(0, 1, 2, 3));
        regionPartitions.put("EU", Arrays.asList(4, 5, 6, 7));
        regionPartitions.put("APAC", Arrays.asList(8, 9, 10, 11));
    }

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {

        if (key == null) {
            int numPartitions = cluster.partitionsForTopic(topic).size();
            return (int) (Math.random() * numPartitions);
        }

        String keyString = (String) key;
        String[] parts = keyString.split(":");

        if (parts.length >= 2) {
            String region = parts[0];
            String entityId = parts[1];

            List<Integer> partitions = regionPartitions.get(region);
            if (partitions != null) {
                int index = Math.abs(entityId.hashCode() % partitions.size());
                return partitions.get(index);
            }
        }

        // Default partition
        return Math.abs(keyString.hashCode() %
            cluster.partitionsForTopic(topic).size());
    }

    @Override
    public void close() {}
}
```

### Using Custom Partitioner

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class CustomPartitionerProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");

        // Use custom partitioner
        props.put(ProducerConfig.PARTITIONER_CLASS_CONFIG,
            RegionPartitioner.class.getName());

        Producer<String, String> producer = new KafkaProducer<>(props);

        // Send with region-based key
        producer.send(new ProducerRecord<>("events",
            "US:user-123",
            "{\"event\": \"login\"}"));

        producer.send(new ProducerRecord<>("events",
            "EU:user-456",
            "{\"event\": \"purchase\"}"));

        producer.close();
    }
}
```

## Python Custom Partitioner

### Basic Partitioner

```python
from confluent_kafka import Producer
import json

def custom_partitioner(key, all_partitions, available_partitions):
    """Custom partitioner function."""
    if key is None:
        # Random partition for null keys
        import random
        return random.choice(available_partitions)

    # Hash-based partitioning
    key_str = key.decode('utf-8') if isinstance(key, bytes) else key
    partition = abs(hash(key_str)) % len(all_partitions)
    return partition


def create_producer_with_partitioner():
    config = {
        'bootstrap.servers': 'localhost:9092',
    }
    return Producer(config)


def send_with_partition(producer, topic, key, value, partitioner_func=None):
    """Send message with optional custom partitioner."""
    if partitioner_func:
        # Get partition count
        metadata = producer.list_topics(topic=topic)
        partitions = list(metadata.topics[topic].partitions.keys())
        partition = partitioner_func(key, partitions, partitions)

        producer.produce(
            topic,
            key=key,
            value=json.dumps(value) if isinstance(value, dict) else value,
            partition=partition
        )
    else:
        producer.produce(
            topic,
            key=key,
            value=json.dumps(value) if isinstance(value, dict) else value
        )


def main():
    producer = create_producer_with_partitioner()

    # Send with custom partitioner
    send_with_partition(
        producer,
        'events',
        'user-123',
        {'event': 'login'},
        custom_partitioner
    )

    producer.flush()


if __name__ == '__main__':
    main()
```

### Priority Partitioner in Python

```python
from confluent_kafka import Producer
import json

class PriorityPartitioner:
    def __init__(self, high_priority_partitions=3):
        self.high_priority_partitions = high_priority_partitions

    def partition(self, key, all_partitions, available_partitions):
        total_partitions = len(all_partitions)

        if key is None:
            import random
            return random.choice(available_partitions)

        key_str = key.decode('utf-8') if isinstance(key, bytes) else key

        if key_str.startswith('HIGH:'):
            # High priority - use first N partitions
            actual_key = key_str[5:]
            return abs(hash(actual_key)) % self.high_priority_partitions
        else:
            # Normal priority - use remaining partitions
            normal_partitions = total_partitions - self.high_priority_partitions
            return self.high_priority_partitions + \
                   abs(hash(key_str)) % normal_partitions


class PartitionedProducer:
    def __init__(self, bootstrap_servers, partitioner=None):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
        }
        self.producer = Producer(self.config)
        self.partitioner = partitioner
        self._partition_cache = {}

    def _get_partitions(self, topic):
        if topic not in self._partition_cache:
            metadata = self.producer.list_topics(topic=topic)
            self._partition_cache[topic] = list(
                metadata.topics[topic].partitions.keys())
        return self._partition_cache[topic]

    def send(self, topic, key, value):
        partitions = self._get_partitions(topic)

        if self.partitioner:
            partition = self.partitioner.partition(key, partitions, partitions)
        else:
            partition = None

        self.producer.produce(
            topic,
            key=key.encode() if isinstance(key, str) else key,
            value=json.dumps(value) if isinstance(value, dict) else value,
            partition=partition
        )

    def flush(self):
        self.producer.flush()


def main():
    partitioner = PriorityPartitioner(high_priority_partitions=3)
    producer = PartitionedProducer('localhost:9092', partitioner)

    # High priority message
    producer.send('events', 'HIGH:order-123', {'type': 'urgent_order'})

    # Normal priority message
    producer.send('events', 'order-456', {'type': 'regular_order'})

    producer.flush()


if __name__ == '__main__':
    main()
```

## Node.js Custom Partitioner

```javascript
const { Kafka, Partitioners } = require('kafkajs');

// Custom partitioner
const regionPartitioner = () => {
  const regionMapping = {
    'US': [0, 1, 2, 3],
    'EU': [4, 5, 6, 7],
    'APAC': [8, 9, 10, 11],
  };

  return ({ topic, partitionMetadata, message }) => {
    const numPartitions = partitionMetadata.length;

    if (!message.key) {
      return Math.floor(Math.random() * numPartitions);
    }

    const key = message.key.toString();
    const [region, entityId] = key.split(':');

    const partitions = regionMapping[region];
    if (partitions) {
      const hash = hashCode(entityId || key);
      const index = Math.abs(hash) % partitions.length;
      return partitions[index];
    }

    return Math.abs(hashCode(key)) % numPartitions;
  };
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// Usage
const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer({
  createPartitioner: regionPartitioner,
});

async function main() {
  await producer.connect();

  await producer.send({
    topic: 'events',
    messages: [
      { key: 'US:user-123', value: JSON.stringify({ event: 'login' }) },
      { key: 'EU:user-456', value: JSON.stringify({ event: 'purchase' }) },
    ],
  });

  await producer.disconnect();
}

main().catch(console.error);
```

## Handling Partition Hotspots

### Detecting Hotspots

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.TopicPartition;
import java.util.*;

public class PartitionMonitor {
    private final AdminClient admin;

    public PartitionMonitor(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.admin = AdminClient.create(props);
    }

    public Map<Integer, Long> getPartitionSizes(String topic) throws Exception {
        Map<TopicPartition, OffsetSpec> requestMap = new HashMap<>();

        // Get partition info
        DescribeTopicsResult topicResult =
            admin.describeTopics(Collections.singletonList(topic));
        TopicDescription description = topicResult.all().get().get(topic);

        for (var partition : description.partitions()) {
            requestMap.put(
                new TopicPartition(topic, partition.partition()),
                OffsetSpec.latest()
            );
        }

        // Get end offsets
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> endOffsets =
            admin.listOffsets(requestMap).all().get();

        // Get beginning offsets
        for (var tp : requestMap.keySet()) {
            requestMap.put(tp, OffsetSpec.earliest());
        }
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> beginOffsets =
            admin.listOffsets(requestMap).all().get();

        // Calculate sizes
        Map<Integer, Long> sizes = new HashMap<>();
        for (var entry : endOffsets.entrySet()) {
            int partition = entry.getKey().partition();
            long end = entry.getValue().offset();
            long begin = beginOffsets.get(entry.getKey()).offset();
            sizes.put(partition, end - begin);
        }

        return sizes;
    }

    public void printPartitionDistribution(String topic) throws Exception {
        Map<Integer, Long> sizes = getPartitionSizes(topic);

        long total = sizes.values().stream().mapToLong(Long::longValue).sum();
        double average = total / (double) sizes.size();

        System.out.println("Partition Distribution for " + topic + ":");
        for (var entry : sizes.entrySet()) {
            double percentage = (entry.getValue() / (double) total) * 100;
            String status = entry.getValue() > average * 2 ? " [HOTSPOT]" : "";
            System.out.printf("  Partition %d: %d messages (%.1f%%)%s%n",
                entry.getKey(), entry.getValue(), percentage, status);
        }
    }

    public void close() {
        admin.close();
    }
}
```

### Mitigating Hotspots

```java
// Add random suffix to spread load
public class SpreadPartitioner implements Partitioner {
    private static final int SPREAD_FACTOR = 10;

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {

        if (key == null) {
            return new Random().nextInt(cluster.partitionsForTopic(topic).size());
        }

        // Add random suffix to hot keys
        String keyStr = (String) key;
        String spreadKey = keyStr + "-" + (System.nanoTime() % SPREAD_FACTOR);

        return Math.abs(spreadKey.hashCode() %
            cluster.partitionsForTopic(topic).size());
    }

    @Override
    public void configure(Map<String, ?> configs) {}

    @Override
    public void close() {}
}
```

## Best Practices

### 1. Choose Keys Carefully

```java
// Good: Even distribution, meaningful grouping
String key = customerId;  // Orders by customer

// Bad: Skewed distribution
String key = countryCode;  // US might have 80% of traffic

// Better: Add granularity
String key = countryCode + "-" + stateCode + "-" + customerId;
```

### 2. Consider Ordering Requirements

```java
// When ordering matters - use entity ID
producer.send(new ProducerRecord<>("orders", orderId, orderEvent));

// When ordering doesn't matter - use null key for better distribution
producer.send(new ProducerRecord<>("logs", null, logEntry));
```

### 3. Plan for Partition Count Changes

```java
// Changing partition count affects key-to-partition mapping
// Existing messages won't move, but new messages may go elsewhere

// Solution: Over-provision partitions initially
// Or use consistent hashing
```

### 4. Monitor Partition Balance

```bash
# Check partition sizes
kafka-log-dirs.sh --bootstrap-server localhost:9092 \
  --topic-list my-topic --describe

# Check consumer lag per partition
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --describe
```

## Conclusion

Effective partitioning is crucial for Kafka performance and scalability:

1. **Design keys thoughtfully** - Balance distribution with ordering needs
2. **Use custom partitioners** - When default behavior doesn't fit
3. **Monitor for hotspots** - Detect and address skewed partitions
4. **Plan partition count** - Consider future scaling needs

Choose your partitioning strategy based on your specific requirements for message ordering, load distribution, and consumer parallelism.
