# How to Build Scheduled Task Runner in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Scheduling, Cron, Background Jobs

Description: Learn how to build a scheduled task runner in Go using time.Ticker, cron expressions, and proper goroutine management.

---

Scheduled tasks are essential for applications that need to perform recurring operations like data cleanup, report generation, or periodic API calls. Go provides excellent primitives for building robust task schedulers. In this post, we will explore how to build a production-ready scheduled task runner from scratch.

## Using time.Ticker for Simple Intervals

The simplest approach to scheduling tasks in Go is using `time.Ticker`. It sends values on a channel at regular intervals.

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case t := <-ticker.C:
            fmt.Println("Task executed at:", t)
            // Execute your task here
        }
    }
}
```

While `time.Ticker` works well for fixed intervals, real-world applications often need cron-style scheduling with more flexible expressions.

## Using robfig/cron for Cron Expressions

The `robfig/cron` library provides powerful cron expression parsing and scheduling. Install it with:

```bash
go get github.com/robfig/cron/v3
```

Here is a basic example:

```go
package main

import (
    "fmt"
    "github.com/robfig/cron/v3"
)

func main() {
    c := cron.New()

    // Run every minute
    c.AddFunc("* * * * *", func() {
        fmt.Println("Running every minute")
    })

    // Run at 9 AM every day
    c.AddFunc("0 9 * * *", func() {
        fmt.Println("Good morning!")
    })

    c.Start()
    select {} // Block forever
}
```

## Building a Task Registration System

For a more structured approach, create a task registry that allows dynamic task registration:

```go
package scheduler

import (
    "context"
    "sync"
    "github.com/robfig/cron/v3"
)

type Task struct {
    Name     string
    Schedule string
    Handler  func(ctx context.Context) error
}

type Scheduler struct {
    cron  *cron.Cron
    tasks map[string]cron.EntryID
    mu    sync.RWMutex
}

func NewScheduler() *Scheduler {
    return &Scheduler{
        cron:  cron.New(),
        tasks: make(map[string]cron.EntryID),
    }
}

func (s *Scheduler) Register(task Task) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    id, err := s.cron.AddFunc(task.Schedule, func() {
        ctx := context.Background()
        if err := task.Handler(ctx); err != nil {
            // Log error
        }
    })
    if err != nil {
        return err
    }

    s.tasks[task.Name] = id
    return nil
}
```

## Error Handling and Recovery

Robust error handling prevents a single failing task from crashing the entire scheduler:

```go
func (s *Scheduler) safeExecute(task Task) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Task %s panicked: %v", task.Name, r)
        }
    }()

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
    defer cancel()

    if err := task.Handler(ctx); err != nil {
        log.Printf("Task %s failed: %v", task.Name, err)
        // Implement retry logic or alerting here
    }
}
```

## Graceful Shutdown

Proper shutdown handling ensures tasks complete before the application exits:

```go
func (s *Scheduler) Start(ctx context.Context) {
    s.cron.Start()

    <-ctx.Done()

    // Stop accepting new jobs
    stopCtx := s.cron.Stop()

    // Wait for running jobs to complete
    select {
    case <-stopCtx.Done():
        log.Println("All tasks completed")
    case <-time.After(30 * time.Second):
        log.Println("Shutdown timeout exceeded")
    }
}
```

Use it with signal handling:

```go
func main() {
    ctx, cancel := signal.NotifyContext(context.Background(),
        syscall.SIGINT, syscall.SIGTERM)
    defer cancel()

    scheduler := NewScheduler()
    scheduler.Register(Task{
        Name:     "cleanup",
        Schedule: "0 * * * *",
        Handler:  cleanupHandler,
    })

    scheduler.Start(ctx)
}
```

## Distributed Locking for Scaling

When running multiple instances, use distributed locking to prevent duplicate task execution. Redis is a popular choice:

```go
import "github.com/go-redis/redis/v8"

type DistributedScheduler struct {
    *Scheduler
    redis *redis.Client
}

func (ds *DistributedScheduler) executeWithLock(task Task) {
    lockKey := fmt.Sprintf("scheduler:lock:%s", task.Name)

    // Try to acquire lock with TTL
    acquired, err := ds.redis.SetNX(context.Background(),
        lockKey, "locked", 5*time.Minute).Result()
    if err != nil || !acquired {
        return // Another instance is running this task
    }
    defer ds.redis.Del(context.Background(), lockKey)

    ds.safeExecute(task)
}
```

For production environments, consider using libraries like `redsync` for more robust distributed mutex implementation with automatic renewal and proper failover handling.

## Conclusion

Building a scheduled task runner in Go involves combining time-based triggers with proper concurrency management. Start with `time.Ticker` for simple cases, graduate to `robfig/cron` for complex schedules, and add distributed locking when scaling horizontally. Always implement graceful shutdown and comprehensive error handling to ensure your scheduler remains reliable in production environments.
