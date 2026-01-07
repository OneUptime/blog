# How to Implement Continuous Profiling in Go with pprof and Pyroscope

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Profiling, Pyroscope, Performance, Observability, Production

Description: Implement continuous profiling in Go using pprof and Pyroscope for production-safe performance monitoring with minimal overhead.

---

Performance issues in production are notoriously difficult to debug. Traditional profiling approaches require you to attach a profiler when you suspect a problem, but by then the issue may have passed or the act of profiling itself may alter system behavior. Continuous profiling solves this by always collecting low-overhead profiling data, giving you a complete picture of your application's performance over time.

In this guide, we will explore how to implement continuous profiling in Go applications using the built-in pprof package and Pyroscope, an open-source continuous profiling platform. You will learn production-safe techniques that add minimal overhead while providing deep insights into CPU usage, memory allocation, and goroutine behavior.

## Understanding Continuous Profiling

### What is Continuous Profiling?

Continuous profiling is the practice of always collecting profiling data from your production systems, rather than only profiling when investigating specific issues. This approach provides several key benefits:

- **Historical context**: You can compare current performance to past behavior
- **No reproduction needed**: Capture rare or intermittent issues without waiting for them to happen again
- **Low overhead**: Modern continuous profilers are designed for production use with minimal performance impact
- **Correlation with other signals**: Combine profiling data with metrics, logs, and traces for complete observability

### Continuous Profiling vs Ad-Hoc Profiling

| Aspect | Ad-Hoc Profiling | Continuous Profiling |
|--------|------------------|---------------------|
| When to use | During development or specific investigations | Always running in production |
| Overhead | Can be high (5-20%) | Very low (1-5%) |
| Data retention | Point-in-time snapshots | Time-series data |
| Issue detection | Reactive | Proactive |
| Setup complexity | Simple one-time setup | Requires infrastructure |

### Types of Profiles in Go

Go's runtime provides several profile types through the pprof package:

- **CPU Profile**: Shows which functions consume the most CPU time
- **Heap Profile**: Displays memory allocations and helps identify memory leaks
- **Goroutine Profile**: Lists all goroutines and their stack traces
- **Block Profile**: Shows where goroutines block on synchronization primitives
- **Mutex Profile**: Identifies contention on mutexes
- **Threadcreate Profile**: Tracks OS thread creation

## Setting Up pprof HTTP Endpoints for Production

Go's `net/http/pprof` package provides HTTP endpoints for collecting profiles. This is the foundation for production profiling in Go.

### Basic pprof Setup

The following code demonstrates how to set up pprof endpoints in a production-safe manner by running them on a separate port:

```go
package main

import (
	"log"
	"net/http"
	_ "net/http/pprof" // Import for side effects - registers pprof handlers
	"time"
)

func main() {
	// Run pprof server on a separate port (not exposed to public traffic)
	go func() {
		// This server should only be accessible from internal networks
		log.Println("Starting pprof server on :6060")
		if err := http.ListenAndServe("localhost:6060", nil); err != nil {
			log.Printf("pprof server error: %v", err)
		}
	}()

	// Your main application server
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Simulate some work
		time.Sleep(10 * time.Millisecond)
		w.Write([]byte("Hello, World!"))
	})

	log.Println("Starting main server on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
```

### Production-Safe pprof Configuration

For production environments, you need additional security measures. This configuration adds authentication and rate limiting to protect your profiling endpoints:

```go
package main

import (
	"crypto/subtle"
	"log"
	"net/http"
	"net/http/pprof"
	"sync"
	"time"
)

// rateLimiter prevents abuse of profiling endpoints
type rateLimiter struct {
	mu        sync.Mutex
	lastCall  time.Time
	minPeriod time.Duration
}

func newRateLimiter(minPeriod time.Duration) *rateLimiter {
	return &rateLimiter{minPeriod: minPeriod}
}

func (r *rateLimiter) Allow() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	if now.Sub(r.lastCall) < r.minPeriod {
		return false
	}
	r.lastCall = now
	return true
}

// authMiddleware provides basic authentication for pprof endpoints
func authMiddleware(next http.Handler, token string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		providedToken := r.Header.Get("X-Pprof-Token")
		if subtle.ConstantTimeCompare([]byte(providedToken), []byte(token)) != 1 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func setupSecurePprofServer(token string) *http.ServeMux {
	mux := http.NewServeMux()
	limiter := newRateLimiter(10 * time.Second)

	// Wrap each pprof handler with authentication and rate limiting
	wrapHandler := func(handler http.HandlerFunc) http.Handler {
		return authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !limiter.Allow() {
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}
			handler(w, r)
		}), token)
	}

	// Register pprof handlers with security wrappers
	mux.Handle("/debug/pprof/", wrapHandler(pprof.Index))
	mux.Handle("/debug/pprof/cmdline", wrapHandler(pprof.Cmdline))
	mux.Handle("/debug/pprof/profile", wrapHandler(pprof.Profile))
	mux.Handle("/debug/pprof/symbol", wrapHandler(pprof.Symbol))
	mux.Handle("/debug/pprof/trace", wrapHandler(pprof.Trace))
	mux.Handle("/debug/pprof/heap", wrapHandler(pprof.Handler("heap").ServeHTTP))
	mux.Handle("/debug/pprof/goroutine", wrapHandler(pprof.Handler("goroutine").ServeHTTP))
	mux.Handle("/debug/pprof/block", wrapHandler(pprof.Handler("block").ServeHTTP))
	mux.Handle("/debug/pprof/mutex", wrapHandler(pprof.Handler("mutex").ServeHTTP))

	return mux
}

func main() {
	// Use environment variable for the token in production
	pprofToken := "your-secure-token-here"

	go func() {
		server := &http.Server{
			Addr:         "localhost:6060",
			Handler:      setupSecurePprofServer(pprofToken),
			ReadTimeout:  5 * time.Second,
			WriteTimeout: 60 * time.Second, // CPU profiles can take up to 30s
		}
		log.Println("Starting secure pprof server on :6060")
		if err := server.ListenAndServe(); err != nil {
			log.Printf("pprof server error: %v", err)
		}
	}()

	// Main application continues...
	select {}
}
```

### Collecting Profiles from pprof Endpoints

Once your pprof server is running, you can collect profiles using the `go tool pprof` command. These examples show common profiling commands:

```bash
# Collect a 30-second CPU profile
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Collect heap profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Collect goroutine profile
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Collect block profile (requires runtime.SetBlockProfileRate)
go tool pprof http://localhost:6060/debug/pprof/block

# Collect mutex profile (requires runtime.SetMutexProfileFraction)
go tool pprof http://localhost:6060/debug/pprof/mutex

# Download profile and analyze locally
curl -o cpu.prof http://localhost:6060/debug/pprof/profile?seconds=30
go tool pprof -http=:8081 cpu.prof
```

## Integrating Pyroscope for Continuous Profiling

Pyroscope is an open-source continuous profiling platform that stores and visualizes profiling data over time. It provides a pull-based or push-based model for collecting profiles from your applications.

### Installing Pyroscope

You can run Pyroscope using Docker for local development and testing:

```bash
# Run Pyroscope server with Docker
docker run -d \
  --name pyroscope \
  -p 4040:4040 \
  pyroscope/pyroscope:latest \
  server

# Access the Pyroscope UI at http://localhost:4040
```

For production deployments, consider using Helm for Kubernetes:

```bash
# Add the Pyroscope Helm repository
helm repo add pyroscope-io https://pyroscope-io.github.io/helm-chart

# Install Pyroscope
helm install pyroscope pyroscope-io/pyroscope \
  --set persistence.enabled=true \
  --set persistence.size=10Gi
```

### Push-Based Integration with Pyroscope

The push-based model is simpler to set up and works well for most use cases. The application pushes profiling data to Pyroscope at regular intervals:

```go
package main

import (
	"log"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/grafana/pyroscope-go"
)

func main() {
	// Configure Pyroscope with production-safe settings
	pyroscope.Start(pyroscope.Config{
		ApplicationName: "my-go-service",

		// Pyroscope server address
		ServerAddress: "http://pyroscope:4040",

		// Logger for debugging (use nil in production for less noise)
		Logger: pyroscope.StandardLogger,

		// Tags help you filter and aggregate profiles
		Tags: map[string]string{
			"env":     os.Getenv("ENVIRONMENT"),
			"version": os.Getenv("APP_VERSION"),
			"region":  os.Getenv("AWS_REGION"),
		},

		// Enable specific profile types
		ProfileTypes: []pyroscope.ProfileType{
			pyroscope.ProfileCPU,
			pyroscope.ProfileAllocObjects,
			pyroscope.ProfileAllocSpace,
			pyroscope.ProfileInuseObjects,
			pyroscope.ProfileInuseSpace,
			pyroscope.ProfileGoroutines,
		},
	})

	// Your application code continues...
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Simulate CPU-intensive work
		result := fibonacci(35)
		w.Write([]byte(fmt.Sprintf("Fibonacci(35) = %d", result)))
	})

	log.Println("Starting server on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func fibonacci(n int) int {
	if n <= 1 {
		return n
	}
	return fibonacci(n-1) + fibonacci(n-2)
}
```

