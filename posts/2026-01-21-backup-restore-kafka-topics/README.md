# How to Back Up and Restore Kafka Topics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Backup, Restore, Disaster Recovery, MirrorMaker, Kafka Operations

Description: A comprehensive guide to backing up and restoring Apache Kafka topics using MirrorMaker 2, consumer-based backup, and snapshot strategies for disaster recovery.

---

Backing up Apache Kafka topics is essential for disaster recovery, data migration, and compliance requirements. Unlike traditional databases, Kafka requires specialized approaches due to its distributed, append-only nature. This guide covers multiple backup and restore strategies with practical implementations.

## Understanding Kafka Backup Challenges

Kafka presents unique backup challenges:

- Data is distributed across multiple brokers and partitions
- Messages are append-only with offset-based addressing
- Consumer offsets need separate backup consideration
- High throughput can make full backups impractical

## Backup Strategy Overview

| Strategy | Use Case | RPO | Complexity |
|----------|----------|-----|------------|
| MirrorMaker 2 | Cross-cluster replication | Near real-time | Medium |
| Consumer-based | Topic-level backup to storage | Minutes | Low |
| Filesystem snapshot | Full cluster backup | Hours | High |
| Kafka Connect S3 Sink | Archival to object storage | Minutes | Low |

## Method 1: MirrorMaker 2 for Continuous Replication

MirrorMaker 2 (MM2) provides continuous replication between Kafka clusters, making it ideal for disaster recovery.

### Configuration

Create `mm2.properties`:

```properties
# Cluster definitions
clusters = source, target

source.bootstrap.servers = source-kafka:9092
target.bootstrap.servers = target-kafka:9092

# Replication settings
source->target.enabled = true
source->target.topics = .*

# Exclude internal topics
topics.exclude = .*[\-\.]internal, .*\.replica, __.*

# Consumer group offset sync
sync.group.offsets.enabled = true
sync.group.offsets.interval.seconds = 10

# Replication factor for internal topics
replication.factor = 3

# Checkpoints for offset translation
emit.checkpoints.enabled = true
emit.checkpoints.interval.seconds = 10

# Heartbeats for cluster health
emit.heartbeats.enabled = true
emit.heartbeats.interval.seconds = 10

# Source cluster configuration
source.consumer.group.id = mm2-source
source.consumer.auto.offset.reset = earliest

# Performance tuning
tasks.max = 10
```

### Starting MirrorMaker 2

```bash
# Start MM2 as a distributed connector
bin/connect-mirror-maker.sh config/mm2.properties

# Or run as a Connect worker
bin/connect-distributed.sh config/connect-distributed.properties
```

### Java Implementation for MM2 Monitoring

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ExecutionException;

public class MirrorMakerMonitor {

    private final AdminClient sourceAdmin;
    private final AdminClient targetAdmin;

    public MirrorMakerMonitor(String sourceBootstrap, String targetBootstrap) {
        this.sourceAdmin = createAdminClient(sourceBootstrap);
        this.targetAdmin = createAdminClient(targetBootstrap);
    }

