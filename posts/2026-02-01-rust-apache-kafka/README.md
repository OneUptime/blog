# How to Use Rust with Apache Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Kafka, Message Queue, Streaming, rdkafka

Description: A practical guide to using Apache Kafka with Rust using the rdkafka crate for producing and consuming messages.

---

Apache Kafka has become the backbone of event-driven architectures. When you combine it with Rust's performance and safety guarantees, you get a combination that handles millions of messages without breaking a sweat. This guide walks through building production-ready Kafka producers and consumers in Rust using the rdkafka crate.

## Why Rust for Kafka?

Before diving into code, let's address the obvious question. Kafka clients exist for Java, Python, Go, and pretty much every language out there. Why pick Rust?

The answer comes down to resource efficiency. Kafka consumers often run as long-lived processes handling continuous message streams. Rust's zero-cost abstractions and lack of garbage collection mean your consumers maintain consistent latency without GC pauses. For high-throughput systems processing millions of events per second, this matters.

The rdkafka crate wraps librdkafka, the same C library that powers Kafka clients in many other languages. You get battle-tested Kafka protocol handling with Rust's memory safety on top.

## Setting Up rdkafka

Start by adding rdkafka to your Cargo.toml. The crate supports multiple runtime configurations depending on whether you want to use Tokio or other async runtimes.

```toml
[dependencies]
rdkafka = { version = "0.36", features = ["cmake-build", "tokio"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

The `cmake-build` feature compiles librdkafka from source, which gives you the latest version. If you prefer using system libraries, replace it with `dynamic-linking`.

On macOS, you might need to install librdkafka first:

```bash
brew install librdkafka
```

On Ubuntu or Debian:

```bash
apt-get install librdkafka-dev
```

## Creating a Simple Producer

Let's start with a basic producer that sends string messages to a topic.

The following code creates a producer with minimal configuration. We specify the bootstrap servers and let rdkafka handle the rest with sensible defaults.

```rust
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::time::Duration;

async fn create_producer() -> FutureProducer {
    // Build a producer with bootstrap servers
    // The FutureProducer provides async send operations
    ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .set("message.timeout.ms", "5000")
        .create()
        .expect("Failed to create producer")
}

async fn send_message(producer: &FutureProducer, topic: &str, key: &str, payload: &str) {
    // Create a record with topic, key, and payload
    // The key determines which partition receives the message
    let record = FutureRecord::to(topic)
        .key(key)
        .payload(payload);

    // Send and await delivery confirmation
    // The timeout specifies how long to wait for the queue
    match producer.send(record, Duration::from_secs(5)).await {
        Ok((partition, offset)) => {
            println!("Message delivered to partition {} at offset {}", partition, offset);
        }
        Err((err, _)) => {
            eprintln!("Failed to deliver message: {}", err);
        }
    }
}
```

## Producer Configuration for Production

The basic producer works, but production systems need more tuning. Here's a configuration that balances throughput with reliability.

This configuration enables idempotent delivery and sets up batching for better throughput. The linger.ms setting tells the producer to wait briefly before sending, allowing messages to batch together.

```rust
use rdkafka::config::ClientConfig;
use rdkafka::producer::FutureProducer;

fn create_production_producer() -> FutureProducer {
    ClientConfig::new()
        // Kafka broker addresses - use multiple for redundancy
        .set("bootstrap.servers", "kafka1:9092,kafka2:9092,kafka3:9092")
        
        // Enable idempotent producer to prevent duplicates
        // This ensures exactly-once delivery semantics
        .set("enable.idempotence", "true")
        
        // Wait for all in-sync replicas to acknowledge
        // Options: 0 (no wait), 1 (leader only), all (all replicas)
        .set("acks", "all")
        
        // Retry configuration for transient failures
        .set("retries", "3")
        .set("retry.backoff.ms", "100")
        
        // Batching settings for throughput
        // linger.ms adds delay to allow batch accumulation
        .set("linger.ms", "5")
        .set("batch.size", "16384")
        
        // Compression reduces network bandwidth
        // Options: none, gzip, snappy, lz4, zstd
        .set("compression.type", "snappy")
        
        // Timeout for message delivery
        .set("delivery.timeout.ms", "30000")
        
        .create()
        .expect("Failed to create producer")
}
```

## Building a Consumer

Consumers in Kafka work through consumer groups. Multiple consumers in the same group split the partitions among themselves, enabling horizontal scaling.

This consumer subscribes to a topic and processes messages in a loop. The group.id determines which consumer group this instance joins.

```rust
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::Message;
use futures::StreamExt;

