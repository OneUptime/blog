# How to Use Goroutines and Channels for Concurrent Processing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Concurrency, Goroutines, Channels, Performance, Parallel Processing

Description: Master Go concurrency with goroutines and channels, learning patterns for parallel work without race conditions including worker pools, fan-out/fan-in, and pipeline patterns.

---

Concurrency is one of Go's most powerful features, and it is built into the language from the ground up. Unlike many other languages where concurrency is an afterthought, Go was designed with concurrent programming as a first-class citizen. This guide will take you through the fundamentals of goroutines and channels, and show you battle-tested patterns for writing concurrent code that is both safe and efficient.

## Understanding Goroutines

Goroutines are lightweight threads managed by the Go runtime. They are incredibly cheap to create, with a starting stack size of only 2KB (compared to the typical 1MB for OS threads). This means you can easily spawn thousands or even millions of goroutines in a single program.

### Basic Goroutine Usage

The following example demonstrates how to launch a simple goroutine using the `go` keyword. The main function will wait briefly to allow the goroutine to complete.

```go
package main

import (
    "fmt"
    "time"
)

func sayHello(name string) {
    fmt.Printf("Hello, %s!\n", name)
}

func main() {
    // Launch a goroutine - execution continues immediately
    go sayHello("World")

    // Main goroutine continues executing
    fmt.Println("Main function continues...")

    // Wait for goroutine to complete (not ideal - we'll improve this)
    time.Sleep(100 * time.Millisecond)
}
```

### Goroutine Best Practices

When working with goroutines, there are several important practices to keep in mind:

1. **Always know when goroutines will end** - A goroutine that never terminates is a goroutine leak
2. **Pass data explicitly** - Avoid capturing loop variables by reference
3. **Use synchronization primitives** - Never rely on timing assumptions

The following example shows the common pitfall of capturing loop variables incorrectly, and how to fix it.

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup

    // WRONG: Capturing loop variable by reference
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            fmt.Println(i) // Will likely print "5" five times
        }()
    }
    wg.Wait()

    fmt.Println("---")

    // CORRECT: Pass the value as a parameter
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            fmt.Println(n) // Prints 0-4 in some order
        }(i)
    }
    wg.Wait()
}
```

## Channels: The Communication Mechanism

Channels are Go's way of allowing goroutines to communicate with each other safely. They follow the principle: "Do not communicate by sharing memory; instead, share memory by communicating."

### Unbuffered Channels

Unbuffered channels provide synchronous communication. The sender blocks until a receiver is ready, and vice versa. This creates a natural synchronization point between goroutines.

```go
package main

import "fmt"

func main() {
    // Create an unbuffered channel
    ch := make(chan string)

    // Start a goroutine that sends a message
    go func() {
        ch <- "Hello from goroutine!" // Blocks until received
    }()

    // Receive the message (blocks until sent)
    message := <-ch
    fmt.Println(message)
}
```

### Buffered Channels

Buffered channels allow sending without blocking until the buffer is full. They are useful when you want to decouple the sender and receiver timing.

```go
package main

import "fmt"

func main() {
    // Create a buffered channel with capacity 3
    ch := make(chan int, 3)

    // These sends don't block because buffer has space
    ch <- 1
    ch <- 2
    ch <- 3

    // This would block: ch <- 4

    // Receive values
    fmt.Println(<-ch) // 1
    fmt.Println(<-ch) // 2
    fmt.Println(<-ch) // 3
}
```

### Directional Channels

Go allows you to restrict channel direction in function signatures, making your intent clear and preventing misuse at compile time.

```go
package main

import "fmt"

// sendOnly can only send to the channel
func sendOnly(ch chan<- int) {
    ch <- 42
    // <-ch // This would cause a compile error
}

// receiveOnly can only receive from the channel
func receiveOnly(ch <-chan int) {
    value := <-ch
    fmt.Println("Received:", value)
    // ch <- 1 // This would cause a compile error
}

