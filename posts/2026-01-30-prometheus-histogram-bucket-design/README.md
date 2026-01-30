# How to Create Prometheus Histogram Bucket Design

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Prometheus, Metrics, Observability, Monitoring

Description: Design effective Prometheus histogram buckets for latency tracking with proper bucket boundaries, cardinality management, and percentile calculation.

---

Prometheus histograms are one of the most powerful metric types for understanding latency distributions and request durations. Unlike simple averages or counters, histograms give you visibility into the shape of your data, letting you calculate arbitrary percentiles and identify outliers. However, getting histogram bucket design right requires careful planning. Choose buckets poorly and you will either miss important details or bloat your storage with unnecessary cardinality.

This guide walks through the practical aspects of designing Prometheus histogram buckets, from understanding the fundamentals to implementing production-ready configurations.

## Understanding Prometheus Histograms

A Prometheus histogram tracks observations by counting how many fall into configurable buckets. Each bucket represents a cumulative count of observations less than or equal to the bucket boundary.

When you create a histogram, Prometheus automatically generates three time series:

| Metric Suffix | Description |
|--------------|-------------|
| `_bucket` | Cumulative counters for each bucket boundary (le label) |
| `_sum` | Total sum of all observed values |
| `_count` | Total count of observations |

Here is a basic histogram definition in Go that tracks HTTP request durations.

```go
// Define a histogram with default buckets
// Default buckets: .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10
httpRequestDuration := prometheus.NewHistogram(prometheus.HistogramOpts{
    Name:    "http_request_duration_seconds",
    Help:    "HTTP request latency in seconds",
    Buckets: prometheus.DefBuckets,
})

// Register the metric
prometheus.MustRegister(httpRequestDuration)

// Observe a value (typically in an HTTP handler)
func handleRequest(w http.ResponseWriter, r *http.Request) {
    start := time.Now()

    // ... handle the request ...

    duration := time.Since(start).Seconds()
    httpRequestDuration.Observe(duration)
}
```

The resulting metrics look like this in the Prometheus exposition format.

```
# HELP http_request_duration_seconds HTTP request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.005"} 24054
http_request_duration_seconds_bucket{le="0.01"} 33444
http_request_duration_seconds_bucket{le="0.025"} 100392
http_request_duration_seconds_bucket{le="0.05"} 129389
http_request_duration_seconds_bucket{le="0.1"} 133988
http_request_duration_seconds_bucket{le="0.25"} 134847
http_request_duration_seconds_bucket{le="0.5"} 135044
http_request_duration_seconds_bucket{le="1"} 135157
http_request_duration_seconds_bucket{le="2.5"} 135281
http_request_duration_seconds_bucket{le="5"} 135288
http_request_duration_seconds_bucket{le="10"} 135288
http_request_duration_seconds_bucket{le="+Inf"} 135288
http_request_duration_seconds_sum 2567.890123
http_request_duration_seconds_count 135288
```

## Histogram vs Summary: When to Use Each

Both histograms and summaries track distributions, but they work differently and have distinct trade-offs.

| Aspect | Histogram | Summary |
|--------|-----------|---------|
| Quantile calculation | Server-side via histogram_quantile() | Client-side, pre-calculated |
| Aggregation across instances | Yes, fully aggregatable | No, cannot aggregate quantiles |
| Bucket/quantile configuration | Configured at instrumentation time | Configured at instrumentation time |
| Query cost | Higher (multiple time series per histogram) | Lower (fewer time series) |
| Accuracy | Depends on bucket boundaries | Configurable accuracy |
| Sliding time window | No, uses Prometheus rate() | Yes, configurable window |

Use histograms when you need to aggregate data across multiple instances or when you want flexibility in calculating different percentiles at query time. Use summaries when you know exactly which quantiles you need and do not require aggregation.

Here is a summary definition for comparison.

