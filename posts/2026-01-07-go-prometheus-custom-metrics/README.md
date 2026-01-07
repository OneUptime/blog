# How to Create Custom Metrics in Go with Prometheus

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Prometheus, Metrics, Monitoring, Observability, DevOps

Description: A comprehensive guide to creating custom metrics in Go using prometheus/client_golang, covering counters, gauges, histograms, and summaries with practical examples.

---

## Introduction

Prometheus has become the de facto standard for monitoring cloud-native applications. Its pull-based model, powerful query language (PromQL), and extensive ecosystem make it an excellent choice for observability. When building Go applications, the official `prometheus/client_golang` library provides a robust way to instrument your code with custom metrics.

In this comprehensive guide, we will explore how to create and expose custom metrics in Go applications using the Prometheus client library. We will cover all four metric types: counters, gauges, histograms, and summaries, along with best practices for labeling and avoiding common pitfalls.

## Prerequisites

Before we begin, ensure you have:

- Go 1.21 or later installed
- Basic understanding of Go programming
- Familiarity with Prometheus concepts
- A running Prometheus instance (optional, for testing)

## Setting Up Your Project

Let's start by creating a new Go project and installing the Prometheus client library.

Initialize a new Go module and install the required dependencies:

```bash
mkdir prometheus-metrics-demo
cd prometheus-metrics-demo
go mod init prometheus-metrics-demo
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promhttp
```

## Understanding Prometheus Metric Types

Prometheus supports four core metric types, each designed for specific use cases:

1. **Counter**: A cumulative metric that only increases (or resets to zero on restart)
2. **Gauge**: A metric that can go up or down
3. **Histogram**: Samples observations and counts them in configurable buckets
4. **Summary**: Similar to histogram but calculates configurable quantiles

Let's explore each type in detail with practical examples.

## Working with Counters

Counters are the simplest metric type. They represent a cumulative value that only increases over time. Common use cases include counting HTTP requests, errors, or completed tasks.

### Creating a Basic Counter

This example demonstrates how to create and register a simple counter that tracks total HTTP requests:

```go
package main

import (
    "net/http"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Define a counter metric for tracking total HTTP requests
var httpRequestsTotal = prometheus.NewCounter(
    prometheus.CounterOpts{
        // Namespace groups related metrics (e.g., your service name)
        Namespace: "myapp",
        // Subsystem further categorizes within the namespace
        Subsystem: "http",
        // Name is the metric name itself
        Name:      "requests_total",
        // Help provides a description for the metric
        Help:      "Total number of HTTP requests received",
    },
)

func init() {
    // Register the counter with Prometheus's default registry
    prometheus.MustRegister(httpRequestsTotal)
}

func main() {
    // Handler that increments the counter on each request
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        // Increment the counter by 1
        httpRequestsTotal.Inc()
        w.Write([]byte("Hello, World!"))
    })

    // Expose metrics endpoint for Prometheus to scrape
    http.Handle("/metrics", promhttp.Handler())

    http.ListenAndServe(":8080", nil)
}
```

### Counter with Labels

Labels add dimensions to your metrics, allowing you to filter and aggregate data. Here's how to create a counter with labels for HTTP method and status code:

```go
package main

import (
    "net/http"
    "strconv"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// CounterVec allows adding labels to counters
var httpRequestsTotal = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Namespace: "myapp",
        Subsystem: "http",
        Name:      "requests_total",
        Help:      "Total number of HTTP requests by method and status",
    },
    // Define the label names - order matters when setting values
    []string{"method", "status", "path"},
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
}

// Middleware that wraps handlers to track request metrics
func metricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Create a response writer wrapper to capture status code
        rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

        // Call the next handler
        next.ServeHTTP(rw, r)

        // Increment counter with specific label values
        httpRequestsTotal.WithLabelValues(
            r.Method,                           // method label
            strconv.Itoa(rw.statusCode),        // status label
            r.URL.Path,                         // path label
        ).Inc()
    })
}

// Custom response writer to capture status code
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func main() {
    mux := http.NewServeMux()

    mux.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(`{"users": []}`))
    })

    mux.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(`{"orders": []}`))
    })

    // Wrap the mux with our metrics middleware
    http.Handle("/", metricsMiddleware(mux))
    http.Handle("/metrics", promhttp.Handler())

    http.ListenAndServe(":8080", nil)
}
```

