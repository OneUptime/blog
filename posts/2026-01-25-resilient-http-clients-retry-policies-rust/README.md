# How to Build Resilient HTTP Clients with Retry Policies in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, HTTP Client, Retry, Resilience, reqwest

Description: Learn how to build production-ready HTTP clients in Rust with retry policies, exponential backoff, and circuit breakers using reqwest and custom middleware.

---

Network requests fail. DNS hiccups, connection resets, and server timeouts are daily realities in distributed systems. The difference between a frustrating user experience and a smooth one often comes down to how your HTTP client handles these transient failures. In Rust, we can build HTTP clients that gracefully retry failed requests while protecting downstream services from being overwhelmed.

This guide walks through building resilient HTTP clients in Rust, starting with basic retry logic and progressing to production-ready patterns with exponential backoff, jitter, and circuit breakers.

## Setting Up the Project

First, add the necessary dependencies to your `Cargo.toml`:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rand = "0.8"
thiserror = "1.0"
```

## Basic Retry Logic

The simplest retry implementation wraps your HTTP call in a loop. This works, but has problems we will address shortly.

```rust
use reqwest::Client;
use std::time::Duration;
use tokio::time::sleep;

// Simple retry function - retries a fixed number of times with fixed delay
// This is a starting point, not production-ready
async fn fetch_with_retry(
    client: &Client,
    url: &str,
    max_attempts: u32,
) -> Result<String, reqwest::Error> {
    let mut last_error = None;

    for attempt in 1..=max_attempts {
        match client.get(url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    return response.text().await;
                }
                // Server returned an error status
                println!("Attempt {}: Server returned {}", attempt, response.status());
            }
            Err(e) => {
                println!("Attempt {}: Request failed - {}", attempt, e);
                last_error = Some(e);
            }
        }

        if attempt < max_attempts {
            // Fixed delay between retries
            sleep(Duration::from_secs(1)).await;
        }
    }

    Err(last_error.unwrap())
}
```

The problem with fixed delays is the thundering herd effect. When a service goes down and comes back up, all clients retry simultaneously, potentially bringing it down again. Exponential backoff solves this.

## Exponential Backoff with Jitter

Exponential backoff increases the delay between each retry attempt. Adding jitter (randomness) prevents synchronized retries across multiple clients.

```rust
use rand::Rng;
use std::time::Duration;

// Configuration for retry behavior
#[derive(Clone)]
pub struct RetryConfig {
    pub max_attempts: u32,
    pub initial_delay_ms: u64,
    pub max_delay_ms: u64,
    pub multiplier: f64,
    pub jitter: bool,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay_ms: 100,
            max_delay_ms: 10_000,
            multiplier: 2.0,
            jitter: true,
        }
    }
}