```go
// Summary with pre-defined quantiles
// Note: These quantiles cannot be aggregated across instances
httpRequestDurationSummary := prometheus.NewSummary(prometheus.SummaryOpts{
    Name: "http_request_duration_summary_seconds",
    Help: "HTTP request latency in seconds (summary)",
    Objectives: map[float64]float64{
        0.5:  0.05,  // 50th percentile with 5% error
        0.9:  0.01,  // 90th percentile with 1% error
        0.99: 0.001, // 99th percentile with 0.1% error
    },
    MaxAge:     10 * time.Minute,
    AgeBuckets: 5,
})
```

## Bucket Selection Strategies

The most important decision in histogram design is choosing bucket boundaries. Poor bucket choices lead to inaccurate percentile calculations or wasted storage.

### Default Buckets

Prometheus provides default buckets optimized for typical web service latencies.

```go
// prometheus.DefBuckets
var DefBuckets = []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10}
```

These work well for HTTP services with latencies in the milliseconds to seconds range. However, they may not suit your specific use case.

### Linear Buckets

Linear buckets create evenly spaced boundaries. Use them when your data has a uniform distribution within a known range.

```go
// LinearBuckets(start, width, count)
// Creates buckets: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
buckets := prometheus.LinearBuckets(100, 100, 10)

batchProcessingDuration := prometheus.NewHistogram(prometheus.HistogramOpts{
    Name:    "batch_job_duration_milliseconds",
    Help:    "Batch job processing time in milliseconds",
    Buckets: buckets,
})
```

Linear buckets work well for batch jobs with predictable durations, queue depths, or any metric with uniform distribution.

### Exponential Buckets

Exponential buckets are better for data spanning multiple orders of magnitude, which describes most latency distributions.

```go
// ExponentialBuckets(start, factor, count)
// Creates buckets: 0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064, 0.128, 0.256, 0.512
buckets := prometheus.ExponentialBuckets(0.001, 2, 10)

// More practical example with factor of 2
// Creates buckets: 0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28, 2.56, 5.12
latencyBuckets := prometheus.ExponentialBuckets(0.01, 2, 10)

apiLatency := prometheus.NewHistogram(prometheus.HistogramOpts{
    Name:    "api_latency_seconds",
    Help:    "API endpoint latency in seconds",
    Buckets: latencyBuckets,
})
```

### Custom Bucket Strategies

For most production systems, neither pure linear nor pure exponential buckets are ideal. Consider these approaches.

**SLA-Driven Buckets**

Design buckets around your service level objectives.

```go
// If your SLOs are: p50 < 100ms, p90 < 500ms, p99 < 1s
// Design buckets to give good resolution around these thresholds
sloBuckets := []float64{
    0.010,  // 10ms
    0.025,  // 25ms
    0.050,  // 50ms - resolution around p50 SLO
    0.075,  // 75ms
    0.100,  // 100ms - p50 SLO boundary
    0.150,  // 150ms
    0.250,  // 250ms
    0.350,  // 350ms
    0.500,  // 500ms - p90 SLO boundary
    0.750,  // 750ms
    1.000,  // 1s - p99 SLO boundary
    2.500,  // 2.5s
    5.000,  // 5s
    10.000, // 10s - timeout boundary
}
```

**Response Time Focused Buckets**

Focus resolution on the range where most requests fall.

```go
// High resolution for fast requests, coarser for slow ones
responseBuckets := []float64{
    0.001,  // 1ms
    0.002,  // 2ms
    0.005,  // 5ms
    0.010,  // 10ms
    0.020,  // 20ms
    0.050,  // 50ms
    0.100,  // 100ms
    0.200,  // 200ms
    0.500,  // 500ms
    1.000,  // 1s
    2.000,  // 2s
    5.000,  // 5s
}
```

## Calculating Percentiles with histogram_quantile

The `histogram_quantile()` function calculates percentiles from histogram data. Understanding its mechanics helps you design better buckets.

Here is the basic syntax.

