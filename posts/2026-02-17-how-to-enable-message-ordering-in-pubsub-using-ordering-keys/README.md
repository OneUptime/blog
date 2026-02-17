# How to Enable Message Ordering in Pub/Sub Using Ordering Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Message Ordering, Event Streaming, Messaging

Description: Learn how to use ordering keys in Google Cloud Pub/Sub to guarantee message delivery order for related events, with practical examples and important caveats.

---

Pub/Sub does not guarantee message ordering by default. If you publish messages A, B, and C to a topic, a subscriber might receive them as B, A, C or any other permutation. For many use cases, this is fine. But for others - like processing a sequence of state changes for a single entity - order matters. You cannot process a "shipped" event before the "created" event for the same order.

Ordering keys in Pub/Sub let you enforce delivery order for messages that share the same key. Messages with the same ordering key are delivered in the order they were published. Messages with different ordering keys have no ordering guarantee relative to each other. Think of it like having separate ordered lanes on a highway.

## How Ordering Keys Work

When you publish a message with an ordering key, Pub/Sub ensures that all messages with that key are delivered to the subscriber in publish order. The ordering guarantee is per-key, not global.

For example, if you publish these messages:

```
Message 1: key="order-123", data="created"
Message 2: key="order-456", data="created"
Message 3: key="order-123", data="paid"
Message 4: key="order-123", data="shipped"
```

A subscriber is guaranteed to receive messages 1, 3, and 4 (all for order-123) in that exact order. But message 2 (order-456) could arrive at any point relative to the others because it has a different key.

## Enabling Message Ordering

Ordering requires configuration on both the subscription and the publisher side.

### Step 1: Enable Ordering on the Subscription

Create or update a subscription with message ordering enabled:

```bash
# Create a new subscription with ordering enabled
gcloud pubsub subscriptions create order-events-ordered-sub \
  --topic=order-events \
  --enable-message-ordering
```

Important: you cannot change this setting on an existing subscription. If you have an existing subscription without ordering, you need to delete it and create a new one. This means you might lose unacknowledged messages, so plan accordingly.

In Terraform:

```hcl
# Subscription with message ordering enabled
resource "google_pubsub_subscription" "order_events_ordered" {
  name  = "order-events-ordered-sub"
  topic = google_pubsub_topic.order_events.id

  enable_message_ordering = true
  ack_deadline_seconds    = 60

  expiration_policy {
    ttl = ""
  }
}
```

### Step 2: Publish Messages with Ordering Keys

On the publisher side, you must explicitly set an ordering key on each message. The publisher client also needs to be configured to support ordering:

```python
# Publishing ordered messages with ordering keys
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1.types import PublisherOptions
import json

# Create a publisher with ordering enabled
publisher = pubsub_v1.PublisherClient(
    publisher_options=PublisherOptions(
        enable_message_ordering=True
    )
)
topic_path = publisher.topic_path("my-project", "order-events")

# Publish a sequence of events for the same order
events = [
    {"order_id": "order-123", "status": "created", "timestamp": "2026-02-17T10:00:00Z"},
    {"order_id": "order-123", "status": "paid", "timestamp": "2026-02-17T10:05:00Z"},
    {"order_id": "order-123", "status": "shipped", "timestamp": "2026-02-17T10:30:00Z"},
]

for event in events:
    future = publisher.publish(
        topic_path,
        data=json.dumps(event).encode("utf-8"),
        ordering_key=event["order_id"],  # Use order_id as the ordering key
    )
    # Wait for each publish to confirm before sending the next
    message_id = future.result()
    print(f"Published {event['status']} with ID: {message_id}")
```

Notice that we call `future.result()` after each publish. This ensures each message is confirmed before publishing the next one. Without this, messages could arrive at the Pub/Sub servers out of order, defeating the purpose.

## Choosing Good Ordering Keys

The choice of ordering key is critical. Here are some guidelines:

**Use entity IDs as ordering keys.** If you are processing events for users, use the user_id. For orders, use the order_id. This guarantees that all events for a single entity arrive in order.

**Avoid using a single key for everything.** If all messages share the same ordering key, you effectively serialize all message delivery. This kills throughput because Pub/Sub can only deliver one message at a time for a given key.

**Keep cardinality high.** The more distinct ordering keys you have, the more parallelism Pub/Sub can achieve. Thousands or millions of distinct keys is ideal.

```python
# Good: High cardinality keys based on entity IDs
publisher.publish(topic, data=payload, ordering_key=f"user-{user_id}")
publisher.publish(topic, data=payload, ordering_key=f"device-{device_id}")

# Bad: Low cardinality keys that limit parallelism
publisher.publish(topic, data=payload, ordering_key="all-events")  # Serial delivery
publisher.publish(topic, data=payload, ordering_key="region-us")   # Only a few keys
```

