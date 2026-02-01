# How to Build a Rate Limiter from Scratch in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Rate Limiting, API, Middleware, Token Bucket

Description: A practical guide to implementing rate limiters in Go using token bucket, sliding window, and fixed window algorithms.

---

Rate limiting is one of those things you don't think about until your API gets hammered by a misbehaving client or a sudden traffic spike takes down your service. I learned this the hard way when a single user's script sent 50,000 requests in under a minute to an endpoint that made database calls. The database connection pool got exhausted, and the whole service went down for everyone.

Building your own rate limiter isn't just an academic exercise - it gives you fine-grained control over how your API handles traffic and helps you understand what's happening under the hood. Let's build one from scratch in Go.

## Understanding Rate Limiting Algorithms

Before writing any code, you need to pick the right algorithm. Each has trade-offs, and the best choice depends on your use case.

### Fixed Window

The simplest approach. You divide time into fixed intervals (say, 1 minute) and count requests in each window. If someone makes 100 requests between 10:00:00 and 10:01:00, and your limit is 100/minute, they're blocked until 10:01:00.

The problem? Burst traffic at window boundaries. A user could make 100 requests at 10:00:59, then another 100 at 10:01:01 - effectively doubling your intended limit in a 2-second span.

### Sliding Window

This smooths out the boundary problem. Instead of hard cutoffs, you look at a rolling window. If someone made 60 requests in the last 30 seconds of the previous minute and it's now 15 seconds into the new minute, you calculate their effective rate as: `60 * (45/60) + current_count = 45 + current_count`.

More accurate, but requires tracking more state.

### Token Bucket

My personal favorite for most use cases. Imagine a bucket that holds tokens. Each request consumes a token. Tokens refill at a steady rate. If the bucket is empty, requests are rejected.

This naturally allows short bursts (up to the bucket size) while enforcing a long-term average rate. It's intuitive and efficient.

## Fixed Window Implementation

Let's start with the simplest implementation. This uses an in-memory store with a mutex for thread safety.

```go
package ratelimit

import (
	"sync"
	"time"
)

// FixedWindowLimiter tracks request counts in fixed time windows.
// It resets the counter at the start of each new window.
type FixedWindowLimiter struct {
	mu          sync.Mutex
	requests    map[string]*windowData
	limit       int
	windowSize  time.Duration
}

// windowData holds the count and expiration for a single client's window.
type windowData struct {
	count     int
	expiresAt time.Time
}

// NewFixedWindowLimiter creates a limiter that allows 'limit' requests
// per 'windowSize' duration for each unique key (usually client IP or API key).
func NewFixedWindowLimiter(limit int, windowSize time.Duration) *FixedWindowLimiter {
	return &FixedWindowLimiter{
		requests:   make(map[string]*windowData),
		limit:      limit,
		windowSize: windowSize,
	}
}

// Allow checks if a request from the given key should be permitted.
// Returns true if allowed, false if rate limited.
func (f *FixedWindowLimiter) Allow(key string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()

	now := time.Now()

	// Get or create window data for this key
	data, exists := f.requests[key]
	
	// If no data exists or the window has expired, start a new window
	if !exists || now.After(data.expiresAt) {
		f.requests[key] = &windowData{
			count:     1,
			expiresAt: now.Add(f.windowSize),
		}
		return true
	}

	// Window still active - check if under limit
	if data.count < f.limit {
		data.count++
		return true
	}

	return false
}
```

This works but has a memory leak - old entries never get cleaned up. In production, you'd want a background goroutine to periodically purge expired entries.

## Token Bucket Implementation

The token bucket is more elegant and handles bursts gracefully. Here's a clean implementation:

```go
package ratelimit

import (
	"sync"
	"time"
)

// TokenBucket implements the token bucket algorithm.
// Tokens are added at a fixed rate up to a maximum capacity.
// Each request consumes one token.
type TokenBucket struct {
	mu         sync.Mutex
	buckets    map[string]*bucket
	rate       float64       // tokens added per second
	capacity   int           // maximum tokens in bucket
	cleanupInterval time.Duration
}

// bucket tracks token state for a single client.
type bucket struct {
	tokens     float64
	lastUpdate time.Time
}

// NewTokenBucket creates a rate limiter with the specified refill rate
// and maximum burst capacity. Rate is tokens per second.
func NewTokenBucket(rate float64, capacity int) *TokenBucket {
	tb := &TokenBucket{
		buckets:  make(map[string]*bucket),
		rate:     rate,
		capacity: capacity,
		cleanupInterval: 10 * time.Minute,
	}
	
	// Start background cleanup to prevent memory leaks
	go tb.cleanup()
	
	return tb
}

// Allow checks if a request should be allowed for the given key.
// It refills tokens based on elapsed time, then tries to consume one.
func (tb *TokenBucket) Allow(key string) bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	b, exists := tb.buckets[key]

	if !exists {
		// First request from this key - create bucket with full capacity minus 1
		tb.buckets[key] = &bucket{
			tokens:     float64(tb.capacity) - 1,
			lastUpdate: now,
		}
		return true
	}

	// Calculate tokens to add based on time elapsed
	elapsed := now.Sub(b.lastUpdate).Seconds()
	b.tokens += elapsed * tb.rate
	
	// Cap at maximum capacity
	if b.tokens > float64(tb.capacity) {
		b.tokens = float64(tb.capacity)
	}
	
	b.lastUpdate = now

	// Try to consume a token
	if b.tokens >= 1 {
		b.tokens--
		return true
	}

	return false
}

// cleanup removes buckets that haven't been accessed recently.
// This prevents unbounded memory growth from abandoned clients.
func (tb *TokenBucket) cleanup() {
	ticker := time.NewTicker(tb.cleanupInterval)
	for range ticker.C {
		tb.mu.Lock()
		cutoff := time.Now().Add(-tb.cleanupInterval)
		for key, b := range tb.buckets {
			if b.lastUpdate.Before(cutoff) {
				delete(tb.buckets, key)
			}
		}
		tb.mu.Unlock()
	}
}
```

