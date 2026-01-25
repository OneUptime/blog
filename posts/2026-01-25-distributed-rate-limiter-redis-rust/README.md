# How to Build a Distributed Rate Limiter with Redis in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Rate Limiting, Redis, Distributed Systems, API

Description: A hands-on guide to building a production-ready distributed rate limiter in Rust using Redis, covering sliding window algorithms and atomic Lua scripts for high-throughput APIs.

---

Rate limiting is one of those problems that seems simple until you need it to work across multiple servers. A single-instance rate limiter is straightforward, but once you scale horizontally, you need shared state. Redis is the natural choice here because it is fast, supports atomic operations, and handles the coordination problem for you. This guide walks through building a distributed rate limiter in Rust that can handle millions of requests.

## Why Redis for Distributed Rate Limiting?

When your API runs on multiple servers, each instance needs to agree on how many requests a client has made. You have a few options:

- **Sticky sessions** - Route users to the same server. Works but limits scaling.
- **Database writes** - Too slow for high-frequency checks.
- **In-memory with sync** - Complex and prone to race conditions.
- **Redis** - Sub-millisecond reads, atomic operations, built for this.

Redis gives you the speed of in-memory storage with the coordination of a centralized store. The `MULTI/EXEC` commands and Lua scripting let you run atomic operations that prevent race conditions.

## Project Setup

Start with a new Rust project and add the dependencies:

```bash
cargo new rate_limiter
cd rate_limiter
```

Update your `Cargo.toml`:

```toml
[package]
name = "rate_limiter"
version = "0.1.0"
edition = "2021"

[dependencies]
redis = { version = "0.24", features = ["tokio-comp", "connection-manager"] }
tokio = { version = "1.35", features = ["full"] }
thiserror = "1.0"
```

## The Sliding Window Algorithm

Fixed window rate limiting has a known flaw: users can make double the allowed requests by timing them at window boundaries. The sliding window algorithm fixes this by weighting requests from the previous window.

Here is how it works:

1. Track request counts in fixed windows (e.g., per minute)
2. For any check, calculate a weighted sum of the current and previous windows
3. The weight depends on how far into the current window we are

If you are 30 seconds into a 60-second window, the previous window counts for 50% of its requests.

## Core Rate Limiter Structure

Let's define the types and error handling:

```rust
use redis::{AsyncCommands, Client, Script};
use std::time::{SystemTime, UNIX_EPOCH};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RateLimitError {
    #[error("Redis connection error: {0}")]
    Connection(#[from] redis::RedisError),
    #[error("Rate limit exceeded: {current} requests, limit is {limit}")]
    LimitExceeded { current: u64, limit: u64 },
}

// Configuration for a rate limiter instance
pub struct RateLimiterConfig {
    pub window_size_secs: u64,  // Size of each window in seconds
    pub max_requests: u64,       // Maximum requests per window
    pub key_prefix: String,      // Prefix for Redis keys
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            window_size_secs: 60,
            max_requests: 100,
            key_prefix: "ratelimit".to_string(),
        }
    }
}

// Result of a rate limit check
pub struct RateLimitResult {
    pub allowed: bool,
    pub remaining: u64,
    pub reset_at: u64,  // Unix timestamp when the window resets
}

pub struct RateLimiter {
    client: Client,
    config: RateLimiterConfig,
    script: Script,
}
```

## The Lua Script - Atomic Operations

The secret to correct distributed rate limiting is atomicity. Without it, two servers might both check the count, both see room for one more request, and both allow it. Lua scripts in Redis run atomically.

