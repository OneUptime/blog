# How to Migrate Azure Event Hubs to Google Cloud Pub/Sub for Streaming Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Azure Migration, Event Streaming, Messaging, Real-time Data

Description: A step-by-step guide on migrating streaming workloads from Azure Event Hubs to Google Cloud Pub/Sub with architecture mapping and code examples.

---

Azure Event Hubs and Google Cloud Pub/Sub are both managed messaging services designed for high-throughput event streaming. They share the same general purpose, but their architecture and APIs are quite different. If you are moving your streaming workloads from Azure to GCP, this guide covers the key differences and walks through a practical migration path.

## Architecture Differences

Event Hubs uses a partitioned log model inspired by Apache Kafka. Messages go to partitions, consumers read from partitions using consumer groups, and you manage throughput units to scale.

Pub/Sub uses a topic and subscription model. Publishers send messages to topics, and each subscription gets its own copy of every message. There are no partitions to manage - Pub/Sub handles parallelism automatically.

Here is how the concepts map:

| Azure Event Hubs | Google Cloud Pub/Sub |
|-------------------|---------------------|
| Event Hub namespace | GCP project |
| Event Hub | Topic |
| Consumer group | Subscription |
| Partition | Automatic (no equivalent) |
| Throughput units | Automatic scaling |
| Capture (to Blob Storage) | BigQuery subscription or Dataflow |
| Schema Registry | Pub/Sub schema |

The biggest mental shift is that Pub/Sub does not expose partitions. You do not need to think about partition counts, partition keys, or rebalancing consumers. Pub/Sub distributes messages across subscribers automatically.

## Step 1: Create Topics and Subscriptions

For each Event Hub, create a corresponding Pub/Sub topic. For each consumer group, create a subscription on that topic.

```bash
# Create a Pub/Sub topic (equivalent to an Event Hub)
gcloud pubsub topics create events-stream

# Create subscriptions (equivalent to consumer groups)
# Subscription for the analytics pipeline
gcloud pubsub subscriptions create analytics-sub \
    --topic=events-stream \
    --ack-deadline=60 \
    --message-retention-duration=7d

# Subscription for the real-time dashboard
gcloud pubsub subscriptions create dashboard-sub \
    --topic=events-stream \
    --ack-deadline=30 \
    --message-retention-duration=1d
```

One advantage of Pub/Sub's model is that adding a new consumer is just creating a new subscription. You do not need to worry about it affecting existing consumers, and each subscription independently tracks which messages have been acknowledged.

## Step 2: Migrate Message Schemas

If you are using Azure Schema Registry with Event Hubs, you can set up equivalent schemas in Pub/Sub.

```bash
# Create a schema definition for your event messages
gcloud pubsub schemas create event-schema \
    --type=AVRO \
    --definition='{
      "type": "record",
      "name": "Event",
      "fields": [
        {"name": "eventId", "type": "string"},
        {"name": "eventType", "type": "string"},
        {"name": "timestamp", "type": "long"},
        {"name": "payload", "type": "string"}
      ]
    }'

# Associate the schema with a topic
gcloud pubsub topics create events-stream-validated \
    --schema=event-schema \
    --message-encoding=JSON
```

## Step 3: Update Producer Code

Here is a typical Event Hubs producer in Python and its Pub/Sub equivalent.

This is the original Azure Event Hubs producer code you would be replacing:

```python
# Original Azure Event Hubs producer
from azure.eventhub import EventHubProducerClient, EventData

producer = EventHubProducerClient.from_connection_string(
    conn_str="Endpoint=sb://...",
    eventhub_name="events-stream"
)

# Send a batch of events
event_batch = producer.create_batch()
event_batch.add(EventData('{"type": "click", "userId": "123"}'))
event_batch.add(EventData('{"type": "view", "userId": "456"}'))
producer.send_batch(event_batch)
producer.close()
```

And this is the equivalent Google Cloud Pub/Sub publisher:

```python
# New Google Cloud Pub/Sub publisher
from google.cloud import pubsub_v1
import json

# Create a publisher client - it handles batching automatically
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path("my-project", "events-stream")

# Publish messages with optional ordering key (similar to partition key)
events = [
    {"type": "click", "userId": "123"},
    {"type": "view", "userId": "456"}
]

for event in events:
    # Convert to bytes - Pub/Sub requires byte strings
    data = json.dumps(event).encode("utf-8")

    # Publish with attributes (similar to Event Hubs properties)
    future = publisher.publish(
        topic_path,
        data,
        event_type=event["type"],  # Custom attribute for filtering
        source="web-app"
    )
    # Get the message ID to confirm publishing
    message_id = future.result()
    print(f"Published message {message_id}")
```