The key insight here is that we don't actually need a goroutine constantly adding tokens. We calculate the tokens lazily when a request comes in, based on how much time has passed since the last request. This is much more efficient.

## Sliding Window with Redis

For distributed systems, you need a shared store. Redis is perfect for this - it's fast and has atomic operations. Here's a sliding window implementation using Redis sorted sets:

```go
package ratelimit

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisSlidingWindow implements distributed rate limiting using Redis.
// It uses sorted sets to track request timestamps within the sliding window.
type RedisSlidingWindow struct {
	client     *redis.Client
	limit      int
	windowSize time.Duration
	keyPrefix  string
}

// NewRedisSlidingWindow creates a distributed rate limiter.
// All instances sharing the same Redis connection will share rate limit state.
func NewRedisSlidingWindow(client *redis.Client, limit int, windowSize time.Duration) *RedisSlidingWindow {
	return &RedisSlidingWindow{
		client:     client,
		limit:      limit,
		windowSize: windowSize,
		keyPrefix:  "ratelimit:",
	}
}

// Allow checks if a request should be allowed using a sliding window algorithm.
// Uses Redis sorted sets where score = timestamp for efficient range queries.
func (r *RedisSlidingWindow) Allow(ctx context.Context, key string) (bool, error) {
	now := time.Now()
	windowStart := now.Add(-r.windowSize)
	redisKey := r.keyPrefix + key

	// Use a pipeline to minimize round trips to Redis
	pipe := r.client.Pipeline()

	// Remove entries outside the current window
	pipe.ZRemRangeByScore(ctx, redisKey, "0", floatToString(float64(windowStart.UnixMicro())))

	// Count remaining entries in the window
	countCmd := pipe.ZCard(ctx, redisKey)

	// Execute the pipeline
	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, err
	}

	count := countCmd.Val()

	// Check if under limit
	if count >= int64(r.limit) {
		return false, nil
	}

	// Add current request to the sorted set
	// Using UnixMicro as both member and score ensures uniqueness
	member := float64(now.UnixMicro())
	err = r.client.ZAdd(ctx, redisKey, redis.Z{
		Score:  member,
		Member: member,
	}).Err()
	if err != nil {
		return false, err
	}

	// Set expiration on the key to auto-cleanup inactive clients
	r.client.Expire(ctx, redisKey, r.windowSize*2)

	return true, nil
}

func floatToString(f float64) string {
	return strconv.FormatFloat(f, 'f', -1, 64)
}
```

One thing to watch out for: this implementation has a tiny race condition between checking the count and adding the new entry. In practice, this rarely matters, but if you need strict guarantees, wrap everything in a Lua script for atomic execution.

## HTTP Middleware Integration

Rate limiters are most useful as middleware. Here's how to integrate with Go's standard HTTP library:

```go
package middleware

import (
	"net/http"
	"strings"
)

// RateLimiter defines the interface our middleware expects.
// This allows swapping implementations without changing middleware code.
type RateLimiter interface {
	Allow(key string) bool
}

// RateLimitMiddleware wraps an HTTP handler with rate limiting.
// It extracts client identity and checks the rate limiter before
// passing requests to the wrapped handler.
func RateLimitMiddleware(limiter RateLimiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract client identifier - prefer API key, fall back to IP
		key := extractClientKey(r)

		if !limiter.Allow(key) {
			// Return 429 Too Many Requests with helpful headers
			w.Header().Set("Retry-After", "60")
			w.Header().Set("X-RateLimit-Limit", "100")
			http.Error(w, "Rate limit exceeded. Please slow down.", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// extractClientKey determines the unique identifier for rate limiting.
// Uses API key if present, otherwise falls back to client IP.
func extractClientKey(r *http.Request) string {
	// Check for API key header first - more reliable than IP
	if apiKey := r.Header.Get("X-API-Key"); apiKey != "" {
		return "apikey:" + apiKey
	}

	// Fall back to IP address
	ip := r.RemoteAddr
	
	// Handle X-Forwarded-For when behind a proxy
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		// Take the first IP in the chain (original client)
		ip = strings.Split(forwarded, ",")[0]
		ip = strings.TrimSpace(ip)
	}

	// Strip port number if present
	if colonIdx := strings.LastIndex(ip, ":"); colonIdx != -1 {
		// Check if it's not an IPv6 address
		if strings.Count(ip, ":") == 1 {
			ip = ip[:colonIdx]
		}
	}

	return "ip:" + ip
}
```

