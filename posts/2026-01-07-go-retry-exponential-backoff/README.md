# How to Implement Retry Logic in Go with Exponential Backoff

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Resilience, Exponential Backoff, Error Handling, HTTP

Description: Master retry logic in Go with exponential backoff using hashicorp/go-retryablehttp and custom implementations for resilient applications.

---

In distributed systems and microservices architectures, transient failures are not a question of "if" but "when." Network hiccups, temporary service unavailability, rate limiting, and resource contention can all cause requests to fail momentarily. Implementing robust retry logic with exponential backoff is essential for building resilient applications that gracefully handle these inevitable failures.

This guide covers everything you need to know about implementing retry logic in Go, from understanding the theory behind exponential backoff to using battle-tested libraries like `hashicorp/go-retryablehttp`, building custom retry mechanisms, and integrating circuit breakers for production-ready systems.

## Understanding Exponential Backoff

Exponential backoff is a retry strategy where the wait time between consecutive retries increases exponentially. Instead of hammering a failing service with immediate retries, your application waits progressively longer periods, giving the downstream service time to recover.

### The Mathematics Behind Exponential Backoff

The basic formula for exponential backoff is:

```
wait_time = base_delay * (2 ^ attempt_number)
```

For example, with a base delay of 1 second:
- Attempt 1: Wait 1 second (1 * 2^0)
- Attempt 2: Wait 2 seconds (1 * 2^1)
- Attempt 3: Wait 4 seconds (1 * 2^2)
- Attempt 4: Wait 8 seconds (1 * 2^3)
- Attempt 5: Wait 16 seconds (1 * 2^4)

### Why Exponential Backoff Matters

1. **Prevents Thundering Herd**: When a service recovers, it is not overwhelmed by simultaneous retries from all clients.
2. **Respects Rate Limits**: Many APIs enforce rate limiting; backing off gives you a better chance of staying within limits.
3. **Conserves Resources**: Reduces wasted network calls and CPU cycles on both client and server.
4. **Improves Recovery Time**: Services can recover faster when they are not flooded with retry traffic.

## Using hashicorp/go-retryablehttp

HashiCorp's `go-retryablehttp` is a production-ready library that provides automatic retry functionality for HTTP requests. It is used extensively in HashiCorp's own tools like Terraform, Vault, and Consul.

### Installation

First, install the package:

```bash
go get github.com/hashicorp/go-retryablehttp
```

### Basic Usage

The simplest way to use go-retryablehttp is to create a client and make requests:

```go
package main

import (
    "fmt"
    "io"
    "log"

    "github.com/hashicorp/go-retryablehttp"
)

func main() {
    // Create a new retryable HTTP client with default settings
    // Default: 4 retries with exponential backoff
    client := retryablehttp.NewClient()

    // Make a GET request - retries are handled automatically
    resp, err := client.Get("https://api.example.com/data")
    if err != nil {
        log.Fatalf("Request failed after retries: %v", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        log.Fatalf("Failed to read response body: %v", err)
    }

    fmt.Printf("Response: %s\n", body)
}
```

### Configuring Retry Behavior

For production use, you will want to customize the retry behavior to match your requirements:

```go
package main

import (
    "log"
    "net/http"
    "time"

    "github.com/hashicorp/go-retryablehttp"
)

func main() {
    // Create a client with custom retry configuration
    client := retryablehttp.NewClient()

    // Set the maximum number of retry attempts
    client.RetryMax = 5

    // Set the minimum time to wait between retries (base delay)
    client.RetryWaitMin = 1 * time.Second

    // Set the maximum time to wait between retries (caps exponential growth)
    client.RetryWaitMax = 30 * time.Second

    // Set overall request timeout including all retries
    client.HTTPClient.Timeout = 2 * time.Minute

    // Configure custom logger for retry visibility
    client.Logger = log.Default()

    // Make request with custom configuration
    resp, err := client.Get("https://api.example.com/data")
    if err != nil {
        log.Fatalf("Request failed: %v", err)
    }
    defer resp.Body.Close()

    log.Printf("Request succeeded with status: %d", resp.StatusCode)
}
```

### Custom Retry Policy

Sometimes you need fine-grained control over which responses should trigger retries:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "time"

    "github.com/hashicorp/go-retryablehttp"
)

