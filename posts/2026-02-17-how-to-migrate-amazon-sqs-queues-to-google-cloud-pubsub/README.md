# How to Migrate Amazon SQS Queues to Google Cloud Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Amazon SQS, Migration, Messaging

Description: Migrate your Amazon SQS message queues to Google Cloud Pub/Sub with strategies for maintaining message ordering, handling dead letters, and zero-downtime cutover.

---

Amazon SQS and Google Cloud Pub/Sub both handle asynchronous messaging, but they work differently under the hood. SQS is a pull-based queue where consumers poll for messages. Pub/Sub uses a push-based model where subscribers receive messages through push endpoints or streaming pulls. Understanding these differences is key to a successful migration.

In this post, I will cover how to map SQS concepts to Pub/Sub, set up equivalent configurations, and migrate without losing messages or causing downtime.

## Concept Mapping

Before diving into code, here is how SQS concepts translate to Pub/Sub:

| Amazon SQS | Google Cloud Pub/Sub |
|-----------|---------------------|
| Queue | Topic + Subscription |
| Message | Message |
| Message Group ID | Ordering Key |
| Visibility Timeout | Ack Deadline |
| Dead Letter Queue | Dead Letter Topic |
| Max Receive Count | Max Delivery Attempts |
| Delay Queue | Not native (use Cloud Tasks) |
| FIFO Queue | Subscription with ordering |
| Long Polling | Streaming Pull |

The biggest architectural difference is that SQS has one queue with one consumer group, while Pub/Sub separates topics (publishers) from subscriptions (consumers). This means multiple independent consumers can subscribe to the same topic without competing for messages.

## Setting Up Pub/Sub Topics and Subscriptions

Create Pub/Sub resources that match your SQS queue configuration:

```hcl
# pubsub.tf
# Pub/Sub topics and subscriptions equivalent to SQS queues

# Main topic (equivalent to the SQS queue for publishing)
resource "google_pubsub_topic" "order_events" {
  name    = "order-events"
  project = var.project_id

  # Enable message ordering (equivalent to FIFO queue)
  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }

  # Retain messages for replay
  message_retention_duration = "604800s"  # 7 days
}

# Dead letter topic (equivalent to SQS DLQ)
resource "google_pubsub_topic" "order_events_dlq" {
  name    = "order-events-dlq"
  project = var.project_id
}

# Subscription (equivalent to the SQS consumer)
resource "google_pubsub_subscription" "order_processor" {
  name    = "order-processor-sub"
  topic   = google_pubsub_topic.order_events.name
  project = var.project_id

  # Ack deadline (equivalent to SQS visibility timeout)
  ack_deadline_seconds = 30

  # Message retention (how long unacked messages are kept)
  message_retention_duration = "604800s"  # 7 days

  # Retry policy
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  # Dead letter policy (equivalent to SQS redrive policy)
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.order_events_dlq.id
    max_delivery_attempts = 5
  }

  # Enable message ordering (for FIFO queue equivalent)
  enable_message_ordering = true

  # Exactly-once delivery (closest to SQS exactly-once)
  enable_exactly_once_delivery = true

  # Expiration policy - never expire
  expiration_policy {
    ttl = ""
  }
}

# DLQ subscription (to process failed messages)
resource "google_pubsub_subscription" "order_events_dlq_sub" {
  name    = "order-events-dlq-sub"
  topic   = google_pubsub_topic.order_events_dlq.name
  project = var.project_id

  ack_deadline_seconds       = 60
  message_retention_duration = "604800s"
}

# Grant Pub/Sub permission to publish to DLQ
resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.order_events_dlq.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${var.project_number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}
```

## Migrating Producer Code

Here is how to translate SQS producer code to Pub/Sub.

Original SQS producer:

```python
# Original SQS producer
import boto3
import json

sqs = boto3.client('sqs', region_name='us-east-1')
queue_url = 'https://sqs.us-east-1.amazonaws.com/123456789/order-events'

def send_order_event(order_data):
    """Send an order event to SQS."""
    response = sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(order_data),
        MessageGroupId=order_data['customer_id'],  # FIFO ordering
        MessageDeduplicationId=order_data['order_id'],
        MessageAttributes={
            'EventType': {
                'DataType': 'String',
                'StringValue': 'ORDER_CREATED'
            }
        }
    )
    return response['MessageId']
```

Migrated Pub/Sub producer:

```python
# Migrated Pub/Sub producer
from google.cloud import pubsub_v1
import json

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path('my-gcp-project', 'order-events')

def send_order_event(order_data):
    """Send an order event to Pub/Sub."""
    message_data = json.dumps(order_data).encode('utf-8')

    # Publish with ordering key (equivalent to MessageGroupId)
    future = publisher.publish(
        topic_path,
        data=message_data,
        ordering_key=order_data['customer_id'],
        # Attributes (equivalent to MessageAttributes)
        event_type='ORDER_CREATED',
    )

    message_id = future.result()
    return message_id
```

## Migrating Consumer Code

Original SQS consumer with long polling:

```python
# Original SQS consumer
import boto3
import json

sqs = boto3.client('sqs', region_name='us-east-1')
queue_url = 'https://sqs.us-east-1.amazonaws.com/123456789/order-events'

def process_messages():
    """Poll SQS and process messages."""
    while True:
        response = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=20,  # Long polling
            MessageAttributeNames=['All'],
        )

        messages = response.get('Messages', [])

        for message in messages:
            try:
                body = json.loads(message['Body'])
                process_order(body)

                # Delete message after successful processing
                sqs.delete_message(
                    QueueUrl=queue_url,
                    ReceiptHandle=message['ReceiptHandle']
                )
            except Exception as e:
                print(f"Error processing message: {e}")
                # Message returns to queue after visibility timeout
```

