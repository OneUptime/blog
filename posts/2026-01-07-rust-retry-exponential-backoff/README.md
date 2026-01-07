# How to Implement Retry Logic with Exponential Backoff in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Retry, Exponential Backoff, Resilience, Circuit Breaker, Error Handling, backoff, tokio-retry

Description: Learn how to implement retry logic with exponential backoff in Rust using the backoff and tokio-retry crates. This guide covers retry strategies, circuit breakers, jitter, and best practices for resilient applications.

---

> Network calls fail. Services go down. Databases get overloaded. The difference between a brittle system and a resilient one is how it handles these inevitable failures. Retry logic with exponential backoff gives your system the ability to recover from transient failures automatically.

This guide covers retry strategies from simple loops to production-ready implementations with circuit breakers and proper error classification.

---

## Why Exponential Backoff?

Fixed-interval retries can overwhelm recovering services:

```
Retry 1: wait 1s → Service still down
Retry 2: wait 1s → Service still down
Retry 3: wait 1s → Service recovering but flooded
```

Exponential backoff gives services time to recover:

```
Retry 1: wait 1s  → Service still down
Retry 2: wait 2s  → Service still down
Retry 3: wait 4s  → Service recovered, request succeeds
```

---

## Using the backoff Crate

The `backoff` crate provides configurable retry strategies with async support.

### Setup

```toml
[dependencies]
backoff = { version = "0.4", features = ["tokio"] }
tokio = { version = "1", features = ["full"] }
thiserror = "1"
```

### Basic Retry

```rust
// src/retry.rs
// Basic retry with exponential backoff

use backoff::{backoff::Backoff, ExponentialBackoff, ExponentialBackoffBuilder};
use std::time::Duration;

/// Configure exponential backoff parameters
fn create_backoff() -> ExponentialBackoff {
    ExponentialBackoffBuilder::new()
        .with_initial_interval(Duration::from_millis(100))  // First retry wait
        .with_randomization_factor(0.5)  // Jitter: 50-150% of interval
        .with_multiplier(2.0)  // Double wait time each retry
        .with_max_interval(Duration::from_secs(30))  // Cap maximum wait
        .with_max_elapsed_time(Some(Duration::from_secs(300)))  // Total timeout
        .build()
}

/// Retry an async operation with exponential backoff
pub async fn retry_with_backoff<F, Fut, T, E>(
    operation: F,
) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, backoff::Error<E>>>,
{
    backoff::future::retry(create_backoff(), operation).await
}

// Example: Retry an HTTP request
use reqwest::Client;

async fn fetch_with_retry(client: &Client, url: &str) -> Result<String, reqwest::Error> {
    let operation = || async {
        client
            .get(url)
            .send()
            .await?
            .text()
            .await
            .map_err(backoff::Error::transient)  // Mark as retryable
    };

    backoff::future::retry(create_backoff(), operation).await
}
```

### Error Classification

Not all errors should be retried. Classify errors as permanent or transient.

```rust
// src/retry.rs (continued)
// Error classification for smart retries

use backoff::Error as BackoffError;
use reqwest::StatusCode;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Rate limited")]
    RateLimited,

    #[error("Server error: {0}")]
    Server(String),

    #[error("Client error: {0}")]
    Client(String),

    #[error("Not found")]
    NotFound,
}

/// Classify HTTP errors for retry decisions
fn classify_error(error: reqwest::Error) -> BackoffError<ServiceError> {
    if error.is_connect() || error.is_timeout() {
        // Network issues are transient - retry
        BackoffError::transient(ServiceError::Network(error))
    } else if let Some(status) = error.status() {
        classify_status(status, error)
    } else {
        // Unknown errors - don't retry
        BackoffError::permanent(ServiceError::Network(error))
    }
}

/// Classify HTTP status codes
fn classify_status(status: StatusCode, error: reqwest::Error) -> BackoffError<ServiceError> {
    match status.as_u16() {
        // Client errors - don't retry (except rate limiting)
        400 => BackoffError::permanent(ServiceError::Client("Bad request".into())),
        401 | 403 => BackoffError::permanent(ServiceError::Client("Unauthorized".into())),
        404 => BackoffError::permanent(ServiceError::NotFound),

        // Rate limited - retry with backoff
        429 => BackoffError::transient(ServiceError::RateLimited),

        // Server errors - retry
        500..=599 => BackoffError::transient(ServiceError::Server(status.to_string())),

        // Other - don't retry
        _ => BackoffError::permanent(ServiceError::Network(error)),
    }
}

/// Fetch with error classification
pub async fn fetch_classified(client: &Client, url: &str) -> Result<String, ServiceError> {
    let operation = || async {
        let response = client
            .get(url)
            .send()
            .await
            .map_err(classify_error)?;

        let status = response.status();
        if !status.is_success() {
            return Err(classify_status(status, reqwest::Error::from(
                std::io::Error::new(std::io::ErrorKind::Other, "HTTP error")
            )));
        }

        response
            .text()
            .await
            .map_err(|e| BackoffError::permanent(ServiceError::Network(e)))
    };

    backoff::future::retry(create_backoff(), operation).await
}
```

