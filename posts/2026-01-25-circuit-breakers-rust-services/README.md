# How to Implement Circuit Breakers in Rust Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Circuit Breaker, Resilience, Fault Tolerance, Microservices

Description: A hands-on guide to implementing the circuit breaker pattern in Rust services, protecting your systems from cascading failures and improving overall reliability.

---

## Why Circuit Breakers Matter

When a downstream service starts failing, the natural instinct is to keep retrying. But this approach often makes things worse. Your service ties up threads waiting for responses that never come, your connection pools fill up, and soon the failure spreads upstream. One unhealthy service takes down the entire system.

Circuit breakers solve this problem by failing fast when a dependency is unhealthy. Instead of waiting for timeouts on every request, the circuit breaker tracks failures and opens the circuit when things go wrong. While open, requests fail immediately without attempting the call. After a cooling-off period, the circuit allows a few test requests through to see if the dependency has recovered.

The pattern comes from electrical engineering. When too much current flows through a wire, a circuit breaker trips to prevent a fire. In software, we trip the breaker when too many requests fail to prevent cascading failures.

## The Three States

A circuit breaker moves through three states:

- **Closed**: Normal operation. Requests flow through, and the breaker monitors for failures.
- **Open**: The circuit has tripped. Requests fail immediately without calling the downstream service.
- **Half-Open**: Testing recovery. A limited number of requests go through to check if the service is healthy again.

## Building a Circuit Breaker in Rust

Let's build a circuit breaker from scratch. We'll start with the state machine and then add the logic for tracking failures and transitioning between states.

```rust
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::RwLock;
use std::time::{Duration, Instant};

// The three possible states of our circuit breaker
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

pub struct CircuitBreaker {
    state: RwLock<CircuitState>,
    failure_count: AtomicU64,
    success_count: AtomicU64,
    last_failure_time: RwLock<Option<Instant>>,
    // Configuration
    failure_threshold: u64,
    success_threshold: u64,
    timeout: Duration,
}
```

The struct holds our state machine along with counters for tracking successes and failures. The thresholds determine when the circuit opens and when it can close again.

## Implementing State Transitions

Now let's add the methods that make the circuit breaker work:

```rust
impl CircuitBreaker {
    pub fn new(
        failure_threshold: u64,
        success_threshold: u64,
        timeout: Duration,
    ) -> Self {
        CircuitBreaker {
            state: RwLock::new(CircuitState::Closed),
            failure_count: AtomicU64::new(0),
            success_count: AtomicU64::new(0),
            last_failure_time: RwLock::new(None),
            failure_threshold,
            success_threshold,
            timeout,
        }
    }

    // Check if we should allow a request through
    pub fn can_execute(&self) -> bool {
        let state = *self.state.read().unwrap();

        match state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                // Check if timeout has elapsed
                if let Some(last_failure) = *self.last_failure_time.read().unwrap() {
                    if last_failure.elapsed() >= self.timeout {
                        // Transition to half-open
                        let mut state_guard = self.state.write().unwrap();
                        *state_guard = CircuitState::HalfOpen;
                        self.success_count.store(0, Ordering::SeqCst);
                        return true;
                    }
                }
                false
            }
            CircuitState::HalfOpen => true,
        }
    }

    // Record a successful call
    pub fn record_success(&self) {
        let state = *self.state.read().unwrap();

        match state {
            CircuitState::Closed => {
                // Reset failure count on success
                self.failure_count.store(0, Ordering::SeqCst);
            }
            CircuitState::HalfOpen => {
                let count = self.success_count.fetch_add(1, Ordering::SeqCst) + 1;
                if count >= self.success_threshold {
                    // Enough successes - close the circuit
                    let mut state_guard = self.state.write().unwrap();
                    *state_guard = CircuitState::Closed;
                    self.failure_count.store(0, Ordering::SeqCst);
                }
            }
            CircuitState::Open => {}
        }
    }

    // Record a failed call
    pub fn record_failure(&self) {
        let state = *self.state.read().unwrap();

        match state {
            CircuitState::Closed => {
                let count = self.failure_count.fetch_add(1, Ordering::SeqCst) + 1;
                if count >= self.failure_threshold {
                    // Too many failures - open the circuit
                    let mut state_guard = self.state.write().unwrap();
                    *state_guard = CircuitState::Open;
                    *self.last_failure_time.write().unwrap() = Some(Instant::now());
                }
            }
            CircuitState::HalfOpen => {
                // Any failure in half-open goes back to open
                let mut state_guard = self.state.write().unwrap();
                *state_guard = CircuitState::Open;
                *self.last_failure_time.write().unwrap() = Some(Instant::now());
            }
            CircuitState::Open => {}
        }
    }
}
```

