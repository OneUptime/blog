# How to Trace Goroutine Execution with runtime/trace in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Tracing, runtime/trace, Performance, Debugging, Profiling

Description: A practical guide to using Go's runtime/trace package to analyze goroutine execution, identify bottlenecks, and debug concurrency issues.

---

Concurrency is one of Go's most powerful features, but it's also one of the hardest to debug. When goroutines start blocking, racing, or behaving unexpectedly, print statements and traditional debuggers fall short. You need a way to see what's actually happening inside the runtime.

Go ships with a built-in solution: the `runtime/trace` package. This tool captures detailed execution traces that show exactly when goroutines run, block, or wait for resources. Combined with `go tool trace`, you get a visual timeline of your program's concurrent behavior.

This article walks through practical usage of `runtime/trace` - from generating traces to analyzing goroutine states and finding performance bottlenecks.

## What is runtime/trace?

The `runtime/trace` package records events from the Go runtime scheduler. Unlike CPU profiling (which samples stack traces at intervals), tracing captures discrete events as they happen:

- Goroutine creation and destruction
- Goroutine blocking and unblocking
- System calls
- Garbage collection phases
- Network polling
- Heap allocations (when enabled)

The trace data captures causality - you can see which goroutine unblocked another, or which syscall caused a goroutine to park. This makes it invaluable for debugging deadlocks, understanding scheduling behavior, and finding latency sources.

The overhead is higher than CPU profiling, so you typically run traces for short durations (seconds, not hours). But the level of detail you get is worth it when tracking down concurrency issues.

## Generating a Trace

There are two main approaches to generating traces: programmatic tracing in your code, or using the `go test` command.

### Programmatic Tracing

The following example shows how to start and stop tracing within your application. The trace data gets written to a file that you can analyze later.

```go
package main

import (
    "fmt"
    "os"
    "runtime/trace"
    "sync"
    "time"
)

func main() {
    // Create the output file for trace data
    f, err := os.Create("trace.out")
    if err != nil {
        fmt.Fprintf(os.Stderr, "failed to create trace file: %v\n", err)
        os.Exit(1)
    }
    defer f.Close()

    // Start tracing - all runtime events will be recorded from this point
    if err := trace.Start(f); err != nil {
        fmt.Fprintf(os.Stderr, "failed to start trace: %v\n", err)
        os.Exit(1)
    }
    // Stop tracing when main exits - this flushes the buffer to the file
    defer trace.Stop()

    // Your application code here
    runWorkload()
}

func runWorkload() {
    var wg sync.WaitGroup
    
    // Spawn several goroutines to simulate concurrent work
    for i := 0; i < 4; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            // Simulate varying amounts of work
            time.Sleep(time.Duration(id*50) * time.Millisecond)
            fmt.Printf("Worker %d finished\n", id)
        }(i)
    }
    
    wg.Wait()
}
```

Run this program normally, and it produces `trace.out` in the current directory.

### Tracing Tests

For existing codebases, the easiest approach is tracing through `go test`. This requires no code changes.

```bash
# Run tests with tracing enabled
# The -trace flag tells go test to write trace data to the specified file
go test -trace=trace.out ./...

# You can combine with other flags
# -count=1 disables test caching so the test actually runs
go test -trace=trace.out -count=1 -run=TestMyFunction ./pkg/mypackage
```

### HTTP Endpoint for Production

For production services, you often want to capture traces on demand. The `net/http/pprof` package provides an HTTP endpoint for this.

```go
package main

import (
    "log"
    "net/http"
    _ "net/http/pprof" // Registers /debug/pprof/* handlers
)

func main() {
    // Start your application...
    
    // The pprof import registers handlers including /debug/pprof/trace
    // In production, protect this endpoint with authentication
    log.Fatal(http.ListenAndServe(":6060", nil))
}
```

Capture a 5-second trace from a running service:

```bash
# Fetch trace data via HTTP - duration is in seconds
curl -o trace.out 'http://localhost:6060/debug/pprof/trace?seconds=5'
```

## Analyzing Traces with go tool trace

Once you have a trace file, use `go tool trace` to analyze it. This launches a web interface with several views.

```bash
# Open the trace in your browser
go tool trace trace.out
```

This starts a local web server (usually on port 0, check the output) and opens your browser. The main page shows several analysis options:

- **View trace** - Interactive timeline visualization
- **Goroutine analysis** - Statistics grouped by goroutine
- **Network blocking profile** - Time spent waiting on network I/O
- **Synchronization blocking profile** - Time spent on mutexes, channels, etc.
- **Syscall blocking profile** - Time spent in system calls
- **Scheduler latency profile** - Time goroutines wait to be scheduled

## Reading the Timeline View

The timeline view (click "View trace") shows a visual representation of all execution. Here's how to interpret it:

**PROCS row**: Shows which goroutines are running on each processor (P). Go's runtime multiplexes goroutines onto OS threads, and Ps represent logical processors.

**Goroutines**: Each goroutine appears as a colored bar when running. Gaps indicate the goroutine was not executing - either blocked or waiting to be scheduled.

**GC**: Garbage collection phases appear in the timeline, helping you correlate GC pauses with application behavior.

### Navigation Controls

- **W/S keys**: Zoom in/out
- **A/D keys**: Pan left/right
- **Click on events**: Shows details in the bottom panel
- **Shift+click**: Select a range to zoom

### Color Coding

Different colors indicate different states:
- Running goroutines show as solid colored bars
- Syscalls appear differently from regular execution
- GC work has its own distinct coloring

## Goroutine States and What They Mean

When you click on a goroutine in the trace view, the detail panel shows state transitions. Understanding these states helps diagnose issues:

**Running**: The goroutine is actively executing on a processor.

**Runnable**: The goroutine can run but is waiting for a processor. High time in this state suggests CPU contention - you have more work than processors available.

**Waiting**: The goroutine is blocked on something. The trace shows what it's waiting for:
- `chan receive` - Blocked reading from a channel
- `chan send` - Blocked writing to a channel (channel is full)
- `select` - Blocked in a select statement
- `sync.Mutex` - Waiting to acquire a mutex
- `sync.Cond` - Waiting on a condition variable
- `IO wait` - Blocked on network or file I/O
- `sleep` - Called time.Sleep

## Practical Example: Finding a Blocking Issue

Consider this code with a subtle concurrency problem:

```go
package main

import (
    "fmt"
    "os"
    "runtime/trace"
    "sync"
)

func main() {
    f, _ := os.Create("trace.out")
    defer f.Close()
    trace.Start(f)
    defer trace.Stop()

    // Unbuffered channel - sends block until someone receives
    jobs := make(chan int)
    results := make(chan int)
    
    var wg sync.WaitGroup
    
    // Start workers that process jobs
    for w := 0; w < 2; w++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            // Each worker processes all jobs it receives
            for job := range jobs {
                results <- job * 2 // This can block if no one is reading results
            }
        }(w)
    }
    
    // Send jobs - this will block after 2 sends because workers are blocked
    for i := 0; i < 10; i++ {
        jobs <- i
    }
    close(jobs)
    
    wg.Wait()
    
    // Collect results - but we never get here due to deadlock
    close(results)
    for r := range results {
        fmt.Println(r)
    }
}
```

This program deadlocks. The workers try to send to `results`, but nothing is receiving. Since both channels are unbuffered, everything blocks.

Running this and examining the trace shows:
1. Main goroutine blocks on `jobs <- i` 
2. Worker goroutines block on `results <- job * 2`
3. The "Synchronization blocking profile" shows heavy blocking on channel operations

The fix is to collect results concurrently:

```go
package main

import (
    "fmt"
    "os"
    "runtime/trace"
    "sync"
)

func main() {
    f, _ := os.Create("trace.out")
    defer f.Close()
    trace.Start(f)
    defer trace.Stop()

    jobs := make(chan int)
    results := make(chan int)
    
    var wg sync.WaitGroup
    
    // Start workers
    for w := 0; w < 2; w++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            for job := range jobs {
                results <- job * 2
            }
        }(w)
    }
    
    // Collect results in a separate goroutine - runs concurrently with job sending
    go func() {
        for r := range results {
            fmt.Println(r)
        }
    }()
    
    // Send all jobs
    for i := 0; i < 10; i++ {
        jobs <- i
    }
    close(jobs)
    
    // Wait for workers to finish, then close results
    wg.Wait()
    close(results)
}
```

## Identifying Scheduler Latency

