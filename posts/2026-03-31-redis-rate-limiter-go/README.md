# How to Build a Rate Limiter in Go with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Rate Limiting

Description: Learn how to build a Redis-backed rate limiter in Go using fixed window and sliding window algorithms with Lua scripts for atomic enforcement.

---

A Redis-backed rate limiter uses atomic Redis operations to track request counts across multiple application instances. This guide covers a fixed window counter and a sliding window using sorted sets with a Lua script.

## Fixed Window Rate Limiter

```go
package ratelimit

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

type FixedWindowLimiter struct {
    rdb        *redis.Client
    maxReqs    int64
    windowSecs int
}

func NewFixedWindow(rdb *redis.Client, maxReqs int64, windowSecs int) *FixedWindowLimiter {
    return &FixedWindowLimiter{rdb, maxReqs, windowSecs}
}

func (l *FixedWindowLimiter) Allow(ctx context.Context, clientID string) (bool, error) {
    windowID := time.Now().Unix() / int64(l.windowSecs)
    key := fmt.Sprintf("ratelimit:fw:%s:%d", clientID, windowID)

    count, err := l.rdb.Incr(ctx, key).Result()
    if err != nil {
        return false, err
    }
    if count == 1 {
        l.rdb.Expire(ctx, key, time.Duration(l.windowSecs)*time.Second)
    }
    return count <= l.maxReqs, nil
}
```

## Sliding Window with Lua

The sliding window is more accurate - it counts requests in a rolling window rather than resetting at fixed boundaries:

```go
var slidingWindowScript = redis.NewScript(`
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clear_before = now - window_ms

redis.call('ZREMRANGEBYSCORE', key, '-inf', clear_before)
local count = redis.call('ZCARD', key)
if count < limit then
    redis.call('ZADD', key, now, tostring(now))
    redis.call('PEXPIRE', key, window_ms)
    return 1
end
return 0
`)

type SlidingWindowLimiter struct {
    rdb      *redis.Client
    maxReqs  int64
    windowMs int64
}

func NewSlidingWindow(rdb *redis.Client, maxReqs int64, window time.Duration) *SlidingWindowLimiter {
    return &SlidingWindowLimiter{rdb, maxReqs, window.Milliseconds()}
}

func (l *SlidingWindowLimiter) Allow(ctx context.Context, clientID string) (bool, error) {
    key := "ratelimit:sw:" + clientID
    now := time.Now().UnixMilli()

    result, err := slidingWindowScript.Run(ctx, l.rdb, []string{key},
        now, l.windowMs, l.maxReqs).Int64()
    if err != nil {
        return false, err
    }
    return result == 1, nil
}
```

## HTTP Middleware

```go
func RateLimitMiddleware(limiter *SlidingWindowLimiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            clientIP, _, _ := net.SplitHostPort(r.RemoteAddr)

            allowed, err := limiter.Allow(r.Context(), clientIP)
            if err != nil {
                // Log but allow through if Redis is unavailable
                next.ServeHTTP(w, r)
                return
            }

            if !allowed {
                w.Header().Set("Retry-After", "60")
                http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

## Per-Route Limits

```go
func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    apiLimiter := NewSlidingWindow(rdb, 100, time.Minute)
    loginLimiter := NewSlidingWindow(rdb, 5, time.Minute)

    mux := http.NewServeMux()
    mux.Handle("/api/", RateLimitMiddleware(apiLimiter)(apiHandler()))
    mux.Handle("/login", RateLimitMiddleware(loginLimiter)(loginHandler()))

    http.ListenAndServe(":8080", mux)
}
```

## Checking Remaining Requests

```go
func (l *SlidingWindowLimiter) Remaining(ctx context.Context, clientID string) (int64, error) {
    key := "ratelimit:sw:" + clientID
    now := time.Now().UnixMilli()
    clearBefore := now - l.windowMs

    l.rdb.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%d", clearBefore))
    count, err := l.rdb.ZCard(ctx, key).Result()
    if err != nil {
        return 0, err
    }
    remaining := l.maxReqs - count
    if remaining < 0 {
        remaining = 0
    }
    return remaining, nil
}
```

## Summary

A fixed window rate limiter in Go uses `INCR` and `EXPIRE` - simple but allows burst at window edges. The sliding window approach uses a sorted set and an atomic Lua script to enforce a rolling window with no boundary bursts. Wrapping either in HTTP middleware and falling back gracefully when Redis is unavailable keeps rate limiting from becoming a single point of failure.