```promql
# Calculate the 95th percentile of request duration over the last 5 minutes
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

The function works by linear interpolation between bucket boundaries. If you request the 95th percentile and it falls between two buckets, Prometheus assumes uniform distribution within that bucket range.

**Calculating Multiple Percentiles**

```promql
# Calculate p50, p90, p95, and p99 in a single query using label_replace
# Group by the quantile label for easy visualization
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.90, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

**Aggregating Across Multiple Instances**

```promql
# Calculate p99 across all instances of a service
histogram_quantile(
    0.99,
    sum(rate(http_request_duration_seconds_bucket{job="api-server"}[5m])) by (le)
)

# Calculate p99 per endpoint
histogram_quantile(
    0.99,
    sum(rate(http_request_duration_seconds_bucket{job="api-server"}[5m])) by (le, endpoint)
)
```

**Understanding Interpolation Errors**

The accuracy of histogram_quantile depends on bucket placement. Consider this scenario.

```
# Buckets: 0.1, 0.5, 1.0
# Actual data: 90% of requests complete in 0.15s, 10% take 0.9s

# With these coarse buckets, p50 might be calculated as somewhere
# between 0.1 and 0.5, potentially returning ~0.3s when the true
# value is 0.15s
```

Add more buckets where precision matters.

```go
// Better bucket design for the above scenario
buckets := []float64{0.05, 0.1, 0.15, 0.2, 0.25, 0.5, 0.75, 1.0}
```

## Managing Cardinality

Each histogram bucket creates a separate time series. With labels, this multiplies quickly.

**Cardinality Calculation**

```
Total time series = (buckets + 2) * label_combinations

Example:
- 10 buckets + _sum + _count = 12 series per combination
- Labels: endpoint (20 values) * instance (5 values) * method (4 values)
- Total: 12 * 20 * 5 * 4 = 4,800 time series
```

**Strategies to Control Cardinality**

Use fewer buckets for high-cardinality dimensions.

```go
// High-cardinality histogram (per-endpoint metrics)
// Use fewer buckets
endpointLatency := prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "endpoint_latency_seconds",
        Help:    "Latency per endpoint",
        Buckets: []float64{0.01, 0.05, 0.1, 0.5, 1, 5}, // Only 6 buckets
    },
    []string{"endpoint", "method"},
)

// Low-cardinality histogram (service-level metrics)
// Use more buckets for precision
serviceLatency := prometheus.NewHistogram(prometheus.HistogramOpts{
    Name:    "service_latency_seconds",
    Help:    "Overall service latency",
    Buckets: prometheus.ExponentialBuckets(0.001, 2, 15), // 15 buckets
})
```

Group similar endpoints.

```go
// Instead of tracking every endpoint individually,
// group them by type
func categorizeEndpoint(path string) string {
    if strings.HasPrefix(path, "/api/v1/users") {
        return "users"
    }
    if strings.HasPrefix(path, "/api/v1/products") {
        return "products"
    }
    if strings.HasPrefix(path, "/health") {
        return "health"
    }
    return "other"
}
```

## Native Histograms

Prometheus 2.40 introduced native histograms (experimental), which solve many bucket design problems by automatically adjusting bucket boundaries.

**Enabling Native Histograms in Prometheus**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets: ['localhost:8080']
    # Enable native histogram scraping
    scrape_protocols:
      - PrometheusProto
      - OpenMetricsText1.0.0
      - OpenMetricsText0.0.1
      - PrometheusText0.0.4
