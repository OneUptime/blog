# How to Implement Sliding Window Rate Limiting in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Rate Limiting, Sliding Window, API, Performance

Description: Learn how to build a production-ready sliding window rate limiter in Rust. This guide covers the algorithm, thread-safe implementations, and integration with popular web frameworks like Actix and Axum.

---

Rate limiting is one of those things you never think about until your API gets hammered by a misbehaving client or an overzealous scraper. The sliding window algorithm strikes a good balance between accuracy and memory efficiency, making it a solid choice for most production systems.

In this post, we will build a sliding window rate limiter from scratch in Rust. We will start with the core algorithm, make it thread-safe, and then integrate it with Actix Web and Axum.

---

## Why Sliding Window?

Before diving into code, let us quickly compare the common rate limiting algorithms:

| Algorithm | Memory | Accuracy | Burst Handling |
|-----------|--------|----------|----------------|
| Fixed Window | Low | Poor at boundaries | Allows 2x burst |
| Sliding Window Log | High | Excellent | No bursts |
| Sliding Window Counter | Low | Good | Minimal burst |
| Token Bucket | Low | Good | Controlled burst |

Fixed window has a well-known problem: if your limit is 100 requests per minute, a client can make 100 requests at 0:59 and another 100 at 1:01, effectively getting 200 requests in 2 seconds. Sliding window fixes this by looking at a rolling time period rather than fixed boundaries.

---

## The Core Algorithm

The sliding window counter approach uses two windows - the current and the previous. We calculate a weighted sum based on how far into the current window we are:

```rust
// src/rate_limiter.rs

use std::time::{Duration, Instant};

/// A single rate limit entry tracking requests across two windows
#[derive(Debug, Clone)]
struct WindowCounter {
    current_count: u64,
    previous_count: u64,
    window_start: Instant,
}

impl WindowCounter {
    fn new() -> Self {
        Self {
            current_count: 0,
            previous_count: 0,
            window_start: Instant::now(),
        }
    }
}

/// Sliding window rate limiter
pub struct RateLimiter {
    max_requests: u64,
    window_duration: Duration,
    counters: std::collections::HashMap<String, WindowCounter>,
}

impl RateLimiter {
    pub fn new(max_requests: u64, window_seconds: u64) -> Self {
        Self {
            max_requests,
            window_duration: Duration::from_secs(window_seconds),
            counters: std::collections::HashMap::new(),
        }
    }

    /// Check if a request is allowed and record it if so
    pub fn check(&mut self, key: &str) -> bool {
        let now = Instant::now();

        // Get or create counter for this key
        let counter = self.counters
            .entry(key.to_string())
            .or_insert_with(WindowCounter::new);

        // Calculate time elapsed since window start
        let elapsed = now.duration_since(counter.window_start);

        // Check if we need to rotate windows
        if elapsed >= self.window_duration {
            // How many full windows have passed?
            let windows_passed = elapsed.as_secs() / self.window_duration.as_secs();

            if windows_passed == 1 {
                // Just one window passed - rotate
                counter.previous_count = counter.current_count;
                counter.current_count = 0;
                counter.window_start += self.window_duration;
            } else {
                // Multiple windows passed - reset everything
                counter.previous_count = 0;
                counter.current_count = 0;
                counter.window_start = now;
            }
        }

        // Calculate the weighted request count
        let elapsed_in_window = now
            .duration_since(counter.window_start)
            .as_secs_f64();
        let window_secs = self.window_duration.as_secs_f64();
        let weight = elapsed_in_window / window_secs;

        // Weighted sum: more weight on current as time progresses
        let estimated_count = (counter.previous_count as f64 * (1.0 - weight))
            + counter.current_count as f64;

        if estimated_count >= self.max_requests as f64 {
            return false;
        }

        // Request allowed - increment counter
        counter.current_count += 1;
        true
    }

    /// Get remaining requests for a key
    pub fn remaining(&self, key: &str) -> u64 {
        let Some(counter) = self.counters.get(key) else {
            return self.max_requests;
        };

        let now = Instant::now();
        let elapsed = now.duration_since(counter.window_start);

        if elapsed >= self.window_duration * 2 {
            return self.max_requests;
        }

        let elapsed_in_window = elapsed.as_secs_f64() % self.window_duration.as_secs_f64();
        let weight = elapsed_in_window / self.window_duration.as_secs_f64();

        let estimated = (counter.previous_count as f64 * (1.0 - weight))
            + counter.current_count as f64;

        self.max_requests.saturating_sub(estimated.ceil() as u64)
    }
}
```

