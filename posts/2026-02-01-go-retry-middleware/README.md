# How to Build Custom Retry Middleware in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Middleware, Retry, Resilience, HTTP

Description: A practical guide to building custom retry middleware in Go with exponential backoff and circuit breaker patterns.

---

Network requests fail. Services go down. Databases hiccup. If you've been building distributed systems long enough, you know that transient failures are not a question of "if" but "when." The difference between a resilient application and a fragile one often comes down to how well you handle these temporary blips.

In this post, we'll build a production-ready retry middleware in Go from scratch. No external libraries - just the standard library and a solid understanding of retry patterns.

## Why Build Your Own Retry Middleware?

There are plenty of retry libraries out there. So why roll your own?

First, understanding the internals makes you better at debugging when things go wrong. Second, most libraries are either too simple or too complex for your specific needs. Third, Go's simplicity makes it surprisingly easy to build exactly what you need.

Let's start with the basics and work our way up to a full-featured HTTP retry middleware.

## The Fundamentals: A Simple Retry Function

Before we get fancy, let's understand the core concept. A retry function wraps an operation and re-executes it if it fails.

Below is a basic retry function that attempts an operation up to a maximum number of times with a fixed delay between attempts:

```go
package retry

import (
    "errors"
    "time"
)

// Do executes the given function and retries on failure.
// It uses a fixed delay between attempts and stops after maxAttempts.
func Do(maxAttempts int, delay time.Duration, fn func() error) error {
    var lastErr error
    
    for attempt := 1; attempt <= maxAttempts; attempt++ {
        lastErr = fn()
        if lastErr == nil {
            return nil // Success - no need to retry
        }
        
        // Don't sleep after the last attempt
        if attempt < maxAttempts {
            time.Sleep(delay)
        }
    }
    
    return lastErr
}
```

This works, but it has problems. A fixed delay means we're hammering a potentially struggling service at a constant rate. If the service is overloaded, we're making things worse.

## Exponential Backoff: Being a Good Citizen

Exponential backoff increases the delay between retries. The idea is simple: if a service is struggling, give it progressively more time to recover.

This implementation doubles the delay after each failed attempt, up to a maximum cap:

```go
package retry

import (
    "math"
    "time"
)

// Config holds the retry configuration parameters.
type Config struct {
    MaxAttempts  int           // Maximum number of retry attempts
    InitialDelay time.Duration // Starting delay before first retry
    MaxDelay     time.Duration // Cap on the delay - prevents infinite growth
    Multiplier   float64       // How much to multiply delay after each attempt
}

// DefaultConfig returns sensible defaults for most use cases.
func DefaultConfig() Config {
    return Config{
        MaxAttempts:  3,
        InitialDelay: 100 * time.Millisecond,
        MaxDelay:     10 * time.Second,
        Multiplier:   2.0,
    }
}

// DoWithBackoff executes fn with exponential backoff on failure.
func DoWithBackoff(cfg Config, fn func() error) error {
    var lastErr error
    delay := cfg.InitialDelay
    
    for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
        lastErr = fn()
        if lastErr == nil {
            return nil
        }
        
        if attempt < cfg.MaxAttempts {
            time.Sleep(delay)
            
            // Calculate next delay with exponential growth
            nextDelay := float64(delay) * cfg.Multiplier
            delay = time.Duration(math.Min(nextDelay, float64(cfg.MaxDelay)))
        }
    }
    
    return lastErr
}
```

Better. But we still have a problem called the "thundering herd."

## Adding Jitter: Avoiding the Thundering Herd

Imagine 1000 clients all hitting your service at the same time. They all fail. They all wait exactly 100ms. They all retry together. They all fail again. This synchronized retry storm can bring down services.

Jitter adds randomness to the delay, spreading out the retries over time.

This version adds random jitter to each delay, preventing clients from retrying in lockstep:

```go
package retry

import (
    "math"
    "math/rand"
    "time"
)

// JitterType determines how randomness is applied to delays.
type JitterType int

const (
    // FullJitter randomizes the entire delay (0 to delay)
    FullJitter JitterType = iota
    // EqualJitter uses half fixed delay plus half random
    EqualJitter
    // DecorrelatedJitter bases delay on previous delay with randomness
    DecorrelatedJitter
)

// ConfigWithJitter extends Config with jitter options.
type ConfigWithJitter struct {
    Config
    Jitter JitterType
}

// calculateJitter returns a delay with the specified jitter applied.
// Each jitter type provides different trade-offs between consistency
// and spread.
func calculateJitter(baseDelay time.Duration, jitter JitterType, prevDelay time.Duration, initialDelay time.Duration) time.Duration {
    switch jitter {
    case FullJitter:
        // Random value between 0 and baseDelay
        return time.Duration(rand.Int63n(int64(baseDelay)))
    
    case EqualJitter:
        // Half the delay is fixed, half is random
        half := baseDelay / 2
        return half + time.Duration(rand.Int63n(int64(half)))
    
    case DecorrelatedJitter:
        // Based on AWS architecture blog recommendations
        // delay = min(cap, random(base, prev_delay * 3))
        minVal := int64(initialDelay)
        maxVal := int64(prevDelay) * 3
        if maxVal < minVal {
            maxVal = minVal
        }
        return time.Duration(minVal + rand.Int63n(maxVal-minVal+1))
    
    default:
        return baseDelay
    }
}

// DoWithJitter executes fn with exponential backoff and jitter.
func DoWithJitter(cfg ConfigWithJitter, fn func() error) error {
    var lastErr error
    delay := cfg.InitialDelay
    prevDelay := cfg.InitialDelay
    
    for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
        lastErr = fn()
        if lastErr == nil {
            return nil
        }
        
        if attempt < cfg.MaxAttempts {
            // Apply jitter to prevent thundering herd
            jitteredDelay := calculateJitter(delay, cfg.Jitter, prevDelay, cfg.InitialDelay)
            
            // Ensure we don't exceed max delay
            if jitteredDelay > cfg.MaxDelay {
                jitteredDelay = cfg.MaxDelay
            }
            
            time.Sleep(jitteredDelay)
            
            prevDelay = jitteredDelay
            nextDelay := float64(delay) * cfg.Multiplier
            delay = time.Duration(math.Min(nextDelay, float64(cfg.MaxDelay)))
        }
    }
    
    return lastErr
}
```

## Determining What's Retryable

Not all errors should trigger a retry. A 404 Not Found won't magically become a 200 OK if you try again. A 503 Service Unavailable probably will.

This helper function categorizes HTTP status codes based on whether retrying makes sense:

```go
package retry

import "net/http"

// IsRetryableStatusCode returns true if the HTTP status code indicates
// a transient error that might succeed on retry.
func IsRetryableStatusCode(statusCode int) bool {
    switch statusCode {
    case http.StatusRequestTimeout,      // 408 - client took too long
         http.StatusTooManyRequests,     // 429 - rate limited, try later
         http.StatusInternalServerError, // 500 - server error, might be transient
         http.StatusBadGateway,          // 502 - proxy/gateway issue
         http.StatusServiceUnavailable,  // 503 - server overloaded
         http.StatusGatewayTimeout:      // 504 - upstream timeout
        return true
    default:
        return false
    }
}

// IsRetryableError checks if a network error is likely transient.
// This handles common Go network errors like timeouts and connection resets.
func IsRetryableError(err error) bool {
    if err == nil {
        return false
    }
    
    // Check for timeout errors
    type timeout interface {
        Timeout() bool
    }
    if t, ok := err.(timeout); ok && t.Timeout() {
        return true
    }
    
    // Check for temporary errors
    type temporary interface {
        Temporary() bool
    }
    if t, ok := err.(temporary); ok && t.Temporary() {
        return true
    }
    
    return false
}
```

## Building the HTTP Retry Middleware

Now let's put it all together into a proper HTTP middleware. We'll create a custom `http.RoundTripper` that wraps the default transport.

This is the core retry transport that intercepts HTTP requests and applies our retry logic:

```go
package retry

import (
    "bytes"
    "context"
    "io"
    "math"
    "math/rand"
    "net/http"
    "time"
)

// Transport wraps http.RoundTripper with retry logic.
type Transport struct {
    Base         http.RoundTripper // Underlying transport to use
    MaxAttempts  int
    InitialDelay time.Duration
    MaxDelay     time.Duration
    Multiplier   float64
    Jitter       JitterType
    
    // ShouldRetry lets you customize which responses trigger retries.
    // If nil, uses default status code checking.
    ShouldRetry func(resp *http.Response, err error) bool
    
    // OnRetry is called before each retry attempt for logging/metrics.
    OnRetry func(attempt int, err error, delay time.Duration)
}

// NewTransport creates a Transport with sensible defaults.
func NewTransport() *Transport {
    return &Transport{
        Base:         http.DefaultTransport,
        MaxAttempts:  3,
        InitialDelay: 100 * time.Millisecond,
        MaxDelay:     10 * time.Second,
        Multiplier:   2.0,
        Jitter:       FullJitter,
    }
}

// RoundTrip implements http.RoundTripper with retry logic.
func (t *Transport) RoundTrip(req *http.Request) (*http.Response, error) {
    var lastResp *http.Response
    var lastErr error
    delay := t.InitialDelay
    
    // We need to buffer the body for retries since it can only be read once
    var bodyBytes []byte
    if req.Body != nil {
        bodyBytes, lastErr = io.ReadAll(req.Body)
        req.Body.Close()
        if lastErr != nil {
            return nil, lastErr
        }
    }
    
    for attempt := 1; attempt <= t.MaxAttempts; attempt++ {
        // Check if context is already cancelled before attempting
        if err := req.Context().Err(); err != nil {
            return nil, err
        }
        
        // Clone the request and restore the body for this attempt
        reqCopy := req.Clone(req.Context())
        if bodyBytes != nil {
            reqCopy.Body = io.NopCloser(bytes.NewReader(bodyBytes))
            reqCopy.ContentLength = int64(len(bodyBytes))
        }
        
        lastResp, lastErr = t.base().RoundTrip(reqCopy)
        
        // Determine if we should retry
        if !t.shouldRetry(lastResp, lastErr) {
            return lastResp, lastErr
        }
        
        // Close the response body if we're going to retry
        // to prevent connection leaks
        if lastResp != nil {
            io.Copy(io.Discard, lastResp.Body)
            lastResp.Body.Close()
        }
        
        // Don't sleep after the last attempt
        if attempt < t.MaxAttempts {
            jitteredDelay := t.calculateDelay(delay)
            
            // Notify callback before sleeping
            if t.OnRetry != nil {
                t.OnRetry(attempt, lastErr, jitteredDelay)
            }
            
            // Sleep with context awareness
            timer := time.NewTimer(jitteredDelay)
            select {
            case <-req.Context().Done():
                timer.Stop()
                return nil, req.Context().Err()
            case <-timer.C:
            }
            
            // Calculate next delay
            nextDelay := float64(delay) * t.Multiplier
            delay = time.Duration(math.Min(nextDelay, float64(t.MaxDelay)))
        }
    }
    
    return lastResp, lastErr
}

// base returns the underlying transport, defaulting to http.DefaultTransport.
func (t *Transport) base() http.RoundTripper {
    if t.Base != nil {
        return t.Base
    }
    return http.DefaultTransport
}

// shouldRetry determines if the request should be retried.
func (t *Transport) shouldRetry(resp *http.Response, err error) bool {
    // Use custom function if provided
    if t.ShouldRetry != nil {
        return t.ShouldRetry(resp, err)
    }
    
    // Network error - check if retryable
    if err != nil {
        return IsRetryableError(err)
    }
    
    // Check status code
    if resp != nil {
        return IsRetryableStatusCode(resp.StatusCode)
    }
    
    return false
}

// calculateDelay applies jitter to the base delay.
func (t *Transport) calculateDelay(baseDelay time.Duration) time.Duration {
    jittered := calculateJitter(baseDelay, t.Jitter, baseDelay, t.InitialDelay)
    if jittered > t.MaxDelay {
        return t.MaxDelay
    }
    return jittered
}
```

## Respecting Context Cancellation

Notice how we check `req.Context().Err()` and use `select` with the context's Done channel. This is critical. If the user cancels their request, we shouldn't keep retrying in the background.

Here's a focused example showing proper context handling:

```go
// sleepWithContext waits for the duration but will return early
// if the context is cancelled. Returns the context error if cancelled.
func sleepWithContext(ctx context.Context, duration time.Duration) error {
    timer := time.NewTimer(duration)
    defer timer.Stop()
    
    select {
    case <-ctx.Done():
        return ctx.Err()
    case <-timer.C:
        return nil
    }
}
```

This pattern ensures your retries are well-behaved citizens. When a request times out or a user navigates away, you stop consuming resources immediately.

## Adding Metrics for Observability

You can't improve what you can't measure. Let's add hooks for collecting retry metrics.

This wrapper adds Prometheus-style metrics to track retry behavior:

```go
package retry

import (
    "net/http"
    "sync/atomic"
    "time"
)

// Metrics tracks retry statistics for monitoring and alerting.
type Metrics struct {
    TotalRequests   uint64 // Total HTTP requests made
    TotalRetries    uint64 // Number of retry attempts
    SuccessfulFirst uint64 // Requests that succeeded on first try
    SuccessfulRetry uint64 // Requests that succeeded after retrying
    FailedExhausted uint64 // Requests that failed after all retries
}

// InstrumentedTransport wraps Transport with metrics collection.
type InstrumentedTransport struct {
    *Transport
    metrics *Metrics
}

// NewInstrumentedTransport creates a transport that tracks metrics.
func NewInstrumentedTransport(metrics *Metrics) *InstrumentedTransport {
    t := NewTransport()
    
    it := &InstrumentedTransport{
        Transport: t,
        metrics:   metrics,
    }
    
    // Wire up the retry callback to track retries
    t.OnRetry = func(attempt int, err error, delay time.Duration) {
        atomic.AddUint64(&metrics.TotalRetries, 1)
    }
    
    return it
}

// RoundTrip executes the request with retry and records metrics.
func (it *InstrumentedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    atomic.AddUint64(&it.metrics.TotalRequests, 1)
    
    retriesBefore := atomic.LoadUint64(&it.metrics.TotalRetries)
    
    resp, err := it.Transport.RoundTrip(req)
    
    retriesAfter := atomic.LoadUint64(&it.metrics.TotalRetries)
    hadRetries := retriesAfter > retriesBefore
    
    // Categorize the outcome
    if err == nil && resp != nil && resp.StatusCode < 400 {
        if hadRetries {
            atomic.AddUint64(&it.metrics.SuccessfulRetry, 1)
        } else {
            atomic.AddUint64(&it.metrics.SuccessfulFirst, 1)
        }
    } else if hadRetries {
        atomic.AddUint64(&it.metrics.FailedExhausted, 1)
    }
    
    return resp, err
}

// GetMetrics returns a snapshot of current metrics.
func (it *InstrumentedTransport) GetMetrics() Metrics {
    return Metrics{
        TotalRequests:   atomic.LoadUint64(&it.metrics.TotalRequests),
        TotalRetries:    atomic.LoadUint64(&it.metrics.TotalRetries),
        SuccessfulFirst: atomic.LoadUint64(&it.metrics.SuccessfulFirst),
        SuccessfulRetry: atomic.LoadUint64(&it.metrics.SuccessfulRetry),
        FailedExhausted: atomic.LoadUint64(&it.metrics.FailedExhausted),
    }
}
```

## Putting It All Together

Here's how you'd use the complete retry middleware in a real application:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "time"
    
    "yourapp/retry"
)

func main() {
    // Create metrics tracker
    metrics := &retry.Metrics{}
    
    // Create instrumented transport with custom settings
    transport := retry.NewInstrumentedTransport(metrics)
    transport.MaxAttempts = 5
    transport.InitialDelay = 200 * time.Millisecond
    transport.Jitter = retry.DecorrelatedJitter
    
    // Add logging callback
    transport.OnRetry = func(attempt int, err error, delay time.Duration) {
        log.Printf("Retry attempt %d after error: %v (waiting %v)", attempt, err, delay)
    }
    
    // Create HTTP client with our transport
    client := &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }
    
    // Make requests - retries happen automatically
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    
    req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/data", nil)
    resp, err := client.Do(req)
    
    if err != nil {
        log.Fatalf("Request failed: %v", err)
    }
    defer resp.Body.Close()
    
    // Check metrics
    m := transport.GetMetrics()
    fmt.Printf("Requests: %d, Retries: %d, Success rate: %.2f%%\n",
        m.TotalRequests,
        m.TotalRetries,
        float64(m.SuccessfulFirst+m.SuccessfulRetry)/float64(m.TotalRequests)*100,
    )
}
```

## Best Practices and Gotchas

A few things I've learned the hard way:

**Always buffer request bodies.** The request body is an `io.Reader` that can only be read once. If you don't buffer it, your second attempt will send an empty body.

**Set reasonable maximums.** Unbounded retries can cause cascading failures. Three to five attempts is usually plenty.

**Use idempotent operations.** Only retry operations that are safe to repeat. POST requests might create duplicate resources if you're not careful.

**Watch your timeouts.** If your client timeout is 10 seconds and you have 5 retries with 5 second max delays, you'll hit the timeout before exhausting retries. Make sure your math adds up.

**Log your retries.** When debugging production issues, knowing that a request succeeded on the third attempt is valuable information.

## Conclusion

Building retry middleware from scratch teaches you things that using a library never will. You understand exactly what's happening, you can customize it precisely to your needs, and you can debug it when things go wrong.

The patterns we covered - exponential backoff, jitter, context cancellation, and metrics - are the building blocks of resilient systems. They apply whether you're making HTTP calls, database queries, or message queue operations.

Start simple, add complexity as needed, and always measure the impact of your retries. Your future self debugging a 3 AM outage will thank you.

---

*Track retry metrics with [OneUptime](https://oneuptime.com) - monitor failure rates and identify unreliable dependencies.*