### Low-Overhead Configuration for Production

Production environments require careful tuning to minimize profiling overhead. This configuration prioritizes low overhead while still providing useful data:

```go
package main

import (
	"os"
	"runtime"

	"github.com/grafana/pyroscope-go"
)

func initPyroscope() error {
	// Set sampling rates for block and mutex profiling
	// Lower values = more samples but higher overhead
	runtime.SetBlockProfileRate(100000000) // Sample 1 per 100ms of blocking
	runtime.SetMutexProfileFraction(100)   // Sample 1% of mutex events

	cfg := pyroscope.Config{
		ApplicationName: "my-go-service",
		ServerAddress:   os.Getenv("PYROSCOPE_SERVER_URL"),

		// Disable logger in production to reduce overhead
		Logger: nil,

		// Add identifying tags
		Tags: map[string]string{
			"hostname": getHostname(),
			"env":      os.Getenv("ENV"),
		},

		// Start with CPU and memory profiling only
		// Add goroutine/block/mutex profiling only if needed
		ProfileTypes: []pyroscope.ProfileType{
			pyroscope.ProfileCPU,
			pyroscope.ProfileAllocObjects,
			pyroscope.ProfileAllocSpace,
			pyroscope.ProfileInuseObjects,
			pyroscope.ProfileInuseSpace,
		},

		// Upload interval - longer intervals reduce overhead
		// but increase time to see new data
		UploadRate: 15 * time.Second,

		// Basic auth if your Pyroscope server requires it
		BasicAuthUser:     os.Getenv("PYROSCOPE_AUTH_USER"),
		BasicAuthPassword: os.Getenv("PYROSCOPE_AUTH_PASSWORD"),
	}

	_, err := pyroscope.Start(cfg)
	return err
}

func getHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return hostname
}
```

### Adding Custom Labels for Better Filtering

Labels allow you to slice and dice your profiling data by different dimensions. This is particularly useful for understanding performance across different endpoints, users, or tenant IDs:

```go
package main

import (
	"context"
	"net/http"

	"github.com/grafana/pyroscope-go"
)

// labeledHandler wraps an HTTP handler with Pyroscope labels
func labeledHandler(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Add labels for this specific request context
		// These labels will be attached to all profiles collected
		// during this request
		pyroscope.TagWrapper(r.Context(), pyroscope.Labels(
			"endpoint", r.URL.Path,
			"method", r.Method,
			"user_tier", getUserTier(r),
		), func(ctx context.Context) {
			next(w, r.WithContext(ctx))
		})
	}
}

func getUserTier(r *http.Request) string {
	// Extract user tier from request (e.g., from JWT or header)
	tier := r.Header.Get("X-User-Tier")
	if tier == "" {
		return "free"
	}
	return tier
}

func main() {
	// Initialize Pyroscope first
	pyroscope.Start(pyroscope.Config{
		ApplicationName: "my-go-service",
		ServerAddress:   "http://pyroscope:4040",
	})

	// Wrap your handlers with labels
	http.HandleFunc("/api/users", labeledHandler(handleUsers))
	http.HandleFunc("/api/orders", labeledHandler(handleOrders))
	http.HandleFunc("/api/products", labeledHandler(handleProducts))

	http.ListenAndServe(":8080", nil)
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
	// Handle users endpoint
	w.Write([]byte("Users"))
}

func handleOrders(w http.ResponseWriter, r *http.Request) {
	// Handle orders endpoint
	w.Write([]byte("Orders"))
}

func handleProducts(w http.ResponseWriter, r *http.Request) {
	// Handle products endpoint
	w.Write([]byte("Products"))
}
```

## CPU Profiling in Detail

CPU profiling helps you understand where your application spends its time. This section covers advanced techniques for production CPU profiling.

### Understanding CPU Profile Data

