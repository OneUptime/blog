# How to Debug Deadlocks in Go Concurrency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Deadlocks, Concurrency, Goroutines, Channels, Debugging

Description: Learn to identify, prevent, and debug deadlock situations in Go concurrent programs including channel deadlocks, mutex deadlocks, and goroutine leaks.

---

Deadlocks are one of the trickiest bugs in concurrent programming. Go's runtime can detect some deadlocks, but not all. This guide teaches you to recognize deadlock patterns and fix them.

---

## What is a Deadlock?

A deadlock occurs when goroutines are waiting for each other and none can proceed:

```go
package main

func main() {
    ch := make(chan int)
    ch <- 1  // Blocks forever - no one is receiving
    
    // fatal error: all goroutines are asleep - deadlock!
}
```

---

## Common Deadlock Patterns

### Pattern 1: Unbuffered Channel with No Receiver

```go
package main

func main() {
    ch := make(chan int)  // Unbuffered channel
    
    // DEADLOCK: Send blocks, waiting for receiver
    ch <- 42
    
    // This line never executes
    fmt.Println(<-ch)
}
```

**Fix: Use goroutine or buffered channel**

```go
// Solution 1: Use goroutine
func main() {
    ch := make(chan int)
    
    go func() {
        ch <- 42  // Send in goroutine
    }()
    
    fmt.Println(<-ch)  // Receive in main
}

// Solution 2: Buffered channel
func main() {
    ch := make(chan int, 1)  // Buffer size 1
    ch <- 42
    fmt.Println(<-ch)
}
```

### Pattern 2: Reading from Channel That's Never Written

```go
package main

func main() {
    ch := make(chan int)
    
    // DEADLOCK: Waiting for value that never comes
    value := <-ch
    fmt.Println(value)
}
```

**Fix: Close channel or ensure writer**

```go
func main() {
    ch := make(chan int)
    
    go func() {
        ch <- 42
        close(ch)
    }()
    
    // Now this works
    for value := range ch {
        fmt.Println(value)
    }
}
```

### Pattern 3: Mutex Lock Ordering

```go
package main

import "sync"

var mu1, mu2 sync.Mutex

func routine1() {
    mu1.Lock()
    defer mu1.Unlock()
    
    // Simulate work
    mu2.Lock()  // Waits for mu2
    defer mu2.Unlock()
}

func routine2() {
    mu2.Lock()
    defer mu2.Unlock()
    
    // Simulate work
    mu1.Lock()  // Waits for mu1 - DEADLOCK!
    defer mu1.Unlock()
}

func main() {
    go routine1()
    go routine2()
    
    select {}  // Wait forever
}
```

**Fix: Consistent lock ordering**

```go
func routine1() {
    mu1.Lock()
    mu2.Lock()
    // work
    mu2.Unlock()
    mu1.Unlock()
}

func routine2() {
    mu1.Lock()  // Same order as routine1
    mu2.Lock()
    // work
    mu2.Unlock()
    mu1.Unlock()
}
```

### Pattern 4: Self-Deadlock

```go
package main

import "sync"

var mu sync.Mutex

func doSomething() {
    mu.Lock()
    defer mu.Unlock()
    
    // DEADLOCK: Trying to lock again
    doSomethingElse()
}

func doSomethingElse() {
    mu.Lock()  // Already locked by caller!
    defer mu.Unlock()
}
```

**Fix: Use RWMutex or restructure code**

```go
// Solution 1: Don't lock in nested function
func doSomething() {
    mu.Lock()
    defer mu.Unlock()
    
    doSomethingElseUnlocked()  // Rename to indicate no lock needed
}

func doSomethingElseUnlocked() {
    // Assumes caller holds lock
}

// Solution 2: Lock at highest level only
func doSomething() {
    mu.Lock()
    defer mu.Unlock()
    // All work here, no nested lock calls
}
```

---

## Detecting Deadlocks

### Go Runtime Detection

Go detects when ALL goroutines are blocked:

```
fatal error: all goroutines are asleep - deadlock!
```

But it won't detect if just some goroutines are deadlocked while others run.

### Using -race Flag

```bash
go run -race main.go
go test -race ./...
```

### Deadlock Detection with pprof

```go
package main

import (
    "net/http"
    _ "net/http/pprof"
)

func main() {
    // Start pprof server
    go func() {
        http.ListenAndServe(":6060", nil)
    }()
    
    // Your application code
}
```

Then analyze:

```bash
# View goroutine stacks
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Dump all goroutines
curl http://localhost:6060/debug/pprof/goroutine?debug=2
```

---

## Prevention Strategies

### Strategy 1: Timeouts

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    ch := make(chan int)
    
    // With timeout - won't deadlock forever
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    select {
    case value := <-ch:
        fmt.Println("Received:", value)
    case <-ctx.Done():
        fmt.Println("Timeout - avoiding deadlock")
    }
}
```

### Strategy 2: Select with Default

```go
func trySend(ch chan int, value int) bool {
    select {
    case ch <- value:
        return true
    default:
        return false  // Channel full or blocked
    }
}

func tryReceive(ch chan int) (int, bool) {
    select {
    case value := <-ch:
        return value, true
    default:
        return 0, false  // Channel empty or blocked
    }
}
```

### Strategy 3: Buffered Channels

```go
// Unbuffered - easy to deadlock
ch := make(chan int)

// Buffered - more forgiving
ch := make(chan int, 100)
```

### Strategy 4: WaitGroup for Synchronization

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup
    ch := make(chan int, 10)
    
    // Producer
    wg.Add(1)
    go func() {
        defer wg.Done()
        for i := 0; i < 5; i++ {
            ch <- i
        }
        close(ch)  // Important: close when done
    }()
    
    // Consumer
    wg.Add(1)
    go func() {
        defer wg.Done()
        for value := range ch {
            fmt.Println(value)
        }
    }()
    
    wg.Wait()
}
```

---

## Debugging Techniques

### Print Goroutine Stack

```go
import (
    "os"
    "os/signal"
    "runtime/pprof"
    "syscall"
)

func setupDeadlockDebugger() {
    c := make(chan os.Signal, 1)
    signal.Notify(c, syscall.SIGUSR1)
    
    go func() {
        for range c {
            pprof.Lookup("goroutine").WriteTo(os.Stderr, 1)
        }
    }()
}

// Send SIGUSR1 to dump goroutine stacks:
// kill -USR1 <pid>
```

### Add Logging

```go
func worker(id int, ch chan int, mu *sync.Mutex) {
    log.Printf("[worker %d] waiting for channel", id)
    value := <-ch
    
    log.Printf("[worker %d] got value, acquiring lock", id)
    mu.Lock()
    
    log.Printf("[worker %d] processing", id)
    // work
    
    log.Printf("[worker %d] releasing lock", id)
    mu.Unlock()
}
```

### Deadlock Detection Library

```go
import "github.com/sasha-s/go-deadlock"

// Replace sync.Mutex with deadlock.Mutex during debugging
var mu deadlock.Mutex

func example() {
    mu.Lock()
    // If another goroutine is stuck waiting, you'll get a warning
    mu.Unlock()
}
```

---

## Common Fixes Summary

| Deadlock Type | Cause | Fix |
|--------------|-------|-----|
| Channel send | No receiver | Add receiver goroutine or buffer |
| Channel receive | No sender | Ensure sender exists, close channel |
| Mutex ordering | Different lock order | Consistent ordering |
| Self-deadlock | Re-locking same mutex | Restructure code |
| WaitGroup | Add after Wait | Add before launching goroutines |

---

## Goroutine Leak (Related Issue)

Not a deadlock, but goroutines waiting forever:

```go
func leakyFunction() {
    ch := make(chan int)
    
    go func() {
        // This goroutine never terminates
        value := <-ch  // Waits forever
        fmt.Println(value)
    }()
    
    // Function returns, channel is abandoned
    // Goroutine leaks!
}
```

**Fix: Use context for cancellation**

```go
func properFunction(ctx context.Context) {
    ch := make(chan int)
    
    go func() {
        select {
        case value := <-ch:
            fmt.Println(value)
        case <-ctx.Done():
            return  // Clean exit on cancellation
        }
    }()
}
```

---

## Summary

Deadlock prevention checklist:

1. **Channels**: Always have matching senders and receivers
2. **Close channels**: Close when no more values will be sent
3. **Timeouts**: Use `context.WithTimeout` or `select` with timeout
4. **Lock ordering**: Always acquire locks in the same order
5. **Avoid nested locks**: Don't call locking functions while holding a lock
6. **Use buffered channels**: When appropriate
7. **Test with -race**: Catch race conditions early
8. **Monitor goroutines**: Use pprof in production

---

*Debugging concurrent Go applications? [OneUptime](https://oneuptime.com) provides distributed tracing and monitoring to help you track down concurrency issues in production.*
