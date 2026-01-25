# How to Export Custom Prometheus Metrics from Go Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Prometheus, Metrics, Observability, Monitoring

Description: A practical guide to instrumenting Go applications with custom Prometheus metrics, covering counters, gauges, histograms, and best practices for production deployments.

---

If you're running Go services in production, you probably already know that default runtime metrics only tell part of the story. You need custom metrics to understand what your application is actually doing - how many orders are being processed, how long database queries take, or how many items are sitting in your queue.

Prometheus has become the de facto standard for metrics collection in cloud-native environments, and Go has excellent support for it through the official client library. This guide walks through setting up custom metrics in your Go services, from basic counters to production-ready instrumentation.

## Getting Started

First, grab the Prometheus Go client library:

```bash
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promhttp
```

The basic setup involves creating a metrics endpoint that Prometheus can scrape:

```go
package main

import (
    "net/http"

    "github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
    // Expose metrics at /metrics endpoint
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

This gives you Go runtime metrics out of the box - memory usage, goroutine counts, GC stats. But the real value comes from adding your own metrics.

## Understanding Metric Types

Prometheus offers four metric types, each suited for different use cases:

**Counters** - Values that only go up. Use these for request counts, errors, completed tasks.

**Gauges** - Values that go up and down. Use these for current temperature, queue size, active connections.

**Histograms** - Distributions of values. Use these for request durations, response sizes.

**Summaries** - Similar to histograms but calculate quantiles on the client side. Generally prefer histograms.

## Creating Custom Metrics

Let's build out a realistic example for an order processing service.

### Counters

Counters track cumulative values. Here's how to count processed orders:

```go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

// promauto automatically registers metrics with the default registry
var (
    OrdersProcessed = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "orders_processed_total",
            Help: "Total number of orders processed",
        },
        []string{"status", "payment_method"}, // labels for filtering
    )

    HTTPRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests by endpoint and status",
        },
        []string{"method", "endpoint", "status_code"},
    )
)
```

Using counters in your code:

```go
func processOrder(order Order) error {
    err := executeOrder(order)

    if err != nil {
        // Increment counter with specific label values
        metrics.OrdersProcessed.WithLabelValues("failed", order.PaymentMethod).Inc()
        return err
    }

    metrics.OrdersProcessed.WithLabelValues("success", order.PaymentMethod).Inc()
    return nil
}
```

### Gauges

Gauges represent current state. Perfect for queue depths or connection pools:

```go
var (
    QueueDepth = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "queue_depth",
            Help: "Current number of items in the queue",
        },
        []string{"queue_name"},
    )

    ActiveConnections = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "db_active_connections",
            Help: "Number of active database connections",
        },
    )
)

// Update gauge values
func enqueueItem(queueName string, item Item) {
    queue.Push(item)
    metrics.QueueDepth.WithLabelValues(queueName).Inc()
}

func dequeueItem(queueName string) Item {
    item := queue.Pop()
    metrics.QueueDepth.WithLabelValues(queueName).Dec()
    return item
}

// Set absolute value
func updateConnectionPool(pool *ConnectionPool) {
    metrics.ActiveConnections.Set(float64(pool.ActiveCount()))
}
```

### Histograms

Histograms track value distributions. Essential for latency measurements:

```go
var (
    RequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
            // Define bucket boundaries based on your SLOs
            Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
        },
        []string{"method", "endpoint"},
    )

    DatabaseQueryDuration = promauto.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "db_query_duration_seconds",
            Help:    "Database query duration in seconds",
            Buckets: prometheus.ExponentialBuckets(0.001, 2, 12), // 1ms to ~4s
        },
    )
)
```

The cleanest way to use histograms is with a timer:

```go
func handleRequest(w http.ResponseWriter, r *http.Request) {
    // Start timer - returns a function that records duration when called
    timer := prometheus.NewTimer(
        metrics.RequestDuration.WithLabelValues(r.Method, r.URL.Path),
    )
    defer timer.ObserveDuration()

    // Your handler logic here
    processRequest(w, r)
}

func queryDatabase(query string) ([]Row, error) {
    start := time.Now()
    defer func() {
        metrics.DatabaseQueryDuration.Observe(time.Since(start).Seconds())
    }()

    return db.Query(query)
}
```

## HTTP Middleware Pattern

For web services, middleware is the cleanest way to instrument all endpoints:

```go
func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        timer := prometheus.NewTimer(
            metrics.RequestDuration.WithLabelValues(r.Method, r.URL.Path),
        )

        // Wrap ResponseWriter to capture status code
        wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}

        next.ServeHTTP(wrapped, r)

        timer.ObserveDuration()
        metrics.HTTPRequestsTotal.WithLabelValues(
            r.Method,
            r.URL.Path,
            strconv.Itoa(wrapped.statusCode),
        ).Inc()
    })
}