CPU profiles show the percentage of time spent in each function. The Go runtime samples the call stack at regular intervals (default 100 Hz) and aggregates these samples:

```go
package main

import (
	"fmt"
	"os"
	"runtime/pprof"
	"time"
)

func main() {
	// Create a CPU profile file
	f, err := os.Create("cpu.prof")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	// Start CPU profiling
	if err := pprof.StartCPUProfile(f); err != nil {
		panic(err)
	}
	defer pprof.StopCPUProfile()

	// Run your workload
	runWorkload()
}

func runWorkload() {
	for i := 0; i < 100; i++ {
		expensiveComputation()
		moderateComputation()
		cheapComputation()
	}
}

func expensiveComputation() {
	// Simulate expensive CPU work
	result := 0
	for i := 0; i < 10000000; i++ {
		result += i * i
	}
	_ = result
}

func moderateComputation() {
	// Simulate moderate CPU work
	result := 0
	for i := 0; i < 1000000; i++ {
		result += i
	}
	_ = result
}

func cheapComputation() {
	// Simulate cheap CPU work
	time.Sleep(1 * time.Millisecond)
}
```

### Adjusting CPU Profile Sample Rate

The default sample rate of 100 Hz works well for most cases, but you can adjust it for specific scenarios. Higher rates provide more accuracy but increase overhead:

```go
package main

import (
	"runtime"
	"runtime/pprof"
)

func configureCPUProfiling() {
	// Set CPU profile rate (samples per second)
	// Default is 100 Hz, higher values increase accuracy but also overhead
	// For production, stick with 100 or lower
	runtime.SetCPUProfileRate(100)

	// Note: SetCPUProfileRate must be called before StartCPUProfile
	// and only affects profiles started after this call
}
```

## Memory Profiling in Detail

Memory profiling helps identify memory leaks and allocation hotspots. Go provides several memory profile types for different use cases.

### Understanding Memory Profile Types

Go distinguishes between allocated memory and in-use memory. Understanding this difference is crucial for memory optimization:

```go
package main

import (
	"fmt"
	"os"
	"runtime"
	"runtime/pprof"
)

func main() {
	// MemProfileRate controls the fraction of memory allocations
	// that are recorded. The default is 1 sample per 512KB allocated.
	// Lower values = more samples = more accurate but higher overhead
	runtime.MemProfileRate = 512 * 1024 // Default value

	// Run your workload
	runMemoryWorkload()

	// Force garbage collection to get accurate inuse numbers
	runtime.GC()

	// Write heap profile
	f, err := os.Create("mem.prof")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	// Write heap profile with in-use memory
	if err := pprof.WriteHeapProfile(f); err != nil {
		panic(err)
	}

	fmt.Println("Memory profile written to mem.prof")
}

func runMemoryWorkload() {
	// This creates many allocations
	var data [][]byte
	for i := 0; i < 1000; i++ {
		// Each iteration allocates 1MB
		chunk := make([]byte, 1024*1024)
		data = append(data, chunk)
	}

	// Release half the data
	data = data[:500]
	runtime.GC()
}
```

### Detecting Memory Leaks

Memory leaks in Go often come from goroutine leaks or references held longer than necessary. This pattern helps detect such issues:

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"runtime"
	"time"
)

// memoryMonitor periodically logs memory statistics
func memoryMonitor(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	var lastAlloc uint64
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			var m runtime.MemStats
			runtime.ReadMemStats(&m)

			allocDelta := m.TotalAlloc - lastAlloc
			lastAlloc = m.TotalAlloc

			fmt.Printf("Memory Stats:\n")
			fmt.Printf("  Alloc = %d MB\n", m.Alloc/1024/1024)
			fmt.Printf("  TotalAlloc = %d MB\n", m.TotalAlloc/1024/1024)
			fmt.Printf("  Sys = %d MB\n", m.Sys/1024/1024)
			fmt.Printf("  NumGC = %d\n", m.NumGC)
			fmt.Printf("  Goroutines = %d\n", runtime.NumGoroutine())
			fmt.Printf("  Alloc Delta = %d MB\n", allocDelta/1024/1024)
			fmt.Println()

			// Alert if memory usage is too high
			if m.Alloc > 1024*1024*1024 { // 1 GB
				fmt.Println("WARNING: High memory usage detected!")
			}

			// Alert if goroutine count is growing
			if runtime.NumGoroutine() > 10000 {
				fmt.Println("WARNING: High goroutine count detected!")
			}
		}
	}
}
```

## Goroutine Profiling

Goroutine profiles help you understand concurrency issues, goroutine leaks, and blocking behavior.

### Capturing Goroutine Profiles

Goroutine profiles show all active goroutines and their stack traces. This is essential for debugging concurrency issues:

```go
package main

