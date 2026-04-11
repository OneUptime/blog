# How to Use Context and Timeouts with Redis in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Context

Description: Learn how to use Go context and timeouts with Redis commands in go-redis to prevent hanging operations and implement proper cancellation.

---

Every go-redis command accepts a `context.Context` as its first argument. Using contexts with deadlines and timeouts prevents Redis operations from blocking indefinitely and allows in-flight requests to be cancelled when a client disconnects or a deadline expires.

## Per-Command Timeout

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    defer rdb.Close()

    // Timeout for a single command
    ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
    defer cancel()

    val, err := rdb.Get(ctx, "my:key").Result()
    if errors.Is(err, context.DeadlineExceeded) {
        log.Println("Redis GET timed out")
        return
    }
    if err != nil && err != redis.Nil {
        log.Printf("Redis error: %v", err)
        return
    }
    fmt.Println(val)
}
```

## Request-Scoped Context from HTTP Handler

```go
func GetUserHandler(rdb *redis.Client) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Use the request's context - automatically cancelled when client disconnects
        ctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)
        defer cancel()

        userID := r.PathValue("id")
        val, err := rdb.Get(ctx, "user:"+userID).Result()

        if err == redis.Nil {
            http.Error(w, "Not found", 404)
            return
        }
        if err != nil {
            http.Error(w, "Cache error", 500)
            return
        }
        fmt.Fprint(w, val)
    }
}
```

## Global Client Timeouts vs Per-Command Timeouts

go-redis supports both approaches:

```go
// Global timeouts on the client (apply to all commands)
rdb := redis.NewClient(&redis.Options{
    Addr:         "localhost:6379",
    DialTimeout:  5 * time.Second,
    ReadTimeout:  2 * time.Second,
    WriteTimeout: 2 * time.Second,
})
```

Per-command context timeout overrides the client's global timeout when shorter:

```go
// This command uses a 100ms context timeout, shorter than the 2s client ReadTimeout
ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
defer cancel()
rdb.Get(ctx, "fast:key")
```

## Cancellation Propagation

```go
func processWithCancellation(ctx context.Context, rdb *redis.Client, keys []string) {
    for _, key := range keys {
        select {
        case <-ctx.Done():
            log.Printf("Processing cancelled: %v", ctx.Err())
            return
        default:
        }

        val, err := rdb.Get(ctx, key).Result()
        if err != nil {
            if ctx.Err() != nil {
                return // context cancelled
            }
            log.Printf("Error reading %s: %v", key, err)
            continue
        }
        process(key, val)
    }
}
```

## Blocking Commands and Context

Blocking commands like `BLPOP` respect context cancellation:

```go
func worker(ctx context.Context, rdb *redis.Client) {
    for {
        // Blocks up to 5 seconds, but exits immediately if ctx is cancelled
        result, err := rdb.BLPop(ctx, 5*time.Second, "jobs:queue").Result()
        if err != nil {
            if ctx.Err() != nil {
                log.Println("Worker shutting down")
                return
            }
            log.Printf("BLPop error: %v", err)
            continue
        }
        processJob(result[1])
    }
}
```

## Best Practices

- Always derive child contexts for Redis calls rather than using `context.Background()` directly in handlers.
- Set a timeout shorter than your HTTP response deadline - typically 10-20% less.
- Check `ctx.Err()` before retrying to avoid retrying after cancellation.
- Never pass `nil` as context - use `context.Background()` as a minimum.

## Summary

go-redis contexts propagate deadlines and cancellation signals to Redis commands. Setting per-command timeouts with `context.WithTimeout` prevents hung requests from blocking goroutines indefinitely. Blocking commands like `BLPop` exit cleanly when the context is cancelled, making context-aware Redis calls essential for building responsive and resource-safe Go services.