async fn run_consumer() {
    // Create a streaming consumer that yields messages as a stream
    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .set("group.id", "my-consumer-group")
        // Start from earliest message if no offset exists
        .set("auto.offset.reset", "earliest")
        // Enable automatic offset commits
        .set("enable.auto.commit", "true")
        .set("auto.commit.interval.ms", "5000")
        .create()
        .expect("Failed to create consumer");

    // Subscribe to one or more topics
    consumer
        .subscribe(&["my-topic"])
        .expect("Failed to subscribe");

    // Process messages as they arrive
    let mut stream = consumer.stream();
    while let Some(result) = stream.next().await {
        match result {
            Ok(message) => {
                // Extract the payload as bytes and convert to string
                let payload = message.payload()
                    .map(|bytes| String::from_utf8_lossy(bytes).to_string())
                    .unwrap_or_default();
                
                let key = message.key()
                    .map(|bytes| String::from_utf8_lossy(bytes).to_string())
                    .unwrap_or_default();

                println!(
                    "Received message - Topic: {}, Partition: {}, Offset: {}, Key: {}, Payload: {}",
                    message.topic(),
                    message.partition(),
                    message.offset(),
                    key,
                    payload
                );
            }
            Err(err) => {
                eprintln!("Error receiving message: {}", err);
            }
        }
    }
}
```

## Manual Offset Management

Automatic offset commits work for simple cases, but you often need manual control. This is essential when you must guarantee that a message was fully processed before committing.

The following example processes messages and commits offsets only after successful processing. This prevents message loss if your application crashes mid-processing.

```rust
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, CommitMode, StreamConsumer};
use rdkafka::Message;
use futures::StreamExt;

async fn run_consumer_manual_commit() {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .set("group.id", "manual-commit-group")
        .set("auto.offset.reset", "earliest")
        // Disable auto commit for manual control
        .set("enable.auto.commit", "false")
        .create()
        .expect("Failed to create consumer");

    consumer.subscribe(&["my-topic"]).expect("Failed to subscribe");

    let mut stream = consumer.stream();
    while let Some(result) = stream.next().await {
        match result {
            Ok(message) => {
                // Process the message first
                if let Err(e) = process_message(&message).await {
                    eprintln!("Processing failed: {}", e);
                    // Skip commit on failure - message will be redelivered
                    continue;
                }

                // Commit only after successful processing
                // CommitMode::Async doesn't block, Sync waits for confirmation
                if let Err(e) = consumer.commit_message(&message, CommitMode::Async) {
                    eprintln!("Failed to commit offset: {}", e);
                }
            }
            Err(err) => {
                eprintln!("Consumer error: {}", err);
            }
        }
    }
}

async fn process_message<M: Message>(message: &M) -> Result<(), Box<dyn std::error::Error>> {
    let payload = message.payload().ok_or("Empty payload")?;
    // Your processing logic here
    println!("Processing: {:?}", String::from_utf8_lossy(payload));
    Ok(())
}
```

## Message Serialization with Serde

Real applications rarely send plain strings. You'll want to serialize structs to JSON or another format. Here's how to handle typed messages.

This example defines a struct for events and serializes them to JSON before sending. On the consumer side, we deserialize back to the original type.

```rust
use serde::{Deserialize, Serialize};
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::Message;
use std::time::Duration;

// Define your message structure
#[derive(Debug, Serialize, Deserialize)]
struct UserEvent {
    user_id: String,
    event_type: String,
    timestamp: i64,
    metadata: std::collections::HashMap<String, String>,
}

async fn send_event(producer: &FutureProducer, topic: &str, event: &UserEvent) -> Result<(), Box<dyn std::error::Error>> {
    // Serialize the event to JSON bytes
    let payload = serde_json::to_vec(event)?;
    
    // Use user_id as the key for partition routing
    // This ensures all events for a user go to the same partition
    let record = FutureRecord::to(topic)
        .key(&event.user_id)
        .payload(&payload);

    producer.send(record, Duration::from_secs(5)).await
        .map_err(|(e, _)| e)?;
    
    Ok(())
}

async fn receive_event(consumer: &StreamConsumer) -> Result<UserEvent, Box<dyn std::error::Error>> {
    use futures::StreamExt;
    
    let mut stream = consumer.stream();
    
    // Get the next message from the stream
    let message = stream.next().await
        .ok_or("Stream ended")?
        .map_err(|e| format!("Kafka error: {}", e))?;
    
    // Deserialize from JSON
    let payload = message.payload().ok_or("Empty payload")?;
    let event: UserEvent = serde_json::from_slice(payload)?;
    
    Ok(event)
}
```

## Error Handling Strategies

Kafka applications face several error categories: connection failures, serialization errors, and processing failures. A robust application handles each differently.

This error handling approach categorizes errors and responds appropriately. Transient errors trigger retries, while permanent errors get logged and skipped.

```rust
use rdkafka::error::KafkaError;
use std::time::Duration;
use tokio::time::sleep;

