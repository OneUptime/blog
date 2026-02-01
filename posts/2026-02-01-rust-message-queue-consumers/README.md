# How to Build Message Queue Consumers in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Message Queue, RabbitMQ, NATS, Consumer, Async

Description: A practical guide to building reliable message queue consumers in Rust with RabbitMQ and NATS.

---

Message queues are the backbone of distributed systems. They decouple services, handle traffic spikes, and ensure messages get processed even when downstream services are temporarily unavailable. Rust, with its memory safety guarantees and zero-cost abstractions, is an excellent choice for building high-performance queue consumers that won't crash at 3 AM.

In this guide, we'll build production-ready message queue consumers using two popular message brokers: RabbitMQ and NATS. You'll learn consumer patterns, proper acknowledgment handling, error recovery, and graceful shutdown - the stuff that separates toy code from production systems.

## Setting Up Your Project

First, let's create a new Rust project and add the dependencies we need.

```bash
cargo new queue-consumer
cd queue-consumer
```

Add these dependencies to your `Cargo.toml`:

```toml
[dependencies]
# RabbitMQ client
lapin = "2.3"

# NATS client
async-nats = "0.33"

# Async runtime
tokio = { version = "1.35", features = ["full"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

# Error handling
anyhow = "1.0"
thiserror = "1.0"
```

## Building a RabbitMQ Consumer with Lapin

Lapin is the most mature RabbitMQ client for Rust. It's fully async and supports all AMQP 0.9.1 features. Let's build a consumer that processes order events.

### Establishing the Connection

The connection setup might look verbose, but each piece serves a purpose. We configure heartbeats to detect dead connections and set up proper error handling from the start.

```rust
use lapin::{
    options::*, types::FieldTable, BasicProperties, Channel, Connection,
    ConnectionProperties, Consumer,
};
use tokio::sync::mpsc;
use tracing::{error, info, warn};

// Connection configuration with sensible defaults for production
async fn create_rabbitmq_connection(uri: &str) -> anyhow::Result<Connection> {
    // ConnectionProperties configures the client behavior
    // We use tokio's executor and reactor for async operations
    let options = ConnectionProperties::default()
        .with_executor(tokio_executor_trait::Tokio::current())
        .with_reactor(tokio_reactor_trait::Tokio);

    let connection = Connection::connect(uri, options).await?;
    
    info!("Connected to RabbitMQ");
    Ok(connection)
}

// Declare the queue if it doesn't exist
// This is idempotent - safe to call multiple times
async fn setup_queue(channel: &Channel, queue_name: &str) -> anyhow::Result<()> {
    channel
        .queue_declare(
            queue_name,
            QueueDeclareOptions {
                // Durable queues survive broker restarts
                durable: true,
                // Exclusive queues are deleted when the connection closes
                exclusive: false,
                // Auto-delete removes the queue when the last consumer disconnects
                auto_delete: false,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await?;

    // Prefetch limits how many unacknowledged messages the broker sends
    // Setting this too high can overwhelm your consumer
    // Setting it too low reduces throughput
    channel.basic_qos(10, BasicQosOptions::default()).await?;

    Ok(())
}
```

### The Consumer Loop

Here's where the real work happens. We consume messages, process them, and handle acknowledgments properly.

