# Kafka vs Pulsar: Streaming Platform Comparison

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Apache Pulsar, Message Broker, Streaming, Comparison, Architecture

Description: A comprehensive comparison of Apache Kafka and Apache Pulsar, covering architecture differences, performance characteristics, features, and guidance on choosing the right streaming platform.

---

Apache Kafka and Apache Pulsar are both distributed messaging and streaming platforms, but they have different architectures and trade-offs. This guide helps you choose the right platform for your use case.

## Architecture Comparison

### Kafka Architecture

```
+-------------------+
|    Producers      |
+--------+----------+
         |
         v
+--------+----------+
|   Kafka Brokers   |  <- Data stored on brokers
|   (Stateful)      |
+--------+----------+
         |
         v
+--------+----------+
|    Consumers      |
+-------------------+

Storage: Local disk on brokers
Coordination: ZooKeeper or KRaft
```

### Pulsar Architecture

```
+-------------------+
|    Producers      |
+--------+----------+
         |
         v
+--------+----------+
|   Pulsar Brokers  |  <- Stateless, handle routing
|   (Stateless)     |
+--------+----------+
         |
         v
+--------+----------+
|    BookKeeper     |  <- Distributed storage
|    (Bookies)      |
+-------------------+

Storage: BookKeeper (distributed log)
Coordination: ZooKeeper (metadata)
```

## Feature Comparison

| Feature | Kafka | Pulsar |
|---------|-------|--------|
| Storage Architecture | Broker-local | Separate (BookKeeper) |
| Multi-tenancy | Limited | Native support |
| Geo-replication | MirrorMaker 2 | Built-in |
| Message TTL | Per-topic retention | Per-message TTL |
| Subscription modes | Consumer groups | Exclusive, Shared, Failover, Key_Shared |
| Schema Registry | Separate component | Built-in |
| Functions | Kafka Streams | Pulsar Functions |
| Transactions | Yes | Yes |
| Tiered Storage | Confluent only | Built-in |

## Performance Characteristics

### Latency

| Scenario | Kafka | Pulsar |
|----------|-------|--------|
| P50 latency | ~2-5ms | ~5-10ms |
| P99 latency | ~10-20ms | ~20-50ms |
| Tail latency | Better | Higher variability |

### Throughput

| Scenario | Kafka | Pulsar |
|----------|-------|--------|
| Single partition | ~100K msg/s | ~50K msg/s |
| Multi-partition | Scales well | Scales well |
| Batching efficiency | Excellent | Good |

## Subscription Models

### Kafka Consumer Groups

```java
// Kafka - Consumer group model
Properties props = new Properties();
props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-processors");
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");

Consumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Collections.singletonList("orders"));

// All consumers in group share partitions
// One partition = one consumer max
```

### Pulsar Subscription Types

```java
// Pulsar - Multiple subscription types
PulsarClient client = PulsarClient.builder()
    .serviceUrl("pulsar://localhost:6650")
    .build();

// Exclusive - Only one consumer
Consumer<String> exclusive = client.newConsumer(Schema.STRING)
    .topic("orders")
    .subscriptionName("exclusive-sub")
    .subscriptionType(SubscriptionType.Exclusive)
    .subscribe();

// Shared - Round-robin to multiple consumers
Consumer<String> shared = client.newConsumer(Schema.STRING)
    .topic("orders")
    .subscriptionName("shared-sub")
    .subscriptionType(SubscriptionType.Shared)
    .subscribe();

// Key_Shared - Messages with same key to same consumer
Consumer<String> keyShared = client.newConsumer(Schema.STRING)
    .topic("orders")
    .subscriptionName("key-shared-sub")
    .subscriptionType(SubscriptionType.Key_Shared)
    .subscribe();
```

## Multi-Tenancy

### Kafka (Limited)

```bash
# Kafka uses ACLs for isolation
kafka-acls.sh --bootstrap-server localhost:9092 \
  --add --allow-principal User:tenant1 \
  --operation All \
  --topic "tenant1-" --resource-pattern-type prefixed
```

### Pulsar (Native)

```bash
# Pulsar has built-in multi-tenancy
# Hierarchy: tenant/namespace/topic

# Create tenant
pulsar-admin tenants create tenant1

# Create namespace with policies
pulsar-admin namespaces create tenant1/production
pulsar-admin namespaces set-retention tenant1/production \
  --size 100G --time 7d

# Topic is automatically scoped
# persistent://tenant1/production/orders
```

## Geo-Replication

### Kafka with MirrorMaker 2

```properties
# Requires separate MirrorMaker 2 cluster
clusters = dc1, dc2
dc1->dc2.enabled = true
dc1->dc2.topics = orders.*
```

### Pulsar Built-in

```bash
# Enable geo-replication on namespace
pulsar-admin namespaces set-clusters tenant1/production \
  --clusters cluster-a,cluster-b

# Messages automatically replicated
# Consumers can read from any cluster
```

## Tiered Storage

### Pulsar (Built-in)

```properties
# Offload old data to S3
managedLedgerOffloadDriver=aws-s3
s3ManagedLedgerOffloadBucket=pulsar-offload
managedLedgerOffloadThresholdInBytes=1073741824
```

### Kafka (Confluent Platform)

```properties
# Confluent Platform feature
confluent.tier.enable=true
confluent.tier.backend=S3
confluent.tier.s3.bucket=kafka-tier
```

## When to Choose Kafka

- High throughput requirements (100K+ msg/s)
- Simple consumer group model is sufficient
- Strong ecosystem (Kafka Connect, Kafka Streams)
- Lower latency requirements
- Existing Kafka expertise
- Cost-sensitive (simpler infrastructure)

## When to Choose Pulsar

- Multi-tenant SaaS platform
- Built-in geo-replication needed
- Flexible subscription models required
- Tiered storage without enterprise license
- Message-level TTL needed
- Compute (Pulsar Functions) tightly integrated

## Migration Considerations

### Kafka to Pulsar

```java
// Pulsar Kafka wrapper for compatibility
Consumer<byte[], byte[]> consumer = new PulsarKafkaConsumer<>(
    Map.of(
        "bootstrap.servers", "pulsar://localhost:6650",
        "group.id", "migrating-group",
        "key.deserializer", ByteArrayDeserializer.class,
        "value.deserializer", ByteArrayDeserializer.class
    )
);
```

### Pulsar to Kafka

```java
// Use Pulsar Kafka connector
// Or rewrite using Kafka client libraries
```

## Cost Comparison

| Component | Kafka | Pulsar |
|-----------|-------|--------|
| Brokers | Stateful (need storage) | Stateless (cheaper) |
| Storage | Broker disks | BookKeeper cluster |
| Operational complexity | Lower | Higher |
| Cloud offerings | Many (Confluent, MSK) | Fewer (StreamNative) |

## Summary

| Criteria | Winner |
|----------|--------|
| Raw throughput | Kafka |
| Latency | Kafka |
| Multi-tenancy | Pulsar |
| Geo-replication | Pulsar |
| Ecosystem | Kafka |
| Operational simplicity | Kafka |
| Flexibility | Pulsar |

Choose Kafka for high-throughput streaming with simpler requirements. Choose Pulsar for multi-tenant platforms with advanced messaging needs. Both are excellent choices for event-driven architectures.