If you relied on Event Hubs partition keys for ordering, use Pub/Sub ordering keys:

```python
# Enable message ordering for ordered delivery
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1 import types

# Configure the publisher with ordering enabled
publisher_options = types.PublisherOptions(enable_message_ordering=True)
publisher = pubsub_v1.PublisherClient(publisher_options=publisher_options)
topic_path = publisher.topic_path("my-project", "events-stream")

# Use ordering key to guarantee order for messages with the same key
publisher.publish(
    topic_path,
    data=b'{"event": "first"}',
    ordering_key="user-123"  # Similar to Event Hubs partition key
)

publisher.publish(
    topic_path,
    data=b'{"event": "second"}',
    ordering_key="user-123"  # Same key ensures ordering
)
```

## Step 4: Update Consumer Code

Here is the consumer migration path. Event Hubs consumers explicitly manage partitions and checkpoints. Pub/Sub consumers just pull messages and acknowledge them.

The original Azure Event Hubs consumer:

```python
# Original Azure Event Hubs consumer
from azure.eventhub import EventHubConsumerClient

def on_event(partition_context, event):
    print(f"Received: {event.body_as_str()}")
    partition_context.update_checkpoint(event)

consumer = EventHubConsumerClient.from_connection_string(
    conn_str="Endpoint=sb://...",
    consumer_group="analytics",
    eventhub_name="events-stream"
)

with consumer:
    consumer.receive(on_event=on_event, starting_position="-1")
```

And the equivalent Pub/Sub subscriber:

```python
# New Google Cloud Pub/Sub subscriber
from google.cloud import pubsub_v1
from concurrent.futures import TimeoutError
import json

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path("my-project", "analytics-sub")

def callback(message):
    """Process each message and acknowledge it."""
    data = json.loads(message.data.decode("utf-8"))
    print(f"Received: {data}")

    # Access message attributes (like Event Hubs properties)
    event_type = message.attributes.get("event_type", "unknown")
    print(f"Event type: {event_type}")

    # Acknowledge the message - similar to checkpointing in Event Hubs
    message.ack()

# Start streaming pull - Pub/Sub handles partition/parallelism automatically
streaming_pull = subscriber.subscribe(subscription_path, callback=callback)
print(f"Listening on {subscription_path}")

try:
    # Block and process messages for 300 seconds
    streaming_pull.result(timeout=300)
except TimeoutError:
    streaming_pull.cancel()
    streaming_pull.result()
```

## Step 5: Replace Event Hubs Capture

If you use Event Hubs Capture to archive events to Blob Storage, replace it with one of these Pub/Sub options:

**BigQuery subscription** - writes messages directly to BigQuery without any processing code:

```bash
# Create a BigQuery subscription that auto-writes messages to a table
gcloud pubsub subscriptions create archive-sub \
    --topic=events-stream \
    --bigquery-table=my-project:events_dataset.raw_events \
    --write-metadata
```

**Cloud Storage subscription** - batches messages and writes them to Cloud Storage:

```bash
# Create a Cloud Storage subscription for archiving
gcloud pubsub subscriptions create storage-archive-sub \
    --topic=events-stream \
    --cloud-storage-bucket=my-events-archive \
    --cloud-storage-file-prefix=events/ \
    --cloud-storage-file-suffix=.json \
    --cloud-storage-max-duration=5m
```

## Step 6: Handling Dead Letters

Event Hubs does not have built-in dead letter queues. Pub/Sub does. Configure dead letter topics for messages that fail processing:

```bash
# Create a dead letter topic
gcloud pubsub topics create events-dead-letter

# Update the subscription to use dead lettering
gcloud pubsub subscriptions update analytics-sub \
    --dead-letter-topic=events-dead-letter \
    --max-delivery-attempts=5
```

## Performance Considerations

Pub/Sub scales automatically without throughput unit management. However, keep these points in mind:

- **Publish throughput** can reach millions of messages per second per topic
- **Subscriber throughput** scales with the number of subscriber clients - add more to increase parallelism
- **Message size** is limited to 10 MB per message (Event Hubs allows up to 1 MB by default, 1 MB per event)
- **Message retention** can be set up to 31 days (Event Hubs offers 1-90 days depending on tier)

## Migration Strategy

I recommend a parallel-run approach:

1. Set up Pub/Sub topics and subscriptions
2. Update producers to publish to both Event Hubs and Pub/Sub simultaneously
3. Run consumers on both platforms and compare output
4. Once results match, cut over consumers to Pub/Sub only
5. Finally, switch producers to Pub/Sub only

This way you can validate message delivery and processing before committing to the switch. It takes more effort upfront but prevents data loss during the transition.
