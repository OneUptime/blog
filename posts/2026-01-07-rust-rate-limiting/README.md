# How to Implement Rate Limiting in Rust Without External Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Rate Limiting, Token Bucket, Sliding Window, API, Security, governor, Performance

Description: Learn how to implement rate limiting in Rust without external services like Redis. This guide covers token bucket and sliding window algorithms in pure Rust using the governor crate.

---

> Rate limiting protects your API from abuse and ensures fair resource allocation. While Redis-based solutions work well in distributed systems, sometimes you need a simpler, in-process solution. This guide shows you how to implement production-ready rate limiting in pure Rust.

In-process rate limiting has lower latency (no network round-trips), simpler deployment (no Redis), and works perfectly for single-instance services or per-pod limiting in Kubernetes.

---

## Rate Limiting Algorithms

| Algorithm | Description | Use Case |
|-----------|-------------|----------|
| **Token Bucket** | Tokens added at fixed rate, consumed per request | Smooth rate limiting with bursts |
| **Leaky Bucket** | Requests queued and processed at fixed rate | Strict output rate |
| **Fixed Window** | Count requests in fixed time windows | Simple, some burstiness at edges |
| **Sliding Window** | Rolling window for smoother limiting | Balanced smoothness |

---

## Using the governor Crate

The `governor` crate provides a high-performance, production-ready rate limiter.

### Setup

```toml
[dependencies]
governor = "0.6"
nonzero_ext = "0.3"
tokio = { version = "1", features = ["full"] }
axum = "0.7"
```

### Basic Rate Limiter

```rust
// src/rate_limit.rs
// Basic rate limiting with governor

use governor::{
    clock::DefaultClock,
    middleware::NoOpMiddleware,
    state::{InMemoryState, NotKeyed},
    Quota, RateLimiter,
};
use std::num::NonZeroU32;
use std::sync::Arc;

/// Create a global rate limiter
/// Allows 100 requests per second
pub fn create_global_limiter() -> Arc<RateLimiter<NotKeyed, InMemoryState, DefaultClock, NoOpMiddleware>> {
    let quota = Quota::per_second(NonZeroU32::new(100).unwrap());
    Arc::new(RateLimiter::direct(quota))
}

/// Create a limiter with burst capacity
/// Allows 10 requests per second with burst of 50
pub fn create_bursty_limiter() -> Arc<RateLimiter<NotKeyed, InMemoryState, DefaultClock, NoOpMiddleware>> {
    let quota = Quota::per_second(NonZeroU32::new(10).unwrap())
        .allow_burst(NonZeroU32::new(50).unwrap());
    Arc::new(RateLimiter::direct(quota))
}

// Usage example
async fn check_rate_limit(
    limiter: &RateLimiter<NotKeyed, InMemoryState, DefaultClock, NoOpMiddleware>,
) -> bool {
    limiter.check().is_ok()
}
```

### Keyed Rate Limiter (Per-IP, Per-User)

```rust
// src/rate_limit.rs (continued)
// Per-key rate limiting

use governor::{
    clock::DefaultClock,
    state::{InMemoryState, keyed::DefaultKeyedStateStore},
    Quota, RateLimiter,
};
use std::net::IpAddr;
use std::num::NonZeroU32;
use std::sync::Arc;

/// Type alias for IP-based rate limiter
pub type IpRateLimiter = RateLimiter<
    IpAddr,
    DefaultKeyedStateStore<IpAddr>,
    DefaultClock,
>;

/// Create a per-IP rate limiter
/// Each IP gets 100 requests per minute
pub fn create_ip_limiter() -> Arc<IpRateLimiter> {
    let quota = Quota::per_minute(NonZeroU32::new(100).unwrap());
    Arc::new(RateLimiter::keyed(quota))
}

/// String-based key limiter (for user IDs, API keys, etc.)
pub type KeyedRateLimiter = RateLimiter<
    String,
    DefaultKeyedStateStore<String>,
    DefaultClock,
>;

pub fn create_keyed_limiter(requests_per_minute: u32) -> Arc<KeyedRateLimiter> {
    let quota = Quota::per_minute(NonZeroU32::new(requests_per_minute).unwrap());
    Arc::new(RateLimiter::keyed(quota))
}

// Usage
async fn check_ip_rate_limit(limiter: &IpRateLimiter, ip: IpAddr) -> bool {
    limiter.check_key(&ip).is_ok()
}

async fn check_user_rate_limit(limiter: &KeyedRateLimiter, user_id: &str) -> bool {
    limiter.check_key(&user_id.to_string()).is_ok()
}
```

