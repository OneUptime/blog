# How to Configure Kafka Topic Partitioning for Horizontal Scaling on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, Kubernetes, Scalability

Description: Learn how to design and configure Kafka topic partitioning strategies for horizontal scaling on Kubernetes with proper key distribution, consumer group management, and rebalancing optimization.

---

Kafka topic partitioning is fundamental to achieving horizontal scalability in distributed streaming systems. Partitions enable parallel processing across multiple consumers while maintaining message ordering within each partition. Running Kafka on Kubernetes adds additional considerations for partition management, consumer scaling, and rebalancing strategies.

This guide covers designing effective partitioning strategies for Kafka deployments on Kubernetes.

## Understanding Kafka Partitioning Basics

Each Kafka topic is divided into one or more partitions, which serve as the unit of parallelism. Key concepts include:

- Messages with the same key go to the same partition
- Each partition is consumed by exactly one consumer in a consumer group
- The number of partitions limits maximum consumer parallelism
- Partitions can be replicated across brokers for fault tolerance
- Partition reassignment requires data migration

Choosing the right partition count and key strategy directly impacts throughput, latency, and scalability.

## Determining Optimal Partition Count

Calculate partition count based on throughput requirements:

```
Target Partitions = max(
    Target Throughput / Producer Throughput per Partition,
    Target Throughput / Consumer Throughput per Partition
)
```

For example:
- Target throughput: 1000 MB/s
- Producer throughput per partition: 50 MB/s
- Consumer throughput per partition: 100 MB/s
- Required partitions: max(1000/50, 1000/100) = max(20, 10) = 20 partitions

Consider future growth and add 20-30% headroom:

```
Final Partition Count = Calculated Partitions * 1.3
```

## Creating Topics with Proper Partitioning

Create Kafka topics with appropriate partition configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-topics
  namespace: kafka
data:
  create-topics.sh: |
    #!/bin/bash

    # High-throughput topic for events
    kafka-topics.sh --create \
      --bootstrap-server kafka:9092 \
      --topic events \
      --partitions 30 \
      --replication-factor 3 \
      --config retention.ms=604800000 \
      --config segment.bytes=1073741824 \
      --config compression.type=snappy \
      --config min.insync.replicas=2

    # Low-throughput topic for commands
    kafka-topics.sh --create \
      --bootstrap-server kafka:9092 \
      --topic commands \
      --partitions 6 \
      --replication-factor 3 \
      --config retention.ms=86400000

    # High-cardinality topic for user activities
    kafka-topics.sh --create \
      --bootstrap-server kafka:9092 \
      --topic user-activities \
      --partitions 50 \
      --replication-factor 3 \
      --config retention.ms=2592000000
```

Deploy topic creation as a job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: create-kafka-topics
  namespace: kafka
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: kafka-admin
        image: confluentinc/cp-kafka:7.5.0
        command: ["/bin/bash", "/scripts/create-topics.sh"]
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: kafka-topics
```

## Implementing Custom Partitioning Strategies

Create a custom partitioner for specific key distribution requirements:

```java
package com.example.kafka;

import org.apache.kafka.clients.producer.Partitioner;
import org.apache.kafka.common.Cluster;
import java.util.Map;

public class CustomPartitioner implements Partitioner {

    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {

        int numPartitions = cluster.partitionCountForTopic(topic);

        if (key == null) {
            // Round-robin for null keys
            return (int) (Math.random() * numPartitions);
        }

        String keyStr = key.toString();

        // Route high-priority messages to dedicated partitions
        if (keyStr.startsWith("priority:")) {
            // Use first 10% of partitions for priority messages
            int priorityPartitions = Math.max(1, numPartitions / 10);
            return Math.abs(keyStr.hashCode()) % priorityPartitions;
        }

        // Route tenant-specific messages
        if (keyStr.startsWith("tenant:")) {
            String tenantId = keyStr.split(":")[1];
            // Ensure same tenant always goes to same partition
            return Math.abs(tenantId.hashCode()) % numPartitions;
        }

        // Default murmur2 hash
        return Math.abs(org.apache.kafka.common.utils.Utils.murmur2(keyBytes))
               % numPartitions;
    }

    @Override
    public void close() {
        // Cleanup if needed
    }

    @Override
    public void configure(Map<String, ?> configs) {
        // Configuration if needed
    }
}
```

Configure the producer to use the custom partitioner:

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
          "org.apache.kafka.common.serialization.StringSerializer");
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
          "org.apache.kafka.common.serialization.StringSerializer");
