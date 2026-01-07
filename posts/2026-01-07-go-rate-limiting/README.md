# How to Implement Rate Limiting in Go Without External Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Rate Limiting, API, Performance, Security, Redis

Description: Learn to implement rate limiting in Go using in-memory and Redis-based approaches with token bucket and sliding window algorithms.

---

Rate limiting is a critical technique for protecting your APIs from abuse, ensuring fair resource usage, and maintaining system stability. In this comprehensive guide, we will explore how to implement rate limiting in Go using two popular algorithms: the token bucket and sliding window. We will cover both in-memory solutions for single-instance applications and Redis-based implementations for distributed systems.

## Why Rate Limiting Matters

Before diving into implementation, let us understand why rate limiting is essential:

1. **Protection against DDoS attacks**: Limits the impact of malicious traffic
2. **Fair resource allocation**: Ensures all users get equitable access
3. **Cost control**: Prevents runaway API usage that could inflate infrastructure costs
4. **System stability**: Protects backend services from being overwhelmed
5. **SLA compliance**: Helps maintain promised service levels

## Understanding Rate Limiting Algorithms

### Token Bucket Algorithm

The token bucket algorithm works like a bucket that holds tokens. Each request consumes a token, and tokens are added to the bucket at a fixed rate. If the bucket is empty, requests are rejected. This algorithm allows for burst traffic up to the bucket capacity while maintaining an average rate limit.

**Key characteristics:**
- Allows controlled bursts of traffic
- Smooth rate limiting over time
- Simple to implement and understand

### Sliding Window Algorithm

The sliding window algorithm tracks requests within a time window that slides with the current time. Unlike fixed windows, it prevents the boundary problem where users could make double the allowed requests at window boundaries.

**Key characteristics:**
- More accurate rate limiting
- Prevents boundary exploitation
- Slightly more complex than token bucket

## Project Setup

Let us start by setting up our Go project with the necessary dependencies.

```bash
# Create a new Go module
mkdir rate-limiter && cd rate-limiter
go mod init github.com/yourorg/rate-limiter

# Install dependencies
go get github.com/redis/go-redis/v9
go get github.com/gin-gonic/gin
```

## In-Memory Token Bucket Implementation

This implementation uses sync.Map for thread-safe storage of rate limiters per client, making it suitable for single-instance applications.

```go
package ratelimit

import (
	"sync"
	"time"
)

// TokenBucket represents a token bucket rate limiter for a single client.
// It refills tokens at a steady rate up to the maximum capacity.
type TokenBucket struct {
	tokens     float64
	capacity   float64
	refillRate float64    // tokens per second
	lastRefill time.Time
	mu         sync.Mutex
}

// NewTokenBucket creates a new token bucket with the specified capacity and refill rate.
// The bucket starts full, allowing immediate burst traffic up to capacity.
func NewTokenBucket(capacity float64, refillRate float64) *TokenBucket {
	return &TokenBucket{
		tokens:     capacity,
		capacity:   capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// Allow checks if a request should be allowed and consumes a token if so.
// Returns true if the request is allowed, false if rate limited.
func (tb *TokenBucket) Allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	// Calculate tokens to add based on elapsed time since last refill
	now := time.Now()
	elapsed := now.Sub(tb.lastRefill).Seconds()
	tb.tokens += elapsed * tb.refillRate

	// Cap tokens at bucket capacity to prevent unlimited accumulation
	if tb.tokens > tb.capacity {
		tb.tokens = tb.capacity
	}

	tb.lastRefill = now

	// Check if we have at least one token available
	if tb.tokens >= 1 {
		tb.tokens--
		return true
	}

	return false
}

// TokensRemaining returns the current number of tokens in the bucket.
// Useful for debugging and monitoring purposes.
func (tb *TokenBucket) TokensRemaining() float64 {
	tb.mu.Lock()
	defer tb.mu.Unlock()
	return tb.tokens
}
```

Now let us create a manager that handles multiple clients using sync.Map for concurrent access.

