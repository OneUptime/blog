# How to Use Redis Streams in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, Stream, Messaging, Consumer Group

Description: Learn how to use Redis Streams in Rust with the redis crate to produce and consume durable event streams with consumer groups.

---

Redis Streams provide a durable, append-only log with consumer groups and message acknowledgement - ideal for event-driven pipelines. The Rust `redis` crate exposes streams through the `streams` module.

## Setup

```toml
[dependencies]
redis = { version = "0.25", features = ["streams", "tokio-comp"] }
tokio = { version = "1", features = ["full"] }
```

## Appending to a Stream

Use `XADD` to append messages:

```rust
use redis::Commands;
use redis::streams::StreamMaxlen;

fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_connection()?;

    // Auto-generated ID (*), with field-value pairs
    let id: String = con.xadd(
        "orders",
        "*",
        &[("order_id", "1001"), ("amount", "49.99"), ("user", "alice")],
    )?;
    println!("Added entry: {id}");

    // Capped stream - keep last 1000 entries
    con.xadd_maxlen(
        "orders",
        StreamMaxlen::Approx(1000),
        "*",
        &[("order_id", "1002"), ("amount", "19.99"), ("user", "bob")],
    )?;

    Ok(())
}
```

## Reading from a Stream

```rust
use redis::streams::{StreamReadOptions, StreamReadReply};

fn read_from_stream(con: &mut redis::Connection) -> redis::RedisResult<()> {
    let opts = StreamReadOptions::default().count(10);
    let reply: StreamReadReply = con.xread_options(&["orders"], &["0"], &opts)?;

    for key in &reply.keys {
        for entry in &key.ids {
            println!("ID: {}", entry.id);
            for (field, value) in &entry.map {
                println!("  {field}: {value:?}");
            }
        }
    }
    Ok(())
}
```

## Consumer Groups

Consumer groups allow multiple workers to share the load:

```rust
// Create group (start from beginning with "0", or "$" for new messages only)
con.xgroup_create_mkstream("orders", "processors", "0")?;

// Read as a consumer in the group
let opts = StreamReadOptions::default()
    .group("processors", "worker-1")
    .count(5);

let reply: StreamReadReply = con.xread_options(&["orders"], &[">"], &opts)?;

for key in &reply.keys {
    for entry in &key.ids {
        println!("Processing: {}", entry.id);
        // ... process the entry ...

        // Acknowledge after processing
        let _: () = con.xack("orders", "processors", &[entry.id.as_str()])?;
    }
}
```

## Pending Messages

Check for unacknowledged messages (e.g., after a crash):

```rust
use redis::streams::StreamPendingReply;

let pending: StreamPendingReply = con.xpending("orders", "processors")?;
match pending {
    StreamPendingReply::Data(data) => {
        println!(
            "Pending: {} messages between {} and {}",
            data.count, data.start_id, data.end_id
        );
    }
    StreamPendingReply::Empty => {
        println!("No pending messages");
    }
}
```

## Async Reading Loop

```rust
#[tokio::main]
async fn main() -> redis::RedisResult<()> {
    use redis::AsyncCommands;
    use redis::streams::{StreamReadOptions, StreamReadReply};

    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_multiplexed_async_connection().await?;

    loop {
        let opts = StreamReadOptions::default()
            .group("processors", "worker-async")
            .count(10)
            .block(2000); // block 2s waiting for new messages

        let reply: StreamReadReply = con
            .xread_options(&["orders"], &[">"], &opts)
            .await?;

        for key in &reply.keys {
            for entry in &key.ids {
                println!("Async processing: {}", entry.id);
                let _: () = con.xack("orders", "processors", &[entry.id.as_str()]).await?;
            }
        }
    }
}
```

## Summary

Redis Streams in Rust enable durable event streaming with acknowledgement semantics. Use `xadd` to produce, `xread_options` with a consumer group to consume, and `xack` after processing. The async API with `block` creates an efficient long-polling consumer loop suitable for production workloads.
