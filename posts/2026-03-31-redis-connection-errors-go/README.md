# How to Handle Redis Connection Errors in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Error Handling

Description: Learn how to detect, handle, and recover from Redis connection errors in Go applications using go-redis with retries and circuit breakers.

---

Redis connection errors in Go fall into several categories: the server being unreachable, timeouts, connection pool exhaustion, and temporary disconnects. Handling each correctly prevents cascading failures in production.

## Common Error Types

```go
import (
    "context"
    "errors"
    "fmt"
    "log"
    "net"
    "github.com/redis/go-redis/v9"
)

func handleRedisError(err error) {
    if err == nil {
        return
    }

    switch {
    case err == redis.Nil:
        // Key does not exist - not a real error
        fmt.Println("Cache miss")

    case errors.Is(err, context.DeadlineExceeded):
        // Command timed out
        log.Println("Redis command timed out")

    case errors.Is(err, context.Canceled):
        // Request was cancelled
        log.Println("Request cancelled")

    default:
        var netErr *net.OpError
        if errors.As(err, &netErr) {
            log.Printf("Network error connecting to Redis: %v", err)
        } else {
            log.Printf("Redis error: %v", err)
        }
    }
}
```

## Retry with Exponential Backoff

```go
import (
    "context"
    "fmt"
    "log"
    "time"
    "github.com/redis/go-redis/v9"
)

func withRetry(ctx context.Context, maxRetries int, fn func() error) error {
    backoff := 100 * time.Millisecond
    var lastErr error

    for i := 0; i < maxRetries; i++ {
        if err := fn(); err != nil {
            if err == redis.Nil {
                return err // not retryable
            }
            lastErr = err
            log.Printf("Redis attempt %d failed: %v", i+1, err)
            select {
            case <-time.After(backoff):
                backoff *= 2
                if backoff > 5*time.Second {
                    backoff = 5 * time.Second
                }
            case <-ctx.Done():
                return ctx.Err()
            }
            continue
        }
        return nil
    }
    return fmt.Errorf("all %d retries failed: %w", maxRetries, lastErr)
}

// Usage
err := withRetry(ctx, 3, func() error {
    return rdb.Set(ctx, "key", "value", time.Hour).Err()
})
```

## Context Timeouts Per Command

```go
func setWithTimeout(rdb *redis.Client, key, value string) error {
    ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
    defer cancel()
    return rdb.Set(ctx, key, value, time.Hour).Err()
}
```

## Connection Pool Exhaustion

When all connections are in use and the `PoolTimeout` is reached, go-redis returns a pool timeout error:

```go
err := rdb.Get(ctx, "key").Err()
if err != nil && err.Error() == "redis: connection pool timeout" {
    log.Println("Connection pool exhausted - consider increasing PoolSize")
}
```

Monitor pool stats to detect exhaustion before it becomes a problem:

```go
stats := rdb.PoolStats()
if float64(stats.TotalConns) > float64(rdb.Options().PoolSize)*0.9 {
    log.Printf("Warning: pool nearly full (%d/%d)\n",
        stats.TotalConns, rdb.Options().PoolSize)
}
```

## Graceful Degradation (Cache Miss Fallback)

```go
func getUser(ctx context.Context, rdb *redis.Client, userId string) (*User, error) {
    val, err := rdb.Get(ctx, "user:"+userId).Result()
    if err == redis.Nil {
        // Cache miss - fetch from database
        return getUserFromDB(userId)
    }
    if err != nil {
        // Redis error - fall back to database rather than failing
        log.Printf("Redis unavailable, falling back to DB: %v", err)
        return getUserFromDB(userId)
    }
    return parseUser(val), nil
}
```

## Health Check Endpoint

```go
import (
    "context"
    "fmt"
    "net/http"
    "time"
    "github.com/redis/go-redis/v9"
)

func redisHealthCheck(rdb *redis.Client) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(r.Context(), 1*time.Second)
        defer cancel()

        if err := rdb.Ping(ctx).Err(); err != nil {
            http.Error(w, "Redis unavailable", http.StatusServiceUnavailable)
            return
        }
        w.WriteHeader(http.StatusOK)
        fmt.Fprint(w, "ok")
    }
}
```

## Summary

Redis connection errors in Go should be categorized: `redis.Nil` is not an error, timeouts should use per-command contexts, and transient failures benefit from exponential backoff. Pool exhaustion is a capacity problem, not a Redis bug. For non-critical caching paths, graceful degradation to a database prevents full outages when Redis is temporarily unavailable.
