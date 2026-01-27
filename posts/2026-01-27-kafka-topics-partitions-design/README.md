# How to Design Kafka Topics and Partitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, Topics, Partitions, Messaging, Event Streaming

Description: Learn how to design Kafka topics and partitions for scalability, including partition strategies, replication factors, and ordering guarantees.

---

> Good topic design determines whether your Kafka cluster scales smoothly or becomes a bottleneck. Partitions are the unit of parallelism - get them right from the start.

## Kafka Topic Fundamentals

A Kafka topic is a logical channel for messages. Producers write to topics, and consumers read from them. Each topic is divided into partitions, which are the fundamental unit of parallelism and storage.

| Concept | Description |
|---------|-------------|
| **Topic** | Logical grouping of related messages |
| **Partition** | Ordered, immutable sequence of records |
| **Offset** | Unique identifier for each record in a partition |
| **Segment** | Physical file storing partition data |
| **Replica** | Copy of a partition for fault tolerance |

```bash
# Create a topic with specific partition count and replication factor
# 12 partitions allows scaling up to 12 consumers in a group
# Replication factor of 3 tolerates 2 broker failures
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic orders \
  --partitions 12 \
  --replication-factor 3

# Describe topic configuration
kafka-topics.sh --describe \
  --bootstrap-server localhost:9092 \
  --topic orders
```

## Partition Key Selection

The partition key determines which partition receives each message. Messages with the same key always go to the same partition, guaranteeing ordering for that key.

```java
// Java producer with partition key
// Orders for the same customer go to the same partition
// This ensures all events for a customer are processed in order
public class OrderProducer {
    private final KafkaProducer<String, String> producer;

    public OrderProducer(Properties props) {
        this.producer = new KafkaProducer<>(props);
    }

    public void sendOrder(Order order) {
        // Use customer ID as partition key
        // All orders from the same customer land in the same partition
        String key = order.getCustomerId();
        String value = serializeOrder(order);

        ProducerRecord<String, String> record =
            new ProducerRecord<>("orders", key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                logger.error("Failed to send order", exception);
            } else {
                logger.info("Order sent to partition {} offset {}",
                    metadata.partition(), metadata.offset());
            }
        });
    }
}
```

```python
# Python producer with partition key selection
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    key_serializer=lambda k: k.encode('utf-8'),
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def send_event(topic: str, entity_id: str, event: dict):
    """
    Send event with entity_id as partition key.
    All events for the same entity are ordered within their partition.
    """
    future = producer.send(
        topic,
        key=entity_id,      # Partition key ensures ordering per entity
        value=event
    )

    # Block until acknowledgment (for critical messages)
    record_metadata = future.get(timeout=10)
    print(f"Sent to partition {record_metadata.partition}")
```

Choosing the right partition key:

| Use Case | Recommended Key | Reason |
|----------|-----------------|--------|
| Order processing | Customer ID | Orders per customer stay ordered |
| IoT telemetry | Device ID | Events per device stay ordered |
| User activity | User ID | User timeline remains consistent |
| Payment processing | Transaction ID | Idempotent processing |
| Multi-tenant SaaS | Tenant ID | Tenant isolation |

## Number of Partitions Planning

The number of partitions directly impacts throughput and consumer parallelism. More partitions mean more parallel consumers, but also more overhead.

```python
# Calculate partitions based on throughput requirements
def calculate_partitions(
    target_throughput_mb_per_sec: float,
    single_partition_throughput_mb: float = 10.0,  # Conservative estimate
    consumer_count: int = None,
    future_growth_factor: float = 2.0
) -> int:
    """
    Calculate recommended partition count.

    Rules of thumb:
    - Each partition can handle ~10 MB/s write throughput
    - Number of partitions >= number of consumers for parallelism
    - Plan for 2x future growth
    - More partitions = more file handles and memory
    """

    # Throughput-based calculation
    partitions_for_throughput = int(
        target_throughput_mb_per_sec / single_partition_throughput_mb
    )

    # Consumer-based calculation
    partitions_for_consumers = consumer_count if consumer_count else 1

    # Take the maximum and apply growth factor
    base_partitions = max(partitions_for_throughput, partitions_for_consumers)
    recommended = int(base_partitions * future_growth_factor)

    # Round up to a nice number (powers of 2 or multiples of 6/12)
    nice_numbers = [3, 6, 12, 24, 48, 96, 128, 256]
    for n in nice_numbers:
        if n >= recommended:
            return n

    return recommended

# Example: 50 MB/s throughput, 8 consumers
partitions = calculate_partitions(
    target_throughput_mb_per_sec=50,
    consumer_count=8,
    future_growth_factor=2.0
)
print(f"Recommended partitions: {partitions}")  # Output: 12
```

Partition count guidelines:

| Scenario | Partition Count | Rationale |
|----------|-----------------|-----------|
| Low volume (< 1 MB/s) | 3-6 | Minimal overhead |
| Medium volume (1-50 MB/s) | 12-24 | Good parallelism |
| High volume (50-500 MB/s) | 48-96 | Max consumer scaling |
| Very high volume (> 500 MB/s) | 128+ | Consider multiple topics |

## Replication Factor Considerations

Replication provides fault tolerance. The replication factor determines how many copies of each partition exist across brokers.

```bash
# Create topic with replication factor 3
# Survives loss of 2 brokers (N-1 failures with factor N)
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic critical-events \
  --partitions 24 \
  --replication-factor 3 \
  --config min.insync.replicas=2

# Verify replica placement
kafka-topics.sh --describe \
  --bootstrap-server localhost:9092 \
  --topic critical-events
```

```java
// Producer configuration for durability
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

// acks=all: Wait for all in-sync replicas to acknowledge
// Provides strongest durability guarantee
props.put("acks", "all");

// Retry configuration for transient failures
props.put("retries", 3);
props.put("retry.backoff.ms", 1000);

// Enable idempotent producer to prevent duplicates on retry
props.put("enable.idempotence", true);

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
```

| Replication Factor | Fault Tolerance | Use Case |
|-------------------|-----------------|----------|
| 1 | None | Development only |
| 2 | 1 broker failure | Non-critical data |
| 3 | 2 broker failures | Production standard |
| 4+ | 3+ broker failures | Critical financial data |

## Message Ordering Guarantees

Kafka guarantees ordering only within a partition. Messages across partitions have no ordering guarantee.

```python
# Ensuring order for related events
from kafka import KafkaProducer, KafkaConsumer
import json

class OrderedEventProcessor:
    """
    Process events that must be ordered per entity.
    Uses entity ID as partition key to guarantee ordering.
    """

    def __init__(self, bootstrap_servers: list):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            key_serializer=lambda k: k.encode('utf-8'),
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            # max_in_flight_requests_per_connection=1 guarantees strict ordering
            # but reduces throughput - use only when ordering is critical
            max_in_flight_requests_per_connection=5,
            enable_idempotence=True  # Prevents duplicates, maintains order
        )

    def send_ordered_events(self, entity_id: str, events: list):
        """
        Send multiple events for the same entity.
        All events go to the same partition, maintaining order.
        """
        for event in events:
            # Same key = same partition = ordered delivery
            self.producer.send(
                'entity-events',
                key=entity_id,
                value=event
            )

        # Flush ensures all events are sent before continuing
        self.producer.flush()

# Consumer processing with ordering
consumer = KafkaConsumer(
    'entity-events',
    bootstrap_servers=['localhost:9092'],
    group_id='event-processor',
    # auto_offset_reset='earliest' starts from beginning if no offset stored
    auto_offset_reset='earliest',
    enable_auto_commit=False,  # Manual commit for exactly-once semantics
    value_deserializer=lambda v: json.loads(v.decode('utf-8'))
)

for message in consumer:
    process_event(message.key, message.value)
    # Commit after processing to prevent duplicates on restart
    consumer.commit()
```

## Partition Assignment Strategies

Consumer groups use partition assignment strategies to distribute partitions among consumers.

```java
// Consumer configuration with assignment strategy
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "order-processor");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

// Assignment strategies:
// RangeAssignor: Assigns contiguous partitions per topic (default)
// RoundRobinAssignor: Distributes partitions evenly across consumers
// StickyAssignor: Minimizes partition movement during rebalancing
// CooperativeStickyAssignor: Incremental rebalancing, less disruption

props.put("partition.assignment.strategy",
    "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");

// Session timeout: How long before consumer is considered dead
props.put("session.timeout.ms", 30000);

// Heartbeat interval: How often to send heartbeats (should be < session.timeout/3)
props.put("heartbeat.interval.ms", 10000);

// Max poll interval: Max time between poll() calls before rebalancing
props.put("max.poll.interval.ms", 300000);

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("orders"));
```

| Strategy | Behavior | Best For |
|----------|----------|----------|
| RangeAssignor | Contiguous ranges | Single topic consumption |
| RoundRobinAssignor | Even distribution | Multiple topics, similar load |
| StickyAssignor | Minimizes movement | Long-running consumers |
| CooperativeStickyAssignor | Incremental rebalance | Production workloads |

## Topic Naming Conventions

Consistent naming makes topics discoverable and manageable at scale.

```bash
# Naming pattern: <domain>.<entity>.<event-type>
# Examples:
# - ecommerce.orders.created
# - ecommerce.orders.shipped
# - payments.transactions.completed
# - inventory.stock.updated

# Create topics following naming convention
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic ecommerce.orders.created \
  --partitions 12 \
  --replication-factor 3

kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic ecommerce.orders.shipped \
  --partitions 12 \
  --replication-factor 3
```

