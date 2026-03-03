# How to Handle API Rate Limiting in Custom Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Rate Limiting, API, Infrastructure as Code

Description: Learn how to implement robust API rate limiting handling in custom Terraform providers using retry logic, exponential backoff, and concurrency controls for reliable operations.

---

Every API has limits. Whether it is 100 requests per minute or 1000 requests per second, your Terraform provider will eventually hit rate limits, especially when managing dozens or hundreds of resources. Without proper rate limiting handling, Terraform operations fail with cryptic errors, leaving users frustrated and their infrastructure in an inconsistent state.

In this guide, we will cover how to implement robust rate limiting handling in your custom Terraform provider, including detection, retry logic, exponential backoff, and proactive throttling.

## Understanding Rate Limiting

APIs enforce rate limits to protect themselves from being overwhelmed. When you exceed the limit, the API returns an error, typically an HTTP 429 (Too Many Requests) status code. Many APIs also include headers that tell you how long to wait before retrying:

```text
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1677500000
```

Your provider needs to detect these responses and retry the request after an appropriate delay.

## Implementing Rate Limit Detection

First, create a utility that detects rate limit responses and extracts retry information:

```go
// internal/client/ratelimit.go
package client

import (
    "fmt"
    "net/http"
    "strconv"
    "time"
)

// RateLimitError represents a rate limit response from the API
type RateLimitError struct {
    RetryAfter time.Duration
    Limit      int
    Remaining  int
    ResetAt    time.Time
}

func (e *RateLimitError) Error() string {
    return fmt.Sprintf("rate limit exceeded, retry after %s", e.RetryAfter)
}

// IsRateLimitError checks if an HTTP response is a rate limit error
func IsRateLimitError(resp *http.Response) *RateLimitError {
    if resp.StatusCode != http.StatusTooManyRequests {
        return nil
    }

    rle := &RateLimitError{}

    // Parse the Retry-After header
    if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
        // Retry-After can be seconds or an HTTP date
        if seconds, err := strconv.Atoi(retryAfter); err == nil {
            rle.RetryAfter = time.Duration(seconds) * time.Second
        } else if t, err := http.ParseTime(retryAfter); err == nil {
            rle.RetryAfter = time.Until(t)
        }
    }

    // If no Retry-After header, use a default
    if rle.RetryAfter == 0 {
        rle.RetryAfter = 30 * time.Second
    }

    // Parse rate limit headers
    if limit := resp.Header.Get("X-RateLimit-Limit"); limit != "" {
        rle.Limit, _ = strconv.Atoi(limit)
    }
    if remaining := resp.Header.Get("X-RateLimit-Remaining"); remaining != "" {
        rle.Remaining, _ = strconv.Atoi(remaining)
    }
    if reset := resp.Header.Get("X-RateLimit-Reset"); reset != "" {
        if resetUnix, err := strconv.ParseInt(reset, 10, 64); err == nil {
            rle.ResetAt = time.Unix(resetUnix, 0)
        }
    }

    return rle
}
```

## Implementing Retry with Exponential Backoff

The standard approach for handling rate limits is retry with exponential backoff and jitter:

```go
// internal/client/retry.go
package client

import (
    "context"
    "math"
    "math/rand"
    "time"

    "github.com/hashicorp/terraform-plugin-log/tflog"
)

// RetryConfig configures retry behavior
type RetryConfig struct {
    MaxRetries     int           // Maximum number of retry attempts
    InitialBackoff time.Duration // Initial delay before first retry
    MaxBackoff     time.Duration // Maximum delay between retries
    BackoffFactor  float64       // Multiplier for exponential backoff
}

// DefaultRetryConfig returns sensible default retry settings
func DefaultRetryConfig() RetryConfig {
    return RetryConfig{
        MaxRetries:     5,
        InitialBackoff: 1 * time.Second,
        MaxBackoff:     60 * time.Second,
        BackoffFactor:  2.0,
    }
}

// RetryableFunc is a function that can be retried
type RetryableFunc func() error

// WithRetry executes a function with retry logic for rate limit errors
func WithRetry(ctx context.Context, config RetryConfig, fn RetryableFunc) error {
    var lastErr error

    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        // Execute the function
        err := fn()
        if err == nil {
            return nil
        }

        lastErr = err

        // Check if this is a rate limit error
        if rle, ok := err.(*RateLimitError); ok {
            // Use the server-provided retry delay
            delay := rle.RetryAfter

            tflog.Warn(ctx, "Rate limit hit, waiting before retry", map[string]interface{}{
                "attempt":     attempt + 1,
                "max_retries": config.MaxRetries,
                "delay":       delay.String(),
            })

            if err := sleep(ctx, delay); err != nil {
                return fmt.Errorf("context cancelled while waiting for rate limit: %w", err)
            }
            continue
        }

        // Check if this is a retryable server error (5xx)
        if isRetryableError(err) {
            // Calculate exponential backoff with jitter
            backoff := calculateBackoff(attempt, config)

            tflog.Warn(ctx, "Retryable error, backing off", map[string]interface{}{
                "attempt":     attempt + 1,
                "max_retries": config.MaxRetries,
                "delay":       backoff.String(),
                "error":       err.Error(),
            })

            if err := sleep(ctx, backoff); err != nil {
                return fmt.Errorf("context cancelled during backoff: %w", err)
            }
            continue
        }

        // Non-retryable error, return immediately
        return err
    }

    return fmt.Errorf("max retries (%d) exceeded: %w", config.MaxRetries, lastErr)
}

// calculateBackoff computes the delay for a given retry attempt
func calculateBackoff(attempt int, config RetryConfig) time.Duration {
    // Exponential backoff: initial * factor^attempt
    backoff := float64(config.InitialBackoff) * math.Pow(config.BackoffFactor, float64(attempt))

    // Cap at max backoff
    if backoff > float64(config.MaxBackoff) {
        backoff = float64(config.MaxBackoff)
    }

    // Add jitter (random value between 0 and 25% of the backoff)
    jitter := rand.Float64() * backoff * 0.25
    backoff = backoff + jitter

    return time.Duration(backoff)
}

// sleep waits for the specified duration or until context is cancelled
func sleep(ctx context.Context, d time.Duration) error {
    timer := time.NewTimer(d)
    defer timer.Stop()

    select {
    case <-ctx.Done():
        return ctx.Err()
    case <-timer.C:
        return nil
    }
}

// isRetryableError checks if an error should be retried
func isRetryableError(err error) bool {
    if serverErr, ok := err.(*ServerError); ok {
        return serverErr.StatusCode >= 500 && serverErr.StatusCode < 600
    }
    return false
}
```

## Integrating Retry Logic into the API Client

Wrap your API client to automatically handle rate limits on every request:

```go
// internal/client/client.go
package client

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

// Client wraps the HTTP client with rate limit handling
type Client struct {
    httpClient  *http.Client
    baseURL     string
    apiKey      string
    retryConfig RetryConfig
}

// NewClient creates a new API client with retry support
func NewClient(baseURL, apiKey string) *Client {
    return &Client{
        httpClient:  &http.Client{Timeout: 30 * time.Second},
        baseURL:     baseURL,
        apiKey:      apiKey,
        retryConfig: DefaultRetryConfig(),
    }
}

// doRequest executes an HTTP request with automatic rate limit handling
func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}, result interface{}) error {
    return WithRetry(ctx, c.retryConfig, func() error {
        // Build the request
        var bodyReader io.Reader
        if body != nil {
            bodyBytes, err := json.Marshal(body)
            if err != nil {
                return fmt.Errorf("error marshaling request body: %w", err)
            }
            bodyReader = bytes.NewReader(bodyBytes)
        }

        req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
        if err != nil {
            return fmt.Errorf("error creating request: %w", err)
        }

        req.Header.Set("Authorization", "Bearer "+c.apiKey)
        req.Header.Set("Content-Type", "application/json")

        // Execute the request
        resp, err := c.httpClient.Do(req)
        if err != nil {
            return fmt.Errorf("error executing request: %w", err)
        }
        defer resp.Body.Close()

        // Check for rate limiting
        if rle := IsRateLimitError(resp); rle != nil {
            return rle
        }

        // Check for server errors
        if resp.StatusCode >= 500 {
            respBody, _ := io.ReadAll(resp.Body)
            return &ServerError{
                StatusCode: resp.StatusCode,
                Message:    string(respBody),
            }
        }

        // Check for client errors
        if resp.StatusCode >= 400 {
            respBody, _ := io.ReadAll(resp.Body)
            return &ClientError{
                StatusCode: resp.StatusCode,
                Message:    string(respBody),
            }
        }

        // Parse the response
        if result != nil {
            if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
                return fmt.Errorf("error decoding response: %w", err)
            }
        }

        return nil
    })
}
```

## Proactive Rate Limit Awareness

Instead of only reacting to 429 errors, you can proactively track rate limit usage and slow down before hitting the limit:

```go
// internal/client/throttle.go
package client

import (
    "context"
    "sync"
    "time"
)

// Throttler implements proactive rate limiting
type Throttler struct {
    mu           sync.Mutex
    remaining    int
    limit        int
    resetAt      time.Time
    safetyMargin float64 // Keep this fraction of the limit as buffer
}

// NewThrottler creates a throttler with the given limits
func NewThrottler(limit int) *Throttler {
    return &Throttler{
        remaining:    limit,
        limit:        limit,
        resetAt:      time.Now().Add(time.Minute),
        safetyMargin: 0.1, // Keep 10% as safety buffer
    }
}

// Wait blocks until it is safe to make a request
func (t *Throttler) Wait(ctx context.Context) error {
    t.mu.Lock()
    defer t.mu.Unlock()

    // If past the reset time, refresh the counter
    if time.Now().After(t.resetAt) {
        t.remaining = t.limit
        t.resetAt = time.Now().Add(time.Minute)
    }

    // Calculate the safety threshold
    safetyThreshold := int(float64(t.limit) * t.safetyMargin)

    // If we are below the safety threshold, wait until reset
    if t.remaining <= safetyThreshold {
        waitDuration := time.Until(t.resetAt)
        if waitDuration > 0 {
            t.mu.Unlock()
            err := sleep(ctx, waitDuration)
            t.mu.Lock()
            if err != nil {
                return err
            }
            // Refresh after waiting
            t.remaining = t.limit
            t.resetAt = time.Now().Add(time.Minute)
        }
    }

    t.remaining--
    return nil
}

// UpdateFromResponse updates the throttler with rate limit headers
func (t *Throttler) UpdateFromResponse(remaining int, resetAt time.Time) {
    t.mu.Lock()
    defer t.mu.Unlock()

    t.remaining = remaining
    t.resetAt = resetAt
}
```

## Concurrency Control

Terraform can make multiple API calls concurrently, especially when managing many resources. Use a semaphore to limit concurrent requests:

```go
// internal/client/semaphore.go
package client

import (
    "context"
)

// Semaphore limits concurrent operations
type Semaphore struct {
    ch chan struct{}
}

// NewSemaphore creates a semaphore with the given capacity
func NewSemaphore(capacity int) *Semaphore {
    return &Semaphore{
        ch: make(chan struct{}, capacity),
    }
}

// Acquire blocks until a slot is available
func (s *Semaphore) Acquire(ctx context.Context) error {
    select {
    case s.ch <- struct{}{}:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

// Release frees a slot
func (s *Semaphore) Release() {
    <-s.ch
}
```

Integrate it into your client:

```go
type Client struct {
    httpClient  *http.Client
    baseURL     string
    apiKey      string
    retryConfig RetryConfig
    semaphore   *Semaphore
    throttler   *Throttler
}

func NewClient(baseURL, apiKey string) *Client {
    return &Client{
        httpClient:  &http.Client{Timeout: 30 * time.Second},
        baseURL:     baseURL,
        apiKey:      apiKey,
        retryConfig: DefaultRetryConfig(),
        semaphore:   NewSemaphore(10), // Limit to 10 concurrent requests
        throttler:   NewThrottler(100), // API limit: 100 requests per minute
    }
}

func (c *Client) doRequest(ctx context.Context, method, path string, body, result interface{}) error {
    // Acquire concurrency slot
    if err := c.semaphore.Acquire(ctx); err != nil {
        return err
    }
    defer c.semaphore.Release()

    // Wait for rate limit clearance
    if err := c.throttler.Wait(ctx); err != nil {
        return err
    }

    // ... rest of the request logic with retry ...
}
```

## Testing Rate Limit Handling

Write unit tests to verify your retry logic:

```go
func TestWithRetry_RateLimitError(t *testing.T) {
    attempts := 0
    config := RetryConfig{
        MaxRetries:     3,
        InitialBackoff: 10 * time.Millisecond,
        MaxBackoff:     100 * time.Millisecond,
        BackoffFactor:  2.0,
    }

    err := WithRetry(context.Background(), config, func() error {
        attempts++
        if attempts < 3 {
            return &RateLimitError{RetryAfter: 10 * time.Millisecond}
        }
        return nil
    })

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if attempts != 3 {
        t.Fatalf("expected 3 attempts, got %d", attempts)
    }
}
```

## Best Practices

**Always respect Retry-After headers.** When the API tells you how long to wait, follow its guidance.

**Use exponential backoff with jitter.** This prevents thundering herd problems when multiple Terraform runs hit rate limits simultaneously.

**Log rate limit events.** Use `tflog.Warn` to inform users when rate limits are being hit, so they know why operations are slow.

**Set reasonable concurrency limits.** The default parallelism in Terraform is 10, so your API client should handle at least 10 concurrent requests gracefully.

**Make retry configuration available.** Consider exposing retry settings in the provider configuration so users can tune them for their environment.

## Conclusion

Handling API rate limiting properly is essential for building a reliable Terraform provider. By implementing retry with exponential backoff, proactive throttling, and concurrency control, you can ensure your provider works smoothly even under heavy load.

For more on building robust providers, see our guides on [implementing timeouts](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-timeouts-in-custom-provider-resources/view) and [handling provider error messages](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-error-messages/view).
