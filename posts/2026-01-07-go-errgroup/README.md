# How to Use errgroup for Parallel Operations in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Concurrency, errgroup, Error Handling, Parallel Processing

Description: Master errgroup in Go for coordinating parallel goroutines with proper error propagation, cancellation, and bounded concurrency.

---

Concurrent programming in Go is powerful but managing multiple goroutines, collecting errors, and coordinating shutdowns can quickly become complex. While `sync.WaitGroup` helps coordinate goroutine completion, it does not handle errors. This is where `errgroup` comes in - a package from the Go extended library that provides synchronization, error propagation, and context cancellation for groups of goroutines.

In this comprehensive guide, you will learn how to use `errgroup` for parallel operations in Go, from basic usage to advanced patterns like bounded concurrency and graceful cancellation.

## What is errgroup?

The `errgroup` package lives in `golang.org/x/sync/errgroup` and provides a way to run a group of goroutines and collect the first error that occurs. It builds on top of `sync.WaitGroup` but adds crucial features for production-ready concurrent code:

- **Error propagation**: Captures and returns the first error from any goroutine
- **Context cancellation**: Automatically cancels all goroutines when one fails
- **Bounded concurrency**: Limits the number of concurrent goroutines with `SetLimit`
- **Clean API**: Simple and intuitive interface for common concurrency patterns

## Installing errgroup

Before using errgroup, install it in your Go project:

```bash
go get golang.org/x/sync/errgroup
```

## Basic Usage

Let us start with the fundamental usage of errgroup. The basic pattern involves creating a group, launching goroutines with the Go method, and waiting for completion.

```go
package main

import (
    "fmt"
    "time"

    "golang.org/x/sync/errgroup"
)

func main() {
    // Create a new errgroup
    var g errgroup.Group

    // Launch multiple goroutines using g.Go()
    // Each function must have the signature func() error
    g.Go(func() error {
        time.Sleep(100 * time.Millisecond)
        fmt.Println("Task 1 completed")
        return nil
    })

    g.Go(func() error {
        time.Sleep(200 * time.Millisecond)
        fmt.Println("Task 2 completed")
        return nil
    })

    g.Go(func() error {
        time.Sleep(150 * time.Millisecond)
        fmt.Println("Task 3 completed")
        return nil
    })

    // Wait blocks until all goroutines complete
    // Returns the first non-nil error (if any)
    if err := g.Wait(); err != nil {
        fmt.Printf("Error: %v\n", err)
    } else {
        fmt.Println("All tasks completed successfully")
    }
}
```

The `Wait` method blocks until all goroutines launched via `Go` have completed. If any goroutine returns an error, `Wait` returns that error.

## Error Propagation and First-Error Semantics

One of the key features of errgroup is its first-error semantics. When multiple goroutines return errors, only the first error is captured and returned.

```go
package main

import (
    "errors"
    "fmt"
    "time"

    "golang.org/x/sync/errgroup"
)

func main() {
    var g errgroup.Group

    // This goroutine will return an error first
    g.Go(func() error {
        time.Sleep(50 * time.Millisecond)
        return errors.New("task 1 failed: connection timeout")
    })

    // This goroutine completes successfully
    g.Go(func() error {
        time.Sleep(100 * time.Millisecond)
        fmt.Println("Task 2 completed")
        return nil
    })

    // This goroutine also fails but after task 1
    g.Go(func() error {
        time.Sleep(150 * time.Millisecond)
        return errors.New("task 3 failed: permission denied")
    })

    // Only the first error (from task 1) is returned
    if err := g.Wait(); err != nil {
        fmt.Printf("First error encountered: %v\n", err)
    }
}
```

Important: Even though only the first error is returned, all goroutines continue to run until completion. This behavior changes when you use context cancellation, which we will cover next.

## Context Cancellation Integration

For production applications, you often want to cancel remaining work when one task fails. The `errgroup.WithContext` function creates a group with an associated context that is cancelled when any goroutine returns an error.

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "time"

    "golang.org/x/sync/errgroup"
)

