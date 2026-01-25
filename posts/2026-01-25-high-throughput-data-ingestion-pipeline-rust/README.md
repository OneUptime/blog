# How to Build a High-Throughput Data Ingestion Pipeline in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Data Ingestion, Pipeline, High Throughput, Streaming

Description: Learn how to build a data ingestion pipeline in Rust that handles millions of events per second. This guide covers async I/O, channel-based architectures, backpressure handling, and batching strategies for production systems.

---

When your system needs to ingest millions of events per second, the language and architecture choices matter. Rust has become a go-to choice for high-throughput data pipelines because it gives you C-level performance with memory safety guarantees. No garbage collector pauses, no runtime overhead, and fearless concurrency. This guide walks through building a production-grade ingestion pipeline from scratch.

## Why Rust for Data Ingestion

Before diving into code, let's address why Rust makes sense here. Data ingestion pipelines have specific requirements that play to Rust's strengths:

- **Predictable latency**: No GC pauses means consistent P99 latency
- **High throughput**: Zero-cost abstractions let you push hardware limits
- **Memory efficiency**: Fine-grained control over allocations reduces memory pressure
- **Safety under load**: The borrow checker catches race conditions at compile time

The tradeoff is development speed. Rust has a steeper learning curve, and you'll spend more time fighting the compiler. But for systems where throughput and reliability are non-negotiable, that upfront investment pays dividends.

## Architecture Overview

A high-throughput ingestion pipeline typically has three stages:

1. **Receivers** - Accept incoming data from multiple sources (HTTP, Kafka, TCP)
2. **Processors** - Transform, validate, and enrich events
3. **Writers** - Batch and persist data to storage (databases, object stores, queues)

We'll connect these stages with bounded channels, which gives us built-in backpressure. When the writer can't keep up, the channel fills, the processor blocks, and eventually receivers start rejecting new data gracefully.

## Setting Up the Project

Start with a new Rust project and add the dependencies we'll need:

```toml
# Cargo.toml
[package]
name = "data-pipeline"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.35", features = ["full"] }
async-channel = "2.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bytes = "1.5"
tracing = "0.1"
tracing-subscriber = "0.3"
```

## Defining the Event Structure

Keep your event structure lean. Every byte counts when you're processing millions of events:

```rust
use serde::{Deserialize, Serialize};
use bytes::Bytes;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: u64,
    pub timestamp: i64,
    pub event_type: String,
    pub payload: Bytes,
}

impl Event {
    pub fn new(id: u64, event_type: String, payload: Bytes) -> Self {
        Self {
            id,
            timestamp: chrono::Utc::now().timestamp_millis(),
            event_type,
            payload,
        }
    }
}
```

Using `Bytes` instead of `Vec<u8>` for the payload enables zero-copy slicing and cheap clones - critical for high-throughput scenarios.

## Building the Channel-Based Pipeline

The backbone of our pipeline is a set of bounded async channels. Here's the core structure:

```rust
use async_channel::{Receiver, Sender, bounded};
use std::sync::Arc;

pub struct Pipeline {
    // Channel from receivers to processors
    ingest_tx: Sender<Event>,
    ingest_rx: Receiver<Event>,

    // Channel from processors to writers
    output_tx: Sender<Vec<Event>>,
    output_rx: Receiver<Vec<Event>>,

    // Configuration
    batch_size: usize,
    batch_timeout_ms: u64,
}

impl Pipeline {
    pub fn new(
        ingest_buffer: usize,
        output_buffer: usize,
        batch_size: usize,
        batch_timeout_ms: u64,
    ) -> Self {
        let (ingest_tx, ingest_rx) = bounded(ingest_buffer);
        let (output_tx, output_rx) = bounded(output_buffer);

        Self {
            ingest_tx,
            ingest_rx,
            output_tx,
            output_rx,
            batch_size,
            batch_timeout_ms,
        }
    }

    pub fn ingest_sender(&self) -> Sender<Event> {
        self.ingest_tx.clone()
    }
}
```

The bounded channels are essential. Without them, a slow writer would cause unbounded memory growth until your process gets OOM killed.

## Implementing the Batch Processor

The processor stage collects events into batches. Batching is crucial because writing one record at a time to most storage systems is extremely inefficient:

```rust
use tokio::time::{interval, Duration};
use tracing::{info, warn};

impl Pipeline {
    pub async fn run_processor(&self) {
        let mut batch: Vec<Event> = Vec::with_capacity(self.batch_size);
        let mut ticker = interval(Duration::from_millis(self.batch_timeout_ms));

        loop {
            tokio::select! {
                // Receive new event
                event = self.ingest_rx.recv() => {
                    match event {
                        Ok(e) => {
                            batch.push(e);

                            // Flush if batch is full
                            if batch.len() >= self.batch_size {
                                self.flush_batch(&mut batch).await;
                            }
                        }
                        Err(_) => {
                            // Channel closed, flush remaining and exit
                            if !batch.is_empty() {
                                self.flush_batch(&mut batch).await;
                            }
                            info!("Processor shutting down");
                            break;
                        }
                    }
                }

                // Timeout - flush partial batch
                _ = ticker.tick() => {
                    if !batch.is_empty() {
                        self.flush_batch(&mut batch).await;
                    }
                }
            }
        }
    }

    async fn flush_batch(&self, batch: &mut Vec<Event>) {
        let events: Vec<Event> = batch.drain(..).collect();
        let count = events.len();

        // Send to writer stage
        if let Err(e) = self.output_tx.send(events).await {
            warn!("Failed to send batch to writer: {}", e);
        } else {
            info!(batch_size = count, "Flushed batch");
        }
    }
}
```

