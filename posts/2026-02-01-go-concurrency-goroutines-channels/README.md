# How to Implement Concurrency with Goroutines and Channels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Concurrency, Goroutines, Channels, Parallel Programming, Performance

Description: A practical guide to writing concurrent Go programs using goroutines, channels, and synchronization primitives.

---

Go was designed with concurrency as a first-class citizen. Unlike many languages where concurrency requires complex threading libraries, Go provides goroutines and channels as built-in language features. This makes writing concurrent code straightforward and less error-prone.

## What Are Goroutines?

A goroutine is a lightweight thread managed by the Go runtime. They are much cheaper than OS threads - you can spawn thousands of goroutines without significant overhead. A single goroutine starts with only 2KB of stack space and grows as needed.

Starting a goroutine is simple - just prefix a function call with the `go` keyword:

```go
// Basic goroutine example - the function runs concurrently
package main

import (
    "fmt"
    "time"
)

func sayHello(name string) {
    fmt.Printf("Hello, %s!\n", name)
}

func main() {
    // This runs concurrently with main()
    go sayHello("World")
    
    // Without this sleep, main() would exit before the goroutine finishes
    time.Sleep(100 * time.Millisecond)
}
```

The problem with the above code is that we are using `time.Sleep` to wait for the goroutine. This is unreliable - we do not know how long the goroutine will take. This is where channels come in.

## How Channels Work

Channels are typed conduits through which goroutines communicate. They allow you to send and receive values between goroutines safely.

```go
// Creating and using a basic channel
package main

import "fmt"

func main() {
    // Create an unbuffered channel of strings
    messages := make(chan string)
    
    // Send a value in a goroutine
    go func() {
        messages <- "ping" // Send "ping" to the channel
    }()
    
    // Receive the value (this blocks until a value is available)
    msg := <-messages
    fmt.Println(msg) // Output: ping
}
```

The `<-` operator is used for both sending and receiving. When the arrow points into the channel (`channel <- value`), you are sending. When it points away (`value := <-channel`), you are receiving.

## Unbuffered vs Buffered Channels

Unbuffered channels block the sender until the receiver is ready, and vice versa. This provides synchronization between goroutines.

```go
// Unbuffered channel - sender blocks until receiver is ready
ch := make(chan int) // Unbuffered

go func() {
    ch <- 42 // This blocks until someone receives
}()

value := <-ch // This unblocks the sender
```

Buffered channels have a capacity. Sends only block when the buffer is full, and receives only block when the buffer is empty.

```go
// Buffered channel with capacity 3
package main

import "fmt"

func main() {
    ch := make(chan int, 3) // Buffer size of 3
    
    // These do not block because the buffer has space
    ch <- 1
    ch <- 2
    ch <- 3
    
    // ch <- 4 would block here because buffer is full
    
    fmt.Println(<-ch) // 1
    fmt.Println(<-ch) // 2
    fmt.Println(<-ch) // 3
}
```

Use buffered channels when you want to decouple the sender and receiver, or when you know the exact number of values that will be sent.

## Closing Channels

You can close a channel to signal that no more values will be sent. Receivers can check if a channel is closed:

```go
// Closing channels and checking for closed state
package main

import "fmt"

func main() {
    ch := make(chan int, 3)
    ch <- 1
    ch <- 2
    ch <- 3
    close(ch) // Signal no more values
    
    // Range over channel until it is closed
    for value := range ch {
        fmt.Println(value)
    }
    
    // Alternative: check if channel is closed
    value, ok := <-ch
    if !ok {
        fmt.Println("Channel is closed")
    }
}
```

Important: Only the sender should close a channel, never the receiver. Sending on a closed channel causes a panic.

## The Select Statement

The `select` statement lets a goroutine wait on multiple channel operations. It is like a switch statement but for channels.

```go
// Using select to handle multiple channels
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
    
    // Wait for either channel to have a value
    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println(msg1)
        case msg2 := <-ch2:
            fmt.Println(msg2)
        }
    }
}
```

You can add a `default` case to make the select non-blocking:

```go
// Non-blocking select with default
select {
case msg := <-ch:
    fmt.Println("Received:", msg)
default:
    fmt.Println("No message available")
}
```

## The sync Package - WaitGroup

When you need to wait for multiple goroutines to finish, use `sync.WaitGroup`:

```go
// Using WaitGroup to wait for goroutines to complete
package main

import (
    "fmt"
    "sync"
)

func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done() // Decrement counter when done
    fmt.Printf("Worker %d starting\n", id)
    // Do some work...
    fmt.Printf("Worker %d done\n", id)
}

func main() {
    var wg sync.WaitGroup
    
    for i := 1; i <= 5; i++ {
        wg.Add(1) // Increment counter
        go worker(i, &wg)
    }
    
    wg.Wait() // Block until counter is 0
    fmt.Println("All workers finished")
}
```

Always pass `WaitGroup` by pointer. Passing by value creates a copy, which defeats the purpose.

## The sync Package - Mutex

When multiple goroutines access shared memory, you need to synchronize access to prevent race conditions. Use `sync.Mutex` for this:

```go
// Using Mutex to protect shared state
package main

import (
    "fmt"
    "sync"
)

type Counter struct {
    mu    sync.Mutex
    value int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}

func (c *Counter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.value
}

func main() {
    counter := &Counter{}
    var wg sync.WaitGroup
    
    // Spawn 1000 goroutines that all increment the counter
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

Use `sync.RWMutex` when you have many readers and few writers. It allows multiple concurrent reads but exclusive writes.

## Pattern: Worker Pool

A worker pool limits concurrency by having a fixed number of workers process jobs from a queue:

```go
// Worker pool pattern - fixed number of workers processing jobs
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        time.Sleep(100 * time.Millisecond) // Simulate work
        results <- job * 2
    }
}

func main() {
    numJobs := 10
    numWorkers := 3
    
    jobs := make(chan int, numJobs)
    results := make(chan int, numJobs)
    
    var wg sync.WaitGroup
    
    // Start workers
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }
    
    // Send jobs
    for j := 1; j <= numJobs; j++ {
        jobs <- j
    }
    close(jobs) // Signal no more jobs
    
    // Wait for workers and close results
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Collect results
    for result := range results {
        fmt.Println("Result:", result)
    }
}
```

## Pattern: Fan-Out/Fan-In

Fan-out distributes work across multiple goroutines. Fan-in collects results from multiple goroutines into a single channel:

```go
// Fan-out/fan-in pattern
package main

import (
    "fmt"
    "sync"
)

// Producer generates numbers
func producer(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// Square computes the square of numbers (fan-out worker)
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

// Merge combines multiple channels into one (fan-in)
func merge(channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)
    
    // Start a goroutine for each input channel
    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            out <- n
        }
    }
    
    wg.Add(len(channels))
    for _, c := range channels {
        go output(c)
    }
    
    // Close output channel when all inputs are done
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}

func main() {
    in := producer(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    
    // Fan-out to two workers
    c1 := square(in)
    c2 := square(in)
    
    // Note: This does not work as expected because the input
    // channel is already being consumed by c1. For proper fan-out,
    // you need to distribute work explicitly or use separate input channels.
    
    // Fan-in results
    for result := range merge(c1, c2) {
        fmt.Println(result)
    }
}
```

For proper fan-out, you need to explicitly distribute work to multiple workers:

```go
// Proper fan-out with explicit distribution
func fanOut(in <-chan int, numWorkers int) []<-chan int {
    channels := make([]<-chan int, numWorkers)
    for i := 0; i < numWorkers; i++ {
        channels[i] = square(in)
    }
    return channels
}
```

## Pattern: Pipeline

A pipeline is a series of stages connected by channels, where each stage is a group of goroutines:

```go
// Pipeline pattern - chain of processing stages
package main

import "fmt"

// Stage 1: Generate numbers
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// Stage 2: Square numbers
func squareStage(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

// Stage 3: Filter - only pass even numbers
func filterEven(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            if n%2 == 0 {
                out <- n
            }
        }
        close(out)
    }()
    return out
}

func main() {
    // Build pipeline: generate -> square -> filter
    nums := generate(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    squared := squareStage(nums)
    evens := filterEven(squared)
    
    // Consume the pipeline
    for n := range evens {
        fmt.Println(n) // 4, 16, 36, 64, 100
    }
}
```

## Avoiding Race Conditions

Race conditions occur when multiple goroutines access shared data concurrently and at least one modifies it. Go provides the `-race` flag to detect races:

```bash
go run -race main.go
go test -race ./...
```

Common strategies to avoid race conditions:

1. **Use channels** - Do not communicate by sharing memory; share memory by communicating
2. **Use sync.Mutex** - Protect shared state with locks
3. **Use sync/atomic** - For simple counters and flags
4. **Avoid shared state** - Design your code to minimize shared state

```go
// Using atomic operations for simple counters
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

func main() {
    var counter int64
    var wg sync.WaitGroup
    
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            atomic.AddInt64(&counter, 1) // Atomic increment
        }()
    }
    
    wg.Wait()
    fmt.Println("Counter:", atomic.LoadInt64(&counter))
}
```

## Context for Cancellation

The `context` package provides a way to propagate cancellation signals, deadlines, and request-scoped values across goroutines:

```go
// Using context for cancellation
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
            fmt.Printf("Worker %d: cancelled\n", id)
            return
        default:
            fmt.Printf("Worker %d: working...\n", id)
            time.Sleep(500 * time.Millisecond)
        }
    }
}

