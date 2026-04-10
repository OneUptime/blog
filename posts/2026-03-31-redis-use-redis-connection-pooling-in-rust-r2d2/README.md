# How to Use Redis Connection Pooling in Rust (r2d2-redis)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, R2d2, Connection Pooling, Performance

Description: Learn how to configure a Redis connection pool in Rust using r2d2-redis to efficiently manage connections in multi-threaded applications.

---

## Introduction

Opening a new Redis connection for every request is expensive. Connection pooling maintains a set of reusable connections, reducing latency and resource overhead in multi-threaded Rust applications. The `r2d2-redis` crate integrates the generic `r2d2` connection pool with `redis-rs`.

## Adding Dependencies

```toml
[dependencies]
redis = "0.20"
r2d2_redis = "0.14"
```

## Creating a Connection Pool

```rust
use r2d2_redis::{r2d2, RedisConnectionManager};

fn create_pool() -> r2d2::Pool<RedisConnectionManager> {
    let manager = RedisConnectionManager::new("redis://127.0.0.1/")
        .expect("Failed to create Redis connection manager");

    r2d2::Pool::builder()
        .max_size(15)
        .build(manager)
        .expect("Failed to create connection pool")
}

fn main() {
    let pool = create_pool();
    println!("Pool created with max size: {}", pool.max_size());
}
```

## Using the Pool in Application Code

Get a connection from the pool, use it, and it is automatically returned when the guard drops:

```rust
use r2d2_redis::{r2d2, RedisConnectionManager};
use redis::Commands;

fn set_value(
    pool: &r2d2::Pool<RedisConnectionManager>,
    key: &str,
    value: &str,
) -> redis::RedisResult<()> {
    let mut con = pool.get().expect("Failed to get connection from pool");
    con.set(key, value)?;
    Ok(())
}

fn get_value(
    pool: &r2d2::Pool<RedisConnectionManager>,
    key: &str,
) -> redis::RedisResult<Option<String>> {
    let mut con = pool.get().expect("Failed to get connection from pool");
    con.get(key)
}
```

## Sharing the Pool Across Threads

Wrap the pool in an `Arc` to share it safely across threads:

```rust
use std::sync::Arc;
use std::thread;
use r2d2_redis::{r2d2, RedisConnectionManager};
use redis::Commands;

fn main() {
    let manager = RedisConnectionManager::new("redis://127.0.0.1/").unwrap();
    let pool = Arc::new(
        r2d2::Pool::builder()
            .max_size(10)
            .build(manager)
            .unwrap()
    );

    let handles: Vec<_> = (0..5).map(|i| {
        let pool = Arc::clone(&pool);
        thread::spawn(move || {
            let mut con = pool.get().unwrap();
            let _: () = con.set(format!("key:{}", i), i * 10).unwrap();
            let val: i32 = con.get(format!("key:{}", i)).unwrap();
            println!("Thread {}: key:{} = {}", i, i, val);
        })
    }).collect();

    for h in handles {
        h.join().unwrap();
    }
}
```

## Pool Configuration Options

Tune the pool for your workload:

```rust
use r2d2_redis::{r2d2, RedisConnectionManager};
use std::time::Duration;

fn create_tuned_pool() -> r2d2::Pool<RedisConnectionManager> {
    let manager = RedisConnectionManager::new("redis://127.0.0.1/").unwrap();

    r2d2::Pool::builder()
        .max_size(20)               // Maximum connections
        .min_idle(Some(5))          // Keep at least 5 idle connections
        .connection_timeout(Duration::from_secs(5))  // Timeout waiting for a connection
        .idle_timeout(Some(Duration::from_secs(600))) // Close idle connections after 10 min
        .max_lifetime(Some(Duration::from_secs(1800))) // Recycle connections after 30 min
        .build(manager)
        .unwrap()
}
```

## Using deadpool-redis for Async Pooling

For async Tokio applications, prefer `deadpool-redis` instead of `r2d2-redis`:

```toml
[dependencies]
deadpool-redis = "0.14"
redis = { version = "0.24", features = ["tokio-comp"] }
tokio = { version = "1", features = ["full"] }
```

```rust
use deadpool_redis::{Config, Pool, Runtime};
use redis::AsyncCommands;

fn create_async_pool() -> Pool {
    let cfg = Config::from_url("redis://127.0.0.1/");
    cfg.create_pool(Some(Runtime::Tokio1)).unwrap()
}

#[tokio::main]
async fn main() {
    let pool = create_async_pool();
    let mut con = pool.get().await.unwrap();

    let _: () = con.set("async_pool_key", "value").await.unwrap();
    let val: String = con.get("async_pool_key").await.unwrap();
    println!("Got: {}", val);
}
```

## Monitoring Pool Health

Check pool state to detect exhaustion:

```rust
fn log_pool_status(pool: &r2d2::Pool<RedisConnectionManager>) {
    let state = pool.state();
    println!(
        "Pool - connections: {}, idle: {}",
        state.connections,
        state.idle_connections
    );
}
```

## Summary

Using `r2d2-redis` for synchronous Rust applications or `deadpool-redis` for async Tokio applications allows you to maintain efficient, reusable Redis connection pools. Configure `max_size` based on your concurrency level and tune `idle_timeout` to avoid stale connections. Sharing the pool via `Arc` is the standard pattern for multi-threaded Rust services.