// Calculate delay with exponential backoff and optional jitter
fn calculate_delay(config: &RetryConfig, attempt: u32) -> Duration {
    // Base delay grows exponentially: initial * multiplier^attempt
    let base_delay = config.initial_delay_ms as f64
        * config.multiplier.powi(attempt as i32 - 1);

    // Cap at maximum delay
    let capped_delay = base_delay.min(config.max_delay_ms as f64);

    // Add jitter to prevent synchronized retries
    let final_delay = if config.jitter {
        let mut rng = rand::thread_rng();
        // Full jitter: random value between 0 and capped_delay
        rng.gen_range(0.0..capped_delay)
    } else {
        capped_delay
    };

    Duration::from_millis(final_delay as u64)
}
```

## A Reusable Retry Client

Now let's build a proper HTTP client with built-in retry logic. This implementation handles both network errors and retryable HTTP status codes.

```rust
use reqwest::{Client, Response, StatusCode};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RetryClientError {
    #[error("Request failed after {attempts} attempts: {message}")]
    MaxRetriesExceeded { attempts: u32, message: String },

    #[error("Non-retryable error: {0}")]
    NonRetryable(#[from] reqwest::Error),
}

// HTTP status codes that indicate a transient failure worth retrying
fn is_retryable_status(status: StatusCode) -> bool {
    matches!(
        status,
        StatusCode::REQUEST_TIMEOUT          // 408
        | StatusCode::TOO_MANY_REQUESTS      // 429
        | StatusCode::INTERNAL_SERVER_ERROR  // 500
        | StatusCode::BAD_GATEWAY            // 502
        | StatusCode::SERVICE_UNAVAILABLE    // 503
        | StatusCode::GATEWAY_TIMEOUT        // 504
    )
}

// Check if a reqwest error is worth retrying
fn is_retryable_error(error: &reqwest::Error) -> bool {
    error.is_timeout()
        || error.is_connect()
        || error.is_request()
}

pub struct RetryClient {
    client: Client,
    config: RetryConfig,
}

impl RetryClient {
    pub fn new(config: RetryConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self { client, config }
    }

    pub async fn get(&self, url: &str) -> Result<Response, RetryClientError> {
        let mut last_error_msg = String::new();

        for attempt in 1..=self.config.max_attempts {
            match self.client.get(url).send().await {
                Ok(response) => {
                    let status = response.status();

                    // Success - return the response
                    if status.is_success() {
                        return Ok(response);
                    }

                    // Check if we should retry this status code
                    if is_retryable_status(status) && attempt < self.config.max_attempts {
                        last_error_msg = format!("HTTP {}", status);

                        // Respect Retry-After header if present
                        let delay = self.get_retry_delay(&response, attempt);
                        println!(
                            "Attempt {}/{}: {} - retrying in {:?}",
                            attempt, self.config.max_attempts, status, delay
                        );
                        sleep(delay).await;
                        continue;
                    }

                    // Non-retryable status or max attempts reached
                    return Ok(response);
                }
                Err(e) => {
                    last_error_msg = e.to_string();

                    // Check if this error type is worth retrying
                    if !is_retryable_error(&e) {
                        return Err(RetryClientError::NonRetryable(e));
                    }

                    if attempt < self.config.max_attempts {
                        let delay = calculate_delay(&self.config, attempt);
                        println!(
                            "Attempt {}/{}: {} - retrying in {:?}",
                            attempt, self.config.max_attempts, e, delay
                        );
                        sleep(delay).await;
                    }
                }
            }
        }

        Err(RetryClientError::MaxRetriesExceeded {
            attempts: self.config.max_attempts,
            message: last_error_msg,
        })
    }

    // Check for Retry-After header and use it if present
    fn get_retry_delay(&self, response: &Response, attempt: u32) -> Duration {
        if let Some(retry_after) = response.headers().get("retry-after") {
            if let Ok(seconds) = retry_after.to_str().unwrap_or("").parse::<u64>() {
                // Cap the server-requested delay at our max
                return Duration::from_secs(seconds.min(self.config.max_delay_ms / 1000));
            }
        }
        calculate_delay(&self.config, attempt)
    }
}
```

## Adding a Circuit Breaker

When a service is consistently failing, there is no point hammering it with retries. A circuit breaker tracks failures and "opens" when a threshold is reached, failing fast without making network calls. After a cooldown period, it allows a test request through to see if the service has recovered.

```rust
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CircuitState {
    Closed,    // Normal operation
    Open,      // Failing fast, no requests allowed
    HalfOpen,  // Testing if service recovered
}

pub struct CircuitBreaker {
    failure_count: AtomicU32,
    last_failure_time: AtomicU64,
    failure_threshold: u32,
    reset_timeout_ms: u64,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, reset_timeout_ms: u64) -> Self {
        Self {
            failure_count: AtomicU32::new(0),
            last_failure_time: AtomicU64::new(0),
            failure_threshold,
            reset_timeout_ms,
        }
    }

    pub fn state(&self) -> CircuitState {
        let failures = self.failure_count.load(Ordering::SeqCst);

        if failures < self.failure_threshold {
            return CircuitState::Closed;
        }

        // Check if enough time has passed to try again
        let last_failure = self.last_failure_time.load(Ordering::SeqCst);
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        if now - last_failure > self.reset_timeout_ms {
            CircuitState::HalfOpen
        } else {
            CircuitState::Open
        }
    }

    pub fn record_success(&self) {
        self.failure_count.store(0, Ordering::SeqCst);
    }

    pub fn record_failure(&self) {
        self.failure_count.fetch_add(1, Ordering::SeqCst);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        self.last_failure_time.store(now, Ordering::SeqCst);
    }
}
```

## Putting It All Together

Here is a complete resilient client that combines retry logic with circuit breaking:

```rust
use std::collections::HashMap;
use std::sync::RwLock;