---

## Using tokio-retry

`tokio-retry` provides a more flexible API with custom retry conditions.

### Setup

```toml
[dependencies]
tokio-retry = "0.3"
tokio = { version = "1", features = ["full"] }
```

### Basic Usage

```rust
// src/tokio_retry_example.rs
// Retry with tokio-retry

use std::time::Duration;
use tokio_retry::{
    strategy::{ExponentialBackoff, jitter},
    Retry,
};

/// Create retry strategy with jitter
fn retry_strategy() -> impl Iterator<Item = Duration> {
    ExponentialBackoff::from_millis(100)
        .factor(2)              // Double each time
        .max_delay(Duration::from_secs(30))  // Cap at 30s
        .map(jitter)            // Add randomization
        .take(5)                // Max 5 retries
}

/// Retry with custom condition
pub async fn fetch_with_condition(url: &str) -> Result<String, reqwest::Error> {
    let client = reqwest::Client::new();

    Retry::spawn(retry_strategy(), || async {
        client.get(url).send().await?.text().await
    })
    .await
}

/// Retry with condition function
pub async fn fetch_with_retry_if<F>(
    url: &str,
    should_retry: F,
) -> Result<String, reqwest::Error>
where
    F: Fn(&reqwest::Error) -> bool,
{
    let client = reqwest::Client::new();

    let action = || async {
        client.get(url).send().await?.text().await
    };

    tokio_retry::RetryIf::spawn(retry_strategy(), action, should_retry).await
}

// Usage example
async fn example() {
    // Only retry on timeout errors
    let result = fetch_with_retry_if(
        "https://api.example.com/data",
        |e| e.is_timeout(),
    ).await;
}
```

---

## Circuit Breaker Pattern

Prevent cascading failures by stopping retries when a service is consistently failing.

```rust
// src/circuit_breaker.rs
// Circuit breaker implementation

use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CircuitState {
    Closed,    // Normal operation
    Open,      // Failing - reject requests
    HalfOpen,  // Testing if service recovered
}

pub struct CircuitBreaker {
    state: RwLock<CircuitState>,
    failure_count: AtomicU32,
    success_count: AtomicU32,
    last_failure_time: RwLock<Option<Instant>>,

    // Configuration
    failure_threshold: u32,
    success_threshold: u32,
    timeout: Duration,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, success_threshold: u32, timeout: Duration) -> Self {
        Self {
            state: RwLock::new(CircuitState::Closed),
            failure_count: AtomicU32::new(0),
            success_count: AtomicU32::new(0),
            last_failure_time: RwLock::new(None),
            failure_threshold,
            success_threshold,
            timeout,
        }
    }

    /// Check if request should be allowed
    pub async fn can_execute(&self) -> bool {
        let state = *self.state.read().await;

        match state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                // Check if timeout has elapsed
                if let Some(last_failure) = *self.last_failure_time.read().await {
                    if last_failure.elapsed() > self.timeout {
                        // Transition to half-open
                        *self.state.write().await = CircuitState::HalfOpen;
                        return true;
                    }
                }
                false
            }
            CircuitState::HalfOpen => true,  // Allow test request
        }
    }

    /// Record a successful call
    pub async fn record_success(&self) {
        self.failure_count.store(0, Ordering::SeqCst);

        let state = *self.state.read().await;
        if state == CircuitState::HalfOpen {
            let count = self.success_count.fetch_add(1, Ordering::SeqCst) + 1;
            if count >= self.success_threshold {
                // Recovered - close circuit
                *self.state.write().await = CircuitState::Closed;
                self.success_count.store(0, Ordering::SeqCst);
                tracing::info!("Circuit breaker closed");
            }
        }
    }

    /// Record a failed call
    pub async fn record_failure(&self) {
        self.success_count.store(0, Ordering::SeqCst);
        let count = self.failure_count.fetch_add(1, Ordering::SeqCst) + 1;

        if count >= self.failure_threshold {
            // Open the circuit
            *self.state.write().await = CircuitState::Open;
            *self.last_failure_time.write().await = Some(Instant::now());
            self.failure_count.store(0, Ordering::SeqCst);
            tracing::warn!("Circuit breaker opened");
        }
    }

    /// Get current state
    pub async fn state(&self) -> CircuitState {
        *self.state.read().await
    }
}

/// Execute operation with circuit breaker
pub async fn with_circuit_breaker<F, Fut, T, E>(
    breaker: &CircuitBreaker,
    operation: F,
) -> Result<T, CircuitBreakerError<E>>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<T, E>>,
{
    if !breaker.can_execute().await {
        return Err(CircuitBreakerError::Open);
    }

    match operation().await {
        Ok(result) => {
            breaker.record_success().await;
            Ok(result)
        }
        Err(e) => {
            breaker.record_failure().await;
            Err(CircuitBreakerError::Inner(e))
        }
    }
}

#[derive(Debug)]
pub enum CircuitBreakerError<E> {
    Open,
    Inner(E),
}
```

---

## Combined Retry with Circuit Breaker

