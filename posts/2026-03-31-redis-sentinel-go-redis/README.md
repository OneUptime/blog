# How to Use Redis Sentinel with go-redis in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Sentinel

Description: Learn how to connect to Redis Sentinel from Go using go-redis FailoverClient for automatic failover and high availability.

---

Redis Sentinel monitors Redis instances and performs automatic failover when the primary goes down. go-redis provides `redis.NewFailoverClient` which talks to Sentinel to discover the current primary and reconnects automatically after failover.

## Connect via Sentinel

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    rdb := redis.NewFailoverClient(&redis.FailoverOptions{
        MasterName: "mymaster",
        SentinelAddrs: []string{
            "sentinel1:26379",
            "sentinel2:26379",
            "sentinel3:26379",
        },
    })
    defer rdb.Close()

    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatalf("Cannot connect via Sentinel: %v", err)
    }
    fmt.Println("Connected to Redis via Sentinel")
}
```

## Sentinel Options

```go
rdb := redis.NewFailoverClient(&redis.FailoverOptions{
    MasterName: "mymaster",
    SentinelAddrs: []string{
        "sentinel1:26379",
        "sentinel2:26379",
        "sentinel3:26379",
    },
    SentinelPassword: "sentinel-secret",
    Password:         "redis-secret",
    DB:               0,
    DialTimeout:      5 * time.Second,
    ReadTimeout:      3 * time.Second,
    WriteTimeout:     3 * time.Second,
    PoolSize:         10,
    MinIdleConns:     2,
})
```

## Routing Reads to Replicas

```go
rdb := redis.NewFailoverClusterClient(&redis.FailoverOptions{
    MasterName:    "mymaster",
    SentinelAddrs: []string{"sentinel1:26379", "sentinel2:26379", "sentinel3:26379"},
    ReplicaOnly:    false,       // false = reads from master by default
    RouteByLatency: true,        // route reads to lowest-latency node
})
```

`RouteByLatency` only works with `NewFailoverClusterClient` (using it with `NewFailoverClient` causes a panic). When enabled, go-redis selects the lowest-latency node among both the master and replicas for read-only commands.

## Sentinel Cluster Client

If you need Sentinel + Cluster together:

```go
rdb := redis.NewFailoverClusterClient(&redis.FailoverOptions{
    MasterName:    "mymaster",
    SentinelAddrs: []string{"sentinel1:26379"},
})
```

## Connection Test After Failover

When the primary fails, Sentinel elects a new primary. go-redis automatically re-queries Sentinel for the new primary address. Test this behavior:

```go
func monitorConnection(ctx context.Context, rdb *redis.Client) {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            if err := rdb.Ping(ctx).Err(); err != nil {
                log.Printf("Redis check failed: %v", err)
            } else {
                fmt.Println("Redis: OK")
            }
        case <-ctx.Done():
            return
        }
    }
}
```

## Checking the Current Master

Query Sentinel directly to see which node is current primary:

```go
sentinelClient := redis.NewSentinelClient(&redis.Options{
    Addr: "sentinel1:26379",
})
defer sentinelClient.Close()

master, err := sentinelClient.GetMasterAddrByName(ctx, "mymaster").Result()
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Current master: %s:%s\n", master[0], master[1])
```

## Failover Event Handling

go-redis does not expose a direct failover callback, but you can implement a retry wrapper:

```go
func execWithFailoverRetry(ctx context.Context, rdb *redis.Client, fn func() error) error {
    const maxRetries = 3
    var err error
    for i := 0; i < maxRetries; i++ {
        err = fn()
        if err == nil {
            return nil
        }
        // Brief pause to allow Sentinel to complete failover
        time.Sleep(time.Duration(i+1) * 500 * time.Millisecond)
    }
    return err
}
```

## Summary

`redis.NewFailoverClient` connects to Redis through Sentinel, automatically discovering the current primary and reconnecting after failover. Provide all Sentinel addresses so the client can find a working Sentinel even if one is down. The `RouteByLatency` option (with `NewFailoverClusterClient`) distributes read-only commands to the lowest-latency node. Retry logic with small delays handles the brief unavailability window during a failover event.