type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}
```

Wire it up with your router:

```go
func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/orders", handleOrders)
    mux.HandleFunc("/users", handleUsers)
    mux.Handle("/metrics", promhttp.Handler())

    // Wrap all handlers with metrics middleware
    handler := MetricsMiddleware(mux)
    http.ListenAndServe(":8080", handler)
}
```

## Custom Collectors

Sometimes you need metrics that come from external sources - database stats, cache hit rates, or system information. Custom collectors let you fetch these on-demand when Prometheus scrapes:

```go
type DatabaseCollector struct {
    db              *sql.DB
    connectionsDesc *prometheus.Desc
    queriesDesc     *prometheus.Desc
}

func NewDatabaseCollector(db *sql.DB) *DatabaseCollector {
    return &DatabaseCollector{
        db: db,
        connectionsDesc: prometheus.NewDesc(
            "db_pool_connections",
            "Number of connections in the pool",
            []string{"state"}, // label names
            nil,
        ),
        queriesDesc: prometheus.NewDesc(
            "db_queries_total",
            "Total queries executed",
            nil,
            nil,
        ),
    }
}

// Describe sends metric descriptions to Prometheus
func (c *DatabaseCollector) Describe(ch chan<- *prometheus.Desc) {
    ch <- c.connectionsDesc
    ch <- c.queriesDesc
}

// Collect fetches current values and sends them to Prometheus
func (c *DatabaseCollector) Collect(ch chan<- prometheus.Metric) {
    stats := c.db.Stats()

    ch <- prometheus.MustNewConstMetric(
        c.connectionsDesc,
        prometheus.GaugeValue,
        float64(stats.InUse),
        "in_use",
    )
    ch <- prometheus.MustNewConstMetric(
        c.connectionsDesc,
        prometheus.GaugeValue,
        float64(stats.Idle),
        "idle",
    )
}

// Register the collector
func init() {
    prometheus.MustRegister(NewDatabaseCollector(db))
}
```

## Best Practices

**Naming conventions matter.** Use lowercase with underscores. Include a unit suffix (_seconds, _bytes, _total). Prefix with your service or subsystem name:

```
myservice_http_requests_total
myservice_order_processing_duration_seconds
myservice_cache_size_bytes
```

**Be careful with label cardinality.** Every unique combination of label values creates a new time series. High-cardinality labels like user IDs or request IDs will explode your metric storage:

```go
// BAD - user_id creates millions of time series
RequestsTotal.WithLabelValues(userID, endpoint).Inc()

// GOOD - bounded set of values
RequestsTotal.WithLabelValues(userType, endpoint).Inc()
```

**Initialize label values.** Prometheus only shows metrics after they're first written. Pre-initialize to avoid gaps in your dashboards:

```go
func init() {
    // Ensure these series exist with zero values from startup
    for _, method := range []string{"GET", "POST", "PUT", "DELETE"} {
        for _, status := range []string{"2xx", "4xx", "5xx"} {
            HTTPRequestsTotal.WithLabelValues(method, status).Add(0)
        }
    }
}
```

**Choose histogram buckets wisely.** Default buckets work for many cases, but tune them to your SLOs. If your p99 target is 100ms, you need granular buckets below that threshold:

```go
// For a service targeting sub-100ms responses
Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 1}
```

## Common Pitfalls

**Forgetting to handle panics.** If your metric observation panics (like calling WithLabelValues with wrong number of labels), it can crash your service. Validate label counts during development.

**Blocking on metric updates.** The Prometheus client is thread-safe, but complex collectors that do I/O can slow down scrapes. Keep Collect() methods fast or add timeouts.

**Exposing sensitive data.** Labels sometimes leak information. Avoid putting customer data, API keys, or internal paths in metric labels.

**Overinstrumentation.** Not everything needs a metric. Focus on the four golden signals: latency, traffic, errors, and saturation. Add more as you identify specific needs.

## Summary

| Metric Type | Use Case | Example |
|-------------|----------|---------|
| **Counter** | Cumulative totals | Requests, errors, completed jobs |
| **Gauge** | Current values | Queue depth, active connections |
| **Histogram** | Distributions | Request latency, response sizes |
| **Summary** | Client-side quantiles | Rarely preferred over histograms |

Custom Prometheus metrics give you visibility into what your Go services are actually doing. Start with the golden signals, keep label cardinality low, and add more instrumentation as you identify gaps. The Prometheus client library makes this straightforward - the harder part is deciding what to measure.