```go
package ratelimit

import (
	"sync"
	"time"
)

// InMemoryRateLimiter manages token buckets for multiple clients.
// Uses sync.Map for efficient concurrent access without global locks.
type InMemoryRateLimiter struct {
	buckets    sync.Map // map[string]*TokenBucket
	capacity   float64
	refillRate float64
	cleanupMu  sync.Mutex
}

// NewInMemoryRateLimiter creates a new rate limiter with the specified
// capacity (max burst size) and refill rate (requests per second).
func NewInMemoryRateLimiter(capacity float64, refillRate float64) *InMemoryRateLimiter {
	limiter := &InMemoryRateLimiter{
		capacity:   capacity,
		refillRate: refillRate,
	}

	// Start background cleanup to remove stale buckets and free memory
	go limiter.startCleanup()

	return limiter
}

// Allow checks if a request from the given key (usually client IP or API key)
// should be allowed. Creates a new bucket if one does not exist for this key.
func (rl *InMemoryRateLimiter) Allow(key string) bool {
	// Try to load existing bucket first (common case, no allocation needed)
	if bucket, ok := rl.buckets.Load(key); ok {
		return bucket.(*TokenBucket).Allow()
	}

	// Create new bucket for first-time clients
	newBucket := NewTokenBucket(rl.capacity, rl.refillRate)

	// Use LoadOrStore to handle race conditions where multiple goroutines
	// might try to create a bucket for the same key simultaneously
	actual, _ := rl.buckets.LoadOrStore(key, newBucket)
	return actual.(*TokenBucket).Allow()
}

// startCleanup periodically removes buckets that have been inactive
// to prevent memory leaks from short-lived clients.
func (rl *InMemoryRateLimiter) startCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.cleanup()
	}
}

// cleanup removes buckets that have accumulated full tokens, indicating
// no recent activity. This heuristic works because active clients will
// have partially depleted buckets.
func (rl *InMemoryRateLimiter) cleanup() {
	rl.cleanupMu.Lock()
	defer rl.cleanupMu.Unlock()

	rl.buckets.Range(func(key, value interface{}) bool {
		bucket := value.(*TokenBucket)
		// If bucket is full, client has been inactive long enough to refill
		if bucket.TokensRemaining() >= rl.capacity {
			rl.buckets.Delete(key)
		}
		return true
	})
}

// Stats returns the current number of tracked clients.
// Useful for monitoring and capacity planning.
func (rl *InMemoryRateLimiter) Stats() int {
	count := 0
	rl.buckets.Range(func(key, value interface{}) bool {
		count++
		return true
	})
	return count
}
```

## In-Memory Sliding Window Implementation

The sliding window provides more accurate rate limiting by considering the weighted overlap between time windows.

```go
package ratelimit

import (
	"sync"
	"time"
)

// SlidingWindow implements a sliding window rate limiter.
// It provides more accurate limiting than fixed windows by considering
// the overlap between the previous and current window.
type SlidingWindow struct {
	limit          int
	windowSize     time.Duration
	previousCount  int
	currentCount   int
	windowStart    time.Time
	mu             sync.Mutex
}

// NewSlidingWindow creates a sliding window limiter with the specified
// limit (max requests) and window size (time period).
func NewSlidingWindow(limit int, windowSize time.Duration) *SlidingWindow {
	return &SlidingWindow{
		limit:       limit,
		windowSize:  windowSize,
		windowStart: time.Now().Truncate(windowSize),
	}
}

// Allow checks if a request should be allowed using the sliding window algorithm.
// The algorithm estimates the request rate by combining counts from the current
// and previous windows, weighted by how far we are into the current window.
func (sw *SlidingWindow) Allow() bool {
	sw.mu.Lock()
	defer sw.mu.Unlock()

	now := time.Now()
	currentWindow := now.Truncate(sw.windowSize)

	// Check if we have moved to a new window
	if currentWindow.After(sw.windowStart) {
		// Calculate how many windows have passed
		windowsPassed := int(currentWindow.Sub(sw.windowStart) / sw.windowSize)

		if windowsPassed == 1 {
			// Moved to next window: current becomes previous
			sw.previousCount = sw.currentCount
			sw.currentCount = 0
		} else {
			// Skipped multiple windows: reset both counts
			sw.previousCount = 0
			sw.currentCount = 0
		}
		sw.windowStart = currentWindow
	}

	// Calculate the weighted count using sliding window formula
	// Weight represents how far we are into the current window (0.0 to 1.0)
	elapsedInWindow := now.Sub(sw.windowStart)
	weight := float64(sw.windowSize-elapsedInWindow) / float64(sw.windowSize)

	// Estimated count = (previous * weight) + current
	// This smoothly transitions from previous to current counts
	estimatedCount := float64(sw.previousCount)*weight + float64(sw.currentCount)

	if estimatedCount >= float64(sw.limit) {
		return false
	}

	sw.currentCount++
	return true
}

// GetCount returns the current estimated request count for monitoring.
func (sw *SlidingWindow) GetCount() float64 {
	sw.mu.Lock()
	defer sw.mu.Unlock()

	now := time.Now()
	elapsedInWindow := now.Sub(sw.windowStart)
	weight := float64(sw.windowSize-elapsedInWindow) / float64(sw.windowSize)

	return float64(sw.previousCount)*weight + float64(sw.currentCount)
}
```