---

## Axum Middleware Integration

```rust
// src/middleware/rate_limit.rs
// Rate limiting middleware for Axum

use axum::{
    body::Body,
    extract::{ConnectInfo, State},
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use governor::{
    clock::DefaultClock,
    state::{InMemoryState, keyed::DefaultKeyedStateStore},
    Quota, RateLimiter,
};
use std::net::{IpAddr, SocketAddr};
use std::num::NonZeroU32;
use std::sync::Arc;

/// Rate limiter state
pub struct RateLimitState {
    /// Per-IP limiter for general requests
    pub ip_limiter: Arc<RateLimiter<IpAddr, DefaultKeyedStateStore<IpAddr>, DefaultClock>>,
    /// Per-user limiter for authenticated requests
    pub user_limiter: Arc<RateLimiter<String, DefaultKeyedStateStore<String>, DefaultClock>>,
}

impl RateLimitState {
    pub fn new() -> Self {
        Self {
            ip_limiter: Arc::new(RateLimiter::keyed(
                Quota::per_minute(NonZeroU32::new(100).unwrap()),
            )),
            user_limiter: Arc::new(RateLimiter::keyed(
                Quota::per_minute(NonZeroU32::new(1000).unwrap()),
            )),
        }
    }
}

/// Rate limiting middleware
pub async fn rate_limit_middleware(
    State(state): State<Arc<RateLimitState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let ip = addr.ip();

    // Check IP rate limit
    match state.ip_limiter.check_key(&ip) {
        Ok(_) => {
            // Request allowed
            next.run(request).await
        }
        Err(not_until) => {
            // Rate limited
            let wait_time = not_until.wait_time_from(governor::clock::DefaultClock::default().now());

            tracing::warn!(
                ip = %ip,
                retry_after_secs = wait_time.as_secs(),
                "Rate limit exceeded"
            );

            (
                StatusCode::TOO_MANY_REQUESTS,
                [
                    ("Retry-After", wait_time.as_secs().to_string()),
                    ("X-RateLimit-Reset", wait_time.as_secs().to_string()),
                ],
                "Too many requests. Please try again later.",
            )
                .into_response()
        }
    }
}

/// Rate limiting with user authentication
pub async fn authenticated_rate_limit(
    State(state): State<Arc<RateLimitState>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    // Extract user ID from request (e.g., from JWT claims)
    let user_id = request
        .headers()
        .get("X-User-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let check_result = match &user_id {
        Some(id) => state.user_limiter.check_key(id),
        None => {
            // No user ID - use a default key or reject
            return StatusCode::UNAUTHORIZED.into_response();
        }
    };

    match check_result {
        Ok(_) => next.run(request).await,
        Err(not_until) => {
            let wait_time = not_until.wait_time_from(governor::clock::DefaultClock::default().now());

            (
                StatusCode::TOO_MANY_REQUESTS,
                [("Retry-After", wait_time.as_secs().to_string())],
                "Rate limit exceeded",
            )
                .into_response()
        }
    }
}
```

---

## Custom Token Bucket Implementation

For educational purposes or custom requirements, here's a manual implementation:

```rust
// src/token_bucket.rs
// Custom token bucket implementation

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

/// Token bucket rate limiter
pub struct TokenBucket {
    /// Maximum tokens (bucket capacity)
    capacity: u64,
    /// Current token count (stored as fixed-point for precision)
    tokens: AtomicU64,
    /// Tokens added per second
    refill_rate: f64,
    /// Last refill time
    last_refill: Mutex<Instant>,
}

impl TokenBucket {
    /// Create a new token bucket
    ///
    /// # Arguments
    /// * `capacity` - Maximum tokens (allows bursts up to this size)
    /// * `refill_rate` - Tokens added per second
    pub fn new(capacity: u64, refill_rate: f64) -> Self {
        Self {
            capacity,
            // Start with full bucket (stored as capacity * 1000 for precision)
            tokens: AtomicU64::new(capacity * 1000),
            refill_rate,
            last_refill: Mutex::new(Instant::now()),
        }
    }

    /// Try to acquire a token
    /// Returns true if allowed, false if rate limited
    pub async fn try_acquire(&self) -> bool {
        self.try_acquire_n(1).await
    }

    /// Try to acquire multiple tokens
    pub async fn try_acquire_n(&self, n: u64) -> bool {
        // Refill tokens based on elapsed time
        self.refill().await;

        let tokens_needed = n * 1000; // Fixed-point

        loop {
            let current = self.tokens.load(Ordering::Relaxed);

            if current < tokens_needed {
                return false; // Not enough tokens
            }

            let new_value = current - tokens_needed;

            // Atomic compare-and-swap
            match self.tokens.compare_exchange_weak(
                current,
                new_value,
                Ordering::SeqCst,
                Ordering::Relaxed,
            ) {
                Ok(_) => return true,
                Err(_) => continue, // Retry on contention
            }
        }
    }

    /// Refill tokens based on elapsed time
    async fn refill(&self) {
        let mut last_refill = self.last_refill.lock().await;
        let now = Instant::now();
        let elapsed = now.duration_since(*last_refill);

        if elapsed < Duration::from_millis(1) {
            return; // Too soon to refill
        }

        // Calculate tokens to add
        let tokens_to_add = (elapsed.as_secs_f64() * self.refill_rate * 1000.0) as u64;

        if tokens_to_add > 0 {
            *last_refill = now;

            // Add tokens up to capacity
            let max_tokens = self.capacity * 1000;
            loop {
                let current = self.tokens.load(Ordering::Relaxed);
                let new_value = std::cmp::min(current + tokens_to_add, max_tokens);

                match self.tokens.compare_exchange_weak(
                    current,
                    new_value,
                    Ordering::SeqCst,
                    Ordering::Relaxed,
                ) {
                    Ok(_) => break,
                    Err(_) => continue,
                }
            }
        }
    }

    /// Get current token count
    pub fn available_tokens(&self) -> u64 {
        self.tokens.load(Ordering::Relaxed) / 1000
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_token_bucket() {
        // 10 tokens, refill 5 per second
        let bucket = TokenBucket::new(10, 5.0);

        // Should allow 10 requests immediately (full bucket)
        for _ in 0..10 {
            assert!(bucket.try_acquire().await);
        }

        // Should be rate limited
        assert!(!bucket.try_acquire().await);

        // Wait for refill
        tokio::time::sleep(Duration::from_millis(200)).await;

        // Should have ~1 token now
        assert!(bucket.try_acquire().await);
    }
}
```

---

## Sliding Window Implementation

```rust
// src/sliding_window.rs
// Sliding window rate limiter

use std::collections::VecDeque;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

/// Sliding window rate limiter
pub struct SlidingWindow {
    /// Maximum requests in the window
    max_requests: usize,
    /// Window duration
    window_size: Duration,
    /// Request timestamps
    requests: Mutex<VecDeque<Instant>>,
}

impl SlidingWindow {
    pub fn new(max_requests: usize, window_size: Duration) -> Self {
        Self {
            max_requests,
            window_size,
            requests: Mutex::new(VecDeque::with_capacity(max_requests + 1)),
        }
    }

    /// Check if request is allowed
    pub async fn try_acquire(&self) -> bool {
        let mut requests = self.requests.lock().await;
        let now = Instant::now();
        let window_start = now - self.window_size;

        // Remove requests outside the window
        while let Some(&first) = requests.front() {
            if first < window_start {
                requests.pop_front();
            } else {
                break;
            }
        }

        // Check if under limit
        if requests.len() < self.max_requests {
            requests.push_back(now);
            true
        } else {
            false
        }
    }

    /// Get remaining requests in current window
    pub async fn remaining(&self) -> usize {
        let requests = self.requests.lock().await;
        let now = Instant::now();
        let window_start = now - self.window_size;

        let current_count = requests.iter().filter(|&&t| t >= window_start).count();
        self.max_requests.saturating_sub(current_count)
    }

    /// Get time until next request is allowed
    pub async fn retry_after(&self) -> Option<Duration> {
        let requests = self.requests.lock().await;

        if requests.len() < self.max_requests {
            return None; // Not rate limited
        }

        // Find the oldest request that will expire
        requests.front().map(|&oldest| {
            let expiry = oldest + self.window_size;
            let now = Instant::now();
            if expiry > now {
                expiry - now
            } else {
                Duration::ZERO
            }
        })
    }
}
```

