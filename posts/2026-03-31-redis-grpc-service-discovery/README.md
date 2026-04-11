# How to Use Redis for gRPC Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, gRPC, Service Discovery

Description: Learn how to implement gRPC service discovery with Redis so clients can dynamically resolve service endpoints and receive live updates when instances change.

---

Static service addresses break in dynamic environments where containers start, stop, and reschedule. Redis provides a simple service discovery layer - services publish their endpoints on startup and clients subscribe to changes. Unlike DNS-based discovery, Redis supports real-time notifications when instances are added or removed.

## Service Registration

Services write their endpoint to Redis with a TTL and renew it periodically:

```go
package main

import (
    "context"
    "fmt"
    "os"
    "time"

    "github.com/redis/go-redis/v9"
)

var rdb = redis.NewClient(&redis.Options{
    Addr: os.Getenv("REDIS_ADDR"),
})

const (
    serviceName = "order-service"
    serviceAddr = "10.0.1.15:50052"
    ttl         = 30 * time.Second
)

func register(ctx context.Context) error {
    key := fmt.Sprintf("grpc:discovery:%s:%s", serviceName, serviceAddr)
    return rdb.Set(ctx, key, serviceAddr, ttl).Err()
}

func startHeartbeat(ctx context.Context) {
    ticker := time.NewTicker(ttl / 2)
    for range ticker.C {
        if err := register(ctx); err != nil {
            fmt.Printf("Heartbeat failed: %v\n", err)
        }
    }
}
```

## Service Discovery on the Client

```go
func discoverEndpoints(ctx context.Context, service string) ([]string, error) {
    pattern := fmt.Sprintf("grpc:discovery:%s:*", service)
    keys, err := rdb.Keys(ctx, pattern).Result()
    if err != nil {
        return nil, err
    }

    endpoints := make([]string, 0, len(keys))
    for _, key := range keys {
        val, err := rdb.Get(ctx, key).Result()
        if err == nil {
            endpoints = append(endpoints, val)
        }
    }
    return endpoints, nil
}
```

## Live Updates with Redis Keyspace Notifications

Enable keyspace notifications for expiry events:

```bash
redis-cli config set notify-keyspace-events "KEA"
```

Subscribe to changes in the Go client:

```go
func watchServiceChanges(ctx context.Context, service string) {
    pubsub := rdb.PSubscribe(ctx,
        fmt.Sprintf("__keyevent@0__:set"),
        fmt.Sprintf("__keyevent@0__:expired"),
        fmt.Sprintf("__keyevent@0__:del"),
    )
    defer pubsub.Close()

    for msg := range pubsub.Channel() {
        if strings.Contains(msg.Payload, fmt.Sprintf("grpc:discovery:%s:", service)) {
            fmt.Printf("Service change event: %s on %s\n", msg.Channel, msg.Payload)
            // Refresh the endpoint list
            endpoints, _ := discoverEndpoints(ctx, service)
            updateLoadBalancer(endpoints)
        }
    }
}
```

## Custom gRPC Resolver

Integrate with gRPC's resolver API for transparent service discovery:

```go
type redisResolver struct {
    cc        resolver.ClientConn
    service   string
    rdb       *redis.Client
}

func (r *redisResolver) ResolveNow(resolver.ResolveNowOptions) {
    endpoints, err := discoverEndpoints(context.Background(), r.service)
    if err != nil {
        r.cc.ReportError(err)
        return
    }

    addrs := make([]resolver.Address, len(endpoints))
    for i, ep := range endpoints {
        addrs[i] = resolver.Address{Addr: ep}
    }
    r.cc.UpdateState(resolver.State{Addresses: addrs})
}
```

## Deregistration on Shutdown

```go
func deregister(ctx context.Context) {
    key := fmt.Sprintf("grpc:discovery:%s:%s", serviceName, serviceAddr)
    rdb.Del(ctx, key)
}

// Register signal handlers
c := make(chan os.Signal, 1)
signal.Notify(c, os.Interrupt, syscall.SIGTERM)
go func() {
    <-c
    deregister(context.Background())
    os.Exit(0)
}()
```

## Summary

Redis-based gRPC service discovery uses key TTLs for automatic dead instance cleanup and keyspace notifications for real-time endpoint updates. Services register on startup and heartbeat to renew their TTL. Clients scan the discovery namespace and optionally subscribe to keyspace events to refresh their endpoint list dynamically. This provides a lightweight alternative to Consul or etcd for smaller deployments.
