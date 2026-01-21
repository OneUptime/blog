# How to Manage Kafka Consumer Offsets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Consumer Offsets, Offset Management, Consumer Groups, Troubleshooting

Description: Learn how to manage Kafka consumer offsets including resetting, migrating, and troubleshooting offset issues for consumer groups.

---

Consumer offsets track processing progress in Kafka. Proper offset management is essential for data reprocessing, recovery, and maintaining exactly-once semantics.

## Understanding Offsets

```
Topic: orders, Partition: 0

Offsets:  0  1  2  3  4  5  6  7  8  9
         [m][m][m][m][m][m][m][m][m][m]
                   ^           ^
                   |           |
            committed    log-end
               offset     offset

Lag = log-end offset - committed offset = 9 - 3 = 6
```

## Viewing Offsets

### Consumer Group Offsets

```bash
# Describe consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-consumer-group

# Output:
# GROUP           TOPIC     PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# my-consumer-group orders   0          1000           1050            50
# my-consumer-group orders   1          2000           2000            0
```

### All Consumer Groups

```bash
# List all consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Describe all groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --all-groups
```

### Topic Offsets

```bash
# Get earliest offsets
kafka-get-offsets.sh --bootstrap-server localhost:9092 \
  --topic orders --time -2

# Get latest offsets
kafka-get-offsets.sh --bootstrap-server localhost:9092 \
  --topic orders --time -1

# Get offsets at timestamp
kafka-get-offsets.sh --bootstrap-server localhost:9092 \
  --topic orders --time 1705320000000
```

## Resetting Offsets

### Reset to Earliest

```bash
# Dry run first
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --reset-offsets --to-earliest \
  --topic orders \
  --dry-run

# Execute
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --reset-offsets --to-earliest \
  --topic orders \
  --execute
```

### Reset to Latest

```bash
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --reset-offsets --to-latest \
  --topic orders \
  --execute
```

### Reset to Specific Offset

```bash
# Single partition
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --reset-offsets --to-offset 1000 \
  --topic orders:0 \
  --execute

# Multiple partitions (CSV file)
# offsets.csv: orders,0,1000
#              orders,1,2000
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --reset-offsets --from-file offsets.csv \
  --execute
```

### Reset to Timestamp

```bash
# Reset to specific datetime
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --reset-offsets --to-datetime 2024-01-15T00:00:00.000 \
  --topic orders \
  --execute
```

### Shift Offsets

```bash
# Move forward by 100
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --reset-offsets --shift-by 100 \
  --topic orders \
  --execute

# Move backward by 100
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group \
  --reset-offsets --shift-by -100 \
  --topic orders \
  --execute
```

## Programmatic Offset Management

### Java - Reset Offsets

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;

import java.util.*;

public class OffsetManager {
    private final AdminClient admin;

    public OffsetManager(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.admin = AdminClient.create(props);
    }

    public void resetToEarliest(String groupId, String topic) throws Exception {
        // Get all partitions
        TopicDescription desc = admin.describeTopics(List.of(topic))
            .topicNameValues().get(topic).get();

        // Get earliest offsets
        Map<TopicPartition, OffsetSpec> earliestRequest = new HashMap<>();
        for (var partitionInfo : desc.partitions()) {
            earliestRequest.put(
                new TopicPartition(topic, partitionInfo.partition()),
                OffsetSpec.earliest()
            );
        }

        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> earliestOffsets =
            admin.listOffsets(earliestRequest).all().get();

        // Build offset map
        Map<TopicPartition, OffsetAndMetadata> newOffsets = new HashMap<>();
        for (var entry : earliestOffsets.entrySet()) {
            newOffsets.put(entry.getKey(), new OffsetAndMetadata(entry.getValue().offset()));
        }

        // Alter offsets
        admin.alterConsumerGroupOffsets(groupId, newOffsets).all().get();
        System.out.println("Reset offsets for group " + groupId);
    }

    public void resetToTimestamp(String groupId, String topic, long timestamp) throws Exception {
        // Get partitions
        TopicDescription desc = admin.describeTopics(List.of(topic))
            .topicNameValues().get(topic).get();

        // Get offsets for timestamp
        Map<TopicPartition, OffsetSpec> timestampRequest = new HashMap<>();
        for (var partitionInfo : desc.partitions()) {
            timestampRequest.put(
                new TopicPartition(topic, partitionInfo.partition()),
                OffsetSpec.forTimestamp(timestamp)
            );
        }

        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> timestampOffsets =
            admin.listOffsets(timestampRequest).all().get();

        // Build offset map
        Map<TopicPartition, OffsetAndMetadata> newOffsets = new HashMap<>();
        for (var entry : timestampOffsets.entrySet()) {
            if (entry.getValue().offset() >= 0) {
                newOffsets.put(entry.getKey(), new OffsetAndMetadata(entry.getValue().offset()));
            }
        }

        // Alter offsets
        admin.alterConsumerGroupOffsets(groupId, newOffsets).all().get();
    }

