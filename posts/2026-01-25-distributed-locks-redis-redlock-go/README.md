# How to Implement Distributed Locks with Redis Redlock in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Redis, Distributed Locks, Redlock, Concurrency

Description: Learn how to implement distributed locks using the Redlock algorithm in Go to coordinate access to shared resources across multiple processes and servers.

---

When you have multiple instances of a service running, coordinating access to shared resources becomes tricky. A local mutex only protects within a single process. Distributed locks solve this by coordinating across processes and machines. Redis, combined with the Redlock algorithm, provides a practical solution that balances simplicity and correctness.

## Why Not Just Use a Single Redis Lock?

A single Redis instance lock using `SETNX` works for many cases, but it has a fundamental problem: if that Redis instance goes down, your lock disappears. You might think "just use Redis Sentinel or Cluster," but failover introduces a race condition. The lock might exist on the primary but not yet replicate to the replica before failover occurs.

The Redlock algorithm addresses this by requiring a majority of independent Redis instances to agree on a lock. If you have 5 Redis instances and acquire the lock on at least 3, you can be confident the lock is valid even if 2 instances fail.

## The Redlock Algorithm

The algorithm works as follows:

1. Get the current time in milliseconds
2. Try to acquire the lock on all N Redis instances sequentially, using the same key and random value
3. Calculate the time elapsed to acquire locks. If you acquired locks on a majority (N/2 + 1) of instances and the total time is less than the lock TTL, the lock is valid
4. If the lock was acquired, the effective lock validity time is the initial TTL minus the elapsed time
5. If the lock was not acquired (fewer than majority or elapsed time exceeded TTL), unlock all instances

## Setting Up the Project

First, let's set up the Go module and dependencies:

```bash
go mod init distributed-lock-example
go get github.com/go-redis/redis/v9
```

## Basic Redlock Implementation

Here's a complete implementation of the Redlock algorithm:

```go
package redlock

import (
    "context"
    "crypto/rand"
    "encoding/hex"
    "errors"
    "sync"
    "time"

    "github.com/redis/go-redis/v9"
)

var (
    ErrLockNotAcquired = errors.New("failed to acquire lock")
    ErrLockNotHeld     = errors.New("lock not held or expired")
)

// Lock represents an acquired distributed lock
type Lock struct {
    key      string
    value    string
    expiry   time.Time
    managers []*redis.Client
}

// Redlock implements the Redlock distributed locking algorithm
type Redlock struct {
    clients     []*redis.Client
    quorum      int
    retryCount  int
    retryDelay  time.Duration
    driftFactor float64
}

// NewRedlock creates a new Redlock instance with the given Redis clients
// You should use at least 3 independent Redis instances for production
func NewRedlock(clients []*redis.Client) *Redlock {
    return &Redlock{
        clients:     clients,
        quorum:      len(clients)/2 + 1,
        retryCount:  3,
        retryDelay:  200 * time.Millisecond,
        driftFactor: 0.01, // 1% clock drift
    }
}

// generateValue creates a cryptographically random value for the lock
// This ensures only the lock holder can release it
func generateValue() (string, error) {
    b := make([]byte, 16)
    _, err := rand.Read(b)
    if err != nil {
        return "", err
    }
    return hex.EncodeToString(b), nil
}

// Acquire tries to obtain a distributed lock with the given TTL
func (r *Redlock) Acquire(ctx context.Context, key string, ttl time.Duration) (*Lock, error) {
    value, err := generateValue()
    if err != nil {
        return nil, err
    }

    for attempt := 0; attempt < r.retryCount; attempt++ {
        if attempt > 0 {
            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            case <-time.After(r.retryDelay):
            }
        }

        lock, err := r.tryAcquire(ctx, key, value, ttl)
        if err == nil {
            return lock, nil
        }
    }

    return nil, ErrLockNotAcquired
}

// tryAcquire attempts to acquire the lock on all Redis instances
func (r *Redlock) tryAcquire(ctx context.Context, key, value string, ttl time.Duration) (*Lock, error) {
    startTime := time.Now()

    // Try to acquire lock on all instances concurrently
    acquired := make([]bool, len(r.clients))
    var wg sync.WaitGroup
    var mu sync.Mutex

    for i, client := range r.clients {
        wg.Add(1)
        go func(idx int, c *redis.Client) {
            defer wg.Done()
            ok := r.acquireSingle(ctx, c, key, value, ttl)
            mu.Lock()
            acquired[idx] = ok
            mu.Unlock()
        }(i, client)
    }

    wg.Wait()

    // Count successful acquisitions
    successCount := 0
    for _, ok := range acquired {
        if ok {
            successCount++
        }
    }

    // Calculate elapsed time and check if lock is still valid
    elapsed := time.Since(startTime)
    drift := time.Duration(float64(ttl) * r.driftFactor)
    validityTime := ttl - elapsed - drift

    // Check if we achieved quorum and lock is still valid
    if successCount >= r.quorum && validityTime > 0 {
        return &Lock{
            key:      key,
            value:    value,
            expiry:   time.Now().Add(validityTime),
            managers: r.clients,
        }, nil
    }

    // Failed to acquire quorum - release any locks we did get
    r.releaseAll(ctx, key, value)
    return nil, ErrLockNotAcquired
}

// acquireSingle tries to acquire lock on a single Redis instance
func (r *Redlock) acquireSingle(ctx context.Context, client *redis.Client, key, value string, ttl time.Duration) bool {
    // SET key value NX PX ttl
    // NX - only set if key does not exist
    // PX - set expiry in milliseconds
    result, err := client.SetNX(ctx, key, value, ttl).Result()
    return err == nil && result
}

// Release unlocks the distributed lock
func (r *Redlock) Release(ctx context.Context, lock *Lock) error {
    if lock == nil {
        return ErrLockNotHeld
    }
    r.releaseAll(ctx, lock.key, lock.value)
    return nil
}

// releaseAll releases the lock from all Redis instances
func (r *Redlock) releaseAll(ctx context.Context, key, value string) {
    // Lua script ensures we only delete if we hold the lock
    // This prevents deleting a lock that was acquired by another process
    script := `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
    `

    var wg sync.WaitGroup
    for _, client := range r.clients {
        wg.Add(1)
        go func(c *redis.Client) {
            defer wg.Done()
            c.Eval(ctx, script, []string{key}, value)
        }(client)
    }
    wg.Wait()
}

// Extend attempts to extend the lock's TTL
func (r *Redlock) Extend(ctx context.Context, lock *Lock, ttl time.Duration) error {
    if lock == nil || time.Now().After(lock.expiry) {
        return ErrLockNotHeld
    }

    // Lua script to extend only if we still hold the lock
    script := `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        else
            return 0
        end
    `

    successCount := 0
    var mu sync.Mutex
    var wg sync.WaitGroup

    for _, client := range r.clients {
        wg.Add(1)
        go func(c *redis.Client) {
            defer wg.Done()
            result, err := c.Eval(ctx, script, []string{lock.key}, lock.value, ttl.Milliseconds()).Int()
            if err == nil && result == 1 {
                mu.Lock()
                successCount++
                mu.Unlock()
            }
        }(client)
    }

    wg.Wait()

    if successCount >= r.quorum {
        lock.expiry = time.Now().Add(ttl)
        return nil
    }

    return ErrLockNotHeld
}
```

