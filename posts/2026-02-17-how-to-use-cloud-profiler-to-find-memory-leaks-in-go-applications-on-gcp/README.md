# How to Use Cloud Profiler to Find Memory Leaks in Go Applications on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Profiler, Go, Memory Leaks, Performance

Description: A hands-on guide to using Google Cloud Profiler heap profiles to detect and diagnose memory leaks in Go applications running on Google Cloud Platform.

---

Memory leaks in Go applications are subtle. Go has garbage collection, so you do not get the classic "forgot to free memory" leaks you see in C or C++. Instead, Go memory leaks happen when objects are referenced longer than intended - growing slices, forgotten goroutines holding references, or caches that never evict. These leaks cause memory usage to climb steadily until your container hits its limit and gets OOM-killed.

Cloud Profiler's heap profiling can catch these leaks before they cause outages. By comparing heap profiles over time, you can identify which allocations are growing and trace them back to the source.

## Setting Up Cloud Profiler for Go

Cloud Profiler has first-class support for Go. The setup is minimal - just import the package and call `Start()`.

```go
// main.go - Go application with Cloud Profiler
package main

import (
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/profiler"
)

func main() {
	// Initialize Cloud Profiler
	// On GCP, project ID and credentials are detected automatically
	cfg := profiler.Config{
		Service:        "my-go-service",
		ServiceVersion: os.Getenv("APP_VERSION"),
		// Enable all profile types
		MutexProfiling: true,
	}

	if err := profiler.Start(cfg); err != nil {
		log.Printf("Failed to start profiler: %v", err)
		// Continue running even if profiler fails
	}

	// Your application code
	http.HandleFunc("/api/data", handleData)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Cloud Profiler for Go collects these profile types:
- **CPU**: Where CPU time is spent
- **Heap**: Current heap allocations (live objects)
- **Heap allocation**: Total allocations over time (including freed objects)
- **Goroutine**: Number and state of goroutines
- **Mutex contention**: Time spent waiting on mutexes (if enabled)
- **Threads**: OS thread count

For memory leak detection, you need the **Heap** and **Heap allocation** profiles.

## Understanding Heap vs. Heap Allocation Profiles

These two profile types answer different questions:

**Heap profile** shows currently live objects on the heap at the time of sampling. This tells you what is consuming memory right now. If this grows over time, you have a leak.

**Heap allocation profile** shows all allocations made during the profiling window, including objects that were already garbage collected. This tells you which code paths allocate the most memory, regardless of whether it is freed.

For leak detection, compare **heap profiles** across time periods. A function that shows increasing heap usage over time is likely leaking.

## Common Go Memory Leak Patterns

### Leak Pattern 1: Growing Slices

Slices that grow but never shrink are one of the most common Go memory leaks.

```go
// LEAKY: Slice grows forever because items are appended but never removed
type EventStore struct {
	events []Event
	mu     sync.Mutex
}

func (s *EventStore) Add(e Event) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, e) // This grows without bound
}

// FIXED: Bounded buffer with eviction
type EventStore struct {
	events   []Event
	mu       sync.Mutex
	maxSize  int
}

func (s *EventStore) Add(e Event) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, e)
	// Evict old events when we exceed the limit
	if len(s.events) > s.maxSize {
		s.events = s.events[len(s.events)-s.maxSize:]
	}
}
```

### Leak Pattern 2: Forgotten Goroutines

Goroutines that block forever hold references to their closure variables, preventing garbage collection.

```go
// LEAKY: Goroutine blocks forever if nobody reads from the channel
func processAsync(data []byte) chan Result {
	ch := make(chan Result)
	go func() {
		result := heavyProcessing(data) // data is held in memory
		ch <- result // Blocks forever if nobody reads
	}()
	return ch
}

// FIXED: Use a buffered channel or context with timeout
func processAsync(ctx context.Context, data []byte) chan Result {
	ch := make(chan Result, 1) // Buffered channel
	go func() {
		result := heavyProcessing(data)
		select {
		case ch <- result:
			// Result delivered
		case <-ctx.Done():
			// Context cancelled, goroutine exits cleanly
		}
	}()
	return ch
}
```

### Leak Pattern 3: Maps That Only Grow

Maps in Go do not release memory when entries are deleted. The map's internal bucket structure only grows, never shrinks.

```go
// LEAKY: Map buckets grow but never shrink even after delete
type Cache struct {
	data map[string][]byte
	mu   sync.RWMutex
}