props.put(ProducerConfig.PARTITIONER_CLASS_CONFIG,
          "com.example.kafka.CustomPartitioner");

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
```

## Deploying Consumers with Horizontal Pod Autoscaler

Create a consumer deployment that scales with partition count:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-consumer
  namespace: processing
spec:
  replicas: 10  # Match or slightly exceed partition count
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
        image: myapp/kafka-consumer:v1.0.0
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka:9092"
        - name: CONSUMER_GROUP_ID
          value: "event-processors"
        - name: TOPICS
          value: "events"
        - name: MAX_POLL_RECORDS
          value: "500"
        - name: SESSION_TIMEOUT_MS
          value: "30000"
        - name: MAX_POLL_INTERVAL_MS
          value: "300000"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kafka-consumer-hpa
  namespace: processing
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kafka-consumer
  minReplicas: 5
  maxReplicas: 30  # Match max partition count
  metrics:
  - type: Pods
    pods:
      metric:
        name: kafka_consumer_lag
      target:
        type: AverageValue
        averageValue: "1000"
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

## Managing Consumer Rebalancing

Implement graceful shutdown to minimize rebalancing impact:

```java
public class KafkaConsumerService {
    private final KafkaConsumer<String, String> consumer;
    private volatile boolean running = true;

    public KafkaConsumerService(Properties props) {
        this.consumer = new KafkaConsumer<>(props);
    }

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic),
            new ConsumerRebalanceListener() {
                @Override
                public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
                    System.out.println("Partitions revoked: " + partitions);
                    // Commit offsets before rebalance
                    consumer.commitSync();
                }

                @Override
                public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
                    System.out.println("Partitions assigned: " + partitions);
                }
            });

        while (running) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));

            for (ConsumerRecord<String, String> record : records) {
                processRecord(record);
            }

            consumer.commitAsync();
        }
    }

    public void shutdown() {
        running = false;
        consumer.wakeup();
    }
}
```

Configure pod lifecycle for graceful shutdown:

```yaml
lifecycle:
  preStop:
    exec:
      command:
      - /bin/sh
      - -c
      - |
        # Signal application to stop consuming
        kill -TERM 1
        # Wait for graceful shutdown
        sleep 30
```

## Monitoring Partition Distribution

Create metrics to monitor partition distribution:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kafka-consumer-metrics
  namespace: processing
spec:
  selector:
    matchLabels:
      app: kafka-consumer
  endpoints:
  - port: metrics
    interval: 30s
```

Query partition assignment balance:

```promql
# Partitions per consumer
kafka_consumer_assigned_partitions

# Consumer lag by partition
kafka_consumer_records_lag{partition=~".+"}

# Imbalanced consumers (standard deviation > 2)
stddev(kafka_consumer_assigned_partitions) > 2
```

## Increasing Partitions for Existing Topics

Add partitions to scale existing topics:

```bash
# Add partitions to existing topic
kafka-topics.sh --alter \
  --bootstrap-server kafka:9092 \
  --topic events \
  --partitions 40

# Verify new partition count
kafka-topics.sh --describe \
  --bootstrap-server kafka:9092 \
  --topic events
```

Note: Adding partitions doesn't redistribute existing data. Only new messages use new partitions.

## Handling Partition Hotspots

Identify and resolve partition hotspots:

```java
// Monitor partition metrics
Map<TopicPartition, Long> partitionSizes = new HashMap<>();

consumer.assignment().forEach(partition -> {
    long position = consumer.position(partition);
    long endOffset = consumer.endOffsets(
        Collections.singleton(partition)).get(partition);
    long lag = endOffset - position;

    if (lag > HOTSPOT_THRESHOLD) {
        System.out.println("Hotspot detected on " + partition +
                          ", lag: " + lag);
    }
});
```

Mitigate hotspots by improving key distribution:

```java
// Add salt to keys with high cardinality
String key = originalKey + "-" + (Math.abs(originalKey.hashCode()) % 10);

// Or use composite keys
String key = tenantId + ":" + userId + ":" + timestamp;
```

## Best Practices for Kafka Partitioning

Follow these guidelines for optimal partitioning:

1. Start with more partitions than current consumer count
2. Align partition count with expected peak consumers
3. Consider key cardinality when choosing partition count
4. Use consistent hashing for predictable partition assignment
5. Monitor partition size and growth rates
6. Plan for partition expansion (you cannot reduce partition count)
7. Balance partition count vs broker resources
8. Use compacted topics for high-cardinality keys
9. Implement monitoring for partition lag and distribution
10. Test rebalancing behavior under load

## Conclusion

Effective Kafka topic partitioning is critical for horizontal scalability on Kubernetes. By carefully choosing partition counts, implementing appropriate key distribution strategies, and managing consumer scaling and rebalancing, you can build high-throughput streaming systems that scale seamlessly with your workload.

Key considerations include calculating partition count based on throughput requirements, implementing custom partitioners for specific use cases, deploying consumers with horizontal pod autoscaling, handling rebalancing gracefully, monitoring partition distribution and lag, and planning for future growth. With proper partitioning strategies, your Kafka clusters on Kubernetes can handle massive message volumes while maintaining low latency and high availability.
