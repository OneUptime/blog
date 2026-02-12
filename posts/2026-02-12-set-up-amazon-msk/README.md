# How to Set Up Amazon MSK (Managed Streaming for Kafka)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, MSK, Kafka, Streaming, Data Engineering

Description: Complete walkthrough for setting up an Amazon MSK cluster including networking, security, topic configuration, and connecting your first producers and consumers.

---

Amazon MSK gives you Apache Kafka without the pain of managing ZooKeeper, broker patches, and disk space alerts at 3 AM. It runs the actual open-source Kafka, so all your existing Kafka tools, clients, and knowledge transfer directly. Let's get a production-ready cluster running.

## Planning Your Cluster

Before creating anything, decide on a few things:

- **Broker count** - Minimum 3 for production (one per AZ). Scale up for higher throughput.
- **Instance type** - kafka.m5.large for moderate workloads, kafka.m5.2xlarge for heavy ones.
- **Storage** - EBS volumes per broker. Calculate based on throughput times retention.
- **Networking** - MSK runs in your VPC. You need subnets in at least 2 AZs (3 recommended).

Quick storage calculation: if you're ingesting 10 MB/sec with 3x replication and 7-day retention:

```
10 MB/sec x 86,400 sec/day x 7 days x 3 replicas = ~18 TB
Divided by 3 brokers = ~6 TB per broker
Add 20% overhead = ~7.2 TB per broker
```

## Creating the Cluster via CLI

First, set up the networking. You need a VPC with subnets in multiple AZs.

This creates an MSK cluster with 3 brokers spread across 3 availability zones.

```bash
aws kafka create-cluster \
  --cluster-name production-kafka \
  --kafka-version 3.6.0 \
  --number-of-broker-nodes 3 \
  --broker-node-group-info '{
    "InstanceType": "kafka.m5.large",
    "ClientSubnets": [
      "subnet-az1-abc123",
      "subnet-az2-def456",
      "subnet-az3-ghi789"
    ],
    "SecurityGroups": ["sg-kafka-brokers"],
    "StorageInfo": {
      "EbsStorageInfo": {
        "VolumeSize": 1000,
        "ProvisionedThroughput": {
          "Enabled": true,
          "VolumeThroughput": 250
        }
      }
    }
  }' \
  --encryption-info '{
    "EncryptionInTransit": {
      "ClientBroker": "TLS",
      "InCluster": true
    },
    "EncryptionAtRest": {
      "DataVolumeKMSKeyId": "arn:aws:kms:us-east-1:123456789:key/my-key-id"
    }
  }' \
  --enhanced-monitoring PER_TOPIC_PER_BROKER \
  --open-monitoring '{
    "Prometheus": {
      "JmxExporter": {"EnabledInBroker": true},
      "NodeExporter": {"EnabledInBroker": true}
    }
  }' \
  --logging-info '{
    "BrokerLogs": {
      "CloudWatchLogs": {
        "Enabled": true,
        "LogGroup": "/msk/production-kafka"
      },
      "S3": {
        "Enabled": true,
        "Bucket": "my-msk-logs",
        "Prefix": "production-kafka/"
      }
    }
  }'
```

The cluster takes about 15-20 minutes to create. Check the status:

```bash
aws kafka describe-cluster \
  --cluster-arn arn:aws:kafka:us-east-1:123456789:cluster/production-kafka/abc-123 \
  --query 'ClusterInfo.State'
```

## Custom Configuration

MSK lets you customize Kafka broker configuration. Create a custom configuration for production settings.

This creates an MSK configuration with tuned broker settings for production use.

```bash
# Create a configuration file
cat > kafka-config.properties << 'EOF'
auto.create.topics.enable=false
default.replication.factor=3
min.insync.replicas=2
num.partitions=6
log.retention.hours=168
log.retention.bytes=-1
log.segment.bytes=1073741824
message.max.bytes=1048576
replica.lag.time.max.ms=30000
unclean.leader.election.enable=false
compression.type=producer
EOF

# Create the MSK configuration
aws kafka create-configuration \
  --name production-config \
  --kafka-versions 3.6.0 \
  --server-properties fileb://kafka-config.properties \
  --description "Production Kafka configuration"
```

Apply the configuration when creating the cluster by adding it to the create-cluster command:

```bash
--configuration-info '{
  "Arn": "arn:aws:kafka:us-east-1:123456789:configuration/production-config/abc-123",
  "Revision": 1
}'
```

Key settings explained:
- `auto.create.topics.enable=false` - Prevent accidental topic creation. Create topics explicitly.
- `min.insync.replicas=2` - With replication factor 3, this ensures data is written to at least 2 brokers.
- `unclean.leader.election.enable=false` - Prevents data loss when a leader fails.

