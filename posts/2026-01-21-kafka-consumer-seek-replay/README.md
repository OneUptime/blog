# How to Implement Consumer Seek and Replay in Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Consumer, Seek, Replay, Offset Management, Data Reprocessing, Java, Python

Description: A comprehensive guide to implementing seek and replay functionality in Kafka consumers, covering offset manipulation, time-based seeking, partition-specific operations, and strategies for reprocessing historical data.

---

Kafka's ability to replay messages is one of its most powerful features. Consumers can seek to any position in a partition to reprocess historical data, recover from errors, or implement time-travel debugging. This guide covers various seek operations and replay strategies.

## Understanding Seek Operations

### Available Seek Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| seekToBeginning | Seek to first available offset | Full replay |
| seekToEnd | Seek to latest offset | Skip to current |
| seek | Seek to specific offset | Targeted replay |
| offsetsForTimes | Find offset by timestamp | Time-based replay |

## Basic Seek Operations

### Java Seek Examples

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import java.time.Duration;
import java.util.*;

public class SeekConsumer {
    private final Consumer<String, String> consumer;

    public SeekConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

        this.consumer = new KafkaConsumer<>(props);
    }

    // Seek to beginning of all partitions
    public void seekToBeginning(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        // First poll to get partition assignment
        consumer.poll(Duration.ZERO);

        // Get assigned partitions
        Set<TopicPartition> partitions = consumer.assignment();

        // Seek to beginning
        consumer.seekToBeginning(partitions);

        System.out.println("Seeked to beginning of: " + partitions);
    }

    // Seek to end (skip all existing messages)
    public void seekToEnd(String topic) {
        consumer.subscribe(Collections.singletonList(topic));
        consumer.poll(Duration.ZERO);

        Set<TopicPartition> partitions = consumer.assignment();
        consumer.seekToEnd(partitions);

        System.out.println("Seeked to end of: " + partitions);
    }

    // Seek to specific offset
    public void seekToOffset(TopicPartition partition, long offset) {
        consumer.assign(Collections.singletonList(partition));
        consumer.seek(partition, offset);

        System.out.printf("Seeked to offset %d on %s%n", offset, partition);
    }

    // Seek all partitions to specific offsets
    public void seekToOffsets(Map<TopicPartition, Long> offsets) {
        consumer.assign(offsets.keySet());

        for (Map.Entry<TopicPartition, Long> entry : offsets.entrySet()) {
            consumer.seek(entry.getKey(), entry.getValue());
        }

        System.out.println("Seeked to offsets: " + offsets);
    }

    public void consume(int maxMessages) {
        int count = 0;
        while (count < maxMessages) {
            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofMillis(1000));

            for (ConsumerRecord<String, String> record : records) {
                System.out.printf("Partition: %d, Offset: %d, Value: %s%n",
                    record.partition(), record.offset(), record.value());
                count++;
                if (count >= maxMessages) break;
            }
        }
    }

    public void close() {
        consumer.close();
    }
}
```

### Python Seek Examples

```python
from confluent_kafka import Consumer, TopicPartition
from typing import Dict, List

class SeekConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
        }
        self.consumer = Consumer(self.config)

    def seek_to_beginning(self, topic: str):
        """Seek to beginning of all partitions."""
        self.consumer.subscribe([topic])

        # Poll to get assignment
        self.consumer.poll(timeout=0)

        # Get partitions
        partitions = self.consumer.assignment()

        # Seek to beginning
        for tp in partitions:
            low, high = self.consumer.get_watermark_offsets(tp)
            self.consumer.seek(TopicPartition(tp.topic, tp.partition, low))

        print(f"Seeked to beginning of {len(partitions)} partitions")

    def seek_to_end(self, topic: str):
        """Seek to end of all partitions."""
        self.consumer.subscribe([topic])
        self.consumer.poll(timeout=0)

        partitions = self.consumer.assignment()

        for tp in partitions:
            low, high = self.consumer.get_watermark_offsets(tp)
            self.consumer.seek(TopicPartition(tp.topic, tp.partition, high))

        print(f"Seeked to end of {len(partitions)} partitions")

    def seek_to_offset(self, topic: str, partition: int, offset: int):
        """Seek to specific offset on a partition."""
        tp = TopicPartition(topic, partition, offset)
        self.consumer.assign([tp])
        self.consumer.seek(tp)

        print(f"Seeked to offset {offset} on {topic}[{partition}]")

    def seek_to_offsets(self, offsets: Dict[tuple, int]):
        """Seek multiple partitions to specific offsets."""
        partitions = [
            TopicPartition(topic, partition, offset)
            for (topic, partition), offset in offsets.items()
        ]
        self.consumer.assign(partitions)

        for tp in partitions:
            self.consumer.seek(tp)

        print(f"Seeked {len(partitions)} partitions")

    def consume(self, max_messages: int = 100):
        """Consume messages after seek."""
        count = 0
        while count < max_messages:
            msg = self.consumer.poll(timeout=1.0)

            if msg is None:
                continue

            if msg.error():
                print(f"Error: {msg.error()}")
                continue

            print(f"Partition: {msg.partition()}, "
                  f"Offset: {msg.offset()}, "
                  f"Value: {msg.value().decode()}")
            count += 1

    def close(self):
        self.consumer.close()