func (c *Cache) Set(key string, value []byte) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = value
}

func (c *Cache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.data, key) // Frees the value but not the map bucket
}

// FIXED: Periodically recreate the map to release bucket memory
func (c *Cache) Compact() {
	c.mu.Lock()
	defer c.mu.Unlock()
	newData := make(map[string][]byte, len(c.data))
	for k, v := range c.data {
		newData[k] = v
	}
	c.data = newData // Old map and its buckets are now GC-eligible
}
```

### Leak Pattern 4: Unclosed Resources

HTTP response bodies, file handles, and database connections that are not properly closed.

```go
// LEAKY: Response body is never closed
func fetchData(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	// Missing: resp.Body.Close()
	return io.ReadAll(resp.Body)
}

// FIXED: Always close response bodies
func fetchData(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close() // Always close the body
	return io.ReadAll(resp.Body)
}
```

## Using Cloud Profiler to Find Leaks

### Step 1: Establish a Baseline

When your service first starts (or after a restart), take note of the heap profile. This is your baseline. Record which functions show the highest heap usage and their approximate sizes.

### Step 2: Compare Over Time

After the service has been running for several hours or days, compare the current heap profile to the baseline.

In Cloud Profiler:
1. Select your service
2. Choose "Heap" as the profile type
3. Set the time range to a recent window (last hour)
4. Click "Compare to"
5. Set the comparison time range to shortly after the last restart

### Step 3: Identify Growing Functions

Look for functions whose heap allocation is significantly larger in the recent period compared to the baseline. These are your leak suspects.

The flame graph diff will highlight growing allocations in red/orange. Focus on:
- Functions that were small at startup but are now large
- Functions you would not expect to hold heap data (like request handlers)
- Library functions that indicate growing buffers or caches

### Step 4: Correlate with Goroutine Profiles

If you suspect goroutine leaks, check the goroutine profile. A steadily increasing goroutine count is a strong signal.

```go
// Add a debug endpoint to check goroutine count
import "runtime"

func handleDebug(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Goroutines: %d\n", runtime.NumGoroutine())

	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	fmt.Fprintf(w, "Heap Alloc: %d MiB\n", m.HeapAlloc/1024/1024)
	fmt.Fprintf(w, "Heap Objects: %d\n", m.HeapObjects)
	fmt.Fprintf(w, "Sys Memory: %d MiB\n", m.Sys/1024/1024)
}
```

## Deploying with Monitoring

Set up Cloud Monitoring alerts for memory growth to catch leaks early.

```bash
# Alert when memory usage exceeds 80% of the container limit
gcloud monitoring policies create \
  --display-name="Memory Leak Detection" \
  --condition-display-name="Memory usage growing" \
  --condition-filter='resource.type="k8s_container" AND metric.type="kubernetes.io/container/memory/used_bytes"' \
  --condition-threshold-value=858993459 \
  --condition-threshold-duration=1800s \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-aggregation='{"alignmentPeriod":"300s","perSeriesAligner":"ALIGN_MEAN"}'
```

## Dockerfile for Go with Profiler

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /server /server
ENTRYPOINT ["/server"]
```

## Best Practices for Preventing Go Memory Leaks

1. **Always close resources**: Use `defer` for `Close()` calls on response bodies, files, and connections.
2. **Use context for goroutine lifecycle**: Every goroutine should have a way to exit when its work is no longer needed.
3. **Bound your caches**: Every in-memory cache should have a maximum size and an eviction policy.
4. **Use `sync.Pool` for temporary objects**: Reuse buffers and temporary structures instead of allocating new ones.
5. **Monitor goroutine count**: A growing goroutine count is usually the first sign of a leak.
6. **Periodically recreate maps**: If you use maps with high churn, rebuild them periodically.

## Wrapping Up

Memory leaks in Go are about holding references longer than necessary. Cloud Profiler's heap profiles make them visible by showing which functions are consuming increasing amounts of memory over time. Set up profiling, establish a baseline, compare periodically, and focus on the functions that grow. Combined with good coding practices around resource cleanup and goroutine management, you can keep your Go services running with stable memory usage indefinitely.