func main() {
    ch := make(chan int)

    go sendOnly(ch)
    receiveOnly(ch)
}
```

### Closing Channels

Closing a channel signals that no more values will be sent. Receivers can detect this and handle it appropriately using the two-value receive form or range loops.

```go
package main

import "fmt"

func main() {
    ch := make(chan int, 5)

    // Send some values and close the channel
    go func() {
        for i := 1; i <= 5; i++ {
            ch <- i
        }
        close(ch) // Signal that we're done sending
    }()

    // Method 1: Check if channel is closed
    for {
        value, ok := <-ch
        if !ok {
            fmt.Println("Channel closed!")
            break
        }
        fmt.Println("Received:", value)
    }

    // Method 2: Range over channel (preferred)
    ch2 := make(chan int, 5)
    go func() {
        for i := 1; i <= 5; i++ {
            ch2 <- i
        }
        close(ch2)
    }()

    for value := range ch2 {
        fmt.Println("Range received:", value)
    }
}
```

## The Select Statement

The `select` statement lets a goroutine wait on multiple channel operations simultaneously. It is like a switch statement for channels and is essential for building complex concurrent systems.

### Basic Select Usage

This example shows how to wait for multiple channels and handle whichever one is ready first.

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(100 * time.Millisecond)
        ch1 <- "from channel 1"
    }()

    go func() {
        time.Sleep(200 * time.Millisecond)
        ch2 <- "from channel 2"
    }()

    // Wait for both messages
    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println("Received", msg1)
        case msg2 := <-ch2:
            fmt.Println("Received", msg2)
        }
    }
}
```

### Non-Blocking Operations with Default

Adding a `default` case makes the select non-blocking, which is useful for polling or trying to send without waiting.

```go
package main

import "fmt"

func main() {
    ch := make(chan int, 1)

    // Non-blocking send
    select {
    case ch <- 42:
        fmt.Println("Sent value")
    default:
        fmt.Println("Channel full, skipping")
    }

    // Non-blocking receive
    select {
    case value := <-ch:
        fmt.Println("Received:", value)
    default:
        fmt.Println("No value available")
    }
}
```

## Common Concurrency Patterns

Now let us explore the most important patterns that you will use in production Go code.

### Pattern 1: Worker Pool

The worker pool pattern limits the number of concurrent workers processing jobs. This is essential for controlling resource usage when processing many tasks.

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Job represents work to be done
type Job struct {
    ID   int
    Data string
}

// Result represents the outcome of processing a job
type Result struct {
    JobID  int
    Output string
}

// worker processes jobs from the jobs channel and sends results
func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()

    for job := range jobs {
        // Simulate work
        time.Sleep(100 * time.Millisecond)

        result := Result{
            JobID:  job.ID,
            Output: fmt.Sprintf("Worker %d processed: %s", id, job.Data),
        }
        results <- result
    }
}

func main() {
    const numWorkers = 3
    const numJobs = 10

    jobs := make(chan Job, numJobs)
    results := make(chan Result, numJobs)

    // Start worker pool
    var wg sync.WaitGroup
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // Send jobs
    for j := 1; j <= numJobs; j++ {
        jobs <- Job{ID: j, Data: fmt.Sprintf("job-%d", j)}
    }
    close(jobs) // Signal no more jobs

    // Wait for workers and close results
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results
    for result := range results {
        fmt.Println(result.Output)
    }
}
```

### Pattern 2: Fan-Out/Fan-In

Fan-out distributes work across multiple goroutines, while fan-in collects results from multiple sources into a single channel. This pattern maximizes parallelism.

```go
package main

import (
    "fmt"
    "sync"
)