func main() {
    // Create an errgroup with context
    // The derived context is cancelled when:
    // 1. Any goroutine returns a non-nil error
    // 2. All goroutines complete successfully
    g, ctx := errgroup.WithContext(context.Background())

    // Task 1: Fails quickly and triggers cancellation
    g.Go(func() error {
        time.Sleep(50 * time.Millisecond)
        return errors.New("critical failure in task 1")
    })

    // Task 2: Respects context cancellation
    g.Go(func() error {
        select {
        case <-time.After(500 * time.Millisecond):
            fmt.Println("Task 2 completed normally")
            return nil
        case <-ctx.Done():
            // Context was cancelled due to task 1's error
            fmt.Println("Task 2 cancelled early")
            return ctx.Err()
        }
    })

    // Task 3: Also respects context cancellation
    g.Go(func() error {
        select {
        case <-time.After(300 * time.Millisecond):
            fmt.Println("Task 3 completed normally")
            return nil
        case <-ctx.Done():
            fmt.Println("Task 3 cancelled early")
            return ctx.Err()
        }
    })

    if err := g.Wait(); err != nil {
        fmt.Printf("Group failed: %v\n", err)
    }
}
```

The context cancellation pattern is essential for preventing wasted resources when a critical task fails.

## Parallel HTTP Requests Example

A common real-world use case for errgroup is making parallel HTTP requests. Here is a complete example that fetches data from multiple URLs concurrently.

```go
package main

import (
    "context"
    "fmt"
    "io"
    "net/http"
    "sync"
    "time"

    "golang.org/x/sync/errgroup"
)

// Result holds the response data for each URL
type Result struct {
    URL        string
    StatusCode int
    Body       string
}

func main() {
    urls := []string{
        "https://httpbin.org/get",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/status/200",
        "https://httpbin.org/headers",
    }

    results, err := fetchAllURLs(urls)
    if err != nil {
        fmt.Printf("Error fetching URLs: %v\n", err)
        return
    }

    for _, r := range results {
        fmt.Printf("URL: %s, Status: %d, Body length: %d\n",
            r.URL, r.StatusCode, len(r.Body))
    }
}

// fetchAllURLs fetches multiple URLs concurrently using errgroup
func fetchAllURLs(urls []string) ([]Result, error) {
    // Create context with timeout for all requests
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Create errgroup with context for cancellation on error
    g, ctx := errgroup.WithContext(ctx)

    // Thread-safe slice to store results
    var mu sync.Mutex
    results := make([]Result, 0, len(urls))

    // Create HTTP client with timeout
    client := &http.Client{
        Timeout: 5 * time.Second,
    }

    // Launch a goroutine for each URL
    for _, url := range urls {
        url := url // Capture loop variable (required for Go versions < 1.22)

        g.Go(func() error {
            // Create request with context for cancellation
            req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
            if err != nil {
                return fmt.Errorf("creating request for %s: %w", url, err)
            }

            // Execute the request
            resp, err := client.Do(req)
            if err != nil {
                return fmt.Errorf("fetching %s: %w", url, err)
            }
            defer resp.Body.Close()

            // Read response body
            body, err := io.ReadAll(resp.Body)
            if err != nil {
                return fmt.Errorf("reading body from %s: %w", url, err)
            }

            // Safely append result
            mu.Lock()
            results = append(results, Result{
                URL:        url,
                StatusCode: resp.StatusCode,
                Body:       string(body),
            })
            mu.Unlock()

            return nil
        })
    }

    // Wait for all requests to complete
    if err := g.Wait(); err != nil {
        return nil, err
    }

    return results, nil
}
```

This example demonstrates several important patterns:
- Using `http.NewRequestWithContext` to respect context cancellation
- Protecting shared state with a mutex
- Proper error wrapping for debugging
- Loop variable capture for closures

## SetLimit for Bounded Concurrency

When dealing with many tasks, you often want to limit concurrent execution to avoid overwhelming resources like database connections or API rate limits. The `SetLimit` method provides this capability.

```go
package main

import (
    "context"
    "fmt"
    "time"

    "golang.org/x/sync/errgroup"
)