def main():
    consumer = SeekConsumer('localhost:9092', 'seek-example-group')

    # Replay from beginning
    consumer.seek_to_beginning('my-topic')
    consumer.consume(50)

    consumer.close()


if __name__ == '__main__':
    main()
```

## Time-Based Seeking

### Java Time-Based Seek

```java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import java.time.*;
import java.util.*;

public class TimeBasedSeekConsumer {
    private final Consumer<String, String> consumer;

    public TimeBasedSeekConsumer(String bootstrapServers, String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");

        this.consumer = new KafkaConsumer<>(props);
    }

    // Seek to timestamp
    public void seekToTimestamp(String topic, long timestampMs) {
        consumer.subscribe(Collections.singletonList(topic));
        consumer.poll(Duration.ZERO);

        Set<TopicPartition> partitions = consumer.assignment();

        // Build timestamp query for each partition
        Map<TopicPartition, Long> timestampsToSearch = new HashMap<>();
        for (TopicPartition tp : partitions) {
            timestampsToSearch.put(tp, timestampMs);
        }

        // Find offsets for timestamps
        Map<TopicPartition, OffsetAndTimestamp> offsetsForTimes =
            consumer.offsetsForTimes(timestampsToSearch);

        // Seek to found offsets
        for (Map.Entry<TopicPartition, OffsetAndTimestamp> entry :
                offsetsForTimes.entrySet()) {
            if (entry.getValue() != null) {
                consumer.seek(entry.getKey(), entry.getValue().offset());
                System.out.printf("Partition %s: seeked to offset %d (timestamp %d)%n",
                    entry.getKey(),
                    entry.getValue().offset(),
                    entry.getValue().timestamp());
            } else {
                // No message at or after timestamp, seek to end
                consumer.seekToEnd(Collections.singleton(entry.getKey()));
                System.out.printf("Partition %s: no data at timestamp, seeked to end%n",
                    entry.getKey());
            }
        }
    }

    // Seek to hours ago
    public void seekToHoursAgo(String topic, int hoursAgo) {
        long timestamp = Instant.now()
            .minus(Duration.ofHours(hoursAgo))
            .toEpochMilli();
        seekToTimestamp(topic, timestamp);
    }

    // Seek to specific date/time
    public void seekToDateTime(String topic, LocalDateTime dateTime) {
        long timestamp = dateTime.atZone(ZoneId.systemDefault())
            .toInstant()
            .toEpochMilli();
        seekToTimestamp(topic, timestamp);
    }

    public void consume() {
        while (true) {
            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofMillis(1000));

            for (ConsumerRecord<String, String> record : records) {
                Instant messageTime = Instant.ofEpochMilli(record.timestamp());
                System.out.printf("[%s] Partition: %d, Offset: %d, Value: %s%n",
                    messageTime, record.partition(), record.offset(), record.value());
            }
        }
    }

    public static void main(String[] args) {
        TimeBasedSeekConsumer consumer =
            new TimeBasedSeekConsumer("localhost:9092", "time-seek-group");

        // Seek to 2 hours ago
        consumer.seekToHoursAgo("events", 2);

        // Or seek to specific datetime
        // consumer.seekToDateTime("events",
        //     LocalDateTime.of(2024, 1, 15, 10, 0));

        consumer.consume();
    }
}
```

### Python Time-Based Seek

```python
from confluent_kafka import Consumer, TopicPartition
from datetime import datetime, timedelta
from typing import Optional