```rust
use serde::Deserialize;

// Define the message structure we expect
#[derive(Debug, Deserialize)]
struct OrderEvent {
    order_id: String,
    customer_id: String,
    total_amount: f64,
    items: Vec<String>,
}

// Process a single order - this is your business logic
async fn process_order(order: &OrderEvent) -> anyhow::Result<()> {
    info!(order_id = %order.order_id, "Processing order");
    
    // Simulate some work - replace with actual processing
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    
    // Your actual business logic goes here:
    // - Validate the order
    // - Update inventory
    // - Send confirmation email
    // - etc.
    
    Ok(())
}

// The main consumer loop
async fn consume_messages(
    channel: Channel,
    queue_name: &str,
    mut shutdown_rx: mpsc::Receiver<()>,
) -> anyhow::Result<()> {
    // Create a consumer with a unique tag
    // The tag helps identify this consumer in RabbitMQ management
    let mut consumer = channel
        .basic_consume(
            queue_name,
            "order-processor-1",
            BasicConsumeOptions {
                // Manual ack means we control when messages are acknowledged
                // This is critical for reliability
                no_ack: false,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await?;

    info!(queue = queue_name, "Started consuming messages");

    loop {
        tokio::select! {
            // Check for shutdown signal first
            _ = shutdown_rx.recv() => {
                info!("Shutdown signal received, stopping consumer");
                break;
            }
            
            // Process the next message
            delivery = consumer.next() => {
                match delivery {
                    Some(Ok(delivery)) => {
                        let delivery_tag = delivery.delivery_tag;
                        
                        // Try to deserialize the message
                        match serde_json::from_slice::<OrderEvent>(&delivery.data) {
                            Ok(order) => {
                                // Process and acknowledge on success
                                match process_order(&order).await {
                                    Ok(()) => {
                                        // Ack tells RabbitMQ we're done with this message
                                        channel
                                            .basic_ack(delivery_tag, BasicAckOptions::default())
                                            .await?;
                                    }
                                    Err(e) => {
                                        // Processing failed - decide what to do
                                        error!(error = %e, "Failed to process order");
                                        handle_processing_error(&channel, delivery_tag, &e).await?;
                                    }
                                }
                            }
                            Err(e) => {
                                // Malformed message - reject it permanently
                                error!(error = %e, "Failed to deserialize message");
                                channel
                                    .basic_reject(
                                        delivery_tag,
                                        BasicRejectOptions { requeue: false },
                                    )
                                    .await?;
                            }
                        }
                    }
                    Some(Err(e)) => {
                        error!(error = %e, "Consumer error");
                        break;
                    }
                    None => {
                        warn!("Consumer stream ended");
                        break;
                    }
                }
            }
        }
    }

    Ok(())
}
```

### Error Handling and Retry Logic

Not all errors are equal. Some are transient (network blip, database timeout) and should be retried. Others are permanent (invalid data, business rule violation) and should go to a dead letter queue.

```rust
use thiserror::Error;

// Define error types so we can handle them differently
#[derive(Error, Debug)]
enum ProcessingError {
    #[error("Temporary error, should retry: {0}")]
    Transient(String),
    
    #[error("Permanent error, should not retry: {0}")]
    Permanent(String),
}

// Decide what to do based on the error type
async fn handle_processing_error(
    channel: &Channel,
    delivery_tag: u64,
    error: &anyhow::Error,
) -> anyhow::Result<()> {
    // Check if this is a transient error that might succeed on retry
    if let Some(ProcessingError::Transient(_)) = error.downcast_ref::<ProcessingError>() {
        // Negative ack with requeue puts the message back in the queue
        // Be careful - this can cause infinite loops if the error persists
        channel
            .basic_nack(
                delivery_tag,
                BasicNackOptions {
                    requeue: true,
                    ..Default::default()
                },
            )
            .await?;
        warn!("Message requeued for retry");
    } else {
        // Permanent error - reject without requeue
        // If you have a dead letter exchange configured, it goes there
        channel
            .basic_reject(delivery_tag, BasicRejectOptions { requeue: false })
            .await?;
        error!("Message rejected permanently");
    }

    Ok(())
}
```

## Building a NATS Consumer with async-nats

NATS is lighter weight than RabbitMQ and uses a different model. It's publish-subscribe by default, with JetStream providing persistence and exactly-once delivery when you need it.

### Connecting to NATS JetStream

JetStream is NATS's persistence layer. Without it, messages are fire-and-forget. With it, you get durable consumers, message replay, and acknowledgment semantics.

```rust
use async_nats::jetstream::{self, consumer::PullConsumer, stream::Stream};

// Connect to NATS and get a JetStream context
async fn create_nats_connection(url: &str) -> anyhow::Result<jetstream::Context> {
    let client = async_nats::connect(url).await?;
    let jetstream = jetstream::new(client);
    
    info!("Connected to NATS JetStream");
    Ok(jetstream)
}

// Create or get the stream and consumer
// Streams are like topics - they hold messages
// Consumers are views into streams with their own position tracking
async fn setup_jetstream(
    js: &jetstream::Context,
    stream_name: &str,
    consumer_name: &str,
) -> anyhow::Result<PullConsumer> {
    // Create stream if it doesn't exist
    let stream = js
        .get_or_create_stream(jetstream::stream::Config {
            name: stream_name.to_string(),
            subjects: vec![format!("{}.*", stream_name)],
            // How long to keep messages
            max_age: std::time::Duration::from_secs(24 * 60 * 60),
            // How many messages to keep
            max_messages: 1_000_000,
            ..Default::default()
        })
        .await?;

    // Create a durable pull consumer
    // Pull consumers request messages explicitly - you control the pace
    let consumer = stream
        .get_or_create_consumer(
            consumer_name,
            jetstream::consumer::pull::Config {
                durable_name: Some(consumer_name.to_string()),
                // Ack policy determines when messages are considered delivered
                ack_policy: jetstream::consumer::AckPolicy::Explicit,
                // How long before unacked messages are redelivered
                ack_wait: std::time::Duration::from_secs(30),
                // Max times to redeliver before giving up
                max_deliver: 3,
                ..Default::default()
            },
        )
        .await?;

    Ok(consumer)
}
```