---

## Making It Thread-Safe

The basic implementation works, but it is not safe for concurrent access. In a web server context, multiple threads will be calling `check()` simultaneously. Let us fix that:

```rust
// src/concurrent_limiter.rs

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

#[derive(Debug)]
struct WindowCounter {
    current_count: u64,
    previous_count: u64,
    window_start: Instant,
}

/// Thread-safe sliding window rate limiter
#[derive(Clone)]
pub struct ConcurrentRateLimiter {
    max_requests: u64,
    window_duration: Duration,
    // RwLock for the outer map, separate locks per key would be even better
    counters: Arc<RwLock<HashMap<String, Arc<RwLock<WindowCounter>>>>>,
}

impl ConcurrentRateLimiter {
    pub fn new(max_requests: u64, window_seconds: u64) -> Self {
        Self {
            max_requests,
            window_duration: Duration::from_secs(window_seconds),
            counters: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn check(&self, key: &str) -> bool {
        // First, try to get existing counter with read lock
        let counter_arc = {
            let counters = self.counters.read().unwrap();
            counters.get(key).cloned()
        };

        let counter_arc = match counter_arc {
            Some(c) => c,
            None => {
                // Need to create new counter - acquire write lock
                let mut counters = self.counters.write().unwrap();
                // Double-check after acquiring write lock
                counters
                    .entry(key.to_string())
                    .or_insert_with(|| {
                        Arc::new(RwLock::new(WindowCounter {
                            current_count: 0,
                            previous_count: 0,
                            window_start: Instant::now(),
                        }))
                    })
                    .clone()
            }
        };

        // Now work with the individual counter
        let mut counter = counter_arc.write().unwrap();
        let now = Instant::now();
        let elapsed = now.duration_since(counter.window_start);

        // Rotate windows if needed
        if elapsed >= self.window_duration {
            let windows_passed = elapsed.as_secs() / self.window_duration.as_secs();
            if windows_passed == 1 {
                counter.previous_count = counter.current_count;
                counter.current_count = 0;
                counter.window_start += self.window_duration;
            } else {
                counter.previous_count = 0;
                counter.current_count = 0;
                counter.window_start = now;
            }
        }

        // Calculate weighted count
        let elapsed_in_window = now
            .duration_since(counter.window_start)
            .as_secs_f64();
        let weight = elapsed_in_window / self.window_duration.as_secs_f64();
        let estimated = (counter.previous_count as f64 * (1.0 - weight))
            + counter.current_count as f64;

        if estimated >= self.max_requests as f64 {
            return false;
        }

        counter.current_count += 1;
        true
    }

    pub fn remaining(&self, key: &str) -> u64 {
        let counters = self.counters.read().unwrap();
        let Some(counter_arc) = counters.get(key) else {
            return self.max_requests;
        };

        let counter = counter_arc.read().unwrap();
        let now = Instant::now();
        let elapsed = now.duration_since(counter.window_start);

        if elapsed >= self.window_duration * 2 {
            return self.max_requests;
        }

        let elapsed_in_window = elapsed.as_secs_f64() % self.window_duration.as_secs_f64();
        let weight = elapsed_in_window / self.window_duration.as_secs_f64();
        let estimated = (counter.previous_count as f64 * (1.0 - weight))
            + counter.current_count as f64;

        self.max_requests.saturating_sub(estimated.ceil() as u64)
    }
}
```

The key insight here is using a two-level locking strategy. The outer `RwLock` protects the HashMap, while each counter has its own lock. This means requests for different keys do not block each other.

---

## Integration with Actix Web

Here is how to use our rate limiter as Actix Web middleware:

```rust
// src/actix_middleware.rs

use actix_web::{
    dev::{Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpResponse,
    http::header::{HeaderName, HeaderValue},
};
use futures::future::{ok, Ready, LocalBoxFuture};
use std::task::{Context, Poll};

use crate::concurrent_limiter::ConcurrentRateLimiter;

pub struct RateLimitMiddleware {
    limiter: ConcurrentRateLimiter,
}

impl RateLimitMiddleware {
    pub fn new(max_requests: u64, window_seconds: u64) -> Self {
        Self {
            limiter: ConcurrentRateLimiter::new(max_requests, window_seconds),
        }
    }
}

impl<Svc, Bd> Transform<Svc, ServiceRequest> for RateLimitMiddleware
where
    Svc: Service<ServiceRequest, Response = ServiceResponse<Bd>, Error = Error> + 'static,
    Bd: 'static,
{
    type Response = ServiceResponse<Bd>;
    type Error = Error;
    type Transform = RateLimitMiddlewareService<Svc>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: Svc) -> Self::Future {
        ok(RateLimitMiddlewareService {
            service,
            limiter: self.limiter.clone(),
        })
    }
}

pub struct RateLimitMiddlewareService<Svc> {
    service: Svc,
    limiter: ConcurrentRateLimiter,
}

impl<Svc, Bd> Service<ServiceRequest> for RateLimitMiddlewareService<Svc>
where
    Svc: Service<ServiceRequest, Response = ServiceResponse<Bd>, Error = Error> + 'static,
    Bd: 'static,
{
    type Response = ServiceResponse<Bd>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // Extract client IP as the rate limit key
        let key = req
            .connection_info()
            .realip_remote_addr()
            .unwrap_or("unknown")
            .to_string();

        if !self.limiter.check(&key) {
            // Rate limit exceeded
            let response = HttpResponse::TooManyRequests()
                .insert_header(("Retry-After", "60"))
                .insert_header(("X-RateLimit-Remaining", "0"))
                .body("Rate limit exceeded");

            return Box::pin(async move {
                Ok(req.into_response(response).map_into_boxed_body())
            });
        }

        let remaining = self.limiter.remaining(&key);
        let fut = self.service.call(req);

        Box::pin(async move {
            let mut res = fut.await?;
            // Add rate limit headers to successful responses
            res.headers_mut().insert(
                HeaderName::from_static("x-ratelimit-remaining"),
                HeaderValue::from_str(&remaining.to_string()).unwrap(),
            );
            Ok(res)
        })
    }
}
```

And in your main application:

```rust
// src/main.rs (Actix Web example)

use actix_web::{web, App, HttpServer, HttpResponse};

mod concurrent_limiter;
mod actix_middleware;

use actix_middleware::RateLimitMiddleware;

async fn hello() -> HttpResponse {
    HttpResponse::Ok().body("Hello, world!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            // 100 requests per 60 seconds
            .wrap(RateLimitMiddleware::new(100, 60))
            .route("/", web::get().to(hello))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

---

## Integration with Axum

If you prefer Axum, here is an equivalent implementation using tower middleware:

```rust
// src/axum_layer.rs

use axum::{
    body::Body,
    http::{Request, Response, StatusCode},
};
use std::task::{Context, Poll};
use tower::{Layer, Service};
use std::future::Future;
use std::pin::Pin;

use crate::concurrent_limiter::ConcurrentRateLimiter;

#[derive(Clone)]
pub struct RateLimitLayer {
    limiter: ConcurrentRateLimiter,
}

impl RateLimitLayer {
    pub fn new(max_requests: u64, window_seconds: u64) -> Self {
        Self {
            limiter: ConcurrentRateLimiter::new(max_requests, window_seconds),
        }
    }
}

impl<Svc> Layer<Svc> for RateLimitLayer {
    type Service = RateLimitService<Svc>;

    fn layer(&self, inner: Svc) -> Self::Service {
        RateLimitService {
            inner,
            limiter: self.limiter.clone(),
        }
    }
}