class TimeBasedSeekConsumer:
    def __init__(self, bootstrap_servers: str, group_id: str):
        self.config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'enable.auto.commit': False,
        }
        self.consumer = Consumer(self.config)

    def seek_to_timestamp(self, topic: str, timestamp_ms: int):
        """Seek all partitions to a specific timestamp."""
        self.consumer.subscribe([topic])
        self.consumer.poll(timeout=0)

        partitions = self.consumer.assignment()

        # Build list with timestamps
        partitions_with_time = [
            TopicPartition(tp.topic, tp.partition, timestamp_ms)
            for tp in partitions
        ]

        # Query offsets for times
        offsets = self.consumer.offsets_for_times(partitions_with_time)

        # Seek to found offsets
        for tp in offsets:
            if tp.offset >= 0:
                self.consumer.seek(tp)
                print(f"{tp.topic}[{tp.partition}]: seeked to offset {tp.offset}")
            else:
                # No messages at timestamp, seek to end
                low, high = self.consumer.get_watermark_offsets(
                    TopicPartition(tp.topic, tp.partition))
                self.consumer.seek(TopicPartition(tp.topic, tp.partition, high))
                print(f"{tp.topic}[{tp.partition}]: no data, seeked to end")

    def seek_to_hours_ago(self, topic: str, hours: int):
        """Seek to N hours ago."""
        timestamp = int((datetime.now() - timedelta(hours=hours)).timestamp() * 1000)
        self.seek_to_timestamp(topic, timestamp)

    def seek_to_datetime(self, topic: str, dt: datetime):
        """Seek to specific datetime."""
        timestamp = int(dt.timestamp() * 1000)
        self.seek_to_timestamp(topic, timestamp)

    def consume(self, max_messages: Optional[int] = None):
        count = 0
        while max_messages is None or count < max_messages:
            msg = self.consumer.poll(timeout=1.0)

            if msg is None:
                continue

            if msg.error():
                print(f"Error: {msg.error()}")
                continue

            msg_time = datetime.fromtimestamp(msg.timestamp()[1] / 1000)
            print(f"[{msg_time}] Partition: {msg.partition()}, "
                  f"Offset: {msg.offset()}, Value: {msg.value().decode()}")
            count += 1

    def close(self):
        self.consumer.close()


def main():
    consumer = TimeBasedSeekConsumer('localhost:9092', 'time-seek-group')

    # Seek to 2 hours ago
    consumer.seek_to_hours_ago('events', 2)

    # Consume messages
    consumer.consume(100)

    consumer.close()


if __name__ == '__main__':
    main()
```

## Replay Strategies

### Full Topic Replay

```java
public class FullReplayConsumer {
    private final Consumer<String, String> consumer;
    private final String replayGroupId;

    public FullReplayConsumer(String bootstrapServers, String topic) {
        // Use unique group ID for replay to not affect production consumers
        this.replayGroupId = "replay-" + System.currentTimeMillis();

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, replayGroupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        // Increase batch size for faster replay
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1000);

        this.consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(topic));
    }

    public void replay(ReplayHandler handler) {
        long startTime = System.currentTimeMillis();
        long recordCount = 0;

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofSeconds(5));

                if (records.isEmpty()) {
                    // Check if we've reached the end
                    if (isAtEnd()) {
                        break;
                    }
                    continue;
                }

                for (ConsumerRecord<String, String> record : records) {
                    handler.handle(record);
                    recordCount++;

                    if (recordCount % 10000 == 0) {
                        System.out.printf("Replayed %d records...%n", recordCount);
                    }
                }
            }
        } finally {
            consumer.close();
        }

        long duration = System.currentTimeMillis() - startTime;
        System.out.printf("Replay complete: %d records in %d ms (%.2f records/sec)%n",
            recordCount, duration, recordCount * 1000.0 / duration);
    }

    private boolean isAtEnd() {
        Map<TopicPartition, Long> endOffsets =
            consumer.endOffsets(consumer.assignment());
        Map<TopicPartition, Long> currentPositions = new HashMap<>();

        for (TopicPartition tp : consumer.assignment()) {
            currentPositions.put(tp, consumer.position(tp));
        }

        for (TopicPartition tp : endOffsets.keySet()) {
            if (currentPositions.get(tp) < endOffsets.get(tp)) {
                return false;
            }
        }
        return true;
    }

    interface ReplayHandler {
        void handle(ConsumerRecord<String, String> record);
    }
}
```

### Selective Replay with Filter

```java
public class FilteredReplayConsumer {
    private final Consumer<String, String> consumer;

    public void replayWithFilter(String topic, long startTime, long endTime,
                                 Predicate<ConsumerRecord<String, String>> filter,
                                 ReplayHandler handler) {
        // Seek to start time
        seekToTimestamp(topic, startTime);

        while (true) {
            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofSeconds(1));

            for (ConsumerRecord<String, String> record : records) {
                // Stop if past end time
                if (record.timestamp() > endTime) {
                    System.out.println("Reached end time, stopping replay");
                    return;
                }

                // Apply filter
                if (filter.test(record)) {
                    handler.handle(record);
                }
            }
        }
    }

    // Example usage
    public static void main(String[] args) {
        FilteredReplayConsumer consumer = new FilteredReplayConsumer();

        long yesterday = System.currentTimeMillis() - 86400000;
        long now = System.currentTimeMillis();

        // Replay only error events from yesterday
        consumer.replayWithFilter("events", yesterday, now,
            record -> record.value().contains("\"level\":\"ERROR\""),
            record -> System.out.println("Error: " + record.value()));
    }
}
```

### Replay to Another Topic

```java
public class ReplayToTopicConsumer {
    private final Consumer<String, String> consumer;
    private final Producer<String, String> producer;