// customRetryPolicy determines whether a request should be retried
// based on the response status code and any errors encountered
func customRetryPolicy(ctx context.Context, resp *http.Response, err error) (bool, error) {
    // Check context cancellation first
    if ctx.Err() != nil {
        return false, ctx.Err()
    }

    // Retry on connection errors
    if err != nil {
        return true, nil
    }

    // Retry on specific status codes that indicate transient failures
    switch resp.StatusCode {
    case http.StatusTooManyRequests:      // 429 - Rate limited
        return true, nil
    case http.StatusBadGateway:           // 502
        return true, nil
    case http.StatusServiceUnavailable:   // 503
        return true, nil
    case http.StatusGatewayTimeout:       // 504
        return true, nil
    }

    // Do not retry on client errors (4xx except 429) or success (2xx)
    return false, nil
}

func main() {
    client := retryablehttp.NewClient()
    client.RetryMax = 5
    client.RetryWaitMin = 500 * time.Millisecond
    client.RetryWaitMax = 10 * time.Second

    // Set custom retry policy
    client.CheckRetry = customRetryPolicy

    resp, err := client.Get("https://api.example.com/data")
    if err != nil {
        log.Fatalf("Request failed: %v", err)
    }
    defer resp.Body.Close()

    log.Printf("Request completed with status: %d", resp.StatusCode)
}
```

### Custom Backoff Strategy

You can implement custom backoff logic, including jitter:

```go
package main

import (
    "log"
    "math"
    "math/rand"
    "net/http"
    "time"

    "github.com/hashicorp/go-retryablehttp"
)

// exponentialBackoffWithJitter calculates wait time with randomization
// to prevent synchronized retry storms across multiple clients
func exponentialBackoffWithJitter(min, max time.Duration, attemptNum int, resp *http.Response) time.Duration {
    // Calculate base exponential backoff
    mult := math.Pow(2, float64(attemptNum))
    wait := time.Duration(float64(min) * mult)

    // Cap at maximum wait time
    if wait > max {
        wait = max
    }

    // Add jitter: random value between 0 and wait time
    // This spreads out retries from multiple clients
    jitter := time.Duration(rand.Float64() * float64(wait))
    wait = wait + jitter

    // Ensure we do not exceed maximum
    if wait > max {
        wait = max
    }

    return wait
}

func main() {
    client := retryablehttp.NewClient()
    client.RetryMax = 5
    client.RetryWaitMin = 1 * time.Second
    client.RetryWaitMax = 30 * time.Second

    // Use custom backoff function with jitter
    client.Backoff = exponentialBackoffWithJitter

    resp, err := client.Get("https://api.example.com/data")
    if err != nil {
        log.Fatalf("Request failed: %v", err)
    }
    defer resp.Body.Close()

    log.Printf("Request succeeded")
}
```

### Using Standard http.Client Interface

If you need to use the standard `http.Client` interface for compatibility with existing code:

```go
package main

import (
    "io"
    "log"
    "net/http"
    "time"

    "github.com/hashicorp/go-retryablehttp"
)