#[derive(Debug)]
enum ProcessingError {
    Transient(String),    // Retry these
    Permanent(String),    // Log and skip
    Fatal(String),        // Shutdown required
}

async fn consume_with_error_handling(consumer: &StreamConsumer) {
    use futures::StreamExt;
    use rdkafka::consumer::Consumer;
    use rdkafka::Message;
    
    let mut stream = consumer.stream();
    let mut consecutive_errors = 0;
    const MAX_CONSECUTIVE_ERRORS: u32 = 10;

    while let Some(result) = stream.next().await {
        match result {
            Ok(message) => {
                consecutive_errors = 0;
                
                match process_with_retry(&message, 3).await {
                    Ok(_) => {
                        // Commit after successful processing
                        let _ = consumer.commit_message(&message, rdkafka::consumer::CommitMode::Async);
                    }
                    Err(ProcessingError::Permanent(e)) => {
                        // Log and move on - don't block the queue
                        eprintln!("Permanent error, skipping message: {}", e);
                        let _ = consumer.commit_message(&message, rdkafka::consumer::CommitMode::Async);
                    }
                    Err(ProcessingError::Fatal(e)) => {
                        eprintln!("Fatal error, shutting down: {}", e);
                        break;
                    }
                    Err(ProcessingError::Transient(_)) => {
                        // Transient errors handled in retry logic
                    }
                }
            }
            Err(KafkaError::PartitionEOF(_)) => {
                // End of partition - not an error, just no more messages
                continue;
            }
            Err(e) => {
                consecutive_errors += 1;
                eprintln!("Kafka error ({}): {}", consecutive_errors, e);
                
                if consecutive_errors >= MAX_CONSECUTIVE_ERRORS {
                    eprintln!("Too many consecutive errors, shutting down");
                    break;
                }
                
                // Back off before retrying
                sleep(Duration::from_millis(100 * consecutive_errors as u64)).await;
            }
        }
    }
}

async fn process_with_retry<M: rdkafka::Message>(message: &M, max_retries: u32) -> Result<(), ProcessingError> {
    let mut attempts = 0;
    
    loop {
        attempts += 1;
        
        match do_process(message).await {
            Ok(_) => return Ok(()),
            Err(ProcessingError::Transient(e)) if attempts < max_retries => {
                eprintln!("Transient error (attempt {}): {}", attempts, e);
                sleep(Duration::from_millis(100 * attempts as u64)).await;
            }
            Err(e) => return Err(e),
        }
    }
}

async fn do_process<M: rdkafka::Message>(_message: &M) -> Result<(), ProcessingError> {
    // Your actual processing logic
    Ok(())
}
```

## Async Producers with Batching

For high-throughput scenarios, you want to send messages without waiting for each one to complete. The FutureProducer lets you fire off messages and collect results later.

This pattern queues multiple messages and processes delivery reports asynchronously. It significantly improves throughput when you have bursts of messages.

```rust
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::time::Duration;
use futures::future::join_all;

async fn send_batch(
    producer: &FutureProducer,
    topic: &str,
    messages: Vec<(String, String)>, // (key, payload) pairs
) -> Vec<Result<(i32, i64), String>> {
    // Create futures for all messages without awaiting
    let futures: Vec<_> = messages
        .iter()
        .map(|(key, payload)| {
            let record = FutureRecord::to(topic)
                .key(key.as_str())
                .payload(payload.as_str());
            
            // This returns a future, doesn't send yet
            producer.send(record, Duration::from_secs(5))
        })
        .collect();

    // Wait for all deliveries concurrently
    let results = join_all(futures).await;
    
    // Convert results to a friendlier format
    results
        .into_iter()
        .map(|r| match r {
            Ok((partition, offset)) => Ok((partition, offset)),
            Err((e, _)) => Err(e.to_string()),
        })
        .collect()
}

