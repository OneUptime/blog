# Go Channel Patterns: A Complete Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Channels, Concurrency, Patterns, Goroutines

Description: Master Go channel patterns including fan-out/fan-in, pipelines, cancellation, timeouts, and common concurrent programming idioms.

---

Channels are Go's primary mechanism for goroutine communication. This guide covers essential channel patterns for building robust concurrent programs.

---

## Channel Basics

```go
package main

import "fmt"

func main() {
    // Unbuffered channel - blocks until received
    ch := make(chan int)
    
    go func() {
        ch <- 42  // Send
    }()
    
    value := <-ch  // Receive
    fmt.Println(value)
    
    // Buffered channel - blocks when full
    buffered := make(chan int, 3)
    buffered <- 1
    buffered <- 2
    buffered <- 3
    // buffered <- 4  // Would block - buffer full
}
```

---

## Pattern 1: Generator

Generate values on demand:

```go
func integers() <-chan int {
    ch := make(chan int)
    go func() {
        for i := 0; ; i++ {
            ch <- i
        }
    }()
    return ch
}

func main() {
    ints := integers()
    fmt.Println(<-ints)  // 0
    fmt.Println(<-ints)  // 1
    fmt.Println(<-ints)  // 2
}
```

With cancellation:

```go
func integers(ctx context.Context) <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch)
        for i := 0; ; i++ {
            select {
            case <-ctx.Done():
                return
            case ch <- i:
            }
        }
    }()
    return ch
}
```

---

## Pattern 2: Fan-Out

Distribute work across multiple goroutines:

```go
func fanOut(input <-chan int, workers int) []<-chan int {
    outputs := make([]<-chan int, workers)
    
    for i := 0; i < workers; i++ {
        outputs[i] = worker(input)
    }
    return outputs
}

func worker(input <-chan int) <-chan int {
    output := make(chan int)
    go func() {
        defer close(output)
        for n := range input {
            output <- process(n)
        }
    }()
    return output
}

func process(n int) int {
    time.Sleep(100 * time.Millisecond)  // Simulate work
    return n * 2
}
```

---

## Pattern 3: Fan-In

Merge multiple channels into one:

```go
func fanIn(inputs ...<-chan int) <-chan int {
    output := make(chan int)
    var wg sync.WaitGroup
    
    for _, ch := range inputs {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                output <- v
            }
        }(ch)
    }
    
    go func() {
        wg.Wait()
        close(output)
    }()
    
    return output
}

func main() {
    ch1 := make(chan int)
    ch2 := make(chan int)
    
    go func() {
        ch1 <- 1
        ch1 <- 2
        close(ch1)
    }()
    
    go func() {
        ch2 <- 10
        ch2 <- 20
        close(ch2)
    }()
    
    merged := fanIn(ch1, ch2)
    for v := range merged {
        fmt.Println(v)  // 1, 2, 10, 20 (order may vary)
    }
}
```

---

## Pattern 4: Pipeline

Chain processing stages:

```go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

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

func filter(in <-chan int, predicate func(int) bool) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if predicate(n) {
                out <- n
            }
        }
    }()
    return out
}

func main() {
    // Pipeline: generate -> square -> filter (> 10)
    nums := generate(1, 2, 3, 4, 5)
    squared := square(nums)
    filtered := filter(squared, func(n int) bool { return n > 10 })
    
    for n := range filtered {
        fmt.Println(n)  // 16, 25
    }
}
```

---

## Pattern 5: Or-Done Channel

Read from channel with cancellation:

```go
func orDone(ctx context.Context, c <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for {
            select {
            case <-ctx.Done():
                return
            case v, ok := <-c:
                if !ok {
                    return
                }
                select {
                case out <- v:
                case <-ctx.Done():
                    return
                }
            }
        }
    }()
    return out
}
```

---

## Pattern 6: Tee Channel

Split channel into two:

```go
func tee(ctx context.Context, in <-chan int) (<-chan int, <-chan int) {
    out1 := make(chan int)
    out2 := make(chan int)
    
    go func() {
        defer close(out1)
        defer close(out2)
        
        for val := range orDone(ctx, in) {
            // Send to both, handling blocking
            var out1, out2 = out1, out2
            for i := 0; i < 2; i++ {
                select {
                case out1 <- val:
                    out1 = nil  // Disable after send
                case out2 <- val:
                    out2 = nil
                case <-ctx.Done():
                    return
                }
            }
        }
    }()
    
    return out1, out2
}
```