The key insight here is that we use atomic operations for counters but `RwLock` for state transitions. This keeps the common path fast while ensuring state changes happen atomically.

## Using the Circuit Breaker

Here's how you'd wrap an HTTP client call with the circuit breaker:

```rust
use reqwest::Client;
use std::time::Duration;

pub struct ProtectedHttpClient {
    client: Client,
    circuit_breaker: CircuitBreaker,
    base_url: String,
}

impl ProtectedHttpClient {
    pub fn new(base_url: String) -> Self {
        ProtectedHttpClient {
            client: Client::new(),
            circuit_breaker: CircuitBreaker::new(
                5,                          // Open after 5 failures
                3,                          // Close after 3 successes
                Duration::from_secs(30),    // Wait 30s before testing
            ),
            base_url,
        }
    }

    pub async fn get(&self, path: &str) -> Result<String, ClientError> {
        // Check circuit state first
        if !self.circuit_breaker.can_execute() {
            return Err(ClientError::CircuitOpen);
        }

        // Attempt the request
        let url = format!("{}{}", self.base_url, path);
        match self.client.get(&url).send().await {
            Ok(response) if response.status().is_success() => {
                self.circuit_breaker.record_success();
                Ok(response.text().await.unwrap_or_default())
            }
            Ok(response) => {
                // 5xx errors count as failures
                if response.status().is_server_error() {
                    self.circuit_breaker.record_failure();
                }
                Err(ClientError::ServerError(response.status().as_u16()))
            }
            Err(e) => {
                self.circuit_breaker.record_failure();
                Err(ClientError::NetworkError(e.to_string()))
            }
        }
    }
}

#[derive(Debug)]
pub enum ClientError {
    CircuitOpen,
    ServerError(u16),
    NetworkError(String),
}
```

Notice that we only count server errors (5xx) and network failures against the circuit. Client errors like 404 indicate a problem with our request, not with the downstream service.

## Production Considerations

The basic implementation above works, but production systems need a few more features.

### Sliding Windows

Instead of simple counters, use sliding time windows. A burst of 5 failures in one second is more concerning than 5 failures spread over an hour. The `failsafe-rs` crate provides windowed failure tracking out of the box.

### Metrics and Observability

Your circuit breakers should emit metrics so you can see when they trip:

```rust
// Using the metrics crate
use metrics::{counter, gauge};

pub fn record_circuit_state(&self, service_name: &str) {
    let state = *self.state.read().unwrap();
    let state_value = match state {
        CircuitState::Closed => 0,
        CircuitState::HalfOpen => 1,
        CircuitState::Open => 2,
    };
    gauge!("circuit_breaker_state", "service" => service_name.to_string())
        .set(state_value as f64);
}

pub fn record_rejection(&self, service_name: &str) {
    counter!("circuit_breaker_rejections", "service" => service_name.to_string())
        .increment(1);
}
```

Feed these metrics into OneUptime or your observability platform to alert when circuits open.

### Fallbacks

When the circuit is open, don't just return an error. Provide a fallback when possible - cached data, a default response, or a call to an alternative service.

```rust
pub async fn get_user(&self, user_id: u64) -> User {
    match self.user_service.get(user_id).await {
        Ok(user) => user,
        Err(ClientError::CircuitOpen) => {
            // Return cached user or a minimal default
            self.cache.get_user(user_id).unwrap_or_else(|| User::default())
        }
        Err(_) => User::default(),
    }
}
```

## Existing Crates

If you prefer not to roll your own, several Rust crates implement circuit breakers:

- **failsafe-rs**: Full-featured with sliding windows, backoff, and async support
- **recloser**: Minimal implementation focused on simplicity
- **tower**: The `tower` middleware ecosystem includes circuit breaker support

For most production use cases, `failsafe-rs` hits the right balance of features and simplicity.

## When Not to Use Circuit Breakers

Circuit breakers add complexity. Skip them when:

- The downstream service is idempotent and you can safely retry indefinitely
- You're calling services with their own rate limiting that provides backpressure
- The call is fire-and-forget and failures don't affect the user

## Wrapping Up

Circuit breakers are essential for building resilient distributed systems. They prevent cascading failures by failing fast when dependencies are unhealthy, and they automatically recover when services come back online.

The pattern is straightforward to implement in Rust thanks to the type system and excellent concurrency primitives. Start with the basic implementation, add metrics so you can see what's happening, and provide fallbacks where possible. Your on-call rotation will thank you.
