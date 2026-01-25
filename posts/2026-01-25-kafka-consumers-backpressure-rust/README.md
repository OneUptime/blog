# How to Build Kafka Consumers with Backpressure in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Kafka, Backpressure, Message Queue, Streaming

Description: Learn how to build robust Kafka consumers in Rust that handle backpressure gracefully, preventing memory exhaustion and ensuring reliable message processing under heavy load.

---

When you're consuming messages from Kafka at scale, the consumer can easily become overwhelmed if messages arrive faster than your application can process them. Without proper backpressure handling, you'll see memory usage spike, processing latency climb, and eventually your service will crash. In this guide, we'll build a Kafka consumer in Rust that handles backpressure correctly using channels, async processing, and smart batching.

## Why Backpressure Matters

Kafka is designed for high throughput. A single partition can deliver hundreds of thousands of messages per second to your consumer. If your processing logic involves database writes, HTTP calls, or any I/O-bound operation, you cannot keep up with raw Kafka speeds.

Without backpressure, your consumer will:

- Buffer messages in memory indefinitely
- Exhaust heap space and get OOM-killed
- Lose messages that were fetched but not yet committed
- Create cascading failures in downstream systems

Backpressure is the mechanism that slows down the producer (or in this case, the fetch loop) when the consumer cannot keep pace. Rust's ownership model and async ecosystem make it particularly well-suited for building backpressure-aware systems.

## Setting Up the Project

First, create a new Rust project and add the necessary dependencies:

```bash
cargo new kafka-backpressure
cd kafka-backpressure
```

Add these to your `Cargo.toml`:

```toml
[dependencies]
rdkafka = { version = "0.36", features = ["cmake-build"] }
tokio = { version = "1", features = ["full"] }
futures = "0.3"
tracing = "0.1"
tracing-subscriber = "0.3"
```

We're using `rdkafka`, the Rust wrapper around librdkafka, which is battle-tested and production-ready. Tokio provides our async runtime, and we'll use bounded channels for backpressure control.

## The Basic Consumer Without Backpressure

Let's start with a naive implementation to understand the problem:

```rust
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::config::ClientConfig;
use rdkafka::Message;
use futures::StreamExt;

async fn naive_consumer() {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .set("group.id", "my-group")
        .set("auto.offset.reset", "earliest")
        .create()
        .expect("Failed to create consumer");

    consumer.subscribe(&["my-topic"]).unwrap();

    // This will buffer messages as fast as Kafka can deliver them
    let mut stream = consumer.stream();

    while let Some(result) = stream.next().await {
        match result {
            Ok(msg) => {
                // Simulate slow processing - 100ms per message
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                println!("Processed: {:?}", msg.offset());
            }
            Err(e) => eprintln!("Error: {}", e),
        }
    }
}
```

This consumer fetches messages as fast as possible and processes them sequentially. If Kafka delivers 1000 messages per second but processing takes 100ms each, you can only handle 10 messages per second. The remaining 990 messages per second accumulate in memory.

## Building a Backpressure-Aware Consumer

The fix is to decouple fetching from processing using a bounded channel. When the channel is full, the fetch loop blocks, which naturally slows down consumption from Kafka.

```rust
use rdkafka::consumer::{Consumer, StreamConsumer, CommitMode};
use rdkafka::config::ClientConfig;
use rdkafka::message::OwnedMessage;
use rdkafka::Message;
use tokio::sync::mpsc;
use futures::StreamExt;
use std::time::Duration;

// Configuration for backpressure control
const CHANNEL_CAPACITY: usize = 100;  // Max messages buffered
const WORKER_COUNT: usize = 4;        // Parallel processors

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Bounded channel provides backpressure
    let (tx, rx) = mpsc::channel::<OwnedMessage>(CHANNEL_CAPACITY);

    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .set("group.id", "backpressure-group")
        .set("auto.offset.reset", "earliest")
        .set("enable.auto.commit", "false")  // Manual commits for reliability
        .set("fetch.max.bytes", "1048576")   // Limit fetch size
        .set("max.poll.interval.ms", "300000")
        .create()
        .expect("Failed to create consumer");

    consumer.subscribe(&["my-topic"]).unwrap();

    // Spawn the fetch task
    let fetch_handle = tokio::spawn(fetch_loop(consumer, tx));

    // Spawn worker tasks
    let worker_handles: Vec<_> = (0..WORKER_COUNT)
        .map(|id| tokio::spawn(process_messages(id, rx.clone())))
        .collect();

    // Note: In production, handle graceful shutdown here
    fetch_handle.await.unwrap();
}

async fn fetch_loop(consumer: StreamConsumer, tx: mpsc::Sender<OwnedMessage>) {
    let mut stream = consumer.stream();

    while let Some(result) = stream.next().await {
        match result {
            Ok(borrowed_msg) => {
                // Convert to owned message so we can send across threads
                let owned = borrowed_msg.detach();

                // This send() will block when channel is full
                // That's the backpressure mechanism at work
                if tx.send(owned).await.is_err() {
                    tracing::error!("Receiver dropped, shutting down fetch loop");
                    break;
                }
            }
            Err(e) => {
                tracing::error!("Kafka error: {}", e);
            }
        }
    }
}

async fn process_messages(worker_id: usize, mut rx: mpsc::Receiver<OwnedMessage>) {
    while let Some(msg) = rx.recv().await {
        let payload = msg.payload()
            .map(|p| String::from_utf8_lossy(p).to_string())
            .unwrap_or_default();

        // Your actual processing logic here
        if let Err(e) = process_single_message(&payload).await {
            tracing::error!(
                worker = worker_id,
                offset = msg.offset(),
                "Processing failed: {}",
                e
            );
            // Handle retry logic or dead-letter queue here
        }

        tracing::debug!(
            worker = worker_id,
            offset = msg.offset(),
            "Processed message"
        );
    }
}

async fn process_single_message(payload: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Simulate I/O-bound work like database writes
    tokio::time::sleep(Duration::from_millis(50)).await;

    // Your business logic here
    tracing::info!("Processing: {}", &payload[..payload.len().min(50)]);

    Ok(())
}
```

