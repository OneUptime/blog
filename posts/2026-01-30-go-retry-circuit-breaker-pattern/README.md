# How to Implement Retry with Circuit Breaker Pattern in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Reliability, Patterns, Microservices

Description: Learn to implement retry logic with circuit breaker pattern in Go to handle transient failures, prevent cascade failures, and build resilient microservices.

---

Distributed systems fail. Networks timeout, services crash, databases become unavailable. The retry pattern handles transient failures by attempting operations multiple times. The circuit breaker pattern prevents cascade failures by stopping requests to failing services. Together, they form a powerful resilience strategy.

## Understanding the Problem

When Service A calls Service B, several things can go wrong:

| Failure Type | Description | Recovery Strategy |
|-------------|-------------|-------------------|
| Transient | Temporary network glitch, brief overload | Retry after short delay |
| Partial | Service degraded but responding | Retry with backoff |
| Complete | Service down or unreachable | Circuit breaker opens |
| Cascade | Failures spread across services | Circuit breaker prevents |

Without proper handling, a single failing service can bring down your entire system. Requests pile up, threads block, resources exhaust, and everything crashes.

## Basic Retry Logic

Start with a simple retry mechanism that attempts an operation multiple times before giving up.

```go
package retry

import (
    "errors"
    "time"
)

// RetryableFunc represents a function that can be retried
type RetryableFunc func() error

// Config holds retry configuration
type Config struct {
    MaxAttempts int
    Delay       time.Duration
}

// Do executes the function with retry logic
func Do(fn RetryableFunc, config Config) error {
    var lastErr error

    for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
        err := fn()
        if err == nil {
            return nil // Success
        }

        lastErr = err

        // Don't sleep after the last attempt
        if attempt < config.MaxAttempts {
            time.Sleep(config.Delay)
        }
    }

    return lastErr
}
```

Usage example:

```go
func main() {
    config := retry.Config{
        MaxAttempts: 3,
        Delay:       100 * time.Millisecond,
    }

    err := retry.Do(func() error {
        return callExternalAPI()
    }, config)

    if err != nil {
        log.Printf("Operation failed after retries: %v", err)
    }
}
```

The basic approach works but has problems. Fixed delays don't adapt to system conditions, and continuous retries can overwhelm a struggling service.

## Exponential Backoff

Exponential backoff increases the delay between retries, giving the failing service time to recover. Each retry waits longer than the previous one.

```go
package retry

import (
    "math"
    "math/rand"
    "time"
)

// BackoffConfig holds exponential backoff configuration
type BackoffConfig struct {
    MaxAttempts     int
    InitialDelay    time.Duration
    MaxDelay        time.Duration
    Multiplier      float64
    JitterFactor    float64 // 0.0 to 1.0
}

// DefaultBackoffConfig returns sensible defaults
func DefaultBackoffConfig() BackoffConfig {
    return BackoffConfig{
        MaxAttempts:  5,
        InitialDelay: 100 * time.Millisecond,
        MaxDelay:     30 * time.Second,
        Multiplier:   2.0,
        JitterFactor: 0.2,
    }
}

// calculateDelay computes the delay for a given attempt with jitter
func (c BackoffConfig) calculateDelay(attempt int) time.Duration {
    // Calculate base delay: initialDelay * multiplier^(attempt-1)
    delay := float64(c.InitialDelay) * math.Pow(c.Multiplier, float64(attempt-1))

    // Cap at max delay
    if delay > float64(c.MaxDelay) {
        delay = float64(c.MaxDelay)
    }

    // Add jitter to prevent thundering herd
    if c.JitterFactor > 0 {
        jitter := delay * c.JitterFactor * (rand.Float64()*2 - 1)
        delay = delay + jitter
    }

    return time.Duration(delay)
}

// DoWithBackoff executes with exponential backoff
func DoWithBackoff(fn RetryableFunc, config BackoffConfig) error {
    var lastErr error

    for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
        err := fn()
        if err == nil {
            return nil
        }

        lastErr = err

        if attempt < config.MaxAttempts {
            delay := config.calculateDelay(attempt)
            time.Sleep(delay)
        }
    }

    return lastErr
}
```

