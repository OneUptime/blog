# How to Avoid Common Goroutine Leaks in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Concurrency, Goroutines, Debugging, Memory, Performance

Description: Identify and prevent goroutine leaks in Go with proper context cancellation, cleanup patterns, and runtime detection techniques.

---

Goroutines are one of Go's most powerful features, enabling lightweight concurrent execution with minimal overhead. However, this power comes with responsibility. A goroutine leak occurs when a goroutine is started but never terminates, consuming memory and system resources indefinitely. In production systems, these leaks can accumulate over time, eventually causing your application to crash or become unresponsive.

In this comprehensive guide, we will explore the common causes of goroutine leaks, learn how to detect them, and implement robust patterns to prevent them in your Go applications.

## Understanding Goroutine Leaks

A goroutine leak happens when a goroutine is blocked indefinitely and cannot proceed to completion. Unlike memory leaks in languages without garbage collection, goroutine leaks are about execution flow rather than memory allocation. Each leaked goroutine consumes approximately 2KB of stack memory initially, which can grow as needed.

The following code demonstrates a simple goroutine leak where the goroutine blocks forever on a channel receive:

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func main() {
    // This channel is never written to
    ch := make(chan int)

    // This goroutine will block forever waiting for data
    go func() {
        val := <-ch
        fmt.Println("Received:", val)
    }()

    time.Sleep(time.Second)
    fmt.Printf("Number of goroutines: %d\n", runtime.NumGoroutine())
    // Output: Number of goroutines: 2 (main + leaked goroutine)
}
```

## Common Causes of Goroutine Leaks

### 1. Unbounded Channel Sends

One of the most frequent causes of goroutine leaks is attempting to send on a channel when no receiver exists. The sending goroutine blocks indefinitely waiting for a receiver that will never come.

The following example shows a producer that leaks because the consumer exits early:

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

// produceData simulates a data producer that sends values to a channel
func produceData(ch chan<- int) {
    for i := 0; i < 100; i++ {
        // If no one is receiving, this will block forever
        ch <- i
        fmt.Printf("Sent: %d\n", i)
    }
}

func main() {
    ch := make(chan int)

    // Start producer goroutine
    go produceData(ch)

    // Consumer only reads 5 values then stops
    for i := 0; i < 5; i++ {
        val := <-ch
        fmt.Printf("Received: %d\n", val)
    }

    // Producer is now blocked trying to send the 6th value
    time.Sleep(time.Second)
    fmt.Printf("Leaked goroutines: %d\n", runtime.NumGoroutine()-1)
}
```

The fix involves using a buffered channel or implementing proper cancellation:

```go
package main

import (
    "context"
    "fmt"
    "runtime"
    "time"
)

// produceDataWithContext respects cancellation signals
func produceDataWithContext(ctx context.Context, ch chan<- int) {
    defer close(ch)

    for i := 0; i < 100; i++ {
        select {
        case ch <- i:
            fmt.Printf("Sent: %d\n", i)
        case <-ctx.Done():
            // Context cancelled, exit gracefully
            fmt.Println("Producer cancelled")
            return
        }
    }
}

func main() {
    ch := make(chan int)
    ctx, cancel := context.WithCancel(context.Background())

    go produceDataWithContext(ctx, ch)

    // Consumer reads 5 values
    for i := 0; i < 5; i++ {
        val := <-ch
        fmt.Printf("Received: %d\n", val)
    }

    // Signal producer to stop
    cancel()

    time.Sleep(100 * time.Millisecond)
    fmt.Printf("Goroutines after cancel: %d\n", runtime.NumGoroutine())
}
```

### 2. Unbounded Channel Receives

Similarly, a goroutine waiting to receive from a channel that will never have data sent to it will leak. This commonly occurs when the sender exits without closing the channel.