pub struct ResilientClient {
    retry_client: RetryClient,
    circuit_breakers: RwLock<HashMap<String, Arc<CircuitBreaker>>>,
    circuit_config: (u32, u64), // (threshold, reset_timeout_ms)
}

impl ResilientClient {
    pub fn new(retry_config: RetryConfig) -> Self {
        Self {
            retry_client: RetryClient::new(retry_config),
            circuit_breakers: RwLock::new(HashMap::new()),
            circuit_config: (5, 30_000), // Open after 5 failures, reset after 30s
        }
    }

    // Get or create a circuit breaker for a given host
    fn get_circuit_breaker(&self, host: &str) -> Arc<CircuitBreaker> {
        // Try read lock first
        if let Some(cb) = self.circuit_breakers.read().unwrap().get(host) {
            return Arc::clone(cb);
        }

        // Need to create one - acquire write lock
        let mut breakers = self.circuit_breakers.write().unwrap();
        breakers
            .entry(host.to_string())
            .or_insert_with(|| {
                Arc::new(CircuitBreaker::new(
                    self.circuit_config.0,
                    self.circuit_config.1,
                ))
            })
            .clone()
    }

    pub async fn get(&self, url: &str) -> Result<Response, RetryClientError> {
        // Extract host for circuit breaker
        let host = reqwest::Url::parse(url)
            .map(|u| u.host_str().unwrap_or("unknown").to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let circuit_breaker = self.get_circuit_breaker(&host);

        // Check circuit state before making request
        match circuit_breaker.state() {
            CircuitState::Open => {
                return Err(RetryClientError::MaxRetriesExceeded {
                    attempts: 0,
                    message: format!("Circuit breaker open for {}", host),
                });
            }
            CircuitState::HalfOpen => {
                println!("Circuit half-open for {} - testing with single request", host);
            }
            CircuitState::Closed => {}
        }

        // Make the request with retry logic
        match self.retry_client.get(url).await {
            Ok(response) => {
                if response.status().is_success() {
                    circuit_breaker.record_success();
                } else if is_retryable_status(response.status()) {
                    circuit_breaker.record_failure();
                }
                Ok(response)
            }
            Err(e) => {
                circuit_breaker.record_failure();
                Err(e)
            }
        }
    }
}
```

## Usage Example

```rust
#[tokio::main]
async fn main() {
    let config = RetryConfig {
        max_attempts: 4,
        initial_delay_ms: 100,
        max_delay_ms: 5_000,
        multiplier: 2.0,
        jitter: true,
    };

    let client = ResilientClient::new(config);

    match client.get("https://api.example.com/data").await {
        Ok(response) => {
            println!("Success: {}", response.status());
            let body = response.text().await.unwrap();
            println!("Body: {}", body);
        }
        Err(e) => {
            println!("Failed: {}", e);
        }
    }
}
```

## Key Takeaways

Building resilient HTTP clients requires more than just wrapping requests in a loop. Consider these patterns:

- **Exponential backoff** prevents overwhelming recovering services
- **Jitter** spreads out retry storms across clients
- **Circuit breakers** fail fast when services are down, giving them time to recover
- **Retry-After headers** let servers tell clients when to come back
- **Selective retries** avoid retrying non-transient errors like 400 Bad Request

These patterns work together. A request first checks the circuit breaker, then attempts the call with exponential backoff, and finally updates the circuit breaker based on the outcome. The result is a client that handles transient failures gracefully while protecting both your application and the services it depends on.

For production systems, consider adding observability through metrics on retry counts, circuit breaker state changes, and latency distributions. These signals help you tune your retry configuration and identify problematic dependencies before they cause outages.
