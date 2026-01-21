# How to Build Scalable Kafka Consumer Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Consumer Groups, Scalability, Partition Assignment, Rebalancing, Java, Python

Description: A comprehensive guide to building scalable Kafka consumer groups, covering partition assignment strategies, rebalancing behavior, consumer configuration, and best practices for high-throughput message consumption.

---

Consumer groups are Kafka's mechanism for parallel message consumption. Understanding how to configure and scale consumer groups is essential for building high-performance streaming applications. This guide covers consumer group internals, configuration, and scaling strategies.

## Understanding Consumer Groups

### Key Concepts

- **Consumer Group**: Logical grouping of consumers sharing workload
- **Group Coordinator**: Broker managing group membership and assignments
- **Partition Assignment**: Distribution of partitions among consumers
- **Rebalancing**: Redistribution when consumers join or leave

### Fundamental Rules

1. Each partition is consumed by exactly one consumer in a group
2. A consumer can consume from multiple partitions
3. Maximum parallelism equals the number of partitions
4. Consumers across different groups read independently

## Basic Consumer Group Setup

### Java Consumer Group

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.StringDeserializer;
import java.time.Duration;
import java.util.*;

public class ScalableConsumer {
    private final Consumer<String, String> consumer;
    private volatile boolean running = true;

    public ScalableConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());

        // Consumer group settings
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true");
        props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, "5000");

        // Session and heartbeat
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, "30000");
        props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, "10000");

        // Poll settings
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, "500");
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, "300000");

        this.consumer = new KafkaConsumer<>(props);
    }

    public void subscribe(String... topics) {
        consumer.subscribe(Arrays.asList(topics));
    }

    public void consume(MessageHandler handler) {
        try {
            while (running) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    handler.handle(record);
                }
            }
        } finally {
            consumer.close();
        }
    }

    public void shutdown() {
        running = false;
        consumer.wakeup();
    }

    interface MessageHandler {
        void handle(ConsumerRecord<String, String> record);
    }

    public static void main(String[] args) {
        ScalableConsumer consumer = new ScalableConsumer(
            "localhost:9092", "my-consumer-group");

        Runtime.getRuntime().addShutdownHook(new Thread(consumer::shutdown));

        consumer.subscribe("orders");
        consumer.consume(record -> {
            System.out.printf("Partition: %d, Offset: %d, Value: %s%n",
                record.partition(), record.offset(), record.value());
        });
    }
}
```

### Python Consumer Group

```python
from confluent_kafka import Consumer, KafkaError
import json
import signal
import sys

class ScalableConsumer:
    def __init__(self, bootstrap_servers, group_id):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': True,
            'auto.commit.interval.ms': 5000,
            'session.timeout.ms': 30000,
            'heartbeat.interval.ms': 10000,
            'max.poll.interval.ms': 300000,
        }
        self.consumer = Consumer(self.config)
        self.running = True

    def subscribe(self, topics):
        self.consumer.subscribe(topics)

    def consume(self, handler):
        try:
            while self.running:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    print(f"Error: {msg.error()}")
                    continue

                handler(msg)

        finally:
            self.consumer.close()

    def shutdown(self):
        self.running = False


def main():
    consumer = ScalableConsumer('localhost:9092', 'my-consumer-group')

    def signal_handler(sig, frame):
        consumer.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    def handler(msg):
        print(f"Partition: {msg.partition()}, Offset: {msg.offset()}, "
              f"Value: {msg.value().decode()}")

    consumer.subscribe(['orders'])
    consumer.consume(handler)


if __name__ == '__main__':
    main()
