# How to Tune Pub/Sub Subscriber Acknowledgment Deadline and Flow Control for High-Throughput Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Messaging, Flow Control, Performance Tuning

Description: Learn how to tune Pub/Sub subscriber acknowledgment deadlines and flow control settings to build reliable high-throughput message processing pipelines.

---

Google Cloud Pub/Sub is a go-to choice for building event-driven architectures on GCP. It handles message delivery at massive scale, but getting the subscriber configuration right is the difference between a pipeline that hums along and one that constantly redelivers messages, wastes resources, or backs up under load. Two settings matter most: the acknowledgment deadline and flow control. Let me walk through how to tune both for high-throughput scenarios.

## How Acknowledgment Deadlines Work

When Pub/Sub delivers a message to a subscriber, it starts a timer. The subscriber must acknowledge the message before the deadline expires, or Pub/Sub will redeliver the message to another subscriber (or the same one). The default acknowledgment deadline is 10 seconds.

If your processing takes longer than the deadline, Pub/Sub assumes the message was lost and sends it again. This causes duplicate processing, which wastes compute and can cause incorrect results if your processing is not idempotent.

## Setting the Right Acknowledgment Deadline

The deadline should be longer than your longest expected processing time, with some buffer. You can set it at the subscription level:

```bash
# Set the acknowledgment deadline to 120 seconds
# This gives slow message processing enough time to complete
gcloud pubsub subscriptions create my-subscription \
  --topic=my-topic \
  --ack-deadline=120
```

For existing subscriptions:

```bash
# Update an existing subscription's ack deadline
gcloud pubsub subscriptions update my-subscription \
  --ack-deadline=120
```

The maximum deadline is 600 seconds (10 minutes). If your processing routinely takes longer than 10 minutes per message, you should break the work into smaller units or use a different processing pattern.

## Using Deadline Extension (ModifyAckDeadline)

Rather than setting a very long static deadline, the better approach is to start with a moderate deadline and extend it as processing continues. The Pub/Sub client libraries do this automatically, but understanding the mechanism helps with tuning.

Here is how it works in Python with the standard client library:

```python
from google.cloud import pubsub_v1
from concurrent.futures import TimeoutError

# Create subscriber client with custom flow control
subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path("my-project", "my-subscription")

def callback(message):
    """
    Process each message. The client library automatically extends
    the ack deadline while this function is running.
    """
    print(f"Processing message: {message.message_id}")

    # Simulate processing that takes variable time
    process_data(message.data)

    # Acknowledge the message only after successful processing
    message.ack()
    print(f"Acknowledged message: {message.message_id}")

# Configure flow control settings for high throughput
flow_control = pubsub_v1.types.FlowControl(
    max_messages=500,           # Max outstanding messages per subscriber
    max_bytes=50 * 1024 * 1024, # 50MB max outstanding data
)

# Start streaming pull with flow control
streaming_pull_future = subscriber.subscribe(
    subscription_path,
    callback=callback,
    flow_control=flow_control,
)

print(f"Listening on {subscription_path}...")

# Block and wait for messages
try:
    streaming_pull_future.result(timeout=None)
except TimeoutError:
    streaming_pull_future.cancel()
    streaming_pull_future.result()
```

The Python client library automatically extends the acknowledgment deadline by sending `ModifyAckDeadline` requests while your callback is still running. You can control the extension interval:

```python
# Custom subscriber with explicit ack deadline extension settings
subscriber = pubsub_v1.SubscriberClient()

# The min_ack_deadline controls how aggressively the client extends deadlines
# The max_ack_deadline is the maximum extension the client will request
subscriber_options = pubsub_v1.types.FlowControl(
    max_messages=1000,
    max_bytes=100 * 1024 * 1024,  # 100MB
)
```

## Understanding Flow Control

Flow control prevents your subscriber from pulling more messages than it can handle. Without flow control, Pub/Sub can overwhelm your subscriber with a flood of messages, causing memory pressure, processing backlogs, and ultimately ack deadline expirations.

