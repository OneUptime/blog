# How to Use Atomic Operations in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Atomic, Concurrency, sync/atomic, Thread Safety

Description: Learn how to use atomic operations in Go for lock-free concurrent programming with the sync/atomic package.

---

Atomic operations provide lock-free access to shared variables, offering better performance than mutexes for simple operations. The `sync/atomic` package provides low-level atomic memory primitives.

---

## Basic Atomic Operations

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

func main() {
    var counter int64
    var wg sync.WaitGroup
    
    // Increment counter from multiple goroutines
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            atomic.AddInt64(&counter, 1)
        }()
    }
    
    wg.Wait()
    
    // Load the value atomically
    finalValue := atomic.LoadInt64(&counter)
    fmt.Println("Counter:", finalValue)  // Always 1000
}
```

---

## Why Use Atomics?

Without atomics, race conditions occur:

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var counter int64
    var wg sync.WaitGroup
    
    // BUG: Race condition!
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter++  // Not thread-safe
        }()
    }
    
    wg.Wait()
    fmt.Println("Counter:", counter)  // Unpredictable!
}
```

Run with `go run -race main.go` to detect the race.

---

## Atomic Types (Go 1.19+)

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

func main() {
    // Type-safe atomic values
    var counter atomic.Int64
    var flag atomic.Bool
    var ptr atomic.Pointer[string]
    
    var wg sync.WaitGroup
    
    // Counter operations
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter.Add(1)
        }()
    }
    
    // Boolean flag
    flag.Store(true)
    
    // Pointer operations
    msg := "Hello"
    ptr.Store(&msg)
    
    wg.Wait()
    
    fmt.Println("Counter:", counter.Load())
    fmt.Println("Flag:", flag.Load())
    fmt.Println("Message:", *ptr.Load())
}
```

---

## Common Atomic Operations

```go
package main

import (
    "fmt"
    "sync/atomic"
)

func main() {
    var value int64 = 10
    
    // Add - returns new value
    newVal := atomic.AddInt64(&value, 5)
    fmt.Println("After Add(5):", newVal)  // 15
    
    // Subtract using negative value
    newVal = atomic.AddInt64(&value, -3)
    fmt.Println("After Add(-3):", newVal)  // 12
    
    // Load - read atomically
    current := atomic.LoadInt64(&value)
    fmt.Println("Load:", current)  // 12
    
    // Store - write atomically
    atomic.StoreInt64(&value, 100)
    fmt.Println("After Store(100):", atomic.LoadInt64(&value))
    
    // Swap - store and return old value
    old := atomic.SwapInt64(&value, 200)
    fmt.Println("Swap old:", old, "new:", atomic.LoadInt64(&value))
    
    // CompareAndSwap - conditional update
    swapped := atomic.CompareAndSwapInt64(&value, 200, 300)
    fmt.Println("CAS(200->300) success:", swapped)
    
    swapped = atomic.CompareAndSwapInt64(&value, 200, 400)
    fmt.Println("CAS(200->400) success:", swapped)  // false, value is 300
}
```

---

## Compare-And-Swap Pattern

CAS is the foundation of lock-free algorithms:

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

// Atomic increment with CAS
func incrementWithCAS(counter *int64) {
    for {
        old := atomic.LoadInt64(counter)
        new := old + 1
        if atomic.CompareAndSwapInt64(counter, old, new) {
            return
        }
        // CAS failed, retry
    }
}

// Atomic maximum
func atomicMax(target *int64, value int64) {
    for {
        old := atomic.LoadInt64(target)
        if value <= old {
            return
        }
        if atomic.CompareAndSwapInt64(target, old, value) {
            return
        }
    }
}

func main() {
    var counter int64
    var max int64
    var wg sync.WaitGroup
    
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(val int64) {
            defer wg.Done()
            incrementWithCAS(&counter)
            atomicMax(&max, val)
        }(int64(i))
    }
    
    wg.Wait()
    fmt.Println("Counter:", atomic.LoadInt64(&counter))
    fmt.Println("Max:", atomic.LoadInt64(&max))
}
```

---

## Atomic Value for Any Type

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

type Config struct {
    Workers int
    Timeout int
    Debug   bool
}

var config atomic.Value

func init() {
    // Store initial config
    config.Store(&Config{
        Workers: 4,
        Timeout: 30,
        Debug:   false,
    })
}

func GetConfig() *Config {
    return config.Load().(*Config)
}

func UpdateConfig(new *Config) {
    config.Store(new)
}

func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done()
    
    cfg := GetConfig()
    fmt.Printf("Worker %d: workers=%d, timeout=%d\n", 
        id, cfg.Workers, cfg.Timeout)
}

func main() {
    var wg sync.WaitGroup
    
    // Start workers with initial config
    for i := 0; i < 3; i++ {
        wg.Add(1)
        go worker(i, &wg)
    }
    
    // Update config
    UpdateConfig(&Config{
        Workers: 8,
        Timeout: 60,
        Debug:   true,
    })
    
    // Start more workers with new config
    for i := 3; i < 6; i++ {
        wg.Add(1)
        go worker(i, &wg)
    }
    
    wg.Wait()
}
```

---

## Atomic Pointer

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

type Data struct {
    Value int
    Name  string
}

func main() {
    var dataPtr atomic.Pointer[Data]
    
    // Store initial data
    initial := &Data{Value: 1, Name: "initial"}
    dataPtr.Store(initial)
    
    var wg sync.WaitGroup
    
    // Readers
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            data := dataPtr.Load()
            fmt.Printf("Reader %d: %+v\n", id, data)
        }(i)
    }
    
    // Writer
    wg.Add(1)
    go func() {
        defer wg.Done()
        newData := &Data{Value: 2, Name: "updated"}
        old := dataPtr.Swap(newData)
        fmt.Printf("Swapped: old=%+v\n", old)
    }()
    
    wg.Wait()
    
    final := dataPtr.Load()
    fmt.Printf("Final: %+v\n", final)
}
```