### The NATS Consumer Loop

NATS has a cleaner API for pulling batches of messages. This pattern is efficient for high-throughput scenarios.

```rust
use async_nats::jetstream::consumer::pull::BatchOptions;
use futures::StreamExt;

async fn consume_nats_messages(
    consumer: PullConsumer,
    mut shutdown_rx: mpsc::Receiver<()>,
) -> anyhow::Result<()> {
    info!("Starting NATS consumer");

    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => {
                info!("Shutdown signal received");
                break;
            }
            
            // Fetch a batch of messages
            // This is more efficient than fetching one at a time
            result = consumer.fetch().max_messages(10).messages() => {
                match result {
                    Ok(mut messages) => {
                        while let Some(msg_result) = messages.next().await {
                            match msg_result {
                                Ok(msg) => {
                                    // Get the subject for routing/logging
                                    let subject = msg.subject.to_string();
                                    
                                    match serde_json::from_slice::<OrderEvent>(&msg.payload) {
                                        Ok(order) => {
                                            match process_order(&order).await {
                                                Ok(()) => {
                                                    // Acknowledge successful processing
                                                    if let Err(e) = msg.ack().await {
                                                        error!(error = %e, "Failed to ack message");
                                                    }
                                                }
                                                Err(e) => {
                                                    error!(error = %e, subject = %subject, "Processing failed");
                                                    // NATS will redeliver after ack_wait timeout
                                                    // Or we can explicitly nak for immediate redelivery
                                                    if let Err(e) = msg.ack_with(async_nats::jetstream::AckKind::Nak(None)).await {
                                                        error!(error = %e, "Failed to nak message");
                                                    }
                                                }
                                            }
                                        }
                                        Err(e) => {
                                            error!(error = %e, "Deserialization failed");
                                            // Term tells NATS to stop redelivering
                                            let _ = msg.ack_with(async_nats::jetstream::AckKind::Term).await;
                                        }
                                    }
                                }
                                Err(e) => {
                                    error!(error = %e, "Failed to receive message");
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!(error = %e, "Failed to fetch messages");
                        // Back off before retrying
                        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                    }
                }
            }
        }
    }

    Ok(())
}
```

## Implementing Graceful Shutdown

A graceful shutdown is critical. You want to finish processing in-flight messages before exiting, not drop them halfway through.

```rust
use tokio::signal;

// Main entry point that ties everything together
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Create a channel for shutdown coordination
    let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>(1);

    // Spawn the consumer task
    let consumer_handle = tokio::spawn(async move {
        // Your consumer setup and loop goes here
        // Pass shutdown_rx to the consumer
    });

    // Wait for shutdown signal (Ctrl+C or SIGTERM)
    tokio::select! {
        _ = signal::ctrl_c() => {
            info!("Received Ctrl+C, initiating shutdown");
        }
        _ = async {
            // Also listen for SIGTERM on Unix systems
            #[cfg(unix)]
            {
                let mut sigterm = signal::unix::signal(signal::unix::SignalKind::terminate())
                    .expect("Failed to register SIGTERM handler");
                sigterm.recv().await;
            }
            #[cfg(not(unix))]
            {
                std::future::pending::<()>().await;
            }
        } => {
            info!("Received SIGTERM, initiating shutdown");
        }
    }

    // Signal the consumer to stop
    let _ = shutdown_tx.send(()).await;

    // Wait for the consumer to finish with a timeout
    // This gives in-flight messages time to complete
    match tokio::time::timeout(
        tokio::time::Duration::from_secs(30),
        consumer_handle,
    ).await {
        Ok(Ok(())) => info!("Consumer shut down cleanly"),
        Ok(Err(e)) => error!(error = %e, "Consumer task failed"),
        Err(_) => warn!("Shutdown timed out, forcing exit"),
    }

    Ok(())
}
```

