# How to Connect to Redis from Rust with redis-rs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, Redis-Rs, Connection, Async

Description: A practical guide to establishing synchronous and asynchronous connections to Redis from Rust using the redis-rs client library.

---

## Introduction

Connecting to Redis from Rust is done through the `redis-rs` crate. It supports plain TCP, Unix sockets, TLS, password authentication, and both synchronous and multiplexed async connections. This guide covers the various connection methods you will encounter in real projects.

## Prerequisites

Add `redis-rs` to your `Cargo.toml`:

```toml
[dependencies]
redis = { version = "1", features = ["tokio-comp"] }
tokio = { version = "1", features = ["full"] }
```

## Synchronous Connection

The simplest connection type is a blocking TCP connection:

```rust
use redis::Commands;

fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1:6379/")?;
    let mut con = client.get_connection()?;

    let _: () = con.set("greeting", "hello")?;
    let val: String = con.get("greeting")?;
    println!("{}", val);

    Ok(())
}
```

## Async Multiplexed Connection

In async contexts, use a multiplexed connection so that a single underlying TCP connection is shared across tasks:

```rust
use redis::AsyncCommands;

#[tokio::main]
async fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1:6379/")?;
    let mut con = client.get_multiplexed_async_connection().await?;

    let _: () = con.set("key", "value").await?;
    let val: String = con.get("key").await?;
    println!("Value: {}", val);

    Ok(())
}
```

## Connecting with a Password

Include the password in the connection URL:

```rust
fn connect_with_auth() -> redis::RedisResult<redis::Connection> {
    let client = redis::Client::open("redis://:supersecret@127.0.0.1:6379/")?;
    client.get_connection()
}
```

## Connecting to a Non-Default Database

Redis supports 16 databases by default (0-15). Specify the database in the URL path:

```rust
fn connect_to_db2() -> redis::RedisResult<redis::Connection> {
    // Database 2
    let client = redis::Client::open("redis://127.0.0.1/2")?;
    client.get_connection()
}
```

## Connecting Over a Unix Socket

If Redis is running locally with a Unix socket:

```rust
fn connect_via_unix() -> redis::RedisResult<redis::Connection> {
    let client = redis::Client::open("unix:///tmp/redis.sock")?;
    client.get_connection()
}
```

## Connection with Timeout

Prevent your application from hanging if Redis is unreachable:

```rust
use std::time::Duration;

fn connect_with_timeout() -> redis::RedisResult<redis::Connection> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    client.get_connection_with_timeout(Duration::from_secs(3))
}
```

## Sharing Connections Across Threads

`redis::Client` is `Clone` and `Send`, so you can share it across threads. Each thread then calls `get_connection()` independently:

```rust
use std::sync::Arc;
use std::thread;

fn main() -> redis::RedisResult<()> {
    let client = Arc::new(redis::Client::open("redis://127.0.0.1/")?);

    let handles: Vec<_> = (0..4).map(|i| {
        let c = Arc::clone(&client);
        thread::spawn(move || {
            let mut con = c.get_connection().unwrap();
            let _: () = redis::Commands::set(&mut con, format!("thread_{}", i), i).unwrap();
        })
    }).collect();

    for h in handles {
        h.join().unwrap();
    }

    Ok(())
}
```

## Error Handling

Wrap Redis errors with the `?` operator or match on `redis::RedisError`:

```rust
use redis::{Commands, RedisError, ErrorKind};

fn safe_get(con: &mut redis::Connection, key: &str) -> Option<String> {
    match con.get::<_, Option<String>>(key) {
        Ok(val) => val,
        Err(e) if e.kind() == ErrorKind::UnexpectedReturnType => {
            eprintln!("Type mismatch for key {}: {}", key, e);
            None
        }
        Err(e) => {
            eprintln!("Redis error: {}", e);
            None
        }
    }
}
```

## Summary

The `redis-rs` crate offers flexible connection options for Rust applications, from simple synchronous TCP connections to async multiplexed connections suitable for high-throughput Tokio services. Choose `get_connection()` for blocking contexts, `get_multiplexed_async_connection()` for async code, and consider connection pooling with the built-in `r2d2` feature or `deadpool-redis` when managing connections across many concurrent threads or tasks.