// producer generates numbers and sends them to the output channel
func producer(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

// square reads numbers, squares them, and sends results
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

// fanIn merges multiple channels into a single channel
func fanIn(channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    merged := make(chan int)

    // Start a goroutine for each input channel
    output := func(ch <-chan int) {
        defer wg.Done()
        for value := range ch {
            merged <- value
        }
    }

    wg.Add(len(channels))
    for _, ch := range channels {
        go output(ch)
    }

    // Close merged channel when all inputs are done
    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}

func main() {
    // Create producer
    numbers := producer(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    // Fan-out: distribute work to multiple squarers
    sq1 := square(numbers)
    sq2 := square(numbers)
    sq3 := square(numbers)

    // Fan-in: merge results
    results := fanIn(sq1, sq2, sq3)

    // Consume results
    for result := range results {
        fmt.Println(result)
    }
}
```

### Pattern 3: Pipeline

Pipelines connect stages of processing where the output of one stage becomes the input of the next. Each stage runs in its own goroutine, enabling concurrent processing.

```go
package main

import (
    "fmt"
    "strings"
)

// Stage 1: Generate strings
func generate(strings ...string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for _, s := range strings {
            out <- s
        }
    }()
    return out
}

// Stage 2: Convert to uppercase
func toUpper(in <-chan string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for s := range in {
            out <- strings.ToUpper(s)
        }
    }()
    return out
}

// Stage 3: Add prefix
func addPrefix(in <-chan string, prefix string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for s := range in {
            out <- prefix + s
        }
    }()
    return out
}

// Stage 4: Add suffix
func addSuffix(in <-chan string, suffix string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for s := range in {
            out <- s + suffix
        }
    }()
    return out
}

func main() {
    // Build the pipeline: generate -> uppercase -> prefix -> suffix
    stage1 := generate("hello", "world", "go", "concurrency")
    stage2 := toUpper(stage1)
    stage3 := addPrefix(stage2, "[INFO] ")
    stage4 := addSuffix(stage3, " - processed")

    // Consume the final output
    for result := range stage4 {
        fmt.Println(result)
    }
}
```

### Pattern 4: Semaphore for Limiting Concurrency

When you need to limit the number of concurrent operations without a full worker pool, a semaphore pattern using a buffered channel is elegant and effective.

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Semaphore limits concurrent access to a resource
type Semaphore struct {
    ch chan struct{}
}

// NewSemaphore creates a semaphore with the given capacity
func NewSemaphore(max int) *Semaphore {
    return &Semaphore{
        ch: make(chan struct{}, max),
    }
}

// Acquire blocks until a slot is available
func (s *Semaphore) Acquire() {
    s.ch <- struct{}{}
}

// Release frees a slot
func (s *Semaphore) Release() {
    <-s.ch
}

func main() {
    // Allow only 3 concurrent operations
    sem := NewSemaphore(3)
    var wg sync.WaitGroup

    for i := 1; i <= 10; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()

            sem.Acquire()
            defer sem.Release()

            fmt.Printf("Task %d starting\n", id)
            time.Sleep(500 * time.Millisecond)
            fmt.Printf("Task %d completed\n", id)
        }(i)
    }

    wg.Wait()
    fmt.Println("All tasks completed")
}
```

## Context for Cancellation and Timeouts

The `context` package is essential for managing goroutine lifecycles, especially for cancellation, timeouts, and passing request-scoped values.

### Cancellation with Context

Context cancellation allows you to gracefully stop goroutines when they are no longer needed.

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// worker simulates a long-running task that respects cancellation
func worker(ctx context.Context, id int, results chan<- string) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("Worker %d: cancelled (%v)\n", id, ctx.Err())
            return
        default:
            // Simulate work
            time.Sleep(200 * time.Millisecond)
            select {
            case results <- fmt.Sprintf("Worker %d: result", id):
            case <-ctx.Done():
                return
            }
        }
    }
}

