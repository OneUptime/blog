# How to Filter Pub/Sub Messages Using Subscription Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Message Filtering, Subscriptions, Event Routing

Description: Learn how to use Pub/Sub subscription filters to route specific messages to specific subscribers based on message attributes, reducing processing overhead and simplifying your architecture.

---

Not every subscriber needs every message on a topic. If you have an "order-events" topic, your billing service only cares about "order.paid" events, while your shipping service only needs "order.shipped" events. Without filtering, both services receive all messages and have to discard the ones they do not care about. That wastes bandwidth, compute, and adds unnecessary code.

Pub/Sub subscription filters solve this by letting you attach a filter expression to a subscription. Only messages that match the filter are delivered. Messages that do not match are automatically acknowledged and discarded by Pub/Sub - your subscriber never sees them.

## How Subscription Filters Work

Filters operate on message attributes, not the message body. When you publish a message to Pub/Sub, you can attach key-value attributes (metadata) alongside the message data. Subscription filters evaluate these attributes to decide whether to deliver the message.

This means you need to design your message attributes with filtering in mind. The actual message payload (the data field) is opaque to the filter.

## Creating a Filtered Subscription

Here is the basic setup. First, make sure your publishers include attributes:

```python
# Publisher that includes filterable attributes with each message
from google.cloud import pubsub_v1
import json

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path("my-project", "order-events")

# Publish an order event with attributes for filtering
order_data = {
    "order_id": "order-123",
    "total": 99.99,
    "items": ["widget-a", "gadget-b"],
}

# Attributes are key-value string pairs used for filtering
publisher.publish(
    topic_path,
    data=json.dumps(order_data).encode("utf-8"),
    event_type="order.created",     # Filterable attribute
    region="us-east",               # Filterable attribute
    priority="high",                # Filterable attribute
)
```

Now create subscriptions with filters:

```bash
# Subscription that only receives "order.paid" events
gcloud pubsub subscriptions create billing-sub \
  --topic=order-events \
  --filter='attributes.event_type = "order.paid"'

# Subscription that only receives events from the US East region
gcloud pubsub subscriptions create us-east-processor \
  --topic=order-events \
  --filter='attributes.region = "us-east"'

# Subscription that only receives high priority events
gcloud pubsub subscriptions create priority-handler \
  --topic=order-events \
  --filter='attributes.priority = "high"'
```

In Terraform:

```hcl
# Filtered subscription for billing - only receives payment events
resource "google_pubsub_subscription" "billing" {
  name   = "billing-sub"
  topic  = google_pubsub_topic.order_events.id
  filter = "attributes.event_type = \"order.paid\""

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = ""
  }
}

# Filtered subscription for shipping - only receives shipped events
resource "google_pubsub_subscription" "shipping" {
  name   = "shipping-sub"
  topic  = google_pubsub_topic.order_events.id
  filter = "attributes.event_type = \"order.shipped\""

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = ""
  }
}
```

## Filter Syntax

The filter syntax supports several operators. Here are the most useful ones:

### Equality

```bash
# Exact match on an attribute value
attributes.event_type = "order.paid"
```

### Not Equal

```bash
# Everything except a specific value
attributes.event_type != "order.cancelled"
```

### Has Attribute (Existence Check)

```bash
# Messages that have a specific attribute, regardless of value
hasPrefix(attributes.trace_id, "")
```

### Prefix Matching

```bash
# Messages where event_type starts with "order."
hasPrefix(attributes.event_type, "order.")
```

### Combining Conditions

You can combine conditions with AND and OR:

```bash
# Messages that are high priority AND from the US region
attributes.priority = "high" AND attributes.region = "us-east"

# Messages that are either paid or shipped
attributes.event_type = "order.paid" OR attributes.event_type = "order.shipped"
```

### Negation

```bash
# Messages that are NOT from the test environment
NOT attributes.environment = "test"
```

## Practical Filter Patterns

### Pattern 1: Event Type Routing

Route different event types to different services:

```hcl
# Each microservice gets only the events it needs
resource "google_pubsub_subscription" "billing_service" {
  name   = "billing-service-sub"
  topic  = google_pubsub_topic.order_events.id
  filter = "attributes.event_type = \"order.paid\" OR attributes.event_type = \"order.refunded\""
}

resource "google_pubsub_subscription" "shipping_service" {
  name   = "shipping-service-sub"
  topic  = google_pubsub_topic.order_events.id
  filter = "attributes.event_type = \"order.shipped\" OR attributes.event_type = \"order.delivered\""
}

resource "google_pubsub_subscription" "notification_service" {
  name   = "notification-service-sub"
  topic  = google_pubsub_topic.order_events.id
  filter = "attributes.event_type = \"order.created\" OR attributes.event_type = \"order.shipped\" OR attributes.event_type = \"order.delivered\""
}
```

### Pattern 2: Regional Processing

Process messages in the region where they originated:

```hcl
# US region processor
resource "google_pubsub_subscription" "us_processor" {
  name   = "us-processor-sub"
  topic  = google_pubsub_topic.events.id
  filter = "attributes.region = \"us-east\" OR attributes.region = \"us-west\""
}

# EU region processor
resource "google_pubsub_subscription" "eu_processor" {
  name   = "eu-processor-sub"
  topic  = google_pubsub_topic.events.id
  filter = "attributes.region = \"eu-west\" OR attributes.region = \"eu-central\""
}
```

### Pattern 3: Priority-Based Processing

Route high-priority messages to a faster processing pipeline:

```hcl
# High priority messages go to dedicated fast processors
resource "google_pubsub_subscription" "fast_lane" {
  name   = "fast-lane-sub"
  topic  = google_pubsub_topic.events.id
  filter = "attributes.priority = \"critical\" OR attributes.priority = \"high\""

  ack_deadline_seconds = 30  # Shorter deadline for fast processing
}

# Normal priority messages go to standard processors
resource "google_pubsub_subscription" "standard_lane" {
  name   = "standard-lane-sub"
  topic  = google_pubsub_topic.events.id
  filter = "attributes.priority = \"normal\" OR attributes.priority = \"low\""

  ack_deadline_seconds = 120
}
```

### Pattern 4: Environment Separation

Filter out test messages in production:

```hcl
# Production subscription ignores test messages
resource "google_pubsub_subscription" "production" {
  name   = "production-sub"
  topic  = google_pubsub_topic.events.id
  filter = "NOT attributes.environment = \"test\""
}
```

## Designing Attributes for Filtering

Since filters only work on attributes, you need to plan your attribute schema carefully:

```python
# Well-designed message with filterable attributes
from google.cloud import pubsub_v1
import json

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path("my-project", "platform-events")

def publish_event(event_data, event_type, source_service, region, priority="normal"):
    """Publish an event with well-structured attributes for filtering."""
    publisher.publish(
        topic_path,
        data=json.dumps(event_data).encode("utf-8"),
        # These attributes enable flexible filtering
        event_type=event_type,           # e.g., "user.signup", "order.paid"
        source_service=source_service,   # e.g., "auth-service", "payment-service"
        region=region,                   # e.g., "us-east", "eu-west"
        priority=priority,               # e.g., "critical", "high", "normal", "low"
        version="v2",                    # Schema version for routing
    )

# Usage examples
publish_event(
    {"user_id": "u123", "plan": "premium"},
    event_type="user.signup",
    source_service="auth-service",
    region="us-east",
    priority="high"
)
```

Tips for attribute design:

1. **Use dot notation for event types**: `order.created`, `order.paid`, `user.signup`. This allows prefix filtering with `hasPrefix`.
2. **Keep values short**: Attribute values are strings and contribute to message size.
3. **Be consistent**: Use the same attribute names across all publishers.
4. **Do not put sensitive data in attributes**: Attributes are not encrypted separately.

## Important Limitations

Subscription filters have some constraints you should know about:

1. **Filters cannot inspect message data.** They only work on attributes. If the information you need to filter on is in the message body, you need to extract it to an attribute at publish time.

2. **Filters are immutable.** You cannot change the filter on an existing subscription. You need to delete and recreate the subscription, which means you lose unprocessed messages.

3. **Filtered-out messages count as acknowledged.** This means they count toward your message delivery metrics and billing. You are not saving on Pub/Sub costs by filtering - you are saving on subscriber compute costs.

4. **No regex support.** The filter syntax supports equality, prefix matching, and boolean operators, but not regular expressions.

5. **Attribute values are always strings.** You cannot do numeric comparisons like `attributes.priority > 5`. If you need numeric filtering, encode it as string categories instead.

## Monitoring Filtered Subscriptions

Keep an eye on filtered subscriptions to make sure they are receiving the expected messages:

```bash
# Check how many messages are being delivered vs filtered
gcloud monitoring read \
  "pubsub.googleapis.com/subscription/num_undelivered_messages" \
  --filter="resource.labels.subscription_id=billing-sub"
```

If a filtered subscription has zero messages for an extended period, it could mean either no matching messages are being published or the filter expression has a typo.

## Filters vs Multiple Topics

An alternative to subscription filters is using separate topics for different message types. Both approaches work:

**Use filters when:**
- You have a moderate number of event types
- You want a single publish point
- Different subscribers need overlapping subsets of events

**Use separate topics when:**
- You have strict schema differences between event types
- You want topic-level IAM permissions per event type
- You have very high volume and want to optimize delivery

## Wrapping Up

Subscription filters are a clean way to route messages to the right subscribers without adding routing logic to your application code. Design your message attributes with filtering in mind, use the filter syntax to match on event types, regions, priorities, or any other dimension, and remember that filters are immutable and only work on attributes. For most event-driven architectures, filters reduce subscriber complexity and processing costs while keeping your topic structure simple.