import (
	"bytes"
	"fmt"
	"net/http"
	"runtime/pprof"
	"strconv"
	"strings"
)

// goroutineDebugHandler provides detailed goroutine information
func goroutineDebugHandler(w http.ResponseWriter, r *http.Request) {
	// Get debug level from query parameter (1 = summary, 2 = full stacks)
	debug := 1
	if d := r.URL.Query().Get("debug"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil {
			debug = parsed
		}
	}

	var buf bytes.Buffer
	profile := pprof.Lookup("goroutine")
	profile.WriteTo(&buf, debug)

	// Count goroutines by state
	lines := strings.Split(buf.String(), "\n")
	states := make(map[string]int)
	for _, line := range lines {
		if strings.Contains(line, "goroutine") {
			parts := strings.Split(line, "[")
			if len(parts) > 1 {
				state := strings.Split(parts[1], "]")[0]
				states[state]++
			}
		}
	}

	w.Header().Set("Content-Type", "text/plain")
	fmt.Fprintf(w, "Goroutine Summary:\n")
	for state, count := range states {
		fmt.Fprintf(w, "  %s: %d\n", state, count)
	}
	fmt.Fprintf(w, "\nFull Profile:\n%s", buf.String())
}

func main() {
	http.HandleFunc("/debug/goroutines", goroutineDebugHandler)
	http.ListenAndServe(":8080", nil)
}
```

### Detecting Goroutine Leaks

Goroutine leaks occur when goroutines are created but never exit. This pattern helps detect and prevent them:

```go
package main

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"time"
)

// GoroutineTracker monitors goroutine counts over time
type GoroutineTracker struct {
	mu           sync.Mutex
	baselineCount int
	samples      []int
}

func NewGoroutineTracker() *GoroutineTracker {
	return &GoroutineTracker{
		baselineCount: runtime.NumGoroutine(),
		samples:       make([]int, 0, 100),
	}
}

func (t *GoroutineTracker) Sample() {
	t.mu.Lock()
	defer t.mu.Unlock()

	count := runtime.NumGoroutine()
	t.samples = append(t.samples, count)

	// Keep only last 100 samples
	if len(t.samples) > 100 {
		t.samples = t.samples[1:]
	}
}

func (t *GoroutineTracker) IsLeaking() bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	if len(t.samples) < 10 {
		return false
	}

	// Check if goroutine count is consistently increasing
	increasing := 0
	for i := 1; i < len(t.samples); i++ {
		if t.samples[i] > t.samples[i-1] {
			increasing++
		}
	}

	// If 80% of samples show increase, likely leaking
	return float64(increasing)/float64(len(t.samples)-1) > 0.8
}

func (t *GoroutineTracker) Report() string {
	t.mu.Lock()
	defer t.mu.Unlock()

	current := runtime.NumGoroutine()
	delta := current - t.baselineCount

	return fmt.Sprintf(
		"Goroutines: current=%d, baseline=%d, delta=%d, leak_detected=%v",
		current, t.baselineCount, delta, t.IsLeaking(),
	)
}

// Example of proper goroutine management with context
func workerPool(ctx context.Context, jobs <-chan int, results chan<- int) {
	var wg sync.WaitGroup

	// Start fixed number of workers
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case job, ok := <-jobs:
					if !ok {
						return
					}
					// Process job
					results <- job * 2
				}
			}
		}(i)
	}

	// Wait for all workers to complete
	wg.Wait()
	close(results)
}
```

## Analyzing Flame Graphs

Flame graphs provide an intuitive visualization of profiling data. Pyroscope generates flame graphs automatically, but you can also create them from pprof data.

### Understanding Flame Graph Structure

Flame graphs show the call stack hierarchy with width proportional to resource usage:

- **X-axis**: Represents the proportion of the sampled resource (CPU time or memory)
- **Y-axis**: Represents the call stack depth
- **Color**: Typically random, but can indicate profile type or other metadata
- **Width**: Wider bars indicate more time/memory spent in that function

### Generating Flame Graphs from pprof

You can generate flame graphs from pprof profiles using the built-in web interface:

```bash
# Generate flame graph from CPU profile
go tool pprof -http=:8081 cpu.prof

