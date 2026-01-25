# How to Implement Token Bucket Rate Limiting in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Rate Limiting, Token Bucket, API, Performance

Description: A hands-on guide to building a token bucket rate limiter in Go from scratch, with production-ready code and practical examples for protecting your APIs.

---

Rate limiting is one of those things you don't think about until your API gets hammered by a misbehaving client or a sudden traffic spike. The token bucket algorithm is a popular choice because it handles bursty traffic gracefully while still enforcing an average rate limit. Let's build one in Go.

## Why Token Bucket?

There are several rate limiting algorithms out there - fixed window, sliding window, leaky bucket - but token bucket stands out for a few reasons:

| Algorithm | Burst Handling | Memory | Complexity |
|-----------|---------------|--------|------------|
| Fixed Window | Poor (2x burst at edges) | Low | Simple |
| Sliding Window | Good | Medium | Moderate |
| Leaky Bucket | None (constant rate) | Low | Simple |
| Token Bucket | Controlled bursts | Low | Moderate |

Token bucket lets clients burst up to a maximum capacity, then enforces a steady refill rate. This matches real-world traffic patterns better than algorithms that strictly enforce a constant rate.

## How Token Bucket Works

Think of it like an arcade token dispenser:

1. You have a bucket that holds a maximum number of tokens (the burst capacity)
2. Tokens are added at a fixed rate (the refill rate)
3. Each request consumes one or more tokens
4. If there aren't enough tokens, the request is rejected
5. Tokens don't accumulate beyond the bucket size

This means a client can make quick bursts of requests (using saved tokens) but can't sustain a rate higher than the refill rate.

## Basic Implementation

Here's a straightforward token bucket implementation in Go:

```go
package ratelimit

import (
    "sync"
    "time"
)

// TokenBucket implements the token bucket rate limiting algorithm
type TokenBucket struct {
    capacity   float64       // Maximum tokens the bucket can hold
    tokens     float64       // Current token count
    refillRate float64       // Tokens added per second
    lastRefill time.Time     // Last time we refilled tokens
    mu         sync.Mutex    // Protects concurrent access
}

// NewTokenBucket creates a rate limiter with the given capacity and refill rate
func NewTokenBucket(capacity float64, refillRate float64) *TokenBucket {
    return &TokenBucket{
        capacity:   capacity,
        tokens:     capacity,  // Start with a full bucket
        refillRate: refillRate,
        lastRefill: time.Now(),
    }
}

// refill adds tokens based on elapsed time since last refill
func (tb *TokenBucket) refill() {
    now := time.Now()
    elapsed := now.Sub(tb.lastRefill).Seconds()

    // Calculate tokens to add based on time passed
    tokensToAdd := elapsed * tb.refillRate
    tb.tokens = min(tb.capacity, tb.tokens+tokensToAdd)
    tb.lastRefill = now
}

// Allow checks if a request should be allowed and consumes a token if so
func (tb *TokenBucket) Allow() bool {
    return tb.AllowN(1)
}

// AllowN checks if n tokens are available and consumes them if so
func (tb *TokenBucket) AllowN(n float64) bool {
    tb.mu.Lock()
    defer tb.mu.Unlock()

    tb.refill()

    if tb.tokens >= n {
        tb.tokens -= n
        return true
    }
    return false
}

// TokensAvailable returns the current number of tokens (for monitoring)
func (tb *TokenBucket) TokensAvailable() float64 {
    tb.mu.Lock()
    defer tb.mu.Unlock()

    tb.refill()
    return tb.tokens
}
```

## Per-Client Rate Limiting

In most real applications, you want to rate limit per client (by IP, API key, or user ID). Here's how to manage multiple buckets:

```go
package ratelimit

import (
    "sync"
    "time"
)

// RateLimiter manages token buckets for multiple clients
type RateLimiter struct {
    buckets    map[string]*TokenBucket
    capacity   float64
    refillRate float64
    mu         sync.RWMutex

    // Cleanup settings
    cleanupInterval time.Duration
    maxIdleTime     time.Duration
    stopCleanup     chan struct{}
}

// NewRateLimiter creates a new per-client rate limiter
func NewRateLimiter(capacity, refillRate float64) *RateLimiter {
    rl := &RateLimiter{
        buckets:         make(map[string]*TokenBucket),
        capacity:        capacity,
        refillRate:      refillRate,
        cleanupInterval: time.Minute,
        maxIdleTime:     time.Hour,
        stopCleanup:     make(chan struct{}),
    }

    // Start background cleanup goroutine
    go rl.cleanupLoop()

    return rl
}

// Allow checks if a request from the given client should be allowed
func (rl *RateLimiter) Allow(clientID string) bool {
    return rl.AllowN(clientID, 1)
}

// AllowN checks if n tokens are available for the client
func (rl *RateLimiter) AllowN(clientID string, n float64) bool {
    bucket := rl.getBucket(clientID)
    return bucket.AllowN(n)
}

// getBucket returns the bucket for a client, creating one if needed
func (rl *RateLimiter) getBucket(clientID string) *TokenBucket {
    // Try read lock first for better performance
    rl.mu.RLock()
    bucket, exists := rl.buckets[clientID]
    rl.mu.RUnlock()

    if exists {
        return bucket
    }

    // Need to create a new bucket
    rl.mu.Lock()
    defer rl.mu.Unlock()

    // Double-check after acquiring write lock
    if bucket, exists = rl.buckets[clientID]; exists {
        return bucket
    }

    bucket = NewTokenBucket(rl.capacity, rl.refillRate)
    rl.buckets[clientID] = bucket
    return bucket
}

// cleanupLoop removes idle buckets to prevent memory leaks
func (rl *RateLimiter) cleanupLoop() {
    ticker := time.NewTicker(rl.cleanupInterval)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            rl.cleanup()
        case <-rl.stopCleanup:
            return
        }
    }
}

// cleanup removes buckets that haven't been used recently
func (rl *RateLimiter) cleanup() {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    threshold := time.Now().Add(-rl.maxIdleTime)

    for clientID, bucket := range rl.buckets {
        bucket.mu.Lock()
        if bucket.lastRefill.Before(threshold) {
            delete(rl.buckets, clientID)
        }
        bucket.mu.Unlock()
    }
}

// Stop shuts down the cleanup goroutine
func (rl *RateLimiter) Stop() {
    close(rl.stopCleanup)
}
```

