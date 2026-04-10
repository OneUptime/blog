# How to Use Redis Pipelining in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, Pipeline, Performance, Caching

Description: Learn how to use Redis pipelining in Rust with the redis crate to batch commands and reduce round-trip latency for high-throughput workloads.

---

Redis pipelining lets you send multiple commands to the server without waiting for each response individually. Instead of paying a round-trip cost per command, you batch them and get all responses at once. In Rust, the `redis` crate makes this straightforward.

## Setting Up

Add the dependency to `Cargo.toml`:

```toml
[dependencies]
redis = { version = "0.25", features = ["tokio-comp"] }
tokio = { version = "1", features = ["full"] }
```

## Synchronous Pipelining

For synchronous code, use `redis::pipe()`:

```rust
use redis::Commands;

fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_connection()?;

    let (val1, val2, val3): (String, i64, bool) = redis::pipe()
        .set("key1", "hello").ignore()
        .get("key1")
        .incr("counter", 1)
        .exists("key1")
        .query(&mut con)?;

    println!("val1={val1}, counter={val2}, exists={val3}");
    Ok(())
}
```

The `.query()` call sends all commands in a single batch and returns a tuple of results.

## Atomic Pipelines with MULTI/EXEC

To make a pipeline atomic (wrapped in a transaction), call `.atomic()`:

```rust
redis::pipe()
    .atomic()
    .set("user:1:name", "Alice").ignore()
    .set("user:1:email", "alice@example.com").ignore()
    .query(&mut con)?;
```

This wraps the commands in `MULTI`/`EXEC`, ensuring all-or-nothing execution.

## Async Pipelining with Tokio

For async code, use `get_multiplexed_async_connection()` and the same `pipe()` builder:

```rust
use redis::AsyncCommands;

#[tokio::main]
async fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_multiplexed_async_connection().await?;

    let mut pipe = redis::pipe();
    for i in 0..100 {
        pipe.set(format!("item:{i}"), i);
    }

    pipe.query_async(&mut con).await?;
    println!("Inserted 100 items via pipeline");
    Ok(())
}
```

## Benchmarking the Difference

Here is a quick comparison script showing why pipelining matters:

```rust
use std::time::Instant;

fn without_pipeline(con: &mut redis::Connection, n: usize) -> redis::RedisResult<()> {
    for i in 0..n {
        let _: () = con.set(format!("k:{i}"), i)?;
    }
    Ok(())
}

fn with_pipeline(con: &mut redis::Connection, n: usize) -> redis::RedisResult<()> {
    let mut pipe = redis::pipe();
    for i in 0..n {
        pipe.set(format!("k:{i}"), i);
    }
    pipe.query(con)?;
    Ok(())
}
```

On a local Redis instance with 1,000 commands, pipelining typically runs 10-50x faster because it eliminates per-command network round-trips.

## When to Use Pipelining

- Bulk loading initial data
- Batch-updating counters or cache entries
- Warming up caches on application start
- Any operation where you need to fire many independent commands

Avoid pipelining when commands depend on each other's results - use Lua scripts or transactions for that pattern.

## Summary

Redis pipelining in Rust via the `redis` crate is simple: build a `pipe()`, chain commands, and call `query()` or `query_async()`. For atomic guarantees, add `.atomic()`. Pipelining is one of the easiest wins for Redis-heavy workloads and requires minimal code changes.