## Handling Publish Failures with Ordering

When ordering is enabled, a publish failure for one message blocks all subsequent messages with the same ordering key. This is by design - if message B cannot be confirmed, publishing message C would violate ordering guarantees.

You need to handle this by resuming publishing after a failure:

```python
# Handling publish failures with ordering key recovery
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1.types import PublisherOptions
from google.api_core.exceptions import GoogleAPICallError
import json
import time

publisher = pubsub_v1.PublisherClient(
    publisher_options=PublisherOptions(
        enable_message_ordering=True
    )
)
topic_path = publisher.topic_path("my-project", "order-events")

def publish_with_retry(data, ordering_key, max_retries=3):
    """Publish a message with ordering, handling failures gracefully."""
    for attempt in range(max_retries):
        try:
            future = publisher.publish(
                topic_path,
                data=json.dumps(data).encode("utf-8"),
                ordering_key=ordering_key,
            )
            return future.result()
        except GoogleAPICallError as e:
            print(f"Publish failed (attempt {attempt + 1}): {e}")
            # Resume publishing for this ordering key
            publisher.resume_publish(topic_path, ordering_key)
            time.sleep(2 ** attempt)  # Exponential backoff

    raise Exception(f"Failed to publish after {max_retries} attempts")

# Use the retry-aware publish function
message_id = publish_with_retry(
    {"order_id": "order-789", "status": "created"},
    ordering_key="order-789"
)
```

The `resume_publish` call is essential. After a failure, the publisher client blocks all messages for that ordering key until you explicitly call `resume_publish`. This prevents accidentally publishing out of order.

## Subscriber Considerations

On the subscriber side, ordered messages for the same key are delivered one at a time. The next message in the sequence is not delivered until the current one is acknowledged. This means:

1. **Acknowledge quickly.** If your processing takes a long time, extend the acknowledgement deadline or the ordering key will be blocked.

2. **Handle failures carefully.** If you nack a message, the next delivery attempt starts from that message, maintaining order.

```python
# Subscriber that processes ordered messages
from google.cloud import pubsub_v1
import json

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(
    "my-project", "order-events-ordered-sub"
)

def process_ordered_message(message):
    """Process messages that arrive in guaranteed order per ordering key."""
    data = json.loads(message.data.decode("utf-8"))
    ordering_key = message.ordering_key

    print(f"Processing [{ordering_key}]: {data['status']}")

    try:
        # Your processing logic here
        update_order_status(data["order_id"], data["status"])
        message.ack()
    except Exception as e:
        print(f"Processing failed for {ordering_key}: {e}")
        # Nack to retry - ordering is preserved
        message.nack()

def update_order_status(order_id, status):
    """Placeholder for actual business logic."""
    pass

streaming_pull = subscriber.subscribe(
    subscription_path,
    callback=process_ordered_message,
)

print("Listening for ordered messages...")
streaming_pull.result()
```

## Performance Implications

Ordering comes with throughput tradeoffs:

- **Per-key serialization**: Messages with the same key are processed sequentially. If one key has very high volume, that key becomes a bottleneck.

- **Reduced parallelism per key**: You cannot process multiple messages for the same key simultaneously. Cross-key parallelism is still fine.

- **Publish latency**: If you wait for each publish to confirm (recommended), publish throughput for a single key is limited by round-trip time.

For most event-driven applications, these tradeoffs are acceptable because the cardinality of ordering keys is high enough that overall throughput is not significantly affected.

## When Not to Use Ordering Keys

Ordering keys are not always the right choice:

- **Analytics events**: If you are collecting metrics or logs where order does not matter, skip ordering. You get better throughput.

- **Idempotent processing**: If your subscriber can handle messages in any order because processing is idempotent, ordering adds unnecessary overhead.

- **Global ordering needs**: If you need strict global ordering across ALL messages (not just per-entity), Pub/Sub ordering keys do not help. Consider a single-partition approach or a different messaging system.

## Wrapping Up

Ordering keys in Pub/Sub give you per-entity message ordering without sacrificing the scalability of the overall system. Enable ordering on your subscription, publish with consistent ordering keys based on entity IDs, handle publish failures with resume, and keep your acknowledgement times short. The key design decision is choosing your ordering key wisely - high cardinality keys give you both ordering and throughput, while low cardinality keys create bottlenecks. Use ordering only when you genuinely need it, because unordered delivery gives Pub/Sub the most flexibility to optimize throughput.