The following code demonstrates a receiver leak due to an unclosed channel:

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func main() {
    ch := make(chan int)

    // This goroutine will block forever waiting for data
    go func() {
        for val := range ch {
            fmt.Println("Received:", val)
        }
        fmt.Println("Channel closed, exiting")
    }()

    // Send some data
    ch <- 1
    ch <- 2
    ch <- 3

    // Forgot to close(ch)!
    // The receiver goroutine is now leaked

    time.Sleep(time.Second)
    fmt.Printf("Leaked goroutines: %d\n", runtime.NumGoroutine()-1)
}
```

The fix is to ensure channels are properly closed when no more data will be sent:

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func main() {
    ch := make(chan int)
    done := make(chan struct{})

    go func() {
        defer close(done)
        for val := range ch {
            fmt.Println("Received:", val)
        }
        fmt.Println("Channel closed, exiting")
    }()

    // Send some data
    ch <- 1
    ch <- 2
    ch <- 3

    // Properly close the channel
    close(ch)

    // Wait for receiver to finish
    <-done

    fmt.Printf("Goroutines after cleanup: %d\n", runtime.NumGoroutine())
}
```

### 3. Missing Context Cancellation

Context cancellation is the standard Go pattern for propagating cancellation signals. Failing to check context cancellation is a major source of goroutine leaks, especially in long-running operations.

This example shows a worker that ignores context cancellation:

```go
package main

import (
    "context"
    "fmt"
    "runtime"
    "time"
)

// badWorker ignores context cancellation
func badWorker(ctx context.Context, id int) {
    for {
        // Simulates work
        time.Sleep(100 * time.Millisecond)
        fmt.Printf("Worker %d: doing work\n", id)
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
    defer cancel()

    // Start workers that ignore cancellation
    for i := 0; i < 5; i++ {
        go badWorker(ctx, i)
    }

    // Wait for timeout
    <-ctx.Done()

    time.Sleep(time.Second)
    fmt.Printf("Leaked goroutines: %d\n", runtime.NumGoroutine()-1)
    // All 5 workers are still running!
}
```

The correct implementation properly handles context cancellation:

```go
package main

import (
    "context"
    "fmt"
    "runtime"
    "time"
)

// goodWorker properly handles context cancellation
func goodWorker(ctx context.Context, id int) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("Worker %d: shutting down\n", id)
            return
        default:
            // Simulates work
            time.Sleep(100 * time.Millisecond)
            fmt.Printf("Worker %d: doing work\n", id)
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
    defer cancel()

    for i := 0; i < 5; i++ {
        go goodWorker(ctx, i)
    }

    <-ctx.Done()

    time.Sleep(200 * time.Millisecond)
    fmt.Printf("Goroutines after shutdown: %d\n", runtime.NumGoroutine())
}
```

### 4. Blocking on Mutex or Condition Variables

Goroutines can also leak when blocked on synchronization primitives like mutexes or condition variables that are never released.

The following example shows a leak caused by a deadlock scenario:

```go
package main

import (
    "fmt"
    "runtime"
    "sync"
    "time"
)

func main() {
    var mu sync.Mutex

    // First goroutine acquires the lock
    mu.Lock()

    // Second goroutine will block forever
    go func() {
        mu.Lock()
        defer mu.Unlock()
        fmt.Println("Got the lock!")
    }()

    // Never unlock - simulates a bug or forgotten unlock
    // mu.Unlock()

    time.Sleep(time.Second)
    fmt.Printf("Leaked goroutines: %d\n", runtime.NumGoroutine()-1)
}
```

### 5. Infinite Loops Without Exit Conditions

A goroutine running an infinite loop without proper exit conditions will never terminate, causing a leak.

This code shows a monitoring goroutine that cannot be stopped:

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

// unstoppableMonitor runs forever with no way to stop it
func unstoppableMonitor() {
    ticker := time.NewTicker(100 * time.Millisecond)
    for range ticker.C {
        fmt.Println("Monitoring...")
    }
}