Migrated Pub/Sub consumer using streaming pull:

```python
# Migrated Pub/Sub consumer
from google.cloud import pubsub_v1
from concurrent.futures import TimeoutError
import json

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(
    'my-gcp-project', 'order-processor-sub'
)

def callback(message):
    """Process a single Pub/Sub message."""
    try:
        body = json.loads(message.data.decode('utf-8'))
        event_type = message.attributes.get('event_type', '')

        print(f"Processing {event_type}: {body.get('order_id')}")
        process_order(body)

        # Acknowledge the message (equivalent to SQS delete)
        message.ack()

    except Exception as e:
        print(f"Error processing message: {e}")
        # Nack the message - it will be redelivered
        # (equivalent to letting visibility timeout expire in SQS)
        message.nack()


def process_order(order_data):
    """Process an order - business logic."""
    order_id = order_data['order_id']
    # ... processing logic
    print(f"Processed order {order_id}")


def start_consumer():
    """Start the Pub/Sub streaming pull consumer."""
    # Flow control to limit concurrent messages
    flow_control = pubsub_v1.types.FlowControl(
        max_messages=100,
        max_bytes=10 * 1024 * 1024,  # 10 MB
    )

    streaming_pull_future = subscriber.subscribe(
        subscription_path,
        callback=callback,
        flow_control=flow_control,
    )

    print(f"Listening on {subscription_path}")

    try:
        # Block and process messages
        streaming_pull_future.result()
    except TimeoutError:
        streaming_pull_future.cancel()
        streaming_pull_future.result()


if __name__ == '__main__':
    start_consumer()
```

## Dual-Write Migration Strategy

For zero-downtime migration, publish to both SQS and Pub/Sub during the transition:

```python
# dual_publisher.py
# Publishes to both SQS and Pub/Sub during migration
import boto3
from google.cloud import pubsub_v1
import json
import logging

logger = logging.getLogger(__name__)

class DualPublisher:
    """Publishes messages to both SQS and Pub/Sub during migration."""

    def __init__(self, sqs_queue_url, pubsub_topic_path, pubsub_enabled=True):
        self.sqs = boto3.client('sqs')
        self.sqs_queue_url = sqs_queue_url
        self.pubsub_enabled = pubsub_enabled

        if pubsub_enabled:
            self.publisher = pubsub_v1.PublisherClient()
            self.topic_path = pubsub_topic_path

    def publish(self, message_data, ordering_key=None, attributes=None):
        """Publish to both SQS and Pub/Sub."""
        attributes = attributes or {}
        message_json = json.dumps(message_data)

        # Always publish to SQS (primary during migration)
        try:
            sqs_kwargs = {
                'QueueUrl': self.sqs_queue_url,
                'MessageBody': message_json,
            }
            if ordering_key:
                sqs_kwargs['MessageGroupId'] = ordering_key

            self.sqs.send_message(**sqs_kwargs)
        except Exception as e:
            logger.error(f"Failed to publish to SQS: {e}")
            raise

        # Also publish to Pub/Sub (shadow write)
        if self.pubsub_enabled:
            try:
                pubsub_kwargs = {
                    'data': message_json.encode('utf-8'),
                }
                if ordering_key:
                    pubsub_kwargs['ordering_key'] = ordering_key
                pubsub_kwargs.update(attributes)

                future = self.publisher.publish(
                    self.topic_path,
                    **pubsub_kwargs
                )
                future.result(timeout=5)
            except Exception as e:
                # Log but do not fail - SQS is still primary
                logger.warning(f"Failed to publish to Pub/Sub: {e}")
```

## Migration Steps

Follow this sequence for a safe migration:

1. Set up Pub/Sub topics and subscriptions
2. Deploy the dual publisher (writes to both SQS and Pub/Sub)
3. Deploy Pub/Sub consumers alongside SQS consumers
4. Verify Pub/Sub consumers are processing correctly
5. Switch the SQS consumers off (Pub/Sub consumers are now primary)
6. Remove the SQS writes from the dual publisher
7. Clean up the SQS queues

## Handling Message Deduplication

SQS FIFO queues have built-in deduplication. For Pub/Sub, use exactly-once delivery or implement idempotency in your consumer:

```python
def callback_with_dedup(message):
    """Process message with idempotency check."""
    message_id = message.message_id

    # Check if we already processed this message
    if is_already_processed(message_id):
        message.ack()
        return

    try:
        body = json.loads(message.data.decode('utf-8'))
        process_order(body)

        # Mark as processed
        mark_as_processed(message_id)
        message.ack()
    except Exception as e:
        message.nack()


def is_already_processed(message_id):
    """Check Redis/Memorystore for duplicate detection."""
    # Use Redis with TTL for deduplication window
    from redis import Redis
    r = Redis(host='redis-host')
    return r.exists(f"processed:{message_id}")


def mark_as_processed(message_id):
    """Mark message as processed with TTL."""
    from redis import Redis
    r = Redis(host='redis-host')
    r.setex(f"processed:{message_id}", 86400, "1")  # 24h TTL
```

## Wrapping Up

Migrating from SQS to Pub/Sub is straightforward conceptually but needs careful handling of the transition period. The dual-write approach ensures no messages are lost during migration, and the ability to run consumers in parallel means you can verify Pub/Sub is working correctly before decommissioning SQS. Pay special attention to message ordering, deduplication, and dead letter handling - these are the areas where SQS and Pub/Sub behave most differently.