    public Map<TopicPartition, Long> getLag(String groupId) throws Exception {
        Map<TopicPartition, Long> lag = new HashMap<>();

        // Get committed offsets
        Map<TopicPartition, OffsetAndMetadata> committed =
            admin.listConsumerGroupOffsets(groupId)
                .partitionsToOffsetAndMetadata().get();

        // Get end offsets
        Map<TopicPartition, OffsetSpec> endRequest = new HashMap<>();
        for (TopicPartition tp : committed.keySet()) {
            endRequest.put(tp, OffsetSpec.latest());
        }

        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> endOffsets =
            admin.listOffsets(endRequest).all().get();

        // Calculate lag
        for (var entry : committed.entrySet()) {
            TopicPartition tp = entry.getKey();
            long committedOffset = entry.getValue().offset();
            long endOffset = endOffsets.get(tp).offset();
            lag.put(tp, endOffset - committedOffset);
        }

        return lag;
    }

    public void close() {
        admin.close();
    }
}
```

### Python - Offset Management

```python
from kafka import KafkaAdminClient, TopicPartition
from kafka.admin import OffsetSpec

class OffsetManager:
    def __init__(self, bootstrap_servers):
        self.admin = KafkaAdminClient(bootstrap_servers=bootstrap_servers)

    def get_consumer_group_offsets(self, group_id):
        return self.admin.list_consumer_group_offsets(group_id)

    def reset_to_earliest(self, group_id, topic):
        # Get partitions
        metadata = self.admin.describe_topics([topic])
        partitions = [
            TopicPartition(topic, p.partition)
            for p in metadata[0].partitions
        ]

        # Get earliest offsets
        earliest = self.admin.list_offsets({
            tp: OffsetSpec.earliest() for tp in partitions
        })

        # Set offsets
        new_offsets = {tp: offset.offset for tp, offset in earliest.items()}
        self.admin.alter_consumer_group_offsets(group_id, new_offsets)

    def get_lag(self, group_id):
        committed = self.get_consumer_group_offsets(group_id)

        latest = self.admin.list_offsets({
            tp: OffsetSpec.latest() for tp in committed.keys()
        })

        lag = {}
        for tp, offset_meta in committed.items():
            lag[tp] = latest[tp].offset - offset_meta.offset

        return lag
```

## Consumer Offset Commit Strategies

### Auto Commit

```java
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);
props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 5000);

// Simple but may cause duplicates or data loss
```

### Manual Sync Commit

```java
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));

    for (ConsumerRecord<String, String> record : records) {
        processRecord(record);
    }

    // Commit after processing
    consumer.commitSync();
}
```

### Manual Async Commit

```java
consumer.commitAsync((offsets, exception) -> {
    if (exception != null) {
        log.error("Commit failed for offsets {}", offsets, exception);
    }
});
```

### Per-Record Commit

```java
for (ConsumerRecord<String, String> record : records) {
    processRecord(record);

    // Commit after each record
    TopicPartition tp = new TopicPartition(record.topic(), record.partition());
    OffsetAndMetadata offset = new OffsetAndMetadata(record.offset() + 1);
    consumer.commitSync(Map.of(tp, offset));
}
```

## Troubleshooting

### Consumer Group Stuck

```bash
# Check consumer group state
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group my-group --state

# Delete consumer group (must be empty)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --delete --group my-group
```

### Offset Out of Range

```java
// Handle offset reset
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest"); // or "latest"
```

### Committed Offset Ahead of Log

```bash
# Reset to latest valid offset
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group \
  --reset-offsets --to-latest \
  --topic problematic-topic \
  --execute
```

## Best Practices

| Scenario | Strategy |
|----------|----------|
| At-least-once | Commit after processing |
| At-most-once | Commit before processing |
| Exactly-once | Transactional producer + consumer |
| Reprocessing | Reset to timestamp or earliest |
| Recovery | Reset to last known good offset |

Proper offset management ensures data consistency and enables flexible recovery strategies in Kafka applications.