Manager for sliding window with concurrent client handling:

```go
package ratelimit

import (
	"sync"
	"time"
)

// SlidingWindowLimiter manages sliding windows for multiple clients.
// Suitable for single-instance applications requiring accurate rate limiting.
type SlidingWindowLimiter struct {
	windows    sync.Map // map[string]*SlidingWindow
	limit      int
	windowSize time.Duration
}

// NewSlidingWindowLimiter creates a rate limiter that allows 'limit' requests
// per 'windowSize' duration for each unique client key.
func NewSlidingWindowLimiter(limit int, windowSize time.Duration) *SlidingWindowLimiter {
	return &SlidingWindowLimiter{
		limit:      limit,
		windowSize: windowSize,
	}
}

// Allow checks if a request from the given key should be allowed.
// Thread-safe and creates new windows for new clients automatically.
func (swl *SlidingWindowLimiter) Allow(key string) bool {
	if window, ok := swl.windows.Load(key); ok {
		return window.(*SlidingWindow).Allow()
	}

	newWindow := NewSlidingWindow(swl.limit, swl.windowSize)
	actual, _ := swl.windows.LoadOrStore(key, newWindow)
	return actual.(*SlidingWindow).Allow()
}

// GetClientCount returns the estimated request count for a specific client.
func (swl *SlidingWindowLimiter) GetClientCount(key string) float64 {
	if window, ok := swl.windows.Load(key); ok {
		return window.(*SlidingWindow).GetCount()
	}
	return 0
}
```

## Redis-Based Distributed Rate Limiting

For distributed systems where multiple instances serve requests, we need a centralized rate limiter. Redis is an excellent choice due to its atomic operations and high performance.

### Redis Token Bucket Implementation

This implementation uses Redis to store token bucket state, enabling rate limiting across multiple application instances.

```go
package ratelimit

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisTokenBucket implements distributed rate limiting using Redis.
// Token state is stored in Redis, allowing multiple application instances
// to share rate limit state for consistent limiting across the cluster.
type RedisTokenBucket struct {
	client     *redis.Client
	capacity   float64
	refillRate float64 // tokens per second
	keyPrefix  string
}

// NewRedisTokenBucket creates a distributed token bucket rate limiter.
// All instances using the same Redis and keyPrefix will share rate limit state.
func NewRedisTokenBucket(client *redis.Client, capacity, refillRate float64, keyPrefix string) *RedisTokenBucket {
	return &RedisTokenBucket{
		client:     client,
		capacity:   capacity,
		refillRate: refillRate,
		keyPrefix:  keyPrefix,
	}
}

// Allow checks if a request should be allowed using a Lua script for atomicity.
// The script ensures that read-modify-write operations are atomic in Redis.
func (rtb *RedisTokenBucket) Allow(ctx context.Context, key string) (bool, error) {
	// Lua script for atomic token bucket operations
	// This prevents race conditions between multiple application instances
	script := redis.NewScript(`
		local key = KEYS[1]
		local capacity = tonumber(ARGV[1])
		local refill_rate = tonumber(ARGV[2])
		local now = tonumber(ARGV[3])

		-- Get current bucket state from Redis
		local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
		local tokens = tonumber(bucket[1])
		local last_refill = tonumber(bucket[2])

		-- Initialize bucket if it does not exist
		if tokens == nil then
			tokens = capacity
			last_refill = now
		end

		-- Calculate tokens to add based on elapsed time
		local elapsed = now - last_refill
		tokens = math.min(capacity, tokens + (elapsed * refill_rate))

		local allowed = 0
		if tokens >= 1 then
			tokens = tokens - 1
			allowed = 1
		end

		-- Update bucket state in Redis with expiry to auto-cleanup inactive keys
		redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
		redis.call('EXPIRE', key, 3600)  -- Expire after 1 hour of inactivity

		return {allowed, tokens}
	`)

	redisKey := fmt.Sprintf("%s:%s", rtb.keyPrefix, key)
	now := float64(time.Now().UnixNano()) / 1e9

	result, err := script.Run(ctx, rtb.client, []string{redisKey},
		rtb.capacity, rtb.refillRate, now).Slice()
	if err != nil {
		return false, fmt.Errorf("redis script execution failed: %w", err)
	}

	allowed := result[0].(int64) == 1
	return allowed, nil
}

// GetTokens returns the current token count for a key without consuming tokens.
// Useful for monitoring and debugging rate limit state.
func (rtb *RedisTokenBucket) GetTokens(ctx context.Context, key string) (float64, error) {
	redisKey := fmt.Sprintf("%s:%s", rtb.keyPrefix, key)
	result, err := rtb.client.HGet(ctx, redisKey, "tokens").Result()
	if err == redis.Nil {
		return rtb.capacity, nil
	}
	if err != nil {
		return 0, err
	}

	tokens, err := strconv.ParseFloat(result, 64)
	if err != nil {
		return 0, err
	}
	return tokens, nil
}
```