    private AdminClient createAdminClient(String bootstrap) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap);
        return AdminClient.create(props);
    }

    public Map<String, Long> getReplicationLag(String topic)
            throws ExecutionException, InterruptedException {

        Map<String, Long> lagByPartition = new HashMap<>();

        // Get source offsets
        Map<TopicPartition, OffsetSpec> sourcePartitions = new HashMap<>();
        DescribeTopicsResult sourceTopics = sourceAdmin.describeTopics(
            Collections.singletonList(topic));
        TopicDescription sourceDesc = sourceTopics.topicNameValues()
            .get(topic).get();

        for (int i = 0; i < sourceDesc.partitions().size(); i++) {
            sourcePartitions.put(new TopicPartition(topic, i), OffsetSpec.latest());
        }

        Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> sourceOffsets =
            sourceAdmin.listOffsets(sourcePartitions).all().get();

        // Get target offsets (MM2 prefixes topic with source cluster alias)
        String targetTopic = "source." + topic;
        Map<TopicPartition, OffsetSpec> targetPartitions = new HashMap<>();

        for (int i = 0; i < sourceDesc.partitions().size(); i++) {
            targetPartitions.put(new TopicPartition(targetTopic, i), OffsetSpec.latest());
        }

        try {
            Map<TopicPartition, ListOffsetsResult.ListOffsetsResultInfo> targetOffsets =
                targetAdmin.listOffsets(targetPartitions).all().get();

            // Calculate lag
            for (int i = 0; i < sourceDesc.partitions().size(); i++) {
                TopicPartition sourceTp = new TopicPartition(topic, i);
                TopicPartition targetTp = new TopicPartition(targetTopic, i);

                long sourceOffset = sourceOffsets.get(sourceTp).offset();
                long targetOffset = targetOffsets.containsKey(targetTp) ?
                    targetOffsets.get(targetTp).offset() : 0;

                lagByPartition.put("partition-" + i, sourceOffset - targetOffset);
            }
        } catch (Exception e) {
            System.err.println("Target topic not found: " + targetTopic);
        }

        return lagByPartition;
    }

    public void printReplicationStatus(List<String> topics)
            throws ExecutionException, InterruptedException {

        System.out.println("\n=== MirrorMaker Replication Status ===");
        System.out.printf("%-30s %-15s %-15s%n", "Topic", "Partition", "Lag");
        System.out.println("-".repeat(60));

        for (String topic : topics) {
            Map<String, Long> lag = getReplicationLag(topic);
            for (Map.Entry<String, Long> entry : lag.entrySet()) {
                System.out.printf("%-30s %-15s %-15d%n",
                    topic, entry.getKey(), entry.getValue());
            }
        }
    }

    public void close() {
        sourceAdmin.close();
        targetAdmin.close();
    }

    public static void main(String[] args) throws Exception {
        MirrorMakerMonitor monitor = new MirrorMakerMonitor(
            "source-kafka:9092",
            "target-kafka:9092"
        );

        try {
            monitor.printReplicationStatus(Arrays.asList("orders", "events", "logs"));
        } finally {
            monitor.close();
        }
    }
}
```

## Method 2: Consumer-Based Backup to Object Storage

For archival backups, consuming messages and storing them in object storage is effective.

### Python Implementation

```python
from confluent_kafka import Consumer, KafkaError, KafkaException
from confluent_kafka.admin import AdminClient
import json
import gzip
import boto3
from datetime import datetime
from typing import List, Dict, Optional
import os

class KafkaBackup:
    def __init__(self, bootstrap_servers: str, group_id: str):
        self.consumer_config = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': False,
            'max.poll.interval.ms': 300000
        }
        self.admin_client = AdminClient({
            'bootstrap.servers': bootstrap_servers
        })

    def backup_topic_to_file(self, topic: str, output_dir: str,
                             max_messages: int = 1000000) -> str:
        """Backup a topic to a compressed JSON file."""
        consumer = Consumer(self.consumer_config)
        consumer.subscribe([topic])

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{output_dir}/{topic}_{timestamp}.json.gz"

        os.makedirs(output_dir, exist_ok=True)

        messages_backed_up = 0
        partition_offsets = {}

        try:
            with gzip.open(filename, 'wt', encoding='utf-8') as f:
                # Write metadata header
                metadata = {
                    'topic': topic,
                    'backup_timestamp': timestamp,
                    'type': 'kafka_backup_v1'
                }
                f.write(json.dumps(metadata) + '\n')

                while messages_backed_up < max_messages:
                    msg = consumer.poll(timeout=10.0)

                    if msg is None:
                        # No more messages
                        break

                    if msg.error():
                        if msg.error().code() == KafkaError._PARTITION_EOF:
                            continue
                        raise KafkaException(msg.error())

                    # Create backup record
                    record = {
                        'partition': msg.partition(),
                        'offset': msg.offset(),
                        'timestamp': msg.timestamp()[1],
                        'key': msg.key().decode('utf-8') if msg.key() else None,
                        'value': msg.value().decode('utf-8') if msg.value() else None,
                        'headers': dict(msg.headers()) if msg.headers() else {}
                    }

                    f.write(json.dumps(record) + '\n')
                    messages_backed_up += 1

                    # Track offsets
                    partition_offsets[msg.partition()] = msg.offset()

                    if messages_backed_up % 10000 == 0:
                        print(f"Backed up {messages_backed_up} messages...")

                # Write footer with offset information
                footer = {
                    'type': 'backup_footer',
                    'total_messages': messages_backed_up,
                    'partition_offsets': partition_offsets
                }
                f.write(json.dumps(footer) + '\n')

        finally:
            consumer.close()

        print(f"Backup complete: {messages_backed_up} messages to {filename}")
        return filename

    def backup_topic_to_s3(self, topic: str, bucket: str,
                           prefix: str = 'kafka-backup') -> str:
        """Backup a topic directly to S3."""
        s3_client = boto3.client('s3')
        consumer = Consumer(self.consumer_config)
        consumer.subscribe([topic])

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        s3_key = f"{prefix}/{topic}/{timestamp}.json.gz"

        messages = []
        messages_backed_up = 0

        try:
            while True:
                msg = consumer.poll(timeout=10.0)

                if msg is None:
                    break

                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    raise KafkaException(msg.error())

                record = {
                    'partition': msg.partition(),
                    'offset': msg.offset(),
                    'timestamp': msg.timestamp()[1],
                    'key': msg.key().decode('utf-8') if msg.key() else None,
                    'value': msg.value().decode('utf-8') if msg.value() else None
                }
                messages.append(record)
                messages_backed_up += 1

                # Upload in batches of 100k messages
                if len(messages) >= 100000:
                    self._upload_batch_to_s3(s3_client, bucket, s3_key,
                                            messages, messages_backed_up)
                    messages = []

            # Upload remaining messages
            if messages:
                self._upload_batch_to_s3(s3_client, bucket, s3_key,
                                        messages, messages_backed_up)

        finally:
            consumer.close()

        print(f"Backup complete: {messages_backed_up} messages to s3://{bucket}/{s3_key}")
        return f"s3://{bucket}/{s3_key}"

    def _upload_batch_to_s3(self, s3_client, bucket: str, key: str,
                           messages: list, total_count: int):
        """Upload a batch of messages to S3."""
        import io

        buffer = io.BytesIO()
        with gzip.GzipFile(fileobj=buffer, mode='wb') as gz:
            for msg in messages:
                gz.write((json.dumps(msg) + '\n').encode('utf-8'))

        buffer.seek(0)
        part_key = key.replace('.json.gz', f'_part{total_count}.json.gz')
        s3_client.upload_fileobj(buffer, bucket, part_key)
        print(f"Uploaded batch to {part_key}")

    def get_topic_offsets(self, topic: str) -> Dict[int, Dict[str, int]]:
        """Get current offsets for a topic."""
        metadata = self.admin_client.list_topics(timeout=10)

        if topic not in metadata.topics:
            raise ValueError(f"Topic {topic} not found")

        topic_metadata = metadata.topics[topic]
        offsets = {}

        consumer = Consumer(self.consumer_config)

        for partition_id in topic_metadata.partitions.keys():
            tp = TopicPartition(topic, partition_id)

            # Get earliest offset
            consumer.assign([tp])
            low, high = consumer.get_watermark_offsets(tp)

            offsets[partition_id] = {
                'earliest': low,
                'latest': high,
                'messages': high - low
            }

        consumer.close()
        return offsets