# Generate flame graph from heap profile
go tool pprof -http=:8081 mem.prof

# Generate flame graph from live server
go tool pprof -http=:8081 http://localhost:6060/debug/pprof/profile?seconds=30
```

### Interpreting Flame Graphs

When analyzing flame graphs, look for these patterns:

```go
// Example code that creates identifiable patterns in flame graphs

package main

import (
	"crypto/sha256"
	"encoding/json"
	"net/http"
)

// Wide bar at top: fastPath is called frequently
func fastPath(data []byte) []byte {
	return data
}

// Tall tower: deepRecursion creates deep call stacks
func deepRecursion(n int) int {
	if n <= 1 {
		return 1
	}
	return deepRecursion(n-1) + deepRecursion(n-2)
}

// Wide bar with many children: processRequest calls multiple functions
func processRequest(r *http.Request) ([]byte, error) {
	// Each of these will show as a child in the flame graph
	data := readBody(r)          // Child 1
	validated := validateData(data) // Child 2
	transformed := transformData(validated) // Child 3
	serialized := serializeData(transformed) // Child 4
	return serialized, nil
}

func readBody(r *http.Request) []byte {
	// Read request body
	return nil
}

func validateData(data []byte) []byte {
	// Validate input
	return data
}

func transformData(data []byte) interface{} {
	// Heavy computation shows as wide bar
	for i := 0; i < 1000; i++ {
		sha256.Sum256(data)
	}
	return data
}

func serializeData(data interface{}) []byte {
	result, _ := json.Marshal(data)
	return result
}
```

## Correlating Profiles with Traces

Combining continuous profiling with distributed tracing provides complete visibility into your application's behavior.

### Integrating with OpenTelemetry

You can correlate Pyroscope profiles with OpenTelemetry traces using span links:

```go
package main

import (
	"context"
	"net/http"

	"github.com/grafana/pyroscope-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("my-service")

// tracedHandler correlates traces with profiles
func tracedHandler(w http.ResponseWriter, r *http.Request) {
	ctx, span := tracer.Start(r.Context(), "handleRequest")
	defer span.End()

	// Add span context to Pyroscope labels
	// This allows correlating profiles with traces
	spanCtx := trace.SpanContextFromContext(ctx)
	pyroscope.TagWrapper(ctx, pyroscope.Labels(
		"trace_id", spanCtx.TraceID().String(),
		"span_id", spanCtx.SpanID().String(),
	), func(ctx context.Context) {
		// Your business logic here
		result := processData(ctx)
		span.SetAttributes(attribute.Int("result_size", len(result)))
		w.Write(result)
	})
}

func processData(ctx context.Context) []byte {
	_, span := tracer.Start(ctx, "processData")
	defer span.End()

	// Simulate processing
	data := make([]byte, 1024)
	for i := range data {
		data[i] = byte(i % 256)
	}
	return data
}

func main() {
	// Initialize Pyroscope
	pyroscope.Start(pyroscope.Config{
		ApplicationName: "traced-service",
		ServerAddress:   "http://pyroscope:4040",
	})

	// Initialize OpenTelemetry (simplified - add your exporter config)
	// See OpenTelemetry Go documentation for full setup

	http.HandleFunc("/api/data", tracedHandler)
	http.ListenAndServe(":8080", nil)
}
```

### Linking Pyroscope with Grafana

Pyroscope integrates natively with Grafana, allowing you to view profiles alongside metrics and traces:

```yaml
# Grafana datasource configuration for Pyroscope
apiVersion: 1
datasources:
  - name: Pyroscope
    type: pyroscope
    url: http://pyroscope:4040
    access: proxy
    jsonData:
      minStep: '15s'
```

### Creating Unified Dashboards

You can create Grafana dashboards that show metrics, traces, and profiles together:

```json
{
  "panels": [
    {
      "title": "CPU Usage Over Time",
      "type": "timeseries",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "rate(process_cpu_seconds_total[5m])"
        }
      ]
    },
    {
      "title": "CPU Profile",
      "type": "flamegraph",
      "datasource": "Pyroscope",
      "targets": [
        {
          "query": "process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name=\"my-service\"}",
          "profileTypeId": "process_cpu:cpu:nanoseconds:cpu:nanoseconds"
        }
      ]
    }
  ]
}
```

## Best Practices for Production Profiling

### Overhead Considerations

Keep profiling overhead below 5% in production:

```go
package main