func main() {
    // Create a cancellable context
    ctx, cancel := context.WithCancel(context.Background())
    results := make(chan string)

    // Start workers
    for i := 1; i <= 3; i++ {
        go worker(ctx, i, results)
    }

    // Collect some results
    for i := 0; i < 5; i++ {
        fmt.Println(<-results)
    }

    // Cancel all workers
    fmt.Println("Cancelling workers...")
    cancel()

    // Give workers time to clean up
    time.Sleep(300 * time.Millisecond)
    fmt.Println("Done")
}
```

### Timeouts with Context

Context timeouts automatically cancel operations that take too long.

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// slowOperation simulates an operation that might take too long
func slowOperation(ctx context.Context) (string, error) {
    // Simulate work that takes 2 seconds
    select {
    case <-time.After(2 * time.Second):
        return "Operation completed", nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}

func main() {
    // Create context with 1 second timeout
    ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
    defer cancel() // Always call cancel to release resources

    result, err := slowOperation(ctx)
    if err != nil {
        fmt.Println("Operation failed:", err)
    } else {
        fmt.Println("Result:", result)
    }

    // Create context with 3 second timeout (operation will complete)
    ctx2, cancel2 := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel2()

    result2, err := slowOperation(ctx2)
    if err != nil {
        fmt.Println("Operation 2 failed:", err)
    } else {
        fmt.Println("Result 2:", result2)
    }
}
```

### Deadline with Context

Deadlines are similar to timeouts but specify an absolute time rather than a duration.

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func processRequest(ctx context.Context) error {
    deadline, ok := ctx.Deadline()
    if ok {
        fmt.Printf("Request has deadline: %v\n", deadline)
    }

    select {
    case <-time.After(500 * time.Millisecond):
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func main() {
    // Set deadline to 1 second from now
    deadline := time.Now().Add(1 * time.Second)
    ctx, cancel := context.WithDeadline(context.Background(), deadline)
    defer cancel()

    if err := processRequest(ctx); err != nil {
        fmt.Println("Request failed:", err)
    } else {
        fmt.Println("Request succeeded")
    }
}
```

## Race Condition Prevention with sync Package

While channels are the preferred way to share data, sometimes you need traditional synchronization primitives from the `sync` package.

### Mutex for Shared State

Use `sync.Mutex` when multiple goroutines need to access and modify the same data structure.

```go
package main

import (
    "fmt"
    "sync"
)

// SafeCounter is a thread-safe counter
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

// Increment safely increases the counter
func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

// Value safely returns the current count
func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}

func main() {
    counter := &SafeCounter{}
    var wg sync.WaitGroup

    // Increment counter from 1000 goroutines
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter.Increment()
        }()
    }

    wg.Wait()
    fmt.Println("Final count:", counter.Value()) // Always 1000
}
```

### RWMutex for Read-Heavy Workloads

`sync.RWMutex` allows multiple readers but only one writer, which is more efficient when reads are more common than writes.

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// Cache is a thread-safe cache with RWMutex
type Cache struct {
    mu   sync.RWMutex
    data map[string]string
}

// NewCache creates a new cache
func NewCache() *Cache {
    return &Cache{
        data: make(map[string]string),
    }
}

// Get reads a value (allows concurrent reads)
func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    value, ok := c.data[key]
    return value, ok
}

// Set writes a value (exclusive access)
func (c *Cache) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data[key] = value
}

func main() {
    cache := NewCache()
    var wg sync.WaitGroup

    // Writer goroutine
    wg.Add(1)
    go func() {
        defer wg.Done()
        for i := 0; i < 10; i++ {
            cache.Set(fmt.Sprintf("key%d", i), fmt.Sprintf("value%d", i))
            time.Sleep(10 * time.Millisecond)
        }
    }()

    // Multiple reader goroutines
    for r := 0; r < 5; r++ {
        wg.Add(1)
        go func(reader int) {
            defer wg.Done()
            for i := 0; i < 20; i++ {
                key := fmt.Sprintf("key%d", i%10)
                if value, ok := cache.Get(key); ok {
                    fmt.Printf("Reader %d: %s = %s\n", reader, key, value)
                }
                time.Sleep(5 * time.Millisecond)
            }
        }(r)
    }

    wg.Wait()
}
```

### Once for One-Time Initialization

`sync.Once` ensures a function is executed only once, even when called from multiple goroutines. This is perfect for lazy initialization.