### Redis Sliding Window Implementation

A distributed sliding window implementation using Redis sorted sets for efficient time-based queries.

```go
package ratelimit

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisSlidingWindow implements distributed sliding window rate limiting.
// Uses Redis sorted sets to track request timestamps, enabling accurate
// sliding window calculations across multiple application instances.
type RedisSlidingWindow struct {
	client     *redis.Client
	limit      int
	windowSize time.Duration
	keyPrefix  string
}

// NewRedisSlidingWindow creates a distributed sliding window rate limiter.
// Requests within windowSize are counted against the limit.
func NewRedisSlidingWindow(client *redis.Client, limit int, windowSize time.Duration, keyPrefix string) *RedisSlidingWindow {
	return &RedisSlidingWindow{
		client:     client,
		limit:      limit,
		windowSize: windowSize,
		keyPrefix:  keyPrefix,
	}
}

// Allow checks if a request should be allowed using Redis sorted sets.
// Each request is stored with its timestamp as the score for efficient
// range queries and automatic ordering.
func (rsw *RedisSlidingWindow) Allow(ctx context.Context, key string) (bool, error) {
	// Lua script ensures atomic execution of all operations
	script := redis.NewScript(`
		local key = KEYS[1]
		local limit = tonumber(ARGV[1])
		local window_size_ms = tonumber(ARGV[2])
		local now = tonumber(ARGV[3])
		local window_start = now - window_size_ms

		-- Remove expired entries outside the current window
		redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

		-- Count requests in current window
		local count = redis.call('ZCARD', key)

		if count < limit then
			-- Add current request with timestamp as score
			-- Using now + unique suffix prevents duplicate scores
			redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
			-- Set TTL slightly longer than window to ensure cleanup
			redis.call('PEXPIRE', key, window_size_ms + 1000)
			return {1, count + 1}
		end

		return {0, count}
	`)

	redisKey := fmt.Sprintf("%s:%s", rsw.keyPrefix, key)
	nowMs := time.Now().UnixMilli()
	windowSizeMs := rsw.windowSize.Milliseconds()

	result, err := script.Run(ctx, rsw.client, []string{redisKey},
		rsw.limit, windowSizeMs, nowMs).Slice()
	if err != nil {
		return false, fmt.Errorf("redis script execution failed: %w", err)
	}

	allowed := result[0].(int64) == 1
	return allowed, nil
}

// GetCount returns the current request count in the sliding window.
func (rsw *RedisSlidingWindow) GetCount(ctx context.Context, key string) (int64, error) {
	redisKey := fmt.Sprintf("%s:%s", rsw.keyPrefix, key)
	nowMs := time.Now().UnixMilli()
	windowStart := nowMs - rsw.windowSize.Milliseconds()

	// First clean up old entries, then count
	pipe := rsw.client.Pipeline()
	pipe.ZRemRangeByScore(ctx, redisKey, "-inf", fmt.Sprintf("%d", windowStart))
	countCmd := pipe.ZCard(ctx, redisKey)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}

	return countCmd.Val(), nil
}

// Reset clears the rate limit state for a specific key.
// Useful for admin operations or testing.
func (rsw *RedisSlidingWindow) Reset(ctx context.Context, key string) error {
	redisKey := fmt.Sprintf("%s:%s", rsw.keyPrefix, key)
	return rsw.client.Del(ctx, redisKey).Err()
}
```

