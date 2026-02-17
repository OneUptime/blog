# How to Implement Retry Logic and Error Handling in Python Pub/Sub Subscribers with Dead Letter Topics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Python, Error Handling, Reliability

Description: Learn how to implement robust retry logic and error handling in Python Pub/Sub subscribers using dead letter topics, exponential backoff, and message tracking.

---

In any message-driven system, failures are inevitable. A database might be temporarily down, an external API could return an error, or your processing code might hit an edge case. The question is not whether messages will fail but how your system handles those failures. Pub/Sub provides built-in retry mechanisms, but you need to configure them properly and add application-level error handling to build a truly reliable subscriber.

## Understanding Pub/Sub Retry Behavior

When a subscriber nacks a message or fails to acknowledge it before the ack deadline, Pub/Sub redelivers the message. Without configuration, it will keep retrying indefinitely. This is usually not what you want - some messages are fundamentally unprocessable and will fail forever.

## Setting Up Dead Letter Topics

A dead letter topic captures messages that fail after a specified number of delivery attempts. This prevents poison messages from blocking your queue.

```bash
# Create the main topic
gcloud pubsub topics create order-processing

# Create the dead letter topic
gcloud pubsub topics create order-processing-dlq

# Create a subscription for the dead letter topic
gcloud pubsub subscriptions create order-processing-dlq-sub \
    --topic=order-processing-dlq

# Create the main subscription with dead letter configuration
gcloud pubsub subscriptions create order-processing-sub \
    --topic=order-processing \
    --ack-deadline=60 \
    --max-delivery-attempts=5 \
    --dead-letter-topic=order-processing-dlq \
    --min-retry-delay=10s \
    --max-retry-delay=600s
```

The `max-delivery-attempts` setting controls how many times Pub/Sub will try to deliver a message before sending it to the dead letter topic. Five attempts is a reasonable default for most workloads.

## IAM Permissions for Dead Letter Topics

Pub/Sub needs permission to publish to the dead letter topic and acknowledge messages from the source subscription.

```bash
# Get the Pub/Sub service account for your project
PROJECT_NUMBER=$(gcloud projects describe my-project --format='value(projectNumber)')
PUBSUB_SA="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

# Grant permission to publish to the dead letter topic
gcloud pubsub topics add-iam-policy-binding order-processing-dlq \
    --member="serviceAccount:${PUBSUB_SA}" \
    --role="roles/pubsub.publisher"

# Grant permission to acknowledge messages from the source subscription
gcloud pubsub subscriptions add-iam-policy-binding order-processing-sub \
    --member="serviceAccount:${PUBSUB_SA}" \
    --role="roles/pubsub.subscriber"
```

## Building a Subscriber with Error Handling

Here is a subscriber that handles different types of failures appropriately.

```python
# subscriber.py - Pub/Sub subscriber with error handling
from google.cloud import pubsub_v1
import json
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OrderProcessor:
    """Process order messages with error classification."""

    def __init__(self, project_id, subscription_id):
        self.subscriber = pubsub_v1.SubscriberClient()
        self.subscription_path = self.subscriber.subscription_path(
            project_id, subscription_id
        )

    def callback(self, message):
        """Process a single message with error handling."""
        delivery_attempt = message.delivery_attempt or 0

        logger.info(
            f"Processing message {message.message_id} "
            f"(delivery attempt: {delivery_attempt})"
        )

        try:
            # Parse the message data
            data = json.loads(message.data.decode("utf-8"))

            # Validate the message before processing
            self.validate_message(data)

            # Process the order
            self.process_order(data)

            # Success - acknowledge the message
            message.ack()
            logger.info(f"Message {message.message_id} processed successfully")

        except ValidationError as e:
            # Bad data - will never succeed, ack to prevent retries
            logger.warning(
                f"Invalid message {message.message_id}: {e}. "
                f"Acknowledging to prevent infinite retries."
            )
            message.ack()

        except TransientError as e:
            # Temporary failure - nack for retry
            logger.warning(
                f"Transient error for message {message.message_id}: {e}. "
                f"Nacking for retry (attempt {delivery_attempt})."
            )
            message.nack()

        except Exception as e:
            # Unexpected error - nack for retry but log details
            logger.error(
                f"Unexpected error for message {message.message_id}: {e}",
                exc_info=True,
            )
            message.nack()

    def validate_message(self, data):
        """Validate message structure before processing."""
        required_fields = ["order_id", "customer_id", "items", "total"]
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")

        if not isinstance(data["items"], list) or len(data["items"]) == 0:
            raise ValidationError("Order must have at least one item")

        if data["total"] <= 0:
            raise ValidationError(f"Invalid total: {data['total']}")

    def process_order(self, data):
        """Process the order - this is where your business logic goes."""
        order_id = data["order_id"]

        # Simulate processing that might fail
        # In real code, this would interact with databases, APIs, etc.
        logger.info(f"Processing order {order_id}: {len(data['items'])} items, total ${data['total']}")

        # Example: Call external payment API (might fail with transient errors)
        try:
            charge_payment(data["customer_id"], data["total"])
        except ConnectionError:
            raise TransientError("Payment service unavailable")

        # Example: Update database (might fail with transient errors)
        try:
            update_order_status(order_id, "processed")
        except Exception as e:
            raise TransientError(f"Database error: {e}")

    def start(self):
        """Start the subscriber."""
        flow_control = pubsub_v1.types.FlowControl(
            max_messages=20,
            max_bytes=10 * 1024 * 1024,
        )

        streaming_pull_future = self.subscriber.subscribe(
            self.subscription_path,
            callback=self.callback,
            flow_control=flow_control,
        )

        logger.info(f"Listening on {self.subscription_path}")

        try:
            streaming_pull_future.result()
        except KeyboardInterrupt:
            streaming_pull_future.cancel()
            streaming_pull_future.result()

# Custom exception classes for error classification
class ValidationError(Exception):
    """Raised for permanently invalid messages."""
    pass

class TransientError(Exception):
    """Raised for temporary failures that should be retried."""
    pass

def charge_payment(customer_id, amount):
    """Placeholder for payment processing."""
    pass

def update_order_status(order_id, status):
    """Placeholder for database update."""
    pass
```