```

## Partition Assignment Strategies

### Range Assignor (Default)

Assigns partitions in ranges, good for co-partitioned topics.

```java
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    "org.apache.kafka.clients.consumer.RangeAssignor");
```

### Round Robin Assignor

Distributes partitions evenly across consumers.

```java
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    "org.apache.kafka.clients.consumer.RoundRobinAssignor");
```

### Sticky Assignor

Minimizes partition movement during rebalance.

```java
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    "org.apache.kafka.clients.consumer.StickyAssignor");
```

### Cooperative Sticky Assignor

Incremental rebalancing without stop-the-world behavior.

```java
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
```

### Comparison

| Strategy | Rebalance Impact | Distribution | Best For |
|----------|------------------|--------------|----------|
| Range | High | By topic ranges | Co-partitioned topics |
| RoundRobin | High | Even | Single topic subscriptions |
| Sticky | Medium | Even, minimized movement | General use |
| CooperativeSticky | Low | Even, incremental | Production systems |

## Handling Rebalances

### Rebalance Listener

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import java.util.*;

public class RebalanceAwareConsumer {
    private final Consumer<String, String> consumer;
    private final Map<TopicPartition, Long> currentOffsets = new HashMap<>();

    public RebalanceAwareConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
            CooperativeStickyAssignor.class.getName());

        this.consumer = new KafkaConsumer<>(props);
    }

    public void subscribe(String topic) {
        consumer.subscribe(Collections.singletonList(topic),
            new ConsumerRebalanceListener() {
                @Override
                public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
                    System.out.println("Partitions revoked: " + partitions);

                    // Commit offsets before losing partitions
                    Map<TopicPartition, OffsetAndMetadata> offsetsToCommit =
                        new HashMap<>();
                    for (TopicPartition tp : partitions) {
                        Long offset = currentOffsets.get(tp);
                        if (offset != null) {
                            offsetsToCommit.put(tp,
                                new OffsetAndMetadata(offset + 1));
                        }
                    }
                    if (!offsetsToCommit.isEmpty()) {
                        consumer.commitSync(offsetsToCommit);
                    }

                    // Cleanup resources for revoked partitions
                    partitions.forEach(currentOffsets::remove);
                }

                @Override
                public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
                    System.out.println("Partitions assigned: " + partitions);

                    // Initialize resources for new partitions
                    for (TopicPartition tp : partitions) {
                        // Optional: seek to specific position
                        // consumer.seek(tp, specificOffset);
                    }
                }

                @Override
                public void onPartitionsLost(Collection<TopicPartition> partitions) {
                    // Called when partitions are lost due to consumer failure
                    System.out.println("Partitions lost: " + partitions);
                    partitions.forEach(currentOffsets::remove);
                }
            });
    }

    public void consume() {
        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, String> record : records) {
                    // Process record
                    processRecord(record);

                    // Track offset
                    currentOffsets.put(
                        new TopicPartition(record.topic(), record.partition()),
                        record.offset()
                    );
                }

                // Periodic commit
                if (!currentOffsets.isEmpty()) {
                    Map<TopicPartition, OffsetAndMetadata> offsetsToCommit =
                        new HashMap<>();
                    currentOffsets.forEach((tp, offset) ->
                        offsetsToCommit.put(tp, new OffsetAndMetadata(offset + 1)));
                    consumer.commitAsync(offsetsToCommit, null);
                }
            }
        } finally {
            consumer.close();
        }
    }

    private void processRecord(ConsumerRecord<String, String> record) {
        System.out.printf("Processing: partition=%d, offset=%d%n",
            record.partition(), record.offset());
    }
}
```

### Python Rebalance Handling

```python
from confluent_kafka import Consumer, TopicPartition
from typing import List

class RebalanceAwareConsumer:
    def __init__(self, bootstrap_servers, group_id):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
            'partition.assignment.strategy': 'cooperative-sticky',
        }
        self.consumer = Consumer(self.config)
        self.current_offsets = {}

    def on_assign(self, consumer, partitions: List[TopicPartition]):
        print(f"Partitions assigned: {partitions}")
        for p in partitions:
            # Initialize tracking for new partitions
            self.current_offsets[(p.topic, p.partition)] = None

    def on_revoke(self, consumer, partitions: List[TopicPartition]):
        print(f"Partitions revoked: {partitions}")

        # Commit offsets before revoke
        offsets_to_commit = []
        for p in partitions:
            key = (p.topic, p.partition)
            if key in self.current_offsets and self.current_offsets[key]:
                offsets_to_commit.append(
                    TopicPartition(p.topic, p.partition,
                                  self.current_offsets[key] + 1))
                del self.current_offsets[key]

        if offsets_to_commit:
            consumer.commit(offsets=offsets_to_commit, asynchronous=False)

    def on_lost(self, consumer, partitions: List[TopicPartition]):
        print(f"Partitions lost: {partitions}")
        for p in partitions:
            key = (p.topic, p.partition)
            if key in self.current_offsets:
                del self.current_offsets[key]

    def subscribe(self, topics):
        self.consumer.subscribe(
            topics,
            on_assign=self.on_assign,
            on_revoke=self.on_revoke,
            on_lost=self.on_lost
        )

    def consume(self, handler):
        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Error: {msg.error()}")
                    continue

                handler(msg)

                # Track offset
                self.current_offsets[(msg.topic(), msg.partition())] = msg.offset()

                # Periodic commit
                self._commit_offsets()

        finally:
            self.consumer.close()

    def _commit_offsets(self):
        offsets = [
            TopicPartition(topic, partition, offset + 1)
            for (topic, partition), offset in self.current_offsets.items()
            if offset is not None
        ]
        if offsets:
            self.consumer.commit(offsets=offsets, asynchronous=True)
```

## Scaling Consumer Groups

### Horizontal Scaling Pattern