Using it is straightforward:

```go
func main() {
	// Create a token bucket: 10 requests/second, burst up to 20
	limiter := ratelimit.NewTokenBucket(10, 20)

	// Your actual API handler
	apiHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello, World!"))
	})

	// Wrap with rate limiting
	http.Handle("/api/", middleware.RateLimitMiddleware(limiter, apiHandler))
	
	http.ListenAndServe(":8080", nil)
}
```

## Per-Client Limits

Different clients often need different limits. A free tier user shouldn't have the same allowance as an enterprise customer. Here's how to implement tiered limits:

```go
package ratelimit

import (
	"sync"
	"time"
)

// TierConfig defines rate limits for a specific tier.
type TierConfig struct {
	Rate     float64 // tokens per second
	Capacity int     // max burst size
}

// TieredLimiter applies different rate limits based on client tier.
// Each tier gets its own configuration, and clients are mapped to tiers.
type TieredLimiter struct {
	mu          sync.RWMutex
	buckets     map[string]*bucket
	tiers       map[string]TierConfig
	clientTiers map[string]string  // maps client key to tier name
	defaultTier TierConfig
}

// NewTieredLimiter creates a limiter with configurable per-tier limits.
func NewTieredLimiter(defaultTier TierConfig) *TieredLimiter {
	return &TieredLimiter{
		buckets:     make(map[string]*bucket),
		tiers:       make(map[string]TierConfig),
		clientTiers: make(map[string]string),
		defaultTier: defaultTier,
	}
}

// AddTier registers a new tier configuration.
func (t *TieredLimiter) AddTier(name string, config TierConfig) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.tiers[name] = config
}

// SetClientTier assigns a client to a specific tier.
// Call this when a user authenticates or upgrades their plan.
func (t *TieredLimiter) SetClientTier(clientKey, tierName string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.clientTiers[clientKey] = tierName
	
	// Reset their bucket so new limits take effect immediately
	delete(t.buckets, clientKey)
}

// Allow checks if a request should be allowed, using the client's tier config.
func (t *TieredLimiter) Allow(key string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	// Determine which tier config to use
	config := t.defaultTier
	if tierName, exists := t.clientTiers[key]; exists {
		if tierConfig, tierExists := t.tiers[tierName]; tierExists {
			config = tierConfig
		}
	}

	now := time.Now()
	b, exists := t.buckets[key]

	if !exists {
		t.buckets[key] = &bucket{
			tokens:     float64(config.Capacity) - 1,
			lastUpdate: now,
		}
		return true
	}

	// Refill tokens based on tier's rate
	elapsed := now.Sub(b.lastUpdate).Seconds()
	b.tokens += elapsed * config.Rate
	
	if b.tokens > float64(config.Capacity) {
		b.tokens = float64(config.Capacity)
	}
	
	b.lastUpdate = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}

	return false
}
```

## Practical Tips

A few things I've learned from running rate limiters in production:

**Return useful headers.** Clients need to know their limits and current usage. Include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` in your responses.

**Log rejections.** When you reject a request, log it. This helps you tune limits and identify abuse patterns. But be careful not to log at a rate that itself becomes a problem.

**Consider graceful degradation.** Instead of hard rejections, you might delay responses or return cached data. This provides a better user experience during traffic spikes.

**Test with realistic traffic patterns.** Synthetic benchmarks are useful, but real traffic is bursty and unpredictable. Load test with patterns that match your actual usage.

**Monitor your limits.** Track rejection rates over time. If you're rejecting 30% of requests from legitimate users, your limits are too tight. If you never reject anything, they might be too loose.

## Wrapping Up

Rate limiting seems simple on the surface, but there's real depth to getting it right. The token bucket algorithm handles most use cases well, and adding Redis makes it work across distributed systems. Start with something simple, monitor how it performs, and iterate from there.

The code examples here are production-ready starting points. You'll want to add proper error handling, metrics, and configuration management for your specific needs. But the core algorithms won't change - these patterns have been battle-tested across the industry for years.

---

*Monitor your rate limiter metrics with [OneUptime](https://oneuptime.com) - track rejection rates and identify traffic patterns.*
