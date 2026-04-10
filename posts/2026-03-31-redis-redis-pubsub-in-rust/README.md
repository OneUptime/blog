# How to Use Redis Pub/Sub in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, PubSub, Messaging, Real-Time

Description: Learn how to implement Redis Pub/Sub in Rust using the redis crate to build real-time messaging between publishers and subscribers.

---

Redis Pub/Sub lets you broadcast messages to multiple subscribers over named channels. Rust's `redis` crate provides both synchronous and async APIs for publishing and subscribing.

## Setup

```toml
[dependencies]
redis = { version = "0.25", features = ["tokio-comp"] }
tokio = { version = "1", features = ["full"] }
futures-util = "0.3"
```

## Subscribing to a Channel

The `subscribe()` method blocks the connection, so subscribers need a dedicated connection:

```rust
use redis::Commands;

fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_connection()?;
    let mut pubsub = con.as_pubsub();

    pubsub.subscribe("notifications")?;

    loop {
        let msg = pubsub.get_message()?;
        let payload: String = msg.get_payload()?;
        println!("Channel: {}, Message: {}", msg.get_channel_name(), payload);
    }
}
```

## Publishing Messages

Use a separate connection to publish:

```rust
fn publisher() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_connection()?;

    let receivers: i64 = redis::cmd("PUBLISH")
        .arg("notifications")
        .arg("User logged in")
        .query(&mut con)?;

    println!("Message delivered to {receivers} subscribers");
    Ok(())
}
```

## Pattern Subscriptions

Subscribe to multiple channels matching a glob pattern:

```rust
let mut pubsub = con.as_pubsub();
pubsub.psubscribe("events:*")?;

loop {
    let msg = pubsub.get_message()?;
    let payload: String = msg.get_payload()?;
    println!(
        "Pattern: {}, Channel: {}, Payload: {}",
        msg.get_pattern::<String>()?,
        msg.get_channel_name(),
        payload
    );
}
```

## Async Pub/Sub with Tokio

For non-blocking operation, use the async API:

```rust
use futures_util::StreamExt;

#[tokio::main]
async fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;

    // Subscriber task
    let sub_client = client.clone();
    let subscriber = tokio::spawn(async move {
        let con = sub_client.get_async_connection().await.unwrap();
        let mut pubsub = con.into_pubsub();
        pubsub.subscribe("chat").await.unwrap();

        let mut stream = pubsub.on_message();
        while let Some(msg) = stream.next().await {
            let text: String = msg.get_payload().unwrap();
            println!("Received: {text}");
        }
    });

    // Give subscriber time to connect
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Publisher
    let mut pub_con = client.get_multiplexed_async_connection().await?;
    redis::cmd("PUBLISH")
        .arg("chat")
        .arg("Hello, world!")
        .query_async::<_, ()>(&mut pub_con)
        .await?;

    subscriber.await.ok();
    Ok(())
}
```

## Key Limitations

- A subscribed connection can only run `SUBSCRIBE`, `UNSUBSCRIBE`, `PSUBSCRIBE`, `PUNSUBSCRIBE`, and `PING`
- Messages are not persisted - if no subscriber is listening, messages are lost
- For durability and consumer groups, use Redis Streams instead

## Summary

Redis Pub/Sub in Rust is clean and straightforward with the `redis` crate. Use synchronous `as_pubsub()` for simple cases, async with Tokio for non-blocking event loops, and `psubscribe` for wildcard channel matching. Keep publisher and subscriber on separate connections.