```python
# Topic naming utility
class TopicNaming:
    """
    Consistent topic naming for the organization.
    Pattern: {domain}.{entity}.{event_type}
    """

    VALID_DOMAINS = ['ecommerce', 'payments', 'inventory', 'users', 'notifications']

    @staticmethod
    def create_topic_name(domain: str, entity: str, event_type: str) -> str:
        """
        Generate a standardized topic name.

        Args:
            domain: Business domain (e.g., 'ecommerce')
            entity: Entity type (e.g., 'orders')
            event_type: Event type (e.g., 'created', 'updated', 'deleted')

        Returns:
            Formatted topic name
        """
        if domain not in TopicNaming.VALID_DOMAINS:
            raise ValueError(f"Invalid domain: {domain}")

        # Normalize to lowercase, replace spaces with dashes
        entity = entity.lower().replace(' ', '-')
        event_type = event_type.lower().replace(' ', '-')

        return f"{domain}.{entity}.{event_type}"

    @staticmethod
    def parse_topic_name(topic: str) -> dict:
        """Parse topic name into components."""
        parts = topic.split('.')
        if len(parts) != 3:
            raise ValueError(f"Invalid topic name format: {topic}")

        return {
            'domain': parts[0],
            'entity': parts[1],
            'event_type': parts[2]
        }

# Usage
topic = TopicNaming.create_topic_name('ecommerce', 'orders', 'created')
print(topic)  # ecommerce.orders.created
```

## Retention Policies

Retention determines how long Kafka keeps messages. Configure based on your use case.

```bash
# Time-based retention (default: 7 days)
kafka-configs.sh --alter \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name orders \
  --add-config retention.ms=604800000  # 7 days in milliseconds

# Size-based retention (1 GB per partition)
kafka-configs.sh --alter \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name logs \
  --add-config retention.bytes=1073741824

# Short retention for real-time streams (1 hour)
kafka-configs.sh --alter \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name metrics \
  --add-config retention.ms=3600000

# View current retention settings
kafka-configs.sh --describe \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name orders
```

| Use Case | Retention | Rationale |
|----------|-----------|-----------|
| Event sourcing | Infinite | Complete history needed |
| Audit logs | 7 years | Compliance requirements |
| Order events | 30-90 days | Replay for debugging |
| Real-time metrics | 1-24 hours | Only current data matters |
| Log aggregation | 3-7 days | Cost vs debugging needs |

## Compacted Topics Use Cases

Log compaction keeps only the latest value for each key, making topics act like a key-value store.

```bash
# Create a compacted topic for user profiles
# Keeps only the latest profile for each user ID
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic user-profiles \
  --partitions 12 \
  --replication-factor 3 \
  --config cleanup.policy=compact \
  --config min.cleanable.dirty.ratio=0.5 \
  --config segment.ms=86400000
```

```python
# Using compacted topics for configuration/state
from kafka import KafkaProducer, KafkaConsumer
import json

class ConfigurationStore:
    """
    Use a compacted Kafka topic as a distributed configuration store.
    Each config key maps to its latest value.
    """

    def __init__(self, bootstrap_servers: list, topic: str = 'app-config'):
        self.topic = topic
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            key_serializer=lambda k: k.encode('utf-8'),
            value_serializer=lambda v: json.dumps(v).encode('utf-8') if v else None
        )
        self.config_cache = {}

    def set_config(self, key: str, value: dict):
        """
        Set a configuration value.
        Compaction ensures only the latest value is retained.
        """
        self.producer.send(self.topic, key=key, value=value)
        self.producer.flush()
        self.config_cache[key] = value

    def delete_config(self, key: str):
        """
        Delete a configuration by sending a tombstone (null value).
        Compaction will remove this key entirely.
        """
        self.producer.send(self.topic, key=key, value=None)
        self.producer.flush()
        self.config_cache.pop(key, None)

    def load_all_configs(self):
        """
        Read entire compacted topic to build current state.
        Called on startup to initialize config cache.
        """
        consumer = KafkaConsumer(
            self.topic,
            bootstrap_servers=['localhost:9092'],
            auto_offset_reset='earliest',
            enable_auto_commit=False,
            consumer_timeout_ms=5000,
            key_deserializer=lambda k: k.decode('utf-8'),
            value_deserializer=lambda v: json.loads(v.decode('utf-8')) if v else None
        )

        for message in consumer:
            if message.value is None:
                # Tombstone - remove from cache
                self.config_cache.pop(message.key, None)
            else:
                self.config_cache[message.key] = message.value

        consumer.close()
        return self.config_cache

# Usage
config_store = ConfigurationStore(['localhost:9092'])

# Load existing configuration on startup
configs = config_store.load_all_configs()

# Update a configuration
config_store.set_config('feature-flags', {
    'new_checkout': True,
    'dark_mode': False
})
```