The jitter factor randomizes delays slightly. Without jitter, all clients retry at the same time after a failure (thundering herd problem), potentially causing another failure.

| Attempt | Base Delay | With Jitter (20%) |
|---------|-----------|-------------------|
| 1 | 100ms | 80ms - 120ms |
| 2 | 200ms | 160ms - 240ms |
| 3 | 400ms | 320ms - 480ms |
| 4 | 800ms | 640ms - 960ms |
| 5 | 1600ms | 1280ms - 1920ms |

## Circuit Breaker States

A circuit breaker has three states:

| State | Behavior | Transitions To |
|-------|----------|----------------|
| Closed | Requests pass through normally | Open (on failure threshold) |
| Open | Requests fail immediately | Half-Open (after timeout) |
| Half-Open | Limited requests allowed to test recovery | Closed (on success) or Open (on failure) |

```go
package circuitbreaker

import (
    "errors"
    "sync"
    "time"
)

// State represents the circuit breaker state
type State int

const (
    StateClosed State = iota
    StateOpen
    StateHalfOpen
)

func (s State) String() string {
    switch s {
    case StateClosed:
        return "closed"
    case StateOpen:
        return "open"
    case StateHalfOpen:
        return "half-open"
    default:
        return "unknown"
    }
}

var (
    ErrCircuitOpen = errors.New("circuit breaker is open")
)

// Config holds circuit breaker configuration
type Config struct {
    FailureThreshold   int           // Failures before opening
    SuccessThreshold   int           // Successes in half-open before closing
    Timeout            time.Duration // Time in open state before half-open
    HalfOpenMaxCalls   int           // Max concurrent calls in half-open
}

// DefaultConfig returns sensible defaults
func DefaultConfig() Config {
    return Config{
        FailureThreshold: 5,
        SuccessThreshold: 2,
        Timeout:          30 * time.Second,
        HalfOpenMaxCalls: 1,
    }
}

// CircuitBreaker implements the circuit breaker pattern
type CircuitBreaker struct {
    config         Config
    state          State
    failures       int
    successes      int
    lastFailure    time.Time
    halfOpenCalls  int
    mu             sync.Mutex
}

// New creates a new circuit breaker
func New(config Config) *CircuitBreaker {
    return &CircuitBreaker{
        config: config,
        state:  StateClosed,
    }
}

// Execute runs the function through the circuit breaker
func (cb *CircuitBreaker) Execute(fn func() error) error {
    if !cb.allowRequest() {
        return ErrCircuitOpen
    }

    err := fn()
    cb.recordResult(err)
    return err
}

// allowRequest checks if a request should be allowed
func (cb *CircuitBreaker) allowRequest() bool {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    switch cb.state {
    case StateClosed:
        return true

    case StateOpen:
        // Check if timeout has passed
        if time.Since(cb.lastFailure) > cb.config.Timeout {
            cb.toHalfOpen()
            return cb.tryHalfOpenCall()
        }
        return false

    case StateHalfOpen:
        return cb.tryHalfOpenCall()
    }

    return false
}

// tryHalfOpenCall attempts to allow a call in half-open state
func (cb *CircuitBreaker) tryHalfOpenCall() bool {
    if cb.halfOpenCalls < cb.config.HalfOpenMaxCalls {
        cb.halfOpenCalls++
        return true
    }
    return false
}

// recordResult records the result of an operation
func (cb *CircuitBreaker) recordResult(err error) {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    if err != nil {
        cb.onFailure()
    } else {
        cb.onSuccess()
    }
}

// onFailure handles a failed operation
func (cb *CircuitBreaker) onFailure() {
    switch cb.state {
    case StateClosed:
        cb.failures++
        if cb.failures >= cb.config.FailureThreshold {
            cb.toOpen()
        }

    case StateHalfOpen:
        cb.toOpen()
    }

    cb.lastFailure = time.Now()
}

// onSuccess handles a successful operation
func (cb *CircuitBreaker) onSuccess() {
    switch cb.state {
    case StateClosed:
        cb.failures = 0

    case StateHalfOpen:
        cb.halfOpenCalls--
        cb.successes++
        if cb.successes >= cb.config.SuccessThreshold {
            cb.toClosed()
        }
    }
}

// State transitions
func (cb *CircuitBreaker) toOpen() {
    cb.state = StateOpen
    cb.failures = 0
    cb.successes = 0
    cb.halfOpenCalls = 0
}

func (cb *CircuitBreaker) toHalfOpen() {
    cb.state = StateHalfOpen
    cb.failures = 0
    cb.successes = 0
    cb.halfOpenCalls = 0
}

func (cb *CircuitBreaker) toClosed() {
    cb.state = StateClosed
    cb.failures = 0
    cb.successes = 0
    cb.halfOpenCalls = 0
}

// State returns the current state
func (cb *CircuitBreaker) State() State {
    cb.mu.Lock()
    defer cb.mu.Unlock()
    return cb.state
}
```