func main() {
    go unstoppableMonitor()

    time.Sleep(500 * time.Millisecond)
    fmt.Printf("Cannot stop the monitor, goroutines: %d\n", runtime.NumGoroutine())
}
```

The fix involves providing a shutdown mechanism:

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

// stoppableMonitor can be gracefully stopped
func stoppableMonitor(stop <-chan struct{}) {
    ticker := time.NewTicker(100 * time.Millisecond)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            fmt.Println("Monitoring...")
        case <-stop:
            fmt.Println("Monitor stopped")
            return
        }
    }
}

func main() {
    stop := make(chan struct{})
    go stoppableMonitor(stop)

    time.Sleep(500 * time.Millisecond)

    // Signal the monitor to stop
    close(stop)

    time.Sleep(100 * time.Millisecond)
    fmt.Printf("Goroutines after stop: %d\n", runtime.NumGoroutine())
}
```

## Detecting Goroutine Leaks

### Using runtime.NumGoroutine()

The simplest way to detect goroutine leaks is to monitor the goroutine count at runtime using `runtime.NumGoroutine()`.

The following code implements a simple goroutine leak detector:

```go
package main

import (
    "fmt"
    "log"
    "runtime"
    "time"
)

// GoroutineTracker monitors goroutine count over time
type GoroutineTracker struct {
    baseline int
    samples  []int
}

// NewGoroutineTracker creates a new tracker with current count as baseline
func NewGoroutineTracker() *GoroutineTracker {
    return &GoroutineTracker{
        baseline: runtime.NumGoroutine(),
        samples:  make([]int, 0),
    }
}

// Sample records the current goroutine count
func (gt *GoroutineTracker) Sample() {
    gt.samples = append(gt.samples, runtime.NumGoroutine())
}

// Report prints a summary of goroutine counts
func (gt *GoroutineTracker) Report() {
    current := runtime.NumGoroutine()
    fmt.Printf("Baseline: %d\n", gt.baseline)
    fmt.Printf("Current:  %d\n", current)
    fmt.Printf("Delta:    %+d\n", current-gt.baseline)

    if len(gt.samples) > 0 {
        fmt.Printf("Samples:  %v\n", gt.samples)
    }

    if current > gt.baseline {
        log.Printf("WARNING: Potential goroutine leak detected!")
    }
}

func main() {
    tracker := NewGoroutineTracker()

    // Simulate work that might leak goroutines
    for i := 0; i < 10; i++ {
        go func(id int) {
            ch := make(chan int)
            <-ch // This will block forever - leak!
        }(i)

        tracker.Sample()
        time.Sleep(100 * time.Millisecond)
    }

    tracker.Report()
}
```

### Using pprof for Goroutine Analysis

Go's pprof package provides detailed goroutine profiling capabilities. You can expose an HTTP endpoint for real-time analysis.

This code sets up a pprof endpoint for goroutine debugging:

```go
package main

import (
    "fmt"
    "net/http"
    _ "net/http/pprof"
    "time"
)

func leakyFunction() {
    ch := make(chan int)
    go func() {
        // This goroutine blocks forever
        val := <-ch
        fmt.Println(val)
    }()
}

func main() {
    // Start pprof server
    go func() {
        fmt.Println("pprof available at http://localhost:6060/debug/pprof/goroutine?debug=1")
        http.ListenAndServe(":6060", nil)
    }()

    // Create some leaks for demonstration
    for i := 0; i < 10; i++ {
        leakyFunction()
    }

    // Keep the program running
    select {}
}
```

You can then analyze the goroutines using curl or a browser:

```bash
# View goroutine stack traces
curl http://localhost:6060/debug/pprof/goroutine?debug=1

# Download a goroutine profile for analysis
go tool pprof http://localhost:6060/debug/pprof/goroutine
```

### Using goleak in Tests

The `goleak` package from Uber provides a testing utility to detect goroutine leaks in your tests. This is particularly useful for catching leaks before they reach production.

First, install the package:

```bash
go get -u go.uber.org/goleak
```