import (
	"runtime"
	"time"

	"github.com/grafana/pyroscope-go"
)

func configureForProduction() {
	// CPU profiling: minimal overhead at default settings
	// No configuration needed for CPU profiling

	// Memory profiling: sample 1 in every 512KB
	// This is the default and provides good balance
	runtime.MemProfileRate = 512 * 1024

	// Block profiling: disabled by default
	// Enable only when debugging blocking issues
	// runtime.SetBlockProfileRate(1000000000) // 1 sample per second of blocking

	// Mutex profiling: disabled by default
	// Enable only when debugging contention
	// runtime.SetMutexProfileFraction(100) // 1% of events

	// Pyroscope configuration for production
	pyroscope.Start(pyroscope.Config{
		ApplicationName: "my-service",
		ServerAddress:   "http://pyroscope:4040",

		// Only enable profiles you need
		ProfileTypes: []pyroscope.ProfileType{
			pyroscope.ProfileCPU,
			pyroscope.ProfileInuseSpace,
		},

		// Longer upload interval reduces network overhead
		UploadRate: 15 * time.Second,

		// Disable logging in production
		Logger: nil,
	})
}
```

### Security Considerations

Protect your profiling endpoints in production:

```go
package main

import (
	"net"
	"net/http"
	"strings"
)

// ipAllowlist restricts access to profiling endpoints
func ipAllowlist(next http.Handler, allowed []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP := getClientIP(r)

		for _, allowedIP := range allowed {
			if strings.HasPrefix(clientIP, allowedIP) {
				next.ServeHTTP(w, r)
				return
			}
		}

		http.Error(w, "Forbidden", http.StatusForbidden)
	})
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

func main() {
	// Only allow profiling from internal networks
	allowedIPs := []string{
		"10.",      // Internal network
		"172.16.",  // Internal network
		"192.168.", // Internal network
		"127.0.0.", // Localhost
	}

	pprofMux := http.NewServeMux()
	// Register pprof handlers...

	wrappedMux := ipAllowlist(pprofMux, allowedIPs)

	http.ListenAndServe("localhost:6060", wrappedMux)
}
```

### Alerting on Profile Data

Set up alerts based on profiling data to catch performance regressions:

```yaml
# Prometheus alerting rules for profile-based metrics
groups:
  - name: profiling_alerts
    rules:
      - alert: HighCPUUsage
        expr: |
          avg_over_time(
            pyroscope_cpu_usage_percent{service="my-service"}[5m]
          ) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected in my-service"
          description: "CPU usage has been above 80% for 10 minutes"

      - alert: HighMemoryUsage
        expr: |
          pyroscope_inuse_space_bytes{service="my-service"} > 1073741824
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected in my-service"
          description: "Memory usage exceeds 1GB"

      - alert: GoroutineLeak
        expr: |
          rate(go_goroutines{service="my-service"}[1h]) > 10
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "Potential goroutine leak in my-service"
          description: "Goroutine count is consistently increasing"
```

## Conclusion

Continuous profiling with pprof and Pyroscope provides invaluable insights into your Go application's performance in production. By following the patterns in this guide, you can:

- Set up production-safe profiling endpoints with proper authentication and rate limiting
- Integrate Pyroscope for continuous, low-overhead profiling
- Collect and analyze CPU, memory, and goroutine profiles
- Correlate profiling data with distributed traces for complete observability
- Build alerting systems based on profile data

The key to successful production profiling is balancing data granularity with overhead. Start with CPU and memory profiling, then add goroutine, block, and mutex profiling only when investigating specific issues.

Remember that profiling is most valuable when it is continuous. Having historical profiling data lets you compare current behavior to past performance, making it easier to identify regressions and understand long-term trends.

## Additional Resources

- [Go pprof documentation](https://pkg.go.dev/runtime/pprof)
- [Pyroscope documentation](https://pyroscope.io/docs/)
- [Grafana Pyroscope integration](https://grafana.com/docs/grafana/latest/datasources/pyroscope/)
- [OpenTelemetry Go SDK](https://opentelemetry.io/docs/instrumentation/go/)
- [Flame graph interpretation guide](https://www.brendangregg.com/flamegraphs.html)