## Combining Retry with Circuit Breaker

The real power comes from combining both patterns. Retry handles transient failures while the circuit breaker prevents hammering a broken service.

```go
package resilience

import (
    "context"
    "errors"
    "math"
    "math/rand"
    "sync"
    "time"
)

// RetryableError indicates an error that should trigger a retry
type RetryableError struct {
    Err error
}

func (e RetryableError) Error() string {
    return e.Err.Error()
}

func (e RetryableError) Unwrap() error {
    return e.Err
}

// IsRetryable checks if an error should be retried
func IsRetryable(err error) bool {
    var retryable RetryableError
    return errors.As(err, &retryable)
}

// Config holds combined resilience configuration
type Config struct {
    // Retry settings
    MaxRetries      int
    InitialDelay    time.Duration
    MaxDelay        time.Duration
    Multiplier      float64
    JitterFactor    float64

    // Circuit breaker settings
    FailureThreshold   int
    SuccessThreshold   int
    CBTimeout          time.Duration
    HalfOpenMaxCalls   int

    // General settings
    RequestTimeout  time.Duration
}

// DefaultConfig returns production-ready defaults
func DefaultConfig() Config {
    return Config{
        MaxRetries:         3,
        InitialDelay:       100 * time.Millisecond,
        MaxDelay:           10 * time.Second,
        Multiplier:         2.0,
        JitterFactor:       0.2,
        FailureThreshold:   5,
        SuccessThreshold:   2,
        CBTimeout:          30 * time.Second,
        HalfOpenMaxCalls:   1,
        RequestTimeout:     5 * time.Second,
    }
}

// State represents the circuit breaker state
type State int

const (
    StateClosed State = iota
    StateOpen
    StateHalfOpen
)

var (
    ErrCircuitOpen    = errors.New("circuit breaker is open")
    ErrMaxRetries     = errors.New("max retries exceeded")
    ErrRequestTimeout = errors.New("request timeout")
)

// Resilient combines retry and circuit breaker patterns
type Resilient struct {
    config        Config
    state         State
    failures      int
    successes     int
    lastFailure   time.Time
    halfOpenCalls int
    mu            sync.Mutex

    // Metrics
    totalRequests    int64
    successCount     int64
    failureCount     int64
    circuitOpenCount int64
}

// New creates a new resilient executor
func New(config Config) *Resilient {
    return &Resilient{
        config: config,
        state:  StateClosed,
    }
}

// Execute runs the function with retry and circuit breaker protection
func (r *Resilient) Execute(ctx context.Context, fn func(context.Context) error) error {
    r.mu.Lock()
    r.totalRequests++
    r.mu.Unlock()

    var lastErr error

    for attempt := 0; attempt <= r.config.MaxRetries; attempt++ {
        // Check circuit breaker
        if !r.allowRequest() {
            r.mu.Lock()
            r.circuitOpenCount++
            r.mu.Unlock()
            return ErrCircuitOpen
        }

        // Create timeout context for this attempt
        attemptCtx, cancel := context.WithTimeout(ctx, r.config.RequestTimeout)

        // Execute the function
        err := r.executeWithTimeout(attemptCtx, fn)
        cancel()

        // Record result for circuit breaker
        r.recordResult(err)

        if err == nil {
            r.mu.Lock()
            r.successCount++
            r.mu.Unlock()
            return nil
        }

        lastErr = err

        // Check if context was cancelled
        if ctx.Err() != nil {
            return ctx.Err()
        }

        // Only retry if the error is retryable
        if !IsRetryable(err) && !errors.Is(err, ErrRequestTimeout) {
            break
        }

        // Calculate and apply backoff delay
        if attempt < r.config.MaxRetries {
            delay := r.calculateDelay(attempt)
            select {
            case <-time.After(delay):
            case <-ctx.Done():
                return ctx.Err()
            }
        }
    }

    r.mu.Lock()
    r.failureCount++
    r.mu.Unlock()

    return lastErr
}

// executeWithTimeout runs the function with a timeout
func (r *Resilient) executeWithTimeout(ctx context.Context, fn func(context.Context) error) error {
    done := make(chan error, 1)

    go func() {
        done <- fn(ctx)
    }()

    select {
    case err := <-done:
        return err
    case <-ctx.Done():
        return ErrRequestTimeout
    }
}

// calculateDelay computes backoff delay with jitter
func (r *Resilient) calculateDelay(attempt int) time.Duration {
    delay := float64(r.config.InitialDelay) * math.Pow(r.config.Multiplier, float64(attempt))

    if delay > float64(r.config.MaxDelay) {
        delay = float64(r.config.MaxDelay)
    }

    if r.config.JitterFactor > 0 {
        jitter := delay * r.config.JitterFactor * (rand.Float64()*2 - 1)
        delay = delay + jitter
    }

    return time.Duration(delay)
}

// allowRequest checks if the circuit breaker allows a request
func (r *Resilient) allowRequest() bool {
    r.mu.Lock()
    defer r.mu.Unlock()

    switch r.state {
    case StateClosed:
        return true

    case StateOpen:
        if time.Since(r.lastFailure) > r.config.CBTimeout {
            r.toHalfOpen()
            return r.tryHalfOpenCall()
        }
        return false

    case StateHalfOpen:
        return r.tryHalfOpenCall()
    }

    return false
}

func (r *Resilient) tryHalfOpenCall() bool {
    if r.halfOpenCalls < r.config.HalfOpenMaxCalls {
        r.halfOpenCalls++
        return true
    }
    return false
}

// recordResult updates circuit breaker state based on result
func (r *Resilient) recordResult(err error) {
    r.mu.Lock()
    defer r.mu.Unlock()

    if err != nil {
        r.onFailure()
    } else {
        r.onSuccess()
    }
}

func (r *Resilient) onFailure() {
    switch r.state {
    case StateClosed:
        r.failures++
        if r.failures >= r.config.FailureThreshold {
            r.toOpen()
        }
    case StateHalfOpen:
        r.toOpen()
    }
    r.lastFailure = time.Now()
}

func (r *Resilient) onSuccess() {
    switch r.state {
    case StateClosed:
        r.failures = 0
    case StateHalfOpen:
        r.halfOpenCalls--
        r.successes++
        if r.successes >= r.config.SuccessThreshold {
            r.toClosed()
        }
    }
}

func (r *Resilient) toOpen() {
    r.state = StateOpen
    r.failures = 0
    r.successes = 0
    r.halfOpenCalls = 0
}

func (r *Resilient) toHalfOpen() {
    r.state = StateHalfOpen
    r.failures = 0
    r.successes = 0
    r.halfOpenCalls = 0
}

func (r *Resilient) toClosed() {
    r.state = StateClosed
    r.failures = 0
    r.successes = 0
    r.halfOpenCalls = 0
}

// Metrics returns current metrics
func (r *Resilient) Metrics() map[string]int64 {
    r.mu.Lock()
    defer r.mu.Unlock()

    return map[string]int64{
        "total_requests":     r.totalRequests,
        "success_count":      r.successCount,
        "failure_count":      r.failureCount,
        "circuit_open_count": r.circuitOpenCount,
    }
}

// State returns current circuit breaker state
func (r *Resilient) State() State {
    r.mu.Lock()
    defer r.mu.Unlock()
    return r.state
}
```