## HTTP Middleware

Wrap it in middleware for easy integration with your HTTP server:

```go
package ratelimit

import (
    "net/http"
    "strconv"
)

// Middleware returns an HTTP middleware that applies rate limiting
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Use client IP as identifier (in production, consider X-Forwarded-For)
        clientID := r.RemoteAddr

        if !rl.Allow(clientID) {
            // Set standard rate limit headers
            w.Header().Set("X-RateLimit-Limit", strconv.FormatFloat(rl.capacity, 'f', 0, 64))
            w.Header().Set("X-RateLimit-Remaining", "0")
            w.Header().Set("Retry-After", strconv.Itoa(int(1/rl.refillRate)))

            http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

Usage example:

```go
package main

import (
    "fmt"
    "net/http"

    "yourproject/ratelimit"
)

func main() {
    // Allow 100 requests burst, refill at 10 requests per second
    limiter := ratelimit.NewRateLimiter(100, 10)
    defer limiter.Stop()

    mux := http.NewServeMux()
    mux.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, World!")
    })

    // Apply rate limiting middleware
    handler := limiter.Middleware(mux)

    http.ListenAndServe(":8080", handler)
}
```

## Different Costs for Different Endpoints

Some endpoints are more expensive than others. You can consume multiple tokens for heavy operations:

```go
func expensiveEndpoint(limiter *ratelimit.RateLimiter) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        clientID := r.RemoteAddr

        // This endpoint costs 10 tokens
        if !limiter.AllowN(clientID, 10) {
            http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
            return
        }

        // Handle expensive operation
        processExpensiveRequest(w, r)
    }
}
```

## Best Practices

**Choose appropriate values.** Your capacity determines burst size and refill rate determines sustained throughput. For a typical API:
- Capacity of 100-200 allows reasonable bursts for page loads
- Refill rate of 10-20 per second handles normal usage patterns

**Always clean up idle buckets.** Without cleanup, your memory usage will grow indefinitely as new clients appear. The cleanup goroutine in the example handles this.

**Use the right client identifier.** IP addresses work for simple cases, but consider:
- API keys for authenticated APIs
- User IDs for logged-in users
- Combination of IP and endpoint for public APIs

**Return proper headers.** Always include `Retry-After` and rate limit headers so clients know when to retry and can implement backoff:

```go
w.Header().Set("X-RateLimit-Limit", "100")
w.Header().Set("X-RateLimit-Remaining", "45")
w.Header().Set("X-RateLimit-Reset", "1706200000")  // Unix timestamp
w.Header().Set("Retry-After", "10")
```

## Common Pitfalls

**Forgetting thread safety.** Go's HTTP server handles requests concurrently. Without proper locking, you'll have race conditions that corrupt your token counts.

**Starting with empty buckets.** Always initialize buckets with full capacity. Otherwise, legitimate clients get rate limited on their very first request.

**Not handling time drift.** If your server's clock jumps forward (NTP sync, VM migration), you might add way too many tokens. Consider capping the time delta:

```go
func (tb *TokenBucket) refill() {
    now := time.Now()
    elapsed := now.Sub(tb.lastRefill).Seconds()

    // Cap elapsed time to prevent issues with clock jumps
    if elapsed > 60 {
        elapsed = 60
    }

    tokensToAdd := elapsed * tb.refillRate
    tb.tokens = min(tb.capacity, tb.tokens+tokensToAdd)
    tb.lastRefill = now
}
```

**Ignoring memory in distributed systems.** This in-memory implementation works for single-instance deployments. For distributed systems, you'll need Redis or another shared store to maintain consistent rate limits across instances.

## When to Use Something Else

Token bucket is great for most use cases, but consider alternatives when:

- You need strict constant-rate processing - use leaky bucket instead
- You want precise per-second limits without bursts - use sliding window
- You're building a distributed system - use Redis-based solutions like `go-redis/redis_rate`

## Wrapping Up

Token bucket rate limiting gives you a solid balance between allowing legitimate burst traffic and protecting your services from abuse. The implementation above handles the common cases well, but remember to tune the capacity and refill rate based on your actual traffic patterns and server capacity.

Start with conservative limits and adjust based on monitoring data. It's easier to relax limits than to deal with an overloaded server.
