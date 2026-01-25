# How to Build a Distributed Lock Service with Redis in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Redis, Distributed Locks, Concurrency, Microservices

Description: A practical guide to implementing distributed locks using Redis and Rust, covering the Redlock algorithm, handling edge cases, and building a production-ready locking service for your microservices.

---

When you scale beyond a single process, coordinating access to shared resources becomes a real problem. Maybe you need to ensure only one worker processes a payment at a time, or prevent duplicate cron job executions across multiple instances. This is where distributed locks come in - and Redis combined with Rust makes for a solid foundation.

## Why Redis for Distributed Locks?

Redis is fast, widely deployed, and has atomic operations that make it well-suited for lock implementations. The `SET NX EX` command lets you atomically set a key only if it does not exist, with an automatic expiration. This is the building block for most Redis-based locking schemes.

Rust, on the other hand, gives you memory safety and fearless concurrency without a garbage collector. When building infrastructure code that other services depend on, those guarantees matter.

## Setting Up the Project

First, create a new Rust project and add the required dependencies:

```toml
[package]
name = "redis-lock"
version = "0.1.0"
edition = "2021"

[dependencies]
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4"] }
thiserror = "1.0"
```

## The Basic Lock Implementation

Let's start with a straightforward lock implementation before adding more sophisticated features:

```rust
use redis::{AsyncCommands, Client};
use std::time::Duration;
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum LockError {
    #[error("Failed to acquire lock")]
    AcquisitionFailed,
    #[error("Lock not held by this owner")]
    NotOwned,
    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),
}

pub struct DistributedLock {
    client: Client,
    key: String,
    owner_id: String,
    ttl: Duration,
}

impl DistributedLock {
    pub fn new(client: Client, key: &str, ttl: Duration) -> Self {
        Self {
            client,
            key: format!("lock:{}", key),
            // Each lock instance gets a unique owner ID
            owner_id: Uuid::new_v4().to_string(),
            ttl,
        }
    }

    pub async fn acquire(&self) -> Result<bool, LockError> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;

        // SET key value NX EX seconds
        // NX = only set if not exists
        // EX = expire after seconds
        let result: Option<String> = redis::cmd("SET")
            .arg(&self.key)
            .arg(&self.owner_id)
            .arg("NX")
            .arg("PX")
            .arg(self.ttl.as_millis() as u64)
            .query_async(&mut conn)
            .await?;

        Ok(result.is_some())
    }

    pub async fn release(&self) -> Result<bool, LockError> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;

        // Use Lua script to ensure we only delete if we own the lock
        // This prevents accidentally releasing someone else's lock
        let script = r#"
            if redis.call("GET", KEYS[1]) == ARGV[1] then
                return redis.call("DEL", KEYS[1])
            else
                return 0
            end
        "#;

        let result: i32 = redis::Script::new(script)
            .key(&self.key)
            .arg(&self.owner_id)
            .invoke_async(&mut conn)
            .await?;

        Ok(result == 1)
    }
}
```

The owner ID is critical here. Without it, one process could acquire a lock, timeout, and then another process acquires it - but the original process might still try to release what it thinks is its lock. The Lua script ensures atomicity: check ownership and delete in one operation.

## Adding Lock Extension

Long-running tasks need the ability to extend their lock before it expires. Here is how to add that:

```rust
impl DistributedLock {
    pub async fn extend(&self, additional_ttl: Duration) -> Result<bool, LockError> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;

        // Only extend if we still own the lock
        let script = r#"
            if redis.call("GET", KEYS[1]) == ARGV[1] then
                return redis.call("PEXPIRE", KEYS[1], ARGV[2])
            else
                return 0
            end
        "#;

        let result: i32 = redis::Script::new(script)
            .key(&self.key)
            .arg(&self.owner_id)
            .arg(additional_ttl.as_millis() as u64)
            .invoke_async(&mut conn)
            .await?;

        Ok(result == 1)
    }
}
```

## A Guard Pattern for Automatic Release

Rust's ownership system lets us build a guard that automatically releases the lock when it goes out of scope:

```rust
pub struct LockGuard<'a> {
    lock: &'a DistributedLock,
    released: bool,
}

impl<'a> LockGuard<'a> {
    pub async fn acquire(lock: &'a DistributedLock) -> Result<Self, LockError> {
        if lock.acquire().await? {
            Ok(Self { lock, released: false })
        } else {
            Err(LockError::AcquisitionFailed)
        }
    }

    pub async fn release(mut self) -> Result<(), LockError> {
        self.released = true;
        self.lock.release().await?;
        Ok(())
    }
}

impl<'a> Drop for LockGuard<'a> {
    fn drop(&mut self) {
        if !self.released {
            // Best effort release - we cannot await in drop
            // Consider logging if this happens frequently
            eprintln!("Warning: LockGuard dropped without explicit release");
        }
    }
}
```

The Drop implementation cannot be async, which is a known limitation. For production systems, you might spawn a background task to handle cleanup or use a synchronous Redis call.

## Retry Logic with Backoff

Real systems need retry logic. Here is a simple implementation with exponential backoff:

```rust
use std::time::Duration;
use tokio::time::sleep;

pub struct LockOptions {
    pub retry_count: u32,
    pub retry_delay: Duration,
    pub max_retry_delay: Duration,
}

impl Default for LockOptions {
    fn default() -> Self {
        Self {
            retry_count: 3,
            retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(2),
        }
    }
}

impl DistributedLock {
    pub async fn acquire_with_retry(&self, options: &LockOptions) -> Result<bool, LockError> {
        let mut delay = options.retry_delay;

        for attempt in 0..=options.retry_count {
            match self.acquire().await {
                Ok(true) => return Ok(true),
                Ok(false) => {
                    if attempt < options.retry_count {
                        sleep(delay).await;
                        // Exponential backoff with cap
                        delay = std::cmp::min(delay * 2, options.max_retry_delay);
                    }
                }
                Err(e) => return Err(e),
            }
        }

        Ok(false)
    }
}
```

## Putting It All Together

Here is how you would use the lock service in practice:

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = redis::Client::open("redis://127.0.0.1/")?;

    // Create a lock with 30 second TTL
    let lock = DistributedLock::new(
        client,
        "payment-processing",
        Duration::from_secs(30),
    );

    // Try to acquire with retries
    let options = LockOptions::default();
    if lock.acquire_with_retry(&options).await? {
        println!("Lock acquired, processing payment...");

        // Simulate work
        tokio::time::sleep(Duration::from_secs(5)).await;

        // Extend if we need more time
        if lock.extend(Duration::from_secs(30)).await? {
            println!("Lock extended, continuing work...");
        }

        // Release when done
        lock.release().await?;
        println!("Lock released");
    } else {
        println!("Could not acquire lock, another process is handling this");
    }

    Ok(())
}
```

## Considerations for Production

A few things to keep in mind before shipping this to production:

**Clock drift matters.** If your servers have significant clock skew, lock timing becomes unreliable. Use NTP and monitor for drift.

**Redis failover is tricky.** If Redis fails over to a replica that has not received the lock key yet, two processes might think they hold the lock. For truly critical sections, look into the Redlock algorithm which uses multiple independent Redis instances.

**TTL must exceed your work time.** If your task takes longer than the TTL, the lock expires while you are still working. Either extend the lock periodically or set a generous initial TTL.

**Network partitions happen.** A process might acquire a lock, get partitioned from Redis, and keep working while another process acquires the expired lock. Design your critical sections to be idempotent when possible.

**Monitor your locks.** Track acquisition times, contention rates, and extension patterns. High contention might mean you need to rethink your architecture rather than just tuning lock parameters.

## When Not to Use Distributed Locks

Distributed locks add complexity and potential failure modes. Before reaching for one, ask yourself:

- Can you partition the work so each instance handles a disjoint set of resources?
- Can you use database transactions or optimistic locking instead?
- Is the operation idempotent, making duplicate execution harmless?

Sometimes the answer is still "I need a distributed lock" - and now you have the tools to build one that works.

## Wrapping Up

Building a distributed lock service with Redis and Rust gives you a reliable coordination primitive for your microservices. The combination of Redis's atomic operations and Rust's safety guarantees makes for infrastructure code you can trust. Start with the basic implementation, add retry logic and extensions as needed, and always remember that the hardest part of distributed systems is handling the failure cases you did not think of yet.