### Using Add() for Batch Operations

When processing multiple items at once, use `Add()` instead of calling `Inc()` repeatedly:

```go
// processedItems tracks the total number of items processed
var processedItems = prometheus.NewCounter(
    prometheus.CounterOpts{
        Namespace: "myapp",
        Subsystem: "processor",
        Name:      "items_processed_total",
        Help:      "Total number of items processed",
    },
)

// ProcessBatch handles a batch of items and updates the counter
func ProcessBatch(items []Item) error {
    // Process all items
    for _, item := range items {
        if err := processItem(item); err != nil {
            return err
        }
    }

    // Add the total count at once - more efficient than multiple Inc() calls
    processedItems.Add(float64(len(items)))
    return nil
}
```

## Working with Gauges

Gauges represent values that can increase or decrease. They are perfect for measuring current state like temperature, memory usage, or number of active connections.

### Creating a Basic Gauge

This example shows how to track the number of active connections using a gauge:

```go
package main

import (
    "net/http"
    "sync"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Gauge for tracking current active connections
var activeConnections = prometheus.NewGauge(
    prometheus.GaugeOpts{
        Namespace: "myapp",
        Subsystem: "server",
        Name:      "active_connections",
        Help:      "Number of currently active connections",
    },
)

// Gauge for tracking memory usage in bytes
var memoryUsageBytes = prometheus.NewGauge(
    prometheus.GaugeOpts{
        Namespace: "myapp",
        Subsystem: "process",
        Name:      "memory_usage_bytes",
        Help:      "Current memory usage in bytes",
    },
)

func init() {
    prometheus.MustRegister(activeConnections)
    prometheus.MustRegister(memoryUsageBytes)
}

// ConnectionPool manages active connections
type ConnectionPool struct {
    mu    sync.Mutex
    conns map[string]*Connection
}

type Connection struct {
    ID string
}

// Add registers a new connection and increments the gauge
func (p *ConnectionPool) Add(conn *Connection) {
    p.mu.Lock()
    defer p.mu.Unlock()

    p.conns[conn.ID] = conn
    // Increment gauge when connection is added
    activeConnections.Inc()
}

// Remove unregisters a connection and decrements the gauge
func (p *ConnectionPool) Remove(connID string) {
    p.mu.Lock()
    defer p.mu.Unlock()

    delete(p.conns, connID)
    // Decrement gauge when connection is removed
    activeConnections.Dec()
}

// SetMemoryUsage updates the memory gauge with the current value
func SetMemoryUsage(bytes float64) {
    // Set replaces the current value entirely
    memoryUsageBytes.Set(bytes)
}
```

### Gauge with Labels for Resource Tracking

Track resources across multiple dimensions using labeled gauges:

```go
package main

import (
    "runtime"
    "time"

    "github.com/prometheus/client_golang/prometheus"
)

// GaugeVec for tracking queue sizes across different queues
var queueSize = prometheus.NewGaugeVec(
    prometheus.GaugeOpts{
        Namespace: "myapp",
        Subsystem: "queue",
        Name:      "size",
        Help:      "Current number of items in each queue",
    },
    []string{"queue_name", "priority"},
)

// GaugeVec for tracking resource utilization
var resourceUtilization = prometheus.NewGaugeVec(
    prometheus.GaugeOpts{
        Namespace: "myapp",
        Subsystem: "resources",
        Name:      "utilization_ratio",
        Help:      "Resource utilization as a ratio between 0 and 1",
    },
    []string{"resource_type"},
)

func init() {
    prometheus.MustRegister(queueSize)
    prometheus.MustRegister(resourceUtilization)
}

// QueueManager manages multiple priority queues
type QueueManager struct {
    queues map[string]map[string][]interface{}
}

// UpdateQueueMetrics refreshes all queue size metrics
func (qm *QueueManager) UpdateQueueMetrics() {
    for queueName, priorities := range qm.queues {
        for priority, items := range priorities {
            // Update gauge with current queue size
            queueSize.WithLabelValues(queueName, priority).Set(float64(len(items)))
        }
    }
}

// StartResourceMonitor periodically updates resource metrics
func StartResourceMonitor() {
    go func() {
        for {
            var memStats runtime.MemStats
            runtime.ReadMemStats(&memStats)

            // Calculate memory utilization (example: against 1GB limit)
            memLimit := float64(1 << 30) // 1GB
            memUsed := float64(memStats.Alloc)

            resourceUtilization.WithLabelValues("memory").Set(memUsed / memLimit)
            resourceUtilization.WithLabelValues("goroutines").Set(
                float64(runtime.NumGoroutine()) / 10000, // example limit
            )

            time.Sleep(10 * time.Second)
        }
    }()
}
```