Sometimes goroutines are runnable but don't get scheduled promptly. This shows up as time in the "Runnable" state. The scheduler latency profile aggregates this.

Common causes:
- Too many goroutines competing for too few processors
- Long-running goroutines that don't yield (tight loops without function calls)
- Contention on runtime internals

To see this in action:

```go
package main

import (
    "os"
    "runtime"
    "runtime/trace"
    "sync"
)

func main() {
    f, _ := os.Create("trace.out")
    defer f.Close()
    trace.Start(f)
    defer trace.Stop()

    // Limit to 2 processors but spawn many goroutines
    runtime.GOMAXPROCS(2)
    
    var wg sync.WaitGroup
    
    // Spawn 100 goroutines that all want to run
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            // CPU-bound work - no blocking, just computation
            sum := 0
            for j := 0; j < 1000000; j++ {
                sum += j
            }
            _ = sum
        }()
    }
    
    wg.Wait()
}
```

The trace will show goroutines spending significant time in the runnable state, waiting for one of the 2 processors to become available.

## Adding Custom Annotations

The `runtime/trace` package supports user-defined regions and tasks. These help you correlate application-level operations with runtime behavior.

```go
package main

import (
    "context"
    "os"
    "runtime/trace"
    "time"
)

func main() {
    f, _ := os.Create("trace.out")
    defer f.Close()
    trace.Start(f)
    defer trace.Stop()

    ctx := context.Background()
    
    // Create a task that groups related work
    // Tasks can span multiple goroutines and represent logical operations
    ctx, task := trace.NewTask(ctx, "ProcessOrder")
    defer task.End()
    
    // Regions mark specific phases within a task
    // They show up in the trace timeline with the label you provide
    trace.WithRegion(ctx, "ValidateInput", func() {
        time.Sleep(10 * time.Millisecond)
    })
    
    trace.WithRegion(ctx, "QueryDatabase", func() {
        time.Sleep(50 * time.Millisecond)
    })
    
    trace.WithRegion(ctx, "SendResponse", func() {
        time.Sleep(5 * time.Millisecond)
    })
    
    // Log discrete events within the trace
    trace.Log(ctx, "orderID", "12345")
}
```

In the trace viewer, your custom tasks and regions appear labeled, making it easy to find specific operations.

## Tips for Effective Tracing

**Keep traces short**: Trace files grow quickly. A few seconds of tracing from a busy service can produce hundreds of megabytes. Start with 1-5 second traces.

**Reproduce the issue**: Traces are most useful when they capture the problematic behavior. Trigger the slow request or high-latency operation while tracing.

**Compare good and bad**: Capture traces under both normal and degraded conditions. Comparing them highlights what changed.

**Check the profiles first**: The blocking profiles (network, sync, syscall) are often faster to interpret than the full timeline. Start there, then use the timeline to understand specific events.

**Filter by goroutine**: In the timeline view, you can filter to show only specific goroutines. This reduces noise when tracking a particular code path.

**Use tasks in handlers**: For web services, create a trace task per request. This groups all the work for that request together.

## When to Use trace vs pprof

Go has multiple profiling tools, and each serves different purposes:

- **CPU profile** (`go tool pprof`): Shows where CPU time is spent. Use when code is slow but not blocking.
- **Memory profile**: Shows allocation patterns. Use for memory issues.
- **Block profile**: Shows blocking operations but without timing relationships.
- **Execution trace** (`runtime/trace`): Shows the timeline of events. Use when you need to understand concurrency behavior, scheduling, or the sequence of operations.

The execution trace is heavier weight but provides information the other profiles cannot - specifically, the temporal relationships between events.

## Summary

The `runtime/trace` package gives you visibility into Go's runtime scheduler that no other tool provides. When goroutines misbehave - blocking unexpectedly, not getting scheduled, or racing - traces show you exactly what happened and when.

The workflow is straightforward:
1. Add tracing to your code or use `go test -trace`
2. Run `go tool trace` to open the web interface
3. Check blocking profiles for bottlenecks
4. Use the timeline view to understand event sequences
5. Add custom tasks and regions to label your operations

Once you're comfortable reading traces, you'll reach for this tool whenever concurrency gets confusing.

---

*Need to monitor your Go applications in production? [OneUptime](https://oneuptime.com) provides comprehensive observability for microservices with distributed tracing and performance monitoring.*
