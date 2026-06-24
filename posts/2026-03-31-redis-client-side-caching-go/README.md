# How to Implement Client-Side Caching in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Client-Side Caching, go-redis, Tracking

Description: Learn how to implement Redis client-side caching in Go using go-redis with CLIENT TRACKING, sync.Map local cache, and automatic invalidation via dedicated Pub/Sub connection.

---

Redis client-side caching in Go uses two connections: one for data operations with `CLIENT TRACKING` enabled, and a dedicated subscriber connection for receiving cache invalidation messages.

## Setup

```bash
go get github.com/redis/go-redis/v9
```

## Client-Side Cache Implementation

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"

    "github.com/redis/go-redis/v9"
)

type ClientSideCache struct {
    dataClient redis.UniversalClient
    subClient  redis.UniversalClient
    cache      sync.Map
    ctx        context.Context
    subConnID  int64
}

func NewClientSideCache(addr string) (*ClientSideCache, error) {
    ctx := context.Background()

    dataClient := redis.NewClient(&redis.Options{
        Addr: addr,
    })

    csc := &ClientSideCache{
        dataClient: dataClient,
        ctx:        ctx,
    }

    // go-redis creates a dedicated connection for PubSub internally.
    // Use OnConnect to capture that connection's client ID before it
    // enters subscriber mode, so we can use it for REDIRECT.
    csc.subClient = redis.NewClient(&redis.Options{
        Addr: addr,
        OnConnect: func(ctx context.Context, cn *redis.Conn) error {
            id, err := cn.ClientID(ctx).Result()
            if err != nil {
                return err
            }
            csc.subConnID = id
            return nil
        },
    })

    if err := csc.setupTracking(); err != nil {
        return nil, fmt.Errorf("setup tracking: %w", err)
    }

    return csc, nil
}

func (c *ClientSideCache) setupTracking() error {
    // Subscribe to Redis invalidation channel.
    // go-redis creates a dedicated connection for PubSub; the OnConnect
    // callback captures its client ID before it enters subscriber mode.
    pubsub := c.subClient.Subscribe(c.ctx, "__redis__:invalidate")

    // Enable tracking on data connection, redirect to PubSub connection
    err := c.dataClient.Do(c.ctx,
        "CLIENT", "TRACKING", "ON", "REDIRECT", c.subConnID,
    ).Err()
    if err != nil {
        return fmt.Errorf("enable tracking: %w", err)
    }

    // Listen for invalidation messages in background.
    // Invalidation messages from __redis__:invalidate carry an array of
    // affected keys, which go-redis exposes on msg.PayloadSlice (not
    // msg.Payload). An empty slice (e.g. after FLUSHALL/FLUSHDB) means the
    // whole database was flushed, so drop the entire local cache.
    go func() {
        ch := pubsub.Channel()
        for msg := range ch {
            if len(msg.PayloadSlice) == 0 {
                c.FlushLocal()
                continue
            }
            for _, key := range msg.PayloadSlice {
                c.cache.Delete(key)
                fmt.Printf("Invalidated key: %s\n", key)
            }
        }
    }()

    return nil
}

func (c *ClientSideCache) Get(key string) (string, bool, error) {
    // Check local cache first
    if val, ok := c.cache.Load(key); ok {
        return val.(string), true, nil // true = cache hit
    }

    // Fetch from Redis (registers key in tracking table)
    val, err := c.dataClient.Get(c.ctx, key).Result()
    if err == redis.Nil {
        return "", false, nil
    }
    if err != nil {
        return "", false, fmt.Errorf("redis get: %w", err)
    }

    // Store in local cache
    c.cache.Store(key, val)
    return val, false, nil // false = cache miss
}

func (c *ClientSideCache) Set(key, value string, ttl time.Duration) error {
    return c.dataClient.Set(c.ctx, key, value, ttl).Err()
}

func (c *ClientSideCache) Delete(key string) error {
    return c.dataClient.Del(c.ctx, key).Err()
}

func (c *ClientSideCache) FlushLocal() {
    c.cache.Range(func(k, _ any) bool {
        c.cache.Delete(k)
        return true
    })
}
```

## Using the Cache

```go
func main() {
    ctx := context.Background()
    cache, err := NewClientSideCache("localhost:6379")
    if err != nil {
        panic(err)
    }

    // Set a value
    cache.Set("user:42", `{"name":"Alice","role":"admin"}`, 0)

    // First read - cache miss, fetches from Redis
    val, hit, _ := cache.Get("user:42")
    fmt.Printf("Hit: %v, Value: %s\n", hit, val) // Hit: false

    // Second read - cache hit, no Redis round trip
    val, hit, _ = cache.Get("user:42")
    fmt.Printf("Hit: %v, Value: %s\n", hit, val) // Hit: true

    // Update from another connection
    otherClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    otherClient.Set(ctx, "user:42", `{"name":"Alice","role":"superadmin"}`, 0)

    // Wait for invalidation
    time.Sleep(50 * time.Millisecond)

    // Next read - cache miss again, gets fresh value
    val, hit, _ = cache.Get("user:42")
    fmt.Printf("Hit: %v, Fresh Value: %s\n", hit, val) // Hit: false
}
```

## Handling Reconnections

```go
func (c *ClientSideCache) onReconnect() {
    fmt.Println("Redis reconnected - flushing local cache")
    c.FlushLocal()
    // Re-enable tracking after reconnect
    c.setupTracking()
}
```

## Measuring Cache Hit Rate

```go
type CacheWithMetrics struct {
    *ClientSideCache
    hits   int64
    misses int64
    mu     sync.Mutex
}

func (c *CacheWithMetrics) Get(key string) (string, bool, error) {
    val, hit, err := c.ClientSideCache.Get(key)
    c.mu.Lock()
    if hit {
        c.hits++
    } else {
        c.misses++
    }
    c.mu.Unlock()
    return val, hit, err
}

func (c *CacheWithMetrics) HitRate() float64 {
    c.mu.Lock()
    defer c.mu.Unlock()
    total := c.hits + c.misses
    if total == 0 {
        return 0
    }
    return float64(c.hits) / float64(total)
}
```

## Summary

Implement Redis client-side caching in Go using go-redis with two client connections: one for data operations with `CLIENT TRACKING ON REDIRECT` enabled, and one dedicated to subscribing to `__redis__:invalidate` messages. Use `sync.Map` for thread-safe local cache storage, and invalidate entries on Pub/Sub message receipt. Flush the entire local cache on reconnection to prevent serving stale data from missed invalidations.