### Using GaugeFunc for Computed Values

When you need a gauge that computes its value on demand, use `GaugeFunc`:

```go
package main

import (
    "runtime"

    "github.com/prometheus/client_golang/prometheus"
)

func init() {
    // GaugeFunc computes the value each time Prometheus scrapes
    goroutineGauge := prometheus.NewGaugeFunc(
        prometheus.GaugeOpts{
            Namespace: "myapp",
            Subsystem: "runtime",
            Name:      "goroutines",
            Help:      "Number of goroutines currently running",
        },
        // This function is called on every scrape
        func() float64 {
            return float64(runtime.NumGoroutine())
        },
    )

    prometheus.MustRegister(goroutineGauge)
}
```

## Working with Histograms

Histograms are essential for measuring distributions of values like request latencies or response sizes. They automatically provide sum, count, and configurable buckets.

### Creating a Basic Histogram

This example demonstrates tracking HTTP request latencies with a histogram:

```go
package main

import (
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Histogram for tracking request duration
var requestDuration = prometheus.NewHistogram(
    prometheus.HistogramOpts{
        Namespace: "myapp",
        Subsystem: "http",
        Name:      "request_duration_seconds",
        Help:      "HTTP request duration in seconds",
        // Define bucket boundaries - choose based on expected latency distribution
        Buckets: []float64{
            0.001,  // 1ms
            0.005,  // 5ms
            0.01,   // 10ms
            0.025,  // 25ms
            0.05,   // 50ms
            0.1,    // 100ms
            0.25,   // 250ms
            0.5,    // 500ms
            1.0,    // 1s
            2.5,    // 2.5s
            5.0,    // 5s
            10.0,   // 10s
        },
    },
)

func init() {
    prometheus.MustRegister(requestDuration)
}

// TimingMiddleware measures request duration and records it in the histogram
func TimingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Record start time
        start := time.Now()

        // Handle the request
        next.ServeHTTP(w, r)

        // Calculate duration and record in histogram
        duration := time.Since(start).Seconds()
        requestDuration.Observe(duration)
    })
}
```

### Histogram with Labels

Add labels to histograms to track latencies across different endpoints or methods:

```go
package main

import (
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// HistogramVec allows labeling histogram observations
var requestDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Namespace: "myapp",
        Subsystem: "http",
        Name:      "request_duration_seconds",
        Help:      "HTTP request duration in seconds by handler",
        // Use prometheus.DefBuckets for reasonable defaults
        // DefBuckets: .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10
        Buckets: prometheus.DefBuckets,
    },
    []string{"handler", "method"},
)

// Histogram for response sizes
var responseSize = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Namespace: "myapp",
        Subsystem: "http",
        Name:      "response_size_bytes",
        Help:      "HTTP response size in bytes",
        // Exponential buckets: start at 100 bytes, multiply by 2, 10 buckets
        // Results in: 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200
        Buckets: prometheus.ExponentialBuckets(100, 2, 10),
    },
    []string{"handler"},
)

func init() {
    prometheus.MustRegister(requestDuration)
    prometheus.MustRegister(responseSize)
}

// InstrumentedHandler wraps a handler with timing instrumentation
func InstrumentedHandler(handlerName string, handler http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Wrap response writer to capture size
        rw := &sizeTrackingResponseWriter{ResponseWriter: w}

        handler(rw, r)

        // Record duration with labels
        requestDuration.WithLabelValues(handlerName, r.Method).Observe(
            time.Since(start).Seconds(),
        )

        // Record response size
        responseSize.WithLabelValues(handlerName).Observe(float64(rw.size))
    }
}

type sizeTrackingResponseWriter struct {
    http.ResponseWriter
    size int
}

func (rw *sizeTrackingResponseWriter) Write(b []byte) (int, error) {
    size, err := rw.ResponseWriter.Write(b)
    rw.size += size
    return size, err
}

func main() {
    http.HandleFunc("/api/users", InstrumentedHandler("users", usersHandler))
    http.HandleFunc("/api/orders", InstrumentedHandler("orders", ordersHandler))
    http.Handle("/metrics", promhttp.Handler())

    http.ListenAndServe(":8080", nil)
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte(`{"users": [{"id": 1, "name": "Alice"}]}`))
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte(`{"orders": []}`))
}
```