```rust
impl RateLimiter {
    pub fn new(redis_url: &str, config: RateLimiterConfig) -> Result<Self, RateLimitError> {
        let client = Client::open(redis_url)?;

        // Lua script for atomic sliding window rate limiting
        // KEYS[1] = current window key
        // KEYS[2] = previous window key
        // ARGV[1] = window size in seconds
        // ARGV[2] = max requests
        // ARGV[3] = current timestamp
        // ARGV[4] = current window start timestamp
        let script = Script::new(r#"
            local current_key = KEYS[1]
            local previous_key = KEYS[2]
            local window_size = tonumber(ARGV[1])
            local max_requests = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            local window_start = tonumber(ARGV[4])

            -- Get counts from both windows
            local current_count = tonumber(redis.call('GET', current_key) or '0')
            local previous_count = tonumber(redis.call('GET', previous_key) or '0')

            -- Calculate how far we are into the current window (0.0 to 1.0)
            local elapsed = now - window_start
            local weight = 1.0 - (elapsed / window_size)

            -- Weighted count from sliding window
            local weighted_count = current_count + (previous_count * weight)

            if weighted_count >= max_requests then
                -- Rate limit exceeded
                return {0, math.floor(max_requests - weighted_count), window_start + window_size}
            end

            -- Increment current window and set expiry
            redis.call('INCR', current_key)
            redis.call('EXPIRE', current_key, window_size * 2)

            local remaining = math.floor(max_requests - weighted_count - 1)
            return {1, remaining, window_start + window_size}
        "#);

        Ok(Self {
            client,
            config,
            script,
        })
    }
}
```

## Implementing the Check Method

Now we wire up the check method that calls our Lua script:

```rust
impl RateLimiter {
    // Check if a request is allowed for the given identifier
    pub async fn check(&self, identifier: &str) -> Result<RateLimitResult, RateLimitError> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Calculate window boundaries
        let window_start = (now / self.config.window_size_secs) * self.config.window_size_secs;
        let previous_window_start = window_start - self.config.window_size_secs;

        // Build Redis keys
        let current_key = format!(
            "{}:{}:{}",
            self.config.key_prefix, identifier, window_start
        );
        let previous_key = format!(
            "{}:{}:{}",
            self.config.key_prefix, identifier, previous_window_start
        );

        // Execute the Lua script atomically
        let result: Vec<i64> = self.script
            .key(&current_key)
            .key(&previous_key)
            .arg(self.config.window_size_secs)
            .arg(self.config.max_requests)
            .arg(now)
            .arg(window_start)
            .invoke_async(&mut conn)
            .await?;

        Ok(RateLimitResult {
            allowed: result[0] == 1,
            remaining: result[1].max(0) as u64,
            reset_at: result[2] as u64,
        })
    }
}
```

## Building an HTTP Middleware

For real applications, you will want middleware that integrates with your web framework. Here is an example using Axum:

```rust
use axum::{
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::sync::Arc;

// Extract client identifier from request - customize based on your needs
fn get_client_id<B>(req: &Request<B>) -> String {
    // Try API key header first
    if let Some(api_key) = req.headers().get("X-API-Key") {
        if let Ok(key) = api_key.to_str() {
            return format!("api:{}", key);
        }
    }

    // Fall back to IP address
    req.headers()
        .get("X-Forwarded-For")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

pub async fn rate_limit_middleware<B>(
    State(limiter): State<Arc<RateLimiter>>,
    req: Request<B>,
    next: Next<B>,
) -> Response {
    let client_id = get_client_id(&req);

    match limiter.check(&client_id).await {
        Ok(result) => {
            if !result.allowed {
                return (
                    StatusCode::TOO_MANY_REQUESTS,
                    [
                        ("X-RateLimit-Limit", limiter.config.max_requests.to_string()),
                        ("X-RateLimit-Remaining", "0".to_string()),
                        ("X-RateLimit-Reset", result.reset_at.to_string()),
                        ("Retry-After", (result.reset_at - current_timestamp()).to_string()),
                    ],
                    "Rate limit exceeded",
                ).into_response();
            }

            // Add rate limit headers to successful responses
            let mut response = next.run(req).await;
            let headers = response.headers_mut();
            headers.insert("X-RateLimit-Limit",
                limiter.config.max_requests.to_string().parse().unwrap());
            headers.insert("X-RateLimit-Remaining",
                result.remaining.to_string().parse().unwrap());
            headers.insert("X-RateLimit-Reset",
                result.reset_at.to_string().parse().unwrap());
            response
        }
        Err(e) => {
            // Log the error but fail open - don't block requests if Redis is down
            eprintln!("Rate limiter error: {}", e);
            next.run(req).await
        }
    }
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}
```

## Connection Pooling for High Throughput

For production workloads, you want connection pooling. The `redis` crate's `ConnectionManager` handles this:

```rust
use redis::aio::ConnectionManager;

pub struct PooledRateLimiter {
    conn_manager: ConnectionManager,
    config: RateLimiterConfig,
    script: Script,
}

impl PooledRateLimiter {
    pub async fn new(redis_url: &str, config: RateLimiterConfig) -> Result<Self, RateLimitError> {
        let client = Client::open(redis_url)?;
        let conn_manager = ConnectionManager::new(client).await?;

        // Same Lua script as before
        let script = Script::new(r#"
            -- Script content here (same as above)
        "#);

        Ok(Self {
            conn_manager,
            config,
            script,
        })
    }

    pub async fn check(&self, identifier: &str) -> Result<RateLimitResult, RateLimitError> {
        // Clone is cheap - ConnectionManager uses Arc internally
        let mut conn = self.conn_manager.clone();

        // Rest of the implementation is the same
        // ...
    }
}
```

## Handling Multiple Rate Limit Tiers

Real APIs often have different limits for different endpoints or user tiers:

```rust
pub struct TieredRateLimiter {
    limiters: std::collections::HashMap<String, RateLimiter>,
}

impl TieredRateLimiter {
    pub fn new(redis_url: &str) -> Result<Self, RateLimitError> {
        let mut limiters = std::collections::HashMap::new();

        // Default tier - 100 requests per minute
        limiters.insert("default".to_string(), RateLimiter::new(
            redis_url,
            RateLimiterConfig {
                window_size_secs: 60,
                max_requests: 100,
                key_prefix: "rl:default".to_string(),
            },
        )?);

        // Premium tier - 1000 requests per minute
        limiters.insert("premium".to_string(), RateLimiter::new(
            redis_url,
            RateLimiterConfig {
                window_size_secs: 60,
                max_requests: 1000,
                key_prefix: "rl:premium".to_string(),
            },
        )?);

        // Auth endpoints - strict limits
        limiters.insert("auth".to_string(), RateLimiter::new(
            redis_url,
            RateLimiterConfig {
                window_size_secs: 3600,  // 1 hour
                max_requests: 10,
                key_prefix: "rl:auth".to_string(),
            },
        )?);

        Ok(Self { limiters })
    }

    pub async fn check(&self, tier: &str, identifier: &str) -> Result<RateLimitResult, RateLimitError> {
        let limiter = self.limiters.get(tier)
            .or_else(|| self.limiters.get("default"))
            .expect("default limiter must exist");

        limiter.check(identifier).await
    }
}
```

## Testing Your Rate Limiter

Here is a simple test to verify the behavior:

```rust
#[tokio::test]
async fn test_rate_limiting() {
    let limiter = RateLimiter::new(
        "redis://127.0.0.1:6379",
        RateLimiterConfig {
            window_size_secs: 1,
            max_requests: 5,
            key_prefix: "test".to_string(),
        },
    ).unwrap();

    let client_id = "test_client";

    // First 5 requests should succeed
    for i in 0..5 {
        let result = limiter.check(client_id).await.unwrap();
        assert!(result.allowed, "Request {} should be allowed", i);
        assert_eq!(result.remaining, 4 - i as u64);
    }

    // 6th request should fail
    let result = limiter.check(client_id).await.unwrap();
    assert!(!result.allowed, "6th request should be blocked");

    // Wait for window to reset
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Should be allowed again
    let result = limiter.check(client_id).await.unwrap();
    assert!(result.allowed, "Request after window reset should be allowed");
}
```

## Production Considerations

A few things to keep in mind when deploying:

**Redis Cluster** - If you use Redis Cluster, all keys for a given client must hash to the same slot. Use hash tags: `{user:123}:ratelimit:window`.

**Failover Strategy** - Decide whether to fail open (allow requests when Redis is down) or fail closed (block all requests). Most APIs fail open to maintain availability.

**Key Expiration** - Always set TTLs on your keys. The Lua script sets expiry to twice the window size, which handles the sliding window correctly.

**Monitoring** - Track your rate limit hit rate. If legitimate users are getting blocked, your limits might be too aggressive.

## Summary

Building a distributed rate limiter with Redis and Rust gives you the performance and correctness needed for high-scale APIs. The sliding window algorithm provides smooth rate limiting without the boundary issues of fixed windows, and Lua scripts ensure atomic operations across your cluster.

The key points:

- Use Lua scripts for atomic increment and check operations
- Sliding window prevents the double-burst problem at window boundaries
- Connection pooling is essential for high throughput
- Always fail gracefully when Redis is unavailable

This pattern scales to millions of requests per second with proper Redis configuration and is battle-tested in production systems worldwide.