The `tokio::select!` macro lets us wait on multiple async operations simultaneously. We either receive an event, hit our batch size limit, or hit the timeout - whichever comes first.

## Building the Writer with Retry Logic

The writer receives batches and persists them. Production writers need retry logic because storage systems fail:

```rust
use std::time::Duration;
use tokio::time::sleep;

pub struct Writer {
    rx: Receiver<Vec<Event>>,
    max_retries: u32,
    base_delay_ms: u64,
}

impl Writer {
    pub fn new(rx: Receiver<Vec<Event>>) -> Self {
        Self {
            rx,
            max_retries: 3,
            base_delay_ms: 100,
        }
    }

    pub async fn run(&self) {
        while let Ok(batch) = self.rx.recv().await {
            self.write_with_retry(&batch).await;
        }
        info!("Writer shutting down");
    }

    async fn write_with_retry(&self, batch: &[Event]) {
        let mut attempts = 0;

        loop {
            match self.write_batch(batch).await {
                Ok(_) => {
                    info!(count = batch.len(), "Wrote batch successfully");
                    return;
                }
                Err(e) => {
                    attempts += 1;
                    if attempts >= self.max_retries {
                        // Dead letter queue or alert in production
                        warn!(
                            error = %e,
                            attempts = attempts,
                            "Batch write failed permanently"
                        );
                        return;
                    }

                    // Exponential backoff
                    let delay = self.base_delay_ms * 2_u64.pow(attempts - 1);
                    warn!(
                        error = %e,
                        attempt = attempts,
                        retry_in_ms = delay,
                        "Batch write failed, retrying"
                    );
                    sleep(Duration::from_millis(delay)).await;
                }
            }
        }
    }

    async fn write_batch(&self, batch: &[Event]) -> Result<(), std::io::Error> {
        // Replace with actual storage logic
        // Example: write to PostgreSQL, S3, Kafka, etc.
        Ok(())
    }
}
```

## Running Multiple Workers

To maximize throughput, run multiple processor and writer instances:

```rust
#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Create pipeline with 100k event buffer, 1k batch buffer
    let pipeline = Arc::new(Pipeline::new(100_000, 1_000, 500, 100));

    // Spawn processor workers
    let num_processors = 4;
    for i in 0..num_processors {
        let p = pipeline.clone();
        tokio::spawn(async move {
            info!(worker = i, "Starting processor");
            p.run_processor().await;
        });
    }

    // Spawn writer workers
    let num_writers = 2;
    for i in 0..num_writers {
        let writer = Writer::new(pipeline.output_rx.clone());
        tokio::spawn(async move {
            info!(worker = i, "Starting writer");
            writer.run().await;
        });
    }

    // Start HTTP receiver or other ingestion sources
    // ...
}
```

## Performance Tuning Tips

After building the basic pipeline, here are the optimizations that make the difference between handling 100k and 1M events per second:

**1. Tune your buffer sizes.** Start with ingest buffers at 10x your expected burst size. Too small and you'll drop events; too large and you waste memory.

**2. Use object pools.** Allocating and deallocating millions of small objects creates heap fragmentation. Reuse event buffers where possible.

**3. Profile with perf.** Rust's release builds are fast, but you might be surprised where time goes. Use `perf record` and `perf report` to find hotspots.

**4. Batch aggressively.** Network and disk I/O have high per-operation overhead. Larger batches amortize that cost across more events.

**5. Monitor channel depths.** Expose metrics for channel lengths. A consistently full channel indicates a bottleneck downstream.

## Handling Backpressure Gracefully

When your pipeline can't keep up, you have three options:

1. **Drop events** - Accept data loss, emit a metric
2. **Block senders** - Let backpressure propagate upstream
3. **Spill to disk** - Buffer overflow to local storage

For most systems, option 2 with proper upstream timeouts is the right choice. If HTTP clients timeout waiting for your ingest endpoint to accept data, they'll retry or alert their operators. That's better than silently dropping data.

## Wrapping Up

Building a high-throughput data pipeline in Rust requires understanding both the language's concurrency primitives and the fundamental tradeoffs in systems design. The channel-based architecture shown here scales well and handles failures gracefully, but the details matter. Batch sizes, buffer depths, and retry policies all need tuning for your specific workload.

Start with the simplest version that works, add comprehensive metrics and logging, then optimize the bottlenecks you actually observe. Premature optimization in pipeline design usually means building complexity you don't need.

The code examples here are intentionally minimal. Production systems need health checks, graceful shutdown coordination, configuration management, and observability integration. But the core patterns - bounded channels, batching, and backpressure - stay the same regardless of scale.