### Using Timer Helper for Clean Code

The prometheus library provides a `Timer` helper for measuring durations:

```go
package main

import (
    "time"

    "github.com/prometheus/client_golang/prometheus"
)

var taskDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Namespace: "myapp",
        Subsystem: "tasks",
        Name:      "duration_seconds",
        Help:      "Task processing duration in seconds",
        Buckets:   prometheus.DefBuckets,
    },
    []string{"task_type"},
)

// ProcessTask demonstrates using Timer for cleaner duration tracking
func ProcessTask(taskType string, task Task) error {
    // NewTimer starts timing immediately
    timer := prometheus.NewTimer(taskDuration.WithLabelValues(taskType))
    // ObserveDuration is called when the function returns
    defer timer.ObserveDuration()

    // Process the task
    return executeTask(task)
}

// Alternative: Using Timer with custom observation
func ProcessTaskWithCustomTiming(taskType string, task Task) error {
    timer := prometheus.NewTimer(prometheus.ObserverFunc(func(v float64) {
        // Custom observation logic - useful for conditional recording
        if v > 1.0 {
            // Log slow tasks
            logSlowTask(taskType, v)
        }
        taskDuration.WithLabelValues(taskType).Observe(v)
    }))
    defer timer.ObserveDuration()

    return executeTask(task)
}
```

## Working with Summaries

Summaries calculate configurable quantiles over a sliding time window. They are useful when you need precise quantile calculations on the client side.

### Creating a Basic Summary

This example shows how to track request latencies with specific quantile calculations:

```go
package main

import (
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Summary for tracking request duration with quantiles
var requestLatency = prometheus.NewSummary(
    prometheus.SummaryOpts{
        Namespace: "myapp",
        Subsystem: "http",
        Name:      "request_latency_seconds",
        Help:      "HTTP request latency in seconds",
        // Objectives defines which quantiles to calculate
        // Key: quantile (0-1), Value: allowed error margin
        Objectives: map[float64]float64{
            0.5:  0.05,  // 50th percentile with 5% error
            0.9:  0.01,  // 90th percentile with 1% error
            0.95: 0.005, // 95th percentile with 0.5% error
            0.99: 0.001, // 99th percentile with 0.1% error
        },
        // MaxAge is the duration for which observations are kept
        MaxAge: 10 * time.Minute,
        // AgeBuckets is the number of buckets for the sliding window
        AgeBuckets: 5,
    },
)

func init() {
    prometheus.MustRegister(requestLatency)
}

func LatencyMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)

        // Record observation in summary
        requestLatency.Observe(time.Since(start).Seconds())
    })
}
```

### Summary with Labels

Add dimensions to summaries for more granular analysis:

```go
package main

import (
    "time"

    "github.com/prometheus/client_golang/prometheus"
)

// SummaryVec for tracking operation latencies by type
var operationLatency = prometheus.NewSummaryVec(
    prometheus.SummaryOpts{
        Namespace: "myapp",
        Subsystem: "database",
        Name:      "operation_latency_seconds",
        Help:      "Database operation latency in seconds",
        Objectives: map[float64]float64{
            0.5:  0.05,
            0.9:  0.01,
            0.99: 0.001,
        },
    },
    []string{"operation", "table"},
)

func init() {
    prometheus.MustRegister(operationLatency)
}

// DatabaseClient wraps database operations with metrics
type DatabaseClient struct {
    // actual database connection
}

// Query executes a query and records latency metrics
func (c *DatabaseClient) Query(table string, query string) ([]Row, error) {
    start := time.Now()

    // Execute the actual query
    rows, err := c.executeQuery(query)

    // Record the latency regardless of success/failure
    operationLatency.WithLabelValues("query", table).Observe(
        time.Since(start).Seconds(),
    )

    return rows, err
}

// Insert adds a record and tracks the latency
func (c *DatabaseClient) Insert(table string, data interface{}) error {
    start := time.Now()
    defer func() {
        operationLatency.WithLabelValues("insert", table).Observe(
            time.Since(start).Seconds(),
        )
    }()

    return c.executeInsert(table, data)
}
```

### Histogram vs Summary: When to Use Which

Understanding when to use histograms versus summaries is crucial:

```go
/*
HISTOGRAM ADVANTAGES:
- Aggregatable across instances (can calculate percentiles in PromQL)
- Fixed memory usage regardless of observation count
- Bucket boundaries are known ahead of time
- Better for alerting on SLOs

SUMMARY ADVANTAGES:
- Accurate quantile calculation on the client side
- No need to predefine buckets
- Useful when you need exact quantiles without server-side aggregation

RECOMMENDATION:
Use Histograms in most cases because:
1. They can be aggregated across multiple instances
2. They work better with Prometheus's query language
3. You can always calculate quantiles using histogram_quantile()

Use Summaries only when:
1. You have a single instance and need precise quantiles
2. You cannot predict the value distribution to set buckets
3. Client-side quantile calculation is specifically required
*/

// Example: Prefer histogram for most use cases
var httpDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "HTTP request duration - USE THIS FOR MOST CASES",
        Buckets: prometheus.DefBuckets,
    },
    []string{"handler"},
)

// Example: Summary for specific quantile requirements
var preciseLatency = prometheus.NewSummary(
    prometheus.SummaryOpts{
        Name: "precise_latency_seconds",
        Help: "Use when you need exact client-side quantiles",
        Objectives: map[float64]float64{
            0.99: 0.001, // Very precise 99th percentile
        },
    },
)
```

## Custom Registry and Exposing Metrics

For production applications, consider using a custom registry to have more control over exposed metrics.

### Creating a Custom Registry

This approach gives you full control over which metrics are exposed:

```go
package main

import (
    "net/http"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/collectors"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    // Create a custom registry
    registry := prometheus.NewRegistry()

    // Optionally add Go runtime metrics
    registry.MustRegister(collectors.NewGoCollector())

    // Optionally add process metrics (memory, CPU, file descriptors)
    registry.MustRegister(collectors.NewProcessCollector(
        collectors.ProcessCollectorOpts{},
    ))

    // Create and register custom metrics
    requestCounter := prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "myapp_requests_total",
            Help: "Total requests by endpoint",
        },
        []string{"endpoint"},
    )
    registry.MustRegister(requestCounter)

    // Create handler with custom registry
    http.Handle("/metrics", promhttp.HandlerFor(
        registry,
        promhttp.HandlerOpts{
            // Enable OpenMetrics format for better compatibility
            EnableOpenMetrics: true,
            // Include error handling info in output
            ErrorHandling: promhttp.ContinueOnError,
        },
    ))

    http.ListenAndServe(":8080", nil)
}
```

### Exposing Metrics with Authentication

Protect your metrics endpoint in production:

```go
package main

import (
    "crypto/subtle"
    "net/http"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// BasicAuthMiddleware protects the metrics endpoint
func BasicAuthMiddleware(username, password string, next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user, pass, ok := r.BasicAuth()

        if !ok ||
           subtle.ConstantTimeCompare([]byte(user), []byte(username)) != 1 ||
           subtle.ConstantTimeCompare([]byte(pass), []byte(password)) != 1 {
            w.Header().Set("WWW-Authenticate", `Basic realm="metrics"`)
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func main() {
    registry := prometheus.NewRegistry()

    // Register your metrics...

    metricsHandler := promhttp.HandlerFor(registry, promhttp.HandlerOpts{})

    // Wrap with authentication
    http.Handle("/metrics", BasicAuthMiddleware(
        "prometheus",
        "secure-password",
        metricsHandler,
    ))

    http.ListenAndServe(":8080", nil)
}
```