```

**Creating Native Histograms in Go**

```go
// Native histogram with automatic bucket boundaries
nativeHistogram := prometheus.NewHistogram(prometheus.HistogramOpts{
    Name: "request_duration_native_seconds",
    Help: "Request duration using native histogram",
    // NativeHistogramBucketFactor determines the growth factor
    // between consecutive bucket boundaries
    // A factor of 1.1 means each bucket is 10% wider than the previous
    NativeHistogramBucketFactor: 1.1,
    // Maximum number of buckets (for memory control)
    NativeHistogramMaxBucketNumber: 100,
    // Reset buckets after this many observations
    // Helps adapt to changing distributions
    NativeHistogramMinResetDuration: 1 * time.Hour,
})
```

**Advantages of Native Histograms**

| Aspect | Classic Histogram | Native Histogram |
|--------|-------------------|------------------|
| Bucket configuration | Manual, fixed | Automatic, adaptive |
| Storage efficiency | Lower (one series per bucket) | Higher (sparse representation) |
| Precision | Depends on bucket placement | Consistent relative error |
| Aggregation | Requires same bucket boundaries | Works across different configs |
| Prometheus version | All versions | 2.40+ (experimental) |

**Querying Native Histograms**

```promql
# Same histogram_quantile function works
histogram_quantile(0.99, rate(request_duration_native_seconds[5m]))

# Native histograms also support histogram_avg
histogram_avg(rate(request_duration_native_seconds[5m]))

# Count observations in a range
histogram_count(rate(request_duration_native_seconds[5m]))
```

## Practical Examples

### Example 1: HTTP Service Latency

A complete example for tracking HTTP latency in a web service.

```go
package main

import (
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    // Histogram for HTTP request duration
    // Buckets designed for typical web service SLOs
    httpDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "Duration of HTTP requests in seconds",
            Buckets: []float64{
                0.005, // 5ms - fast cache hits
                0.010, // 10ms
                0.025, // 25ms
                0.050, // 50ms - p50 target
                0.100, // 100ms
                0.250, // 250ms - p90 target
                0.500, // 500ms
                1.000, // 1s - p99 target
                2.500, // 2.5s
                5.000, // 5s - timeout warning
                10.00, // 10s - near timeout
            },
        },
        []string{"handler", "method", "status_code"},
    )

    // Request size histogram
    requestSize = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_size_bytes",
            Help: "Size of HTTP requests in bytes",
            // Exponential buckets for sizes spanning multiple orders of magnitude
            Buckets: prometheus.ExponentialBuckets(100, 2, 12),
            // Results in: 100, 200, 400, 800, 1.6KB, 3.2KB, 6.4KB, 12.8KB, 25.6KB, 51.2KB, 102.4KB, 204.8KB
        },
        []string{"handler", "method"},
    )
)

// Middleware to track request duration
func instrumentHandler(handlerName string, handler http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Track request size
        requestSize.WithLabelValues(handlerName, r.Method).Observe(float64(r.ContentLength))

        // Wrap response writer to capture status code
        wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}

        handler(wrapped, r)

        duration := time.Since(start).Seconds()
        httpDuration.WithLabelValues(
            handlerName,
            r.Method,
            http.StatusText(wrapped.statusCode),
        ).Observe(duration)
    }
}

type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func main() {
    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/api/users", instrumentHandler("users", handleUsers))
    http.HandleFunc("/api/products", instrumentHandler("products", handleProducts))

    http.ListenAndServe(":8080", nil)
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
    // Handler implementation
    time.Sleep(50 * time.Millisecond)
    w.WriteHeader(http.StatusOK)
}

func handleProducts(w http.ResponseWriter, r *http.Request) {
    // Handler implementation
    time.Sleep(100 * time.Millisecond)
    w.WriteHeader(http.StatusOK)
}
```

### Example 2: Database Query Latency

Tracking database query performance with query-type categorization.

```go
package metrics

import (
    "context"
    "time"

    "github.com/prometheus/client_golang/prometheus"
)

type DBMetrics struct {
    queryDuration *prometheus.HistogramVec
    rowsReturned  *prometheus.HistogramVec
}