func main() {
    // Create errgroup with context
    g, ctx := errgroup.WithContext(context.Background())

    // Limit to 3 concurrent goroutines
    // Additional calls to Go() will block until a slot is available
    g.SetLimit(3)

    tasks := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}

    for _, taskID := range tasks {
        taskID := taskID // Capture loop variable

        g.Go(func() error {
            // Check if context is cancelled before starting work
            select {
            case <-ctx.Done():
                return ctx.Err()
            default:
            }

            fmt.Printf("Starting task %d at %s\n",
                taskID, time.Now().Format("15:04:05.000"))

            // Simulate work
            time.Sleep(500 * time.Millisecond)

            fmt.Printf("Completed task %d at %s\n",
                taskID, time.Now().Format("15:04:05.000"))

            return nil
        })
    }

    if err := g.Wait(); err != nil {
        fmt.Printf("Error: %v\n", err)
    }

    fmt.Println("All tasks completed")
}
```

When you run this code, you will see that only 3 tasks run at any given time, with others waiting for available slots.

## TryGo for Non-Blocking Execution

The `TryGo` method attempts to start a goroutine but returns immediately if the concurrency limit would be exceeded.

```go
package main

import (
    "fmt"
    "time"

    "golang.org/x/sync/errgroup"
)

func main() {
    var g errgroup.Group
    g.SetLimit(2)

    tasks := []string{"A", "B", "C", "D", "E"}
    submitted := 0
    skipped := 0

    for _, task := range tasks {
        task := task

        // TryGo returns true if the goroutine was started
        // Returns false if the limit would be exceeded
        started := g.TryGo(func() error {
            fmt.Printf("Processing task %s\n", task)
            time.Sleep(100 * time.Millisecond)
            return nil
        })

        if started {
            submitted++
            fmt.Printf("Task %s submitted\n", task)
        } else {
            skipped++
            fmt.Printf("Task %s skipped (limit reached)\n", task)
        }
    }

    // Wait for submitted tasks to complete
    if err := g.Wait(); err != nil {
        fmt.Printf("Error: %v\n", err)
    }

    fmt.Printf("Submitted: %d, Skipped: %d\n", submitted, skipped)
}
```

This is useful when you want to submit as many tasks as possible without blocking, perhaps to handle overflow differently.

## Comparison with sync.WaitGroup

Let us compare errgroup with the standard library's `sync.WaitGroup` to understand when to use each.

### Using sync.WaitGroup (Manual Error Handling)

```go
package main

import (
    "errors"
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup

    // Must manually manage error collection
    var mu sync.Mutex
    var errs []error

    tasks := []int{1, 2, 3}

    for _, taskID := range tasks {
        taskID := taskID
        wg.Add(1)

        go func() {
            defer wg.Done()

            // Simulate task that might fail
            if taskID == 2 {
                mu.Lock()
                errs = append(errs, fmt.Errorf("task %d failed", taskID))
                mu.Unlock()
                return
            }

            fmt.Printf("Task %d completed\n", taskID)
        }()
    }

    wg.Wait()

    if len(errs) > 0 {
        fmt.Printf("Errors: %v\n", errs)
    }
}
```

### Using errgroup (Built-in Error Handling)

```go
package main

import (
    "fmt"

    "golang.org/x/sync/errgroup"
)

func main() {
    var g errgroup.Group

    tasks := []int{1, 2, 3}

    for _, taskID := range tasks {
        taskID := taskID

        g.Go(func() error {
            // Simulate task that might fail
            if taskID == 2 {
                return fmt.Errorf("task %d failed", taskID)
            }

            fmt.Printf("Task %d completed\n", taskID)
            return nil
        })
    }

    // Error handling is automatic
    if err := g.Wait(); err != nil {
        fmt.Printf("Error: %v\n", err)
    }
}
```

### Key Differences

| Feature | sync.WaitGroup | errgroup |
|---------|----------------|----------|
| Error propagation | Manual | Automatic |
| Context cancellation | Manual | Built-in with WithContext |
| Concurrency limiting | Manual | Built-in with SetLimit |
| API complexity | Lower-level | Higher-level |
| Standard library | Yes | Extended library |

Use `sync.WaitGroup` when you need fine-grained control or when tasks cannot fail. Use `errgroup` when you need error handling, cancellation, or bounded concurrency.

## Real-World Use Cases

### 1. Database Batch Processing

Process database records in parallel with bounded concurrency to avoid connection pool exhaustion.

```go
package main

