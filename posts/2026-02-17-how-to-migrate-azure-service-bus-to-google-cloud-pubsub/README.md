# How to Migrate Azure Service Bus to Google Cloud Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Pub/Sub, Azure Service Bus, Messaging, Cloud Migration

Description: A step-by-step guide to migrating messaging workloads from Azure Service Bus to Google Cloud Pub/Sub, covering queues, topics, subscriptions, and message pattern conversion.

---

Azure Service Bus and Google Cloud Pub/Sub are both managed messaging services, but they cater to slightly different use cases. Service Bus is a traditional enterprise message broker with features like FIFO queues, sessions, transactions, and dead-letter queues. Pub/Sub is a high-throughput messaging system optimized for event streaming and fan-out patterns.

Some Service Bus features have direct Pub/Sub equivalents. Others require different architectural approaches in GCP.

## Service Comparison

| Feature | Azure Service Bus | Google Cloud Pub/Sub |
|---------|------------------|---------------------|
| Queues | Yes (point-to-point) | Pull subscription on a topic |
| Topics/Subscriptions | Yes | Yes |
| FIFO ordering | Sessions / message ordering | Ordering keys |
| Dead-letter queue | Built-in per queue/subscription | Dead-letter topic |
| Message TTL | Per message or queue | Subscription message retention |
| Transactions | Yes | No |
| Duplicate detection | Built-in | Client-side with Datastore/Firestore |
| Message size | 256 KB (Standard) / 100 MB (Premium) | 10 MB |
| Scheduled delivery | Yes | No built-in (use Cloud Tasks or Scheduler) |
| Sessions | Yes | No direct equivalent |
| Message lock | Peek-lock pattern | Ack deadline |

## Step 1: Inventory Your Service Bus Setup

Document your namespaces, queues, topics, and subscriptions.

```bash
# List all Service Bus namespaces
az servicebus namespace list \
  --resource-group my-rg \
  --query '[*].{Name:name,Tier:sku.tier,Location:location}' \
  --output table

# List queues in a namespace
az servicebus queue list \
  --namespace-name my-namespace \
  --resource-group my-rg \
  --query '[*].{
    Name:name,
    MaxSize:maxSizeInMegabytes,
    MessageCount:countDetails.activeMessageCount,
    DeadLetter:countDetails.deadLetterMessageCount,
    Sessions:requiresSession,
    TTL:defaultMessageTimeToLive
  }' \
  --output table

# List topics
az servicebus topic list \
  --namespace-name my-namespace \
  --resource-group my-rg \
  --query '[*].{Name:name,Subscriptions:subscriptionCount}' \
  --output table

# List subscriptions for a topic
az servicebus topic subscription list \
  --namespace-name my-namespace \
  --resource-group my-rg \
  --topic-name my-topic \
  --output table
```

## Step 2: Create Pub/Sub Topics and Subscriptions

Map your Service Bus queues and topics to Pub/Sub resources.

### Migrating Queues

A Service Bus queue becomes a Pub/Sub topic with a single pull subscription:

```bash
# Create a topic for each Service Bus queue
gcloud pubsub topics create order-processing-queue

# Create a single pull subscription (point-to-point behavior)
gcloud pubsub subscriptions create order-processing-sub \
  --topic=order-processing-queue \
  --ack-deadline=60 \
  --message-retention-duration=7d \
  --expiration-period=never

# Set up dead-letter handling
gcloud pubsub topics create order-processing-dead-letter

gcloud pubsub subscriptions update order-processing-sub \
  --dead-letter-topic=order-processing-dead-letter \
  --max-delivery-attempts=10
```

### Migrating Topics with Subscriptions

Service Bus topics with multiple subscriptions map directly to Pub/Sub:

```bash
# Create the topic
gcloud pubsub topics create notification-events

# Create subscriptions (each gets a copy of every message)
gcloud pubsub subscriptions create email-handler \
  --topic=notification-events \
  --ack-deadline=30

gcloud pubsub subscriptions create sms-handler \
  --topic=notification-events \
  --ack-deadline=30

gcloud pubsub subscriptions create audit-logger \
  --topic=notification-events \
  --ack-deadline=30
```

### Migrating Subscription Filters

Service Bus subscription rules/filters map to Pub/Sub subscription filters:

```bash
# Service Bus filter: SqlFilter("priority = 'high'")
# Pub/Sub equivalent:
gcloud pubsub subscriptions create high-priority-handler \
  --topic=notification-events \
  --message-filter='attributes.priority = "high"'

# Service Bus filter: SqlFilter("category IN ('billing', 'payment')")
# Pub/Sub equivalent:
gcloud pubsub subscriptions create billing-handler \
  --topic=notification-events \
  --message-filter='attributes.category = "billing" OR attributes.category = "payment"'
```

## Step 3: Handle Ordering (Sessions)

Service Bus sessions provide FIFO ordering and session-based grouping. Pub/Sub uses ordering keys for ordered delivery.

```bash
# Create a subscription with message ordering enabled
gcloud pubsub subscriptions create ordered-processing \
  --topic=order-processing-queue \
  --enable-message-ordering \
  --ack-deadline=60
```

When publishing, specify an ordering key:

```python
from google.cloud import pubsub_v1

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path('my-project', 'order-processing-queue')

def publish_ordered_message(session_id, message_data):
    """Publish with ordering key - equivalent to Service Bus session ID."""
    data = json.dumps(message_data).encode('utf-8')

    # ordering_key replaces Service Bus session ID
    # Messages with the same ordering_key are delivered in order
    future = publisher.publish(
        topic_path,
        data,
        ordering_key=session_id  # equivalent to session ID
    )
    return future.result()
```

## Step 4: Migrate Producer Code

Convert your Service Bus sender code to Pub/Sub publisher code.