func main() {
    // Create retryable client
    retryClient := retryablehttp.NewClient()
    retryClient.RetryMax = 3
    retryClient.RetryWaitMin = 1 * time.Second
    retryClient.RetryWaitMax = 10 * time.Second

    // Get standard http.Client for use with existing code
    // This wraps the retryable client in a standard interface
    standardClient := retryClient.StandardClient()

    // Now you can use it like a regular http.Client
    resp, err := standardClient.Get("https://api.example.com/data")
    if err != nil {
        log.Fatalf("Request failed: %v", err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    log.Printf("Response: %s", body)
}
```

## Custom Retry Implementation

While `go-retryablehttp` is excellent for HTTP requests, you may need retry logic for other operations like database connections, message queue operations, or custom protocols. Here is how to build your own retry mechanism.

### Basic Retry Function

A simple, reusable retry function for any operation:

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
    "math"
    "time"
)

// RetryConfig holds configuration for retry behavior
type RetryConfig struct {
    MaxRetries  int           // Maximum number of retry attempts
    BaseDelay   time.Duration // Initial delay between retries
    MaxDelay    time.Duration // Maximum delay cap
    Multiplier  float64       // Exponential multiplier (typically 2.0)
}

// DefaultRetryConfig returns sensible default retry settings
func DefaultRetryConfig() RetryConfig {
    return RetryConfig{
        MaxRetries:  5,
        BaseDelay:   100 * time.Millisecond,
        MaxDelay:    30 * time.Second,
        Multiplier:  2.0,
    }
}

// RetryableFunc is any function that can be retried
type RetryableFunc func(ctx context.Context) error

// Retry executes the given function with exponential backoff
// It returns the last error if all retries are exhausted
func Retry(ctx context.Context, config RetryConfig, operation RetryableFunc) error {
    var lastErr error

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        // Check context before each attempt
        if ctx.Err() != nil {
            return fmt.Errorf("context cancelled: %w", ctx.Err())
        }

        // Execute the operation
        lastErr = operation(ctx)
        if lastErr == nil {
            return nil // Success
        }

        // Log the failure
        log.Printf("Attempt %d failed: %v", attempt+1, lastErr)

        // Do not wait after the last attempt
        if attempt == config.MaxRetries {
            break
        }

        // Calculate exponential backoff delay
        delay := time.Duration(float64(config.BaseDelay) * math.Pow(config.Multiplier, float64(attempt)))
        if delay > config.MaxDelay {
            delay = config.MaxDelay
        }

        log.Printf("Waiting %v before retry...", delay)

        // Wait with context cancellation support
        select {
        case <-ctx.Done():
            return fmt.Errorf("context cancelled during backoff: %w", ctx.Err())
        case <-time.After(delay):
            // Continue to next attempt
        }
    }

    return fmt.Errorf("operation failed after %d attempts: %w", config.MaxRetries+1, lastErr)
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
    defer cancel()

    config := DefaultRetryConfig()

    // Example: retry a database connection
    err := Retry(ctx, config, func(ctx context.Context) error {
        // Simulated operation that might fail
        return errors.New("connection refused")
    })

    if err != nil {
        log.Printf("Operation failed: %v", err)
    }
}
```

### Retry with Result

For operations that return a value:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math"
    "math/rand"
    "time"
)

// RetryConfig defines retry behavior parameters
type RetryConfig struct {
    MaxRetries int
    BaseDelay  time.Duration
    MaxDelay   time.Duration
    Multiplier float64
}

// RetryWithResult executes an operation that returns a value with retries
// Generic type T allows this to work with any return type
func RetryWithResult[T any](
    ctx context.Context,
    config RetryConfig,
    operation func(ctx context.Context) (T, error),
) (T, error) {
    var zero T
    var lastErr error

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        if ctx.Err() != nil {
            return zero, ctx.Err()
        }

        result, err := operation(ctx)
        if err == nil {
            return result, nil
        }

        lastErr = err
        log.Printf("Attempt %d failed: %v", attempt+1, err)

        if attempt == config.MaxRetries {
            break
        }

        delay := time.Duration(float64(config.BaseDelay) * math.Pow(config.Multiplier, float64(attempt)))
        if delay > config.MaxDelay {
            delay = config.MaxDelay
        }

        select {
        case <-ctx.Done():
            return zero, ctx.Err()
        case <-time.After(delay):
        }
    }

    return zero, fmt.Errorf("failed after %d attempts: %w", config.MaxRetries+1, lastErr)
}

// fetchUserData simulates fetching user data from an API
func fetchUserData(ctx context.Context, userID string) (map[string]interface{}, error) {
    // Simulate random failures
    if rand.Float32() < 0.7 {
        return nil, fmt.Errorf("service temporarily unavailable")
    }

    return map[string]interface{}{
        "id":    userID,
        "name":  "John Doe",
        "email": "john@example.com",
    }, nil
}