import (
    "context"
    "database/sql"
    "fmt"

    "golang.org/x/sync/errgroup"
)

// ProcessRecords processes database records in parallel batches
func ProcessRecords(ctx context.Context, db *sql.DB, recordIDs []int64) error {
    g, ctx := errgroup.WithContext(ctx)

    // Limit concurrent database operations
    // Match this to your connection pool size
    g.SetLimit(10)

    for _, id := range recordIDs {
        id := id

        g.Go(func() error {
            // Check context before expensive operation
            if ctx.Err() != nil {
                return ctx.Err()
            }

            // Process individual record
            return processRecord(ctx, db, id)
        })
    }

    return g.Wait()
}

func processRecord(ctx context.Context, db *sql.DB, id int64) error {
    // Simulated database operation
    _, err := db.ExecContext(ctx,
        "UPDATE records SET processed = true WHERE id = $1", id)
    if err != nil {
        return fmt.Errorf("processing record %d: %w", id, err)
    }
    return nil
}
```

### 2. File Processing Pipeline

Process multiple files concurrently with proper error handling.

```go
package main

import (
    "context"
    "fmt"
    "os"
    "path/filepath"

    "golang.org/x/sync/errgroup"
)

// ProcessFiles processes all files in a directory concurrently
func ProcessFiles(ctx context.Context, dir string) error {
    files, err := os.ReadDir(dir)
    if err != nil {
        return fmt.Errorf("reading directory: %w", err)
    }

    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(5) // Process 5 files at a time

    for _, file := range files {
        if file.IsDir() {
            continue
        }

        filePath := filepath.Join(dir, file.Name())

        g.Go(func() error {
            select {
            case <-ctx.Done():
                return ctx.Err()
            default:
                return processFile(ctx, filePath)
            }
        })
    }

    return g.Wait()
}

func processFile(ctx context.Context, path string) error {
    // Read file
    data, err := os.ReadFile(path)
    if err != nil {
        return fmt.Errorf("reading %s: %w", path, err)
    }

    // Process file content
    fmt.Printf("Processed %s (%d bytes)\n", path, len(data))
    return nil
}
```

### 3. Microservice Health Checks

Check the health of multiple services concurrently before starting an application.

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "time"

    "golang.org/x/sync/errgroup"
)

// Service represents a dependency service
type Service struct {
    Name     string
    HealthURL string
}

// CheckAllServices verifies all services are healthy
func CheckAllServices(ctx context.Context, services []Service) error {
    // Set overall timeout for health checks
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    g, ctx := errgroup.WithContext(ctx)

    client := &http.Client{Timeout: 5 * time.Second}

    for _, svc := range services {
        svc := svc

        g.Go(func() error {
            return checkServiceHealth(ctx, client, svc)
        })
    }

    return g.Wait()
}

func checkServiceHealth(ctx context.Context, client *http.Client, svc Service) error {
    req, err := http.NewRequestWithContext(ctx, "GET", svc.HealthURL, nil)
    if err != nil {
        return fmt.Errorf("creating request for %s: %w", svc.Name, err)
    }

    resp, err := client.Do(req)
    if err != nil {
        return fmt.Errorf("health check failed for %s: %w", svc.Name, err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return fmt.Errorf("%s returned status %d", svc.Name, resp.StatusCode)
    }

    fmt.Printf("Service %s is healthy\n", svc.Name)
    return nil
}

func main() {
    services := []Service{
        {Name: "database", HealthURL: "http://localhost:5432/health"},
        {Name: "cache", HealthURL: "http://localhost:6379/health"},
        {Name: "queue", HealthURL: "http://localhost:5672/health"},
    }

    if err := CheckAllServices(context.Background(), services); err != nil {
        fmt.Printf("Service health check failed: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("All services healthy, starting application...")
}
```

### 4. Parallel Data Aggregation

Fetch data from multiple sources and aggregate results.