    public ReplayToTopicConsumer(String bootstrapServers) {
        // Consumer setup
        Properties consumerProps = new Properties();
        consumerProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        consumerProps.put(ConsumerConfig.GROUP_ID_CONFIG,
            "replay-" + System.currentTimeMillis());
        consumerProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        this.consumer = new KafkaConsumer<>(consumerProps);

        // Producer setup
        Properties producerProps = new Properties();
        producerProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        producerProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        this.producer = new KafkaProducer<>(producerProps);
    }

    public void replayToTopic(String sourceTopic, String targetTopic,
                              Function<String, String> transformer) {
        consumer.subscribe(Collections.singletonList(sourceTopic));

        // Seek to beginning
        consumer.poll(Duration.ZERO);
        consumer.seekToBeginning(consumer.assignment());

        try {
            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofSeconds(5));

                if (records.isEmpty()) {
                    if (isAtEnd()) break;
                    continue;
                }

                for (ConsumerRecord<String, String> record : records) {
                    // Transform and send to new topic
                    String transformedValue = transformer.apply(record.value());

                    producer.send(new ProducerRecord<>(
                        targetTopic, record.key(), transformedValue));
                }

                producer.flush();
            }
        } finally {
            consumer.close();
            producer.close();
        }
    }
}
```

## Reset Consumer Group Offsets

### Using CLI

```bash
# Reset to earliest
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-earliest \
  --topic my-topic --execute

# Reset to latest
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-latest \
  --topic my-topic --execute

# Reset to specific offset
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-offset 1000 \
  --topic my-topic:0 --execute

# Reset to timestamp
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets \
  --to-datetime 2024-01-15T10:00:00.000 \
  --topic my-topic --execute

# Dry run (preview changes)
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-group --reset-offsets --to-earliest \
  --topic my-topic --dry-run
```

### Using AdminClient API

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.TopicPartition;

public class OffsetResetter {
    private final AdminClient admin;

    public OffsetResetter(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.admin = AdminClient.create(props);
    }

    public void resetToEarliest(String groupId, String topic) throws Exception {
        // Get partitions
        DescribeTopicsResult topicResult =
            admin.describeTopics(Collections.singletonList(topic));
        TopicDescription description = topicResult.all().get().get(topic);

        Map<TopicPartition, OffsetSpec> offsetSpecs = new HashMap<>();
        for (var partition : description.partitions()) {
            offsetSpecs.put(
                new TopicPartition(topic, partition.partition()),
                OffsetSpec.earliest()
            );
        }

        // Get earliest offsets
        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> earliestOffsets =
            admin.listOffsets(offsetSpecs).all().get();

        // Reset offsets
        Map<TopicPartition, OffsetAndMetadata> newOffsets = new HashMap<>();
        for (var entry : earliestOffsets.entrySet()) {
            newOffsets.put(entry.getKey(),
                new OffsetAndMetadata(entry.getValue().offset()));
        }

        admin.alterConsumerGroupOffsets(groupId, newOffsets).all().get();

        System.out.println("Reset offsets for group " + groupId + ": " + newOffsets);
    }

    public void close() {
        admin.close();
    }
}
```

## Best Practices

### 1. Use Unique Group ID for Replay

```java
// Don't use production group ID for replay
String replayGroupId = "replay-" + topic + "-" + System.currentTimeMillis();
```

### 2. Handle End of Topic

```java
// Don't assume empty poll means end of data
if (records.isEmpty()) {
    // Check actual positions vs end offsets
    if (!isAtEnd()) {
        continue;  // Keep polling
    }
}
```

### 3. Preserve Original Timestamps

```java
// When replaying to another topic, consider preserving timestamp
ProducerRecord<String, String> replayRecord = new ProducerRecord<>(
    targetTopic,
    null,  // partition
    originalRecord.timestamp(),  // original timestamp
    originalRecord.key(),
    transformedValue
);
```

### 4. Monitor Replay Progress

```java
long totalRecords = getEndOffset() - getBeginningOffset();
long processed = 0;

while (processing) {
    // ... process records
    processed += records.count();

    double progress = (processed * 100.0) / totalRecords;
    System.out.printf("Replay progress: %.2f%% (%d/%d)%n",
        progress, processed, totalRecords);
}
```

## Conclusion

Kafka's seek and replay capabilities enable powerful data reprocessing scenarios:

1. **Offset-based seek** for precise positioning
2. **Time-based seek** for temporal queries
3. **Full replay** for rebuilding state
4. **Filtered replay** for selective reprocessing
5. **Topic-to-topic replay** for data migration

Use these patterns to implement robust recovery mechanisms, debugging tools, and data migration strategies in your Kafka applications.