#[derive(Clone)]
pub struct RateLimitService<Svc> {
    inner: Svc,
    limiter: ConcurrentRateLimiter,
}

impl<Svc> Service<Request<Body>> for RateLimitService<Svc>
where
    Svc: Service<Request<Body>, Response = Response<Body>> + Clone + Send + 'static,
    Svc::Future: Send,
{
    type Response = Response<Body>;
    type Error = Svc::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<Body>) -> Self::Future {
        // Extract IP from request headers or connection
        let key = req
            .headers()
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.split(',').next().unwrap_or("unknown").trim())
            .unwrap_or("unknown")
            .to_string();

        if !self.limiter.check(&key) {
            return Box::pin(async move {
                Ok(Response::builder()
                    .status(StatusCode::TOO_MANY_REQUESTS)
                    .header("Retry-After", "60")
                    .header("X-RateLimit-Remaining", "0")
                    .body(Body::from("Rate limit exceeded"))
                    .unwrap())
            });
        }

        let mut inner = self.inner.clone();
        Box::pin(async move { inner.call(req).await })
    }
}
```

---

## Memory Management

One thing we have not addressed is cleaning up old entries. If you have millions of unique clients, the HashMap will grow unbounded. Here is a simple cleanup strategy:

```rust
impl ConcurrentRateLimiter {
    /// Remove entries that have not been accessed recently
    pub fn cleanup(&self) {
        let mut counters = self.counters.write().unwrap();
        let now = Instant::now();
        let threshold = self.window_duration * 2;

        counters.retain(|_, counter_arc| {
            let counter = counter_arc.read().unwrap();
            now.duration_since(counter.window_start) < threshold
        });
    }
}
```

Call this periodically from a background task:

```rust
// Run cleanup every 5 minutes
tokio::spawn(async move {
    let mut interval = tokio::time::interval(Duration::from_secs(300));
    loop {
        interval.tick().await;
        limiter.cleanup();
    }
});
```

---

## Testing Your Rate Limiter

Here is a basic test to verify the sliding window behavior:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_basic_limiting() {
        let mut limiter = RateLimiter::new(5, 1); // 5 requests per second

        // First 5 should succeed
        for _ in 0..5 {
            assert!(limiter.check("test"));
        }

        // 6th should fail
        assert!(!limiter.check("test"));

        // Wait for window to pass
        thread::sleep(Duration::from_secs(1));

        // Should work again
        assert!(limiter.check("test"));
    }

    #[test]
    fn test_sliding_behavior() {
        let mut limiter = RateLimiter::new(10, 2); // 10 per 2 seconds

        // Use 5 requests
        for _ in 0..5 {
            assert!(limiter.check("test"));
        }

        // Wait 1 second (half the window)
        thread::sleep(Duration::from_secs(1));

        // Should have about 7-8 remaining due to sliding window
        // (5 * 0.5 weight from previous + current)
        let remaining = limiter.remaining("test");
        assert!(remaining >= 7 && remaining <= 8);
    }
}
```

---

## Conclusion

Building a rate limiter in Rust is a great exercise in understanding both the algorithm and Rust's concurrency primitives. The sliding window counter approach gives you accuracy without the memory overhead of storing individual timestamps.

A few things to keep in mind for production use:

- Consider using `dashmap` instead of `RwLock<HashMap>` for better concurrent performance
- Add metrics to track rate limit hits for monitoring
- Implement different limits for different endpoints or user tiers
- For distributed systems, you will need Redis or a similar shared store

The code in this post should give you a solid foundation to build on. Rate limiting is one of those features that seems simple until you actually implement it - but with Rust's type system catching errors at compile time, you can be confident your limiter will behave correctly under load.

---

*Building APIs that need rate limiting and observability? [OneUptime](https://oneuptime.com) provides API monitoring with built-in rate limit tracking to help you understand your traffic patterns.*

**Related Reading:**
- [How to Implement Rate Limiting in Node.js Without External Services](https://oneuptime.com/blog/post/2026-01-06-nodejs-rate-limiting-no-external-services/view)
- [How to Implement Rate Limiting in FastAPI Without External Services](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