The following test demonstrates basic goleak usage:

```go
package main

import (
    "testing"
    "time"

    "go.uber.org/goleak"
)

// leakyOperation creates a goroutine that never terminates
func leakyOperation() {
    ch := make(chan int)
    go func() {
        <-ch
    }()
}

// cleanOperation properly manages its goroutine
func cleanOperation() chan struct{} {
    done := make(chan struct{})
    go func() {
        defer close(done)
        time.Sleep(10 * time.Millisecond)
    }()
    return done
}

func TestLeakyOperation(t *testing.T) {
    defer goleak.VerifyNone(t)

    leakyOperation()
    // This test will FAIL because of the leaked goroutine
}

func TestCleanOperation(t *testing.T) {
    defer goleak.VerifyNone(t)

    done := cleanOperation()
    <-done
    // This test will PASS because the goroutine terminates
}

// TestMain can be used to check for leaks across all tests
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}
```

### Implementing Custom Leak Detection

For more control over leak detection, you can implement a custom solution:

```go
package main

import (
    "bytes"
    "fmt"
    "runtime"
    "runtime/pprof"
    "strings"
    "time"
)

// LeakDetector provides utilities for detecting goroutine leaks
type LeakDetector struct {
    snapshotBefore int
    stacksBefore   string
}

// Snapshot captures the current goroutine state
func (ld *LeakDetector) Snapshot() {
    ld.snapshotBefore = runtime.NumGoroutine()
    ld.stacksBefore = ld.captureStacks()
}

// captureStacks returns a string representation of all goroutine stacks
func (ld *LeakDetector) captureStacks() string {
    var buf bytes.Buffer
    pprof.Lookup("goroutine").WriteTo(&buf, 1)
    return buf.String()
}

// Check compares current state with snapshot and reports leaks
func (ld *LeakDetector) Check() error {
    // Give goroutines time to clean up
    time.Sleep(100 * time.Millisecond)

    currentCount := runtime.NumGoroutine()
    delta := currentCount - ld.snapshotBefore

    if delta > 0 {
        currentStacks := ld.captureStacks()
        return fmt.Errorf(
            "goroutine leak detected: %d new goroutines\nBefore: %d\nAfter: %d\n\nNew stacks:\n%s",
            delta, ld.snapshotBefore, currentCount, currentStacks,
        )
    }

    return nil
}

// FindNewGoroutines identifies goroutines created after the snapshot
func (ld *LeakDetector) FindNewGoroutines() []string {
    currentStacks := ld.captureStacks()

    // Parse and compare stack traces
    beforeLines := strings.Split(ld.stacksBefore, "\n\n")
    currentLines := strings.Split(currentStacks, "\n\n")

    beforeSet := make(map[string]bool)
    for _, line := range beforeLines {
        beforeSet[line] = true
    }

    var newGoroutines []string
    for _, line := range currentLines {
        if !beforeSet[line] && len(strings.TrimSpace(line)) > 0 {
            newGoroutines = append(newGoroutines, line)
        }
    }

    return newGoroutines
}

func main() {
    detector := &LeakDetector{}
    detector.Snapshot()

    // Create some leaks
    for i := 0; i < 3; i++ {
        ch := make(chan int)
        go func() {
            <-ch
        }()
    }

    if err := detector.Check(); err != nil {
        fmt.Println(err)
    }
}
```

## Cleanup Patterns with defer

The `defer` statement is essential for ensuring cleanup code runs, even when functions return early or panic.

### Pattern 1: Channel Cleanup with defer

This pattern ensures channels are always closed properly:

```go
package main

import (
    "context"
    "fmt"
)

// SafeProducer uses defer to guarantee channel closure
func SafeProducer(ctx context.Context) <-chan int {
    ch := make(chan int)

    go func() {
        // This ensures the channel is closed when the goroutine exits
        defer close(ch)

        for i := 0; ; i++ {
            select {
            case ch <- i:
                // Value sent successfully
            case <-ctx.Done():
                fmt.Println("Producer: context cancelled, cleaning up")
                return
            }
        }
    }()

    return ch
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())

    ch := SafeProducer(ctx)

    // Consume some values
    for i := 0; i < 5; i++ {
        fmt.Printf("Received: %d\n", <-ch)
    }

    // Cancel the context
    cancel()

    // Drain any remaining values
    for range ch {
        // Channel will close due to defer
    }

    fmt.Println("Done")
}
```

### Pattern 2: WaitGroup with defer

Using defer with sync.WaitGroup prevents common mistakes:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// WorkerPool manages a pool of workers with proper cleanup
type WorkerPool struct {
    wg     sync.WaitGroup
    ctx    context.Context
    cancel context.CancelFunc
}

// NewWorkerPool creates a new worker pool
func NewWorkerPool() *WorkerPool {
    ctx, cancel := context.WithCancel(context.Background())
    return &WorkerPool{
        ctx:    ctx,
        cancel: cancel,
    }
}

// StartWorker launches a worker goroutine
func (wp *WorkerPool) StartWorker(id int, work func(context.Context, int)) {
    wp.wg.Add(1)

    go func() {
        // Guarantee WaitGroup is decremented even if work panics
        defer wp.wg.Done()

        fmt.Printf("Worker %d: starting\n", id)
        work(wp.ctx, id)
        fmt.Printf("Worker %d: finished\n", id)
    }()
}

// Shutdown stops all workers and waits for them to complete
func (wp *WorkerPool) Shutdown() {
    fmt.Println("Initiating shutdown...")
    wp.cancel()
    wp.wg.Wait()
    fmt.Println("All workers stopped")
}

func main() {
    pool := NewWorkerPool()

    // Start some workers
    for i := 0; i < 3; i++ {
        pool.StartWorker(i, func(ctx context.Context, id int) {
            for {
                select {
                case <-ctx.Done():
                    return
                case <-time.After(100 * time.Millisecond):
                    fmt.Printf("Worker %d: working...\n", id)
                }
            }
        })
    }

    time.Sleep(500 * time.Millisecond)
    pool.Shutdown()
}
```

### Pattern 3: Resource Cleanup with defer

This pattern handles multiple resources that need cleanup:

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// Resource represents something that needs cleanup
type Resource struct {
    name   string
    closed bool
    mu     sync.Mutex
}

// Close releases the resource
func (r *Resource) Close() {
    r.mu.Lock()
    defer r.mu.Unlock()

    if !r.closed {
        fmt.Printf("Closing resource: %s\n", r.name)
        r.closed = true
    }
}

// ProcessWithResources demonstrates proper multi-resource cleanup
func ProcessWithResources(ctx context.Context) error {
    // Acquire resources
    res1 := &Resource{name: "database connection"}
    res2 := &Resource{name: "file handle"}
    res3 := &Resource{name: "network socket"}

    // Use defer in reverse order of acquisition
    defer res1.Close()
    defer res2.Close()
    defer res3.Close()

    // Start a goroutine that uses the context
    done := make(chan struct{})
    go func() {
        defer close(done)

        select {
        case <-ctx.Done():
            fmt.Println("Goroutine: received cancellation")
            return
        case <-time.After(5 * time.Second):
            fmt.Println("Goroutine: completed work")
        }
    }()

    // Wait for completion or cancellation
    select {
    case <-ctx.Done():
        // Wait for goroutine to finish
        <-done
        return ctx.Err()
    case <-done:
        return nil
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
    defer cancel()

    if err := ProcessWithResources(ctx); err != nil {
        fmt.Printf("Process ended with: %v\n", err)
    }
}
```

## Best Practices for Preventing Goroutine Leaks

### 1. Always Use Context for Cancellation

