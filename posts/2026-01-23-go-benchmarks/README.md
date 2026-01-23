# How to Write Benchmarks in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Benchmarks, Performance, Testing, Optimization

Description: Learn how to write and run benchmarks in Go to measure code performance, compare implementations, and identify optimization opportunities.

---

Go's testing package includes built-in support for benchmarks. Benchmarks help you measure performance, compare implementations, and make data-driven optimization decisions.

---

## Basic Benchmark

```go
package main

import (
    "testing"
)

func Sum(numbers []int) int {
    total := 0
    for _, n := range numbers {
        total += n
    }
    return total
}

func BenchmarkSum(b *testing.B) {
    numbers := make([]int, 1000)
    for i := range numbers {
        numbers[i] = i
    }
    
    // Reset timer after setup
    b.ResetTimer()
    
    // Run the function b.N times
    for i := 0; i < b.N; i++ {
        Sum(numbers)
    }
}
```

Run benchmark:
```bash
go test -bench=.
```

**Output:**
```
BenchmarkSum-8    1000000    1050 ns/op
```

This means:
- `8`: Number of CPU cores used (GOMAXPROCS)
- `1000000`: Number of iterations
- `1050 ns/op`: Time per operation (nanoseconds)

---

## Running Benchmarks

```bash
# Run all benchmarks
go test -bench=.

# Run specific benchmark by name
go test -bench=BenchmarkSum

# Run with regex pattern
go test -bench="Sum|Multiply"

# Specify minimum run time (default 1s)
go test -bench=. -benchtime=5s

# Specify exact iteration count
go test -bench=. -benchtime=1000x

# Show memory allocations
go test -bench=. -benchmem

# Run multiple times for statistical significance
go test -bench=. -count=5
```

---

## Memory Allocation Benchmarks

```go
func BenchmarkConcat(b *testing.B) {
    for i := 0; i < b.N; i++ {
        s := ""
        for j := 0; j < 100; j++ {
            s += "x"  // Allocates each iteration
        }
        _ = s
    }
}

func BenchmarkBuilder(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var sb strings.Builder
        for j := 0; j < 100; j++ {
            sb.WriteString("x")
        }
        _ = sb.String()
    }
}
```

Run with memory stats:
```bash
go test -bench=. -benchmem
```

**Output:**
```
BenchmarkConcat-8     10000    110000 ns/op    5408 B/op    100 allocs/op
BenchmarkBuilder-8   500000      3200 ns/op     512 B/op      4 allocs/op
```

The `strings.Builder` is 34x faster with 25x fewer allocations.

---

## Sub-Benchmarks

Test different input sizes:

```go
func BenchmarkSort(b *testing.B) {
    sizes := []int{10, 100, 1000, 10000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size=%d", size), func(b *testing.B) {
            // Setup
            data := make([]int, size)
            for i := range data {
                data[i] = rand.Intn(size)
            }
            
            b.ResetTimer()
            
            for i := 0; i < b.N; i++ {
                // Copy to avoid sorting already sorted data
                dataCopy := make([]int, len(data))
                copy(dataCopy, data)
                sort.Ints(dataCopy)
            }
        })
    }
}
```

**Output:**
```
BenchmarkSort/size=10-8       5000000     250 ns/op
BenchmarkSort/size=100-8       500000    3500 ns/op
BenchmarkSort/size=1000-8       30000   50000 ns/op
BenchmarkSort/size=10000-8       2000  700000 ns/op
```

---

## Comparing Implementations

```go
package main

import (
    "sync"
    "testing"
)

// Implementation 1: Mutex
type CounterMutex struct {
    mu    sync.Mutex
    value int64
}

func (c *CounterMutex) Inc() {
    c.mu.Lock()
    c.value++
    c.mu.Unlock()
}

// Implementation 2: Atomic
type CounterAtomic struct {
    value int64
}

func (c *CounterAtomic) Inc() {
    atomic.AddInt64(&c.value, 1)
}

func BenchmarkCounterMutex(b *testing.B) {
    c := &CounterMutex{}
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            c.Inc()
        }
    })
}

func BenchmarkCounterAtomic(b *testing.B) {
    c := &CounterAtomic{}
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            c.Inc()
        }
    })
}
```

**Output:**
```
BenchmarkCounterMutex-8     10000000    120 ns/op
BenchmarkCounterAtomic-8    50000000     25 ns/op
```

Atomic operations are ~5x faster for this use case.

---

## Parallel Benchmarks

Measure performance under concurrent load:

```go
func BenchmarkMapReadWrite(b *testing.B) {
    m := make(map[string]int)
    var mu sync.RWMutex
    
    // Pre-populate
    for i := 0; i < 1000; i++ {
        m[fmt.Sprintf("key%d", i)] = i
    }
    
    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            key := fmt.Sprintf("key%d", rand.Intn(1000))
            
            // 90% reads, 10% writes
            if rand.Float32() < 0.9 {
                mu.RLock()
                _ = m[key]
                mu.RUnlock()
            } else {
                mu.Lock()
                m[key] = rand.Int()
                mu.Unlock()
            }
        }
    })
}
```

---

## Benchmark with Setup

```go
func BenchmarkWithSetup(b *testing.B) {
    // One-time setup (not measured)
    data := expensiveSetup()
    
    // Reset timer after setup
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        // This is measured
        processData(data)
    }
}

func BenchmarkWithPerIterationSetup(b *testing.B) {
    for i := 0; i < b.N; i++ {
        // Per-iteration setup
        b.StopTimer()
        data := setupForIteration()
        b.StartTimer()
        
        // Only this is measured
        processData(data)
    }
}
```

---

## Reporting Custom Metrics

```go
func BenchmarkCustomMetrics(b *testing.B) {
    data := make([]byte, 1024*1024)  // 1MB
    
    b.SetBytes(int64(len(data)))  // Report throughput
    
    for i := 0; i < b.N; i++ {
        processBytes(data)
    }
}
```

**Output:**
```
BenchmarkCustomMetrics-8    1000    1050000 ns/op    1000.00 MB/s
```

---

## Using benchstat for Comparison

Install benchstat:
```bash
go install golang.org/x/perf/cmd/benchstat@latest
```

Save benchmark results:
```bash
# Before optimization
go test -bench=. -count=10 > old.txt

# After optimization
go test -bench=. -count=10 > new.txt

# Compare
benchstat old.txt new.txt
```

**Output:**
```
name        old time/op    new time/op    delta
Sum-8       1.05µs ± 2%    0.85µs ± 1%   -19.05%  (p=0.000 n=10+10)

name        old alloc/op   new alloc/op   delta
Sum-8       512B ± 0%      256B ± 0%     -50.00%  (p=0.000 n=10+10)

name        old allocs/op  new allocs/op  delta
Sum-8       4.00 ± 0%      2.00 ± 0%     -50.00%  (p=0.000 n=10+10)
```

---

## Common Benchmark Patterns

### Pattern 1: Table-Driven Benchmarks

```go
func BenchmarkHash(b *testing.B) {
    benchmarks := []struct {
        name string
        hash hash.Hash
    }{
        {"MD5", md5.New()},
        {"SHA1", sha1.New()},
        {"SHA256", sha256.New()},
    }
    
    data := make([]byte, 1024)
    
    for _, bm := range benchmarks {
        b.Run(bm.name, func(b *testing.B) {
            for i := 0; i < b.N; i++ {
                bm.hash.Reset()
                bm.hash.Write(data)
                bm.hash.Sum(nil)
            }
        })
    }
}
```

### Pattern 2: Benchmark with Different GOMAXPROCS

```go
func BenchmarkParallelWork(b *testing.B) {
    for _, procs := range []int{1, 2, 4, 8} {
        b.Run(fmt.Sprintf("procs=%d", procs), func(b *testing.B) {
            runtime.GOMAXPROCS(procs)
            b.RunParallel(func(pb *testing.PB) {
                for pb.Next() {
                    doWork()
                }
            })
        })
    }
}
```

### Pattern 3: Avoiding Compiler Optimization

```go
var result int  // Package-level variable

func BenchmarkPreventOptimization(b *testing.B) {
    var r int
    for i := 0; i < b.N; i++ {
        r = compute()  // Assign to local
    }
    result = r  // Assign to package var to prevent optimization
}
```

---

## Summary

| Flag | Purpose |
|------|---------|
| `-bench=.` | Run all benchmarks |
| `-benchmem` | Report memory allocations |
| `-benchtime=5s` | Run for 5 seconds |
| `-count=10` | Run 10 times |
| `-cpu=1,2,4,8` | Test with different GOMAXPROCS |

**Best Practices:**

1. Use `b.ResetTimer()` after setup
2. Use `b.RunParallel()` for concurrent benchmarks
3. Run benchmarks multiple times (`-count=10`)
4. Use benchstat for statistical comparison
5. Prevent compiler optimizations with package-level variables
6. Report throughput with `b.SetBytes()` when applicable
7. Test realistic data sizes

---

*Want to track performance in production? [OneUptime](https://oneuptime.com) provides APM and metrics monitoring to help you identify performance regressions before they affect users.*
