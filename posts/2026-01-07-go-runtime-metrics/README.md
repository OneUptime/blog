# How to Monitor Go Runtime Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Metrics, Runtime, Monitoring, Performance, Observability

Description: Monitor Go runtime metrics including goroutine counts, garbage collection stats, and memory allocation for production observability.

---

## Introduction

Go's runtime provides a wealth of information about your application's internal state. Understanding and monitoring these metrics is crucial for maintaining healthy, performant applications in production. From goroutine counts that reveal concurrency patterns to garbage collection statistics that indicate memory pressure, runtime metrics offer deep insights into your application's behavior.

In this comprehensive guide, we will explore how to collect, expose, and alert on Go runtime metrics. We will cover the built-in `runtime` package, integration with Prometheus for metrics exposition, and OpenTelemetry for modern observability pipelines. By the end, you will have a complete understanding of which metrics matter most and how to instrument your Go applications effectively.

## Understanding Go Runtime Metrics

The Go runtime manages several critical aspects of your application:

- **Memory allocation and garbage collection**: The runtime allocates memory from the heap and periodically reclaims unused memory through garbage collection.
- **Goroutine scheduling**: The runtime scheduler manages goroutines across OS threads, handling context switching and work stealing.
- **Stack management**: Each goroutine has its own stack that can grow and shrink dynamically.

These internal operations generate metrics that reveal the health and performance characteristics of your application.

## The runtime Package Basics

Go's standard library provides the `runtime` package, which exposes functions to query various runtime statistics. Let's start with the fundamental APIs.

### Basic Runtime Information

This code demonstrates how to retrieve basic runtime information including the number of CPUs, goroutines, and Go version.

```go
package main

import (
    "fmt"
    "runtime"
)

func main() {
    // NumCPU returns the number of logical CPUs usable by the current process
    fmt.Printf("Number of CPUs: %d\n", runtime.NumCPU())

    // GOMAXPROCS returns the current value of GOMAXPROCS
    // This determines the maximum number of CPUs that can execute simultaneously
    fmt.Printf("GOMAXPROCS: %d\n", runtime.GOMAXPROCS(0))

    // NumGoroutine returns the number of goroutines that currently exist
    fmt.Printf("Number of Goroutines: %d\n", runtime.NumGoroutine())

    // Version returns the Go version string
    fmt.Printf("Go Version: %s\n", runtime.Version())

    // GOOS and GOARCH provide the operating system and architecture
    fmt.Printf("OS/Arch: %s/%s\n", runtime.GOOS, runtime.GOARCH)
}
```

### Understanding NumGoroutine

The `runtime.NumGoroutine()` function is one of the most important metrics for Go applications. It returns the total number of goroutines, including the main goroutine.

This example shows how to track goroutine count over time to detect potential leaks.

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func main() {
    // Record initial goroutine count
    initial := runtime.NumGoroutine()
    fmt.Printf("Initial goroutines: %d\n", initial)

    // Spawn some worker goroutines
    done := make(chan bool)
    for i := 0; i < 10; i++ {
        go func(id int) {
            time.Sleep(2 * time.Second)
            done <- true
        }(i)
    }

    // Check goroutine count after spawning workers
    afterSpawn := runtime.NumGoroutine()
    fmt.Printf("After spawning workers: %d\n", afterSpawn)

    // Wait for all workers to complete
    for i := 0; i < 10; i++ {
        <-done
    }

    // Give the runtime a moment to clean up
    time.Sleep(100 * time.Millisecond)

    // Check final count - should be back to initial
    final := runtime.NumGoroutine()
    fmt.Printf("Final goroutines: %d\n", final)

    // Detect potential goroutine leak
    if final > initial {
        fmt.Printf("WARNING: Potential goroutine leak detected! Leaked: %d\n", final-initial)
    }
}
```

## Deep Dive into runtime.ReadMemStats

The `runtime.ReadMemStats` function populates a `runtime.MemStats` structure with detailed memory statistics. This is the primary way to understand your application's memory behavior.

### Basic Memory Statistics

This code retrieves and displays the most commonly used memory statistics.

```go
package main

import (
    "fmt"
    "runtime"
)

