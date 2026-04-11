# How to Use Redis with Fiber Framework in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Fiber, Cache, Session

Description: Add Redis caching and session storage to a Go Fiber application using the official Fiber Redis storage adapter.

---

Fiber is an Express-inspired Go web framework built on top of Fasthttp. It ships with a storage interface that makes plugging in Redis straightforward for both caching and session management.

## Install Dependencies

```bash
go get github.com/gofiber/fiber/v2
go get github.com/gofiber/storage/redis/v3
```

## Initialize the Redis Storage Adapter

Fiber provides a Redis storage adapter in `gofiber/storage/redis` that implements the `fiber.Storage` interface:

```go
package main

import (
    "time"
    "github.com/gofiber/fiber/v2"
    fiberredis "github.com/gofiber/storage/redis/v3"
)

func main() {
    store := fiberredis.New(fiberredis.Config{
        Host:     "localhost",
        Port:     6379,
        Password: "",
        Database: 0,
        Reset:    false,
    })

    app := fiber.New()
    setupRoutes(app, store)
    app.Listen(":8080")
}
```

## Add Fiber's Built-In Cache Middleware

```go
import "github.com/gofiber/fiber/v2/middleware/cache"

func setupRoutes(app *fiber.App, store fiber.Storage) {
    app.Use(cache.New(cache.Config{
        Next: func(c *fiber.Ctx) bool {
            return c.Query("refresh") == "true"
        },
        Expiration:   5 * time.Minute,
        CacheControl: true,
        Storage:      store,
    }))

    app.Get("/products/:id", getProduct)
}
```

The `Next` function lets you bypass the cache for specific requests - in this case, when `?refresh=true` is present.

## Use Redis Storage for Sessions

```go
import (
    "github.com/gofiber/fiber/v2/middleware/session"
)

func setupSessions(store fiber.Storage) *session.Store {
    return session.New(session.Config{
        Storage:    store,
        Expiration: 24 * time.Hour,
        KeyLookup:  "cookie:session_id",
    })
}

func cartHandler(sessionStore *session.Store) fiber.Handler {
    return func(c *fiber.Ctx) error {
        sess, err := sessionStore.Get(c)
        if err != nil {
            return err
        }
        defer sess.Save()

        cart := sess.Get("cart")
        if cart == nil {
            cart = []string{}
        }

        return c.JSON(fiber.Map{"cart": cart})
    }
}
```

## Access Redis Directly for Custom Logic

For operations outside of caching or sessions, use `go-redis` directly:

```go
import (
    "context"
    "github.com/redis/go-redis/v9"
)

func rateLimitHandler(rdb *redis.Client) fiber.Handler {
    return func(c *fiber.Ctx) error {
        ip := c.IP()
        ctx := context.Background()
        key := "rate:" + ip

        count, _ := rdb.Incr(ctx, key).Result()
        if count == 1 {
            rdb.Expire(ctx, key, time.Minute)
        }
        if count > 100 {
            return c.Status(fiber.StatusTooManyRequests).SendString("Rate limit exceeded")
        }

        return c.Next()
    }
}
```

## Verify Cache Hits

Test that caching is working by checking response headers - Fiber's cache middleware adds an `X-Cache` header:

```bash
curl -I http://localhost:8080/products/1
# X-Cache: miss  (first request)

curl -I http://localhost:8080/products/1
# X-Cache: hit   (subsequent requests)
```

## Summary

Fiber's official Redis storage adapter makes it easy to plug Redis into caching middleware and session management with minimal configuration. For custom logic like rate limiting, use the `go-redis` client alongside the Fiber adapter. This two-layer approach gives you both convenience and flexibility.