func main() {
    ctx := context.Background()
    config := RetryConfig{
        MaxRetries: 5,
        BaseDelay:  500 * time.Millisecond,
        MaxDelay:   10 * time.Second,
        Multiplier: 2.0,
    }

    // Fetch user data with automatic retries
    userData, err := RetryWithResult(ctx, config, func(ctx context.Context) (map[string]interface{}, error) {
        return fetchUserData(ctx, "user-123")
    })

    if err != nil {
        log.Fatalf("Failed to fetch user: %v", err)
    }

    log.Printf("User data: %v", userData)
}
```

### Retryable Error Types

Not all errors should trigger a retry. Here is how to implement error classification:

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
    "math"
    "time"
)

// RetryableError wraps an error and indicates it can be retried
type RetryableError struct {
    Err error
}

func (e *RetryableError) Error() string {
    return e.Err.Error()
}

func (e *RetryableError) Unwrap() error {
    return e.Err
}

// NewRetryableError creates a new retryable error
func NewRetryableError(err error) *RetryableError {
    return &RetryableError{Err: err}
}

// PermanentError wraps an error that should not be retried
type PermanentError struct {
    Err error
}

func (e *PermanentError) Error() string {
    return e.Err.Error()
}

func (e *PermanentError) Unwrap() error {
    return e.Err
}

// NewPermanentError creates a new permanent (non-retryable) error
func NewPermanentError(err error) *PermanentError {
    return &PermanentError{Err: err}
}

// IsRetryable checks if an error should trigger a retry
func IsRetryable(err error) bool {
    // Check for explicit permanent error
    var permanentErr *PermanentError
    if errors.As(err, &permanentErr) {
        return false
    }

    // Check for explicit retryable error
    var retryableErr *RetryableError
    if errors.As(err, &retryableErr) {
        return true
    }

    // Default behavior: retry on unknown errors
    return true
}

// RetryConfig holds retry parameters
type RetryConfig struct {
    MaxRetries int
    BaseDelay  time.Duration
    MaxDelay   time.Duration
    Multiplier float64
}

// SmartRetry only retries on retryable errors
func SmartRetry(ctx context.Context, config RetryConfig, operation func(ctx context.Context) error) error {
    var lastErr error

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        if ctx.Err() != nil {
            return ctx.Err()
        }

        lastErr = operation(ctx)
        if lastErr == nil {
            return nil
        }

        // Check if error is retryable
        if !IsRetryable(lastErr) {
            log.Printf("Permanent error, not retrying: %v", lastErr)
            return lastErr
        }

        log.Printf("Retryable error on attempt %d: %v", attempt+1, lastErr)

        if attempt == config.MaxRetries {
            break
        }

        delay := time.Duration(float64(config.BaseDelay) * math.Pow(config.Multiplier, float64(attempt)))
        if delay > config.MaxDelay {
            delay = config.MaxDelay
        }

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(delay):
        }
    }

    return fmt.Errorf("operation failed after %d attempts: %w", config.MaxRetries+1, lastErr)
}

func main() {
    ctx := context.Background()
    config := RetryConfig{
        MaxRetries: 3,
        BaseDelay:  100 * time.Millisecond,
        MaxDelay:   5 * time.Second,
        Multiplier: 2.0,
    }

    // Example with permanent error - will not retry
    err := SmartRetry(ctx, config, func(ctx context.Context) error {
        return NewPermanentError(errors.New("invalid API key"))
    })
    log.Printf("Permanent error result: %v", err)

    // Example with retryable error - will retry
    attempt := 0
    err = SmartRetry(ctx, config, func(ctx context.Context) error {
        attempt++
        if attempt < 3 {
            return NewRetryableError(errors.New("service unavailable"))
        }
        return nil
    })
    log.Printf("Retryable error result: %v", err)
}
```

## Jitter Strategies for Distributed Systems

In distributed systems with multiple clients, synchronized retries can cause a "thundering herd" problem. Jitter adds randomness to spread out retry attempts.

### Full Jitter

Full jitter provides maximum randomization by selecting a random delay between 0 and the calculated backoff:

```go
package main

import (
    "math"
    "math/rand"
    "time"
)

// FullJitter returns a random delay between 0 and the calculated backoff
// Formula: random(0, min(cap, base * 2^attempt))
// This provides maximum spread but may result in very short waits
func FullJitter(baseDelay, maxDelay time.Duration, attempt int) time.Duration {
    // Calculate exponential backoff ceiling
    ceiling := float64(baseDelay) * math.Pow(2, float64(attempt))
    if ceiling > float64(maxDelay) {
        ceiling = float64(maxDelay)
    }

    // Return random value between 0 and ceiling
    return time.Duration(rand.Float64() * ceiling)
}
```

### Equal Jitter

Equal jitter balances between predictability and randomization:

```go
package main

import (
    "math"
    "math/rand"
    "time"
)

// EqualJitter splits the delay in half: one half is fixed, one half is random
// Formula: (backoff / 2) + random(0, backoff / 2)
// This guarantees at least half the backoff time while still adding variance
func EqualJitter(baseDelay, maxDelay time.Duration, attempt int) time.Duration {
    // Calculate exponential backoff
    backoff := float64(baseDelay) * math.Pow(2, float64(attempt))
    if backoff > float64(maxDelay) {
        backoff = float64(maxDelay)
    }

    // Half fixed, half random
    halfBackoff := backoff / 2
    jitter := rand.Float64() * halfBackoff

    return time.Duration(halfBackoff + jitter)
}
```