---

## Pattern 7: First Result

Return first successful result:

```go
func first(ctx context.Context, fns ...func() (int, error)) (int, error) {
    results := make(chan int, len(fns))
    errs := make(chan error, len(fns))
    
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()
    
    for _, fn := range fns {
        go func(f func() (int, error)) {
            result, err := f()
            if err != nil {
                errs <- err
                return
            }
            results <- result
        }(fn)
    }
    
    select {
    case result := <-results:
        return result, nil
    case <-ctx.Done():
        return 0, ctx.Err()
    }
}
```

---

## Pattern 8: Semaphore

Limit concurrent operations:

```go
type Semaphore chan struct{}

func NewSemaphore(max int) Semaphore {
    return make(Semaphore, max)
}

func (s Semaphore) Acquire() {
    s <- struct{}{}
}

func (s Semaphore) Release() {
    <-s
}

func main() {
    sem := NewSemaphore(3)  // Max 3 concurrent
    
    var wg sync.WaitGroup
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            sem.Acquire()
            defer sem.Release()
            
            fmt.Printf("Worker %d running\n", id)
            time.Sleep(time.Second)
        }(i)
    }
    wg.Wait()
}
```

---

## Pattern 9: Timeout

Handle operation timeout:

```go
func doWithTimeout(timeout time.Duration) (string, error) {
    result := make(chan string, 1)
    
    go func() {
        // Simulate work
        time.Sleep(2 * time.Second)
        result <- "success"
    }()
    
    select {
    case r := <-result:
        return r, nil
    case <-time.After(timeout):
        return "", fmt.Errorf("timeout after %v", timeout)
    }
}

func main() {
    result, err := doWithTimeout(1 * time.Second)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    fmt.Println("Result:", result)
}
```

---

## Pattern 10: Heartbeat

Monitor goroutine health:

```go
func worker(ctx context.Context, heartbeat chan<- struct{}) {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            select {
            case heartbeat <- struct{}{}:
            default:
                // Don't block if no one is listening
            }
        default:
            // Do work
            doWork()
        }
    }
}

func monitor(ctx context.Context, heartbeat <-chan struct{}, timeout time.Duration) {
    for {
        select {
        case <-ctx.Done():
            return
        case <-heartbeat:
            // Worker is alive
        case <-time.After(timeout):
            fmt.Println("Worker appears dead!")
        }
    }
}
```

---

## Pattern 11: Rate Limiter

Control operation rate:

```go
func rateLimiter(ctx context.Context, rate time.Duration) <-chan struct{} {
    tick := make(chan struct{})
    
    go func() {
        defer close(tick)
        ticker := time.NewTicker(rate)
        defer ticker.Stop()
        
        for {
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
                select {
                case tick <- struct{}{}:
                case <-ctx.Done():
                    return
                }
            }
        }
    }()
    
    return tick
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    limiter := rateLimiter(ctx, 200*time.Millisecond)
    
    for range limiter {
        fmt.Println("tick at", time.Now())
    }
}
```

---

## Channel Direction

Declare channel direction for safety:

```go
// Send-only channel
func producer(out chan<- int) {
    out <- 42
    // <-out  // Compile error!
}

// Receive-only channel  
func consumer(in <-chan int) {
    value := <-in
    // in <- 1  // Compile error!
}

func main() {
    ch := make(chan int)
    go producer(ch)
    consumer(ch)
}
```

---

## Summary

| Pattern | Use Case |
|---------|----------|
| Generator | Produce values on demand |
| Fan-Out | Distribute work to workers |
| Fan-In | Merge multiple sources |
| Pipeline | Chain processing stages |
| Or-Done | Read with cancellation |
| Tee | Duplicate stream |
| First | Race for first result |
| Semaphore | Limit concurrency |
| Timeout | Time-bound operations |
| Heartbeat | Health monitoring |
| Rate Limiter | Control throughput |

**Best Practices:**

1. Always close channels from the sender side
2. Use context for cancellation
3. Specify channel direction in function signatures
4. Use buffered channels when you know the capacity
5. Check for closed channels with `v, ok := <-ch`
6. Avoid goroutine leaks - always provide exit paths

---

*Building concurrent Go applications? [OneUptime](https://oneuptime.com) helps you monitor goroutine behavior and channel throughput in production.*
