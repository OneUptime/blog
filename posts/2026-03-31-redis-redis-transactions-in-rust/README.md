# How to Use Redis Transactions in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, Transaction, Atomicity, MULTI

Description: Learn how to use Redis MULTI/EXEC transactions in Rust with the redis crate to execute a group of commands atomically and safely.

---

Redis transactions group commands under `MULTI`/`EXEC` so they execute atomically - no other client can interleave commands between them. In Rust the `redis` crate exposes this through atomic pipelines and lower-level transaction helpers.

## Setup

```toml
[dependencies]
redis = "0.25"
```

## Basic Atomic Pipeline

The simplest way to run a transaction is `.atomic()` on a pipeline:

```rust
use redis::Commands;

fn transfer_points(con: &mut redis::Connection, from: &str, to: &str, amount: i64)
    -> redis::RedisResult<()>
{
    redis::pipe()
        .atomic()
        .cmd("DECRBY").arg(from).arg(amount).ignore()
        .cmd("INCRBY").arg(to).arg(amount).ignore()
        .query(con)?;
    Ok(())
}

fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_connection()?;
    con.set("user:1:points", 100)?;
    con.set("user:2:points", 50)?;

    transfer_points(&mut con, "user:1:points", "user:2:points", 30)?;

    let (a, b): (i64, i64) = redis::pipe()
        .get("user:1:points")
        .get("user:2:points")
        .query(&mut con)?;

    println!("user1={a}, user2={b}"); // user1=70, user2=80
    Ok(())
}
```

## Optimistic Locking with WATCH

For read-modify-write patterns, use `WATCH` to abort a transaction if a key changes between reading and writing:

```rust
fn increment_if_below(con: &mut redis::Connection, key: &str, limit: i64)
    -> redis::RedisResult<bool>
{
    loop {
        redis::cmd("WATCH").arg(key).query::<()>(con)?;

        let current: i64 = con.get(key).unwrap_or(0);
        if current >= limit {
            redis::cmd("UNWATCH").query::<()>(con)?;
            return Ok(false);
        }

        let result: Option<(i64,)> = redis::pipe()
            .atomic()
            .incr(key, 1)
            .query(con)?;

        match result {
            Some(_) => return Ok(true),
            None => continue, // WATCH detected a change, retry
        }
    }
}
```

If another client modifies `key` between `WATCH` and `EXEC`, Redis returns a nil reply. The `redis` crate deserializes this as `None` when the result type is `Option<T>`, so we check for `None` and retry.

## Error Handling

Redis transactions do not roll back on runtime errors - if one command fails after `EXEC`, the others still run. Only syntax errors before `EXEC` abort the whole transaction.

```rust
// Commands are queued; syntax errors prevent EXEC but runtime errors do not roll back
let result: redis::RedisResult<Vec<redis::Value>> = redis::pipe()
    .atomic()
    .set("counter", "not_a_number")  // will be stored
    .incr("counter", 1)               // will error at runtime but won't rollback SET
    .query(con);
```

Always validate data before putting it in a transaction, and check individual results when type safety matters.

## Async Transactions

```rust
use redis::AsyncCommands;

#[tokio::main]
async fn main() -> redis::RedisResult<()> {
    let client = redis::Client::open("redis://127.0.0.1/")?;
    let mut con = client.get_multiplexed_async_connection().await?;

    redis::pipe()
        .atomic()
        .set("session:abc", "user:42").ignore()
        .expire("session:abc", 3600).ignore()
        .query_async(&mut con)
        .await?;

    Ok(())
}
```

## Summary

Redis transactions in Rust use `.atomic()` on a pipeline for simple atomic batches, and `WATCH`/`MULTI`/`EXEC` for optimistic locking. Remember that Redis transactions are not rollback-capable - treat them as atomic queues, not SQL transactions. Combine with `WATCH` for safe read-modify-write patterns.