### Decorrelated Jitter

Decorrelated jitter is often considered the best algorithm for minimizing total completion time:

```go
package main

import (
    "math/rand"
    "time"
)

// DecorrelatedJitter uses the previous delay to calculate the next one
// Formula: min(cap, random(base, previous_delay * 3))
// This algorithm tends to provide optimal retry distribution
type DecorrelatedJitterBackoff struct {
    BaseDelay     time.Duration
    MaxDelay      time.Duration
    previousDelay time.Duration
}

// NewDecorrelatedJitterBackoff creates a new decorrelated jitter calculator
func NewDecorrelatedJitterBackoff(baseDelay, maxDelay time.Duration) *DecorrelatedJitterBackoff {
    return &DecorrelatedJitterBackoff{
        BaseDelay:     baseDelay,
        MaxDelay:      maxDelay,
        previousDelay: baseDelay,
    }
}

// NextDelay calculates the next delay using decorrelated jitter
func (d *DecorrelatedJitterBackoff) NextDelay() time.Duration {
    // Calculate random value between base and 3x previous delay
    maxRandom := float64(d.previousDelay) * 3
    delay := float64(d.BaseDelay) + rand.Float64()*(maxRandom-float64(d.BaseDelay))

    // Cap at maximum delay
    if delay > float64(d.MaxDelay) {
        delay = float64(d.MaxDelay)
    }

    d.previousDelay = time.Duration(delay)
    return d.previousDelay
}

// Reset resets the backoff state for a new retry sequence
func (d *DecorrelatedJitterBackoff) Reset() {
    d.previousDelay = d.BaseDelay
}
```

### Complete Jitter Example

Here is a complete implementation comparing different jitter strategies:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math"
    "math/rand"
    "time"
)

// JitterStrategy defines different jitter algorithms
type JitterStrategy int

const (
    NoJitter JitterStrategy = iota
    FullJitter
    EqualJitter
    DecorrelatedJitter
)

// BackoffCalculator calculates delays with various jitter strategies
type BackoffCalculator struct {
    BaseDelay     time.Duration
    MaxDelay      time.Duration
    Strategy      JitterStrategy
    previousDelay time.Duration
}

// NewBackoffCalculator creates a new calculator with specified strategy
func NewBackoffCalculator(baseDelay, maxDelay time.Duration, strategy JitterStrategy) *BackoffCalculator {
    return &BackoffCalculator{
        BaseDelay:     baseDelay,
        MaxDelay:      maxDelay,
        Strategy:      strategy,
        previousDelay: baseDelay,
    }
}

// Calculate returns the delay for the given attempt number
func (b *BackoffCalculator) Calculate(attempt int) time.Duration {
    switch b.Strategy {
    case NoJitter:
        return b.exponentialBackoff(attempt)
    case FullJitter:
        return b.fullJitter(attempt)
    case EqualJitter:
        return b.equalJitter(attempt)
    case DecorrelatedJitter:
        return b.decorrelatedJitter()
    default:
        return b.exponentialBackoff(attempt)
    }
}

func (b *BackoffCalculator) exponentialBackoff(attempt int) time.Duration {
    delay := time.Duration(float64(b.BaseDelay) * math.Pow(2, float64(attempt)))
    if delay > b.MaxDelay {
        return b.MaxDelay
    }
    return delay
}

func (b *BackoffCalculator) fullJitter(attempt int) time.Duration {
    ceiling := b.exponentialBackoff(attempt)
    return time.Duration(rand.Float64() * float64(ceiling))
}

func (b *BackoffCalculator) equalJitter(attempt int) time.Duration {
    ceiling := b.exponentialBackoff(attempt)
    half := float64(ceiling) / 2
    return time.Duration(half + rand.Float64()*half)
}

func (b *BackoffCalculator) decorrelatedJitter() time.Duration {
    maxRandom := float64(b.previousDelay) * 3
    delay := float64(b.BaseDelay) + rand.Float64()*(maxRandom-float64(b.BaseDelay))
    if delay > float64(b.MaxDelay) {
        delay = float64(b.MaxDelay)
    }
    b.previousDelay = time.Duration(delay)
    return b.previousDelay
}

