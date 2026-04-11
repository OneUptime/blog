# How to Use Redis with Buffalo in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Buffalo, Go, Caching, Backend

Description: Learn how to integrate Redis with the Buffalo Go web framework for caching, session storage, and rate limiting using go-redis with practical examples.

---

Buffalo is a full-stack web framework for Go that emphasizes developer productivity. Adding Redis to a Buffalo application enables fast in-memory caching, scalable session storage, and atomic rate limiting. This guide uses the popular `go-redis` client.

## Installing Dependencies

```bash
go get github.com/redis/go-redis/v9
```

## Creating a Redis Client

Create a dedicated package for the Redis client so it can be shared across the application.

```go
// redis/client.go
package redisclient

import (
    "context"
    "fmt"
    "os"

    "github.com/redis/go-redis/v9"
)

var Client *redis.Client

func Init() error {
    host := os.Getenv("REDIS_HOST")
    if host == "" {
        host = "127.0.0.1"
    }
    Client = redis.NewClient(&redis.Options{
        Addr:     fmt.Sprintf("%s:6379", host),
        Password: os.Getenv("REDIS_PASSWORD"),
        DB:       0,
    })
    _, err := Client.Ping(context.Background()).Result()
    return err
}
```

Initialize it in `main.go`:

```go
// main.go
package main

import (
    "log"

    "myapp/actions"
    redisclient "myapp/redis"

    "github.com/gobuffalo/buffalo"
)

func main() {
    if err := redisclient.Init(); err != nil {
        log.Fatalf("Redis init failed: %v", err)
    }
    app := buffalo.New(buffalo.Options{Env: "development"})
    app.GET("/products", actions.ProductsHandler)
    log.Fatal(app.Serve())
}
```

## Caching Route Responses

```go
// actions/products.go
package actions

import (
    "context"
    "encoding/json"
    "time"

    "github.com/gobuffalo/buffalo"
    redisclient "myapp/redis"
)

type Product struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func ProductsHandler(c buffalo.Context) error {
    ctx := context.Background()
    cacheKey := "products:all"

    cached, err := redisclient.Client.Get(ctx, cacheKey).Result()
    if err == nil {
        var products []Product
        json.Unmarshal([]byte(cached), &products)
        c.Response().Header().Set("X-Cache", "HIT")
        return c.Render(200, r.JSON(products))
    }

    products := []Product{{ID: 1, Name: "Widget"}} // Simulate DB fetch
    data, _ := json.Marshal(products)
    redisclient.Client.SetEx(ctx, cacheKey, string(data), 2*time.Minute)
    c.Response().Header().Set("X-Cache", "MISS")
    return c.Render(200, r.JSON(products))
}
```

## Rate Limiting Middleware

```go
// middleware/ratelimit.go
package middleware

import (
    "context"
    "net/http"
    "time"

    "github.com/gobuffalo/buffalo"
    "github.com/gobuffalo/buffalo/render"
    redisclient "myapp/redis"
)

var r = render.New(render.Options{})

func RateLimit(next buffalo.Handler) buffalo.Handler {
    return func(c buffalo.Context) error {
        ip := c.Request().RemoteAddr
        key := "ratelimit:" + ip
        ctx := context.Background()

        count, _ := redisclient.Client.Incr(ctx, key).Result()
        if count == 1 {
            redisclient.Client.Expire(ctx, key, time.Minute)
        }
        if count > 100 {
            return c.Render(http.StatusTooManyRequests, r.JSON(map[string]string{
                "error": "rate limit exceeded",
            }))
        }
        return next(c)
    }
}
```

Register the middleware:

```go
app.Use(middleware.RateLimit)
```

## Session Data with Redis

For session persistence beyond the default cookie store, store session IDs mapped to JSON data in Redis.

```go
func Login(c buffalo.Context) error {
    ctx := context.Background()
    sessionID, _ := c.Session().Get("session_id").(string)
    if sessionID == "" {
        sessionID = fmt.Sprintf("%d", time.Now().UnixNano())
        c.Session().Set("session_id", sessionID)
    }
    userData, _ := json.Marshal(map[string]string{"user": "alice"})
    redisclient.Client.SetEx(ctx, "session:"+sessionID, string(userData), 24*time.Hour)
    return c.Render(200, r.JSON(map[string]string{"message": "logged in"}))
}
```

## Summary

Buffalo integrates with Redis by initializing a `go-redis` client at startup and sharing it across action handlers and middleware. Use `SetEx` for TTL-based caching, `Incr` with `Expire` for rate limiting, and store JSON-encoded session data under session ID keys for scalable session management.
