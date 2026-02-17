# How to Publish and Subscribe to Pub/Sub Messages Using the google-cloud-pubsub Python Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Python, Messaging, Event-Driven Architecture

Description: Learn how to publish and subscribe to Google Cloud Pub/Sub messages using the Python client library for building event-driven systems.

---

Pub/Sub is Google Cloud's messaging service for building event-driven architectures. It decouples producers from consumers, handles message delivery guarantees, and scales automatically. I have used it for everything from simple webhook relay systems to complex data pipelines processing millions of events per day. The Python client library is well-designed and handles most of the complexity for you.

## Installation

Install the Pub/Sub client library.

```bash
# Install the Pub/Sub Python client
pip install google-cloud-pubsub
```

## Creating Topics and Subscriptions

Before you can publish or receive messages, you need a topic and at least one subscription. You can create these programmatically or through the console.

```python
from google.cloud import pubsub_v1

project_id = "my-gcp-project"

# Create a publisher client to manage topics
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(project_id, "order-events")

# Create the topic if it doesn't already exist
try:
    topic = publisher.create_topic(request={"name": topic_path})
    print(f"Created topic: {topic.name}")
except Exception as e:
    print(f"Topic already exists or error: {e}")

# Create a subscriber client to manage subscriptions
subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(project_id, "order-processor")

# Create a subscription that pulls messages from our topic
try:
    subscription = subscriber.create_subscription(
        request={
            "name": subscription_path,
            "topic": topic_path,
            "ack_deadline_seconds": 60,  # Time to process before redelivery
        }
    )
    print(f"Created subscription: {subscription.name}")
except Exception as e:
    print(f"Subscription already exists or error: {e}")
```

## Publishing Messages

Publishing is straightforward. You send bytes to a topic, and Pub/Sub handles routing them to all subscriptions.

```python
from google.cloud import pubsub_v1
import json

project_id = "my-gcp-project"
topic_id = "order-events"

# Create the publisher client
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(project_id, topic_id)

# Publish a simple message - data must be bytes
def publish_order_event(order_id, event_type, order_data):
    """Publish an order event to the topic."""
    # Serialize the message payload as JSON bytes
    message_data = json.dumps({
        "order_id": order_id,
        "event_type": event_type,
        "data": order_data
    }).encode("utf-8")

    # Publish with attributes for filtering/routing
    future = publisher.publish(
        topic_path,
        data=message_data,
        # Attributes are key-value metadata attached to the message
        event_type=event_type,
        source="order-service",
        priority="high"
    )

    # The future resolves to the message ID once published
    message_id = future.result()
    print(f"Published message {message_id} for order {order_id}")
    return message_id

# Publish some events
publish_order_event("ORD-001", "created", {"item": "Widget", "quantity": 5})
publish_order_event("ORD-002", "shipped", {"tracking": "TRK-12345"})
```

## Batch Publishing for Throughput

When you need to publish many messages, the client library automatically batches them. You can tune the batch settings for your use case.

```python
from google.cloud import pubsub_v1
import json

project_id = "my-gcp-project"
topic_id = "metrics-ingestion"

# Configure batch settings to optimize throughput
batch_settings = pubsub_v1.types.BatchSettings(
    max_messages=100,      # Batch up to 100 messages
    max_bytes=1024 * 1024, # Or up to 1MB, whichever comes first
    max_latency=0.1,       # Flush after 100ms even if batch isn't full
)

publisher = pubsub_v1.PublisherClient(batch_settings=batch_settings)
topic_path = publisher.topic_path(project_id, topic_id)

# Track publish futures to verify delivery
futures = []

# Publish 1000 metric events in rapid succession
for i in range(1000):
    data = json.dumps({
        "metric": "cpu_usage",
        "value": 42.5 + (i * 0.1),
        "host": f"server-{i % 10}"
    }).encode("utf-8")

    future = publisher.publish(topic_path, data=data)
    futures.append(future)

# Wait for all publishes to complete and check for errors
for i, future in enumerate(futures):
    try:
        message_id = future.result(timeout=30)
    except Exception as e:
        print(f"Failed to publish message {i}: {e}")

print(f"Published {len(futures)} messages")
```

## Subscribing with Streaming Pull

The most common way to consume messages is with a streaming pull subscriber. It runs a callback function for each message.

