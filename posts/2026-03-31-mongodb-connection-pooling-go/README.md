# How to Use Connection Pooling with the MongoDB Go Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Go, Connection Pool, Performance, Golang

Description: Learn how the MongoDB Go Driver manages connection pools and how to configure pool settings for optimal throughput in Go services.

---

## How Pooling Works in the Go Driver

The MongoDB Go Driver maintains a connection pool per server (replica set member or mongos router). Each `mongo.Client` instance owns its pool. When your code calls a database operation, the driver checks out a connection, executes the command, and returns the connection to the pool. This avoids the latency of establishing a new TCP connection for every request.

The most important rule: **create one `mongo.Client` per application** and share it. Creating multiple clients multiplies pool overhead and connection count on the server.

## Default Pool Settings

| Setting | Default |
|---|---|
| MaxPoolSize | 100 |
| MinPoolSize | 0 |
| MaxConnecting | 2 |
| MaxConnIdleTime | 0 (no limit) |
| ConnectTimeout | 30s |
| ServerSelectionTimeout | 30s |

## Configuring the Pool

```go
import (
    "context"
    "time"
    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
)

opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetMaxPoolSize(200).
    SetMinPoolSize(10).
    SetMaxConnecting(5).
    SetConnectTimeout(10 * time.Second).
    SetServerSelectionTimeout(5 * time.Second).
    SetMaxConnIdleTime(10 * time.Minute)

client, err := mongo.Connect(opts)
if err != nil {
    log.Fatal(err)
}
defer client.Disconnect(context.Background())
```

Or via URI parameters:

```bash
mongodb://localhost:27017/?maxPoolSize=200&minPoolSize=10&connectTimeoutMS=10000
```

## Singleton Pattern for HTTP Servers

```go
package db

import (
    "context"
    "log"
    "sync"
    "time"

    "go.mongodb.org/mongo-driver/v2/mongo"
    "go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
    once   sync.Once
    client *mongo.Client
)

func Client() *mongo.Client {
    once.Do(func() {
        opts := options.Client().
            ApplyURI("mongodb://localhost:27017").
            SetMaxPoolSize(100).
            SetMinPoolSize(5)

        var err error
        client, err = mongo.Connect(opts)
        if err != nil {
            log.Fatal("MongoDB connect error:", err)
        }

        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err = client.Ping(ctx, nil); err != nil {
            log.Fatal("MongoDB ping error:", err)
        }
    })
    return client
}
```

## Monitoring Pool Events

The Go Driver emits Connection Monitoring and Pooling (CMAP) events:

```go
import (
    "go.mongodb.org/mongo-driver/v2/event"
)

monitor := &event.PoolMonitor{
    Event: func(e *event.PoolEvent) {
        switch e.Type {
        case event.ConnectionCheckOutStarted:
            // connection checkout started
        case event.ConnectionCheckedOut:
            // connection checked out
        case event.ConnectionCheckedIn:
            // connection returned to pool
        case event.ConnectionPoolClosed:
            // pool closed
        }
    },
}

opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetPoolMonitor(monitor)
```

## Context-Based Timeouts (Per Operation)

Even with a healthy pool, always use `context.WithTimeout` per operation to prevent hung goroutines:

```go
func findProduct(coll *mongo.Collection, name string) (*Product, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var product Product
    err := coll.FindOne(ctx,
        bson.D{{Key: "name", Value: name}},
    ).Decode(&product)
    if err != nil {
        return nil, err
    }
    return &product, nil
}
```

## Sizing the Pool

```text
Recommended MaxPoolSize = max_concurrent_goroutines * avg_db_calls_per_goroutine
```

For a web server handling 500 concurrent requests with 2 DB calls each, set `MaxPoolSize` to 1000. Start conservatively and increase based on monitoring data - MongoDB servers have their own connection limits.

## Summary

The MongoDB Go Driver handles connection pooling automatically through `mongo.Client`. Configure pool size with `SetMaxPoolSize` and `SetMinPoolSize`, set per-operation timeouts via `context.WithTimeout`, and monitor pool health using `SetPoolMonitor`. Always create a single client instance using `sync.Once` and share it across your application to avoid connection proliferation.
