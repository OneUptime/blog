# How to Install and Set Up redis-rs in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, Redis-Rs, Caching, Getting Started

Description: Learn how to install the redis-rs crate in Rust, configure your Cargo.toml, and run your first Redis commands from a Rust application.

---

## Introduction

`redis-rs` is the most popular Redis client library for Rust. It provides both synchronous and asynchronous APIs, supports all Redis commands, and integrates seamlessly with the Tokio async runtime. This guide walks you through installing and setting up `redis-rs` in a new or existing Rust project.

## Prerequisites

- Rust toolchain installed (stable or nightly)
- A running Redis server (local or remote)
- Basic familiarity with Rust and Cargo

## Adding redis-rs to Cargo.toml

Open your `Cargo.toml` and add the `redis` crate as a dependency. For async support with Tokio, also include the `tokio` crate:

```toml
[dependencies]
redis = { version = "1", features = ["tokio-comp"] }
tokio = { version = "1", features = ["full"] }
```

For synchronous usage only, you can omit the `tokio-comp` feature:

```toml
[dependencies]
redis = "1"
```

## Connecting to Redis Synchronously

The simplest way to get started is with a synchronous connection:

```rust
use redis::Commands;

fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_connection()?;

    // Set a key
    let _: () = con.set("my_key", "hello")?;

    // Get the key back
    let value: String = con.get("my_key")?;
    println!("Got value: {}", value);

    Ok(())
}
```

## Connecting to Redis Asynchronously

For async applications using Tokio, use the async connection multiplexer:

```rust
use redis::AsyncCommands;

#[tokio::main]
async fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_multiplexed_async_connection().await?;

    // Set a key asynchronously
    let _: () = con.set("async_key", "async_value").await?;

    // Get the key back
    let value: String = con.get("async_key").await?;
    println!("Got async value: {}", value);

    Ok(())
}
```

## Connecting with Authentication and TLS

When connecting to a Redis instance that requires a password or uses TLS:

```rust
use redis::Commands;

fn main() -> redis::RedisResult<()> {
    // With password
    let client = redis::Client::open("redis://:mypassword@127.0.0.1:6379/")?;
    let mut con = client.get_connection()?;

    // With TLS (requires tls-native-tls feature in Cargo.toml)
    // redis = { version = "1", features = ["tls-native-tls"] }
    let tls_client = redis::Client::open("rediss://:mypassword@myhost.example.com:6380/")?;
    let mut tls_con = tls_client.get_connection()?;

    let _: () = con.set("secure_key", "secure_value")?;
    Ok(())
}
```

## Setting Connection Timeouts

You can set a connection timeout to avoid hanging indefinitely:

```rust
use redis::Client;
use std::time::Duration;

fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;

    // Get connection with timeout
    let con = client.get_connection_with_timeout(Duration::from_secs(5))?;

    println!("Connected to Redis successfully");
    Ok(())
}
```

## Running Basic Redis Commands

Once connected, you can run all standard Redis commands through the `Commands` trait:

```rust
use redis::Commands;

fn demonstrate_commands(con: &mut redis::Connection) -> redis::RedisResult<()> {
    // String operations
    let _: () = con.set("counter", 0)?;
    let _: i64 = con.incr("counter", 1)?;

    // Expiry
    let _: () = con.set_ex("temp_key", "temp_value", 60)?;

    // Check existence
    let exists: bool = con.exists("counter")?;
    println!("counter exists: {}", exists);

    // Delete
    let _: i64 = con.del("counter")?;

    Ok(())
}
```

## Verifying Your Setup

Run your project with `cargo run`. If Redis is running on `127.0.0.1:6379`, you should see successful output. You can verify Redis is accessible with the `redis-cli ping` command:

```bash
redis-cli ping
# PONG
cargo run
```

## Summary

Installing `redis-rs` in Rust requires adding the crate to `Cargo.toml` with the appropriate feature flags for sync or async usage. The library provides a clean, idiomatic API through the `Commands` and `AsyncCommands` traits, making it straightforward to perform Redis operations in both synchronous and Tokio-based async Rust applications. With the setup complete, you can begin leveraging Redis for caching, session storage, pub/sub, and more.