def main():
    backup = KafkaBackup(
        bootstrap_servers='localhost:9092',
        group_id='kafka-backup-tool'
    )

    # Backup to local file
    backup.backup_topic_to_file('orders', '/tmp/kafka-backups')

    # Backup to S3
    # backup.backup_topic_to_s3('orders', 'my-backup-bucket')


if __name__ == '__main__':
    from confluent_kafka import TopicPartition
    main()
```

## Method 3: Restore from Backup

### Java Restore Implementation

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;

import java.io.*;
import java.util.Properties;
import java.util.zip.GZIPInputStream;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

public class KafkaRestore {

    private final KafkaProducer<String, String> producer;
    private final Gson gson = new Gson();

    public KafkaRestore(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 10);

        this.producer = new KafkaProducer<>(props);
    }

    public void restoreFromFile(String backupFile, String targetTopic)
            throws IOException {

        long restoredCount = 0;
        long skippedCount = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                    new GZIPInputStream(
                        new FileInputStream(backupFile))))) {

            String line;
            while ((line = reader.readLine()) != null) {
                JsonObject record = gson.fromJson(line, JsonObject.class);

                // Skip metadata and footer records
                if (record.has("type")) {
                    String type = record.get("type").getAsString();
                    if ("kafka_backup_v1".equals(type) || "backup_footer".equals(type)) {
                        continue;
                    }
                }

                // Extract message data
                String key = record.has("key") && !record.get("key").isJsonNull() ?
                    record.get("key").getAsString() : null;
                String value = record.has("value") && !record.get("value").isJsonNull() ?
                    record.get("value").getAsString() : null;

                if (value == null) {
                    skippedCount++;
                    continue;
                }

                // Send to target topic
                ProducerRecord<String, String> producerRecord =
                    new ProducerRecord<>(targetTopic, key, value);

                producer.send(producerRecord, (metadata, exception) -> {
                    if (exception != null) {
                        System.err.println("Error sending message: " + exception.getMessage());
                    }
                });

                restoredCount++;

                if (restoredCount % 10000 == 0) {
                    System.out.println("Restored " + restoredCount + " messages...");
                }
            }
        }

        producer.flush();
        System.out.printf("Restore complete: %d messages restored, %d skipped%n",
            restoredCount, skippedCount);
    }

    public void close() {
        producer.close();
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.out.println("Usage: KafkaRestore <backup-file> <target-topic>");
            System.exit(1);
        }

        KafkaRestore restore = new KafkaRestore("localhost:9092");
        try {
            restore.restoreFromFile(args[0], args[1]);
        } finally {
            restore.close();
        }
    }
}
```

