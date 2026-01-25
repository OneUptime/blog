# How to Gracefully Cancel Long-Running Goroutines with Context in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Concurrency, Context, Goroutines, Best Practices

Description: Learn how to properly cancel long-running goroutines using Go's context package, with practical patterns for timeouts, cancellation propagation, and resource cleanup.

---

Goroutines are cheap to create, but that does not mean you should let them run forever. A goroutine that ignores cancellation signals can leak memory, hold onto database connections, or keep processing work that nobody needs anymore. The `context` package is your primary tool for telling goroutines when to stop.

## Why Context Matters for Goroutine Cancellation

Without proper cancellation, your Go programs can suffer from:

| Problem | Impact |
|---------|--------|
| Goroutine leaks | Memory grows unbounded |
| Orphaned connections | Database/network exhaustion |
| Wasted compute | Processing cancelled requests |
| Slow shutdowns | Service takes too long to stop |

The `context` package solves these problems by providing a standard way to signal cancellation across goroutine boundaries.

## Basic Cancellation Pattern

The simplest pattern uses `context.WithCancel` to create a cancellable context. When you call the cancel function, any goroutine watching that context gets notified.

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func worker(ctx context.Context, id int) {
    for {
        select {
        case <-ctx.Done():
            // Context was cancelled - clean up and exit
            fmt.Printf("Worker %d: stopping, reason: %v\n", id, ctx.Err())
            return
        default:
            // Do actual work here
            fmt.Printf("Worker %d: working...\n", id)
            time.Sleep(500 * time.Millisecond)
        }
    }
}

func main() {
    // Create a cancellable context
    ctx, cancel := context.WithCancel(context.Background())

    // Start workers
    for i := 1; i <= 3; i++ {
        go worker(ctx, i)
    }

    // Let workers run for 2 seconds
    time.Sleep(2 * time.Second)

    // Cancel all workers
    fmt.Println("Cancelling workers...")
    cancel()

    // Give workers time to clean up
    time.Sleep(100 * time.Millisecond)
    fmt.Println("Done")
}
```

## Timeout-Based Cancellation

For operations that should not run longer than a specific duration, use `context.WithTimeout`. This automatically cancels when the deadline expires.

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func fetchData(ctx context.Context) (string, error) {
    // Simulate a slow operation
    select {
    case <-time.After(5 * time.Second):
        return "data from slow source", nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}

func main() {
    // Create context with 2-second timeout
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel() // Always call cancel to release resources

    result, err := fetchData(ctx)
    if err != nil {
        fmt.Printf("Failed: %v\n", err) // Will print: Failed: context deadline exceeded
        return
    }
    fmt.Printf("Result: %s\n", result)
}
```

## Propagating Context Through Function Calls

Context should flow through your entire call stack. Pass it as the first parameter to every function that might need cancellation.

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// Database layer - accepts context
func queryDatabase(ctx context.Context, query string) ([]string, error) {
    select {
    case <-time.After(100 * time.Millisecond):
        return []string{"row1", "row2"}, nil
    case <-ctx.Done():
        return nil, ctx.Err()
    }
}

// Service layer - propagates context
func getUserData(ctx context.Context, userID string) (map[string]interface{}, error) {
    // Check if already cancelled before starting work
    if ctx.Err() != nil {
        return nil, ctx.Err()
    }

    rows, err := queryDatabase(ctx, "SELECT * FROM users WHERE id = ?")
    if err != nil {
        return nil, err
    }

    return map[string]interface{}{
        "id":   userID,
        "data": rows,
    }, nil
}

// Handler layer - creates context with timeout
func handleRequest() {
    ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
    defer cancel()

    data, err := getUserData(ctx, "user-123")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Printf("Data: %v\n", data)
}

func main() {
    handleRequest()
}
```

## Worker Pool with Graceful Shutdown

A more realistic example shows how to coordinate multiple workers and wait for them to finish cleanly.

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

type Job struct {
    ID   int
    Data string
}

func worker(ctx context.Context, id int, jobs <-chan Job, wg *sync.WaitGroup) {
    defer wg.Done()

    for {
        select {
        case job, ok := <-jobs:
            if !ok {
                // Channel closed, no more jobs
                fmt.Printf("Worker %d: job channel closed\n", id)
                return
            }
            // Process the job
            fmt.Printf("Worker %d: processing job %d\n", id, job.ID)

            // Simulate work that respects cancellation
            select {
            case <-time.After(200 * time.Millisecond):
                fmt.Printf("Worker %d: completed job %d\n", id, job.ID)
            case <-ctx.Done():
                fmt.Printf("Worker %d: cancelled while processing job %d\n", id, job.ID)
                return
            }

        case <-ctx.Done():
            fmt.Printf("Worker %d: context cancelled, draining jobs\n", id)
            // Optionally drain remaining jobs from channel
            for job := range jobs {
                fmt.Printf("Worker %d: skipping job %d due to shutdown\n", id, job.ID)
            }
            return
        }
    }
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    jobs := make(chan Job, 100)
    var wg sync.WaitGroup

    // Start worker pool
    numWorkers := 3
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(ctx, i, jobs, &wg)
    }

    // Send jobs
    go func() {
        for i := 1; i <= 10; i++ {
            jobs <- Job{ID: i, Data: fmt.Sprintf("task-%d", i)}
        }
        close(jobs)
    }()

    // Simulate shutdown after some time
    time.Sleep(500 * time.Millisecond)
    fmt.Println("Initiating shutdown...")
    cancel()

    // Wait for all workers to finish
    wg.Wait()
    fmt.Println("All workers stopped")
}
```