func NewDBMetrics(reg prometheus.Registerer) *DBMetrics {
    m := &DBMetrics{
        queryDuration: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Name: "db_query_duration_seconds",
                Help: "Database query duration in seconds",
                // Database queries often span wide latency range
                Buckets: []float64{
                    0.001,  // 1ms - simple key lookups
                    0.005,  // 5ms
                    0.010,  // 10ms - indexed queries
                    0.025,  // 25ms
                    0.050,  // 50ms - simple joins
                    0.100,  // 100ms
                    0.250,  // 250ms - complex queries
                    0.500,  // 500ms
                    1.000,  // 1s - heavy queries
                    2.500,  // 2.5s
                    5.000,  // 5s - very slow
                    10.00,  // 10s - problematic
                    30.00,  // 30s - near timeout
                },
            },
            []string{"query_type", "table"},
        ),
        rowsReturned: prometheus.NewHistogramVec(
            prometheus.HistogramOpts{
                Name: "db_query_rows_returned",
                Help: "Number of rows returned by database queries",
                // Exponential buckets work well for row counts
                Buckets: prometheus.ExponentialBuckets(1, 2, 14),
                // Results in: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192
            },
            []string{"query_type", "table"},
        ),
    }

    reg.MustRegister(m.queryDuration, m.rowsReturned)
    return m
}

// ObserveQuery records a database query observation
func (m *DBMetrics) ObserveQuery(queryType, table string, duration time.Duration, rowCount int) {
    m.queryDuration.WithLabelValues(queryType, table).Observe(duration.Seconds())
    m.rowsReturned.WithLabelValues(queryType, table).Observe(float64(rowCount))
}

// Example usage in a repository
type UserRepository struct {
    db      *sql.DB
    metrics *DBMetrics
}

func (r *UserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
    start := time.Now()

    var user User
    err := r.db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = $1", id).
        Scan(&user.ID, &user.Name, &user.Email)

    r.metrics.ObserveQuery("select", "users", time.Since(start), 1)

    return &user, err
}

func (r *UserRepository) FindAll(ctx context.Context, limit int) ([]*User, error) {
    start := time.Now()

    rows, err := r.db.QueryContext(ctx, "SELECT * FROM users LIMIT $1", limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []*User
    for rows.Next() {
        var user User
        rows.Scan(&user.ID, &user.Name, &user.Email)
        users = append(users, &user)
    }

    r.metrics.ObserveQuery("select", "users", time.Since(start), len(users))

    return users, nil
}
```

### Example 3: Queue Processing Metrics

Tracking message processing times and queue depths.

```go
package queue

import (
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // Processing duration with linear buckets
    // Message processing typically has more predictable timing
    processingDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "queue_message_processing_seconds",
            Help: "Time spent processing queue messages",
            // Linear buckets for bounded processing times
            Buckets: prometheus.LinearBuckets(0.1, 0.1, 20),
            // Results in: 0.1, 0.2, 0.3, ... 2.0 seconds
        },
        []string{"queue", "message_type"},
    )

    // Time in queue before processing
    queueWaitTime = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "queue_wait_time_seconds",
            Help: "Time messages spend waiting in queue",
            // Exponential for potentially long wait times
            Buckets: []float64{0.1, 0.5, 1, 5, 10, 30, 60, 120, 300, 600},
        },
        []string{"queue"},
    )

    // Batch sizes
    batchSize = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "queue_batch_size",
            Help: "Number of messages processed per batch",
            Buckets: prometheus.LinearBuckets(1, 5, 20),
            // Results in: 1, 6, 11, 16, ... 96
        },
        []string{"queue"},
    )
)

type Message struct {
    ID          string
    Type        string
    QueuedAt    time.Time
    Payload     []byte
}

type MessageProcessor struct {
    queueName string
}

func (p *MessageProcessor) ProcessBatch(messages []Message) error {
    if len(messages) == 0 {
        return nil
    }

    // Record batch size
    batchSize.WithLabelValues(p.queueName).Observe(float64(len(messages)))

    for _, msg := range messages {
        // Record queue wait time
        waitTime := time.Since(msg.QueuedAt).Seconds()
        queueWaitTime.WithLabelValues(p.queueName).Observe(waitTime)

        // Process and record duration
        start := time.Now()
        p.processMessage(msg)
        duration := time.Since(start).Seconds()
        processingDuration.WithLabelValues(p.queueName, msg.Type).Observe(duration)
    }

    return nil
}