## Labeling Best Practices and Cardinality

Labels are powerful but can cause problems if misused. High cardinality (too many unique label combinations) leads to memory issues and slow queries.

### Good Labeling Practices

Follow these guidelines to avoid cardinality explosions:

```go
package main

import (
    "github.com/prometheus/client_golang/prometheus"
)

// GOOD: Low cardinality labels with known, bounded values
var goodCounter = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total HTTP requests",
    },
    []string{
        "method",  // GET, POST, PUT, DELETE, etc. (~10 values)
        "status",  // 200, 201, 400, 500, etc. (~20 values)
        "handler", // /users, /orders, etc. (bounded by your API)
    },
)

// BAD: High cardinality labels - AVOID THESE
var badCounter = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "DO NOT DO THIS",
    },
    []string{
        "user_id",     // NEVER - unbounded, millions of values
        "request_id",  // NEVER - unique per request
        "ip_address",  // NEVER - unbounded
        "timestamp",   // NEVER - unique per request
        "full_path",   // RISKY - /users/123 creates unique series
    },
)

// GOOD: Normalize paths to reduce cardinality
func normalizePath(path string) string {
    // /users/123 -> /users/:id
    // /orders/456/items/789 -> /orders/:id/items/:id
    // Use a router-aware normalization or regex patterns
    return pathPattern(path)
}

// GOOD: Group similar status codes
func statusBucket(code int) string {
    switch {
    case code >= 200 && code < 300:
        return "2xx"
    case code >= 300 && code < 400:
        return "3xx"
    case code >= 400 && code < 500:
        return "4xx"
    default:
        return "5xx"
    }
}
```

### Cardinality Estimation

Before adding labels, estimate the total cardinality:

```go
/*
CARDINALITY CALCULATION:
Total series = Product of all label value counts

Example:
- method: 5 values (GET, POST, PUT, DELETE, PATCH)
- status: 4 values (2xx, 3xx, 4xx, 5xx)
- handler: 20 values (your API endpoints)

Total: 5 × 4 × 20 = 400 series

This is fine! Keep total series per metric under 10,000.

RED FLAGS:
- user_id: potentially millions
- request_id: infinite (unique per request)
- timestamp: infinite
- full_url: potentially infinite

RULE OF THUMB:
- Each label should have <100 possible values
- Total cardinality per metric should be <10,000
- If you need high-cardinality data, use logs instead
*/

// Helper to track cardinality (development only)
func init() {
    // In development, you can log cardinality periodically
    go func() {
        for range time.Tick(time.Minute) {
            mfs, _ := prometheus.DefaultGatherer.Gather()
            for _, mf := range mfs {
                if len(mf.Metric) > 1000 {
                    log.Printf("WARNING: High cardinality metric %s: %d series",
                        *mf.Name, len(mf.Metric))
                }
            }
        }
    }()
}
```

## Complete Example: Production-Ready Metrics

Here's a complete example combining all concepts for a production application:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "runtime"
    "syscall"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/collectors"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics holds all application metrics
type Metrics struct {
    // Counter: Total requests by handler and status
    RequestsTotal *prometheus.CounterVec

    // Gauge: Currently active requests
    RequestsInFlight prometheus.Gauge

    // Histogram: Request duration by handler
    RequestDuration *prometheus.HistogramVec

    // Histogram: Response size by handler
    ResponseSize *prometheus.HistogramVec

    // Gauge: Application info (useful for joins in PromQL)
    AppInfo *prometheus.GaugeVec
}

