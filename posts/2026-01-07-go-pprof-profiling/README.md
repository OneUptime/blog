# How to Profile Go Applications with pprof

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Profiling, Performance, pprof, Debugging, Optimization

Description: Master Go application profiling with pprof, covering CPU, memory, goroutine, and block profiling with practical examples and visualization techniques.

---

Performance profiling is an essential skill for any Go developer. When your application starts consuming too much memory, running slowly, or experiencing goroutine leaks, you need the right tools to diagnose and fix these issues. Go's built-in `pprof` package provides powerful profiling capabilities that help you understand exactly what your application is doing at runtime.

In this comprehensive guide, we'll explore all aspects of Go profiling using pprof, from basic setup to advanced visualization techniques.

## Table of Contents

1. [Introduction to pprof](#introduction-to-pprof)
2. [Setting Up pprof](#setting-up-pprof)
3. [CPU Profiling](#cpu-profiling)
4. [Memory (Heap) Profiling](#memory-heap-profiling)
5. [Goroutine Profiling](#goroutine-profiling)
6. [Block Profiling](#block-profiling)
7. [Mutex Profiling](#mutex-profiling)
8. [Visualizing Profiles](#visualizing-profiles)
9. [Real-World Profiling Scenarios](#real-world-profiling-scenarios)
10. [Best Practices](#best-practices)

## Introduction to pprof

pprof is a tool for visualization and analysis of profiling data. Go includes native support for pprof through two packages:

- **`runtime/pprof`**: For writing profiling data to files in standalone applications
- **`net/http/pprof`**: For exposing profiling endpoints over HTTP in web applications

The profiling data collected by pprof helps you answer critical questions:

- Which functions consume the most CPU time?
- Where is memory being allocated?
- Are there goroutine leaks?
- What's causing blocking or contention?

## Setting Up pprof

There are two primary ways to enable profiling in your Go applications: via HTTP endpoints for long-running services, or programmatically for specific code sections.

### Method 1: HTTP Endpoints (Recommended for Services)

The simplest way to enable profiling in a web service is to import the `net/http/pprof` package. This automatically registers profiling handlers with the default HTTP mux.

```go
package main

import (
    "fmt"
    "log"
    "net/http"
    // This import registers pprof handlers with DefaultServeMux
    _ "net/http/pprof"
)

func main() {
    // Your application routes
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, World!")
    })

    // Start the server - pprof endpoints are now available at /debug/pprof/
    log.Println("Server starting on :8080")
    log.Println("pprof available at http://localhost:8080/debug/pprof/")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Once your server is running, the following endpoints become available:

| Endpoint | Description |
|----------|-------------|
| `/debug/pprof/` | Index page listing available profiles |
| `/debug/pprof/profile` | CPU profile (30-second sample by default) |
| `/debug/pprof/heap` | Heap memory profile |
| `/debug/pprof/goroutine` | Goroutine stack traces |
| `/debug/pprof/block` | Block profile (requires enabling) |
| `/debug/pprof/mutex` | Mutex contention profile (requires enabling) |
| `/debug/pprof/threadcreate` | Thread creation profile |
| `/debug/pprof/allocs` | Memory allocation samples |
| `/debug/pprof/trace` | Execution trace |

### Method 2: Using a Separate Debug Server

For production applications, it's often better to run pprof on a separate port that's not exposed publicly. This approach provides security isolation for your profiling endpoints.

```go
package main

import (
    "log"
    "net/http"
    "net/http/pprof"
)

func main() {
    // Create a separate mux for pprof
    debugMux := http.NewServeMux()

    // Register pprof handlers manually
    debugMux.HandleFunc("/debug/pprof/", pprof.Index)
    debugMux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
    debugMux.HandleFunc("/debug/pprof/profile", pprof.Profile)
    debugMux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
    debugMux.HandleFunc("/debug/pprof/trace", pprof.Trace)

    // Start debug server on a different port (not exposed publicly)
    go func() {
        log.Println("Debug server starting on :6060")
        log.Fatal(http.ListenAndServe("localhost:6060", debugMux))
    }()

    // Your main application server
    mainMux := http.NewServeMux()
    mainMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Main application"))
    })

    log.Println("Main server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", mainMux))
}
```

### Method 3: Programmatic Profiling

For CLI applications or when you need to profile specific code sections, use the `runtime/pprof` package to write profiles directly to files.

```go
package main

import (
    "os"
    "runtime"
    "runtime/pprof"
    "log"
)

func main() {
    // Create CPU profile file
    cpuFile, err := os.Create("cpu.prof")
    if err != nil {
        log.Fatal("Could not create CPU profile: ", err)
    }
    defer cpuFile.Close()

    // Start CPU profiling
    if err := pprof.StartCPUProfile(cpuFile); err != nil {
        log.Fatal("Could not start CPU profile: ", err)
    }
    defer pprof.StopCPUProfile()

    // Your application code here
    doWork()

    // Create memory profile file
    memFile, err := os.Create("mem.prof")
    if err != nil {
        log.Fatal("Could not create memory profile: ", err)
    }
    defer memFile.Close()

    // Force garbage collection to get accurate memory stats
    runtime.GC()

    // Write memory profile
    if err := pprof.WriteHeapProfile(memFile); err != nil {
        log.Fatal("Could not write memory profile: ", err)
    }
}

func doWork() {
    // Simulate work
    data := make([]byte, 100*1024*1024) // 100MB allocation
    for i := range data {
        data[i] = byte(i % 256)
    }
}
```

## CPU Profiling

CPU profiling helps you identify which functions consume the most processing time. The profiler samples the call stack at regular intervals (default: 100 times per second) to build a statistical picture of where time is spent.

### Capturing CPU Profiles

To capture a CPU profile from a running HTTP server, use the `go tool pprof` command. This command fetches a 30-second CPU profile from the specified endpoint.

```bash
# Capture a 30-second CPU profile from a running server
go tool pprof http://localhost:8080/debug/pprof/profile

# Capture a custom duration profile (60 seconds)
go tool pprof http://localhost:8080/debug/pprof/profile?seconds=60

# Save profile to a file for later analysis
curl -o cpu.prof http://localhost:8080/debug/pprof/profile?seconds=30
go tool pprof cpu.prof
```

### Analyzing CPU Profiles

Once you're in the pprof interactive shell, you have several commands available. The `top` command shows the functions consuming the most CPU time.

```bash
# Show top 10 functions by CPU time
(pprof) top
Showing nodes accounting for 2.5s, 89.29% of 2.8s total
      flat  flat%   sum%        cum   cum%
     1.2s 42.86% 42.86%      1.5s 53.57%  main.processData
     0.8s 28.57% 71.43%      0.8s 28.57%  runtime.memclrNoHeapPointers
     0.3s 10.71% 82.14%      2.1s 75.00%  main.handleRequest
     0.2s  7.14% 89.29%      0.2s  7.14%  runtime.memmove
```

Understanding the output columns:

- **flat**: Time spent in the function itself (excluding called functions)
- **flat%**: Percentage of total time for flat
- **sum%**: Cumulative percentage
- **cum**: Time spent in function including all called functions
- **cum%**: Percentage of total time for cum

### Additional pprof Commands

The pprof tool provides various commands for different views of your profile data. Here are some commonly used commands:

```bash
# Show top functions sorted by cumulative time
(pprof) top -cum

# Display source code with time annotations for a specific function
(pprof) list main.processData

# Show call graph in text format
(pprof) tree

# Filter to specific package or function
(pprof) top -cum main

# Show web visualization (opens in browser)
(pprof) web

# Generate a PDF report
(pprof) pdf > cpu_profile.pdf
```

### Example: Finding a CPU Hotspot

Here's a practical example demonstrating how to identify and fix a CPU performance issue.

```go
package main

import (
    "crypto/sha256"
    "encoding/hex"
    "net/http"
    _ "net/http/pprof"
)

// Inefficient implementation - recalculates hash on every call
func inefficientHash(data string) string {
    for i := 0; i < 1000; i++ {
        hash := sha256.Sum256([]byte(data))
        data = hex.EncodeToString(hash[:])
    }
    return data
}

func handler(w http.ResponseWriter, r *http.Request) {
    // This will show up as a CPU hotspot in profiling
    result := inefficientHash("some input data")
    w.Write([]byte(result))
}

func main() {
    http.HandleFunc("/hash", handler)
    http.ListenAndServe(":8080", nil)
}
```

After running `go tool pprof http://localhost:8080/debug/pprof/profile`, you would see `inefficientHash` consuming significant CPU time, indicating it's a candidate for optimization.

## Memory (Heap) Profiling

Memory profiling helps you understand memory allocation patterns, identify leaks, and optimize memory usage. Go's heap profiler tracks allocations and can show you exactly where memory is being used.

### Capturing Heap Profiles

The heap profile endpoint provides information about current memory allocations. You can request different views of the memory data.

```bash
# Interactive analysis of current heap allocations
go tool pprof http://localhost:8080/debug/pprof/heap

# Show allocations since program start (useful for finding leaks)
go tool pprof http://localhost:8080/debug/pprof/allocs

# Download heap profile for offline analysis
curl -o heap.prof http://localhost:8080/debug/pprof/heap
```

### Understanding Heap Profile Types

Go provides two perspectives on memory usage: inuse (current) and alloc (cumulative). Each can be viewed in terms of bytes or object count.

```bash
# Show memory currently in use (default)
(pprof) top -inuse_space

# Show total allocations since program start
(pprof) top -alloc_space

# Show by number of objects instead of bytes
(pprof) top -inuse_objects
(pprof) top -alloc_objects
```

### Example: Finding Memory Leaks

This example demonstrates a common memory leak pattern and how to identify it with pprof.

```go
package main

import (
    "net/http"
    "sync"
    _ "net/http/pprof"
)

// Cache that grows unbounded - a memory leak!
type LeakyCache struct {
    mu    sync.RWMutex
    items map[string][]byte
}

var cache = &LeakyCache{
    items: make(map[string][]byte),
}

// Store adds data to cache but never removes it
func (c *LeakyCache) Store(key string, data []byte) {
    c.mu.Lock()
    defer c.mu.Unlock()
    // Memory leak: items are never evicted
    c.items[key] = data
}

func (c *LeakyCache) Get(key string) ([]byte, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    data, ok := c.items[key]
    return data, ok
}

func handler(w http.ResponseWriter, r *http.Request) {
    key := r.URL.Query().Get("key")
    // Each request adds 1MB to the cache
    data := make([]byte, 1024*1024)
    cache.Store(key, data)
    w.Write([]byte("Stored"))
}

func main() {
    http.HandleFunc("/store", handler)
    http.ListenAndServe(":8080", nil)
}
```

To detect this leak, compare heap profiles over time:

```bash
# Take first snapshot
curl -o heap1.prof http://localhost:8080/debug/pprof/heap

# Generate some traffic, wait a bit

# Take second snapshot
curl -o heap2.prof http://localhost:8080/debug/pprof/heap

# Compare the two profiles to see what grew
go tool pprof -base heap1.prof heap2.prof
```

### Memory Profile Analysis Commands

The pprof tool offers specialized commands for memory analysis.

```bash
# Show top memory consumers
(pprof) top -inuse_space
Showing nodes accounting for 156.50MB, 95.12% of 164.52MB total
      flat  flat%   sum%        cum   cum%
  150.00MB 91.17% 91.17%   150.00MB 91.17%  main.handler
    6.50MB  3.95% 95.12%     6.50MB  3.95%  net/http.readRequest

# View source code with allocation annotations
(pprof) list main.handler

# Show allocation sizes
(pprof) alloc_space

# Visualize memory in browser
(pprof) web
```

## Goroutine Profiling

Goroutine profiling is crucial for debugging concurrency issues, deadlocks, and goroutine leaks. It shows you all running goroutines and their stack traces.

### Capturing Goroutine Profiles

The goroutine profile shows the state of all goroutines at a point in time.

```bash
# Get goroutine profile with full stack traces
go tool pprof http://localhost:8080/debug/pprof/goroutine

# Quick view in browser (debug=1 for human-readable format)
curl http://localhost:8080/debug/pprof/goroutine?debug=1

# Full stack traces with labels (debug=2)
curl http://localhost:8080/debug/pprof/goroutine?debug=2
```

### Example: Detecting Goroutine Leaks

This example shows a common goroutine leak pattern where goroutines are spawned but never terminate.

```go
package main

import (
    "net/http"
    "time"
    _ "net/http/pprof"
)

// LeakyWorker spawns goroutines that never terminate
func leakyWorker(ch chan struct{}) {
    // This goroutine blocks forever if channel is never closed
    <-ch
}

func handler(w http.ResponseWriter, r *http.Request) {
    ch := make(chan struct{})
    // Goroutine leak: goroutine waits forever, channel is never closed
    go leakyWorker(ch)
    // ch is never closed, goroutine leaks!
    w.Write([]byte("Started worker"))
}

func main() {
    http.HandleFunc("/leak", handler)

    // Monitor goroutine count periodically
    go func() {
        for {
            time.Sleep(10 * time.Second)
            println("Goroutines:", runtime.NumGoroutine())
        }
    }()

    http.ListenAndServe(":8080", nil)
}
```

### Analyzing Goroutine Profiles

When analyzing goroutine profiles, look for patterns that indicate leaks.

```bash
# Get human-readable goroutine dump
curl http://localhost:8080/debug/pprof/goroutine?debug=1

# Output shows goroutine states:
# goroutine 42 [chan receive]:  <- blocked on channel
# goroutine 43 [select]:        <- blocked in select
# goroutine 44 [IO wait]:       <- waiting for I/O
```

Signs of goroutine leaks:

- Growing number of goroutines over time
- Many goroutines stuck in the same state (e.g., "chan receive")
- Goroutines with identical stack traces accumulating

### Fixed Version Without Leak

Here's the corrected version that properly manages goroutine lifecycle.

```go
package main

import (
    "context"
    "net/http"
    "time"
    _ "net/http/pprof"
)

// Worker with proper cancellation
func worker(ctx context.Context) {
    select {
    case <-ctx.Done():
        return // Properly exits when context is cancelled
    case <-time.After(5 * time.Second):
        // Do work
    }
}

func handler(w http.ResponseWriter, r *http.Request) {
    // Use request context for automatic cancellation
    ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
    defer cancel() // Ensures goroutine cleanup

    go worker(ctx)
    w.Write([]byte("Started worker with proper cleanup"))
}

func main() {
    http.HandleFunc("/work", handler)
    http.ListenAndServe(":8080", nil)
}
```

## Block Profiling

Block profiling shows where goroutines block waiting on synchronization primitives like channels and mutexes. This is invaluable for identifying contention issues.

### Enabling Block Profiling

Block profiling is disabled by default because it has some overhead. You need to explicitly enable it.

```go
package main

import (
    "net/http"
    "runtime"
    _ "net/http/pprof"
)

func main() {
    // Enable block profiling
    // The parameter is the sampling rate:
    // 1 = profile every blocking event (highest accuracy, highest overhead)
    // 0 = disable block profiling
    runtime.SetBlockProfileRate(1)

    http.ListenAndServe(":8080", nil)
}
```

### Capturing Block Profiles

Once enabled, you can capture and analyze block profiles.

```bash
# Capture block profile
go tool pprof http://localhost:8080/debug/pprof/block

# Analyze blocking operations
(pprof) top
Showing nodes accounting for 5.2s, 100% of 5.2s total
      flat  flat%   sum%        cum   cum%
     3.1s 59.62% 59.62%      3.1s 59.62%  sync.(*Mutex).Lock
     2.1s 40.38%   100%      2.1s 40.38%  runtime.chanrecv1
```

### Example: Finding Contention Issues

This example demonstrates how contention on a shared resource can be identified through block profiling.

```go
package main

import (
    "net/http"
    "runtime"
    "sync"
    "time"
    _ "net/http/pprof"
)

type SlowResource struct {
    mu   sync.Mutex
    data map[string]string
}

var resource = &SlowResource{
    data: make(map[string]string),
}

// SimulateSlowOperation holds the lock for too long
func (r *SlowResource) SimulateSlowOperation(key, value string) {
    r.mu.Lock()
    defer r.mu.Unlock()

    // Simulating slow I/O while holding the lock - bad practice!
    time.Sleep(100 * time.Millisecond)
    r.data[key] = value
}

func handler(w http.ResponseWriter, r *http.Request) {
    resource.SimulateSlowOperation("key", "value")
    w.Write([]byte("Done"))
}

func main() {
    // Enable block profiling to detect contention
    runtime.SetBlockProfileRate(1)

    http.HandleFunc("/slow", handler)
    http.ListenAndServe(":8080", nil)
}
```

Under concurrent load, the block profile will show time spent waiting on `sync.(*Mutex).Lock`, indicating contention.

## Mutex Profiling

Mutex profiling specifically tracks contention on `sync.Mutex` and `sync.RWMutex`. It's useful for understanding lock contention patterns.

### Enabling Mutex Profiling

Like block profiling, mutex profiling requires explicit activation.

```go
package main

import (
    "net/http"
    "runtime"
    _ "net/http/pprof"
)

func main() {
    // Enable mutex profiling
    // The rate is the fraction of mutex contention events reported
    // 1 = report all events
    runtime.SetMutexProfileFraction(1)

    http.ListenAndServe(":8080", nil)
}
```

### Capturing and Analyzing Mutex Profiles

The mutex profile shows where goroutines contend for mutex locks.

```bash
# Capture mutex profile
go tool pprof http://localhost:8080/debug/pprof/mutex

# Analyze contention
(pprof) top
Showing nodes accounting for 2.5s, 100% of 2.5s total
      flat  flat%   sum%        cum   cum%
     2.5s   100%   100%      2.5s   100%  sync.(*Mutex).Unlock
```

### Example: Reducing Lock Contention

Here's an example showing the before and after of reducing lock contention.

```go
package main

import (
    "net/http"
    "runtime"
    "sync"
    _ "net/http/pprof"
)

// BEFORE: Single lock for everything - high contention
type HighContentionCache struct {
    mu    sync.Mutex
    items map[string]string
}

// AFTER: Sharded locks - reduced contention
type ShardedCache struct {
    shards [256]struct {
        mu    sync.RWMutex
        items map[string]string
    }
}

func NewShardedCache() *ShardedCache {
    c := &ShardedCache{}
    for i := range c.shards {
        c.shards[i].items = make(map[string]string)
    }
    return c
}

// Hash key to shard index for even distribution
func (c *ShardedCache) getShard(key string) int {
    hash := 0
    for _, ch := range key {
        hash = 31*hash + int(ch)
    }
    return hash % 256
}

func (c *ShardedCache) Get(key string) (string, bool) {
    shard := c.getShard(key)
    c.shards[shard].mu.RLock()
    defer c.shards[shard].mu.RUnlock()
    val, ok := c.shards[shard].items[key]
    return val, ok
}

func (c *ShardedCache) Set(key, value string) {
    shard := c.getShard(key)
    c.shards[shard].mu.Lock()
    defer c.shards[shard].mu.Unlock()
    c.shards[shard].items[key] = value
}

func main() {
    runtime.SetMutexProfileFraction(1)

    cache := NewShardedCache()

    http.HandleFunc("/get", func(w http.ResponseWriter, r *http.Request) {
        key := r.URL.Query().Get("key")
        val, _ := cache.Get(key)
        w.Write([]byte(val))
    })

    http.HandleFunc("/set", func(w http.ResponseWriter, r *http.Request) {
        key := r.URL.Query().Get("key")
        value := r.URL.Query().Get("value")
        cache.Set(key, value)
        w.Write([]byte("OK"))
    })

    http.ListenAndServe(":8080", nil)
}
```

## Visualizing Profiles

pprof offers several visualization options that make it easier to understand complex profiles.

### Web-based Visualization

The pprof tool can start a web server with interactive visualizations. This is often the most user-friendly way to explore profiles.

```bash
# Start web UI for CPU profile
go tool pprof -http=:9090 http://localhost:8080/debug/pprof/profile

# Start web UI for heap profile
go tool pprof -http=:9090 http://localhost:8080/debug/pprof/heap

# Start web UI for a saved profile
go tool pprof -http=:9090 cpu.prof
```

The web UI provides several views:

- **Top**: Table of top functions
- **Graph**: Call graph visualization
- **Flame Graph**: Interactive flame graph
- **Source**: Source code with annotations
- **Peek**: Statistical peek at function samples

### Flame Graphs

Flame graphs are particularly useful for understanding CPU profiles. The x-axis represents the stack depth, and the width of each bar represents time spent.

```bash
# Generate flame graph (requires web UI)
go tool pprof -http=:9090 cpu.prof
# Then click "Flame Graph" in the web UI

# Or use the standalone flamegraph tool
go tool pprof -raw cpu.prof | flamegraph.pl > cpu_flame.svg
```

### Comparing Profiles

You can compare two profiles to understand changes between them. This is useful for measuring the impact of optimizations.

```bash
# Compare two CPU profiles
go tool pprof -base before.prof after.prof

# Compare with web UI
go tool pprof -http=:9090 -diff_base before.prof after.prof
```

### Generating Reports

The pprof tool can generate various report formats for documentation or sharing.

```bash
# Generate PDF report
go tool pprof -pdf cpu.prof > cpu_report.pdf

# Generate PNG image
go tool pprof -png cpu.prof > cpu_graph.png

# Generate text report
go tool pprof -text cpu.prof > cpu_report.txt

# Generate SVG for web embedding
go tool pprof -svg cpu.prof > cpu_graph.svg
```

## Real-World Profiling Scenarios

Let's look at some complete examples of profiling real-world issues.

### Scenario 1: High CPU Usage in Production

You notice your service CPU usage has spiked. Here's how to diagnose it.

```bash
# Step 1: Capture a CPU profile from the running service
go tool pprof http://production-server:8080/debug/pprof/profile?seconds=30

# Step 2: Identify the hotspots
(pprof) top 20 -cum
(pprof) list suspiciousFunction

# Step 3: Look for patterns
(pprof) web  # Visualize call graph
```

### Scenario 2: Memory Growth Over Time

Your service memory keeps growing, suggesting a leak.

```go
package main

import (
    "net/http"
    "runtime"
    "time"
    _ "net/http/pprof"
)

// Utility function to track memory stats over time
func trackMemory() {
    var m runtime.MemStats
    for {
        runtime.ReadMemStats(&m)
        println("Alloc:", m.Alloc/1024/1024, "MB",
            "TotalAlloc:", m.TotalAlloc/1024/1024, "MB",
            "Sys:", m.Sys/1024/1024, "MB",
            "NumGC:", m.NumGC)
        time.Sleep(10 * time.Second)
    }
}

func main() {
    go trackMemory()
    http.ListenAndServe(":8080", nil)
}
```

Diagnosis process using bash commands:

```bash
# Take baseline heap profile
curl -o heap_baseline.prof http://localhost:8080/debug/pprof/heap

# Wait for memory to grow (simulate traffic)
# ...

# Take another heap profile
curl -o heap_after.prof http://localhost:8080/debug/pprof/heap

# Compare to find what's growing
go tool pprof -http=:9090 -diff_base heap_baseline.prof heap_after.prof
```

### Scenario 3: Complete Profiling Setup

Here's a production-ready setup with all profiling types enabled.

```go
package main

import (
    "context"
    "log"
    "net/http"
    "net/http/pprof"
    "os"
    "os/signal"
    "runtime"
    "syscall"
    "time"
)

func main() {
    // Enable all profiling
    runtime.SetBlockProfileRate(1)
    runtime.SetMutexProfileFraction(1)

    // Set up debug server on separate port
    debugMux := http.NewServeMux()
    debugMux.HandleFunc("/debug/pprof/", pprof.Index)
    debugMux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
    debugMux.HandleFunc("/debug/pprof/profile", pprof.Profile)
    debugMux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
    debugMux.HandleFunc("/debug/pprof/trace", pprof.Trace)

    // Health check endpoint for the debug server
    debugMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })

    debugServer := &http.Server{
        Addr:    "localhost:6060",
        Handler: debugMux,
    }

    go func() {
        log.Println("Debug server starting on localhost:6060")
        if err := debugServer.ListenAndServe(); err != http.ErrServerClosed {
            log.Printf("Debug server error: %v", err)
        }
    }()

    // Main application server
    mainMux := http.NewServeMux()
    mainMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello, World!"))
    })

    mainServer := &http.Server{
        Addr:    ":8080",
        Handler: mainMux,
    }

    // Graceful shutdown handling
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
        <-sigChan

        log.Println("Shutting down servers...")
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        mainServer.Shutdown(ctx)
        debugServer.Shutdown(ctx)
    }()

    log.Println("Main server starting on :8080")
    if err := mainServer.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Main server error: %v", err)
    }
}
```

## Best Practices

### 1. Profile in Production-Like Environments

Development environments often behave differently from production. When possible, profile in staging or production with real traffic patterns.

### 2. Take Baseline Profiles

Before optimizing, capture baseline profiles. This allows you to measure improvement and avoid regressions.

```bash
# Create a profiling session directory
mkdir -p profiles/$(date +%Y%m%d)

# Capture all profile types
curl -o profiles/$(date +%Y%m%d)/cpu.prof \
    http://localhost:8080/debug/pprof/profile?seconds=30
curl -o profiles/$(date +%Y%m%d)/heap.prof \
    http://localhost:8080/debug/pprof/heap
curl -o profiles/$(date +%Y%m%d)/goroutine.prof \
    http://localhost:8080/debug/pprof/goroutine
```

### 3. Security Considerations

Never expose pprof endpoints publicly in production. They can leak sensitive information about your application.

```go
// Good: Listen only on localhost
http.ListenAndServe("localhost:6060", debugMux)

// Better: Use authentication middleware
debugMux.Handle("/debug/pprof/", authMiddleware(http.HandlerFunc(pprof.Index)))
```

### 4. Automate Profile Collection

Set up automated profile collection for production incidents.

```go
// Trigger profile collection on high memory usage
func monitorMemory(threshold uint64) {
    var m runtime.MemStats
    for {
        runtime.ReadMemStats(&m)
        if m.Alloc > threshold {
            saveProfiles("high_memory_" + time.Now().Format("20060102_150405"))
        }
        time.Sleep(1 * time.Minute)
    }
}
```

### 5. Use Continuous Profiling

Consider using continuous profiling tools that integrate with pprof:

- Google Cloud Profiler
- Datadog Continuous Profiler
- Pyroscope
- Parca

These tools collect profiles continuously and provide historical analysis.

### 6. Profile Sampling Considerations

Adjust sampling rates based on your needs:

```go
// Lower overhead for production (less detailed)
runtime.SetBlockProfileRate(100)    // Sample 1% of events
runtime.SetMutexProfileFraction(100)

// Higher detail for debugging (more overhead)
runtime.SetBlockProfileRate(1)      // Sample all events
runtime.SetMutexProfileFraction(1)
```

## Conclusion

Go's pprof is an incredibly powerful tool for understanding and optimizing your application's performance. By mastering CPU, memory, goroutine, block, and mutex profiling, you can:

- Identify and eliminate performance bottlenecks
- Find and fix memory leaks
- Debug goroutine issues and deadlocks
- Reduce contention and improve concurrency

Remember to profile regularly, especially before and after significant changes. Make profiling part of your development workflow, and you'll catch performance issues before they reach production.

The key to effective profiling is practice. Start by adding pprof endpoints to your applications today, and make it a habit to explore the profiles your applications generate. Over time, you'll develop an intuition for spotting performance issues and understanding Go's runtime behavior.

## Additional Resources

- [Go Blog: Profiling Go Programs](https://go.dev/blog/pprof)
- [runtime/pprof Package Documentation](https://pkg.go.dev/runtime/pprof)
- [net/http/pprof Package Documentation](https://pkg.go.dev/net/http/pprof)
- [Go Diagnostics Documentation](https://go.dev/doc/diagnostics)