```go
package main

import (
    "context"
    "fmt"
    "sync"

    "golang.org/x/sync/errgroup"
)

// DataSource represents a data source interface
type DataSource interface {
    Fetch(ctx context.Context) ([]int, error)
}

// AggregateData fetches from multiple sources and combines results
func AggregateData(ctx context.Context, sources []DataSource) ([]int, error) {
    g, ctx := errgroup.WithContext(ctx)

    var mu sync.Mutex
    var allData []int

    for i, source := range sources {
        source := source
        sourceIdx := i

        g.Go(func() error {
            data, err := source.Fetch(ctx)
            if err != nil {
                return fmt.Errorf("source %d: %w", sourceIdx, err)
            }

            mu.Lock()
            allData = append(allData, data...)
            mu.Unlock()

            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }

    return allData, nil
}
```

## Best Practices

### 1. Always Check Context in Long-Running Tasks

```go
g.Go(func() error {
    for i := 0; i < 1000; i++ {
        // Check context periodically
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }

        // Do work
        processItem(i)
    }
    return nil
})
```

### 2. Wrap Errors with Context

```go
g.Go(func() error {
    if err := riskyOperation(); err != nil {
        // Include context about what failed
        return fmt.Errorf("processing user %d: %w", userID, err)
    }
    return nil
})
```

### 3. Set Appropriate Limits Based on Resources

```go
// Match database connection pool size
g.SetLimit(dbPool.MaxConnections())

// Or limit based on CPU cores
g.SetLimit(runtime.NumCPU())

// Or limit based on external API rate limits
g.SetLimit(apiRateLimit / 10) // Leave headroom
```

### 4. Use Defer for Cleanup

```go
g.Go(func() error {
    resource, err := acquireResource()
    if err != nil {
        return err
    }
    defer resource.Release()

    return processWithResource(resource)
})
```

### 5. Handle Partial Results

```go
func fetchWithPartialResults(urls []string) ([]Result, []error) {
    var g errgroup.Group
    g.SetLimit(10)

    var mu sync.Mutex
    var results []Result
    var errors []error

    for _, url := range urls {
        url := url

        g.Go(func() error {
            result, err := fetch(url)
            mu.Lock()
            defer mu.Unlock()

            if err != nil {
                errors = append(errors, err)
                return nil // Don't fail the whole group
            }

            results = append(results, result)
            return nil
        })
    }

    g.Wait() // Will always succeed
    return results, errors
}
```

## Common Pitfalls to Avoid

### 1. Forgetting Loop Variable Capture

```go
// WRONG - all goroutines see the same value
for _, item := range items {
    g.Go(func() error {
        return process(item) // Bug: item changes each iteration
    })
}

// CORRECT - capture the variable
for _, item := range items {
    item := item // Shadow the variable
    g.Go(func() error {
        return process(item)
    })
}
```

Note: Go 1.22+ fixes this behavior, but the pattern is still good practice for compatibility.

### 2. Not Respecting Context Cancellation

```go
// WRONG - ignores cancellation
g.Go(func() error {
    time.Sleep(time.Hour)
    return nil
})

// CORRECT - respects cancellation
g.Go(func() error {
    select {
    case <-time.After(time.Hour):
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
})
```

### 3. Reusing an errgroup After Wait

```go
var g errgroup.Group
g.Go(func() error { return nil })
g.Wait()

// WRONG - undefined behavior
g.Go(func() error { return nil })

// CORRECT - create a new group
var g2 errgroup.Group
g2.Go(func() error { return nil })
```

## Conclusion

The `errgroup` package is an essential tool for building robust concurrent applications in Go. It simplifies error propagation, provides context cancellation for graceful shutdowns, and offers bounded concurrency for resource management.

Key takeaways:
- Use `errgroup.WithContext` for automatic cancellation on errors
- Use `SetLimit` to control resource consumption
- Always check context cancellation in long-running goroutines
- Wrap errors with descriptive context for debugging
- Choose errgroup over sync.WaitGroup when error handling is needed

By mastering errgroup, you can write concurrent Go code that is both efficient and maintainable, handling errors gracefully and respecting resource constraints.

## Further Reading

- [Official errgroup documentation](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [Context package documentation](https://pkg.go.dev/context)
- [sync.WaitGroup documentation](https://pkg.go.dev/sync#WaitGroup)
