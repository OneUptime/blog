# How to Choose Between Pub/Sub and Cloud Tasks for Asynchronous Processing on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Cloud Tasks, Messaging, Asynchronous Processing, Serverless

Description: Understand the key differences between Google Cloud Pub/Sub and Cloud Tasks so you can pick the right service for your async processing needs.

---

Pub/Sub and Cloud Tasks both handle asynchronous processing on Google Cloud, but they solve different problems. I have seen teams pick the wrong one and end up building workarounds for features the other service provides natively. Understanding the core distinction saves you from that.

## The Core Difference

**Pub/Sub** is a messaging system. A publisher sends a message to a topic, and every subscription on that topic gets a copy. The publisher does not know or care who receives the message. This is fan-out, event-driven communication.

**Cloud Tasks** is a task queue. Your code creates a task (an HTTP request to be made later), and Cloud Tasks delivers that request to a specific target exactly once. The creator controls the target, the schedule, and the rate. This is explicit, directed work dispatch.

Think of it this way: Pub/Sub is like announcing something on a loudspeaker (anyone listening will hear it), while Cloud Tasks is like handing a specific envelope to a specific person and confirming they received it.

## Feature Comparison

| Feature | Pub/Sub | Cloud Tasks |
|---------|---------|-------------|
| Delivery model | Fan-out (one-to-many) | Point-to-point (one-to-one) |
| Deduplication | At-least-once (exactly-once available) | At-least-once with deduplication |
| Rate limiting | No built-in rate control | Yes, configurable rate and concurrency |
| Delayed delivery | No native delay | Yes, schedule tasks up to 30 days ahead |
| Message ordering | Optional ordering keys | FIFO within a queue |
| Target specification | Subscriber decides | Creator specifies target |
| Max message size | 10 MB | 1 MB (HTTP) / 1 MB (App Engine) |
| Retention | Up to 31 days | Up to 31 days |
| Dead lettering | Yes | Yes |
| Push delivery | Yes (HTTP push) | Yes (HTTP target) |
| Pull delivery | Yes | No |

## When to Use Pub/Sub

Use Pub/Sub when the publisher should not know about the consumers, or when multiple consumers need the same data.

### Event Broadcasting

When something happens and multiple services need to react:

```python
# Publishing an order event - multiple services will process it
from google.cloud import pubsub_v1
import json

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path("my-project", "order-events")

# The publisher does not know who will consume this
# Inventory service, notification service, analytics service
# all get their own copy via their subscriptions
order_event = {
    "event_type": "order.created",
    "order_id": "ORD-12345",
    "customer_id": "CUST-789",
    "total": 99.99,
    "items": [
        {"product_id": "PROD-1", "quantity": 2},
        {"product_id": "PROD-2", "quantity": 1}
    ]
}

# Publish to the topic - all subscribers will receive this
future = publisher.publish(
    topic_path,
    json.dumps(order_event).encode("utf-8"),
    event_type="order.created"
)
print(f"Published message: {future.result()}")
```

### Data Streaming

When you need continuous data flow between systems:

```python
# Streaming sensor data through Pub/Sub
# Multiple downstream systems consume the stream independently
import time

for reading in sensor.get_readings():
    publisher.publish(
        topic_path,
        json.dumps({
            "sensor_id": reading.sensor_id,
            "temperature": reading.temp,
            "humidity": reading.humidity,
            "timestamp": reading.timestamp
        }).encode("utf-8")
    )
    time.sleep(1)
```

### Decoupled Architecture

When services need to communicate without direct dependencies:

```bash
# Set up subscriptions for different consumers
# Each one independently processes the messages at its own pace

# Analytics pipeline gets all events
gcloud pubsub subscriptions create analytics-sub \
    --topic=order-events \
    --push-endpoint=https://analytics-service-xxx.run.app/events

# Email service only gets specific events (with filtering)
gcloud pubsub subscriptions create email-sub \
    --topic=order-events \
    --push-endpoint=https://email-service-xxx.run.app/notify \
    --message-filter='attributes.event_type = "order.created"'

# Warehouse service processes at its own pace
gcloud pubsub subscriptions create warehouse-sub \
    --topic=order-events \
    --ack-deadline=600
```

## When to Use Cloud Tasks

Use Cloud Tasks when you need to control the delivery - specify the target, control the rate, or schedule for later.

### Rate-Limited API Calls

When you need to call an external API that has rate limits:

```python
# Queue tasks with rate limiting to respect API limits
from google.cloud import tasks_v2
import json

client = tasks_v2.CloudTasksClient()
queue_path = client.queue_path("my-project", "us-central1", "api-calls")

def enqueue_api_call(user_id, action):
    """Create a task to call an external API with rate limiting."""
    task = tasks_v2.Task(
        http_request=tasks_v2.HttpRequest(
            http_method=tasks_v2.HttpMethod.POST,
            url="https://my-service-xxx.run.app/process-api-call",
            headers={"Content-Type": "application/json"},
            body=json.dumps({
                "user_id": user_id,
                "action": action
            }).encode()
        )
    )

    # Cloud Tasks will respect the queue's rate limit
    response = client.create_task(parent=queue_path, task=task)
    print(f"Created task: {response.name}")

# Queue 10,000 tasks - Cloud Tasks delivers them at the configured rate
for user in users:
    enqueue_api_call(user.id, "sync_profile")
```

```bash
# Configure the queue with rate limiting
# Max 10 requests per second, max 5 concurrent dispatches
gcloud tasks queues create api-calls \
    --location=us-central1 \
    --max-dispatches-per-second=10 \
    --max-concurrent-dispatches=5 \
    --max-attempts=5 \
    --min-backoff=10s \
    --max-backoff=300s
```

### Scheduled Tasks

When work needs to happen at a specific future time:

```python
# Schedule a task for future execution
from datetime import datetime, timedelta
from google.protobuf import timestamp_pb2

# Schedule a reminder email 24 hours from now
schedule_time = timestamp_pb2.Timestamp()
schedule_time.FromDatetime(datetime.utcnow() + timedelta(hours=24))

task = tasks_v2.Task(
    http_request=tasks_v2.HttpRequest(
        http_method=tasks_v2.HttpMethod.POST,
        url="https://my-service-xxx.run.app/send-reminder",
        body=json.dumps({
            "user_id": "user-123",
            "template": "abandoned_cart"
        }).encode(),
        headers={"Content-Type": "application/json"}
    ),
    schedule_time=schedule_time  # Execute 24 hours from now
)

client.create_task(parent=queue_path, task=task)
```

### Reliable Work Dispatch

When you need to ensure a specific endpoint processes a specific piece of work:

```python
# Dispatch work to a specific worker with guaranteed delivery
# The task creator controls exactly where and when this runs

def process_large_upload(file_id, user_id):
    """Queue a processing task for an uploaded file."""
    task = tasks_v2.Task(
        http_request=tasks_v2.HttpRequest(
            http_method=tasks_v2.HttpMethod.POST,
            url="https://file-processor-xxx.run.app/process",
            body=json.dumps({
                "file_id": file_id,
                "user_id": user_id,
                "operations": ["validate", "transform", "index"]
            }).encode(),
            headers={"Content-Type": "application/json"},
            # Use OIDC token for authentication
            oidc_token=tasks_v2.OidcToken(
                service_account_email="tasks-sa@my-project.iam.gserviceaccount.com"
            )
        )
    )

    # Task will be retried automatically on failure
    return client.create_task(parent=queue_path, task=task)
```

## Common Mistakes

### Mistake 1: Using Pub/Sub When You Need Rate Limiting

Pub/Sub push subscriptions deliver messages as fast as possible. If your handler calls a rate-limited external API, you will burn through the limit instantly. Use Cloud Tasks with a rate-limited queue instead.

### Mistake 2: Using Cloud Tasks for Fan-Out

If multiple services need to process the same event, do not create separate Cloud Tasks for each service. Use Pub/Sub with multiple subscriptions. This way, adding a new consumer does not require changing the publisher.

### Mistake 3: Using Cloud Tasks as a Message Bus

Cloud Tasks is not a general messaging system. It delivers HTTP requests to specific targets. If you need message filtering, dead letter handling, or pull-based consumption, use Pub/Sub.

## Can You Use Both Together?

Yes, and it is a common pattern. Use Pub/Sub for event distribution, and Cloud Tasks for controlled work dispatch within individual services:

```python
# Pub/Sub subscriber that creates Cloud Tasks for rate-limited processing
# This combines Pub/Sub fan-out with Cloud Tasks rate control

@app.route("/pubsub-handler", methods=["POST"])
def handle_pubsub_message():
    """Receive Pub/Sub messages and create rate-limited tasks."""
    envelope = request.get_json()
    message = envelope["message"]
    data = json.loads(base64.b64decode(message["data"]))

    # Create a Cloud Tasks task with rate limiting
    task = tasks_v2.Task(
        http_request=tasks_v2.HttpRequest(
            http_method=tasks_v2.HttpMethod.POST,
            url="https://my-service-xxx.run.app/process-slowly",
            body=json.dumps(data).encode(),
            headers={"Content-Type": "application/json"}
        )
    )
    client.create_task(parent=queue_path, task=task)

    return "OK", 200
```

## Summary

Pick **Pub/Sub** when you are distributing events to multiple consumers, building event-driven architectures, or streaming data between systems. Pick **Cloud Tasks** when you need to dispatch work to a specific target with rate control, scheduling, or retry guarantees. When in doubt, ask yourself: "Does the sender need to control where and when the work happens?" If yes, Cloud Tasks. If no, Pub/Sub.
