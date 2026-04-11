# How to Connect to Redis from Go with go-redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, go-redis

Description: Learn how to connect to Redis from Go using go-redis, including connection pooling, timeouts, TLS, and reconnect behavior.

---

go-redis manages a connection pool internally. Understanding how to configure and verify that pool is important for building reliable applications. This guide covers connection setup, pool tuning, TLS, and health checks.

## Basic Connection

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

func newRedisClient() *redis.Client {
    return redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })
}

func main() {
    ctx := context.Background()
    rdb := newRedisClient()
    defer rdb.Close()

    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatalf("Redis connection failed: %v", err)
    }
    fmt.Println("Connected to Redis")
}
```

## Connection Pool Configuration

```go
rdb := redis.NewClient(&redis.Options{
    Addr:            "localhost:6379",
    PoolSize:        20,              // max connections in pool
    MinIdleConns:    5,               // keep at least 5 idle connections
    MaxIdleConns:    10,              // max idle connections
    ConnMaxIdleTime: 5 * time.Minute, // close idle connections after 5m
    ConnMaxLifetime: 30 * time.Minute,// max connection age
    DialTimeout:     5 * time.Second,
    ReadTimeout:     3 * time.Second,
    WriteTimeout:    3 * time.Second,
    PoolTimeout:     4 * time.Second, // wait time for pool to return a connection
})
```

## TLS Connection

```go
import "crypto/tls"

rdb := redis.NewClient(&redis.Options{
    Addr: "my-redis.example.com:6380",
    TLSConfig: &tls.Config{
        MinVersion: tls.VersionTLS12,
    },
    Password: "secret",
})
```

## Connecting to Redis with AUTH and SELECT

```go
rdb := redis.NewClient(&redis.Options{
    Addr:     "localhost:6379",
    Password: "mypassword",
    DB:       2, // SELECT database 2
})
```

## Checking Pool Stats

```go
stats := rdb.PoolStats()
fmt.Printf("Hits=%d Misses=%d Timeouts=%d TotalConns=%d IdleConns=%d\n",
    stats.Hits, stats.Misses, stats.Timeouts,
    stats.TotalConns, stats.IdleConns)
```

## Health Check Function

```go
func isHealthy(ctx context.Context, rdb *redis.Client) bool {
    _, err := rdb.Ping(ctx).Result()
    return err == nil
}
```

## Graceful Shutdown

```go
func main() {
    rdb := newRedisClient()

    // Run application...

    if err := rdb.Close(); err != nil {
        log.Printf("Error closing Redis connection: %v", err)
    }
}
```

## Sharing One Client Across the Application

go-redis clients are safe for concurrent use. Create one instance and pass it through dependency injection or a package-level variable:

```go
import "os"

var rdb *redis.Client

func init() {
    rdb = redis.NewClient(&redis.Options{
        Addr: os.Getenv("REDIS_ADDR"),
    })
}
```

Do not create a new client per request - the pool is shared and reused.

## Summary

go-redis manages a connection pool automatically. `PoolSize`, `MinIdleConns`, and timeout fields should be tuned to match your application's concurrency. TLS connections require only a `TLSConfig` field. A single client instance should be created once at startup and shared throughout the application for efficient connection reuse.