Context should be the first parameter of any function that might block or run for an extended period:

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// FetchData demonstrates proper context usage
func FetchData(ctx context.Context, url string) ([]byte, error) {
    resultCh := make(chan []byte, 1)
    errCh := make(chan error, 1)

    go func() {
        // Simulate network request
        time.Sleep(2 * time.Second)
        resultCh <- []byte("data from " + url)
    }()

    select {
    case result := <-resultCh:
        return result, nil
    case err := <-errCh:
        return nil, err
    case <-ctx.Done():
        return nil, ctx.Err()
    }
}

func main() {
    // Set a timeout
    ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
    defer cancel()

    data, err := FetchData(ctx, "https://api.example.com/data")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    fmt.Printf("Received: %s\n", data)
}
```

### 2. Use Buffered Channels When Appropriate

Buffered channels can prevent goroutine blocking when the buffer size matches the expected number of sends:

```go
package main

import (
    "fmt"
)

// ProcessItems uses a buffered channel to prevent blocking
func ProcessItems(items []int) <-chan int {
    // Buffer size matches number of items
    results := make(chan int, len(items))

    go func() {
        defer close(results)

        for _, item := range items {
            // This will never block because buffer is sized correctly
            results <- item * 2
        }
    }()

    return results
}

func main() {
    items := []int{1, 2, 3, 4, 5}
    results := ProcessItems(items)

    for result := range results {
        fmt.Printf("Result: %d\n", result)
    }
}
```

### 3. Implement Timeout Patterns

Always include timeouts for operations that might hang:

```go
package main

import (
    "fmt"
    "time"
)

// DoWorkWithTimeout wraps work in a timeout
func DoWorkWithTimeout(work func() (int, error), timeout time.Duration) (int, error) {
    resultCh := make(chan int, 1)
    errCh := make(chan error, 1)

    go func() {
        result, err := work()
        if err != nil {
            errCh <- err
            return
        }
        resultCh <- result
    }()

    select {
    case result := <-resultCh:
        return result, nil
    case err := <-errCh:
        return 0, err
    case <-time.After(timeout):
        return 0, fmt.Errorf("operation timed out after %v", timeout)
    }
}

func main() {
    // This work completes in time
    result, err := DoWorkWithTimeout(func() (int, error) {
        time.Sleep(100 * time.Millisecond)
        return 42, nil
    }, 500*time.Millisecond)

    if err != nil {
        fmt.Printf("Error: %v\n", err)
    } else {
        fmt.Printf("Result: %d\n", result)
    }

    // This work times out
    result, err = DoWorkWithTimeout(func() (int, error) {
        time.Sleep(2 * time.Second)
        return 42, nil
    }, 500*time.Millisecond)

    if err != nil {
        fmt.Printf("Error: %v\n", err)
    }
}
```

### 4. Use errgroup for Coordinated Goroutines

The errgroup package provides synchronized error handling and cancellation:

```go
package main

import (
    "context"
    "fmt"
    "time"

    "golang.org/x/sync/errgroup"
)

// FetchAllData fetches data from multiple sources concurrently
func FetchAllData(ctx context.Context, urls []string) ([]string, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]string, len(urls))

    for i, url := range urls {
        i, url := i, url // Capture loop variables

        g.Go(func() error {
            // Check context before starting work
            select {
            case <-ctx.Done():
                return ctx.Err()
            default:
            }

            // Simulate fetching data
            time.Sleep(100 * time.Millisecond)
            results[i] = fmt.Sprintf("data from %s", url)
            return nil
        })
    }

    // Wait for all goroutines to complete
    if err := g.Wait(); err != nil {
        return nil, err
    }

    return results, nil
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), time.Second)
    defer cancel()

    urls := []string{
        "https://api1.example.com",
        "https://api2.example.com",
        "https://api3.example.com",
    }

    results, err := FetchAllData(ctx, urls)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    for _, result := range results {
        fmt.Println(result)
    }
}
```

### 5. Implement Graceful Shutdown

A proper shutdown sequence ensures all goroutines terminate cleanly:

```go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