## Application-Level Retry with Exponential Backoff

Sometimes you want to retry within a single message processing attempt instead of relying on Pub/Sub redelivery.

```python
import time
import random

def retry_with_backoff(func, max_retries=3, base_delay=1.0, max_delay=30.0):
    """Execute a function with exponential backoff retry logic."""
    for attempt in range(max_retries + 1):
        try:
            return func()
        except TransientError as e:
            if attempt == max_retries:
                raise  # Give up after all retries

            # Calculate delay with exponential backoff and jitter
            delay = min(base_delay * (2 ** attempt), max_delay)
            jitter = random.uniform(0, delay * 0.1)  # 10% jitter
            total_delay = delay + jitter

            logger.warning(
                f"Attempt {attempt + 1} failed: {e}. "
                f"Retrying in {total_delay:.1f}s..."
            )
            time.sleep(total_delay)

# Usage in the message callback
def process_with_retry(data):
    """Process a message with application-level retries."""
    def do_payment():
        return charge_payment(data["customer_id"], data["total"])

    def do_db_update():
        return update_order_status(data["order_id"], "processed")

    # Retry the payment call up to 3 times with backoff
    retry_with_backoff(do_payment, max_retries=3)

    # Retry the database update
    retry_with_backoff(do_db_update, max_retries=3)
```

## Processing Dead Letter Messages

You need a separate subscriber for the dead letter topic to investigate and optionally replay failed messages.

```python
# dead_letter_processor.py - Handle messages from the dead letter topic
from google.cloud import pubsub_v1, firestore
import json
import logging

logger = logging.getLogger(__name__)

def process_dead_letter(message):
    """Handle a message from the dead letter topic."""
    data = message.data.decode("utf-8")
    attributes = dict(message.attributes)

    # Log the failed message for investigation
    logger.error(
        f"Dead letter message received: {message.message_id}",
        extra={
            "dead_letter_data": data[:500],
            "attributes": attributes,
            "original_message_id": attributes.get("CloudPubSubDeadLetterSourceDeliveryCount"),
        },
    )

    # Store in Firestore for investigation and potential replay
    db = firestore.Client()
    db.collection("dead_letters").document(message.message_id).set({
        "data": data,
        "attributes": attributes,
        "received_at": firestore.SERVER_TIMESTAMP,
        "status": "pending_review",
        "topic": "order-processing",
    })

    # Acknowledge the dead letter message
    message.ack()

# Subscribe to the dead letter topic
subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path("my-project", "order-processing-dlq-sub")

streaming_pull_future = subscriber.subscribe(
    subscription_path,
    callback=process_dead_letter,
)
```

## Replaying Dead Letter Messages

After fixing the underlying issue, replay failed messages.

```python
from google.cloud import pubsub_v1, firestore
import json

def replay_dead_letters(project_id, original_topic_id):
    """Replay dead letter messages back to the original topic."""
    db = firestore.Client()
    publisher = pubsub_v1.PublisherClient()
    topic_path = publisher.topic_path(project_id, original_topic_id)

    # Find pending dead letter messages
    docs = (
        db.collection("dead_letters")
        .where("status", "==", "pending_review")
        .where("topic", "==", original_topic_id)
        .stream()
    )

    replayed = 0
    for doc in docs:
        data = doc.to_dict()

        # Republish to the original topic
        future = publisher.publish(
            topic_path,
            data=data["data"].encode("utf-8"),
            replayed="true",  # Mark as replayed
        )
        future.result()

        # Update the status
        doc.reference.update({"status": "replayed"})
        replayed += 1

    print(f"Replayed {replayed} messages to {original_topic_id}")

# After fixing the bug, replay the failed messages
replay_dead_letters("my-project", "order-processing")
```

## Monitoring Error Rates

Track your message processing health with metrics.

```python
import time
from collections import defaultdict

class MessageMetrics:
    """Track message processing metrics."""

    def __init__(self):
        self.counters = defaultdict(int)
        self.start_time = time.time()

    def record_success(self):
        self.counters["success"] += 1

    def record_failure(self, error_type):
        self.counters[f"failure_{error_type}"] += 1

    def report(self):
        elapsed = time.time() - self.start_time
        total = sum(self.counters.values())
        success = self.counters.get("success", 0)

        print(f"Messages processed: {total}")
        print(f"Success rate: {success/total:.1%}" if total > 0 else "No messages")
        print(f"Throughput: {total/elapsed:.1f} msg/s")
        for key, count in sorted(self.counters.items()):
            if key.startswith("failure_"):
                print(f"  {key}: {count}")

metrics = MessageMetrics()
```

## Monitoring in Production

Reliable message processing requires continuous monitoring. OneUptime (https://oneuptime.com) can track your subscriber services, alert on rising error rates, and help you detect when dead letter queue growth indicates a systemic problem that needs attention.

## Summary

Building reliable Pub/Sub subscribers requires thinking about failure modes upfront. Classify errors into permanent (bad data) and transient (temporary failures), configure dead letter topics with appropriate retry limits, implement application-level retries with exponential backoff for transient errors, and build tooling to investigate and replay dead letter messages. The goal is to process every message that can be processed and clearly surface the ones that cannot.