## Production-Ready HTTP Client

Here is a complete HTTP client implementation using the resilience patterns:

```go
package httpclient

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "time"
)

// Client wraps http.Client with resilience patterns
type Client struct {
    httpClient *http.Client
    resilient  *Resilient
}

// NewClient creates a resilient HTTP client
func NewClient(config Config) *Client {
    return &Client{
        httpClient: &http.Client{
            Timeout: config.RequestTimeout,
            Transport: &http.Transport{
                MaxIdleConns:        100,
                MaxIdleConnsPerHost: 10,
                IdleConnTimeout:     90 * time.Second,
            },
        },
        resilient: New(config),
    }
}

// Response wraps the HTTP response
type Response struct {
    StatusCode int
    Body       []byte
    Headers    http.Header
}

// Get performs a resilient GET request
func (c *Client) Get(ctx context.Context, url string) (*Response, error) {
    var response *Response

    err := c.resilient.Execute(ctx, func(ctx context.Context) error {
        req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
        if err != nil {
            return err
        }

        resp, err := c.httpClient.Do(req)
        if err != nil {
            // Network errors are retryable
            return RetryableError{Err: err}
        }
        defer resp.Body.Close()

        body, err := io.ReadAll(resp.Body)
        if err != nil {
            return RetryableError{Err: err}
        }

        // 5xx errors are retryable
        if resp.StatusCode >= 500 {
            return RetryableError{
                Err: fmt.Errorf("server error: %d", resp.StatusCode),
            }
        }

        // 4xx errors are not retryable
        if resp.StatusCode >= 400 {
            return fmt.Errorf("client error: %d", resp.StatusCode)
        }

        response = &Response{
            StatusCode: resp.StatusCode,
            Body:       body,
            Headers:    resp.Header,
        }

        return nil
    })

    return response, err
}

// Metrics returns client metrics
func (c *Client) Metrics() map[string]int64 {
    return c.resilient.Metrics()
}
```