func formatBytes(bytes uint64) string {
    const unit = 1024
    if bytes < unit {
        return fmt.Sprintf("%d B", bytes)
    }
    div, exp := uint64(unit), 0
    for n := bytes / unit; n >= unit; n /= unit {
        div *= unit
        exp++
    }
    return fmt.Sprintf("%.2f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func main() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    // Alloc is the bytes of allocated heap objects
    // This is the most commonly monitored memory metric
    fmt.Printf("Alloc (heap in use): %s\n", formatBytes(m.Alloc))

    // TotalAlloc is the cumulative bytes allocated for heap objects
    // This value only increases, never decreases
    fmt.Printf("TotalAlloc (cumulative): %s\n", formatBytes(m.TotalAlloc))

    // Sys is the total bytes of memory obtained from the OS
    // This includes heap, stacks, and other runtime structures
    fmt.Printf("Sys (total from OS): %s\n", formatBytes(m.Sys))

    // NumGC is the number of completed GC cycles
    fmt.Printf("NumGC (GC cycles): %d\n", m.NumGC)

    // HeapAlloc is the same as Alloc - bytes of allocated heap objects
    fmt.Printf("HeapAlloc: %s\n", formatBytes(m.HeapAlloc))

    // HeapSys is the bytes of heap memory obtained from the OS
    fmt.Printf("HeapSys: %s\n", formatBytes(m.HeapSys))

    // HeapIdle is bytes in idle (unused) spans
    fmt.Printf("HeapIdle: %s\n", formatBytes(m.HeapIdle))

    // HeapInuse is bytes in in-use spans
    fmt.Printf("HeapInuse: %s\n", formatBytes(m.HeapInuse))

    // HeapReleased is bytes of physical memory returned to the OS
    fmt.Printf("HeapReleased: %s\n", formatBytes(m.HeapReleased))

    // HeapObjects is the number of allocated heap objects
    fmt.Printf("HeapObjects: %d\n", m.HeapObjects)
}
```

### Understanding Heap Metrics in Detail

The heap metrics deserve special attention as they reveal memory allocation patterns.

This example provides a comprehensive view of heap statistics with explanations.

```go
package main

import (
    "fmt"
    "runtime"
)

func formatBytes(bytes uint64) string {
    const unit = 1024
    if bytes < unit {
        return fmt.Sprintf("%d B", bytes)
    }
    div, exp := uint64(unit), 0
    for n := bytes / unit; n >= unit; n /= unit {
        div *= unit
        exp++
    }
    return fmt.Sprintf("%.2f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func analyzeHeap() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Println("=== Heap Analysis ===")

    // HeapSys: Total heap memory obtained from OS
    // This is the "virtual" size of the heap
    fmt.Printf("HeapSys (virtual heap size): %s\n", formatBytes(m.HeapSys))

    // HeapAlloc: Currently allocated and in-use heap memory
    // This is what your application is actively using
    fmt.Printf("HeapAlloc (active allocations): %s\n", formatBytes(m.HeapAlloc))

    // HeapIdle: Memory that was allocated but is now free
    // Available for future allocations without asking OS for more
    fmt.Printf("HeapIdle (free but retained): %s\n", formatBytes(m.HeapIdle))

    // HeapInuse: Memory in active spans
    // May include some fragmentation overhead
    fmt.Printf("HeapInuse (spans with objects): %s\n", formatBytes(m.HeapInuse))

    // HeapReleased: Memory returned to OS
    // Part of HeapIdle that has been released
    fmt.Printf("HeapReleased (returned to OS): %s\n", formatBytes(m.HeapReleased))

    // Calculate heap efficiency
    // How much of the heap is actually being used
    if m.HeapSys > 0 {
        efficiency := float64(m.HeapAlloc) / float64(m.HeapSys) * 100
        fmt.Printf("Heap Efficiency: %.2f%%\n", efficiency)
    }

    // Calculate fragmentation indicator
    // High fragmentation means HeapInuse >> HeapAlloc
    if m.HeapAlloc > 0 {
        fragmentation := float64(m.HeapInuse-m.HeapAlloc) / float64(m.HeapAlloc) * 100
        fmt.Printf("Fragmentation Overhead: %.2f%%\n", fragmentation)
    }

    // HeapObjects: Count of live objects
    fmt.Printf("Live Objects: %d\n", m.HeapObjects)

    // Average object size
    if m.HeapObjects > 0 {
        avgSize := m.HeapAlloc / m.HeapObjects
        fmt.Printf("Average Object Size: %s\n", formatBytes(avgSize))
    }
}

func main() {
    // Allocate some memory to see interesting stats
    data := make([][]byte, 1000)
    for i := range data {
        data[i] = make([]byte, 1024) // 1KB each
    }

    analyzeHeap()

    // Keep data alive to prevent GC from collecting it
    _ = data
}
```

### Stack and Other Memory Statistics

Beyond heap memory, the runtime tracks stack usage and other internal memory structures.

This code shows how to monitor stack and non-heap memory usage.

```go
package main

import (
    "fmt"
    "runtime"
    "sync"
)

func formatBytes(bytes uint64) string {
    const unit = 1024
    if bytes < unit {
        return fmt.Sprintf("%d B", bytes)
    }
    div, exp := uint64(unit), 0
    for n := bytes / unit; n >= unit; n /= unit {
        div *= unit
        exp++
    }
    return fmt.Sprintf("%.2f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func analyzeNonHeapMemory() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Println("=== Stack and System Memory ===")

    // StackInuse: Bytes in stack spans
    // Each goroutine has its own stack (starting at 2KB, can grow)
    fmt.Printf("StackInuse: %s\n", formatBytes(m.StackInuse))

    // StackSys: Bytes of stack memory obtained from OS
    fmt.Printf("StackSys: %s\n", formatBytes(m.StackSys))

    // MSpanInuse: Bytes of allocated mspan structures
    // mspans track memory spans in the allocator
    fmt.Printf("MSpanInuse: %s\n", formatBytes(m.MSpanInuse))

    // MSpanSys: Bytes of memory obtained from OS for mspan structures
    fmt.Printf("MSpanSys: %s\n", formatBytes(m.MSpanSys))

    // MCacheInuse: Bytes of allocated mcache structures
    // mcache is a per-P cache of small objects
    fmt.Printf("MCacheInuse: %s\n", formatBytes(m.MCacheInuse))

    // MCacheSys: Bytes of memory obtained from OS for mcache
    fmt.Printf("MCacheSys: %s\n", formatBytes(m.MCacheSys))

    // BuckHashSys: Bytes of memory in profiling bucket hash tables
    fmt.Printf("BuckHashSys: %s\n", formatBytes(m.BuckHashSys))

    // GCSys: Bytes of memory in garbage collection metadata
    fmt.Printf("GCSys: %s\n", formatBytes(m.GCSys))

    // OtherSys: Bytes of memory in miscellaneous off-heap runtime allocations
    fmt.Printf("OtherSys: %s\n", formatBytes(m.OtherSys))

    // Calculate per-goroutine stack usage
    numGoroutines := runtime.NumGoroutine()
    if numGoroutines > 0 {
        avgStack := m.StackInuse / uint64(numGoroutines)
        fmt.Printf("Average Stack per Goroutine: %s\n", formatBytes(avgStack))
    }
}

func main() {
    // Spawn goroutines to see stack usage
    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            // Use some stack space
            var buf [4096]byte
            _ = buf
            // Block to keep goroutine alive
            select {}
        }()
    }

    // Give goroutines time to start
    runtime.Gosched()

    fmt.Printf("Active Goroutines: %d\n", runtime.NumGoroutine())
    analyzeNonHeapMemory()
}
```

## Garbage Collection Metrics

Understanding garbage collection behavior is essential for performance tuning. The runtime provides detailed GC statistics.

### Basic GC Statistics

This code demonstrates how to retrieve and interpret garbage collection statistics.

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func formatBytes(bytes uint64) string {
    const unit = 1024
    if bytes < unit {
        return fmt.Sprintf("%d B", bytes)
    }
    div, exp := uint64(unit), 0
    for n := bytes / unit; n >= unit; n /= unit {
        div *= unit
        exp++
    }
    return fmt.Sprintf("%.2f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func analyzeGC() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Println("=== Garbage Collection Statistics ===")

    // NumGC: Number of completed GC cycles
    fmt.Printf("Completed GC Cycles: %d\n", m.NumGC)

    // NumForcedGC: Number of GC cycles forced by runtime.GC()
    fmt.Printf("Forced GC Cycles: %d\n", m.NumForcedGC)

    // LastGC: Nanosecond timestamp of last GC
    if m.LastGC > 0 {
        lastGCTime := time.Unix(0, int64(m.LastGC))
        fmt.Printf("Last GC: %s\n", lastGCTime.Format(time.RFC3339))
        fmt.Printf("Time Since Last GC: %s\n", time.Since(lastGCTime))
    }

    // PauseTotalNs: Cumulative nanoseconds in GC stop-the-world pauses
    fmt.Printf("Total GC Pause Time: %s\n", time.Duration(m.PauseTotalNs))

    // Average pause time
    if m.NumGC > 0 {
        avgPause := time.Duration(m.PauseTotalNs / uint64(m.NumGC))
        fmt.Printf("Average GC Pause: %s\n", avgPause)
    }

    // GCCPUFraction: Fraction of CPU time used by GC
    // This is a value between 0 and 1
    fmt.Printf("GC CPU Fraction: %.4f%%\n", m.GCCPUFraction*100)

    // NextGC: Target heap size for next GC cycle
    fmt.Printf("Next GC Target: %s\n", formatBytes(m.NextGC))

    // Mallocs and Frees
    fmt.Printf("Total Mallocs: %d\n", m.Mallocs)
    fmt.Printf("Total Frees: %d\n", m.Frees)
    fmt.Printf("Live Objects (Mallocs - Frees): %d\n", m.Mallocs-m.Frees)
}

func main() {
    // Allocate memory to trigger GC
    for i := 0; i < 10; i++ {
        data := make([]byte, 10*1024*1024) // 10MB
        _ = data
    }

    // Force a GC to get meaningful stats
    runtime.GC()

    analyzeGC()
}
```

### Analyzing GC Pause Distribution

The runtime keeps a circular buffer of the most recent GC pause times, which helps understand pause distribution.

This code shows how to analyze the distribution of GC pause times.

```go
package main

import (
    "fmt"
    "runtime"
    "sort"
    "time"
)

func analyzeGCPauses() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Println("=== GC Pause Analysis ===")

    // PauseNs is a circular buffer of recent GC pause times
    // The most recent is at index (NumGC+255) % 256

    if m.NumGC == 0 {
        fmt.Println("No GC cycles completed yet")
        return
    }

    // Collect all non-zero pause times
    var pauses []time.Duration
    numPauses := int(m.NumGC)
    if numPauses > 256 {
        numPauses = 256 // Only last 256 are stored
    }

    for i := 0; i < numPauses; i++ {
        idx := int((m.NumGC - uint32(i) - 1 + 256) % 256)
        pause := time.Duration(m.PauseNs[idx])
        if pause > 0 {
            pauses = append(pauses, pause)
        }
    }

    if len(pauses) == 0 {
        fmt.Println("No pause data available")
        return
    }

    // Sort for percentile calculation
    sort.Slice(pauses, func(i, j int) bool {
        return pauses[i] < pauses[j]
    })

    // Calculate statistics
    var total time.Duration
    for _, p := range pauses {
        total += p
    }

    fmt.Printf("Number of Recorded Pauses: %d\n", len(pauses))
    fmt.Printf("Min Pause: %s\n", pauses[0])
    fmt.Printf("Max Pause: %s\n", pauses[len(pauses)-1])
    fmt.Printf("Avg Pause: %s\n", total/time.Duration(len(pauses)))

    // Percentiles
    p50 := pauses[len(pauses)*50/100]
    p90 := pauses[len(pauses)*90/100]
    p99 := pauses[len(pauses)*99/100]

    fmt.Printf("P50 Pause: %s\n", p50)
    fmt.Printf("P90 Pause: %s\n", p90)
    fmt.Printf("P99 Pause: %s\n", p99)

    // PauseEnd contains timestamps when each pause ended
    // Useful for correlating pauses with application events
    lastPauseEnd := time.Unix(0, int64(m.PauseEnd[(m.NumGC+255)%256]))
    fmt.Printf("Last Pause Ended: %s\n", lastPauseEnd.Format(time.RFC3339Nano))
}

func main() {
    // Generate some GC activity
    for i := 0; i < 20; i++ {
        data := make([]byte, 5*1024*1024)
        _ = data
        runtime.GC()
    }

    analyzeGCPauses()
}
```

### GC Tuning Indicators

These metrics help identify when GC tuning might be beneficial.

This code provides indicators for GC tuning decisions.

```go
package main

import (
    "fmt"
    "os"
    "runtime"
    "runtime/debug"
    "time"
)

func formatBytes(bytes uint64) string {
    const unit = 1024
    if bytes < unit {
        return fmt.Sprintf("%d B", bytes)
    }
    div, exp := uint64(unit), 0
    for n := bytes / unit; n >= unit; n /= unit {
        div *= unit
        exp++
    }
    return fmt.Sprintf("%.2f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func gcTuningReport() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Println("=== GC Tuning Report ===")

    // Current GOGC setting (default is 100)
    // GOGC=100 means GC triggers when heap grows to 2x the live heap
    gcPercent := debug.SetGCPercent(-1)
    debug.SetGCPercent(gcPercent) // Restore the value
    if gcPercent < 0 {
        fmt.Println("GOGC: off (GC disabled)")
    } else {
        fmt.Printf("GOGC: %d%%\n", gcPercent)
    }

    // Memory limit (Go 1.19+)
    memLimit := debug.SetMemoryLimit(-1)
    if memLimit == 9223372036854775807 { // MaxInt64
        fmt.Println("GOMEMLIMIT: not set")
    } else {
        fmt.Printf("GOMEMLIMIT: %s\n", formatBytes(uint64(memLimit)))
    }

    // GC frequency indicator
    // High NumGC with low heap might indicate GC is too aggressive
    if m.NumGC > 0 {
        avgHeapBetweenGC := m.TotalAlloc / uint64(m.NumGC)
        fmt.Printf("Average Allocation per GC Cycle: %s\n", formatBytes(avgHeapBetweenGC))
    }

    // GC overhead
    // High GCCPUFraction (>5%) might indicate too much GC
    fmt.Printf("GC CPU Overhead: %.2f%%\n", m.GCCPUFraction*100)

    if m.GCCPUFraction > 0.05 {
        fmt.Println("WARNING: GC overhead is high (>5%)")
        fmt.Println("Consider: Increasing GOGC or reducing allocation rate")
    }

    // Heap growth ratio
    if m.HeapAlloc > 0 && m.NextGC > 0 {
        growthRatio := float64(m.NextGC) / float64(m.HeapAlloc)
        fmt.Printf("Heap Growth Ratio (NextGC/HeapAlloc): %.2fx\n", growthRatio)
    }

    // Memory retention
    // High HeapIdle vs HeapInuse might indicate memory being held unnecessarily
    if m.HeapInuse > 0 {
        retentionRatio := float64(m.HeapIdle) / float64(m.HeapInuse)
        fmt.Printf("Idle/Inuse Ratio: %.2f\n", retentionRatio)

        if retentionRatio > 2.0 {
            fmt.Println("INFO: High idle memory ratio")
            fmt.Println("Consider: debug.FreeOSMemory() to release memory to OS")
        }
    }

    // Pause time recommendations
    if m.NumGC > 0 {
        avgPause := time.Duration(m.PauseTotalNs / uint64(m.NumGC))
        if avgPause > 1*time.Millisecond {
            fmt.Printf("WARNING: Average GC pause (%.2fms) exceeds 1ms\n",
                float64(avgPause)/float64(time.Millisecond))
            fmt.Println("Consider: Reducing heap size or live object count")
        }
    }
}

func main() {
    // Set GOGC if environment variable exists
    if gogc := os.Getenv("GOGC"); gogc != "" {
        fmt.Printf("GOGC from environment: %s\n", gogc)
    }

    // Allocate some memory
    data := make([][]byte, 1000)
    for i := range data {
        data[i] = make([]byte, 10*1024)
    }

    runtime.GC()

    gcTuningReport()

    _ = data
}
```

## Exposing Metrics via Prometheus

Prometheus is the de facto standard for metrics collection in cloud-native environments. Let's integrate Go runtime metrics with Prometheus.

### Setting Up the Prometheus Client

This example shows how to set up a basic Prometheus metrics endpoint.

```go
package main

import (
    "log"
    "net/http"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    // Create a new registry
    // Using a custom registry gives us more control over what metrics are exposed
    registry := prometheus.NewRegistry()

    // Register the default Go collector
    // This automatically exposes runtime metrics like:
    // - go_goroutines
    // - go_gc_duration_seconds
    // - go_memstats_* (all memory statistics)
    registry.MustRegister(prometheus.NewGoCollector())

    // Register the process collector for OS-level metrics
    // This exposes metrics like:
    // - process_cpu_seconds_total
    // - process_resident_memory_bytes
    // - process_open_fds
    registry.MustRegister(prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}))

    // Create a handler with our custom registry
    handler := promhttp.HandlerFor(registry, promhttp.HandlerOpts{
        EnableOpenMetrics: true, // Enable OpenMetrics format
    })

    // Expose metrics endpoint
    http.Handle("/metrics", handler)

    log.Println("Starting server on :8080")
    log.Println("Metrics available at http://localhost:8080/metrics")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Default Go Collector Metrics

When you register the Go collector, Prometheus exposes these key metrics:

```
# Goroutine count
go_goroutines

# GC duration histogram (in seconds)
go_gc_duration_seconds{quantile="0"}
go_gc_duration_seconds{quantile="0.25"}
go_gc_duration_seconds{quantile="0.5"}
go_gc_duration_seconds{quantile="0.75"}
go_gc_duration_seconds{quantile="1"}
go_gc_duration_seconds_count
go_gc_duration_seconds_sum

# Memory statistics (in bytes)
go_memstats_alloc_bytes            # Current heap allocation
go_memstats_alloc_bytes_total      # Cumulative allocations
go_memstats_sys_bytes              # Total memory from OS
go_memstats_heap_alloc_bytes       # Heap allocation
go_memstats_heap_sys_bytes         # Heap memory from OS
go_memstats_heap_idle_bytes        # Idle heap memory
go_memstats_heap_inuse_bytes       # In-use heap memory
go_memstats_heap_released_bytes    # Memory released to OS
go_memstats_heap_objects           # Number of heap objects
go_memstats_stack_inuse_bytes      # Stack memory in use
go_memstats_stack_sys_bytes        # Stack memory from OS
go_memstats_gc_sys_bytes           # GC metadata memory
go_memstats_next_gc_bytes          # Target heap for next GC
go_memstats_last_gc_time_seconds   # Timestamp of last GC

# GC statistics
go_memstats_gc_cpu_fraction        # Fraction of CPU used by GC
go_memstats_frees_total            # Total number of frees
go_memstats_mallocs_total          # Total number of mallocs

# Thread count
go_threads                         # Number of OS threads
```

### Custom Runtime Metrics

Sometimes you need additional metrics beyond what the default collector provides.

This code demonstrates how to create custom runtime metrics.

```go
package main

import (
    "log"
    "net/http"
    "runtime"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// RuntimeCollector collects additional Go runtime metrics
type RuntimeCollector struct {
    goroutines *prometheus.Desc
    cgoCalls   *prometheus.Desc
    gcPauseNs  *prometheus.Desc
    heapEfficiency *prometheus.Desc
}

// NewRuntimeCollector creates a new RuntimeCollector
func NewRuntimeCollector() *RuntimeCollector {
    return &RuntimeCollector{
        goroutines: prometheus.NewDesc(
            "go_goroutines_detailed",
            "Number of goroutines with additional labels",
            nil, nil,
        ),
        cgoCalls: prometheus.NewDesc(
            "go_cgo_calls_total",
            "Total number of cgo calls",
            nil, nil,
        ),
        gcPauseNs: prometheus.NewDesc(
            "go_gc_pause_ns_recent",
            "Most recent GC pause duration in nanoseconds",
            nil, nil,
        ),
        heapEfficiency: prometheus.NewDesc(
            "go_heap_efficiency_ratio",
            "Ratio of HeapAlloc to HeapSys (0-1)",
            nil, nil,
        ),
    }
}

// Describe implements prometheus.Collector
func (c *RuntimeCollector) Describe(ch chan<- *prometheus.Desc) {
    ch <- c.goroutines
    ch <- c.cgoCalls
    ch <- c.gcPauseNs
    ch <- c.heapEfficiency
}

// Collect implements prometheus.Collector
func (c *RuntimeCollector) Collect(ch chan<- prometheus.Metric) {
    // Goroutine count
    ch <- prometheus.MustNewConstMetric(
        c.goroutines,
        prometheus.GaugeValue,
        float64(runtime.NumGoroutine()),
    )

    // CGO calls (useful for applications using C libraries)
    ch <- prometheus.MustNewConstMetric(
        c.cgoCalls,
        prometheus.CounterValue,
        float64(runtime.NumCgoCall()),
    )

    // Memory statistics
    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    // Most recent GC pause
    if m.NumGC > 0 {
        idx := (m.NumGC + 255) % 256
        ch <- prometheus.MustNewConstMetric(
            c.gcPauseNs,
            prometheus.GaugeValue,
            float64(m.PauseNs[idx]),
        )
    }

    // Heap efficiency
    if m.HeapSys > 0 {
        efficiency := float64(m.HeapAlloc) / float64(m.HeapSys)
        ch <- prometheus.MustNewConstMetric(
            c.heapEfficiency,
            prometheus.GaugeValue,
            efficiency,
        )
    }
}

func main() {
    registry := prometheus.NewRegistry()

    // Register default collectors
    registry.MustRegister(prometheus.NewGoCollector())
    registry.MustRegister(prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}))

    // Register our custom collector
    registry.MustRegister(NewRuntimeCollector())

    // Start a background goroutine to generate some activity
    go func() {
        for {
            data := make([]byte, 1024*1024)
            _ = data
            time.Sleep(100 * time.Millisecond)
        }
    }()

    handler := promhttp.HandlerFor(registry, promhttp.HandlerOpts{})
    http.Handle("/metrics", handler)

    log.Println("Custom runtime metrics available at http://localhost:8080/metrics")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Prometheus Alerting Rules

Here are essential alerting rules for Go runtime metrics.

This Prometheus alerting rules file covers critical runtime conditions.

```yaml
# prometheus-rules.yml
groups:
  - name: go_runtime_alerts
    rules:
      # Alert on goroutine leak
      # Sustained high goroutine count often indicates a leak
      - alert: GoroutineLeak
        expr: go_goroutines > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High goroutine count detected"
          description: "Instance {{ $labels.instance }} has {{ $value }} goroutines"

      # Alert on goroutine explosion
      - alert: GoroutineExplosion
        expr: go_goroutines > 50000
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical goroutine count"
          description: "Instance {{ $labels.instance }} has {{ $value }} goroutines"

      # Alert on high memory usage
      - alert: HighMemoryUsage
        expr: go_memstats_alloc_bytes > 1073741824  # 1GB
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High heap memory usage"
          description: "Instance {{ $labels.instance }} using {{ $value | humanize }} heap"

      # Alert on high GC pause time
      - alert: HighGCPauseTime
        expr: go_gc_duration_seconds{quantile="0.75"} > 0.001  # 1ms
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High GC pause times"
          description: "P75 GC pause is {{ $value | humanizeDuration }}"

      # Alert on high GC CPU usage
      - alert: HighGCCPUUsage
        expr: go_memstats_gc_cpu_fraction > 0.05  # 5%
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GC consuming high CPU"
          description: "GC using {{ $value | humanizePercentage }} of CPU"

      # Alert on rapid goroutine growth
      - alert: RapidGoroutineGrowth
        expr: rate(go_goroutines[5m]) > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Goroutines growing rapidly"
          description: "Goroutines growing at {{ $value }}/sec"

      # Alert on memory not being released
      - alert: MemoryNotReleased
        expr: (go_memstats_heap_idle_bytes - go_memstats_heap_released_bytes) > 536870912  # 512MB
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "Significant idle memory not released to OS"
          description: "{{ $value | humanize }} idle but retained"
```

## OpenTelemetry Runtime Instrumentation

OpenTelemetry provides a vendor-neutral approach to observability. Let's explore how to expose Go runtime metrics using OpenTelemetry.

### Basic OpenTelemetry Setup

This example shows how to set up OpenTelemetry with Go runtime instrumentation.

```go
package main

import (
    "context"
    "log"
    "net/http"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/prometheus"
    "go.opentelemetry.io/otel/sdk/metric"

    "go.opentelemetry.io/contrib/instrumentation/runtime"
)

func main() {
    ctx := context.Background()

    // Create a Prometheus exporter
    // This allows OpenTelemetry metrics to be scraped by Prometheus
    exporter, err := prometheus.New()
    if err != nil {
        log.Fatalf("Failed to create Prometheus exporter: %v", err)
    }

    // Create a MeterProvider with the Prometheus exporter
    provider := metric.NewMeterProvider(metric.WithReader(exporter))
    otel.SetMeterProvider(provider)

    // Start the runtime instrumentation
    // This automatically collects Go runtime metrics
    err = runtime.Start(
        runtime.WithMinimumReadMemStatsInterval(time.Second),
    )
    if err != nil {
        log.Fatalf("Failed to start runtime instrumentation: %v", err)
    }

    // Expose the metrics endpoint
    http.Handle("/metrics", exporter)

    log.Println("OpenTelemetry metrics available at http://localhost:8080/metrics")
    log.Fatal(http.ListenAndServe(":8080", nil))

    _ = ctx
}
```

### OpenTelemetry Runtime Metrics

The OpenTelemetry runtime instrumentation exposes these metrics:

```
# Memory metrics
runtime.go.mem.heap_alloc         # Heap bytes allocated
runtime.go.mem.heap_idle          # Heap bytes idle
runtime.go.mem.heap_inuse         # Heap bytes in use
runtime.go.mem.heap_objects       # Number of heap objects
runtime.go.mem.heap_released      # Heap bytes released to OS
runtime.go.mem.heap_sys           # Heap bytes obtained from OS
runtime.go.mem.live_objects       # Number of live objects

# GC metrics
runtime.go.gc.count               # Number of completed GC cycles
runtime.go.gc.pause_ns            # GC pause time histogram
runtime.go.gc.pause_total_ns      # Cumulative GC pause time

# Goroutine metrics
runtime.go.goroutines             # Number of goroutines

# CGO metrics
runtime.go.cgo.calls              # Number of CGO calls
```

### Custom OpenTelemetry Metrics

You can add custom metrics alongside the automatic runtime instrumentation.

This code demonstrates creating custom OpenTelemetry metrics for additional runtime observations.

```go
package main

import (
    "context"
    "log"
    "net/http"
    "runtime"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/prometheus"
    "go.opentelemetry.io/otel/metric"
    otelmetric "go.opentelemetry.io/otel/sdk/metric"

    runtimeinstr "go.opentelemetry.io/contrib/instrumentation/runtime"
)

func main() {
    ctx := context.Background()

    // Create Prometheus exporter
    exporter, err := prometheus.New()
    if err != nil {
        log.Fatalf("Failed to create exporter: %v", err)
    }

    // Create MeterProvider
    provider := otelmetric.NewMeterProvider(otelmetric.WithReader(exporter))
    otel.SetMeterProvider(provider)

    // Start automatic runtime instrumentation
    err = runtimeinstr.Start(runtimeinstr.WithMinimumReadMemStatsInterval(time.Second))
    if err != nil {
        log.Fatalf("Failed to start runtime instrumentation: %v", err)
    }

    // Create a meter for custom metrics
    meter := otel.Meter("custom-runtime-metrics")

    // Create a gauge for heap efficiency
    heapEfficiency, err := meter.Float64ObservableGauge(
        "go.heap.efficiency",
        metric.WithDescription("Ratio of heap allocation to heap system memory"),
        metric.WithUnit("1"),
    )
    if err != nil {
        log.Fatalf("Failed to create heap efficiency gauge: %v", err)
    }

    // Create a gauge for GC overhead estimate
    gcOverhead, err := meter.Float64ObservableGauge(
        "go.gc.overhead",
        metric.WithDescription("Estimated GC overhead as fraction of CPU"),
        metric.WithUnit("1"),
    )
    if err != nil {
        log.Fatalf("Failed to create GC overhead gauge: %v", err)
    }

    // Create a gauge for stack usage per goroutine
    stackPerGoroutine, err := meter.Int64ObservableGauge(
        "go.stack.per_goroutine",
        metric.WithDescription("Average stack bytes per goroutine"),
        metric.WithUnit("By"),
    )
    if err != nil {
        log.Fatalf("Failed to create stack gauge: %v", err)
    }

    // Register callback to collect custom metrics
    _, err = meter.RegisterCallback(
        func(ctx context.Context, o metric.Observer) error {
            var m runtime.MemStats
            runtime.ReadMemStats(&m)

            // Heap efficiency
            if m.HeapSys > 0 {
                efficiency := float64(m.HeapAlloc) / float64(m.HeapSys)
                o.ObserveFloat64(heapEfficiency, efficiency)
            }

            // GC overhead
            o.ObserveFloat64(gcOverhead, m.GCCPUFraction)

            // Stack per goroutine
            numGoroutines := runtime.NumGoroutine()
            if numGoroutines > 0 {
                avgStack := int64(m.StackInuse) / int64(numGoroutines)
                o.ObserveInt64(stackPerGoroutine, avgStack,
                    metric.WithAttributes(attribute.Int("goroutines", numGoroutines)))
            }

            return nil
        },
        heapEfficiency,
        gcOverhead,
        stackPerGoroutine,
    )
    if err != nil {
        log.Fatalf("Failed to register callback: %v", err)
    }

    // Expose metrics
    http.Handle("/metrics", exporter)

    log.Println("Custom OpenTelemetry metrics at http://localhost:8080/metrics")
    log.Fatal(http.ListenAndServe(":8080", nil))

    _ = ctx
}
```

### Sending to OpenTelemetry Collector

For production deployments, you typically send metrics to an OpenTelemetry Collector.

This example configures OpenTelemetry to export metrics via OTLP.

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"

    runtimeinstr "go.opentelemetry.io/contrib/instrumentation/runtime"
)