Compaction use cases:

| Use Case | Key | Value |
|----------|-----|-------|
| User profiles | User ID | Latest profile data |
| Product catalog | Product ID | Current product info |
| Feature flags | Flag name | Enabled/disabled |
| Session state | Session ID | Current session data |
| CDC snapshots | Primary key | Latest row state |

## Monitoring and Scaling Topics

Monitor topic health and know when to scale partitions.

```python
# Kafka monitoring metrics to track
from kafka.admin import KafkaAdminClient, NewPartitions
from kafka import KafkaConsumer
import time

class TopicMonitor:
    """
    Monitor topic health and lag metrics.
    Alert on high consumer lag or uneven partition distribution.
    """

    def __init__(self, bootstrap_servers: list):
        self.admin = KafkaAdminClient(bootstrap_servers=bootstrap_servers)
        self.bootstrap_servers = bootstrap_servers

    def get_consumer_lag(self, group_id: str, topic: str) -> dict:
        """
        Calculate consumer lag for each partition.
        High lag indicates consumers falling behind.
        """
        consumer = KafkaConsumer(
            bootstrap_servers=self.bootstrap_servers,
            group_id=group_id,
            enable_auto_commit=False
        )

        # Get assigned partitions
        partitions = consumer.partitions_for_topic(topic)
        if not partitions:
            return {}

        from kafka import TopicPartition
        tps = [TopicPartition(topic, p) for p in partitions]

        # Get end offsets (latest available)
        end_offsets = consumer.end_offsets(tps)

        # Get committed offsets (consumer progress)
        committed = {}
        for tp in tps:
            offset = consumer.committed(tp)
            committed[tp] = offset if offset else 0

        # Calculate lag per partition
        lag = {}
        for tp in tps:
            current = committed.get(tp, 0)
            latest = end_offsets.get(tp, 0)
            lag[tp.partition] = latest - current

        consumer.close()
        return lag

    def check_partition_balance(self, topic: str) -> dict:
        """
        Check if partitions are evenly distributed across brokers.
        Uneven distribution causes hot spots.
        """
        metadata = self.admin.describe_topics([topic])

        broker_partitions = {}
        for topic_metadata in metadata:
            for partition in topic_metadata.partitions:
                leader = partition.leader
                if leader not in broker_partitions:
                    broker_partitions[leader] = 0
                broker_partitions[leader] += 1

        return broker_partitions

    def increase_partitions(self, topic: str, new_count: int):
        """
        Increase partition count for a topic.
        WARNING: This can break key-based ordering for existing keys.
        New keys will hash to new partitions, old keys may move.
        """
        new_partitions = {topic: NewPartitions(total_count=new_count)}
        self.admin.create_partitions(new_partitions)
        print(f"Increased {topic} to {new_count} partitions")

# Usage
monitor = TopicMonitor(['localhost:9092'])

# Check consumer lag
lag = monitor.get_consumer_lag('order-processor', 'orders')
total_lag = sum(lag.values())
if total_lag > 10000:
    print(f"WARNING: High consumer lag: {total_lag}")

# Check partition distribution
distribution = monitor.check_partition_balance('orders')
print(f"Partition distribution: {distribution}")
```

Key metrics to monitor:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Consumer lag | > 10,000 messages | Add consumers or optimize processing |
| Under-replicated partitions | > 0 | Check broker health |
| Offline partitions | > 0 | Immediate investigation |
| Log size growth | > expected | Review retention settings |
| Request latency p99 | > 100ms | Check broker resources |

```bash
# Useful kafka commands for monitoring
# Check consumer group lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group order-processor \
  --describe

# Check under-replicated partitions
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe \
  --under-replicated-partitions

# Check topic size
kafka-log-dirs.sh --bootstrap-server localhost:9092 \
  --topic-list orders \
  --describe
```

## Summary

| Aspect | Recommendation |
|--------|----------------|
| **Partition count** | Plan for 2x growth, 12-48 for most use cases |
| **Replication factor** | 3 for production workloads |
| **Partition key** | Choose based on ordering requirements |
| **Naming** | Use domain.entity.event pattern |
| **Retention** | Match business requirements, not defaults |
| **Compaction** | Use for state/config topics |
| **Monitoring** | Track lag, under-replicated partitions |

Good Kafka topic design balances throughput, ordering guarantees, and operational simplicity. Start with conservative partition counts and scale up based on actual metrics rather than guessing.

---

Monitor your Kafka clusters alongside your entire infrastructure with [OneUptime](https://oneuptime.com) - the open-source observability platform that helps you track message lag, broker health, and consumer performance in one unified dashboard.