// NewMetrics creates and registers all application metrics
func NewMetrics(registry prometheus.Registerer) *Metrics {
    m := &Metrics{
        RequestsTotal: prometheus.NewCounterVec(
            prometheus.CounterOpts{
                Namespace: "myapp",
                Subsystem: "http",
                Name:      "requests_total",
                Help:      "Total HTTP requests by handler and status",
            },
            []string{"handler", "method", "status"},
        ),
        RequestsInFlight: prometheus.NewGauge(
            prometheus.GaugeOpts{
                Namespace: "myapp",
                Subsystem: "http",
                Name:      "requests_in_flight",
                Help:      "Number of HTTP requests currently being processed",
            },
        ),
        RequestDuration: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Namespace: "myapp",
                Subsystem: "http",
                Name:      "request_duration_seconds",
                Help:      "HTTP request duration in seconds",
                Buckets:   []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
            },
            []string{"handler", "method"},
        ),
        ResponseSize: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Namespace: "myapp",
                Subsystem: "http",
                Name:      "response_size_bytes",
                Help:      "HTTP response size in bytes",
                Buckets:   prometheus.ExponentialBuckets(100, 2, 10),
            },
            []string{"handler"},
        ),
        AppInfo: prometheus.NewGaugeVec(
            prometheus.GaugeOpts{
                Namespace: "myapp",
                Name:      "info",
                Help:      "Application information",
            },
            []string{"version", "go_version"},
        ),
    }

    // Register all metrics
    registry.MustRegister(
        m.RequestsTotal,
        m.RequestsInFlight,
        m.RequestDuration,
        m.ResponseSize,
        m.AppInfo,
    )

    // Set app info (constant gauge set to 1)
    m.AppInfo.WithLabelValues("1.0.0", runtime.Version()).Set(1)

    return m
}

// InstrumentHandler wraps an HTTP handler with metrics instrumentation
func (m *Metrics) InstrumentHandler(name string, handler http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Track in-flight requests
        m.RequestsInFlight.Inc()
        defer m.RequestsInFlight.Dec()

        // Start timer
        start := time.Now()

        // Wrap response writer
        wrapped := &instrumentedResponseWriter{
            ResponseWriter: w,
            statusCode:     http.StatusOK,
        }

        // Handle request
        handler(wrapped, r)

        // Record metrics
        duration := time.Since(start).Seconds()
        status := http.StatusText(wrapped.statusCode)

        m.RequestsTotal.WithLabelValues(name, r.Method, status).Inc()
        m.RequestDuration.WithLabelValues(name, r.Method).Observe(duration)
        m.ResponseSize.WithLabelValues(name).Observe(float64(wrapped.bytesWritten))
    }
}

type instrumentedResponseWriter struct {
    http.ResponseWriter
    statusCode   int
    bytesWritten int
}

func (w *instrumentedResponseWriter) WriteHeader(code int) {
    w.statusCode = code
    w.ResponseWriter.WriteHeader(code)
}

func (w *instrumentedResponseWriter) Write(b []byte) (int, error) {
    n, err := w.ResponseWriter.Write(b)
    w.bytesWritten += n
    return n, err
}

func main() {
    // Create custom registry
    registry := prometheus.NewRegistry()

    // Add standard Go metrics
    registry.MustRegister(collectors.NewGoCollector())
    registry.MustRegister(collectors.NewProcessCollector(
        collectors.ProcessCollectorOpts{},
    ))

    // Create application metrics
    metrics := NewMetrics(registry)

    // Create HTTP mux
    mux := http.NewServeMux()

    // Application endpoints with instrumentation
    mux.HandleFunc("/api/users", metrics.InstrumentHandler("get_users", func(w http.ResponseWriter, r *http.Request) {
        time.Sleep(10 * time.Millisecond) // Simulate work
        w.Header().Set("Content-Type", "application/json")
        w.Write([]byte(`{"users": [{"id": 1, "name": "Alice"}]}`))
    }))

    mux.HandleFunc("/api/orders", metrics.InstrumentHandler("get_orders", func(w http.ResponseWriter, r *http.Request) {
        time.Sleep(20 * time.Millisecond) // Simulate work
        w.Header().Set("Content-Type", "application/json")
        w.Write([]byte(`{"orders": []}`))
    }))

    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("OK"))
    })

    // Metrics endpoint
    mux.Handle("/metrics", promhttp.HandlerFor(
        registry,
        promhttp.HandlerOpts{
            EnableOpenMetrics: true,
        },
    ))

    // Create server
    server := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    // Graceful shutdown
    go func() {
        sigCh := make(chan os.Signal, 1)
        signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
        <-sigCh

        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        server.Shutdown(ctx)
    }()

    log.Printf("Server starting on :8080")
    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }
}
```

## Prometheus Configuration

To scrape metrics from your Go application, add this to your `prometheus.yml`:

```yaml
# prometheus.yml configuration for scraping your Go application
scrape_configs:
  - job_name: 'myapp'
    # How often to scrape
    scrape_interval: 15s
    # Scrape timeout
    scrape_timeout: 10s
    # Target endpoints
    static_configs:
      - targets: ['localhost:8080']
    # Optional: Basic auth if you protected the endpoint
    basic_auth:
      username: prometheus
      password: secure-password
