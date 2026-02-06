# How to Build Custom OpenTelemetry Metric Instruments in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Metrics, Custom Instruments, Counters, Histograms

Description: Build custom OpenTelemetry metric instruments in Go including counters, gauges, and histograms to capture application-specific performance data.

While OpenTelemetry's tracing capabilities get significant attention, metrics are equally important for understanding system behavior over time. Custom metric instruments let you capture application-specific measurements that standard instrumentation misses. Whether tracking business KPIs, resource utilization, or performance characteristics unique to your domain, custom metrics provide the quantitative data needed for effective monitoring.

## Understanding OpenTelemetry Metric Instruments

OpenTelemetry defines several instrument types, each suited to different measurement scenarios:

**Counters**: Monotonically increasing values (requests served, bytes sent)
**UpDownCounters**: Values that can increase or decrease (active connections, queue size)
**Histograms**: Distribution of values (request duration, response size)
**Gauges**: Point-in-time measurements (CPU usage, memory consumption)

Synchronous instruments are called inline with application code, while asynchronous instruments use callbacks for periodic measurement.

## Setting Up OpenTelemetry Metrics

Initialize the metrics SDK with appropriate exporters and readers.

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
)

// Initialize OpenTelemetry metrics with OTLP exporter
func initMetrics(serviceName string) (*metric.MeterProvider, error) {
    ctx := context.Background()

    // Create OTLP metrics exporter
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("localhost:4317"),
        otlpmetricgrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    // Create resource with service information
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceNameKey.String(serviceName),
            semconv.ServiceVersionKey.String("1.0.0"),
            semconv.DeploymentEnvironmentKey.String("production"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create meter provider with periodic reader
    // Metrics are collected and exported at regular intervals
    mp := metric.NewMeterProvider(
        metric.WithReader(
            metric.NewPeriodicReader(
                exporter,
                metric.WithInterval(10*time.Second), // Export every 10 seconds
            ),
        ),
        metric.WithResource(res),
    )

    // Set as global meter provider
    otel.SetMeterProvider(mp)

    return mp, nil
}
```

## Building Custom Counters

Counters track cumulative values that only increase. They're perfect for counting events, requests, or operations.

```go
package main

import (
    "context"
    "fmt"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

// RequestMetrics tracks HTTP request counters
type RequestMetrics struct {
    requestCounter  metric.Int64Counter
    errorCounter    metric.Int64Counter
    bytesCounter    metric.Int64Counter
}

// NewRequestMetrics creates request metrics instruments
func NewRequestMetrics() (*RequestMetrics, error) {
    meter := otel.Meter("http-server")

    // Counter for total requests
    requestCounter, err := meter.Int64Counter(
        "http.server.requests",
        metric.WithDescription("Total number of HTTP requests"),
        metric.WithUnit("{request}"),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create request counter: %w", err)
    }

    // Counter for errors
    errorCounter, err := meter.Int64Counter(
        "http.server.errors",
        metric.WithDescription("Total number of HTTP errors"),
        metric.WithUnit("{error}"),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create error counter: %w", err)
    }

    // Counter for bytes transferred
    bytesCounter, err := meter.Int64Counter(
        "http.server.bytes_sent",
        metric.WithDescription("Total bytes sent in responses"),
        metric.WithUnit("By"),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create bytes counter: %w", err)
    }

    return &RequestMetrics{
        requestCounter: requestCounter,
        errorCounter:   errorCounter,
        bytesCounter:   bytesCounter,
    }, nil
}

// RecordRequest records a successful request with attributes
func (rm *RequestMetrics) RecordRequest(ctx context.Context, method, path string, statusCode int, bytesSent int64) {
    // Increment request counter with dimensional attributes
    rm.requestCounter.Add(ctx, 1,
        metric.WithAttributes(
            attribute.String("http.method", method),
            attribute.String("http.route", path),
            attribute.Int("http.status_code", statusCode),
        ),
    )

    // Track errors separately
    if statusCode >= 400 {
        rm.errorCounter.Add(ctx, 1,
            metric.WithAttributes(
                attribute.String("http.method", method),
                attribute.String("http.route", path),
                attribute.Int("http.status_code", statusCode),
            ),
        )
    }

    // Track bytes sent
    rm.bytesCounter.Add(ctx, bytesSent,
        metric.WithAttributes(
            attribute.String("http.method", method),
            attribute.String("http.route", path),
        ),
    )
}
```

## Building UpDownCounters for Fluctuating Values

UpDownCounters track values that can both increase and decrease, like connection pools or queue sizes.

```go
package main

import (
    "context"
    "fmt"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

// ConnectionPoolMetrics tracks pool state
type ConnectionPoolMetrics struct {
    activeConnections metric.Int64UpDownCounter
    idleConnections   metric.Int64UpDownCounter
    poolName          string
}

// NewConnectionPoolMetrics creates connection pool metrics
func NewConnectionPoolMetrics(poolName string) (*ConnectionPoolMetrics, error) {
    meter := otel.Meter("database")

    activeConnections, err := meter.Int64UpDownCounter(
        "db.pool.active_connections",
        metric.WithDescription("Number of active database connections"),
        metric.WithUnit("{connection}"),
    )
    if err != nil {
        return nil, err
    }

    idleConnections, err := meter.Int64UpDownCounter(
        "db.pool.idle_connections",
        metric.WithDescription("Number of idle database connections"),
        metric.WithUnit("{connection}"),
    )
    if err != nil {
        return nil, err
    }

    return &ConnectionPoolMetrics{
        activeConnections: activeConnections,
        idleConnections:   idleConnections,
        poolName:          poolName,
    }, nil
}

// ConnectionAcquired records when a connection is acquired from the pool
func (cpm *ConnectionPoolMetrics) ConnectionAcquired(ctx context.Context) {
    attrs := metric.WithAttributes(
        attribute.String("pool.name", cpm.poolName),
    )

    // Active connections increase
    cpm.activeConnections.Add(ctx, 1, attrs)

    // Idle connections decrease
    cpm.idleConnections.Add(ctx, -1, attrs)
}

// ConnectionReleased records when a connection is returned to the pool
func (cpm *ConnectionPoolMetrics) ConnectionReleased(ctx context.Context) {
    attrs := metric.WithAttributes(
        attribute.String("pool.name", cpm.poolName),
    )

    // Active connections decrease
    cpm.activeConnections.Add(ctx, -1, attrs)

    // Idle connections increase
    cpm.idleConnections.Add(ctx, 1, attrs)
}

// ConnectionClosed records when a connection is permanently closed
func (cpm *ConnectionPoolMetrics) ConnectionClosed(ctx context.Context, wasActive bool) {
    attrs := metric.WithAttributes(
        attribute.String("pool.name", cpm.poolName),
    )

    if wasActive {
        cpm.activeConnections.Add(ctx, -1, attrs)
    } else {
        cpm.idleConnections.Add(ctx, -1, attrs)
    }
}
```

## Building Histograms for Distributions

Histograms capture the distribution of values, perfect for measuring latencies, sizes, or any metric where you care about percentiles.

```go
package main

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

// LatencyMetrics tracks operation duration distributions
type LatencyMetrics struct {
    requestDuration metric.Float64Histogram
    queryDuration   metric.Float64Histogram
}

// NewLatencyMetrics creates histogram instruments for latency tracking
func NewLatencyMetrics() (*LatencyMetrics, error) {
    meter := otel.Meter("performance")

    // Histogram for HTTP request duration
    requestDuration, err := meter.Float64Histogram(
        "http.server.request.duration",
        metric.WithDescription("HTTP request duration in seconds"),
        metric.WithUnit("s"),
        // Explicit bucket boundaries for web requests
        metric.WithExplicitBucketBoundaries(
            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
        ),
    )
    if err != nil {
        return nil, err
    }

    // Histogram for database query duration
    queryDuration, err := meter.Float64Histogram(
        "db.query.duration",
        metric.WithDescription("Database query duration in seconds"),
        metric.WithUnit("s"),
        // Different buckets optimized for database queries
        metric.WithExplicitBucketBoundaries(
            0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5,
        ),
    )
    if err != nil {
        return nil, err
    }

    return &LatencyMetrics{
        requestDuration: requestDuration,
        queryDuration:   queryDuration,
    }, nil
}

// RecordRequestDuration records HTTP request duration
func (lm *LatencyMetrics) RecordRequestDuration(ctx context.Context, duration time.Duration, method, route string, statusCode int) {
    seconds := duration.Seconds()

    lm.requestDuration.Record(ctx, seconds,
        metric.WithAttributes(
            attribute.String("http.method", method),
            attribute.String("http.route", route),
            attribute.Int("http.status_code", statusCode),
        ),
    )
}

// RecordQueryDuration records database query duration
func (lm *LatencyMetrics) RecordQueryDuration(ctx context.Context, duration time.Duration, operation, table string) {
    seconds := duration.Seconds()

    lm.queryDuration.Record(ctx, seconds,
        metric.WithAttributes(
            attribute.String("db.operation", operation),
            attribute.String("db.table", table),
        ),
    )
}

// MeasureOperation provides a convenient way to measure any operation
func (lm *LatencyMetrics) MeasureOperation(ctx context.Context, name string, operation func() error) error {
    start := time.Now()
    err := operation()
    duration := time.Since(start)

    meter := otel.Meter("performance")
    histogram, _ := meter.Float64Histogram(
        fmt.Sprintf("operation.%s.duration", name),
        metric.WithUnit("s"),
    )

    histogram.Record(ctx, duration.Seconds(),
        metric.WithAttributes(
            attribute.String("operation", name),
            attribute.Bool("success", err == nil),
        ),
    )

    return err
}
```

## Building Asynchronous Gauges

Gauges measure point-in-time values using callbacks. They're ideal for system metrics that you sample periodically.

```go
package main

import (
    "context"
    "runtime"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

// RuntimeMetrics tracks Go runtime metrics
type RuntimeMetrics struct {
    goroutineGauge  metric.Int64ObservableGauge
    memoryGauge     metric.Int64ObservableGauge
    gcPauseGauge    metric.Float64ObservableGauge
}

// NewRuntimeMetrics creates runtime metric instruments with callbacks
func NewRuntimeMetrics() (*RuntimeMetrics, error) {
    meter := otel.Meter("runtime")

    // Gauge for number of goroutines
    goroutineGauge, err := meter.Int64ObservableGauge(
        "runtime.go.goroutines",
        metric.WithDescription("Number of goroutines"),
        metric.WithUnit("{goroutine}"),
    )
    if err != nil {
        return nil, err
    }

    // Gauge for memory usage
    memoryGauge, err := meter.Int64ObservableGauge(
        "runtime.go.memory.heap",
        metric.WithDescription("Heap memory in bytes"),
        metric.WithUnit("By"),
    )
    if err != nil {
        return nil, err
    }

    // Gauge for GC pause time
    gcPauseGauge, err := meter.Float64ObservableGauge(
        "runtime.go.gc.pause_ns",
        metric.WithDescription("GC pause time in nanoseconds"),
        metric.WithUnit("ns"),
    )
    if err != nil {
        return nil, err
    }

    rm := &RuntimeMetrics{
        goroutineGauge: goroutineGauge,
        memoryGauge:    memoryGauge,
        gcPauseGauge:   gcPauseGauge,
    }

    // Register callbacks for periodic measurement
    _, err = meter.RegisterCallback(
        rm.observe,
        goroutineGauge,
        memoryGauge,
        gcPauseGauge,
    )
    if err != nil {
        return nil, err
    }

    return rm, nil
}

// observe is called periodically to record gauge values
func (rm *RuntimeMetrics) observe(ctx context.Context, observer metric.Observer) error {
    // Record number of goroutines
    observer.ObserveInt64(
        rm.goroutineGauge,
        int64(runtime.NumGoroutine()),
    )

    // Record memory statistics
    var memStats runtime.MemStats
    runtime.ReadMemStats(&memStats)

    observer.ObserveInt64(
        rm.memoryGauge,
        int64(memStats.HeapAlloc),
        metric.WithAttributes(
            attribute.String("memory.type", "heap_alloc"),
        ),
    )

    observer.ObserveInt64(
        rm.memoryGauge,
        int64(memStats.HeapInuse),
        metric.WithAttributes(
            attribute.String("memory.type", "heap_inuse"),
        ),
    )

    // Record GC pause time
    if len(memStats.PauseNs) > 0 {
        observer.ObserveFloat64(
            rm.gcPauseGauge,
            float64(memStats.PauseNs[(memStats.NumGC+255)%256]),
        )
    }

    return nil
}
```

## Building Business Metrics

Custom metrics can track business KPIs alongside technical metrics.

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

// BusinessMetrics tracks application-specific KPIs
type BusinessMetrics struct {
    orderCounter      metric.Int64Counter
    revenueCounter    metric.Float64Counter
    cartSizeHistogram metric.Float64Histogram
    activeUsersGauge  metric.Int64ObservableGauge
}

// NewBusinessMetrics creates business metric instruments
func NewBusinessMetrics() (*BusinessMetrics, error) {
    meter := otel.Meter("business")

    // Counter for orders placed
    orderCounter, err := meter.Int64Counter(
        "business.orders.placed",
        metric.WithDescription("Total number of orders placed"),
        metric.WithUnit("{order}"),
    )
    if err != nil {
        return nil, err
    }

    // Counter for revenue
    revenueCounter, err := meter.Float64Counter(
        "business.revenue",
        metric.WithDescription("Total revenue in USD"),
        metric.WithUnit("USD"),
    )
    if err != nil {
        return nil, err
    }

    // Histogram for cart size distribution
    cartSizeHistogram, err := meter.Float64Histogram(
        "business.cart.size",
        metric.WithDescription("Distribution of cart sizes"),
        metric.WithUnit("{item}"),
        metric.WithExplicitBucketBoundaries(1, 2, 5, 10, 20, 50),
    )
    if err != nil {
        return nil, err
    }

    // Gauge for active users
    activeUsersGauge, err := meter.Int64ObservableGauge(
        "business.users.active",
        metric.WithDescription("Number of active users"),
        metric.WithUnit("{user}"),
    )
    if err != nil {
        return nil, err
    }

    return &BusinessMetrics{
        orderCounter:      orderCounter,
        revenueCounter:    revenueCounter,
        cartSizeHistogram: cartSizeHistogram,
        activeUsersGauge:  activeUsersGauge,
    }, nil
}

// RecordOrder records a completed order
func (bm *BusinessMetrics) RecordOrder(ctx context.Context, orderValue float64, itemCount int, category string) {
    // Increment order counter
    bm.orderCounter.Add(ctx, 1,
        metric.WithAttributes(
            attribute.String("product.category", category),
        ),
    )

    // Add to revenue
    bm.revenueCounter.Add(ctx, orderValue,
        metric.WithAttributes(
            attribute.String("product.category", category),
        ),
    )

    // Record cart size
    bm.cartSizeHistogram.Record(ctx, float64(itemCount),
        metric.WithAttributes(
            attribute.String("product.category", category),
        ),
    )
}

// RecordCartAbandonment tracks abandoned shopping carts
func (bm *BusinessMetrics) RecordCartAbandonment(ctx context.Context, cartValue float64, reason string) {
    meter := otel.Meter("business")

    abandonmentCounter, _ := meter.Int64Counter(
        "business.cart.abandoned",
        metric.WithDescription("Number of abandoned shopping carts"),
    )

    abandonmentCounter.Add(ctx, 1,
        metric.WithAttributes(
            attribute.String("abandonment.reason", reason),
            attribute.Float64("cart.value", cartValue),
        ),
    )
}
```

## Creating Metric Views for Aggregation

Views let you customize how metrics are aggregated and exported without changing instrumentation code.

```go
package main

import (
    "go.opentelemetry.io/otel/sdk/metric"
)

// ConfigureMetricViews sets up custom aggregations
func ConfigureMetricViews() []metric.View {
    return []metric.View{
        // Customize histogram buckets for request duration
        metric.NewView(
            metric.Instrument{
                Name: "http.server.request.duration",
            },
            metric.Stream{
                Aggregation: metric.AggregationExplicitBucketHistogram{
                    Boundaries: []float64{0.01, 0.05, 0.1, 0.5, 1, 2, 5},
                },
            },
        ),

        // Drop high-cardinality attributes
        metric.NewView(
            metric.Instrument{
                Name: "http.server.requests",
            },
            metric.Stream{
                AttributeFilter: attribute.NewSet(
                    attribute.String("http.method", ""),
                    attribute.String("http.route", ""),
                    // Drop user_id to reduce cardinality
                ),
            },
        ),

        // Rename a metric
        metric.NewView(
            metric.Instrument{
                Name: "database.query.duration",
            },
            metric.Stream{
                Name: "db.query.latency",
            },
        ),
    }
}

// Initialize meter provider with custom views
func initMetricsWithViews(serviceName string) (*metric.MeterProvider, error) {
    ctx := context.Background()

    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("localhost:4317"),
        otlpmetricgrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceNameKey.String(serviceName),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Apply custom views
    views := ConfigureMetricViews()

    mp := metric.NewMeterProvider(
        metric.WithReader(metric.NewPeriodicReader(exporter)),
        metric.WithResource(res),
        metric.WithView(views...),
    )

    otel.SetMeterProvider(mp)

    return mp, nil
}
```

## Complete Example: E-Commerce Service Metrics

Here's a complete example showing how custom metrics work together in a real application.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math/rand"
    "time"
)

// ECommerceService demonstrates comprehensive metric instrumentation
type ECommerceService struct {
    businessMetrics *BusinessMetrics
    latencyMetrics  *LatencyMetrics
    requestMetrics  *RequestMetrics
}

// NewECommerceService creates a fully instrumented service
func NewECommerceService() (*ECommerceService, error) {
    businessMetrics, err := NewBusinessMetrics()
    if err != nil {
        return nil, err
    }

    latencyMetrics, err := NewLatencyMetrics()
    if err != nil {
        return nil, err
    }

    requestMetrics, err := NewRequestMetrics()
    if err != nil {
        return nil, err
    }

    return &ECommerceService{
        businessMetrics: businessMetrics,
        latencyMetrics:  latencyMetrics,
        requestMetrics:  requestMetrics,
    }, nil
}

// ProcessCheckout handles order checkout with full instrumentation
func (svc *ECommerceService) ProcessCheckout(ctx context.Context, cartValue float64, itemCount int, category string) error {
    start := time.Now()

    // Simulate processing
    time.Sleep(time.Duration(rand.Intn(200)) * time.Millisecond)

    // Record business metrics
    svc.businessMetrics.RecordOrder(ctx, cartValue, itemCount, category)

    // Record performance metrics
    duration := time.Since(start)
    svc.latencyMetrics.RecordRequestDuration(ctx, duration, "POST", "/checkout", 200)

    // Record request metrics
    svc.requestMetrics.RecordRequest(ctx, "POST", "/checkout", 200, 1024)

    return nil
}

func main() {
    // Initialize metrics
    mp, err := initMetrics("ecommerce-service")
    if err != nil {
        log.Fatal(err)
    }
    defer func() {
        if err := mp.Shutdown(context.Background()); err != nil {
            log.Printf("Error shutting down meter provider: %v", err)
        }
    }()

    // Initialize runtime metrics
    _, err = NewRuntimeMetrics()
    if err != nil {
        log.Fatal(err)
    }

    // Create service
    service, err := NewECommerceService()
    if err != nil {
        log.Fatal(err)
    }

    // Simulate traffic
    ctx := context.Background()
    categories := []string{"electronics", "clothing", "books", "food"}

    for i := 0; i < 100; i++ {
        cartValue := 10.0 + rand.Float64()*490.0
        itemCount := 1 + rand.Intn(20)
        category := categories[rand.Intn(len(categories))]

        if err := service.ProcessCheckout(ctx, cartValue, itemCount, category); err != nil {
            log.Printf("Checkout failed: %v", err)
        }

        time.Sleep(100 * time.Millisecond)
    }

    log.Println("Completed processing 100 orders")
    time.Sleep(15 * time.Second) // Wait for final export
}
```

## Metrics Best Practices

Following these guidelines ensures effective metric instrumentation:

**Cardinality Control**: Avoid unbounded attribute values like user IDs. High cardinality destroys aggregation benefits and increases storage costs.

**Meaningful Names**: Use descriptive names following semantic conventions. Prefer `http.server.requests` over `requests`.

**Appropriate Units**: Always specify units (`s` for seconds, `By` for bytes, `{request}` for counts).

**Attribute Consistency**: Use the same attribute keys across related metrics for easier correlation and aggregation.

**Sampling Considerations**: For high-frequency events, consider aggregating locally before recording to reduce overhead.

## Monitoring Metric Performance

Track the cost of metrics collection to ensure instrumentation doesn't impact application performance.

```go
package main

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
)

// MetricsObserver monitors metrics system performance
type MetricsObserver struct {
    recordDuration metric.Float64Histogram
}

// NewMetricsObserver creates a metrics observer
func NewMetricsObserver() (*MetricsObserver, error) {
    meter := otel.Meter("otel.metrics")

    recordDuration, err := meter.Float64Histogram(
        "otel.metrics.record.duration",
        metric.WithDescription("Time spent recording metrics"),
        metric.WithUnit("s"),
    )
    if err != nil {
        return nil, err
    }

    return &MetricsObserver{
        recordDuration: recordDuration,
    }, nil
}

// ObserveRecording measures the overhead of metric recording
func (mo *MetricsObserver) ObserveRecording(ctx context.Context, metricName string, recordFunc func()) {
    start := time.Now()
    recordFunc()
    duration := time.Since(start)

    mo.recordDuration.Record(ctx, duration.Seconds(),
        metric.WithAttributes(
            attribute.String("metric.name", metricName),
        ),
    )
}
```

Custom OpenTelemetry metrics transform raw application events into actionable insights. By choosing appropriate instrument types, controlling cardinality, and following semantic conventions, you build a metrics foundation that scales from development through production. Combined with traces and logs, custom metrics complete your observability picture, enabling data-driven decisions about performance, reliability, and business outcomes.