```go
package main

import (
    "fmt"
    "sync"
)

type Database struct {
    connection string
}

var (
    dbInstance *Database
    dbOnce     sync.Once
)

// GetDatabase returns the singleton database instance
func GetDatabase() *Database {
    dbOnce.Do(func() {
        fmt.Println("Initializing database connection...")
        dbInstance = &Database{
            connection: "postgresql://localhost:5432/mydb",
        }
    })
    return dbInstance
}

func main() {
    var wg sync.WaitGroup

    // Multiple goroutines trying to get database
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            db := GetDatabase()
            fmt.Printf("Goroutine %d got database: %p\n", id, db)
        }(i)
    }

    wg.Wait()
}
```

### Atomic Operations for Simple Counters

For simple numeric operations, the `sync/atomic` package provides lock-free operations that are faster than mutexes.

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

func main() {
    var counter int64 = 0
    var wg sync.WaitGroup

    // Increment counter from 1000 goroutines
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            atomic.AddInt64(&counter, 1)
        }()
    }

    wg.Wait()
    fmt.Println("Final count:", atomic.LoadInt64(&counter))

    // Compare and swap operation
    var value int64 = 100
    swapped := atomic.CompareAndSwapInt64(&value, 100, 200)
    fmt.Printf("Swapped: %v, New value: %d\n", swapped, value)
}
```

## Error Handling in Concurrent Code

Proper error handling in concurrent code requires careful design. Here is a pattern for collecting errors from multiple goroutines.

```go
package main

import (
    "errors"
    "fmt"
    "sync"
)

// Result wraps a value and potential error
type Result struct {
    Value int
    Err   error
}

// process simulates work that might fail
func process(id int) Result {
    if id%3 == 0 {
        return Result{Err: fmt.Errorf("task %d failed", id)}
    }
    return Result{Value: id * 10}
}

func main() {
    const numTasks = 10
    results := make(chan Result, numTasks)
    var wg sync.WaitGroup

    // Launch workers
    for i := 1; i <= numTasks; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            results <- process(id)
        }(i)
    }

    // Close results when all workers done
    go func() {
        wg.Wait()
        close(results)
    }()

    // Collect results and errors
    var errs []error
    var successCount int

    for result := range results {
        if result.Err != nil {
            errs = append(errs, result.Err)
        } else {
            successCount++
            fmt.Println("Success:", result.Value)
        }
    }

    if len(errs) > 0 {
        fmt.Printf("\n%d tasks failed:\n", len(errs))
        for _, err := range errs {
            fmt.Println(" -", err)
        }
    }
    fmt.Printf("\n%d tasks succeeded\n", successCount)
}
```

## Using errgroup for Coordinated Error Handling

The `golang.org/x/sync/errgroup` package provides a convenient way to run goroutines and collect the first error.

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "time"

    "golang.org/x/sync/errgroup"
)

func fetchData(ctx context.Context, source string) error {
    // Simulate fetching data
    select {
    case <-time.After(100 * time.Millisecond):
        if source == "source3" {
            return errors.New("failed to fetch from source3")
        }
        fmt.Printf("Fetched data from %s\n", source)
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func main() {
    // Create errgroup with context
    g, ctx := errgroup.WithContext(context.Background())

    sources := []string{"source1", "source2", "source3", "source4"}

    for _, source := range sources {
        source := source // Capture loop variable
        g.Go(func() error {
            return fetchData(ctx, source)
        })
    }

    // Wait for all goroutines and get first error
    if err := g.Wait(); err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("All fetches completed successfully")
    }
}
```

## Rate Limiting with Channels