---

## Lock-Free Stack

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

type Node struct {
    Value int
    Next  *Node
}

type Stack struct {
    head atomic.Pointer[Node]
}

func (s *Stack) Push(value int) {
    newNode := &Node{Value: value}
    
    for {
        oldHead := s.head.Load()
        newNode.Next = oldHead
        
        if s.head.CompareAndSwap(oldHead, newNode) {
            return
        }
    }
}

func (s *Stack) Pop() (int, bool) {
    for {
        oldHead := s.head.Load()
        if oldHead == nil {
            return 0, false
        }
        
        if s.head.CompareAndSwap(oldHead, oldHead.Next) {
            return oldHead.Value, true
        }
    }
}

func main() {
    var stack Stack
    var wg sync.WaitGroup
    
    // Push values concurrently
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(val int) {
            defer wg.Done()
            stack.Push(val)
        }(i)
    }
    
    wg.Wait()
    
    // Pop all values
    for {
        val, ok := stack.Pop()
        if !ok {
            break
        }
        fmt.Println("Popped:", val)
    }
}
```

---

## Atomic Counter with Stats

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
    "time"
)

type Stats struct {
    requests  atomic.Int64
    errors    atomic.Int64
    latencyNs atomic.Int64
    count     atomic.Int64
}

func (s *Stats) RecordRequest(latency time.Duration, err error) {
    s.requests.Add(1)
    
    if err != nil {
        s.errors.Add(1)
        return
    }
    
    s.latencyNs.Add(int64(latency))
    s.count.Add(1)
}

func (s *Stats) AverageLatency() time.Duration {
    count := s.count.Load()
    if count == 0 {
        return 0
    }
    return time.Duration(s.latencyNs.Load() / count)
}

func (s *Stats) ErrorRate() float64 {
    total := s.requests.Load()
    if total == 0 {
        return 0
    }
    return float64(s.errors.Load()) / float64(total)
}

func (s *Stats) Report() {
    fmt.Printf("Requests: %d\n", s.requests.Load())
    fmt.Printf("Errors: %d (%.2f%%)\n", s.errors.Load(), s.ErrorRate()*100)
    fmt.Printf("Avg Latency: %v\n", s.AverageLatency())
}

func main() {
    var stats Stats
    var wg sync.WaitGroup
    
    // Simulate requests
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            start := time.Now()
            var err error
            
            // Simulate some failures
            if id%10 == 0 {
                err = fmt.Errorf("error")
            } else {
                time.Sleep(time.Millisecond)
            }
            
            stats.RecordRequest(time.Since(start), err)
        }(i)
    }
    
    wg.Wait()
    stats.Report()
}
```

---

## Atomic vs Mutex

```go
package main

import (
    "sync"
    "sync/atomic"
    "testing"
)

var (
    atomicCounter atomic.Int64
    mutexCounter  int64
    mu            sync.Mutex
)

func BenchmarkAtomic(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            atomicCounter.Add(1)
        }
    })
}

func BenchmarkMutex(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            mu.Lock()
            mutexCounter++
            mu.Unlock()
        }
    })
}

// Run: go test -bench=. -benchmem
```

**Typical Results:**
```
BenchmarkAtomic-8    100000000    10 ns/op    0 B/op    0 allocs/op
BenchmarkMutex-8      20000000    60 ns/op    0 B/op    0 allocs/op
```

---

## Memory Ordering

```go
package main

import (
    "fmt"
    "sync/atomic"
    "time"
)

func main() {
    var ready atomic.Bool
    var data int
    
    go func() {
        // Write data first
        data = 42
        
        // Then signal ready (with memory barrier)
        ready.Store(true)
    }()
    
    // Wait for ready
    for !ready.Load() {
        time.Sleep(time.Nanosecond)
    }
    
    // Data is guaranteed to be visible
    fmt.Println("Data:", data)  // Always 42
}
```

---

## Summary

| Operation | Method | Use Case |
|-----------|--------|----------|
| Add | `Add`, `atomic.Int64` | Counters |
| Load | `Load` | Read values |
| Store | `Store` | Write values |
| Swap | `Swap` | Exchange values |
| CAS | `CompareAndSwap` | Lock-free updates |
| Value | `atomic.Value` | Any type storage |

**When to use atomics:**

1. Simple counters and flags
2. Read-mostly scenarios
3. Lock-free data structures
4. Performance-critical paths
5. Single-variable synchronization

**When to use mutexes:**

1. Multiple variables need consistency
2. Complex operations
3. Conditional logic during updates
4. When correctness is more important than speed

---

*Monitoring concurrent Go applications? [OneUptime](https://oneuptime.com) helps you track race conditions, deadlocks, and performance issues in production.*