```rust
// src/resilient_client.rs
// HTTP client with retry and circuit breaker

use std::sync::Arc;
use std::time::Duration;

pub struct ResilientClient {
    client: reqwest::Client,
    circuit_breaker: Arc<CircuitBreaker>,
}

impl ResilientClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap(),
            circuit_breaker: Arc::new(CircuitBreaker::new(
                5,   // Open after 5 failures
                3,   // Close after 3 successes
                Duration::from_secs(30),  // Wait 30s before half-open
            )),
        }
    }

    /// Fetch with retry and circuit breaker
    pub async fn fetch(&self, url: &str) -> Result<String, ResilientError> {
        let breaker = self.circuit_breaker.clone();
        let client = self.client.clone();
        let url = url.to_string();

        let operation = || {
            let breaker = breaker.clone();
            let client = client.clone();
            let url = url.clone();

            async move {
                // Check circuit breaker first
                if !breaker.can_execute().await {
                    return Err(backoff::Error::transient(ResilientError::CircuitOpen));
                }

                // Make request
                match client.get(&url).send().await {
                    Ok(response) => {
                        if response.status().is_success() {
                            breaker.record_success().await;
                            response
                                .text()
                                .await
                                .map_err(|e| {
                                    breaker.record_failure();
                                    backoff::Error::transient(ResilientError::Network(e))
                                })
                        } else if response.status().is_server_error() {
                            breaker.record_failure().await;
                            Err(backoff::Error::transient(ResilientError::Server(
                                response.status().as_u16()
                            )))
                        } else {
                            // Client error - don't retry
                            Err(backoff::Error::permanent(ResilientError::Client(
                                response.status().as_u16()
                            )))
                        }
                    }
                    Err(e) => {
                        breaker.record_failure().await;
                        if e.is_timeout() || e.is_connect() {
                            Err(backoff::Error::transient(ResilientError::Network(e)))
                        } else {
                            Err(backoff::Error::permanent(ResilientError::Network(e)))
                        }
                    }
                }
            }
        };

        let backoff = ExponentialBackoffBuilder::new()
            .with_max_elapsed_time(Some(Duration::from_secs(60)))
            .build();

        backoff::future::retry(backoff, operation).await
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ResilientError {
    #[error("Circuit breaker open")]
    CircuitOpen,

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Server error: {0}")]
    Server(u16),

    #[error("Client error: {0}")]
    Client(u16),
}
```

---

## Retry with Context and Logging

```rust
// src/logged_retry.rs
// Retry with detailed logging

use tracing::{info, warn, instrument};

#[instrument(skip(operation), fields(attempt = tracing::field::Empty))]
pub async fn retry_with_logging<F, Fut, T, E>(
    operation_name: &str,
    max_attempts: u32,
    operation: F,
) -> Result<T, E>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T, E>>,
    E: std::fmt::Debug,
{
    let backoff = ExponentialBackoffBuilder::new()
        .with_max_elapsed_time(Some(Duration::from_secs(60)))
        .build();

    let mut attempt = 0u32;

    let operation_with_logging = || {
        attempt += 1;
        tracing::Span::current().record("attempt", attempt);

        let fut = operation();

        async move {
            match fut.await {
                Ok(result) => {
                    if attempt > 1 {
                        info!(
                            operation = operation_name,
                            attempt,
                            "Operation succeeded after retry"
                        );
                    }
                    Ok(result)
                }
                Err(e) => {
                    warn!(
                        operation = operation_name,
                        attempt,
                        error = ?e,
                        "Operation failed, will retry"
                    );
                    Err(backoff::Error::transient(e))
                }
            }
        }
    };

    backoff::future::retry(backoff, operation_with_logging).await
}
```

---

## Best Practices

| Practice | Why |
|----------|-----|
| Classify errors | Only retry transient failures |
| Add jitter | Prevent thundering herd |
| Set max retries | Don't retry forever |
| Use circuit breaker | Protect downstream services |
| Log retries | Debug retry storms |
| Set timeouts | Fail fast on hung requests |
| Respect Retry-After | Honor server backoff requests |

---

## Common Retry Patterns

```rust
// Quick reference for common patterns

// 1. Simple exponential backoff
let backoff = ExponentialBackoff::default();

// 2. Capped backoff
let backoff = ExponentialBackoffBuilder::new()
    .with_max_interval(Duration::from_secs(60))
    .build();

// 3. Limited attempts
let strategy = ExponentialBackoff::from_millis(100)
    .take(5);  // Max 5 attempts

// 4. With jitter
let strategy = ExponentialBackoff::from_millis(100)
    .map(jitter);

// 5. Immediate first retry
let strategy = std::iter::once(Duration::ZERO)
    .chain(ExponentialBackoff::from_millis(100));
```

---

*Need to monitor retry rates in your services? [OneUptime](https://oneuptime.com) provides service reliability monitoring with retry and error rate tracking.*

**Related Reading:**
- [How to Build a Job Queue in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-job-queue-tokio-redis/view)
- [How to Implement Rate Limiting in Rust](https://oneuptime.com/blog/post/2026-01-07-rust-rate-limiting/view)