Rate limiting is essential for controlling the speed of operations, especially when interacting with external APIs.

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // Simple rate limiter: 1 request per 200ms
    requests := make(chan int, 5)
    for i := 1; i <= 5; i++ {
        requests <- i
    }
    close(requests)

    // Create a rate limiter using a ticker
    limiter := time.NewTicker(200 * time.Millisecond)
    defer limiter.Stop()

    for req := range requests {
        <-limiter.C // Wait for next tick
        fmt.Printf("Request %d processed at %s\n", req, time.Now().Format("15:04:05.000"))
    }

    fmt.Println("\n--- Burst Rate Limiter ---")

    // Burst rate limiter: allows bursts up to 3, then 1 per 200ms
    burstyLimiter := make(chan time.Time, 3)

    // Fill the burst buffer
    for i := 0; i < 3; i++ {
        burstyLimiter <- time.Now()
    }

    // Refill at steady rate
    go func() {
        for t := range time.NewTicker(200 * time.Millisecond).C {
            burstyLimiter <- t
        }
    }()

    // Make 5 requests
    burstyRequests := make(chan int, 5)
    for i := 1; i <= 5; i++ {
        burstyRequests <- i
    }
    close(burstyRequests)

    for req := range burstyRequests {
        <-burstyLimiter
        fmt.Printf("Bursty request %d at %s\n", req, time.Now().Format("15:04:05.000"))
    }
}
```

## Graceful Shutdown Pattern

Graceful shutdown ensures all goroutines complete their work before the program exits.

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

// Worker represents a background worker
type Worker struct {
    id     int
    ctx    context.Context
    cancel context.CancelFunc
    wg     *sync.WaitGroup
}

// Start begins the worker's processing loop
func (w *Worker) Start() {
    defer w.wg.Done()

    for {
        select {
        case <-w.ctx.Done():
            fmt.Printf("Worker %d: shutting down\n", w.id)
            // Perform cleanup
            time.Sleep(100 * time.Millisecond)
            fmt.Printf("Worker %d: cleanup complete\n", w.id)
            return
        default:
            // Do work
            fmt.Printf("Worker %d: processing\n", w.id)
            time.Sleep(500 * time.Millisecond)
        }
    }
}

func main() {
    // Create root context with cancellation
    ctx, cancel := context.WithCancel(context.Background())
    var wg sync.WaitGroup

    // Start workers
    workers := make([]*Worker, 3)
    for i := 0; i < 3; i++ {
        wg.Add(1)
        workers[i] = &Worker{
            id:     i + 1,
            ctx:    ctx,
            cancel: cancel,
            wg:     &wg,
        }
        go workers[i].Start()
    }

    // Listen for shutdown signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    // Wait for signal or timeout (for demo purposes)
    select {
    case sig := <-sigChan:
        fmt.Printf("\nReceived signal: %v\n", sig)
    case <-time.After(2 * time.Second):
        fmt.Println("\nDemo timeout reached")
    }

    // Initiate graceful shutdown
    fmt.Println("Initiating graceful shutdown...")
    cancel()

    // Wait for all workers with timeout
    done := make(chan struct{})
    go func() {
        wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        fmt.Println("All workers stopped gracefully")
    case <-time.After(5 * time.Second):
        fmt.Println("Shutdown timed out")
    }
}
```

## Best Practices Summary

When working with Go concurrency, keep these principles in mind:

1. **Prefer channels over shared memory** - Channels make data flow explicit and prevent many race conditions

2. **Start goroutines with clear ownership** - Always know who is responsible for stopping a goroutine

3. **Use context for cancellation** - Context propagates cancellation signals through your call stack

4. **Close channels from the sender side** - Never close a channel from the receiver

5. **Use buffered channels judiciously** - Unbuffered channels provide stronger synchronization guarantees

6. **Run the race detector** - Use `go run -race` or `go test -race` during development

7. **Keep critical sections small** - Lock for the minimum time necessary

8. **Avoid goroutine leaks** - Every goroutine must have a way to terminate

9. **Handle errors properly** - Do not ignore errors from goroutines

10. **Test concurrent code thoroughly** - Use the `-count` flag to run tests multiple times

## Conclusion

Go's concurrency primitives provide powerful building blocks for writing parallel programs. Goroutines are cheap and easy to create, channels provide safe communication, and the select statement enables sophisticated coordination between concurrent operations.

By mastering these patterns - worker pools, fan-out/fan-in, pipelines, and proper synchronization with the sync package - you can build robust, efficient concurrent systems. Always remember to use context for cancellation, handle errors properly, and test your concurrent code with the race detector.

The key to successful concurrent programming in Go is to embrace the language's philosophy: share memory by communicating, not the other way around. This leads to code that is easier to reason about, test, and maintain.