## Handling Cleanup on Cancellation

When a goroutine is cancelled, you often need to clean up resources like file handles, network connections, or temporary files. Use defer statements and check context errors to handle cleanup properly.

```go
package main

import (
    "context"
    "fmt"
    "io"
    "os"
    "time"
)

func processFile(ctx context.Context, filename string) error {
    file, err := os.Open(filename)
    if err != nil {
        return err
    }
    // Defer ensures file closes even if context is cancelled
    defer file.Close()

    buffer := make([]byte, 1024)
    for {
        // Check context before each read operation
        select {
        case <-ctx.Done():
            fmt.Println("File processing cancelled, cleaning up...")
            return ctx.Err()
        default:
        }

        n, err := file.Read(buffer)
        if err == io.EOF {
            break
        }
        if err != nil {
            return err
        }

        // Process the chunk - also respect cancellation
        select {
        case <-time.After(10 * time.Millisecond):
            fmt.Printf("Processed %d bytes\n", n)
        case <-ctx.Done():
            return ctx.Err()
        }
    }

    return nil
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
    defer cancel()

    err := processFile(ctx, "/etc/hosts")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
    }
}
```

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Forgetting to Call Cancel

Every context created with `WithCancel`, `WithTimeout`, or `WithDeadline` allocates resources. Always call cancel, even if the context expires naturally.

```go
// Wrong - leaks resources
ctx, _ := context.WithTimeout(context.Background(), 5*time.Second)

// Correct - always defer cancel
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
```

### Pitfall 2: Blocking Without Checking Context

If your goroutine blocks on a channel or other operation, it will not notice cancellation unless you also select on `ctx.Done()`.

```go
// Wrong - blocks forever if channel never receives
func badWorker(ctx context.Context, ch <-chan int) {
    val := <-ch  // This ignores context completely
    fmt.Println(val)
}

// Correct - respects cancellation
func goodWorker(ctx context.Context, ch <-chan int) {
    select {
    case val := <-ch:
        fmt.Println(val)
    case <-ctx.Done():
        fmt.Println("Cancelled")
    }
}
```

### Pitfall 3: Creating New Contexts Instead of Propagating

Do not create a new `context.Background()` deep in your call stack. This breaks the cancellation chain.

```go
// Wrong - ignores parent cancellation
func processItem(ctx context.Context, item string) {
    newCtx := context.Background() // Breaks cancellation chain!
    doWork(newCtx, item)
}

// Correct - propagate the context
func processItem(ctx context.Context, item string) {
    doWork(ctx, item)
}
```

### Pitfall 4: Using Context for Data Storage

While context can carry values, do not use it as a general-purpose data store. Keep values minimal and use it primarily for request-scoped data like request IDs or authentication tokens.

```go
// Acceptable - request-scoped metadata
ctx = context.WithValue(ctx, requestIDKey, "req-12345")

// Avoid - passing business data through context
ctx = context.WithValue(ctx, userDataKey, largeUserObject) // Not recommended
```

## Best Practices Summary

1. **Always pass context as the first parameter** - This is a Go convention that makes code consistent and readable.

2. **Call cancel as soon as you are done** - Use `defer cancel()` immediately after creating the context.

3. **Check ctx.Done() in loops** - Any long-running loop should periodically check if it should stop.

4. **Set reasonable timeouts** - Do not let operations run indefinitely. Set timeouts based on expected operation duration plus buffer.

5. **Propagate context through all layers** - From HTTP handlers to database calls, context should flow through your entire stack.

6. **Handle partial work gracefully** - When cancelled mid-operation, clean up properly and return a clear error.

Context-based cancellation is one of Go's best patterns for building reliable concurrent programs. By consistently using context throughout your codebase, you get predictable behavior during shutdowns, timeouts, and user cancellations - without the complexity of managing individual goroutine lifecycles manually.
