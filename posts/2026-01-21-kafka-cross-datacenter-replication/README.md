# How to Implement Cross-Datacenter Kafka Replication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, MirrorMaker 2, Cross-Datacenter, Replication, Disaster Recovery, High Availability

Description: Learn how to implement cross-datacenter Kafka replication with MirrorMaker 2 for disaster recovery, active-active patterns, and geographic data distribution.

---

Cross-datacenter replication enables disaster recovery, data locality, and active-active Kafka deployments. MirrorMaker 2 (MM2) is the recommended tool for replicating data between Kafka clusters.

## Architecture Patterns

### Active-Passive (DR)

```
Datacenter A (Primary)          Datacenter B (DR)
+-------------------+           +-------------------+
|   Kafka Cluster   |  ------>  |   Kafka Cluster   |
|   (Producers)     |    MM2    |   (Standby)       |
+-------------------+           +-------------------+
```

### Active-Active

```
Datacenter A                    Datacenter B
+-------------------+           +-------------------+
|   Kafka Cluster   |  <---->   |   Kafka Cluster   |
|   (Local Prod)    |    MM2    |   (Local Prod)    |
+-------------------+           +-------------------+
```

## MirrorMaker 2 Setup

### Configuration File

```properties
# mm2.properties
clusters = dc1, dc2

# DC1 cluster configuration
dc1.bootstrap.servers = dc1-kafka:9092
dc1.security.protocol = SASL_SSL
dc1.sasl.mechanism = PLAIN
dc1.sasl.jaas.config = org.apache.kafka.common.security.plain.PlainLoginModule required \
  username="mm2" password="mm2-secret";

# DC2 cluster configuration
dc2.bootstrap.servers = dc2-kafka:9092
dc2.security.protocol = SASL_SSL
dc2.sasl.mechanism = PLAIN
dc2.sasl.jaas.config = org.apache.kafka.common.security.plain.PlainLoginModule required \
  username="mm2" password="mm2-secret";

# DC1 -> DC2 replication
dc1->dc2.enabled = true
dc1->dc2.topics = orders.*, events.*, users.*
dc1->dc2.groups = .*

# Replication settings
replication.factor = 3
sync.topic.configs.enabled = true
sync.topic.acls.enabled = true
refresh.topics.interval.seconds = 30
refresh.groups.interval.seconds = 30

# Consumer/Producer settings
offset-syncs.topic.replication.factor = 3
heartbeats.topic.replication.factor = 3
checkpoints.topic.replication.factor = 3
```

### Running MirrorMaker 2

```bash
# Run as Connect cluster
connect-mirror-maker.sh mm2.properties

# Or as standalone
kafka-mirror-maker.sh --consumer.config consumer.properties \
  --producer.config producer.properties \
  --whitelist "orders.*,events.*"
```

## Docker Compose Setup

```yaml
version: '3.8'
services:
  mirrormaker2:
    image: confluentinc/cp-kafka-connect:7.5.0
    environment:
      CONNECT_BOOTSTRAP_SERVERS: localhost:9092
      CONNECT_REST_PORT: 8083
      CONNECT_GROUP_ID: mm2-cluster
      CONNECT_CONFIG_STORAGE_TOPIC: mm2-configs
      CONNECT_OFFSET_STORAGE_TOPIC: mm2-offsets
      CONNECT_STATUS_STORAGE_TOPIC: mm2-status
      CONNECT_KEY_CONVERTER: org.apache.kafka.connect.converters.ByteArrayConverter
      CONNECT_VALUE_CONVERTER: org.apache.kafka.connect.converters.ByteArrayConverter
      CONNECT_CONFIG_STORAGE_REPLICATION_FACTOR: 3
      CONNECT_OFFSET_STORAGE_REPLICATION_FACTOR: 3
      CONNECT_STATUS_STORAGE_REPLICATION_FACTOR: 3
      CONNECT_CONNECTOR_CLIENT_CONFIG_OVERRIDE_POLICY: All
    volumes:
      - ./mm2.properties:/etc/kafka/mm2.properties
    command: connect-mirror-maker /etc/kafka/mm2.properties
```

## Topic Naming

MirrorMaker 2 uses a naming convention to avoid replication loops:

```
Source topic: orders
Replicated topic: dc1.orders (in dc2)

Source topic: events
Replicated topic: dc1.events (in dc2)
```

### Custom Replication Policy