func main() {
    ctx := context.Background()

    // Create OTLP exporter
    // This sends metrics to an OpenTelemetry Collector via gRPC
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("localhost:4317"),
        otlpmetricgrpc.WithInsecure(), // Use WithTLSCredentials in production
    )
    if err != nil {
        log.Fatalf("Failed to create OTLP exporter: %v", err)
    }

    // Create a resource describing this application
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("my-go-application"),
            semconv.ServiceVersion("1.0.0"),
            semconv.DeploymentEnvironment("production"),
        ),
    )
    if err != nil {
        log.Fatalf("Failed to create resource: %v", err)
    }

    // Create MeterProvider with periodic reader
    provider := metric.NewMeterProvider(
        metric.WithResource(res),
        metric.WithReader(
            metric.NewPeriodicReader(
                exporter,
                metric.WithInterval(15*time.Second), // Export every 15 seconds
            ),
        ),
    )
    otel.SetMeterProvider(provider)

    // Ensure proper shutdown
    defer func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err := provider.Shutdown(ctx); err != nil {
            log.Printf("Error shutting down meter provider: %v", err)
        }
    }()

    // Start runtime instrumentation
    err = runtimeinstr.Start(
        runtimeinstr.WithMinimumReadMemStatsInterval(time.Second),
    )
    if err != nil {
        log.Fatalf("Failed to start runtime instrumentation: %v", err)
    }

    log.Println("Sending metrics to OpenTelemetry Collector...")

    // Keep the application running
    select {}
}
```

## Key Metrics to Alert On

Based on production experience, here are the most critical Go runtime metrics to monitor and alert on.

### Critical Metrics Summary

| Metric | Warning Threshold | Critical Threshold | What It Indicates |
|--------|------------------|-------------------|-------------------|
| `go_goroutines` | > 10,000 | > 50,000 | Potential goroutine leak |
| `go_memstats_alloc_bytes` | > 1GB | > 4GB | High memory usage |
| `go_gc_duration_seconds{quantile="0.99"}` | > 10ms | > 100ms | GC performance issues |
| `go_memstats_gc_cpu_fraction` | > 5% | > 25% | Excessive GC overhead |
| `rate(go_goroutines[5m])` | > 100/s | > 1000/s | Goroutine creation spike |

### Building a Monitoring Dashboard

Here is a Grafana dashboard JSON snippet for Go runtime metrics.

```json
{
  "panels": [
    {
      "title": "Goroutine Count",
      "type": "timeseries",
      "targets": [
        {
          "expr": "go_goroutines{job=\"$job\"}",
          "legendFormat": "{{instance}}"
        }
      ]
    },
    {
      "title": "Heap Memory",
      "type": "timeseries",
      "targets": [
        {
          "expr": "go_memstats_heap_alloc_bytes{job=\"$job\"}",
          "legendFormat": "Heap Alloc"
        },
        {
          "expr": "go_memstats_heap_sys_bytes{job=\"$job\"}",
          "legendFormat": "Heap Sys"
        },
        {
          "expr": "go_memstats_heap_inuse_bytes{job=\"$job\"}",
          "legendFormat": "Heap Inuse"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "bytes"
        }
      }
    },
    {
      "title": "GC Pause Distribution",
      "type": "timeseries",
      "targets": [
        {
          "expr": "go_gc_duration_seconds{job=\"$job\", quantile=\"0.5\"}",
          "legendFormat": "P50"
        },
        {
          "expr": "go_gc_duration_seconds{job=\"$job\", quantile=\"0.9\"}",
          "legendFormat": "P90"
        },
        {
          "expr": "go_gc_duration_seconds{job=\"$job\", quantile=\"0.99\"}",
          "legendFormat": "P99"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "s"
        }
      }
    },
    {
      "title": "GC CPU Fraction",
      "type": "gauge",
      "targets": [
        {
          "expr": "go_memstats_gc_cpu_fraction{job=\"$job\"} * 100"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"color": "green", "value": 0},
              {"color": "yellow", "value": 5},
              {"color": "red", "value": 25}
            ]
          }
        }
      }
    },
    {
      "title": "Allocation Rate",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(go_memstats_alloc_bytes_total{job=\"$job\"}[1m])",
          "legendFormat": "{{instance}}"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "Bps"
        }
      }
    },
    {
      "title": "Object Counts",
      "type": "timeseries",
      "targets": [
        {
          "expr": "go_memstats_heap_objects{job=\"$job\"}",
          "legendFormat": "Heap Objects"
        },
        {
          "expr": "rate(go_memstats_mallocs_total{job=\"$job\"}[1m])",
          "legendFormat": "Mallocs/s"
        },
        {
          "expr": "rate(go_memstats_frees_total{job=\"$job\"}[1m])",
          "legendFormat": "Frees/s"
        }
      ]
    }
  ]
}
```

### Continuous Monitoring Best Practices

Here is a complete monitoring setup combining all the techniques discussed.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "runtime"
    "syscall"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// RuntimeMonitor provides comprehensive runtime monitoring
type RuntimeMonitor struct {
    // Prometheus metrics
    goroutineGauge     prometheus.Gauge
    heapAllocGauge     prometheus.Gauge
    heapObjectsGauge   prometheus.Gauge
    gcPauseHistogram   prometheus.Histogram
    gcCPUFractionGauge prometheus.Gauge

    // Alerting thresholds
    goroutineWarning int
    goroutineCritical int
    heapWarningBytes  uint64
    gcPauseWarning    time.Duration
}

// NewRuntimeMonitor creates a new runtime monitor
func NewRuntimeMonitor(registry prometheus.Registerer) *RuntimeMonitor {
    m := &RuntimeMonitor{
        goroutineWarning:  10000,
        goroutineCritical: 50000,
        heapWarningBytes:  1 * 1024 * 1024 * 1024, // 1GB
        gcPauseWarning:    10 * time.Millisecond,
    }

    m.goroutineGauge = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "app_goroutines",
        Help: "Current number of goroutines",
    })

    m.heapAllocGauge = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "app_heap_alloc_bytes",
        Help: "Current heap allocation in bytes",
    })

    m.heapObjectsGauge = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "app_heap_objects",
        Help: "Current number of heap objects",
    })

    m.gcPauseHistogram = prometheus.NewHistogram(prometheus.HistogramOpts{
        Name:    "app_gc_pause_seconds",
        Help:    "GC pause duration distribution",
        Buckets: []float64{0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1},
    })

    m.gcCPUFractionGauge = prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "app_gc_cpu_fraction",
        Help: "Fraction of CPU time spent in GC",
    })

    registry.MustRegister(
        m.goroutineGauge,
        m.heapAllocGauge,
        m.heapObjectsGauge,
        m.gcPauseHistogram,
        m.gcCPUFractionGauge,
    )

    return m
}

// Start begins continuous monitoring
func (m *RuntimeMonitor) Start(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    var lastNumGC uint32

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            m.collect(&lastNumGC)
        }
    }
}

func (m *RuntimeMonitor) collect(lastNumGC *uint32) {
    // Collect goroutine count
    numGoroutines := runtime.NumGoroutine()
    m.goroutineGauge.Set(float64(numGoroutines))

    // Check goroutine thresholds
    if numGoroutines > m.goroutineCritical {
        log.Printf("CRITICAL: Goroutine count %d exceeds critical threshold %d",
            numGoroutines, m.goroutineCritical)
    } else if numGoroutines > m.goroutineWarning {
        log.Printf("WARNING: Goroutine count %d exceeds warning threshold %d",
            numGoroutines, m.goroutineWarning)
    }

    // Collect memory stats
    var mem runtime.MemStats
    runtime.ReadMemStats(&mem)

    m.heapAllocGauge.Set(float64(mem.HeapAlloc))
    m.heapObjectsGauge.Set(float64(mem.HeapObjects))
    m.gcCPUFractionGauge.Set(mem.GCCPUFraction)

    // Check heap threshold
    if mem.HeapAlloc > m.heapWarningBytes {
        log.Printf("WARNING: Heap allocation %d bytes exceeds threshold",
            mem.HeapAlloc)
    }

    // Record new GC pauses since last collection
    if mem.NumGC > *lastNumGC {
        numNewGCs := mem.NumGC - *lastNumGC
        if numNewGCs > 256 {
            numNewGCs = 256 // Buffer size limit
        }

        for i := uint32(0); i < numNewGCs; i++ {
            idx := (mem.NumGC - i - 1) % 256
            pause := time.Duration(mem.PauseNs[idx])
            m.gcPauseHistogram.Observe(pause.Seconds())

            if pause > m.gcPauseWarning {
                log.Printf("WARNING: GC pause %s exceeds threshold", pause)
            }
        }

        *lastNumGC = mem.NumGC
    }
}

func main() {
    // Create Prometheus registry
    registry := prometheus.NewRegistry()
    registry.MustRegister(prometheus.NewGoCollector())
    registry.MustRegister(prometheus.NewProcessCollector(prometheus.ProcessCollectorOpts{}))

    // Create and start runtime monitor
    monitor := NewRuntimeMonitor(registry)

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    go monitor.Start(ctx)

    // Setup HTTP server
    mux := http.NewServeMux()
    mux.Handle("/metrics", promhttp.HandlerFor(registry, promhttp.HandlerOpts{}))
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        var mem runtime.MemStats
        runtime.ReadMemStats(&mem)

        status := "healthy"
        if runtime.NumGoroutine() > 50000 || mem.HeapAlloc > 4*1024*1024*1024 {
            status = "unhealthy"
            w.WriteHeader(http.StatusServiceUnavailable)
        }

        fmt.Fprintf(w, `{"status":"%s","goroutines":%d,"heap_bytes":%d}`,
            status, runtime.NumGoroutine(), mem.HeapAlloc)
    })

    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }

    // Graceful shutdown
    go func() {
        sigCh := make(chan os.Signal, 1)
        signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
        <-sigCh

        log.Println("Shutting down...")
        cancel()

        shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer shutdownCancel()

        server.Shutdown(shutdownCtx)
    }()

    log.Println("Starting runtime monitor on :8080")
    log.Println("  Metrics: http://localhost:8080/metrics")
    log.Println("  Health:  http://localhost:8080/health")

    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }
}
```

## Conclusion

Monitoring Go runtime metrics is essential for maintaining healthy, performant applications in production. We have covered:

1. **The runtime package**: Using `runtime.NumGoroutine()` and `runtime.ReadMemStats()` to collect metrics directly from the Go runtime.

2. **Memory metrics**: Understanding heap allocation, heap efficiency, and memory fragmentation indicators.

3. **GC metrics**: Analyzing garbage collection pauses, CPU overhead, and tuning indicators to optimize GC behavior.

4. **Prometheus integration**: Exposing runtime metrics via the Prometheus client library, including custom collectors for additional insights.

5. **OpenTelemetry**: Using the modern observability stack with automatic runtime instrumentation and custom metrics.

6. **Alerting strategies**: Identifying critical thresholds for goroutine counts, memory usage, and GC performance.

By implementing comprehensive runtime monitoring, you gain visibility into your application's behavior and can proactively address issues before they impact users. Start with the default Go collector metrics, then add custom metrics as you learn your application's specific patterns and requirements.

Remember that thresholds should be adjusted based on your application's characteristics. What is normal for a high-throughput data processing service will differ significantly from a lightweight API server. Establish baselines during normal operation and set alerts based on meaningful deviations from those baselines.