func (p *MessageProcessor) processMessage(msg Message) {
    // Processing logic here
    time.Sleep(100 * time.Millisecond)
}
```

## Dashboard Queries

Common PromQL queries for histogram dashboards.

**Percentile Panels**

```promql
# p50, p90, p99 for a service
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.90, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

**SLO Compliance**

```promql
# Percentage of requests completing under 500ms
sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
/
sum(rate(http_request_duration_seconds_count[5m]))
* 100
```

**Apdex Score**

```promql
# Apdex with satisfied=0.5s, tolerating=2s
(
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
  +
  sum(rate(http_request_duration_seconds_bucket{le="2"}[5m]))
  -
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
) / 2
/
sum(rate(http_request_duration_seconds_count[5m]))
```

**Heatmap Data**

```promql
# For Grafana heatmap visualization
sum(rate(http_request_duration_seconds_bucket[1m])) by (le)
```

**Request Rate by Latency Tier**

```promql
# Fast requests (under 100ms)
sum(rate(http_request_duration_seconds_bucket{le="0.1"}[5m]))

# Medium requests (100ms to 1s)
sum(rate(http_request_duration_seconds_bucket{le="1"}[5m]))
-
sum(rate(http_request_duration_seconds_bucket{le="0.1"}[5m]))

# Slow requests (over 1s)
sum(rate(http_request_duration_seconds_count[5m]))
-
sum(rate(http_request_duration_seconds_bucket{le="1"}[5m]))
```

## Alerting on Histograms

Sample alert rules for histogram-based metrics.

```yaml
groups:
  - name: latency_alerts
    rules:
      # Alert when p99 latency exceeds SLO
      - alert: HighP99Latency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
          ) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High p99 latency for {{ $labels.service }}"
          description: "p99 latency is {{ $value | humanizeDuration }} (threshold: 1s)"

      # Alert when significant portion of requests are slow
      - alert: HighSlowRequestRate
        expr: |
          (
            sum(rate(http_request_duration_seconds_count[5m])) by (service)
            -
            sum(rate(http_request_duration_seconds_bucket{le="1"}[5m])) by (service)
          )
          /
          sum(rate(http_request_duration_seconds_count[5m])) by (service)
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High slow request rate for {{ $labels.service }}"
          description: "{{ $value | humanizePercentage }} of requests taking over 1s"

      # Alert on SLO breach
      - alert: SLOBreach
        expr: |
          (
            sum(rate(http_request_duration_seconds_bucket{le="0.5"}[30m])) by (service)
            /
            sum(rate(http_request_duration_seconds_count[30m])) by (service)
          ) < 0.95
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "SLO breach for {{ $labels.service }}"
          description: "Only {{ $value | humanizePercentage }} of requests under 500ms (target: 95%)"
```

## Best Practices Summary

| Practice | Recommendation |
|----------|----------------|
| Bucket count | 10-15 buckets for most use cases |
| Bucket placement | Focus resolution around SLO boundaries |
| Cardinality | Fewer buckets for high-cardinality labels |
| Default buckets | Only use if they match your latency profile |
| Native histograms | Consider for new deployments on Prometheus 2.40+ |
| Units | Always use seconds (not milliseconds) for durations |
| Naming | Use `_seconds`, `_bytes` suffixes to indicate units |
| Labels | Keep label cardinality bounded, avoid user IDs or request IDs |

## Conclusion

Prometheus histogram bucket design requires balancing precision against cardinality. Start with buckets aligned to your SLOs, monitor the distribution of your actual data, and refine bucket boundaries based on what you observe. For greenfield projects, native histograms offer a compelling alternative that sidesteps many bucket design challenges.

The key insight is that histogram accuracy depends entirely on bucket placement relative to the percentiles you care about. A well-designed histogram with 10 buckets will give you better insights than a poorly designed one with 50.

Test your bucket designs against real production data before committing to them. Use the `histogram_quantile` function to verify that calculated percentiles make sense, and adjust bucket boundaries when you find gaps in coverage or unnecessary granularity.