```java
public class CustomReplicationPolicy implements ReplicationPolicy {

    @Override
    public String formatRemoteTopic(String sourceClusterAlias, String topic) {
        // Custom naming: replica-<source>-<topic>
        return "replica-" + sourceClusterAlias + "-" + topic;
    }

    @Override
    public String topicSource(String topic) {
        if (topic.startsWith("replica-")) {
            String[] parts = topic.split("-", 3);
            return parts.length > 1 ? parts[1] : null;
        }
        return null;
    }

    @Override
    public String upstreamTopic(String topic) {
        if (topic.startsWith("replica-")) {
            String[] parts = topic.split("-", 3);
            return parts.length > 2 ? parts[2] : null;
        }
        return null;
    }

    @Override
    public boolean isInternalTopic(String topic) {
        return topic.startsWith("mm2-") || topic.endsWith(".internal");
    }
}
```

## Consumer Offset Sync

### Automatic Offset Translation

```properties
# Enable offset sync
emit.checkpoints.enabled = true
emit.checkpoints.interval.seconds = 60

# Sync consumer group offsets
sync.group.offsets.enabled = true
sync.group.offsets.interval.seconds = 60
```

### Reading Translated Offsets

```java
public class OffsetTranslation {
    private final KafkaConsumer<String, String> consumer;

    public Map<TopicPartition, Long> getTranslatedOffsets(
            String sourceCluster, String consumerGroup) {

        // MM2 stores translated offsets in checkpoint topic
        String checkpointTopic = sourceCluster + ".checkpoints.internal";

        Map<TopicPartition, Long> translatedOffsets = new HashMap<>();

        // Read checkpoint topic
        consumer.assign(Collections.singletonList(
            new TopicPartition(checkpointTopic, 0)));
        consumer.seekToBeginning(consumer.assignment());

        ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(10));

        for (ConsumerRecord<String, String> record : records) {
            // Parse checkpoint record
            // Format: group:topic:partition -> offset
            Checkpoint checkpoint = parseCheckpoint(record);
            if (checkpoint.getGroup().equals(consumerGroup)) {
                translatedOffsets.put(
                    new TopicPartition(checkpoint.getTopic(), checkpoint.getPartition()),
                    checkpoint.getOffset()
                );
            }
        }

        return translatedOffsets;
    }
}
```

## Active-Active Configuration

```properties
# Bidirectional replication
clusters = dc1, dc2

# DC1 -> DC2
dc1->dc2.enabled = true
dc1->dc2.topics = orders.*, events.*
# Exclude already replicated topics
dc1->dc2.topics.blacklist = dc2\..*

# DC2 -> DC1
dc2->dc1.enabled = true
dc2->dc1.topics = orders.*, events.*
dc2->dc1.topics.blacklist = dc1\..*

# Prevent replication loops
replication.policy.class = org.apache.kafka.connect.mirror.DefaultReplicationPolicy
```

## Monitoring

### Key Metrics

```bash
# Check replication lag
kafka-consumer-groups.sh --bootstrap-server dc2-kafka:9092 \
  --describe --group mm2-MirrorSourceConnector

# Check heartbeats
kafka-console-consumer.sh --bootstrap-server dc2-kafka:9092 \
  --topic mm2-heartbeats.dc1.internal \
  --from-beginning
```

### JMX Metrics

| Metric | Description |
|--------|-------------|
| kafka.connect.mirror:type=MirrorSourceConnector,target=*,topic=*,partition=* | Records replicated |
| kafka.connect.mirror:type=MirrorCheckpointConnector | Offset checkpoints |
| replication-latency-ms | End-to-end replication latency |

## Failover Procedure

### Planned Failover

```bash
# 1. Stop producers in DC1

# 2. Wait for replication to catch up
kafka-consumer-groups.sh --bootstrap-server dc2-kafka:9092 \
  --describe --group mm2-MirrorSourceConnector

# 3. Translate consumer offsets
# Consumers read from dc1.* topics in DC2

# 4. Update consumer applications to use translated offsets
# 5. Start consumers in DC2
```

### Emergency Failover

```bash
# When DC1 is unavailable

# 1. Update DNS/load balancer to DC2
# 2. Start consumers reading from dc1.* topics
# 3. Accept potential data loss from unreplicated messages
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Monitor lag | Alert on replication lag > threshold |
| Test failover | Regular DR drills |
| Topic naming | Use consistent naming across DCs |
| Compression | Enable compression for WAN efficiency |
| Security | Use TLS and authentication between DCs |

Cross-datacenter replication with MirrorMaker 2 provides robust disaster recovery and enables global Kafka deployments with data locality.