There are three flow control knobs:

- **max_messages**: The maximum number of unacknowledged messages the subscriber will hold at any time
- **max_bytes**: The maximum total size of unacknowledged messages
- **max_lease_duration**: The maximum time a message can be held without being acknowledged

## Tuning Flow Control for High Throughput

The goal is to keep your subscriber busy without overwhelming it. Here is how to think about the settings.

For **max_messages**, calculate based on your processing capacity. If each message takes 100ms to process and you have 10 processing threads, you can handle 100 messages per second. Set max_messages to something like 500-1000 to maintain a healthy buffer:

```python
import multiprocessing
from google.cloud import pubsub_v1

# Calculate optimal max_messages based on processing capacity
processing_threads = multiprocessing.cpu_count() * 2
messages_per_second_per_thread = 10  # Estimated processing rate
buffer_seconds = 5  # Keep 5 seconds of work buffered

optimal_max_messages = processing_threads * messages_per_second_per_thread * buffer_seconds
print(f"Recommended max_messages: {optimal_max_messages}")

flow_control = pubsub_v1.types.FlowControl(
    max_messages=optimal_max_messages,
    max_bytes=200 * 1024 * 1024,  # 200MB - adjust based on message sizes
)
```

For **max_bytes**, think about memory. If your messages average 10KB each and max_messages is 1000, your peak memory for message data alone is 10MB. But if messages are 1MB each, that jumps to 1GB. Set max_bytes to something your subscriber can comfortably hold in memory.

## Handling Different Message Sizes

If your topic carries messages of varying sizes, flow control by bytes becomes important:

```python
# Flow control optimized for variable-size messages
# Small messages (< 1KB): flow control by count
# Large messages (> 100KB): flow control by bytes
flow_control = pubsub_v1.types.FlowControl(
    max_messages=2000,             # High count for small messages
    max_bytes=500 * 1024 * 1024,   # 500MB cap for large messages
)
```

## Subscriber Scaling Patterns

For maximum throughput, run multiple subscriber instances. Pub/Sub distributes messages across subscribers on the same subscription.

```bash
# Deploy subscriber as a Cloud Run job with multiple instances
gcloud run jobs create message-processor \
  --image gcr.io/my-project/processor:latest \
  --tasks 10 \
  --max-retries 3 \
  --region us-central1 \
  --set-env-vars SUBSCRIPTION=my-subscription
```

Each instance should have its own flow control settings based on its capacity. For a GKE deployment, you can use HPA to scale based on the subscription's backlog:

```yaml
# HPA that scales subscriber pods based on Pub/Sub message backlog
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: subscriber-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: message-processor
  minReplicas: 2
  maxReplicas: 50
  metrics:
    - type: External
      external:
        metric:
          name: pubsub.googleapis.com|subscription|num_undelivered_messages
          selector:
            matchLabels:
              resource.labels.subscription_id: my-subscription
        target:
          type: AverageValue
          averageValue: "1000"
```

## Monitoring Your Pipeline

Keep an eye on these key Pub/Sub metrics:

- **subscription/num_undelivered_messages**: If this is growing, your subscribers cannot keep up
- **subscription/oldest_unacked_message_age**: If this exceeds your ack deadline, you have redelivery problems
- **subscription/ack_message_count vs expired_ack_deadlines_count**: A high ratio of expired deadlines to acks means your deadline is too short

```bash
# Quick check of subscription health metrics
gcloud monitoring metrics list \
  --filter='metric.type = starts_with("pubsub.googleapis.com/subscription")'
```

The interaction between ack deadlines and flow control determines how well your pipeline handles both steady-state and burst traffic. Start with conservative flow control, observe how your subscribers behave under load, and gradually increase throughput. The key insight is that these are not set-and-forget values - they should be tuned as your message patterns and processing characteristics change over time.
