# How to Build a Go REST API with Redis Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, REST API, Cache, Performance

Description: Build a Go REST API that uses Redis to cache database query results, reducing latency and database load under high traffic.

---

Caching database results in Redis is one of the most effective ways to scale a Go REST API. This guide walks through a complete example using the standard `net/http` package and `go-redis`.

## Project Setup

```bash
mkdir go-redis-api && cd go-redis-api
go mod init github.com/example/go-redis-api
go get github.com/redis/go-redis/v9
go get github.com/lib/pq
```

## Initialize the Redis Client

```go
package cache

import (
    "context"
    "time"
    "github.com/redis/go-redis/v9"
)

type RedisCache struct {
    client *redis.Client
    ttl    time.Duration
}

func NewRedisCache(addr string, ttl time.Duration) *RedisCache {
    client := redis.NewClient(&redis.Options{
        Addr:         addr,
        PoolSize:     10,
        MinIdleConns: 2,
    })
    return &RedisCache{client: client, ttl: ttl}
}

func (r *RedisCache) Get(ctx context.Context, key string) (string, error) {
    return r.client.Get(ctx, key).Result()
}

func (r *RedisCache) Set(ctx context.Context, key, value string) error {
    return r.client.Set(ctx, key, value, r.ttl).Err()
}

func (r *RedisCache) Delete(ctx context.Context, key string) error {
    return r.client.Del(ctx, key).Err()
}
```

## Build the Handler with Cache-Aside Logic

```go
package handler

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/example/go-redis-api/cache"
)

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

type UserHandler struct {
    Cache *cache.RedisCache
    DB    UserRepository
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    cacheKey := fmt.Sprintf("user:%s", id)
    ctx := context.Background()

    // Check cache first
    cached, err := h.Cache.Get(ctx, cacheKey)
    if err == nil {
        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("X-Cache", "HIT")
        w.Write([]byte(cached))
        return
    }

    // Cache miss - fetch from DB
    user, err := h.DB.FindByID(ctx, id)
    if err != nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    data, _ := json.Marshal(user)
    h.Cache.Set(ctx, cacheKey, string(data))

    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("X-Cache", "MISS")
    w.Write(data)
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    // ... update DB ...
    h.Cache.Delete(context.Background(), fmt.Sprintf("user:%s", id))
    w.WriteHeader(http.StatusNoContent)
}
```

## Register Routes

```go
package main

import (
    "net/http"
    "time"

    "github.com/example/go-redis-api/cache"
    "github.com/example/go-redis-api/handler"
)

func main() {
    redisCache := cache.NewRedisCache("localhost:6379", 5*time.Minute)
    userHandler := &handler.UserHandler{Cache: redisCache}

    mux := http.NewServeMux()
    mux.HandleFunc("GET /users/{id}", userHandler.GetUser)
    mux.HandleFunc("PUT /users/{id}", userHandler.UpdateUser)

    http.ListenAndServe(":8080", mux)
}
```

## Test Cache Behavior

```bash
# First request - cache miss
curl -i http://localhost:8080/users/1
# X-Cache: MISS

# Second request - cache hit
curl -i http://localhost:8080/users/1
# X-Cache: HIT

# Measure latency difference
time curl -s http://localhost:8080/users/1 > /dev/null
```

## Summary

A Go REST API with Redis caching follows a simple cache-aside pattern: check the cache first, fall back to the database on a miss, store the result, and delete the cache entry on updates. Using a connection pool (`PoolSize`) ensures the Redis client handles concurrent requests efficiently without exhausting connections.