async fn example_batch_send(producer: &FutureProducer) {
    let messages = vec![
        ("user-1".to_string(), r#"{"action": "login"}"#.to_string()),
        ("user-2".to_string(), r#"{"action": "purchase"}"#.to_string()),
        ("user-1".to_string(), r#"{"action": "logout"}"#.to_string()),
    ];

    let results = send_batch(producer, "user-events", messages).await;
    
    for (i, result) in results.iter().enumerate() {
        match result {
            Ok((partition, offset)) => {
                println!("Message {} delivered to {}:{}", i, partition, offset);
            }
            Err(e) => {
                eprintln!("Message {} failed: {}", i, e);
            }
        }
    }
}
```

## Delivery Guarantees

Kafka offers three delivery semantics, and your configuration determines which one you get.

**At-most-once**: Messages might be lost but never duplicated. Achieved by committing offsets before processing and setting acks=0 on producers.

**At-least-once**: Messages are never lost but might be duplicated. This is the default when you commit after processing. Your consumers must handle duplicates.

**Exactly-once**: Messages are delivered exactly once. Requires idempotent producers, transactional APIs, and careful consumer configuration.

For most applications, at-least-once with idempotent processing is the practical choice. Here's how to make your processing idempotent:

```rust
use std::collections::HashSet;
use std::sync::Mutex;
use rdkafka::Message;

// Simple deduplication using message IDs
// In production, use a distributed cache like Redis
struct Deduplicator {
    seen: Mutex<HashSet<String>>,
}

impl Deduplicator {
    fn new() -> Self {
        Self {
            seen: Mutex::new(HashSet::new()),
        }
    }

    fn is_duplicate(&self, message_id: &str) -> bool {
        let mut seen = self.seen.lock().unwrap();
        !seen.insert(message_id.to_string())
    }
}

async fn process_idempotently<M: Message>(
    message: &M,
    deduplicator: &Deduplicator,
) -> Result<(), String> {
    // Create a unique ID from topic, partition, and offset
    let message_id = format!(
        "{}-{}-{}",
        message.topic(),
        message.partition(),
        message.offset()
    );

    if deduplicator.is_duplicate(&message_id) {
        println!("Skipping duplicate message: {}", message_id);
        return Ok(());
    }

    // Process the message
    let payload = message.payload()
        .map(|b| String::from_utf8_lossy(b).to_string())
        .unwrap_or_default();
    
    println!("Processing message {}: {}", message_id, payload);
    
    Ok(())
}
```

## Graceful Shutdown

Long-running consumers need clean shutdown handling. This ensures in-flight messages complete and offsets commit properly.

```rust
use rdkafka::consumer::{Consumer, StreamConsumer};
use tokio::signal;
use tokio::sync::broadcast;

async fn run_with_shutdown(consumer: StreamConsumer) {
    // Create a shutdown channel
    let (shutdown_tx, mut shutdown_rx) = broadcast::channel::<()>(1);
    
    // Spawn shutdown signal handler
    let shutdown_tx_clone = shutdown_tx.clone();
    tokio::spawn(async move {
        signal::ctrl_c().await.expect("Failed to listen for ctrl+c");
        println!("Shutdown signal received");
        let _ = shutdown_tx_clone.send(());
    });

    use futures::StreamExt;
    let mut stream = consumer.stream();

    loop {
        tokio::select! {
            // Check for shutdown signal
            _ = shutdown_rx.recv() => {
                println!("Initiating graceful shutdown...");
                break;
            }
            // Process messages
            Some(result) = stream.next() => {
                if let Ok(message) = result {
                    // Process message
                    println!("Processing: {:?}", message.offset());
                }
            }
        }
    }

    // Commit any pending offsets before exit
    if let Err(e) = consumer.commit_consumer_state(rdkafka::consumer::CommitMode::Sync) {
        eprintln!("Failed to commit final offsets: {}", e);
    }
    
    println!("Shutdown complete");
}
```

## Putting It Together

Here's a complete example combining everything into a working application:

```rust
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{Consumer, StreamConsumer};
use rdkafka::producer::FutureProducer;

#[tokio::main]
async fn main() {
    // Create producer
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .set("enable.idempotence", "true")
        .set("acks", "all")
        .create()
        .expect("Failed to create producer");

    // Create consumer
    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", "localhost:9092")
        .set("group.id", "rust-kafka-example")
        .set("auto.offset.reset", "earliest")
        .set("enable.auto.commit", "false")
        .create()
        .expect("Failed to create consumer");

    consumer.subscribe(&["test-topic"]).expect("Failed to subscribe");

    println!("Kafka client ready");
    
    // Your application logic here
}
```

## Wrapping Up

Rust and Kafka make a solid combination for building reliable message-driven systems. The rdkafka crate gives you full access to Kafka's capabilities while Rust ensures your consumers run efficiently without unexpected pauses.

Start with the basic producer and consumer patterns, then layer in the production configurations as your needs grow. Pay attention to offset management - it's the most common source of message loss or duplication in Kafka applications.

The code examples here should get you from zero to a working Kafka application. From there, you can explore more advanced features like transactions, custom partitioners, and schema registries.

---

*Monitor Kafka consumers with [OneUptime](https://oneuptime.com) - track lag, throughput, and processing errors.*
