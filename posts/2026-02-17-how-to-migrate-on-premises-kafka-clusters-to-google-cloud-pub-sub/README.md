# How to Migrate On-Premises Kafka Clusters to Google Cloud Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Kafka, Messaging, Migration

Description: Learn how to migrate on-premises Apache Kafka clusters to Google Cloud Pub/Sub including topic mapping, consumer migration, and cutover strategies.

---

Apache Kafka is the de facto standard for event streaming on-premises. But running Kafka clusters requires dedicated infrastructure, ZooKeeper management (or KRaft coordination), broker tuning, partition rebalancing, and storage management. Google Cloud Pub/Sub offers a fully managed alternative with automatic scaling, built-in durability, and zero operational overhead. The migration is not a simple swap though - Kafka and Pub/Sub have different semantics that you need to understand.

## Kafka vs Pub/Sub - Key Differences

Before migrating, understand what changes:

| Concept | Kafka | Pub/Sub |
|---------|-------|---------|
| Message grouping | Topics with partitions | Topics with subscriptions |
| Ordering | Per-partition ordering | Per-ordering-key ordering |
| Consumer groups | Consumer groups | Subscriptions |
| Offset management | Consumer-managed offsets | Automatic ack/nack |
| Message retention | Configurable (time or size) | 7 days default (up to 31 days) |
| Replay | Seek to offset | Seek to timestamp |
| Exactly-once | Transactional producers | At-least-once (dedup in subscriber) |
| Throughput | Scales with partitions | Automatically scales |

The biggest conceptual shift is from partitions to subscriptions. In Kafka, consumers in a consumer group share partitions. In Pub/Sub, each subscription independently tracks message delivery to its subscribers.

## Step 1 - Map Kafka Topics to Pub/Sub Topics

Create Pub/Sub topics that correspond to your Kafka topics:

```bash
# List existing Kafka topics to know what to migrate
kafka-topics.sh --list --bootstrap-server kafka-broker:9092

# Create corresponding Pub/Sub topics
gcloud pubsub topics create orders-events
gcloud pubsub topics create user-activity
gcloud pubsub topics create payment-notifications
gcloud pubsub topics create inventory-updates

# For topics that need ordering, enable message ordering
gcloud pubsub topics create orders-events \
  --message-ordering

# Create subscriptions (equivalent to consumer groups)
# Each consumer group becomes a subscription
gcloud pubsub subscriptions create orders-processor \
  --topic orders-events \
  --ack-deadline 60 \
  --enable-message-ordering

gcloud pubsub subscriptions create orders-analytics \
  --topic orders-events \
  --ack-deadline 60
```

## Step 2 - Migrate Producers

The producer side is typically the easier migration. Replace the Kafka producer client with the Pub/Sub publisher client.

Kafka producer (before):

```python
# Original Kafka producer code
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['kafka-broker:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8')
)

# Send a message with a partition key
def publish_order_event(order):
    producer.send(
        'orders-events',
        key=str(order['customer_id']),
        value=order
    )
    producer.flush()
```

Pub/Sub publisher (after):

```python
# Migrated Pub/Sub publisher code
from google.cloud import pubsub_v1
import json

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path('my-project', 'orders-events')

def publish_order_event(order):
    # Convert the message to bytes
    data = json.dumps(order).encode('utf-8')

    # Use ordering_key for messages that need to be processed in order
    # This replaces Kafka's partition key concept
    future = publisher.publish(
        topic_path,
        data,
        ordering_key=str(order['customer_id']),
        # Add attributes for filtering (replaces Kafka headers)
        event_type='order_created',
        source='order-service'
    )

    # Wait for the publish to complete
    message_id = future.result()
    return message_id
```

For high-throughput producers, configure batching:

```python
# Configure batch settings for high-throughput publishing
from google.cloud.pubsub_v1.types import BatchSettings

batch_settings = BatchSettings(
    max_messages=100,        # Batch up to 100 messages
    max_bytes=1024 * 1024,   # Or up to 1 MB
    max_latency=0.01,        # Or wait up to 10ms
)

publisher = pubsub_v1.PublisherClient(batch_settings=batch_settings)
```

## Step 3 - Migrate Consumers

Consumer migration requires more thought because the consumption model is different.

Kafka consumer (before):

```python
# Original Kafka consumer code
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'orders-events',
    bootstrap_servers=['kafka-broker:9092'],
    group_id='orders-processor',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    process_order(message.value)
    # Offset is committed automatically or manually
```

Pub/Sub subscriber (after):