## Retry Strategies with Exponential Backoff

When processing fails due to transient errors, you need a retry strategy. Exponential backoff prevents overwhelming downstream services during outages.

```rust
use std::time::Duration;

// Configuration for retry behavior
struct RetryConfig {
    max_attempts: u32,
    initial_delay: Duration,
    max_delay: Duration,
    multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 5,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            multiplier: 2.0,
        }
    }
}

// Generic retry wrapper for any async operation
async fn with_retry<F, Fut, T, E>(
    config: &RetryConfig,
    operation: F,
) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, E>>,
    E: std::fmt::Display,
{
    let mut attempt = 0;
    let mut delay = config.initial_delay;

    loop {
        attempt += 1;
        
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                if attempt >= config.max_attempts {
                    error!(
                        attempt = attempt,
                        max_attempts = config.max_attempts,
                        error = %e,
                        "Max retry attempts exceeded"
                    );
                    return Err(e);
                }

                warn!(
                    attempt = attempt,
                    delay_ms = delay.as_millis(),
                    error = %e,
                    "Operation failed, retrying"
                );

                tokio::time::sleep(delay).await;

                // Calculate next delay with exponential backoff
                delay = Duration::from_secs_f64(
                    (delay.as_secs_f64() * config.multiplier).min(config.max_delay.as_secs_f64())
                );
            }
        }
    }
}
```

## Observability and Monitoring

You can't fix what you can't see. Add metrics and structured logging from the start.

```rust
use std::sync::atomic::{AtomicU64, Ordering};

// Simple counters for tracking consumer health
struct ConsumerMetrics {
    messages_processed: AtomicU64,
    messages_failed: AtomicU64,
    messages_retried: AtomicU64,
}

impl ConsumerMetrics {
    fn new() -> Self {
        Self {
            messages_processed: AtomicU64::new(0),
            messages_failed: AtomicU64::new(0),
            messages_retried: AtomicU64::new(0),
        }
    }

    fn record_success(&self) {
        self.messages_processed.fetch_add(1, Ordering::Relaxed);
    }

    fn record_failure(&self) {
        self.messages_failed.fetch_add(1, Ordering::Relaxed);
    }

    fn record_retry(&self) {
        self.messages_retried.fetch_add(1, Ordering::Relaxed);
    }

    // Export metrics in a format your monitoring system understands
    fn snapshot(&self) -> MetricsSnapshot {
        MetricsSnapshot {
            processed: self.messages_processed.load(Ordering::Relaxed),
            failed: self.messages_failed.load(Ordering::Relaxed),
            retried: self.messages_retried.load(Ordering::Relaxed),
        }
    }
}

#[derive(Debug)]
struct MetricsSnapshot {
    processed: u64,
    failed: u64,
    retried: u64,
}
```

## Production Checklist

Before deploying your consumer to production, verify these items:

1. **Connection recovery** - Test what happens when the broker restarts. Your consumer should reconnect automatically.

2. **Idempotency** - Messages can be delivered more than once. Make sure processing the same message twice doesn't cause problems.

3. **Dead letter handling** - Messages that repeatedly fail need somewhere to go. Configure dead letter queues and alert on them.

4. **Resource limits** - Set appropriate prefetch counts and batch sizes. Too high overwhelms your consumer, too low wastes throughput.

5. **Health checks** - Expose an endpoint that Kubernetes can probe. A consumer that can't connect to the broker should fail health checks.

6. **Graceful shutdown** - Your consumer should handle SIGTERM and finish in-flight work before exiting.

7. **Logging** - Use structured logging with correlation IDs. You'll thank yourself when debugging production issues.

## Wrapping Up

Building reliable message queue consumers in Rust isn't complicated, but it requires attention to detail. The compiler helps catch many bugs, but it won't save you from dropping messages or creating infinite retry loops.

Start with the basics - connect, consume, acknowledge. Then add error handling, retries, and graceful shutdown. Finally, add observability so you know when things go wrong.

RabbitMQ with lapin is the safe choice when you need advanced routing and persistent queues. NATS with async-nats is lighter and faster when you want simplicity and can tolerate some message loss - or when you add JetStream for durability.

Whatever you choose, Rust's type system and async runtime make it an excellent platform for building consumers that just work.

---

*Monitor your message consumers with [OneUptime](https://oneuptime.com) - track queue depths and processing rates.*
