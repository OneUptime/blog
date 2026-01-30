# How to Use Semaphores for Concurrency Control in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Concurrency, Semaphores, Performance

Description: Learn how to implement and use semaphores in Go to control access to limited resources and manage concurrent operations effectively.

---

Concurrency is one of Go's strongest features, but managing access to limited resources requires careful coordination. Semaphores provide an elegant solution for controlling how many goroutines can access a resource simultaneously. This guide covers practical implementations you can use in production systems.

## What Are Semaphores?

A semaphore is a synchronization primitive that maintains a counter representing available resources. Goroutines acquire permits before accessing a resource and release them when done. Unlike mutexes that allow only one accessor, semaphores can permit multiple concurrent accesses up to a defined limit.

Use semaphores when you need to:
- Limit concurrent database connections
- Control API request rates
- Manage worker pool sizes
- Throttle file system operations

## Using the Official Semaphore Package

Go's extended library provides `golang.org/x/sync/semaphore` for production use. Here's a basic example:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "golang.org/x/sync/semaphore"
)

func main() {
    // Create a semaphore allowing 3 concurrent operations
    sem := semaphore.NewWeighted(3)
    ctx := context.Background()

    for i := 0; i < 10; i++ {
        // Acquire one permit (blocks if none available)
        if err := sem.Acquire(ctx, 1); err != nil {
            fmt.Printf("Failed to acquire semaphore: %v\n", err)
            return
        }

        go func(id int) {
            defer sem.Release(1) // Always release when done

            fmt.Printf("Worker %d started\n", id)
            time.Sleep(time.Second) // Simulate work
            fmt.Printf("Worker %d finished\n", id)
        }(i)
    }

    // Wait for all permits to be available (all workers done)
    sem.Acquire(ctx, 3)
}
```

## Weighted Semaphores for Resource Management

Weighted semaphores let different operations consume different amounts of capacity. This is useful when operations have varying resource requirements:

```go
package main

import (
    "context"
    "fmt"
    "sync"

    "golang.org/x/sync/semaphore"
)

// ResourcePool manages operations with different memory requirements
type ResourcePool struct {
    sem *semaphore.Weighted
}

func NewResourcePool(maxMemoryMB int64) *ResourcePool {
    return &ResourcePool{
        sem: semaphore.NewWeighted(maxMemoryMB),
    }
}

func (p *ResourcePool) RunTask(ctx context.Context, memoryMB int64, task func()) error {
    // Acquire permits equal to memory requirement
    if err := p.sem.Acquire(ctx, memoryMB); err != nil {
        return err
    }
    defer p.sem.Release(memoryMB)

    task()
    return nil
}

func main() {
    // Pool with 100MB total capacity
    pool := NewResourcePool(100)
    ctx := context.Background()
    var wg sync.WaitGroup

    tasks := []struct {
        name   string
        memory int64
    }{
        {"small-task", 10},
        {"medium-task", 30},
        {"large-task", 50},
        {"another-small", 10},
    }

    for _, t := range tasks {
        wg.Add(1)
        go func(name string, mem int64) {
            defer wg.Done()
            pool.RunTask(ctx, mem, func() {
                fmt.Printf("Running %s (using %dMB)\n", name, mem)
            })
        }(t.name, t.memory)
    }

    wg.Wait()
}
```

## Channel-Based Semaphore Implementation

For simpler cases, you can implement semaphores using buffered channels:

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Semaphore uses a buffered channel for permit management
type Semaphore struct {
    permits chan struct{}
}

func NewSemaphore(maxPermits int) *Semaphore {
    return &Semaphore{
        permits: make(chan struct{}, maxPermits),
    }
}

func (s *Semaphore) Acquire() {
    s.permits <- struct{}{} // Blocks when buffer is full
}

func (s *Semaphore) Release() {
    <-s.permits // Remove one permit from channel
}

func (s *Semaphore) TryAcquire() bool {
    select {
    case s.permits <- struct{}{}:
        return true
    default:
        return false // No permit available
    }
}

func main() {
    sem := NewSemaphore(2)
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()

            sem.Acquire()
            defer sem.Release()

            fmt.Printf("Worker %d processing\n", id)
            time.Sleep(500 * time.Millisecond)
        }(i)
    }

    wg.Wait()
}
```

## Rate Limiting with Semaphores

Combine semaphores with time-based logic to build rate limiters:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"

    "golang.org/x/sync/semaphore"
)

// RateLimiter controls requests per time window
type RateLimiter struct {
    sem      *semaphore.Weighted
    interval time.Duration
}

func NewRateLimiter(maxRequests int64, interval time.Duration) *RateLimiter {
    return &RateLimiter{
        sem:      semaphore.NewWeighted(maxRequests),
        interval: interval,
    }
}

func (r *RateLimiter) Allow(ctx context.Context) error {
    if err := r.sem.Acquire(ctx, 1); err != nil {
        return err
    }

    // Release permit after interval expires
    go func() {
        time.Sleep(r.interval)
        r.sem.Release(1)
    }()

    return nil
}

func main() {
    // Allow 5 requests per second
    limiter := NewRateLimiter(5, time.Second)
    ctx := context.Background()
    var wg sync.WaitGroup

    for i := 0; i < 15; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            if err := limiter.Allow(ctx); err != nil {
                return
            }
            fmt.Printf("[%v] Request %d processed\n", time.Now().Format("15:04:05.000"), id)
        }(i)
    }

    wg.Wait()
}
```

## Real World Example: Database Connection Pool

Here's a practical example managing database connections:

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    "golang.org/x/sync/semaphore"
)

// DBPool wraps a database with connection limiting
type DBPool struct {
    db  *sql.DB
    sem *semaphore.Weighted
}

func NewDBPool(db *sql.DB, maxConnections int64) *DBPool {
    return &DBPool{
        db:  db,
        sem: semaphore.NewWeighted(maxConnections),
    }
}

func (p *DBPool) Query(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
    // Set timeout for acquiring connection
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    if err := p.sem.Acquire(ctx, 1); err != nil {
        return nil, fmt.Errorf("connection pool exhausted: %w", err)
    }

    rows, err := p.db.QueryContext(ctx, query, args...)
    if err != nil {
        p.sem.Release(1) // Release on error
        return nil, err
    }

    // Caller must close rows, which triggers release
    return &poolRows{Rows: rows, release: func() { p.sem.Release(1) }}, nil
}

type poolRows struct {
    *sql.Rows
    release func()
}

func (r *poolRows) Close() error {
    r.release()
    return r.Rows.Close()
}
```

## Best Practices

1. **Always release permits** - Use defer to ensure permits are released even if panics occur.

2. **Use context for timeouts** - Prevent indefinite blocking with context deadlines.

3. **Choose appropriate limits** - Profile your system to determine optimal concurrency levels.

4. **Consider weighted semaphores** - When operations have different resource costs, use weights to balance load.

5. **Monitor semaphore usage** - Track acquisition times and failures to identify bottlenecks.

Semaphores are fundamental tools for building robust concurrent systems in Go. Start with the official `golang.org/x/sync/semaphore` package for most use cases, and consider channel-based implementations when you need simpler semantics or custom behavior.