## Usage Example

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"
)

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func main() {
    // Create resilient client with custom configuration
    config := resilience.Config{
        MaxRetries:       3,
        InitialDelay:     50 * time.Millisecond,
        MaxDelay:         5 * time.Second,
        Multiplier:       2.0,
        JitterFactor:     0.1,
        FailureThreshold: 5,
        SuccessThreshold: 2,
        CBTimeout:        30 * time.Second,
        HalfOpenMaxCalls: 1,
        RequestTimeout:   3 * time.Second,
    }

    client := httpclient.NewClient(config)

    // Create context with overall timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Make resilient request
    resp, err := client.Get(ctx, "https://api.example.com/users/1")
    if err != nil {
        log.Printf("Request failed: %v", err)
        log.Printf("Metrics: %+v", client.Metrics())
        return
    }

    var user User
    if err := json.Unmarshal(resp.Body, &user); err != nil {
        log.Printf("Failed to parse response: %v", err)
        return
    }

    log.Printf("User: %+v", user)
    log.Printf("Metrics: %+v", client.Metrics())
}
```

## Configuration Guidelines

| Scenario | Max Retries | Initial Delay | Failure Threshold | CB Timeout |
|----------|-------------|---------------|-------------------|------------|
| Real-time API | 2-3 | 50-100ms | 5-10 | 15-30s |
| Background job | 5-10 | 1-5s | 10-20 | 60-120s |
| Critical path | 3-5 | 100-500ms | 3-5 | 30-60s |
| Batch processing | 10+ | 5-10s | 20+ | 120-300s |

Key considerations:

1. **Request timeout** should be less than the overall operation timeout
2. **Failure threshold** should be high enough to avoid false positives from occasional errors
3. **Circuit breaker timeout** should give the downstream service enough time to recover
4. **Jitter factor** of 0.1-0.3 prevents synchronized retries across instances

## Testing Circuit Breaker Behavior

```go
package resilience

