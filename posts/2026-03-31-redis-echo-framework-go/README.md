# How to Use Redis with Echo Framework in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Echo, Cache, Middleware

Description: Integrate Redis with the Echo framework in Go to add response caching, session storage, and rate limiting to your API.

---

Echo is a high-performance Go web framework with a minimal footprint. Adding Redis to Echo lets you cache API responses, share session state across instances, and implement request rate limiting with minimal boilerplate.

## Install Dependencies

```bash
go get github.com/labstack/echo/v4
go get github.com/redis/go-redis/v9
```

## Initialize the Redis Client

```go
package main

import (
    "context"
    "log"
    "github.com/redis/go-redis/v9"
)

var rdb *redis.Client

func initRedis() {
    rdb = redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })

    if err := rdb.Ping(context.Background()).Err(); err != nil {
        log.Fatalf("Redis connection failed: %v", err)
    }
}
```

## Write a Caching Middleware for Echo

Echo middleware functions receive the next handler and return a new handler:

```go
package middleware

import (
    "bytes"
    "context"
    "net/http"
    "time"

    "github.com/labstack/echo/v4"
    "github.com/redis/go-redis/v9"
)

type ResponseRecorder struct {
    http.ResponseWriter
    Body *bytes.Buffer
}

func NewResponseRecorder(w http.ResponseWriter) *ResponseRecorder {
    return &ResponseRecorder{
        ResponseWriter: w,
        Body:           new(bytes.Buffer),
    }
}

func (r *ResponseRecorder) Write(b []byte) (int, error) {
    r.Body.Write(b)
    return r.ResponseWriter.Write(b)
}

func RedisCacheMiddleware(rdb *redis.Client, ttl time.Duration) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            if c.Request().Method != http.MethodGet {
                return next(c)
            }

            cacheKey := "echo:cache:" + c.Request().URL.RequestURI()
            ctx := context.Background()

            cached, err := rdb.Get(ctx, cacheKey).Result()
            if err == nil {
                return c.JSONBlob(http.StatusOK, []byte(cached))
            }

            rec := NewResponseRecorder(c.Response().Writer)
            c.Response().Writer = rec

            if err := next(c); err != nil {
                return err
            }

            if c.Response().Status == http.StatusOK {
                rdb.Set(ctx, cacheKey, rec.Body.String(), ttl)
            }

            return nil
        }
    }
}
```

## Cache Data Directly in a Handler

For more control, access Redis inside the handler itself:

```go
package handler

import (
    "context"
    "encoding/json"
    "net/http"
    "time"

    "github.com/labstack/echo/v4"
    "github.com/redis/go-redis/v9"
)

type Article struct {
    ID    int    `json:"id"`
    Title string `json:"title"`
}

func GetArticle(rdb *redis.Client) echo.HandlerFunc {
    return func(c echo.Context) error {
        id := c.Param("id")
        ctx := context.Background()
        key := "article:" + id

        if cached, err := rdb.Get(ctx, key).Result(); err == nil {
            var article Article
            json.Unmarshal([]byte(cached), &article)
            return c.JSON(http.StatusOK, article)
        }

        article := Article{ID: 1, Title: "Hello Redis with Echo"}
        data, _ := json.Marshal(article)
        rdb.Set(ctx, key, data, 10*time.Minute)

        return c.JSON(http.StatusOK, article)
    }
}
```

## Register Routes with Middleware

```go
func main() {
    initRedis()
    e := echo.New()

    // Apply cache middleware to a route group
    api := e.Group("/api")
    api.Use(RedisCacheMiddleware(rdb, 5*time.Minute))
    api.GET("/articles/:id", GetArticle(rdb))

    e.Logger.Fatal(e.Start(":8080"))
}
```

## Invalidate Cache on Updates

When data changes, delete the cached entry so the next request fetches fresh data:

```go
func UpdateArticle(rdb *redis.Client) echo.HandlerFunc {
    return func(c echo.Context) error {
        id := c.Param("id")
        // ... update DB ...
        rdb.Del(context.Background(), "article:"+id)
        return c.JSON(http.StatusOK, map[string]string{"status": "updated"})
    }
}
```

## Summary

Echo and Redis work well together for building fast Go APIs. Use the middleware pattern to apply caching broadly across route groups, or use the Redis client directly inside handlers when you need fine-grained cache control. Always invalidate cache entries on writes to keep data consistent.