## HTTP Middleware Integration

Now let us create middleware that can be plugged into popular Go web frameworks.

### Gin Middleware

Middleware for the Gin web framework with configurable key extraction and error responses.

```go
package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter defines the interface for rate limiting implementations.
// This abstraction allows switching between in-memory and Redis-based limiters.
type RateLimiter interface {
	Allow(key string) bool
}

// DistributedRateLimiter extends RateLimiter for Redis-based implementations.
type DistributedRateLimiter interface {
	Allow(ctx context.Context, key string) (bool, error)
}

// KeyExtractor is a function type for extracting the rate limit key from requests.
// Common implementations extract client IP, API key, or user ID.
type KeyExtractor func(*gin.Context) string

// IPKeyExtractor returns the client IP as the rate limit key.
// Handles X-Forwarded-For header for clients behind proxies.
func IPKeyExtractor() KeyExtractor {
	return func(c *gin.Context) string {
		// Check X-Forwarded-For first for clients behind load balancers
		if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
			return xff
		}
		return c.ClientIP()
	}
}

// APIKeyExtractor returns the API key from a header as the rate limit key.
// Falls back to IP-based limiting if no API key is provided.
func APIKeyExtractor(headerName string) KeyExtractor {
	return func(c *gin.Context) string {
		if apiKey := c.GetHeader(headerName); apiKey != "" {
			return "api:" + apiKey
		}
		return "ip:" + c.ClientIP()
	}
}

// RateLimitConfig holds configuration for the rate limiting middleware.
type RateLimitConfig struct {
	KeyExtractor    KeyExtractor
	ErrorMessage    string
	IncludeHeaders  bool
	Limit           int
	WindowSize      time.Duration
}

// DefaultConfig returns sensible defaults for rate limiting.
func DefaultConfig() RateLimitConfig {
	return RateLimitConfig{
		KeyExtractor:   IPKeyExtractor(),
		ErrorMessage:   "Rate limit exceeded. Please try again later.",
		IncludeHeaders: true,
		Limit:          100,
		WindowSize:     time.Minute,
	}
}

// GinRateLimiter creates Gin middleware for in-memory rate limiting.
// Requests exceeding the limit receive a 429 Too Many Requests response.
func GinRateLimiter(limiter RateLimiter, config RateLimitConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := config.KeyExtractor(c)

		if !limiter.Allow(key) {
			// Set standard rate limit headers for client awareness
			if config.IncludeHeaders {
				c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", config.Limit))
				c.Header("X-RateLimit-Remaining", "0")
				c.Header("Retry-After", "60")
			}

			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": config.ErrorMessage,
			})
			return
		}

		c.Next()
	}
}

// GinDistributedRateLimiter creates middleware for Redis-based rate limiting.
// Handles Redis errors gracefully to prevent service disruption.
func GinDistributedRateLimiter(limiter DistributedRateLimiter, config RateLimitConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := config.KeyExtractor(c)

		allowed, err := limiter.Allow(c.Request.Context(), key)
		if err != nil {
			// Log error but allow request to proceed (fail-open behavior)
			// This prevents Redis issues from causing complete service outage
			c.Header("X-RateLimit-Error", "service_unavailable")
			c.Next()
			return
		}

		if !allowed {
			if config.IncludeHeaders {
				c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", config.Limit))
				c.Header("X-RateLimit-Remaining", "0")
				c.Header("Retry-After", "60")
			}

			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": config.ErrorMessage,
			})
			return
		}

		c.Next()
	}
}
```

### Standard net/http Middleware

For applications using the standard library's net/http package:

```go
package middleware

import (
	"context"
	"net/http"
)

// HTTPRateLimiter wraps rate limiters for standard net/http handlers.
type HTTPRateLimiter struct {
	limiter      RateLimiter
	keyExtractor func(*http.Request) string
	errorMessage string
}

// NewHTTPRateLimiter creates middleware for standard net/http handlers.
func NewHTTPRateLimiter(limiter RateLimiter) *HTTPRateLimiter {
	return &HTTPRateLimiter{
		limiter: limiter,
		keyExtractor: func(r *http.Request) string {
			// Default to remote address if X-Forwarded-For not present
			if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
				return xff
			}
			return r.RemoteAddr
		},
		errorMessage: "Rate limit exceeded",
	}
}

// WithKeyExtractor sets a custom key extraction function.
func (h *HTTPRateLimiter) WithKeyExtractor(fn func(*http.Request) string) *HTTPRateLimiter {
	h.keyExtractor = fn
	return h
}

// Middleware returns an http.Handler that wraps the provided handler with rate limiting.
func (h *HTTPRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := h.keyExtractor(r)

		if !h.limiter.Allow(key) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error": "rate_limit_exceeded"}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}

// DistributedHTTPRateLimiter provides distributed rate limiting for net/http.
type DistributedHTTPRateLimiter struct {
	limiter      DistributedRateLimiter
	keyExtractor func(*http.Request) string
	failOpen     bool
}

// NewDistributedHTTPRateLimiter creates distributed rate limiting middleware.
// Set failOpen to true to allow requests when Redis is unavailable.
func NewDistributedHTTPRateLimiter(limiter DistributedRateLimiter, failOpen bool) *DistributedHTTPRateLimiter {
	return &DistributedHTTPRateLimiter{
		limiter: limiter,
		keyExtractor: func(r *http.Request) string {
			if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
				return xff
			}
			return r.RemoteAddr
		},
		failOpen: failOpen,
	}
}

// Middleware returns an http.Handler with distributed rate limiting.
func (d *DistributedHTTPRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := d.keyExtractor(r)

		allowed, err := d.limiter.Allow(r.Context(), key)
		if err != nil {
			if d.failOpen {
				// Allow request but log the error for monitoring
				next.ServeHTTP(w, r)
				return
			}
			// Fail closed: reject request on Redis errors
			http.Error(w, "Service temporarily unavailable", http.StatusServiceUnavailable)
			return
		}

		if !allowed {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "60")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error": "rate_limit_exceeded"}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

## Complete Example Application

Here is a complete example showing how to wire everything together:

```go
package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func main() {
	// Initialize Redis client for distributed rate limiting
	redisClient := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "",
		DB:       0,
	})

	// Verify Redis connection
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Redis unavailable, falling back to in-memory: %v", err)
	}

	// Create rate limiters
	// In-memory: 100 requests per minute with burst of 10
	inMemoryLimiter := ratelimit.NewInMemoryRateLimiter(10, 100.0/60.0)

	// Redis-based: 1000 requests per minute per client
	redisLimiter := ratelimit.NewRedisSlidingWindow(
		redisClient,
		1000,
		time.Minute,
		"ratelimit",
	)

	// Configure Gin router
	router := gin.Default()

	// Apply different rate limits to different endpoints
	publicConfig := middleware.RateLimitConfig{
		KeyExtractor:   middleware.IPKeyExtractor(),
		ErrorMessage:   "Too many requests. Please slow down.",
		IncludeHeaders: true,
		Limit:          100,
		WindowSize:     time.Minute,
	}

	apiConfig := middleware.RateLimitConfig{
		KeyExtractor:   middleware.APIKeyExtractor("X-API-Key"),
		ErrorMessage:   "API rate limit exceeded. Upgrade your plan for higher limits.",
		IncludeHeaders: true,
		Limit:          1000,
		WindowSize:     time.Minute,
	}

	// Public endpoints with stricter limits
	public := router.Group("/")
	public.Use(middleware.GinRateLimiter(inMemoryLimiter, publicConfig))
	{
		public.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "healthy"})
		})
	}

	// API endpoints with higher limits and distributed limiting
	api := router.Group("/api")
	api.Use(middleware.GinDistributedRateLimiter(redisLimiter, apiConfig))
	{
		api.GET("/users", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"users": []string{"alice", "bob"}})
		})
		api.POST("/data", func(c *gin.Context) {
			c.JSON(http.StatusCreated, gin.H{"message": "Data created"})
		})
	}

	// Start server
	log.Println("Server starting on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
```

## Testing Your Rate Limiter

Here is a test suite to verify your rate limiting implementation:

```go
package ratelimit_test

import (
	"sync"
	"testing"
	"time"
)

// TestTokenBucketBasic verifies basic token bucket behavior.
func TestTokenBucketBasic(t *testing.T) {
	// Create bucket with 5 capacity, refilling 1 token per second
	bucket := ratelimit.NewTokenBucket(5, 1)

	// Should allow first 5 requests (bucket starts full)
	for i := 0; i < 5; i++ {
		if !bucket.Allow() {
			t.Errorf("Request %d should be allowed", i+1)
		}
	}

	// 6th request should be rejected (bucket empty)
	if bucket.Allow() {
		t.Error("6th request should be rejected")
	}

	// Wait for refill and try again
	time.Sleep(1100 * time.Millisecond)
	if !bucket.Allow() {
		t.Error("Request after refill should be allowed")
	}
}

// TestTokenBucketConcurrency verifies thread safety.
func TestTokenBucketConcurrency(t *testing.T) {
	bucket := ratelimit.NewTokenBucket(100, 10)
	var wg sync.WaitGroup
	var allowed, rejected int64
	var mu sync.Mutex

	// Spawn 200 concurrent requests
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result := bucket.Allow()
			mu.Lock()
			if result {
				allowed++
			} else {
				rejected++
			}
			mu.Unlock()
		}()
	}

	wg.Wait()
	total := allowed + rejected
	if total != 200 {
		t.Errorf("Expected 200 total requests, got %d", total)
	}
	// With capacity 100, we expect roughly 100 allowed
	if allowed < 90 || allowed > 110 {
		t.Errorf("Expected ~100 allowed, got %d", allowed)
	}
}