## Getting the Bootstrap Servers

Once the cluster is active, get the bootstrap broker addresses.

```bash
# For TLS connections
aws kafka get-bootstrap-brokers \
  --cluster-arn arn:aws:kafka:us-east-1:123456789:cluster/production-kafka/abc-123 \
  --query 'BootstrapBrokerStringTls'

# Output: b-1.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094,b-2...
```

## Creating Topics

Connect to the cluster and create your topics. You'll need a client machine in the same VPC.

This creates a Kafka topic with appropriate replication and partitioning.

```bash
# Install Kafka CLI tools
wget https://archive.apache.org/dist/kafka/3.6.0/kafka_2.13-3.6.0.tgz
tar xzf kafka_2.13-3.6.0.tgz

# Set the bootstrap servers
BROKERS="b-1.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094,b-2.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094,b-3.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094"

# Create a topic
kafka_2.13-3.6.0/bin/kafka-topics.sh \
  --bootstrap-server $BROKERS \
  --command-config client.properties \
  --create \
  --topic user-events \
  --partitions 12 \
  --replication-factor 3

# List topics
kafka_2.13-3.6.0/bin/kafka-topics.sh \
  --bootstrap-server $BROKERS \
  --command-config client.properties \
  --list
```

The client.properties file for TLS connections:

```properties
security.protocol=SSL
```

## Connecting a Producer

Here's a Python producer connecting to MSK with TLS.

This Python producer sends events to an MSK topic using SSL encryption.

```python
from kafka import KafkaProducer
import json
import ssl

producer = KafkaProducer(
    bootstrap_servers=[
        'b-1.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094',
        'b-2.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094',
        'b-3.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094'
    ],
    security_protocol='SSL',
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8') if k else None,
    acks='all',                # Wait for all replicas
    retries=3,
    batch_size=32768,          # 32 KB batches
    linger_ms=10,              # Wait up to 10ms to fill batches
    compression_type='snappy'
)

# Send an event
event = {
    'userId': 'user-123',
    'eventType': 'page_view',
    'page': '/products/widget-a',
    'timestamp': 1707753600000
}

future = producer.send(
    topic='user-events',
    key=event['userId'],
    value=event
)

# Wait for confirmation
metadata = future.get(timeout=10)
print(f"Sent to {metadata.topic}:{metadata.partition}:{metadata.offset}")

producer.flush()
producer.close()
```

## Connecting a Consumer

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'user-events',
    bootstrap_servers=[
        'b-1.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094',
        'b-2.production-kafka.abc123.c1.kafka.us-east-1.amazonaws.com:9094'
    ],
    security_protocol='SSL',
    group_id='event-processor',
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    auto_commit_interval_ms=5000,
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    event = message.value
    print(f"Received: {event['eventType']} from {event['userId']}")
    print(f"Partition: {message.partition}, Offset: {message.offset}")
```

## Monitoring

MSK publishes extensive metrics to CloudWatch. The enhanced monitoring level (PER_TOPIC_PER_BROKER) gives you the most detail.

Critical metrics to watch:

```bash
# Check under-replicated partitions
aws cloudwatch get-metric-statistics \
  --namespace AWS/Kafka \
  --metric-name UnderReplicatedPartitions \
  --dimensions Name=Cluster\ Name,Value=production-kafka \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum
```

Set up alarms for:
- `UnderReplicatedPartitions` > 0
- `KafkaDataLogsDiskUsed` > 80%
- `ActiveControllerCount` != 1
- `OfflinePartitionsCount` > 0

For security configuration, check out our guide on [configuring MSK cluster security](https://oneuptime.com/blog/post/configure-msk-cluster-security/view). For a comparison with Kinesis, see [Kinesis vs Kafka comparison](https://oneuptime.com/blog/post/compare-kinesis-vs-kafka-msk/view).

## Scaling

MSK supports two types of scaling:

**Broker storage scaling** - Increase EBS volume size without downtime.

```bash
aws kafka update-broker-storage \
  --cluster-arn arn:aws:kafka:us-east-1:123456789:cluster/production-kafka/abc-123 \
  --target-broker-ebs-volume-info '[
    {"KafkaBrokerNodeId": "All", "VolumeSizeGB": 2000}
  ]'
```

**Broker count scaling** - Add more brokers. Note: existing partitions don't automatically rebalance to new brokers. You need to reassign partitions manually.

```bash
aws kafka update-broker-count \
  --cluster-arn arn:aws:kafka:us-east-1:123456789:cluster/production-kafka/abc-123 \
  --target-number-of-broker-nodes 6
```

Getting MSK right from the start saves you from painful re-architecture later. Focus on your replication settings, monitoring, and security configuration - those are the three pillars that keep production Kafka clusters healthy.
