# How to Implement Redlock in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redlock, Distributed Locking, Go, Concurrency

Description: Learn how to implement the Redlock distributed locking algorithm in Go using the go-redis client and redsync library for fault-tolerant distributed mutual exclusion.

---

## What Is Redlock

Redlock is a distributed mutual exclusion algorithm that acquires a lock on N independent Redis instances simultaneously. A lock is considered acquired when the client successfully locks a majority (N/2 + 1) of instances within the lock TTL. This prevents a single Redis failure from allowing two goroutines or processes to hold the same lock.

## Setup and Dependencies

```bash
go mod init your-project
go get github.com/go-redsync/redsync/v4
go get github.com/go-redsync/redsync/v4/redis/goredis/v9
go get github.com/redis/go-redis/v9
```

## Basic Redlock with redsync

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/go-redsync/redsync/v4"
    redsyncredis "github.com/go-redsync/redsync/v4/redis"
    "github.com/go-redsync/redsync/v4/redis/goredis/v9"
    goredislib "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // Connect to multiple independent Redis instances
    clients := []*goredislib.Client{
        goredislib.NewClient(&goredislib.Options{Addr: "redis-1:6379"}),
        goredislib.NewClient(&goredislib.Options{Addr: "redis-2:6379"}),
        goredislib.NewClient(&goredislib.Options{Addr: "redis-3:6379"}),
    }

    // Create redsync pools
    pools := make([]redsyncredis.Pool, len(clients))
    for i, client := range clients {
        pools[i] = goredis.NewPool(client)
    }

    // Create Redsync instance
    rs := redsync.New(pools...)

    // Create a mutex (distributed lock)
    mutex := rs.NewMutex("order:processing:order-123",
        redsync.WithExpiry(30*time.Second),
        redsync.WithTries(3),
        redsync.WithRetryDelay(200*time.Millisecond),
    )

    // Acquire the lock
    if err := mutex.LockContext(ctx); err != nil {
        fmt.Printf("Failed to acquire lock: %v\n", err)
        return
    }
    defer func() {
        if ok, err := mutex.UnlockContext(ctx); !ok || err != nil {
            fmt.Printf("Failed to release lock: %v\n", err)
        }
    }()

    fmt.Println("Lock acquired, processing order...")
    time.Sleep(2 * time.Second) // Simulate work
    fmt.Println("Order processed, releasing lock")
}
```

## Helper Function Pattern

Create a reusable helper for clean lock management:

```go
package redislock

import (
    "context"
    "fmt"
    "time"

    "github.com/go-redsync/redsync/v4"
    redsyncredis "github.com/go-redsync/redsync/v4/redis"
    "github.com/go-redsync/redsync/v4/redis/goredis/v9"
    goredislib "github.com/redis/go-redis/v9"
)

type DistributedLock struct {
    rs *redsync.Redsync
}

func New(addrs []string) *DistributedLock {
    pools := make([]redsyncredis.Pool, len(addrs))
    for i, addr := range addrs {
        client := goredislib.NewClient(&goredislib.Options{Addr: addr})
        pools[i] = goredis.NewPool(client)
    }
    return &DistributedLock{rs: redsync.New(pools...)}
}

type LockOptions struct {
    TTL        time.Duration
    RetryCount int
    RetryDelay time.Duration
}

var DefaultOptions = LockOptions{
    TTL:        30 * time.Second,
    RetryCount: 3,
    RetryDelay: 200 * time.Millisecond,
}

func (dl *DistributedLock) WithLock(ctx context.Context, resource string, opts LockOptions, fn func() error) error {
    mutex := dl.rs.NewMutex(resource,
        redsync.WithExpiry(opts.TTL),
        redsync.WithTries(opts.RetryCount),
        redsync.WithRetryDelay(opts.RetryDelay),
    )

    if err := mutex.LockContext(ctx); err != nil {
        return fmt.Errorf("failed to acquire lock for %s: %w", resource, err)
    }

    defer func() {
        if _, err := mutex.UnlockContext(ctx); err != nil {
            // Log error but don't override the function error
            fmt.Printf("Warning: failed to release lock for %s: %v\n", resource, err)
        }
    }()

    return fn()
}
```

## Implementing Redlock from Scratch

For educational purposes, here is a minimal implementation:

```go
package main

import (
    "context"
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "time"

    goredis "github.com/redis/go-redis/v9"
)