```python
from google.cloud import pubsub_v1
import json
import time

project_id = "my-gcp-project"
subscription_id = "order-processor"

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(project_id, subscription_id)

def process_message(message):
    """Callback function invoked for each received message."""
    try:
        # Decode the message data from bytes to a Python dict
        data = json.loads(message.data.decode("utf-8"))

        # Access message attributes (metadata)
        event_type = message.attributes.get("event_type", "unknown")
        publish_time = message.publish_time

        print(f"Received {event_type} event at {publish_time}")
        print(f"Order ID: {data.get('order_id')}")
        print(f"Message ID: {message.message_id}")

        # Process the message based on its type
        if event_type == "created":
            handle_order_created(data)
        elif event_type == "shipped":
            handle_order_shipped(data)

        # Acknowledge the message so it won't be redelivered
        message.ack()

    except Exception as e:
        print(f"Error processing message: {e}")
        # Nack the message so Pub/Sub will retry delivery
        message.nack()

def handle_order_created(data):
    print(f"Processing new order: {data}")

def handle_order_shipped(data):
    print(f"Sending shipping notification: {data}")

# Start the streaming pull subscriber
streaming_pull_future = subscriber.subscribe(
    subscription_path,
    callback=process_message,
)

print(f"Listening for messages on {subscription_path}...")

# Keep the subscriber running
try:
    streaming_pull_future.result()
except KeyboardInterrupt:
    streaming_pull_future.cancel()
    streaming_pull_future.result()  # Block until cancelled
    print("Subscriber stopped")
```

## Flow Control

When your subscriber processes messages slower than they arrive, you need flow control to avoid overwhelming your application.

```python
from google.cloud import pubsub_v1

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path("my-project", "my-sub")

# Configure flow control to limit concurrent message processing
flow_control = pubsub_v1.types.FlowControl(
    max_messages=50,            # Max outstanding messages at any time
    max_bytes=50 * 1024 * 1024, # Max outstanding bytes (50MB)
)

def callback(message):
    """Process message with flow control limiting concurrency."""
    # Simulate some work
    import time
    time.sleep(1)
    print(f"Processed: {message.message_id}")
    message.ack()

# Subscribe with flow control enabled
streaming_pull_future = subscriber.subscribe(
    subscription_path,
    callback=callback,
    flow_control=flow_control,
)
```

## Synchronous Pull

Sometimes you want to pull a specific number of messages and process them in a batch rather than using streaming pull. This is useful for cron jobs or batch processors.

```python
from google.cloud import pubsub_v1

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path("my-project", "batch-processor")

# Pull up to 10 messages synchronously
response = subscriber.pull(
    request={
        "subscription": subscription_path,
        "max_messages": 10,
    }
)

ack_ids = []
for msg in response.received_messages:
    data = msg.message.data.decode("utf-8")
    print(f"Received: {data}")
    ack_ids.append(msg.ack_id)

# Acknowledge all processed messages in one call
if ack_ids:
    subscriber.acknowledge(
        request={
            "subscription": subscription_path,
            "ack_ids": ack_ids,
        }
    )
    print(f"Acknowledged {len(ack_ids)} messages")
```

## Message Ordering

If message order matters - for example, processing events for the same entity in sequence - you can use ordering keys.

```python
from google.cloud import pubsub_v1
import json

# Enable message ordering on the publisher
publisher_options = pubsub_v1.types.PublisherOptions(
    enable_message_ordering=True,
)
publisher = pubsub_v1.PublisherClient(publisher_options=publisher_options)
topic_path = publisher.topic_path("my-project", "ordered-events")

# Messages with the same ordering key are delivered in order
for i in range(5):
    data = json.dumps({"step": i, "order_id": "ORD-100"}).encode("utf-8")
    future = publisher.publish(
        topic_path,
        data=data,
        ordering_key="ORD-100",  # All messages for this order arrive in sequence
    )
    print(f"Published step {i}: {future.result()}")
```

## Monitoring Pub/Sub in Production

When you rely on Pub/Sub for critical workflows, monitoring is essential. You want to track subscription backlog, publish latency, and dead letter queue growth. OneUptime (https://oneuptime.com) can monitor the health of your Pub/Sub-powered services, alerting you to message processing delays or failures before they cascade into larger system issues.

## Summary

The `google-cloud-pubsub` Python library gives you a clean interface for building event-driven systems on GCP. Start with simple publish/subscribe patterns, add flow control when throughput matters, and use ordering keys when sequence is important. The streaming pull subscriber handles most use cases well, but synchronous pull is there when you need batch processing. The key is to always acknowledge messages after successful processing and nack them when something goes wrong so Pub/Sub can retry delivery.