// Server represents a service with background workers
type Server struct {
    ctx    context.Context
    cancel context.CancelFunc
    wg     sync.WaitGroup
}

// NewServer creates a new server instance
func NewServer() *Server {
    ctx, cancel := context.WithCancel(context.Background())
    return &Server{
        ctx:    ctx,
        cancel: cancel,
    }
}

// StartBackgroundTask launches a background task
func (s *Server) StartBackgroundTask(name string, interval time.Duration, task func()) {
    s.wg.Add(1)

    go func() {
        defer s.wg.Done()

        ticker := time.NewTicker(interval)
        defer ticker.Stop()

        fmt.Printf("Task %s: started\n", name)

        for {
            select {
            case <-s.ctx.Done():
                fmt.Printf("Task %s: shutting down\n", name)
                return
            case <-ticker.C:
                task()
            }
        }
    }()
}

// Shutdown gracefully stops all background tasks
func (s *Server) Shutdown(timeout time.Duration) error {
    fmt.Println("Server: initiating shutdown")
    s.cancel()

    done := make(chan struct{})
    go func() {
        s.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        fmt.Println("Server: all tasks stopped")
        return nil
    case <-time.After(timeout):
        return fmt.Errorf("shutdown timed out after %v", timeout)
    }
}

func main() {
    server := NewServer()

    // Start background tasks
    server.StartBackgroundTask("metrics", 200*time.Millisecond, func() {
        fmt.Println("Collecting metrics...")
    })

    server.StartBackgroundTask("healthcheck", 300*time.Millisecond, func() {
        fmt.Println("Running health check...")
    })

    // Wait for interrupt signal
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    // Run for a bit then simulate shutdown
    go func() {
        time.Sleep(time.Second)
        sigCh <- syscall.SIGINT
    }()

    <-sigCh

    if err := server.Shutdown(5 * time.Second); err != nil {
        fmt.Printf("Shutdown error: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("Server stopped gracefully")
}
```

## Real-World Example: HTTP Server with Worker Pool

This comprehensive example demonstrates a production-ready pattern that combines all the best practices:

```go
package main

import (
    "context"
    "fmt"
    "runtime"
    "sync"
    "time"
)

// Job represents a unit of work
type Job struct {
    ID      int
    Payload string
}

// Result represents the outcome of processing a job
type Result struct {
    JobID  int
    Output string
    Error  error
}

// WorkerPool manages a pool of workers with proper lifecycle management
type WorkerPool struct {
    numWorkers int
    jobs       chan Job
    results    chan Result
    ctx        context.Context
    cancel     context.CancelFunc
    wg         sync.WaitGroup
}

// NewWorkerPool creates a new worker pool
func NewWorkerPool(numWorkers, jobBufferSize int) *WorkerPool {
    ctx, cancel := context.WithCancel(context.Background())

    return &WorkerPool{
        numWorkers: numWorkers,
        jobs:       make(chan Job, jobBufferSize),
        results:    make(chan Result, jobBufferSize),
        ctx:        ctx,
        cancel:     cancel,
    }
}

// Start launches all workers
func (wp *WorkerPool) Start() {
    for i := 0; i < wp.numWorkers; i++ {
        wp.wg.Add(1)
        go wp.worker(i)
    }

    fmt.Printf("Started %d workers\n", wp.numWorkers)
}

// worker processes jobs from the queue
func (wp *WorkerPool) worker(id int) {
    defer wp.wg.Done()

    for {
        select {
        case <-wp.ctx.Done():
            fmt.Printf("Worker %d: shutting down\n", id)
            return

        case job, ok := <-wp.jobs:
            if !ok {
                fmt.Printf("Worker %d: job channel closed\n", id)
                return
            }

            // Process the job
            result := wp.processJob(job)

            // Send result, respecting cancellation
            select {
            case wp.results <- result:
            case <-wp.ctx.Done():
                return
            }
        }
    }
}

// processJob simulates job processing
func (wp *WorkerPool) processJob(job Job) Result {
    // Simulate work
    time.Sleep(50 * time.Millisecond)

    return Result{
        JobID:  job.ID,
        Output: fmt.Sprintf("Processed: %s", job.Payload),
    }
}

// Submit adds a job to the queue
func (wp *WorkerPool) Submit(job Job) error {
    select {
    case wp.jobs <- job:
        return nil
    case <-wp.ctx.Done():
        return wp.ctx.Err()
    }
}

// Results returns the results channel
func (wp *WorkerPool) Results() <-chan Result {
    return wp.results
}

// Shutdown gracefully stops the worker pool
func (wp *WorkerPool) Shutdown(timeout time.Duration) error {
    // Stop accepting new jobs
    close(wp.jobs)

    // Signal workers to stop
    wp.cancel()

    // Wait for workers with timeout
    done := make(chan struct{})
    go func() {
        wp.wg.Wait()
        close(wp.results)
        close(done)
    }()

    select {
    case <-done:
        return nil
    case <-time.After(timeout):
        return fmt.Errorf("shutdown timed out")
    }
}

func main() {
    fmt.Printf("Initial goroutines: %d\n", runtime.NumGoroutine())

    // Create and start the worker pool
    pool := NewWorkerPool(5, 100)
    pool.Start()

    fmt.Printf("Goroutines after starting pool: %d\n", runtime.NumGoroutine())

    // Start result collector
    var collectedResults []Result
    var resultsMu sync.Mutex

    go func() {
        for result := range pool.Results() {
            resultsMu.Lock()
            collectedResults = append(collectedResults, result)
            resultsMu.Unlock()
        }
    }()

    // Submit jobs
    for i := 0; i < 20; i++ {
        job := Job{
            ID:      i,
            Payload: fmt.Sprintf("Job-%d", i),
        }

        if err := pool.Submit(job); err != nil {
            fmt.Printf("Failed to submit job: %v\n", err)
        }
    }

    // Wait for some processing
    time.Sleep(500 * time.Millisecond)

    // Shutdown the pool
    if err := pool.Shutdown(5 * time.Second); err != nil {
        fmt.Printf("Shutdown error: %v\n", err)
    }

    // Give collector goroutine time to finish
    time.Sleep(100 * time.Millisecond)

    resultsMu.Lock()
    fmt.Printf("Collected %d results\n", len(collectedResults))
    resultsMu.Unlock()

    fmt.Printf("Final goroutines: %d\n", runtime.NumGoroutine())
}
```

## Summary

Goroutine leaks are a common source of bugs in Go applications, but they can be prevented with proper patterns and practices:

1. **Always use context for cancellation**: Pass context as the first parameter to functions that spawn goroutines or perform blocking operations.

2. **Close channels when done**: Use `defer close(ch)` to ensure channels are closed when the sending goroutine exits.

3. **Use buffered channels appropriately**: When you know the number of sends in advance, buffer the channel to prevent blocking.

4. **Implement timeouts**: Never let operations block indefinitely. Use `context.WithTimeout` or `time.After` for all blocking operations.

5. **Monitor goroutine counts**: Use `runtime.NumGoroutine()` in production and `goleak` in tests to detect leaks early.

6. **Use defer for cleanup**: Ensure resources are released and WaitGroups are decremented using defer statements.

7. **Implement graceful shutdown**: Design your applications with a clear shutdown sequence that signals all goroutines to terminate.

By following these patterns and regularly testing for leaks, you can build robust Go applications that efficiently manage their concurrent resources.

## Additional Resources

- [Go Concurrency Patterns](https://go.dev/blog/pipelines) - Official Go blog on pipeline patterns
- [Context Package Documentation](https://pkg.go.dev/context) - Official context package docs
- [goleak Package](https://pkg.go.dev/go.uber.org/goleak) - Uber's goroutine leak detector
- [errgroup Package](https://pkg.go.dev/golang.org/x/sync/errgroup) - Synchronized goroutine error handling