const releaseScript = `
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
end
return 0
`

type Redlock struct {
    clients       []*goredis.Client
    quorum        int
    retryCount    int
    retryDelay    time.Duration
    driftFactor   float64
}

type Lock struct {
    Resource string
    Value    string
    Validity time.Duration
}

func NewRedlock(clients []*goredis.Client) *Redlock {
    return &Redlock{
        clients:     clients,
        quorum:      len(clients)/2 + 1,
        retryCount:  3,
        retryDelay:  200 * time.Millisecond,
        driftFactor: 0.01,
    }
}

func generateValue() string {
    b := make([]byte, 16)
    rand.Read(b)
    return hex.EncodeToString(b)
}

func (rl *Redlock) Acquire(ctx context.Context, resource string, ttl time.Duration) (*Lock, error) {
    value := generateValue()

    for attempt := 0; attempt < rl.retryCount; attempt++ {
        startTime := time.Now()
        acquired := 0

        for _, client := range rl.clients {
            ok, err := client.SetNX(ctx, resource, value, ttl).Result()
            if err == nil && ok {
                acquired++
            }
        }

        elapsed := time.Since(startTime)
        drift := time.Duration(float64(ttl) * rl.driftFactor)
        validity := ttl - elapsed - drift

        if acquired >= rl.quorum && validity > 0 {
            return &Lock{Resource: resource, Value: value, Validity: validity}, nil
        }

        // Release on all nodes - failed to get quorum
        rl.releaseAll(ctx, resource, value)

        if attempt < rl.retryCount-1 {
            time.Sleep(rl.retryDelay)
        }
    }

    return nil, fmt.Errorf("could not acquire lock for %s", resource)
}

func (rl *Redlock) Release(ctx context.Context, lock *Lock) {
    rl.releaseAll(ctx, lock.Resource, lock.Value)
}

func (rl *Redlock) releaseAll(ctx context.Context, resource, value string) {
    for _, client := range rl.clients {
        client.Eval(ctx, releaseScript, []string{resource}, value)
    }
}

// Usage
func main() {
    ctx := context.Background()

    clients := []*goredis.Client{
        goredis.NewClient(&goredis.Options{Addr: "localhost:6379"}),
    }

    rl := NewRedlock(clients)
    lock, err := rl.Acquire(ctx, "resource:job-42", 10*time.Second)
    if err != nil {
        fmt.Printf("Lock failed: %v\n", err)
        return
    }
    defer rl.Release(ctx, lock)

    fmt.Printf("Lock acquired, validity: %v\n", lock.Validity)
    // Do critical work
    time.Sleep(500 * time.Millisecond)
    fmt.Println("Work done")
}
```

## Testing Lock Contention in Go

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"

    "github.com/go-redsync/redsync/v4"
    "github.com/go-redsync/redsync/v4/redis/goredis/v9"
    goredislib "github.com/redis/go-redis/v9"
)

func TestConcurrentLocks() {
    ctx := context.Background()
    client := goredislib.NewClient(&goredislib.Options{Addr: "localhost:6379"})
    pool := goredis.NewPool(client)
    rs := redsync.New(pool)

    var wg sync.WaitGroup
    successCount := 0
    var mu sync.Mutex

    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            mutex := rs.NewMutex("test:concurrent:resource",
                redsync.WithExpiry(2*time.Second),
                redsync.WithTries(1), // No retry
            )

            if err := mutex.LockContext(ctx); err != nil {
                fmt.Printf("Goroutine %d: failed to acquire lock\n", id)
                return
            }
            defer mutex.UnlockContext(ctx)

            mu.Lock()
            successCount++
            mu.Unlock()

            fmt.Printf("Goroutine %d: lock acquired\n", id)
            time.Sleep(100 * time.Millisecond)
        }(i)
    }

    wg.Wait()
    fmt.Printf("Successful lock acquisitions: %d/10\n", successCount)
}
```

## Summary

Implementing Redlock in Go is cleanest with the redsync library, which handles quorum calculation, retry logic, and TTL drift correction. Create a pool for each independent Redis instance, instantiate a Redsync object, and use NewMutex() to get a per-resource lock. Always use LockContext() and UnlockContext() with a context for proper cancellation support, and configure WithExpiry, WithTries, and WithRetryDelay based on your workload's tolerance for lock contention. Use the WithLock helper pattern to ensure locks are always released even if the critical section panics.