// Reset resets the calculator state
func (b *BackoffCalculator) Reset() {
    b.previousDelay = b.BaseDelay
}

// RetryWithJitter performs an operation with configurable jitter
func RetryWithJitter(
    ctx context.Context,
    maxRetries int,
    calculator *BackoffCalculator,
    operation func(ctx context.Context) error,
) error {
    calculator.Reset()

    for attempt := 0; attempt <= maxRetries; attempt++ {
        if ctx.Err() != nil {
            return ctx.Err()
        }

        err := operation(ctx)
        if err == nil {
            return nil
        }

        if attempt == maxRetries {
            return fmt.Errorf("failed after %d attempts: %w", maxRetries+1, err)
        }

        delay := calculator.Calculate(attempt)
        log.Printf("Attempt %d failed, waiting %v before retry", attempt+1, delay)

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(delay):
        }
    }

    return nil
}

func main() {
    ctx := context.Background()

    // Compare different jitter strategies
    strategies := []JitterStrategy{NoJitter, FullJitter, EqualJitter, DecorrelatedJitter}
    names := []string{"No Jitter", "Full Jitter", "Equal Jitter", "Decorrelated Jitter"}

    for i, strategy := range strategies {
        calculator := NewBackoffCalculator(100*time.Millisecond, 10*time.Second, strategy)
        fmt.Printf("\n%s delays:\n", names[i])
        for attempt := 0; attempt < 5; attempt++ {
            delay := calculator.Calculate(attempt)
            fmt.Printf("  Attempt %d: %v\n", attempt+1, delay)
        }
        calculator.Reset()
    }
}
```

## Circuit Breaker Integration

Retry logic works well for transient failures, but what about persistent outages? A circuit breaker prevents your application from wasting resources on requests that are likely to fail.

### Circuit Breaker States

A circuit breaker has three states:
1. **Closed**: Requests flow normally; failures are tracked
2. **Open**: Requests fail immediately without execution
3. **Half-Open**: Limited requests are allowed to test if the service has recovered

### Implementing a Circuit Breaker

Here is a production-ready circuit breaker implementation:

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
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
        return "CLOSED"
    case StateOpen:
        return "OPEN"
    case StateHalfOpen:
        return "HALF-OPEN"
    default:
        return "UNKNOWN"
    }
}

// ErrCircuitOpen is returned when the circuit breaker is open
var ErrCircuitOpen = errors.New("circuit breaker is open")

// CircuitBreaker implements the circuit breaker pattern
type CircuitBreaker struct {
    mu sync.RWMutex

    // Configuration
    failureThreshold   int           // Number of failures to trip the circuit
    successThreshold   int           // Number of successes to close the circuit
    timeout            time.Duration // Time to wait before trying again

    // State
    state              State
    failures           int
    successes          int
    lastFailure        time.Time

    // Callbacks for monitoring
    onStateChange      func(from, to State)
}

// CircuitBreakerConfig holds circuit breaker configuration
type CircuitBreakerConfig struct {
    FailureThreshold int
    SuccessThreshold int
    Timeout          time.Duration
    OnStateChange    func(from, to State)
}

// NewCircuitBreaker creates a new circuit breaker
func NewCircuitBreaker(config CircuitBreakerConfig) *CircuitBreaker {
    return &CircuitBreaker{
        failureThreshold: config.FailureThreshold,
        successThreshold: config.SuccessThreshold,
        timeout:          config.Timeout,
        state:            StateClosed,
        onStateChange:    config.OnStateChange,
    }
}

// Execute runs the given function if the circuit allows it
func (cb *CircuitBreaker) Execute(ctx context.Context, operation func(ctx context.Context) error) error {
    // Check if we can proceed
    if !cb.canExecute() {
        return ErrCircuitOpen
    }

    // Execute the operation
    err := operation(ctx)

    // Record the result
    cb.recordResult(err == nil)

    return err
}

// canExecute checks if the circuit breaker allows execution
func (cb *CircuitBreaker) canExecute() bool {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    switch cb.state {
    case StateClosed:
        return true

    case StateOpen:
        // Check if timeout has passed
        if time.Since(cb.lastFailure) > cb.timeout {
            cb.transitionTo(StateHalfOpen)
            return true
        }
        return false

    case StateHalfOpen:
        // Allow limited requests in half-open state
        return true

    default:
        return false
    }
}

// recordResult records success or failure and updates state
func (cb *CircuitBreaker) recordResult(success bool) {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    if success {
        cb.onSuccess()
    } else {
        cb.onFailure()
    }
}

func (cb *CircuitBreaker) onSuccess() {
    switch cb.state {
    case StateClosed:
        cb.failures = 0

    case StateHalfOpen:
        cb.successes++
        if cb.successes >= cb.successThreshold {
            cb.transitionTo(StateClosed)
        }
    }
}

func (cb *CircuitBreaker) onFailure() {
    switch cb.state {
    case StateClosed:
        cb.failures++
        if cb.failures >= cb.failureThreshold {
            cb.transitionTo(StateOpen)
        }

    case StateHalfOpen:
        cb.transitionTo(StateOpen)
    }

    cb.lastFailure = time.Now()
}

func (cb *CircuitBreaker) transitionTo(newState State) {
    if cb.state == newState {
        return
    }

    oldState := cb.state
    cb.state = newState
    cb.failures = 0
    cb.successes = 0

    if cb.onStateChange != nil {
        cb.onStateChange(oldState, newState)
    }
}

// State returns the current circuit breaker state
func (cb *CircuitBreaker) State() State {
    cb.mu.RLock()
    defer cb.mu.RUnlock()
    return cb.state
}
```

