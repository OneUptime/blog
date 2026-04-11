# How to Use Redis with Gin Framework in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Gin, Cache, API

Description: Learn how to integrate Redis with the Gin web framework in Go for caching API responses and managing application state.

---

Gin is one of the most popular HTTP frameworks in Go. Pairing it with Redis lets you cache expensive computations, store session data, and implement rate limiting - all without touching your database on every request.

## Install Dependencies

```bash
go get github.com/gin-gonic/gin
go get github.com/redis/go-redis/v9
```

## Create the Redis Client

Initialize a single Redis client and share it across handlers via the Gin context or a global variable:

```go
package main

import (
    "context"
    "github.com/redis/go-redis/v9"
)

var rdb *redis.Client

func initRedis() {
    rdb = redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })

    ctx := context.Background()
    if err := rdb.Ping(ctx).Err(); err != nil {
        panic("failed to connect to Redis: " + err.Error())
    }
}
```

## Cache API Responses with Gin Middleware

Create a middleware that checks Redis before the handler runs:

```go
package middleware

import (
    "context"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/redis/go-redis/v9"
)

type responseCapture struct {
    gin.ResponseWriter
    body []byte
}

func (r *responseCapture) Write(data []byte) (int, error) {
    r.body = append(r.body, data...)
    return r.ResponseWriter.Write(data)
}

func CacheMiddleware(rdb *redis.Client, ttl time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        cacheKey := "cache:" + c.Request.URL.RequestURI()
        ctx := context.Background()

        val, err := rdb.Get(ctx, cacheKey).Result()
        if err == nil {
            c.Data(http.StatusOK, "application/json", []byte(val))
            c.Abort()
            return
        }

        // Capture the response
        w := &responseCapture{ResponseWriter: c.Writer, body: []byte{}}
        c.Writer = w
        c.Next()

        if c.Writer.Status() == http.StatusOK {
            rdb.Set(ctx, cacheKey, string(w.body), ttl)
        }
    }
}
```

## Wire Up Routes and Handlers

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/redis/go-redis/v9"
)

type Product struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

func getProduct(rdb *redis.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        id := c.Param("id")
        ctx := context.Background()
        cacheKey := "product:" + id

        cached, err := rdb.Get(ctx, cacheKey).Result()
        if err == nil {
            c.Data(http.StatusOK, "application/json", []byte(cached))
            return
        }

        // Simulate a DB fetch
        product := Product{ID: 1, Name: "Widget"}
        data, _ := json.Marshal(product)

        rdb.Set(ctx, cacheKey, data, 5*time.Minute)
        c.JSON(http.StatusOK, product)
    }
}

func main() {
    initRedis()
    r := gin.Default()
    r.GET("/products/:id", getProduct(rdb))
    r.Run(":8080")
}
```

## Store and Retrieve Session Data

Use Redis hashes to store session state:

```go
func setSession(ctx context.Context, rdb *redis.Client, sessionID, userID, role string) error {
    return rdb.HSet(ctx, "session:"+sessionID,
        "user_id", userID,
        "role", role,
    ).Err()
}

func getSession(ctx context.Context, rdb *redis.Client, sessionID string) (map[string]string, error) {
    return rdb.HGetAll(ctx, "session:"+sessionID).Result()
}
```

## Summary

Integrating Redis with Gin is straightforward using the `go-redis` client. Create a shared Redis client at startup, then use it in middleware for response caching or directly in handlers for fine-grained control. This pattern scales well because the Redis client is safe for concurrent use across all Gin goroutines.
