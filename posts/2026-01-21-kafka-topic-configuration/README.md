# How to Set Up Kafka Topic Configuration Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Topic Configuration, Partitions, Replication, Retention, Best Practices

Description: Learn Kafka topic configuration best practices including partition count, replication factor, retention settings, and compaction policies for optimal performance and reliability.

---

Proper topic configuration is crucial for Kafka performance, reliability, and cost optimization. This guide covers best practices for partitions, replication, retention, and other key settings.

## Creating Topics

### Basic Topic Creation

```bash
# Create topic with defaults
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic my-topic

# Create topic with specific settings
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic orders \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config min.insync.replicas=2
```

### Describe and Alter Topics

```bash
# Describe topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic orders

# Alter topic partitions (increase only)
kafka-topics.sh --bootstrap-server localhost:9092 \
  --alter --topic orders --partitions 24

# Alter topic config
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name orders \
  --alter --add-config retention.ms=259200000

# Delete config (use default)
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name orders \
  --alter --delete-config retention.ms
```

## Partition Count

### Guidelines

```
Partitions = max(T/P, T/C)

Where:
T = Target throughput (MB/s)
P = Producer throughput per partition (~10 MB/s typical)
C = Consumer throughput per partition
```

### Recommendations

| Use Case | Partitions | Rationale |
|----------|------------|-----------|
| Low volume | 3-6 | Overhead minimization |
| Medium volume | 12-24 | Balance parallelism |
| High volume | 50-100 | Maximum throughput |
| Very high volume | 100+ | Extreme scalability |

```bash
# High-throughput topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic events \
  --partitions 48 \
  --replication-factor 3

# Low-volume config topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic config \
  --partitions 1 \
  --replication-factor 3
```

## Replication Factor

### Production Settings

```bash
# Standard production topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic critical-data \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2
```

### Durability Matrix

| Replication | min.insync.replicas | Durability | Availability |
|-------------|---------------------|------------|--------------|
| 1 | 1 | None | Single broker |
| 2 | 1 | Basic | One failure |
| 3 | 2 | Strong | One failure |
| 3 | 3 | Maximum | No failures |

## Retention Configuration

### Time-Based Retention

```bash
# 7-day retention
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name events \
  --alter --add-config retention.ms=604800000

# 30-day retention
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name audit-log \
  --alter --add-config retention.ms=2592000000

# Infinite retention
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name event-store \
  --alter --add-config retention.ms=-1
```

### Size-Based Retention

```bash
# 100GB per partition
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name logs \
  --alter --add-config retention.bytes=107374182400

# Combined (whichever triggers first)
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name data \
  --alter --add-config retention.ms=604800000 \
  --add-config retention.bytes=53687091200
```

### Segment Configuration

```bash
# Segment size (1GB)
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name events \
  --alter --add-config segment.bytes=1073741824

# Segment roll time (1 hour)
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name events \
  --alter --add-config segment.ms=3600000
```

## Compaction

### Log Compaction for State Topics

```bash
# Compacted topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic user-profiles \
  --partitions 12 \
  --replication-factor 3 \
  --config cleanup.policy=compact \
  --config min.cleanable.dirty.ratio=0.1 \
  --config delete.retention.ms=86400000

# Compact + Delete (hybrid)
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic changelog \
  --partitions 12 \
  --replication-factor 3 \
  --config cleanup.policy=compact,delete \
  --config retention.ms=604800000
```

### Compaction Settings

```bash
# Aggressive compaction
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name state-store \
  --alter \
  --add-config cleanup.policy=compact \
  --add-config min.cleanable.dirty.ratio=0.01 \
  --add-config max.compaction.lag.ms=86400000 \
  --add-config min.compaction.lag.ms=0 \
  --add-config segment.ms=3600000
```

## Compression

```bash
# Enable compression (recommended: lz4 or zstd)
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name events \
  --alter --add-config compression.type=lz4

# Compression options: none, gzip, snappy, lz4, zstd
```

| Compression | CPU Usage | Compression Ratio | Speed |
|-------------|-----------|-------------------|-------|
| none | None | 1:1 | Fastest |
| lz4 | Low | ~2:1 | Fast |
| snappy | Low | ~2:1 | Fast |
| zstd | Medium | ~3:1 | Medium |
| gzip | High | ~3:1 | Slow |

## Message Size

```bash
# Increase max message size (default 1MB)
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name large-messages \
  --alter --add-config max.message.bytes=10485760
```

Also configure broker and producer:

```properties
# Broker
message.max.bytes=10485760

# Producer
max.request.size=10485760
```

## Complete Production Topic

```bash
# High-volume production topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic orders \
  --partitions 24 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --config retention.bytes=107374182400 \
  --config segment.bytes=1073741824 \
  --config compression.type=lz4 \
  --config cleanup.policy=delete \
  --config unclean.leader.election.enable=false

# Event sourcing topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic events \
  --partitions 48 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=-1 \
  --config compression.type=zstd \
  --config cleanup.policy=delete

# State/lookup topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic user-state \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config cleanup.policy=compact \
  --config min.cleanable.dirty.ratio=0.1 \
  --config delete.retention.ms=86400000
```

## Monitoring Topic Health

```bash
# Check under-replicated partitions
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Check unavailable partitions
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --unavailable-partitions

# List all topic configs
kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics --describe --all
```

## Best Practices Summary

| Setting | Development | Production |
|---------|-------------|------------|
| Partitions | 3-6 | Based on throughput |
| Replication | 1 | 3 |
| min.insync.replicas | 1 | 2 |
| retention.ms | 1 day | 7+ days |
| compression.type | none | lz4/zstd |
| cleanup.policy | delete | Based on use case |

Proper topic configuration balances performance, durability, and cost. Start with these best practices and adjust based on your specific requirements.