```java
public class ScalableConsumerApp {
    public static void main(String[] args) {
        String groupId = "order-processor";
        String instanceId = System.getenv("INSTANCE_ID");

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);

        // Optional: Static membership for faster rebalances
        if (instanceId != null) {
            props.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG,
                groupId + "-" + instanceId);
        }

        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
            CooperativeStickyAssignor.class.getName());

        Consumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList("orders"));

        // Consume messages
        while (true) {
            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofMillis(100));
            // Process records
        }
    }
}
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-consumer
spec:
  replicas: 3  # Scale based on partition count
  selector:
    matchLabels:
      app: kafka-consumer
  template:
    metadata:
      labels:
        app: kafka-consumer
    spec:
      containers:
        - name: consumer
          image: my-consumer:latest
          env:
            - name: KAFKA_BOOTSTRAP_SERVERS
              value: "kafka:9092"
            - name: KAFKA_GROUP_ID
              value: "order-processor"
            - name: INSTANCE_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kafka-consumer-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kafka-consumer
  minReplicas: 1
  maxReplicas: 12  # Match partition count
  metrics:
    - type: External
      external:
        metric:
          name: kafka_consumer_lag
          selector:
            matchLabels:
              group: order-processor
        target:
          type: AverageValue
          averageValue: "1000"
```

## Monitoring Consumer Groups

### Using Kafka CLI

```bash
# List consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Describe consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group

# Check lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group --members --verbose
```

### Programmatic Monitoring

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.TopicPartition;
import java.util.*;

public class ConsumerGroupMonitor {
    private final AdminClient admin;

    public ConsumerGroupMonitor(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.admin = AdminClient.create(props);
    }

    public void describeGroup(String groupId) throws Exception {
        // Get group description
        DescribeConsumerGroupsResult describeResult =
            admin.describeConsumerGroups(Collections.singletonList(groupId));

        ConsumerGroupDescription description =
            describeResult.describedGroups().get(groupId).get();

        System.out.println("Group ID: " + description.groupId());
        System.out.println("State: " + description.state());
        System.out.println("Coordinator: " + description.coordinator());
        System.out.println("Assignment Strategy: " +
            description.partitionAssignor());

        System.out.println("\nMembers:");
        for (MemberDescription member : description.members()) {
            System.out.printf("  %s (%s): %s%n",
                member.consumerId(),
                member.clientId(),
                member.assignment().topicPartitions());
        }

        // Get consumer lag
        ListConsumerGroupOffsetsResult offsetsResult =
            admin.listConsumerGroupOffsets(groupId);

        Map<TopicPartition, OffsetAndMetadata> offsets =
            offsetsResult.partitionsToOffsetAndMetadata().get();

        // Get end offsets
        Set<TopicPartition> partitions = offsets.keySet();
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> endOffsets =
            admin.listOffsets(
                partitions.stream().collect(
                    java.util.stream.Collectors.toMap(
                        tp -> tp,
                        tp -> OffsetSpec.latest()
                    )
                )
            ).all().get();

        System.out.println("\nConsumer Lag:");
        for (TopicPartition tp : partitions) {
            long committed = offsets.get(tp).offset();
            long end = endOffsets.get(tp).offset();
            long lag = end - committed;
            System.out.printf("  %s: committed=%d, end=%d, lag=%d%n",
                tp, committed, end, lag);
        }
    }

    public void close() {
        admin.close();
    }
}
```

## Best Practices

### 1. Match Consumers to Partitions

```java
// Number of consumers should not exceed partition count
int partitionCount = getPartitionCount(topic);
int consumerCount = Math.min(desiredConsumers, partitionCount);
```

### 2. Use Static Membership

```java
// Faster rebalances, especially in Kubernetes
props.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG,
    "consumer-" + podName);
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, "60000");
```

### 3. Handle Processing Failures

```java
// Don't commit failed messages
for (ConsumerRecord<String, String> record : records) {
    try {
        processRecord(record);
        successfulOffsets.put(
            new TopicPartition(record.topic(), record.partition()),
            new OffsetAndMetadata(record.offset() + 1));
    } catch (Exception e) {
        // Log and potentially send to DLQ
        handleFailure(record, e);
    }
}
consumer.commitSync(successfulOffsets);
```

### 4. Graceful Shutdown

```java
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    consumer.wakeup();  // Interrupt poll()
    // Wait for processing to complete
    try {
        shutdownLatch.await(30, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    }
}));
```

## Conclusion

Building scalable Kafka consumer groups requires understanding:

1. **Partition assignment strategies** - Choose based on your use case
2. **Rebalance handling** - Use cooperative protocols and listeners
3. **Scaling patterns** - Match consumers to partitions
4. **Monitoring** - Track lag and consumer health
5. **Graceful operations** - Handle shutdowns and failures properly

Start with CooperativeStickyAssignor for production systems and implement proper rebalance listeners to ensure reliable message processing.