### Python Restore Implementation

```python
from confluent_kafka import Producer
import json
import gzip
from typing import Optional

class KafkaRestore:
    def __init__(self, bootstrap_servers: str):
        self.producer_config = {
            'bootstrap.servers': bootstrap_servers,
            'acks': 'all',
            'retries': 3,
            'batch.size': 16384,
            'linger.ms': 10
        }
        self.producer = Producer(self.producer_config)

    def delivery_callback(self, err, msg):
        if err:
            print(f"Delivery failed: {err}")

    def restore_from_file(self, backup_file: str, target_topic: str,
                         preserve_partitions: bool = False) -> int:
        """Restore messages from a backup file to a topic."""
        restored_count = 0
        skipped_count = 0

        with gzip.open(backup_file, 'rt', encoding='utf-8') as f:
            for line in f:
                record = json.loads(line)

                # Skip metadata records
                if record.get('type') in ['kafka_backup_v1', 'backup_footer']:
                    continue

                key = record.get('key')
                value = record.get('value')

                if value is None:
                    skipped_count += 1
                    continue

                # Prepare message
                key_bytes = key.encode('utf-8') if key else None
                value_bytes = value.encode('utf-8')

                # Optionally preserve original partition
                partition = record.get('partition') if preserve_partitions else None

                if partition is not None:
                    self.producer.produce(
                        target_topic,
                        key=key_bytes,
                        value=value_bytes,
                        partition=partition,
                        callback=self.delivery_callback
                    )
                else:
                    self.producer.produce(
                        target_topic,
                        key=key_bytes,
                        value=value_bytes,
                        callback=self.delivery_callback
                    )

                restored_count += 1

                if restored_count % 10000 == 0:
                    self.producer.poll(0)
                    print(f"Restored {restored_count} messages...")

        self.producer.flush()
        print(f"Restore complete: {restored_count} restored, {skipped_count} skipped")
        return restored_count

    def restore_from_s3(self, bucket: str, key: str, target_topic: str) -> int:
        """Restore messages from S3 backup."""
        import boto3
        import tempfile

        s3_client = boto3.client('s3')

        with tempfile.NamedTemporaryFile(suffix='.json.gz') as tmp:
            s3_client.download_file(bucket, key, tmp.name)
            return self.restore_from_file(tmp.name, target_topic)


def main():
    restore = KafkaRestore('localhost:9092')

    # Restore from local file
    restore.restore_from_file(
        '/tmp/kafka-backups/orders_20240115_120000.json.gz',
        'orders-restored'
    )

    # Restore from S3
    # restore.restore_from_s3('my-backup-bucket', 'kafka-backup/orders/backup.json.gz', 'orders-restored')


if __name__ == '__main__':
    main()
```

## Method 4: Kafka Connect S3 Sink for Continuous Archival

For continuous backup to S3, use Kafka Connect with the S3 Sink Connector.

### Connector Configuration

```json
{
  "name": "s3-backup-sink",
  "config": {
    "connector.class": "io.confluent.connect.s3.S3SinkConnector",
    "tasks.max": "3",
    "topics": "orders,events,logs",

    "s3.bucket.name": "kafka-backup-bucket",
    "s3.region": "us-east-1",
    "s3.part.size": "5242880",

    "storage.class": "io.confluent.connect.s3.storage.S3Storage",
    "format.class": "io.confluent.connect.s3.format.json.JsonFormat",

    "partitioner.class": "io.confluent.connect.storage.partitioner.TimeBasedPartitioner",
    "path.format": "'year'=YYYY/'month'=MM/'day'=dd/'hour'=HH",
    "partition.duration.ms": "3600000",
    "locale": "en-US",
    "timezone": "UTC",

    "flush.size": "10000",
    "rotate.interval.ms": "600000",

    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter.schemas.enable": "false"
  }
}
```

### Deploy the Connector

```bash
# Deploy connector
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @s3-sink-config.json

# Check status
curl http://localhost:8083/connectors/s3-backup-sink/status
```

## Consumer Offset Backup

Do not forget to backup consumer offsets for proper restore:

```python
from confluent_kafka.admin import AdminClient
from confluent_kafka import Consumer
import json

class ConsumerOffsetBackup:
    def __init__(self, bootstrap_servers: str):
        self.admin_client = AdminClient({
            'bootstrap.servers': bootstrap_servers
        })

    def backup_consumer_offsets(self, group_id: str, output_file: str):
        """Backup consumer group offsets."""
        consumer = Consumer({
            'bootstrap.servers': self.admin_client._conf.get('bootstrap.servers'),
            'group.id': group_id,
            'enable.auto.commit': False
        })

        # Get committed offsets for all topics
        offsets = {}

        try:
            # List all topics the group has committed offsets for
            group_metadata = self.admin_client.list_consumer_groups()

            # Get committed offsets
            committed = consumer.committed([])  # Would need topic partitions

            for tp, offset in committed.items() if committed else []:
                topic = tp.topic
                partition = tp.partition

                if topic not in offsets:
                    offsets[topic] = {}
                offsets[topic][partition] = offset.offset

        finally:
            consumer.close()

        # Save to file
        backup_data = {
            'group_id': group_id,
            'timestamp': datetime.now().isoformat(),
            'offsets': offsets
        }

        with open(output_file, 'w') as f:
            json.dump(backup_data, f, indent=2)

        print(f"Consumer offsets backed up to {output_file}")
        return offsets

    def restore_consumer_offsets(self, backup_file: str):
        """Restore consumer group offsets from backup."""
        with open(backup_file, 'r') as f:
            backup_data = json.load(f)

        group_id = backup_data['group_id']
        offsets = backup_data['offsets']

        consumer = Consumer({
            'bootstrap.servers': self.admin_client._conf.get('bootstrap.servers'),
            'group.id': group_id,
            'enable.auto.commit': False
        })

        try:
            topic_partitions = []
            for topic, partitions in offsets.items():
                for partition, offset in partitions.items():
                    tp = TopicPartition(topic, int(partition), offset)
                    topic_partitions.append(tp)

            consumer.commit(offsets=topic_partitions)
            print(f"Restored offsets for group {group_id}")

        finally:
            consumer.close()


from datetime import datetime
from confluent_kafka import TopicPartition
```

## Automated Backup Script

Create a cron job for automated backups:

```bash
#!/bin/bash
# kafka-backup.sh

BACKUP_DIR="/var/backups/kafka"
RETENTION_DAYS=30
TOPICS="orders events logs"
BOOTSTRAP_SERVER="localhost:9092"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup each topic
for topic in $TOPICS; do
    python3 kafka_backup.py \
        --bootstrap-server $BOOTSTRAP_SERVER \
        --topic $topic \
        --output-dir $BACKUP_DIR
done

# Clean old backups
find $BACKUP_DIR -name "*.json.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed at $(date)"
```

## Best Practices

### 1. Test Restores Regularly

```python
def verify_restore(original_backup: str, restored_topic: str,
                   bootstrap_servers: str) -> bool:
    """Verify restore by comparing message counts."""
    # Count messages in backup
    backup_count = 0
    with gzip.open(original_backup, 'rt') as f:
        for line in f:
            record = json.loads(line)
            if record.get('type') not in ['kafka_backup_v1', 'backup_footer']:
                backup_count += 1

    # Count messages in restored topic
    consumer = Consumer({
        'bootstrap.servers': bootstrap_servers,
        'group.id': 'verify-restore',
        'auto.offset.reset': 'earliest'
    })
    consumer.subscribe([restored_topic])

    restored_count = 0
    while True:
        msg = consumer.poll(5.0)
        if msg is None:
            break
        if not msg.error():
            restored_count += 1

    consumer.close()

    match = backup_count == restored_count
    print(f"Backup: {backup_count}, Restored: {restored_count}, Match: {match}")
    return match
```

### 2. Monitor Backup Jobs

Track backup metrics:
- Backup duration
- Message count
- Storage size
- Success/failure rate

### 3. Encrypt Sensitive Backups

```python
from cryptography.fernet import Fernet

def encrypt_backup(input_file: str, output_file: str, key: bytes):
    """Encrypt a backup file."""
    fernet = Fernet(key)

    with open(input_file, 'rb') as f:
        data = f.read()

    encrypted = fernet.encrypt(data)

    with open(output_file, 'wb') as f:
        f.write(encrypted)
```

## Conclusion

Kafka backup and restore requires a multi-faceted approach depending on your requirements. MirrorMaker 2 provides continuous replication for disaster recovery with near-zero RPO. Consumer-based backups offer flexibility for archival and compliance needs. Kafka Connect S3 Sink enables continuous archival to object storage. Choose the strategy that best fits your recovery time objective (RTO), recovery point objective (RPO), and operational capabilities.

Always test your backup and restore procedures regularly, and document your disaster recovery runbooks to ensure smooth recovery when needed.