import (
    "context"
    "errors"
    "testing"
    "time"
)

func TestCircuitBreakerOpens(t *testing.T) {
    config := Config{
        MaxRetries:       0, // No retries for this test
        FailureThreshold: 3,
        SuccessThreshold: 1,
        CBTimeout:        100 * time.Millisecond,
        HalfOpenMaxCalls: 1,
        RequestTimeout:   1 * time.Second,
    }

    r := New(config)
    ctx := context.Background()

    // Cause failures to open the circuit
    for i := 0; i < 3; i++ {
        _ = r.Execute(ctx, func(ctx context.Context) error {
            return RetryableError{Err: errors.New("service unavailable")}
        })
    }

    // Circuit should be open
    if r.State() != StateOpen {
        t.Errorf("Expected circuit to be open, got %v", r.State())
    }

    // Request should fail immediately
    err := r.Execute(ctx, func(ctx context.Context) error {
        return nil
    })

    if !errors.Is(err, ErrCircuitOpen) {
        t.Errorf("Expected ErrCircuitOpen, got %v", err)
    }
}

func TestCircuitBreakerRecovers(t *testing.T) {
    config := Config{
        MaxRetries:       0,
        FailureThreshold: 2,
        SuccessThreshold: 1,
        CBTimeout:        50 * time.Millisecond,
        HalfOpenMaxCalls: 1,
        RequestTimeout:   1 * time.Second,
    }

    r := New(config)
    ctx := context.Background()

    // Open the circuit
    for i := 0; i < 2; i++ {
        _ = r.Execute(ctx, func(ctx context.Context) error {
            return RetryableError{Err: errors.New("error")}
        })
    }

    // Wait for timeout
    time.Sleep(60 * time.Millisecond)

    // Circuit should transition to half-open and allow one request
    err := r.Execute(ctx, func(ctx context.Context) error {
        return nil // Success
    })

    if err != nil {
        t.Errorf("Expected success, got %v", err)
    }

    // Circuit should be closed after success
    if r.State() != StateClosed {
        t.Errorf("Expected circuit to be closed, got %v", r.State())
    }
}
```

## Monitoring and Observability

Production systems need visibility into circuit breaker behavior. Add structured logging and metrics export:

```go
// Logger interface for structured logging
type Logger interface {
    Info(msg string, fields map[string]interface{})
    Warn(msg string, fields map[string]interface{})
    Error(msg string, fields map[string]interface{})
}

// WithLogger adds logging to the resilient executor
func (r *Resilient) WithLogger(logger Logger) *Resilient {
    r.logger = logger
    return r
}

// Log state transitions
func (r *Resilient) toOpen() {
    r.state = StateOpen
    r.failures = 0
    r.successes = 0
    r.halfOpenCalls = 0

    if r.logger != nil {
        r.logger.Warn("circuit breaker opened", map[string]interface{}{
            "previous_state": "closed",
            "failures":       r.failures,
        })
    }
}
```

## Summary

The retry pattern with circuit breaker provides robust fault tolerance for distributed systems. Key takeaways:

- Use exponential backoff with jitter to prevent thundering herd
- Circuit breaker prevents cascade failures by failing fast
- Combine both patterns for comprehensive resilience
- Configure thresholds based on your specific use case
- Always add timeouts to prevent resource exhaustion
- Monitor circuit breaker state transitions in production

The patterns work best when applied consistently across all external service calls. Consider wrapping them in a shared library that your teams can reuse across services.