func main() {
    // Create a context that cancels after 2 seconds
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel() // Always call cancel to release resources
    
    // Start workers
    for i := 1; i <= 3; i++ {
        go worker(ctx, i)
    }
    
    // Wait for context to be done
    <-ctx.Done()
    fmt.Println("Main: all workers should be cancelled")
    time.Sleep(100 * time.Millisecond) // Let workers print their cancellation message
}
```

You can also manually cancel a context:

```go
// Manual cancellation
ctx, cancel := context.WithCancel(context.Background())

go func() {
    // Do some work...
    cancel() // Signal cancellation
}()

<-ctx.Done() // Wait for cancellation
```

## Timeouts with Select

Implement timeouts using `time.After` with select:

```go
// Implementing timeouts
package main

import (
    "fmt"
    "time"
)

func main() {
    ch := make(chan string)
    
    go func() {
        time.Sleep(2 * time.Second)
        ch <- "result"
    }()
    
    select {
    case result := <-ch:
        fmt.Println("Got result:", result)
    case <-time.After(1 * time.Second):
        fmt.Println("Timeout!")
    }
}
```

## Best Practices

1. **Start goroutines with clear ownership** - Know who is responsible for stopping each goroutine
2. **Always handle channel closure** - Check if a channel is closed before reading in production code
3. **Use buffered channels sparingly** - Unbuffered channels provide stronger synchronization guarantees
4. **Pass context as the first parameter** - This is the standard Go convention
5. **Use the race detector during development** - Run tests with `-race` flag
6. **Prefer channels for communication** - Use mutexes only when channels do not fit
7. **Keep critical sections small** - Hold locks for as short as possible

## Putting It All Together

Here is a complete example that combines multiple concepts - a rate-limited API client with timeout and cancellation:

```go
// Complete example: rate-limited concurrent API requests
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

type Result struct {
    URL   string
    Data  string
    Error error
}

func fetchURL(ctx context.Context, url string) Result {
    // Simulate API call
    select {
    case <-time.After(100 * time.Millisecond):
        return Result{URL: url, Data: fmt.Sprintf("data from %s", url)}
    case <-ctx.Done():
        return Result{URL: url, Error: ctx.Err()}
    }
}

func main() {
    urls := []string{
        "https://api.example.com/1",
        "https://api.example.com/2",
        "https://api.example.com/3",
        "https://api.example.com/4",
        "https://api.example.com/5",
    }
    
    // Create context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    // Rate limiter - 2 requests per second
    rateLimiter := time.NewTicker(500 * time.Millisecond)
    defer rateLimiter.Stop()
    
    results := make(chan Result, len(urls))
    var wg sync.WaitGroup
    
    for _, url := range urls {
        <-rateLimiter.C // Wait for rate limiter
        
        wg.Add(1)
        go func(u string) {
            defer wg.Done()
            results <- fetchURL(ctx, u)
        }(url)
    }
    
    // Close results channel when all requests complete
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Collect results
    for result := range results {
        if result.Error != nil {
            fmt.Printf("Error fetching %s: %v\n", result.URL, result.Error)
        } else {
            fmt.Printf("Success: %s - %s\n", result.URL, result.Data)
        }
    }
}
```

## Conclusion

Go's concurrency model based on goroutines and channels makes it straightforward to write concurrent programs. The key principles are:

- Use goroutines for concurrent execution
- Use channels for communication between goroutines
- Use sync primitives (WaitGroup, Mutex) when channels do not fit
- Always propagate context for cancellation and timeouts
- Test with the race detector enabled

Start with simple patterns and add complexity only when needed. The Go runtime handles the hard parts of scheduling and memory management, letting you focus on your application logic.

---

*Ready to monitor your Go applications? [OneUptime](https://oneuptime.com) provides comprehensive observability for your services - including distributed tracing, metrics, and logs. Track your goroutine performance, identify bottlenecks, and ensure your concurrent code runs smoothly in production.*