// TestSlidingWindowAccuracy verifies sliding window provides accurate limiting.
func TestSlidingWindowAccuracy(t *testing.T) {
	window := ratelimit.NewSlidingWindow(10, time.Second)

	// Use all 10 requests
	for i := 0; i < 10; i++ {
		if !window.Allow() {
			t.Errorf("Request %d should be allowed", i+1)
		}
	}

	// 11th should be rejected
	if window.Allow() {
		t.Error("11th request should be rejected")
	}

	// Wait for half the window to pass
	time.Sleep(500 * time.Millisecond)

	// Sliding window should allow some requests based on weighted average
	// After 0.5s, weight = 0.5, estimated = 10 * 0.5 + 0 = 5
	// So we should be able to make 5 more requests
	allowedAfterHalf := 0
	for i := 0; i < 10; i++ {
		if window.Allow() {
			allowedAfterHalf++
		}
	}

	if allowedAfterHalf < 4 || allowedAfterHalf > 6 {
		t.Errorf("Expected ~5 allowed after half window, got %d", allowedAfterHalf)
	}
}
```

## Best Practices and Recommendations

### Choosing the Right Algorithm

| Scenario | Recommended Algorithm |
|----------|----------------------|
| Simple API protection | Token Bucket |
| Strict rate enforcement | Sliding Window |
| Bursty traffic patterns | Token Bucket (higher capacity) |
| Billing/quota systems | Sliding Window |

### Production Considerations

1. **Fail-open vs Fail-closed**: Decide whether to allow or reject requests when Redis is unavailable. Fail-open prioritizes availability; fail-closed prioritizes security.

2. **Key design**: Choose rate limit keys carefully. IP-based limiting can affect users behind NAT; API key limiting requires authentication.

3. **Monitoring**: Track rate limit hits to identify potential attacks or legitimate users needing higher limits.

4. **Gradual response**: Consider implementing multiple tiers (warning, soft limit, hard limit) instead of binary allow/deny.

5. **Documentation**: Clearly communicate rate limits to API consumers through documentation and response headers.

## Conclusion

Rate limiting is essential for building robust, production-ready APIs. In this guide, we covered:

- Token bucket and sliding window algorithms with their trade-offs
- In-memory implementations suitable for single-instance applications
- Redis-based distributed implementations for multi-instance deployments
- Middleware integration patterns for popular Go web frameworks
- Testing strategies to verify your rate limiting logic

The implementations provided are production-ready starting points. Customize them based on your specific requirements, whether you need per-endpoint limits, user-tier based quotas, or complex rate limiting rules.

Remember that rate limiting is just one layer of API protection. Combine it with authentication, input validation, and monitoring for comprehensive API security.