```python
# Old Azure Service Bus producer
from azure.servicebus import ServiceBusClient, ServiceBusMessage

connection_str = "Endpoint=sb://my-namespace.servicebus.windows.net/;SharedAccessKeyName=..."
client = ServiceBusClient.from_connection_string(connection_str)

def send_to_service_bus(queue_name, message_body, properties=None):
    with client.get_queue_sender(queue_name) as sender:
        message = ServiceBusMessage(
            body=json.dumps(message_body),
            application_properties=properties or {},
            content_type='application/json',
            time_to_live=timedelta(hours=24)
        )
        sender.send_messages(message)

# New Pub/Sub publisher
from google.cloud import pubsub_v1
import json

publisher = pubsub_v1.PublisherClient()

def send_to_pubsub(topic_id, message_body, attributes=None):
    """Publish a message to a Pub/Sub topic."""
    topic_path = publisher.topic_path('my-project', topic_id)
    data = json.dumps(message_body).encode('utf-8')

    # Attributes replace Service Bus application properties
    future = publisher.publish(
        topic_path,
        data,
        **(attributes or {})
    )
    return future.result()
```

## Step 5: Migrate Consumer Code

Convert receiver code from Service Bus to Pub/Sub.

```python
# Old Azure Service Bus consumer
from azure.servicebus import ServiceBusClient

connection_str = "Endpoint=sb://..."
client = ServiceBusClient.from_connection_string(connection_str)

def process_queue():
    with client.get_queue_receiver('order-processing') as receiver:
        for message in receiver:
            try:
                body = json.loads(str(message))
                process_order(body)
                receiver.complete_message(message)  # Acknowledge
            except Exception:
                receiver.dead_letter_message(message)  # Send to DLQ

# New Pub/Sub subscriber
from google.cloud import pubsub_v1
from concurrent.futures import TimeoutError

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path('my-project', 'order-processing-sub')

def callback(message):
    """Process messages from Pub/Sub subscription."""
    try:
        body = json.loads(message.data.decode('utf-8'))
        process_order(body)
        message.ack()  # Acknowledge (equivalent to complete_message)
    except Exception as e:
        print(f"Error processing message: {e}")
        message.nack()  # Negative ack triggers redelivery

# Start listening
streaming_pull = subscriber.subscribe(subscription_path, callback=callback)

try:
    streaming_pull.result()
except TimeoutError:
    streaming_pull.cancel()
    streaming_pull.result()
```

## Step 6: Handle Scheduled Messages

Service Bus supports scheduled delivery (enqueue messages for future delivery). Pub/Sub does not have this built in, but Cloud Tasks provides equivalent functionality.

```python
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
import datetime
import json

tasks_client = tasks_v2.CloudTasksClient()
queue_path = tasks_client.queue_path('my-project', 'us-central1', 'scheduled-messages')

def schedule_message(topic_id, message_body, deliver_at):
    """Schedule a message for future delivery - replaces Service Bus scheduled enqueue."""
    task = {
        'http_request': {
            'http_method': tasks_v2.HttpMethod.POST,
            'url': f'https://us-central1-my-project.cloudfunctions.net/publish-to-pubsub',
            'body': json.dumps({
                'topic': topic_id,
                'message': message_body
            }).encode(),
            'headers': {'Content-Type': 'application/json'},
            'oidc_token': {
                'service_account_email': 'tasks-sa@my-project.iam.gserviceaccount.com'
            }
        },
        'schedule_time': timestamp_pb2.Timestamp().FromDatetime(deliver_at)
    }

    tasks_client.create_task(parent=queue_path, task=task)
```

## Step 7: Handle Transactions

Service Bus supports transactions across multiple queues/topics. Pub/Sub does not have transactional support. If you need transactional behavior:

1. Use Firestore transactions with Pub/Sub publishing
2. Implement the Outbox pattern - write messages to a database in the same transaction as your business data, then publish asynchronously

```python
from google.cloud import firestore, pubsub_v1

db = firestore.Client()
publisher = pubsub_v1.PublisherClient()

def process_with_outbox(order_data):
    """Transactional processing using the outbox pattern."""
    transaction = db.transaction()

    @firestore.transactional
    def update_in_transaction(transaction):
        # Update business data
        order_ref = db.collection('orders').document(order_data['id'])
        transaction.set(order_ref, order_data)

        # Write to outbox (same transaction)
        outbox_ref = db.collection('outbox').document()
        transaction.set(outbox_ref, {
            'topic': 'order-events',
            'data': order_data,
            'status': 'pending',
            'created_at': firestore.SERVER_TIMESTAMP
        })

    update_in_transaction(transaction)
    # A separate process reads the outbox and publishes to Pub/Sub
```

## Step 8: Validate the Migration

Run both systems in parallel and compare behavior.

```bash
# Monitor Pub/Sub metrics
gcloud monitoring metrics list \
  --filter='metric.type=starts_with("pubsub.googleapis.com")'

# Check for unacknowledged messages (potential processing issues)
gcloud pubsub subscriptions pull order-processing-sub --auto-ack --limit=0

# Check dead-letter topic for failed messages
gcloud pubsub subscriptions create dlq-reader \
  --topic=order-processing-dead-letter
gcloud pubsub subscriptions pull dlq-reader --limit=10
```

## Summary

The Service Bus to Pub/Sub migration is straightforward for basic queue and topic patterns. The main gaps are around transactions (use the outbox pattern), scheduled delivery (use Cloud Tasks), and sessions (use ordering keys). Pub/Sub's strength is in high-throughput event streaming and simple fan-out, while Service Bus excels at enterprise messaging patterns. Evaluate whether your application truly needs features like transactions and sessions, or if simpler patterns can achieve the same business outcomes.