### Combining Retry Logic with Circuit Breaker

For robust systems, combine retries with circuit breakers:

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
    "math"
    "math/rand"
    "sync"
    "time"
)

// State represents circuit breaker state
type State int

const (
    StateClosed State = iota
    StateOpen
    StateHalfOpen
)

// ErrCircuitOpen indicates the circuit is open
var ErrCircuitOpen = errors.New("circuit breaker is open")

// CircuitBreaker implementation (simplified for brevity)
type CircuitBreaker struct {
    mu               sync.RWMutex
    state            State
    failures         int
    failureThreshold int
    timeout          time.Duration
    lastFailure      time.Time
}

func (cb *CircuitBreaker) Execute(ctx context.Context, op func(ctx context.Context) error) error {
    cb.mu.Lock()
    if cb.state == StateOpen {
        if time.Since(cb.lastFailure) < cb.timeout {
            cb.mu.Unlock()
            return ErrCircuitOpen
        }
        cb.state = StateHalfOpen
    }
    cb.mu.Unlock()

    err := op(ctx)

    cb.mu.Lock()
    defer cb.mu.Unlock()

    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()
        if cb.failures >= cb.failureThreshold {
            cb.state = StateOpen
        }
    } else {
        cb.failures = 0
        cb.state = StateClosed
    }

    return err
}

// ResilientClient combines retry logic with circuit breaker
type ResilientClient struct {
    circuitBreaker *CircuitBreaker
    maxRetries     int
    baseDelay      time.Duration
    maxDelay       time.Duration
}

// ResilientClientConfig holds client configuration
type ResilientClientConfig struct {
    MaxRetries       int
    BaseDelay        time.Duration
    MaxDelay         time.Duration
    FailureThreshold int
    CircuitTimeout   time.Duration
}

// NewResilientClient creates a client with retry and circuit breaker
func NewResilientClient(config ResilientClientConfig) *ResilientClient {
    return &ResilientClient{
        circuitBreaker: &CircuitBreaker{
            failureThreshold: config.FailureThreshold,
            timeout:          config.CircuitTimeout,
            state:            StateClosed,
        },
        maxRetries: config.MaxRetries,
        baseDelay:  config.BaseDelay,
        maxDelay:   config.MaxDelay,
    }
}

// Execute runs the operation with retry logic and circuit breaker protection
func (c *ResilientClient) Execute(ctx context.Context, operation func(ctx context.Context) error) error {
    var lastErr error

    for attempt := 0; attempt <= c.maxRetries; attempt++ {
        if ctx.Err() != nil {
            return ctx.Err()
        }

        // Execute through circuit breaker
        err := c.circuitBreaker.Execute(ctx, operation)

        if err == nil {
            return nil
        }

        // If circuit is open, fail fast without retrying
        if errors.Is(err, ErrCircuitOpen) {
            log.Printf("Circuit breaker is open, failing fast")
            return err
        }

        lastErr = err
        log.Printf("Attempt %d failed: %v", attempt+1, err)

        if attempt == c.maxRetries {
            break
        }

        // Calculate backoff with jitter
        delay := c.calculateDelay(attempt)
        log.Printf("Waiting %v before retry...", delay)

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(delay):
        }
    }

    return fmt.Errorf("operation failed after %d attempts: %w", c.maxRetries+1, lastErr)
}

