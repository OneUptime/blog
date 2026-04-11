# How to Build a Rate Limiter in Rust with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rust, Rate Limiting, Lua Script, Tokio

Description: Build a Redis-backed rate limiter in Rust using the sliding window and fixed window algorithms with atomic Lua scripts for correctness.

---

## Introduction

A rate limiter controls how many requests a client can make in a given time window. Redis is ideal for this because of its atomic operations and fast in-memory storage. This guide implements both a fixed-window and a sliding-window rate limiter in Rust using `redis-rs`.

## Dependencies

```toml
[dependencies]
redis = { version = "0.25", features = ["tokio-comp", "script"] }
tokio = { version = "1", features = ["full"] }
```

## Fixed Window Rate Limiter

The fixed window approach uses `INCR` and `EXPIRE` to count requests within a time window:

```rust
use redis::AsyncCommands;

pub struct RateLimiter {
    pool: redis::aio::MultiplexedConnection,
    limit: u64,
    window_secs: u64,
}

impl RateLimiter {
    pub async fn is_allowed(&mut self, key: &str) -> redis::RedisResult<bool> {
        let redis_key = format!("rate_limit:{}", key);

        let count: u64 = self.pool.incr(&redis_key, 1).await?;

        if count == 1 {
            // Set expiry only on first increment
            let _: () = self.pool.expire(&redis_key, self.window_secs as i64).await?;
        }

        Ok(count <= self.limit)
    }
}
```

## Atomic Fixed Window with Lua Script

Using `INCR` and `EXPIRE` separately has a race condition. Use a Lua script for atomicity:

```rust
use redis::{Script, AsyncCommands};

const RATE_LIMIT_SCRIPT: &str = r#"
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local count = redis.call('INCR', key)
if count == 1 then
    redis.call('EXPIRE', key, window)
end

if count > limit then
    return 0
else
    return 1
end
"#;

pub async fn check_rate_limit(
    con: &mut redis::aio::MultiplexedConnection,
    identifier: &str,
    limit: i64,
    window_secs: i64,
) -> redis::RedisResult<bool> {
    let script = Script::new(RATE_LIMIT_SCRIPT);
    let key = format!("rl:{}", identifier);

    let allowed: i64 = script
        .key(key)
        .arg(limit)
        .arg(window_secs)
        .invoke_async(con)
        .await?;

    Ok(allowed == 1)
}
```

## Sliding Window Rate Limiter with Sorted Sets

The sliding window algorithm uses a sorted set with timestamps as scores for precise rate limiting:

```rust
use redis::AsyncCommands;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn sliding_window_check(
    con: &mut redis::aio::MultiplexedConnection,
    identifier: &str,
    limit: usize,
    window_secs: u64,
) -> redis::RedisResult<bool> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let window_start = now - (window_secs * 1000);
    let key = format!("sw_rl:{}", identifier);

    // Remove timestamps outside the window
    let _: () = con.zrembyscore(&key, 0u64, window_start).await?;

    // Count remaining entries
    let count: usize = con.zcard(&key).await?;

    if count >= limit {
        return Ok(false);
    }

    // Add current timestamp
    let _: () = con.zadd(&key, now.to_string(), now).await?;

    // Set expiry to clean up the key
    let _: () = con.expire(&key, window_secs as i64).await?;

    Ok(true)
}
```

## Integrating with Axum HTTP Handler

Use the rate limiter in an Axum web handler:

```rust
use axum::{extract::State, http::{StatusCode, HeaderMap}, response::IntoResponse};
use std::sync::Arc;
use tokio::sync::Mutex;

type SharedCon = Arc<Mutex<redis::aio::MultiplexedConnection>>;

async fn api_handler(
    State(con): State<SharedCon>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let client_ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");

    let mut redis_con = con.lock().await;
    let allowed = check_rate_limit(
        &mut redis_con,
        client_ip,
        100,   // 100 requests
        60,    // per 60 seconds
    ).await.unwrap_or(true);

    if !allowed {
        return (StatusCode::TOO_MANY_REQUESTS, "Rate limit exceeded").into_response();
    }

    (StatusCode::OK, "OK").into_response()
}
```

## Returning Rate Limit Headers

Provide standard rate limit headers to API consumers:

```rust
use redis::AsyncCommands;

pub struct RateLimitResult {
    pub allowed: bool,
    pub remaining: i64,
    pub reset_at: u64,
}

pub async fn check_with_headers(
    con: &mut redis::aio::MultiplexedConnection,
    key: &str,
    limit: i64,
    window_secs: i64,
) -> redis::RedisResult<RateLimitResult> {
    let redis_key = format!("rl:{}", key);
    let count: i64 = con.incr(&redis_key, 1).await?;

    if count == 1 {
        let _: () = con.expire(&redis_key, window_secs).await?;
    }

    let ttl: i64 = con.ttl(&redis_key).await?;

    Ok(RateLimitResult {
        allowed: count <= limit,
        remaining: (limit - count).max(0),
        reset_at: ttl as u64,
    })
}
```

## Summary

Building a rate limiter in Rust with Redis involves choosing between the fixed window (simple, slight edge-window burst risk) and the sliding window (precise, slightly higher memory usage) algorithms. Lua scripts ensure atomicity when multiple Redis commands must execute as a unit. Integrating the rate limiter into an async Axum or Actix-Web handler gives you per-IP or per-user rate limiting with minimal latency overhead.
