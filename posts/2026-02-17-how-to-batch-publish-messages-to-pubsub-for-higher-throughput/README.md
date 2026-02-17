# How to Batch Publish Messages to Pub/Sub for Higher Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Batch Publishing, Performance, Messaging

Description: Learn how to configure batch publishing settings in Google Cloud Pub/Sub to maximize throughput by grouping multiple messages into single publish requests.

---

If you are publishing messages to Pub/Sub one at a time and waiting for each to confirm, you are leaving a lot of throughput on the table. The Pub/Sub client libraries support batch publishing, which groups multiple messages into a single API request. This dramatically reduces the overhead of individual network round trips and can increase your publish throughput by 10x or more.

Batch publishing is not a separate API. It is a configuration on the publisher client that controls how messages are accumulated before being sent. The client library handles the batching transparently - your code calls `publish()` for each message, and the library decides when to flush the batch.

## How Batch Publishing Works

When you call `publisher.publish()`, the message is not immediately sent to Pub/Sub. Instead, it goes into an internal buffer. The library sends the batch when any of these conditions is met:

1. The batch reaches the maximum message count
2. The batch reaches the maximum byte size
3. The maximum delay time has elapsed since the first message in the batch

The default settings are conservative - they prioritize latency over throughput. For high-volume workloads, tuning these settings makes a significant difference.

## Default vs Tuned Settings

Here are the default batch settings and some tuned alternatives:

```python
# Default settings (Python client library)
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1.types import BatchSettings

# Default: max 100 messages, 1 MB, 10ms delay
publisher = pubsub_v1.PublisherClient()

# Tuned for throughput: larger batches, slightly more delay
batch_settings = BatchSettings(
    max_messages=1000,          # Up to 1000 messages per batch
    max_bytes=10 * 1024 * 1024, # Up to 10 MB per batch
    max_latency=0.05,           # Flush after 50ms even if batch is not full
)

publisher = pubsub_v1.PublisherClient(
    batch_settings=batch_settings,
)
```

## Configuring Batch Settings

### Python

```python
# High-throughput publisher configuration in Python
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1.types import BatchSettings, PublisherOptions
import json

# Batch settings control how messages are grouped
batch_settings = BatchSettings(
    max_messages=1000,           # Send batch at 1000 messages
    max_bytes=10 * 1024 * 1024,  # Or when batch size hits 10 MB
    max_latency=0.1,             # Or after 100ms, whichever comes first
)

# Publisher options control concurrency
publisher_options = PublisherOptions(
    flow_control=pubsub_v1.types.PublishFlowControl(
        message_limit=10000,     # Buffer up to 10000 messages in memory
        byte_limit=100 * 1024 * 1024,  # 100 MB memory limit
        limit_exceeded_behavior=(
            pubsub_v1.types.PublishFlowControl.LimitExceededBehavior.BLOCK
        ),
    ),
)

publisher = pubsub_v1.PublisherClient(
    batch_settings=batch_settings,
    publisher_options=publisher_options,
)

topic_path = publisher.topic_path("my-project", "high-volume-events")

def publish_events(events):
    """Publish a list of events with batching."""
    futures = []

    for event in events:
        future = publisher.publish(
            topic_path,
            data=json.dumps(event).encode("utf-8"),
        )
        futures.append(future)

    # Wait for all publishes to complete
    results = []
    for future in futures:
        message_id = future.result()
        results.append(message_id)

    print(f"Published {len(results)} messages in batches")
    return results
```

### Java

```java
// High-throughput publisher configuration in Java
import com.google.cloud.pubsub.v1.Publisher;
import com.google.pubsub.v1.TopicName;
import org.threeten.bp.Duration;

// Configure batch settings for maximum throughput
BatchingSettings batchingSettings = BatchingSettings.newBuilder()
    .setElementCountThreshold(1000L)       // 1000 messages per batch
    .setRequestByteThreshold(10_000_000L)  // 10 MB per batch
    .setDelayThreshold(Duration.ofMillis(100))  // 100ms max delay
    .build();

Publisher publisher = Publisher.newBuilder(
    TopicName.of("my-project", "high-volume-events"))
    .setBatchingSettings(batchingSettings)
    .build();
```

### Go

```go
// High-throughput publisher configuration in Go
package main

import (
    "cloud.google.com/go/pubsub"
    "context"
    "time"
)

func createPublisher(projectID, topicID string) *pubsub.Topic {
    ctx := context.Background()
    client, _ := pubsub.NewClient(ctx, projectID)

    topic := client.Topic(topicID)

    // Configure batch settings for throughput
    topic.PublishSettings = pubsub.PublishSettings{
        CountThreshold: 1000,                 // 1000 messages per batch
        ByteThreshold:  10 * 1024 * 1024,     // 10 MB per batch
        DelayThreshold: 100 * time.Millisecond, // 100ms max delay
        NumGoroutines:  25,                    // Parallel publish goroutines
    }

    return topic
}
```

## Tuning for Different Workloads

### High Throughput, Latency Tolerant

For data pipelines, log shipping, or analytics ingestion where you care about throughput more than latency:

```python
# Maximize throughput: large batches, longer delay
batch_settings = BatchSettings(
    max_messages=1000,
    max_bytes=10 * 1024 * 1024,
    max_latency=0.5,  # 500ms - allow more time to fill batches
)
```

### Low Latency, Moderate Throughput

For event-driven systems where messages should be delivered quickly:

```python
# Balance throughput and latency
batch_settings = BatchSettings(
    max_messages=100,
    max_bytes=1 * 1024 * 1024,  # 1 MB
    max_latency=0.01,  # 10ms - flush quickly
)
```

### Single Message (No Batching)

If you need every message sent immediately (rare in practice):

```python
# Disable batching - each message is sent individually
batch_settings = BatchSettings(
    max_messages=1,  # Send immediately after each message
)
```

## Flow Control for the Publisher

When publishing faster than Pub/Sub can accept (due to quota limits or network issues), messages queue up in the client's memory. Flow control prevents this from causing an out-of-memory condition:

```python
# Publisher with flow control to prevent memory issues
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1.types import PublisherOptions, BatchSettings

publisher = pubsub_v1.PublisherClient(
    batch_settings=BatchSettings(
        max_messages=1000,
        max_bytes=10 * 1024 * 1024,
        max_latency=0.1,
    ),
    publisher_options=PublisherOptions(
        flow_control=pubsub_v1.types.PublishFlowControl(
            message_limit=5000,     # Max 5000 messages in the buffer
            byte_limit=50 * 1024 * 1024,  # Max 50 MB in the buffer
            limit_exceeded_behavior=(
                # BLOCK: wait until space is available
                # IGNORE: publish anyway (risk OOM)
                # ERROR: raise an exception
                pubsub_v1.types.PublishFlowControl.LimitExceededBehavior.BLOCK
            ),
        ),
    ),
)
```

The BLOCK behavior is usually the safest choice. It applies backpressure by slowing down the publisher when the buffer is full, rather than dropping messages or crashing.

## Measuring Throughput

To understand the impact of your batch settings, measure the actual publish throughput:

```python
# Benchmark publish throughput with different batch settings
import time
import json
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1.types import BatchSettings

def benchmark_publish(batch_settings, message_count=10000):
    """Measure publish throughput with given batch settings."""
    publisher = pubsub_v1.PublisherClient(batch_settings=batch_settings)
    topic_path = publisher.topic_path("my-project", "benchmark-topic")

    # Generate test messages
    test_message = json.dumps({"id": "test", "data": "x" * 100}).encode("utf-8")

    futures = []
    start_time = time.time()

    # Publish all messages
    for i in range(message_count):
        future = publisher.publish(topic_path, data=test_message)
        futures.append(future)

    # Wait for all to complete
    for future in futures:
        future.result()

    elapsed = time.time() - start_time
    rate = message_count / elapsed

    print(f"Published {message_count} messages in {elapsed:.2f}s")
    print(f"Throughput: {rate:.0f} messages/second")

    return rate

# Compare different settings
print("Default settings:")
benchmark_publish(BatchSettings())

print("\nTuned settings:")
benchmark_publish(BatchSettings(
    max_messages=1000,
    max_bytes=10 * 1024 * 1024,
    max_latency=0.1,
))
```

## Batch Publishing with Ordering Keys

When using ordering keys with batch publishing, messages with the same ordering key are batched together. Messages with different ordering keys may go into different batches:

```python
# Batch publishing with ordering keys
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1.types import BatchSettings, PublisherOptions
import json

publisher = pubsub_v1.PublisherClient(
    batch_settings=BatchSettings(
        max_messages=500,
        max_bytes=5 * 1024 * 1024,
        max_latency=0.1,
    ),
    publisher_options=PublisherOptions(
        enable_message_ordering=True,
    ),
)

topic_path = publisher.topic_path("my-project", "ordered-events")

# Messages with the same ordering key are batched together
for user_id in range(100):
    for event_num in range(10):
        publisher.publish(
            topic_path,
            data=json.dumps({"user_id": user_id, "event": event_num}).encode("utf-8"),
            ordering_key=f"user-{user_id}",
        )
```

Note that with ordering keys, you should not wait for each `publish().result()` individually within the same key if you want batching to work. The library handles ordering within batches.

## Error Handling in Batch Publishing

When a batch fails, all messages in that batch fail. Handle this appropriately:

```python
# Robust batch publisher with error handling
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1.types import BatchSettings
from concurrent import futures
import json
import logging

logger = logging.getLogger(__name__)

publisher = pubsub_v1.PublisherClient(
    batch_settings=BatchSettings(
        max_messages=500,
        max_bytes=5 * 1024 * 1024,
        max_latency=0.1,
    ),
)
topic_path = publisher.topic_path("my-project", "events")

def publish_batch_with_error_handling(messages):
    """Publish messages with per-message error handling."""
    publish_futures = []

    for msg in messages:
        future = publisher.publish(
            topic_path,
            data=json.dumps(msg).encode("utf-8"),
        )
        publish_futures.append((msg, future))

    succeeded = 0
    failed = 0
    failed_messages = []

    for msg, future in publish_futures:
        try:
            message_id = future.result(timeout=60)
            succeeded += 1
        except Exception as e:
            failed += 1
            failed_messages.append(msg)
            logger.error(f"Failed to publish message: {e}")

    logger.info(f"Published: {succeeded} succeeded, {failed} failed")

    # Optionally retry failed messages
    if failed_messages:
        logger.warning(f"Retrying {len(failed_messages)} failed messages")
        publish_batch_with_error_handling(failed_messages)
```

## Wrapping Up

Batch publishing is one of the simplest performance optimizations you can make for Pub/Sub publishers. Increase the batch size, tune the max latency to match your needs, and add flow control to protect against backpressure. For high-throughput workloads, proper batch settings can increase throughput by an order of magnitude compared to default settings. Measure your actual throughput before and after tuning to quantify the improvement.
