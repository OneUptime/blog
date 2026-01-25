# How to Process Infinite Data Streams with Tokio Async Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Tokio, Async Streams, Data Processing, Real-time

Description: Learn how to build robust stream processing pipelines in Rust using Tokio async streams, covering backpressure handling, buffering strategies, and real-world patterns for processing unbounded data.

---

Processing data that never stops arriving is one of the trickiest problems in systems programming. Whether you're handling WebSocket connections, consuming from message queues, or tailing log files, you need a way to process items as they arrive without running out of memory or blocking your entire application.

Tokio's async streams provide exactly this capability. They let you work with sequences of values that arrive over time, processing each item as it becomes available while keeping your application responsive.

## Understanding Async Streams

A stream in Rust is similar to an iterator, but instead of blocking to get the next item, it yields control back to the runtime until data is ready. This makes streams perfect for I/O-bound workloads where you spend most of your time waiting.

The `Stream` trait from the `futures` crate defines this interface:

```rust
// The core Stream trait - similar to Iterator but async
pub trait Stream {
    type Item;

    // Returns Poll::Ready(Some(item)) when data is available
    // Returns Poll::Ready(None) when the stream ends
    // Returns Poll::Pending when no data is ready yet
    fn poll_next(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>>;
}
```

You rarely work with `poll_next` directly. Instead, you use combinators from `StreamExt` that provide a high-level interface.

## Setting Up Your Project

Add these dependencies to your `Cargo.toml`:

```toml
[dependencies]
tokio = { version = "1.35", features = ["full"] }
tokio-stream = "0.1"
futures = "0.3"
async-stream = "0.3"
```

## Creating Streams

### From Existing Collections

The simplest way to create a stream is from data you already have:

```rust
use tokio_stream::{self as stream, StreamExt};

#[tokio::main]
async fn main() {
    // Create a stream from a vector
    let items = vec![1, 2, 3, 4, 5];
    let mut stream = stream::iter(items);

    // Process each item as it becomes available
    while let Some(item) = stream.next().await {
        println!("Got: {}", item);
    }
}
```

### Using async-stream for Custom Streams

For streams that generate values dynamically, the `async-stream` crate provides a clean macro-based syntax:

```rust
use async_stream::stream;
use tokio_stream::StreamExt;
use std::time::Duration;

// Creates an infinite stream of timestamps
fn timestamp_stream() -> impl tokio_stream::Stream<Item = u64> {
    stream! {
        let mut counter = 0u64;
        loop {
            // Simulate receiving events at irregular intervals
            tokio::time::sleep(Duration::from_millis(100)).await;
            counter += 1;
            yield counter;  // Emit the next value
        }
    }
}

#[tokio::main]
async fn main() {
    let mut timestamps = timestamp_stream();

    // Take only the first 10 items from the infinite stream
    let mut timestamps = timestamps.take(10);

    while let Some(ts) = timestamps.next().await {
        println!("Timestamp: {}", ts);
    }
}
```

### From Channels

Channels naturally map to streams. This pattern is useful when you have multiple producers sending data to a single consumer:

```rust
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

#[tokio::main]
async fn main() {
    // Create a bounded channel - producers will wait if buffer is full
    let (tx, rx) = mpsc::channel::<String>(100);

    // Convert the receiver into a stream
    let mut stream = ReceiverStream::new(rx);

    // Spawn a producer task
    tokio::spawn(async move {
        for i in 0..1000 {
            // Send will wait if channel is full (backpressure)
            tx.send(format!("Message {}", i)).await.unwrap();
        }
        // tx is dropped here, which closes the channel
    });

    // Consume the stream
    while let Some(msg) = stream.next().await {
        println!("Received: {}", msg);
    }

    println!("Stream ended - producer finished");
}
```

## Stream Combinators

The real power of streams comes from combining them. These combinators let you build complex processing pipelines from simple building blocks.

### Transforming Items with map

```rust
use tokio_stream::{self as stream, StreamExt};

#[tokio::main]
async fn main() {
    let numbers = stream::iter(vec![1, 2, 3, 4, 5]);

    // Transform each item - squared values
    let mut squared = numbers.map(|n| n * n);

    while let Some(n) = squared.next().await {
        println!("Squared: {}", n);
    }
}
```

