# How to Use Redis Cluster with go-redis in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, Cluster

Description: Learn how to connect to a Redis Cluster from Go using go-redis ClusterClient with slot routing, pipelining, and cross-slot operation handling.

---

Redis Cluster distributes data across multiple shards. go-redis handles cluster slot routing automatically through `redis.NewClusterClient`, which discovers nodes and routes commands to the correct shard.

## Connect to a Redis Cluster

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

    rdb := redis.NewClusterClient(&redis.ClusterOptions{
        Addrs: []string{
            "localhost:7000",
            "localhost:7001",
            "localhost:7002",
        },
        // go-redis discovers other nodes automatically
    })
    defer rdb.Close()

    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatalf("Cluster connection failed: %v", err)
    }
    fmt.Println("Connected to Redis Cluster")
}
```

## Basic Operations

Regular commands work the same as single-node:

```go
err := rdb.Set(ctx, "user:1:name", "Alice", 0).Err()

val, err := rdb.Get(ctx, "user:1:name").Result()
fmt.Println(val) // Alice
```

## Cluster Options

```go
rdb := redis.NewClusterClient(&redis.ClusterOptions{
    Addrs: []string{
        "redis-node-1:6379",
        "redis-node-2:6379",
        "redis-node-3:6379",
    },
    Password:          "secret",
    ReadOnly:          true,  // allow reads from replicas
    RouteByLatency:    true,  // route reads to lowest-latency node
    RouteRandomly:     false,
    MaxRedirects:      8,     // max MOVED/ASK redirects
    DialTimeout:       5 * time.Second,
    ReadTimeout:       3 * time.Second,
    WriteTimeout:      3 * time.Second,
    PoolSize:          10,    // per node
})
```

## Hash Tags for Multi-Key Operations

Multi-key operations (MGET, pipelines) require all keys to be on the same slot. Use hash tags (`{...}`) to force keys to the same slot:

```go
// These keys share slot because of {user:1} hash tag
rdb.Set(ctx, "{user:1}:name", "Alice", 0)
rdb.Set(ctx, "{user:1}:email", "alice@example.com", 0)
rdb.Set(ctx, "{user:1}:age", "30", 0)

// Now MGET works - all keys on same slot
vals, err := rdb.MGet(ctx, "{user:1}:name", "{user:1}:email", "{user:1}:age").Result()
```

## Pipeline in Cluster Mode

Pipelining works in cluster mode. go-redis automatically groups pipeline commands by their target node and executes each group in parallel, so cross-slot pipelines work without hash tags:

```go
pipe := rdb.Pipeline()
pipe.Set(ctx, "user:1:name", "Alice", time.Hour)
pipe.Set(ctx, "user:2:name", "Bob", time.Hour)   // may be on a different slot
pipe.Set(ctx, "user:3:name", "Charlie", time.Hour)
_, err := pipe.Exec(ctx)
```

For transactions (`TxPipeline`), all commands must target the same slot since they run inside a MULTI/EXEC block:

```go
// Use hash tags to ensure same slot for transactions
pipe := rdb.TxPipeline()
pipe.Set(ctx, "{session:abc}:data", "payload", time.Hour)
pipe.Set(ctx, "{session:abc}:last_seen", "1711900800", time.Hour)
pipe.Expire(ctx, "{session:abc}:data", time.Hour)
_, err := pipe.Exec(ctx)
```

## Iterate Over All Nodes

```go
err := rdb.ForEachMaster(ctx, func(ctx context.Context, client *redis.Client) error {
    info, err := client.Info(ctx, "server").Result()
    if err != nil {
        return err
    }
    fmt.Println(info)
    return nil
})
```

## Cluster Info

```go
info, err := rdb.ClusterInfo(ctx).Result()
fmt.Println(info)

nodes, err := rdb.ClusterNodes(ctx).Result()
fmt.Println(nodes)
```

## Handling MOVED and ASK Errors

go-redis handles `MOVED` and `ASK` redirects automatically. If you see them in logs it usually means the cluster is resharding. The `MaxRedirects` option controls how many times go-redis retries before returning an error.

## Summary

`redis.NewClusterClient` connects to Redis Cluster and handles slot routing, node discovery, and MOVED/ASK redirects automatically. For multi-key operations, use hash tags to ensure all keys land on the same slot. The `ReadOnly` and `RouteByLatency` options can improve read throughput by distributing reads across replicas.