func (c *ResilientClient) calculateDelay(attempt int) time.Duration {
    // Exponential backoff with full jitter
    ceiling := float64(c.baseDelay) * math.Pow(2, float64(attempt))
    if ceiling > float64(c.maxDelay) {
        ceiling = float64(c.maxDelay)
    }
    return time.Duration(rand.Float64() * ceiling)
}

func main() {
    config := ResilientClientConfig{
        MaxRetries:       5,
        BaseDelay:        100 * time.Millisecond,
        MaxDelay:         10 * time.Second,
        FailureThreshold: 3,
        CircuitTimeout:   30 * time.Second,
    }

    client := NewResilientClient(config)
    ctx := context.Background()

    // Simulate a failing service
    failCount := 0
    err := client.Execute(ctx, func(ctx context.Context) error {
        failCount++
        if failCount < 4 {
            return errors.New("service unavailable")
        }
        log.Println("Request succeeded!")
        return nil
    })

    if err != nil {
        log.Printf("Final error: %v", err)
    }
}
```

## Production Best Practices

When implementing retry logic in production systems, keep these best practices in mind:

### 1. Set Appropriate Timeouts

Always set timeouts to prevent indefinite blocking:

```go
// Create a context with overall operation timeout
// This ensures the entire retry sequence completes within a bounded time
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
defer cancel()
```

### 2. Log Retry Attempts

Visibility into retry behavior is crucial for debugging and monitoring:

```go
// Use structured logging for better observability
log.Printf("attempt=%d status=failed error=%v next_retry_in=%v",
    attempt, err, delay)
```

### 3. Implement Health Checks

Monitor the health of your retry mechanisms:

```go
// Metrics structure for monitoring retry behavior
type RetryMetrics struct {
    TotalAttempts    int64
    SuccessfulFirst  int64  // Succeeded without retry
    SuccessfulRetry  int64  // Succeeded after retry
    ExhaustedRetries int64  // Failed after all retries
    CircuitBreaks    int64  // Blocked by circuit breaker
}
```

### 4. Consider Idempotency

Ensure operations are safe to retry by making them idempotent. Use idempotency keys for non-idempotent operations:

```go
// Use unique request IDs to ensure idempotent processing
type Request struct {
    IdempotencyKey string
    Payload        interface{}
}

// Server-side: check if request was already processed
// before executing again on retry
```

### 5. Handle Different Error Types

Not all errors deserve the same treatment:

```go
// Categorize errors for appropriate handling
func categorizeError(err error) ErrorCategory {
    var netErr net.Error
    if errors.As(err, &netErr) && netErr.Timeout() {
        return Retryable // Network timeout - retry
    }

    var httpErr *HTTPError
    if errors.As(err, &httpErr) {
        switch httpErr.StatusCode {
        case 400, 401, 403, 404:
            return Permanent // Client error - do not retry
        case 429, 503, 504:
            return Retryable // Server overload - retry
        }
    }

    return Unknown
}
```

## Conclusion

Implementing retry logic with exponential backoff is essential for building resilient Go applications. Whether you use the battle-tested `hashicorp/go-retryablehttp` library for HTTP requests or build custom retry mechanisms for other operations, the key principles remain the same:

1. **Use exponential backoff** to give services time to recover
2. **Add jitter** to prevent synchronized retry storms in distributed systems
3. **Implement circuit breakers** to fail fast during prolonged outages
4. **Classify errors** to retry only transient failures
5. **Set appropriate timeouts** to bound the total operation time
6. **Monitor and log** retry behavior for observability

By following these patterns and practices, your Go applications will gracefully handle the inevitable failures in distributed systems, providing a better experience for users and reducing operational burden on your team.

## Further Reading

- [HashiCorp go-retryablehttp GitHub Repository](https://github.com/hashicorp/go-retryablehttp)
- [AWS Architecture Blog: Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Microsoft Azure: Retry Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/retry)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
