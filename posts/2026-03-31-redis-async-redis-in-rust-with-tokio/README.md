# How to Use Async Redis in Rust with Tokio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, Tokio, Async, Concurrency

Description: Learn how to use Redis asynchronously in Rust with Tokio, using multiplexed connections and connection pools for concurrent workloads.

---

Synchronous Redis calls block the thread, which limits throughput in async Rust applications. The `redis` crate integrates with Tokio to provide non-blocking operations via multiplexed connections and connection pools.

## Setup

```toml
[dependencies]
redis = { version = "0.25", features = ["tokio-comp"] }
tokio = { version = "1", features = ["full"] }
```

## Multiplexed Connection

A multiplexed connection lets multiple async tasks share one TCP connection safely:

```rust
use redis::AsyncCommands;

#[tokio::main]
async fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_multiplexed_async_connection().await?;

    let _: () = con.set("greeting", "hello").await?;
    let val: String = con.get("greeting").await?;
    println!("{val}");

    Ok(())
}
```

Because it is multiplexed, you can clone it and pass it to multiple tasks:

```rust
use tokio::task::JoinSet;

let mut set = JoinSet::new();
for i in 0..10 {
    let mut c = con.clone();
    set.spawn(async move {
        let _: () = c.set(format!("key:{i}"), i).await.unwrap();
    });
}
while set.join_next().await.is_some() {}
```

## Connection Pool with deadpool-redis

For heavier concurrency, use a pool so each task gets its own connection:

```toml
[dependencies]
deadpool-redis = "0.15"
redis = { version = "0.25", features = ["tokio-comp"] }
tokio = { version = "1", features = ["full"] }
```

```rust
use deadpool_redis::{Config, Runtime};
use redis::AsyncCommands;

#[tokio::main]
async fn main() {
    let cfg = Config::from_url("redis://127.0.0.1/");
    let pool = cfg.create_pool(Some(Runtime::Tokio1)).unwrap();

    let handles: Vec<_> = (0..20).map(|i| {
        let pool = pool.clone();
        tokio::spawn(async move {
            let mut con = pool.get().await.unwrap();
            let _: () = con.set(format!("task:{i}"), i).await.unwrap();
        })
    }).collect();

    for h in handles { h.await.unwrap(); }
    println!("All tasks done");
}
```

## Async Pipeline

Batch multiple commands asynchronously:

```rust
let results: (String, i64) = redis::pipe()
    .get("greeting")
    .incr("visit_count", 1)
    .query_async(&mut con)
    .await?;

println!("greeting={}, visits={}", results.0, results.1);
```

## Timeouts and Cancellation

Wrap Redis calls with `tokio::time::timeout` to avoid hanging:

```rust
use tokio::time::{timeout, Duration};

let result = timeout(
    Duration::from_secs(2),
    con.get::<_, String>("slow_key")
).await;

match result {
    Ok(Ok(val)) => println!("Got: {val}"),
    Ok(Err(e)) => eprintln!("Redis error: {e}"),
    Err(_) => eprintln!("Timed out waiting for Redis"),
}
```

## Async Pub/Sub

Add `futures-util` to your dependencies:

```toml
[dependencies]
futures-util = "0.3"
```

```rust
use futures_util::StreamExt;

let mut pubsub = client.get_async_pubsub().await?;
pubsub.subscribe("updates").await?;

let mut stream = pubsub.on_message();
if let Some(msg) = stream.next().await {
    let text: String = msg.get_payload()?;
    println!("Update: {text}");
}
```

## Summary

Async Redis in Rust with Tokio uses `get_multiplexed_async_connection()` for shared, cloneable connections or `deadpool-redis` for pooled connections. Use `query_async()` for async pipelines and wrap calls in `tokio::time::timeout` to guard against network hangs. The async API mirrors the sync API with `.await` appended to each operation.