## Using the Redlock in Your Application

Here's how to use the Redlock implementation in practice:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
    "yourproject/redlock"
)

func main() {
    // Create connections to multiple independent Redis instances
    // These should be separate Redis servers, not replicas
    clients := []*redis.Client{
        redis.NewClient(&redis.Options{Addr: "redis1:6379"}),
        redis.NewClient(&redis.Options{Addr: "redis2:6379"}),
        redis.NewClient(&redis.Options{Addr: "redis3:6379"}),
        redis.NewClient(&redis.Options{Addr: "redis4:6379"}),
        redis.NewClient(&redis.Options{Addr: "redis5:6379"}),
    }

    // Initialize the Redlock manager
    rl := redlock.NewRedlock(clients)

    ctx := context.Background()

    // Try to acquire a lock for a critical section
    lock, err := rl.Acquire(ctx, "payment:order:12345", 10*time.Second)
    if err != nil {
        log.Fatal("Failed to acquire lock:", err)
    }

    // Ensure the lock is released when done
    defer rl.Release(ctx, lock)

    // Perform your critical section work here
    fmt.Println("Lock acquired, processing payment...")
    processPayment("order:12345")

    fmt.Println("Payment processed, releasing lock")
}

func processPayment(orderID string) {
    // Simulate payment processing
    time.Sleep(2 * time.Second)
    fmt.Printf("Payment for %s completed\n", orderID)
}
```

## Automatic Lock Extension for Long-Running Tasks

Sometimes you don't know exactly how long your critical section will take. Rather than setting an excessively long TTL, you can periodically extend the lock:

```go
// AutoExtendingLock wraps a lock with automatic TTL extension
type AutoExtendingLock struct {
    lock     *redlock.Lock
    rl       *redlock.Redlock
    ctx      context.Context
    cancel   context.CancelFunc
    done     chan struct{}
    extended bool
    mu       sync.Mutex
}

// NewAutoExtendingLock creates a lock that automatically extends itself
func NewAutoExtendingLock(ctx context.Context, rl *redlock.Redlock, key string, ttl time.Duration) (*AutoExtendingLock, error) {
    lock, err := rl.Acquire(ctx, key, ttl)
    if err != nil {
        return nil, err
    }

    ctx, cancel := context.WithCancel(ctx)
    al := &AutoExtendingLock{
        lock:   lock,
        rl:     rl,
        ctx:    ctx,
        cancel: cancel,
        done:   make(chan struct{}),
    }

    // Start background goroutine to extend lock
    go al.extendLoop(ttl)

    return al, nil
}