---

## Per-Endpoint Rate Limiting

Different endpoints may need different limits.

```rust
// src/endpoint_limits.rs
// Per-endpoint rate limiting

use governor::{Quota, RateLimiter, state::{InMemoryState, NotKeyed}};
use std::collections::HashMap;
use std::num::NonZeroU32;
use std::sync::Arc;

/// Rate limit configuration for an endpoint
#[derive(Clone)]
pub struct EndpointLimit {
    pub requests_per_second: u32,
    pub burst: u32,
}

/// Per-endpoint rate limiter
pub struct EndpointRateLimiter {
    limiters: HashMap<String, Arc<RateLimiter<NotKeyed, InMemoryState, governor::clock::DefaultClock>>>,
    default_limiter: Arc<RateLimiter<NotKeyed, InMemoryState, governor::clock::DefaultClock>>,
}

impl EndpointRateLimiter {
    pub fn new(endpoint_limits: HashMap<String, EndpointLimit>, default: EndpointLimit) -> Self {
        let limiters = endpoint_limits
            .into_iter()
            .map(|(endpoint, limit)| {
                let quota = Quota::per_second(NonZeroU32::new(limit.requests_per_second).unwrap())
                    .allow_burst(NonZeroU32::new(limit.burst).unwrap());
                (endpoint, Arc::new(RateLimiter::direct(quota)))
            })
            .collect();

        let default_quota = Quota::per_second(NonZeroU32::new(default.requests_per_second).unwrap())
            .allow_burst(NonZeroU32::new(default.burst).unwrap());

        Self {
            limiters,
            default_limiter: Arc::new(RateLimiter::direct(default_quota)),
        }
    }

    pub fn check(&self, endpoint: &str) -> bool {
        let limiter = self.limiters.get(endpoint).unwrap_or(&self.default_limiter);
        limiter.check().is_ok()
    }
}

// Usage
fn create_endpoint_limiter() -> EndpointRateLimiter {
    let mut limits = HashMap::new();

    // Strict limit for auth endpoints
    limits.insert("/api/login".to_string(), EndpointLimit {
        requests_per_second: 5,
        burst: 10,
    });

    // Higher limit for read endpoints
    limits.insert("/api/users".to_string(), EndpointLimit {
        requests_per_second: 100,
        burst: 200,
    });

    EndpointRateLimiter::new(
        limits,
        EndpointLimit {
            requests_per_second: 50,
            burst: 100,
        },
    )
}
```

---

## Complete Axum Application

```rust
// src/main.rs
// Complete application with rate limiting

mod rate_limit;

use axum::{
    extract::State,
    http::StatusCode,
    middleware,
    routing::get,
    Router,
};
use rate_limit::{rate_limit_middleware, RateLimitState};
use std::sync::Arc;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Create rate limit state
    let rate_limit_state = Arc::new(RateLimitState::new());

    // Build router
    let app = Router::new()
        .route("/api/data", get(get_data))
        .route("/api/health", get(health))
        .layer(middleware::from_fn_with_state(
            rate_limit_state.clone(),
            rate_limit_middleware,
        ))
        .with_state(rate_limit_state);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Listening on 0.0.0.0:3000");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await
    .unwrap();
}

async fn get_data() -> &'static str {
    "Data response"
}

async fn health() -> StatusCode {
    StatusCode::OK
}
```

---

## Best Practices

| Practice | Why |
|----------|-----|
| Use per-IP for public endpoints | Prevents single-client abuse |
| Use per-user for authenticated APIs | Fair allocation among users |
| Set appropriate Retry-After headers | Helps clients back off properly |
| Monitor rate limit hits | Identify potential abuse or misconfig |
| Allow reasonable bursts | Improves user experience |
| Different limits per endpoint | Protect sensitive endpoints |

---

*Need to monitor rate limiting across your services? [OneUptime](https://oneuptime.com) provides API monitoring with rate limit tracking.*

**Related Reading:**
- [How to Build Production-Ready REST APIs in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-axum-rest-api/view)
- [How to Implement Retry Logic in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-retry-exponential-backoff/view)