```

## Useful PromQL Queries

Once your metrics are being scraped, use these queries to analyze your data:

```promql
# Request rate per second over the last 5 minutes
rate(myapp_http_requests_total[5m])

# Request rate by handler
sum(rate(myapp_http_requests_total[5m])) by (handler)

# Error rate (5xx responses)
sum(rate(myapp_http_requests_total{status=~"5.."}[5m]))
/ sum(rate(myapp_http_requests_total[5m]))

# 95th percentile latency from histogram
histogram_quantile(0.95,
  rate(myapp_http_request_duration_seconds_bucket[5m])
)

# 95th percentile latency by handler
histogram_quantile(0.95,
  sum(rate(myapp_http_request_duration_seconds_bucket[5m])) by (handler, le)
)

# Average request duration
rate(myapp_http_request_duration_seconds_sum[5m])
/ rate(myapp_http_request_duration_seconds_count[5m])

# Current in-flight requests
myapp_http_requests_in_flight

# Memory usage from Go collector
go_memstats_alloc_bytes
```

## Testing Your Metrics

Always test your metrics instrumentation:

```go
package main

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/testutil"
)

func TestRequestsCounter(t *testing.T) {
    // Create a new registry for testing
    registry := prometheus.NewRegistry()
    metrics := NewMetrics(registry)

    // Create test handler
    handler := metrics.InstrumentHandler("test", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("OK"))
    })

    // Make test request
    req := httptest.NewRequest("GET", "/test", nil)
    rec := httptest.NewRecorder()
    handler(rec, req)

    // Verify counter was incremented
    expected := `
        # HELP myapp_http_requests_total Total HTTP requests by handler and status
        # TYPE myapp_http_requests_total counter
        myapp_http_requests_total{handler="test",method="GET",status="OK"} 1
    `

    if err := testutil.CollectAndCompare(
        metrics.RequestsTotal,
        strings.NewReader(expected),
    ); err != nil {
        t.Errorf("Unexpected metrics: %v", err)
    }
}

func TestHistogramBuckets(t *testing.T) {
    registry := prometheus.NewRegistry()
    metrics := NewMetrics(registry)

    // Verify histogram has expected bucket count
    count := testutil.CollectAndCount(metrics.RequestDuration)

    // Each histogram creates: _bucket (12 bounds + inf), _count, _sum
    // With 2 labels, expecting at least base metrics registered
    if count < 1 {
        t.Errorf("Expected histogram metrics to be registered")
    }
}
```

## Conclusion

Creating custom metrics in Go with Prometheus is straightforward using the `prometheus/client_golang` library. Remember these key points:

1. **Choose the right metric type**: Use counters for cumulative values, gauges for current state, histograms for distributions, and summaries for client-side quantiles.

2. **Use labels wisely**: Labels add dimensions but can cause cardinality issues. Keep label values bounded and avoid high-cardinality data like user IDs or timestamps.

3. **Prefer histograms over summaries**: Histograms are aggregatable and work better with PromQL in most scenarios.

4. **Use a custom registry**: This gives you control over which metrics are exposed and makes testing easier.

5. **Test your instrumentation**: Use the testutil package to verify your metrics are being recorded correctly.

With proper instrumentation, you will gain deep insights into your Go application's behavior, enabling better debugging, performance optimization, and proactive alerting.

## Additional Resources

- [Prometheus Go Client Documentation](https://pkg.go.dev/github.com/prometheus/client_golang/prometheus)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)
- [PromQL Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)