## Key Design Decisions Explained

**Bounded Channel Capacity**: The `CHANNEL_CAPACITY` constant controls how many messages can be buffered. Set this based on your memory budget and processing latency. A smaller buffer means tighter backpressure but potentially lower throughput due to more frequent blocking.

**Worker Pool**: Multiple workers process messages in parallel, increasing throughput. The workers share the receiving end of the channel, and Tokio's mpsc receiver handles the distribution automatically.

**Manual Commits**: We disabled auto-commit so we can commit offsets only after successful processing. This prevents message loss during crashes.

**Owned Messages**: We call `detach()` to convert borrowed messages to owned ones. This lets us send messages across task boundaries without lifetime issues.

## Adding Batch Processing for Higher Throughput

Processing messages one at a time often leaves performance on the table. Many downstream systems like databases perform better with batch writes. Here's how to add batching:

```rust
use std::time::Instant;

const BATCH_SIZE: usize = 50;
const BATCH_TIMEOUT: Duration = Duration::from_millis(500);

async fn batch_processor(mut rx: mpsc::Receiver<OwnedMessage>) {
    let mut batch = Vec::with_capacity(BATCH_SIZE);
    let mut last_flush = Instant::now();

    loop {
        // Use timeout to ensure batches flush even under low load
        let timeout = BATCH_TIMEOUT.saturating_sub(last_flush.elapsed());

        match tokio::time::timeout(timeout, rx.recv()).await {
            Ok(Some(msg)) => {
                batch.push(msg);

                if batch.len() >= BATCH_SIZE {
                    flush_batch(&mut batch).await;
                    last_flush = Instant::now();
                }
            }
            Ok(None) => {
                // Channel closed, flush remaining and exit
                if !batch.is_empty() {
                    flush_batch(&mut batch).await;
                }
                break;
            }
            Err(_) => {
                // Timeout reached, flush what we have
                if !batch.is_empty() {
                    flush_batch(&mut batch).await;
                    last_flush = Instant::now();
                }
            }
        }
    }
}

async fn flush_batch(batch: &mut Vec<OwnedMessage>) {
    tracing::info!("Flushing batch of {} messages", batch.len());

    // Process the entire batch - e.g., bulk insert to database
    // In production, handle partial failures appropriately

    batch.clear();
}
```

The batch processor collects messages until either the batch is full or a timeout expires. This balances latency (small batches flush quickly under low load) with throughput (large batches under high load).

## Monitoring Your Backpressure

You cannot improve what you cannot measure. Add these metrics to understand your consumer's behavior:

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

struct Metrics {
    messages_received: AtomicU64,
    messages_processed: AtomicU64,
    channel_full_events: AtomicU64,
    processing_errors: AtomicU64,
}

impl Metrics {
    fn new() -> Self {
        Self {
            messages_received: AtomicU64::new(0),
            messages_processed: AtomicU64::new(0),
            channel_full_events: AtomicU64::new(0),
            processing_errors: AtomicU64::new(0),
        }
    }

    fn record_received(&self) {
        self.messages_received.fetch_add(1, Ordering::Relaxed);
    }

    fn record_processed(&self) {
        self.messages_processed.fetch_add(1, Ordering::Relaxed);
    }

    fn backlog(&self) -> u64 {
        let received = self.messages_received.load(Ordering::Relaxed);
        let processed = self.messages_processed.load(Ordering::Relaxed);
        received.saturating_sub(processed)
    }
}
```

Export these metrics to Prometheus or your observability platform. The `backlog()` metric is particularly important - it shows how many messages are in-flight. If this number grows unbounded, your backpressure mechanism isn't working correctly.

## Production Considerations

Before deploying this to production, address these concerns:

**Graceful Shutdown**: Handle SIGTERM by stopping the fetch loop, draining the channel, and committing final offsets. Rust's async ecosystem makes this straightforward with `tokio::signal`.

**Offset Management**: The example above processes messages but doesn't commit offsets. In production, track the highest processed offset per partition and commit periodically or after each batch.

**Error Handling**: Failed messages need somewhere to go. Implement a dead-letter queue or retry mechanism with exponential backoff.

**Partition Assignment**: If you're consuming from multiple partitions, consider using a channel per partition to maintain ordering guarantees within each partition.

## Wrapping Up

Backpressure handling separates reliable systems from those that fall over under load. By using bounded channels between your Kafka fetch loop and processing workers, you create a natural throttling mechanism that prevents memory exhaustion while maintaining throughput.

Rust's type system and async primitives make this pattern both safe and efficient. The compiler ensures you handle errors, ownership rules prevent data races, and the zero-cost abstractions mean you're not paying for safety with performance.

Start with conservative channel sizes and worker counts, then tune based on your observed metrics. The right configuration depends on your message size, processing complexity, and downstream system capabilities.