```python
# Migrated Pub/Sub subscriber code
from google.cloud import pubsub_v1
from concurrent.futures import TimeoutError
import json

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path('my-project', 'orders-processor')

def callback(message):
    try:
        # Parse the message data
        order = json.loads(message.data.decode('utf-8'))

        # Process the order
        process_order(order)

        # Acknowledge the message (equivalent to committing offset)
        message.ack()
    except Exception as e:
        # Negative acknowledge - message will be redelivered
        print(f"Error processing message: {e}")
        message.nack()

# Start the subscriber in streaming pull mode
streaming_pull_future = subscriber.subscribe(
    subscription_path,
    callback=callback,
    flow_control=pubsub_v1.types.FlowControl(
        max_messages=100,           # Process up to 100 messages concurrently
        max_bytes=10 * 1024 * 1024  # Up to 10 MB of messages in memory
    )
)

print(f"Listening on {subscription_path}")

# Block and wait for messages
try:
    streaming_pull_future.result()
except TimeoutError:
    streaming_pull_future.cancel()
    streaming_pull_future.result()
```

## Step 4 - Handle Ordering Guarantees

Kafka provides per-partition ordering. In Pub/Sub, you get ordering guarantees per ordering key within a region.

```python
# Enable ordering on the subscription
# Already done during subscription creation with --enable-message-ordering

# When publishing, always include an ordering_key for ordered messages
publisher.publish(
    topic_path,
    data=json.dumps(event).encode('utf-8'),
    ordering_key=f"customer-{customer_id}"  # All messages for this customer are ordered
)

# When subscribing to ordered messages, process them sequentially per key
# The Pub/Sub client library handles this automatically when ordering is enabled
```

Important: Pub/Sub ordering works per-key, not per-topic. If you had a Kafka topic with a single partition for strict global ordering, you need to use a single ordering key in Pub/Sub.

## Step 5 - Dual-Write During Transition

For a safe migration, run both systems in parallel during the transition:

```python
# Dual-write to both Kafka and Pub/Sub during migration
def publish_order_event(order):
    data = json.dumps(order).encode('utf-8')

    # Write to Kafka (existing system)
    kafka_producer.send('orders-events', key=str(order['customer_id']).encode(), value=data)

    # Also write to Pub/Sub (new system)
    publisher.publish(
        topic_path,
        data,
        ordering_key=str(order['customer_id'])
    )
```

During the dual-write phase:

1. Migrate consumers one at a time from Kafka to Pub/Sub
2. Verify that Pub/Sub consumers process messages correctly
3. Compare output between Kafka and Pub/Sub consumers for consistency
4. Once all consumers are migrated, stop the Kafka writes

## Step 6 - Handle Dead Letter Topics

Kafka does not have built-in dead letter queues. In Pub/Sub, you can configure them natively:

```bash
# Create a dead letter topic
gcloud pubsub topics create orders-events-dlq

# Create a subscription for the dead letter topic
gcloud pubsub subscriptions create orders-events-dlq-sub \
  --topic orders-events-dlq

# Update the main subscription to use the dead letter topic
gcloud pubsub subscriptions update orders-processor \
  --dead-letter-topic orders-events-dlq \
  --max-delivery-attempts 5
```

## Monitoring the Migration

Set up monitoring to compare throughput and latency between the two systems:

```bash
# Monitor Pub/Sub metrics
gcloud monitoring dashboards create --config-from-file pubsub-dashboard.json

# Key metrics to watch:
# - pubsub.googleapis.com/topic/send_message_operation_count
# - pubsub.googleapis.com/subscription/pull_message_operation_count
# - pubsub.googleapis.com/subscription/oldest_unacked_message_age
# - pubsub.googleapis.com/subscription/num_undelivered_messages
```

## Common Migration Issues

- **Message size limits.** Pub/Sub messages are limited to 10 MB. Kafka default is 1 MB but can be configured higher. If your Kafka messages exceed 10 MB, you need to restructure them or store large payloads in Cloud Storage with a reference in the message.
- **Consumer group rebalancing.** Kafka's consumer group rebalancing has no equivalent in Pub/Sub. Pub/Sub handles message distribution to subscribers automatically.
- **Compacted topics.** Kafka log compaction keeps the latest value per key. Pub/Sub does not support compaction. Use Firestore, Bigtable, or Memorystore if you need a latest-value store.
- **Exactly-once semantics.** Kafka supports exactly-once with transactional producers. Pub/Sub provides at-least-once delivery. Your consumers need to be idempotent or implement deduplication.

The migration from Kafka to Pub/Sub trades operational complexity for managed simplicity. You lose some Kafka-specific features like compacted topics and exactly-once guarantees, but you gain automatic scaling, zero maintenance, and deep GCP integration. For most event streaming workloads, that is a trade worth making.