### Filtering Items

```rust
use tokio_stream::{self as stream, StreamExt};

#[tokio::main]
async fn main() {
    let numbers = stream::iter(1..=100);

    // Only keep even numbers
    let mut evens = numbers.filter(|n| n % 2 == 0);

    while let Some(n) = evens.next().await {
        println!("Even: {}", n);
    }
}
```

### Async Operations with then

When you need to perform async work for each item, use `then`:

```rust
use tokio_stream::{self as stream, StreamExt};
use std::time::Duration;

async fn process_item(item: i32) -> String {
    // Simulate async work like a database query or API call
    tokio::time::sleep(Duration::from_millis(10)).await;
    format!("Processed: {}", item)
}

#[tokio::main]
async fn main() {
    let items = stream::iter(vec![1, 2, 3, 4, 5]);

    // Process each item asynchronously, one at a time
    let mut processed = items.then(|item| process_item(item));

    while let Some(result) = processed.next().await {
        println!("{}", result);
    }
}
```

## Handling Backpressure

When data arrives faster than you can process it, you need a strategy. This is called backpressure handling.

### Bounded Buffering

The simplest approach is to buffer a fixed number of items:

```rust
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use std::time::Duration;

#[tokio::main]
async fn main() {
    // Buffer size of 10 - producer blocks when buffer is full
    let (tx, rx) = mpsc::channel::<i32>(10);

    // Fast producer
    let producer = tokio::spawn(async move {
        for i in 0..100 {
            println!("Producing: {}", i);
            // This will wait when buffer is full
            tx.send(i).await.unwrap();
        }
    });

    // Slow consumer
    let mut stream = ReceiverStream::new(rx);
    while let Some(item) = stream.next().await {
        println!("Consuming: {}", item);
        // Simulate slow processing
        tokio::time::sleep(Duration::from_millis(50)).await;
    }

    producer.await.unwrap();
}
```

### Dropping Old Items

Sometimes you only care about the most recent data. Use a channel with a policy to drop old items:

```rust
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;
use std::time::Duration;

#[tokio::main]
async fn main() {
    // Broadcast channel - drops oldest items when full
    let (tx, rx) = broadcast::channel::<i32>(16);

    let producer = tokio::spawn(async move {
        for i in 0..1000 {
            // send() never blocks - drops oldest if full
            let _ = tx.send(i);
            tokio::time::sleep(Duration::from_micros(100)).await;
        }
    });

    // Wrap broadcast receiver as a stream
    let mut stream = BroadcastStream::new(rx);

    // Process items, handling potential lag errors
    while let Some(result) = stream.next().await {
        match result {
            Ok(item) => {
                println!("Got: {}", item);
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
            Err(e) => {
                // Lagged error means we missed some messages
                println!("Lagged behind: {:?}", e);
            }
        }
    }

    producer.await.unwrap();
}
```

## Concurrent Stream Processing

Processing items one at a time is simple but slow. For I/O-bound work, you want concurrency.

### Buffered Concurrent Processing

`buffer_unordered` processes multiple items concurrently, emitting results as they complete:

```rust
use tokio_stream::{self as stream, StreamExt};
use std::time::Duration;

async fn fetch_data(id: i32) -> String {
    // Simulate variable latency API call
    let delay = (id % 5) as u64 * 20;
    tokio::time::sleep(Duration::from_millis(delay)).await;
    format!("Data for {}", id)
}

#[tokio::main]
async fn main() {
    let ids = stream::iter(0..20);

    // Process up to 5 items concurrently
    // Results arrive out of order as futures complete
    let mut results = ids
        .map(|id| fetch_data(id))
        .buffer_unordered(5);

    while let Some(data) = results.next().await {
        println!("{}", data);
    }
}
```

### Preserving Order

If you need results in the original order, use `buffered` instead:

```rust
use tokio_stream::{self as stream, StreamExt};
use std::time::Duration;

async fn fetch_data(id: i32) -> String {
    let delay = (id % 5) as u64 * 20;
    tokio::time::sleep(Duration::from_millis(delay)).await;
    format!("Data for {}", id)
}

#[tokio::main]
async fn main() {
    let ids = stream::iter(0..20);

    // Process up to 5 concurrently, but emit in original order
    // May hold completed results until earlier ones finish
    let mut results = ids
        .map(|id| fetch_data(id))
        .buffered(5);

    while let Some(data) = results.next().await {
        println!("{}", data);
    }
}
```

## Real-World Example: Log Aggregator

Here's a complete example that tails multiple log files concurrently and aggregates them into a single stream:

```rust
use async_stream::stream;
use futures::stream::SelectAll;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio_stream::{Stream, StreamExt};

// Creates a stream of lines from a file, following new writes
fn tail_file(path: String) -> impl Stream<Item = String> {
    stream! {
        let file = File::open(&path).await.expect("Failed to open file");
        let mut reader = BufReader::new(file);
        let mut line = String::new();

        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => {
                    // End of file - wait and try again (tail behavior)
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                }
                Ok(_) => {
                    // Emit the line with file path prefix
                    yield format!("[{}] {}", path, line.trim());
                }
                Err(e) => {
                    eprintln!("Error reading {}: {}", path, e);
                    break;
                }
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let log_files = vec![
        "/var/log/app1.log".to_string(),
        "/var/log/app2.log".to_string(),
        "/var/log/app3.log".to_string(),
    ];

    // Merge multiple file streams into one
    let mut combined = SelectAll::new();
    for path in log_files {
        combined.push(Box::pin(tail_file(path)));
    }

    // Process aggregated log lines
    while let Some(line) = combined.next().await {
        println!("{}", line);
        // Here you could: write to database, send to monitoring, etc.
    }
}
```

## Error Handling in Streams

Production streams need proper error handling. Use `Result` as your item type:

```rust
use async_stream::stream;
use tokio_stream::StreamExt;

#[derive(Debug)]
struct ProcessError(String);

fn fallible_stream() -> impl tokio_stream::Stream<Item = Result<i32, ProcessError>> {
    stream! {
        for i in 0..10 {
            if i == 5 {
                yield Err(ProcessError("Simulated error at 5".to_string()));
            } else {
                yield Ok(i);
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let mut stream = fallible_stream();

    while let Some(result) = stream.next().await {
        match result {
            Ok(value) => println!("Value: {}", value),
            Err(e) => {
                eprintln!("Error: {:?}", e);
                // Decide: continue, break, or retry
            }
        }
    }
}
```

## Performance Tips

1. **Choose the right buffer size**: Too small causes excessive context switches. Too large wastes memory. Start with 64-256 for most workloads.

2. **Use buffer_unordered for I/O**: When processing order does not matter and you are doing network or disk I/O, `buffer_unordered` gives you the best throughput.

3. **Avoid unnecessary allocations**: Reuse buffers when possible. The `bytes` crate provides `BytesMut` for efficient buffer management.

4. **Batch operations**: Instead of processing one item at a time, collect items into batches for bulk database inserts or API calls.

```rust
use tokio_stream::{self as stream, StreamExt};

#[tokio::main]
async fn main() {
    let items = stream::iter(0..100);

    // Collect items into chunks of 10
    let mut batches = items.chunks_timeout(10, tokio::time::Duration::from_secs(1));

    while let Some(batch) = batches.next().await {
        println!("Processing batch of {} items", batch.len());
        // Bulk insert, batch API call, etc.
    }
}
```

## Summary

Tokio async streams give you a powerful abstraction for processing data that arrives over time. The key patterns to remember:

- Use channels for producer-consumer patterns with natural backpressure
- Chain combinators like `map`, `filter`, and `then` to build processing pipelines
- Use `buffer_unordered` for concurrent I/O-bound processing
- Handle errors explicitly by using `Result` as your item type
- Choose appropriate buffer sizes based on your workload characteristics

Streams compose well with the rest of the Tokio ecosystem, making them ideal for building real-time data processing applications that stay responsive under load.