// extendLoop periodically extends the lock TTL
func (al *AutoExtendingLock) extendLoop(ttl time.Duration) {
    defer close(al.done)

    // Extend at half the TTL interval to ensure we never lose the lock
    ticker := time.NewTicker(ttl / 2)
    defer ticker.Stop()

    for {
        select {
        case <-al.ctx.Done():
            return
        case <-ticker.C:
            err := al.rl.Extend(al.ctx, al.lock, ttl)
            if err != nil {
                log.Printf("Failed to extend lock: %v", err)
                return
            }
            al.mu.Lock()
            al.extended = true
            al.mu.Unlock()
        }
    }
}

// Release stops the auto-extension and releases the lock
func (al *AutoExtendingLock) Release() error {
    al.cancel()
    <-al.done
    return al.rl.Release(context.Background(), al.lock)
}

// Usage example
func processLongRunningTask() error {
    ctx := context.Background()

    lock, err := NewAutoExtendingLock(ctx, redlock, "long-task:123", 5*time.Second)
    if err != nil {
        return err
    }
    defer lock.Release()

    // This can take as long as needed
    // Lock will be automatically extended
    performTimeConsumingWork()

    return nil
}
```

## Handling Edge Cases

### Fencing Tokens

Even with Redlock, there's a subtle issue: if a process holding a lock gets paused (GC pause, network delay), the lock might expire while the process still thinks it holds it. When the process resumes, it might corrupt shared state.

Fencing tokens solve this. Each lock acquisition gets a monotonically increasing token. The protected resource rejects operations with tokens lower than the highest it has seen:

```go
// FencedLock adds a fencing token to the lock
type FencedLock struct {
    *Lock
    Token uint64
}

// FencedRedlock adds fencing token support
type FencedRedlock struct {
    *Redlock
    tokenClient *redis.Client
    tokenKey    string
}

// Acquire returns a lock with a fencing token
func (fr *FencedRedlock) Acquire(ctx context.Context, key string, ttl time.Duration) (*FencedLock, error) {
    lock, err := fr.Redlock.Acquire(ctx, key, ttl)
    if err != nil {
        return nil, err
    }

    // Get monotonically increasing token
    token, err := fr.tokenClient.Incr(ctx, fr.tokenKey).Uint64()
    if err != nil {
        fr.Release(ctx, lock)
        return nil, err
    }

    return &FencedLock{Lock: lock, Token: token}, nil
}

// Your storage system should check the token
func updateWithFencing(ctx context.Context, db *sql.DB, token uint64, data string) error {
    result, err := db.ExecContext(ctx, `
        UPDATE resources
        SET data = $1, fence_token = $2
        WHERE id = $3 AND fence_token < $2
    `, data, token, resourceID)

    if err != nil {
        return err
    }

    rows, _ := result.RowsAffected()
    if rows == 0 {
        return errors.New("fencing token rejected - stale lock")
    }

    return nil
}
```

### Graceful Shutdown

When your service shuts down, release locks cleanly:

```go
func main() {
    // Track active locks
    var activeLocks sync.Map

    // Handle shutdown signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigChan
        log.Println("Shutting down, releasing locks...")

        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()

        activeLocks.Range(func(key, value interface{}) bool {
            if lock, ok := value.(*redlock.Lock); ok {
                rl.Release(ctx, lock)
            }
            return true
        })

        os.Exit(0)
    }()

    // Your application code
    // Register locks: activeLocks.Store(lockKey, lock)
    // Remove on release: activeLocks.Delete(lockKey)
}
```

## Testing Your Implementation

Always test distributed locks under realistic conditions:

```go
func TestConcurrentLockAcquisition(t *testing.T) {
    rl := setupTestRedlock(t)

    const workers = 10
    const iterations = 100

    var counter int64
    var wg sync.WaitGroup

    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := 0; j < iterations; j++ {
                ctx := context.Background()
                lock, err := rl.Acquire(ctx, "test-counter", time.Second)
                if err != nil {
                    continue
                }

                // Critical section - increment counter
                current := atomic.LoadInt64(&counter)
                time.Sleep(time.Millisecond) // Simulate work
                atomic.StoreInt64(&counter, current+1)

                rl.Release(ctx, lock)
            }
        }()
    }

    wg.Wait()

    // With proper locking, counter should equal workers * iterations
    expected := int64(workers * iterations)
    if counter != expected {
        t.Errorf("Counter = %d, expected %d - lock not working correctly", counter, expected)
    }
}
```

## Summary

Distributed locks are essential for coordinating access to shared resources in distributed systems. The Redlock algorithm provides a practical approach that tolerates Redis instance failures. Key points to remember:

- Use at least 5 independent Redis instances for production
- Account for clock drift when calculating lock validity
- Use Lua scripts to ensure atomic check-and-delete operations
- Consider fencing tokens for strong correctness guarantees
- Implement automatic lock extension for long-running tasks
- Always handle graceful shutdown to release locks

Redlock is not perfect and has been debated in the distributed systems community. For truly critical operations where correctness is paramount, consider consensus systems like etcd or ZooKeeper. But for many practical use cases, Redlock provides a good balance of simplicity and reliability.
