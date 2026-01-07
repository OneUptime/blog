# How to Add Trace Exemplars to Go Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Metrics, Tracing, Exemplars, OpenTelemetry, Observability

Description: Connect metric spikes to specific traces in Go using exemplars to enable drill-down from high-level metrics to detailed trace data.

---

Metrics and traces are two fundamental pillars of observability. Metrics provide aggregate views of system behavior over time, while traces offer detailed insights into individual request flows. But what happens when you spot a latency spike in your metrics dashboard? How do you find the specific traces that caused that spike?

This is where **exemplars** come in. Exemplars are references to trace data attached to metric observations, creating a bridge between your aggregate metrics and the detailed traces that explain them. In this comprehensive guide, we will explore how to add trace exemplars to Go metrics using OpenTelemetry and Prometheus.

## What Are Exemplars?

Exemplars are sample data points that represent a particular metric observation, along with contextual information that links to detailed trace data. When you record a histogram observation, an exemplar captures:

1. The observed value
2. A timestamp
3. Trace context (trace ID and span ID)
4. Optional labels

This allows observability platforms like Grafana to show clickable links from metric data points directly to the corresponding traces.

### Why Exemplars Matter

Consider this scenario: your HTTP request latency p99 suddenly jumps from 200ms to 2 seconds. Without exemplars, you would need to:

1. Note the approximate time of the spike
2. Switch to your tracing UI
3. Search through potentially thousands of traces
4. Try to find the slow ones manually

With exemplars, you can:

1. Click on the spike in your metrics graph
2. See the exemplar data points
3. Click directly through to the trace that caused the spike

This dramatically reduces mean time to resolution (MTTR) for performance issues.

## Prerequisites

Before we begin, ensure you have the following:

- Go 1.21 or later
- Basic understanding of OpenTelemetry concepts
- Prometheus and Grafana for visualization (optional but recommended)
- A running application you want to instrument

## Setting Up the OpenTelemetry SDK

First, let's set up the OpenTelemetry SDK with both tracing and metrics support. We need both because exemplars connect these two signals.

### Installing Dependencies

Run the following command to install the required OpenTelemetry packages:

```bash
go get go.opentelemetry.io/otel \
    go.opentelemetry.io/otel/sdk \
    go.opentelemetry.io/otel/sdk/metric \
    go.opentelemetry.io/otel/sdk/trace \
    go.opentelemetry.io/otel/exporters/prometheus \
    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc \
    go.opentelemetry.io/otel/trace \
    github.com/prometheus/client_golang/prometheus \
    github.com/prometheus/client_golang/prometheus/promhttp
```

### Initializing the Tracer Provider

This code sets up the tracer provider with OTLP export for sending traces to your backend:

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// initTracerProvider creates and configures an OpenTelemetry tracer provider
// that exports traces via OTLP/gRPC to a collector endpoint
func initTracerProvider(ctx context.Context) (*sdktrace.TracerProvider, error) {
    // Create the OTLP exporter that sends traces to the collector
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    // Define resource attributes that describe this service
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("my-go-service"),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create the tracer provider with batch processing for efficiency
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        // Always sample for demo purposes; adjust for production
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    // Set as the global tracer provider
    otel.SetTracerProvider(tp)

    // Configure context propagation for distributed tracing
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    return tp, nil
}
```

### Initializing the Meter Provider with Prometheus Exporter

The meter provider needs to be configured with the Prometheus exporter to expose metrics with exemplar support:

```go
package main

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/prometheus"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// initMeterProvider creates and configures an OpenTelemetry meter provider
// with Prometheus export and exemplar support enabled
func initMeterProvider() (*sdkmetric.MeterProvider, error) {
    // Create the Prometheus exporter with exemplar support
    // The WithoutUnits option removes unit suffixes for cleaner metric names
    exporter, err := prometheus.New(
        prometheus.WithoutUnits(),
    )
    if err != nil {
        return nil, err
    }

    // Define resource attributes consistent with the tracer provider
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("my-go-service"),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create the meter provider with the Prometheus reader
    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(exporter),
        sdkmetric.WithResource(res),
    )

    // Set as the global meter provider
    otel.SetMeterProvider(mp)

    return mp, nil
}
```

## Creating Metrics with Exemplar Support

OpenTelemetry automatically attaches exemplars when you record metrics within an active span context. Let's create a histogram for tracking HTTP request latency.

### Defining the Histogram Instrument

This code creates a histogram metric that will capture request duration with automatic exemplar attachment:

```go
package main

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
)

// Global meter for creating instruments
var meter = otel.Meter("my-go-service")

// requestDuration tracks HTTP request latency in seconds
// Exemplars are automatically attached when recorded within a span context
var requestDuration metric.Float64Histogram

// initMetrics initializes all metric instruments used by the application
func initMetrics() error {
    var err error

    // Create a histogram with explicit bucket boundaries
    // These boundaries are chosen to capture typical web request latencies
    requestDuration, err = meter.Float64Histogram(
        "http_request_duration_seconds",
        metric.WithDescription("Duration of HTTP requests in seconds"),
        metric.WithUnit("s"),
        metric.WithExplicitBucketBoundaries(
            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
        ),
    )
    if err != nil {
        return err
    }

    return nil
}
```

### Recording Metrics with Trace Context

The key to exemplar attachment is recording metrics within an active span context. Here's how to instrument an HTTP handler:

```go
package main

import (
    "context"
    "net/http"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/trace"
)

// tracer creates spans for distributed tracing
var tracer = otel.Tracer("my-go-service")

// handleRequest is an HTTP handler that demonstrates exemplar attachment
// The metric observation includes trace context automatically
func handleRequest(w http.ResponseWriter, r *http.Request) {
    // Start timing the request
    start := time.Now()

    // Create a span for this request - this provides the trace context
    ctx, span := tracer.Start(r.Context(), "handleRequest",
        trace.WithAttributes(
            attribute.String("http.method", r.Method),
            attribute.String("http.url", r.URL.Path),
        ),
    )
    defer span.End()

    // Simulate some work
    processRequest(ctx)

    // Calculate request duration
    duration := time.Since(start).Seconds()

    // Record the metric with the span context
    // The exemplar is automatically attached because ctx contains an active span
    requestDuration.Record(ctx, duration,
        metric.WithAttributes(
            attribute.String("method", r.Method),
            attribute.String("path", r.URL.Path),
            attribute.Int("status", http.StatusOK),
        ),
    )

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

// processRequest simulates request processing with nested spans
func processRequest(ctx context.Context) {
    _, span := tracer.Start(ctx, "processRequest")
    defer span.End()

    // Simulate variable processing time
    time.Sleep(time.Duration(50+rand.Intn(200)) * time.Millisecond)
}
```

## Understanding the Prometheus Exemplar Format

When Prometheus scrapes your metrics endpoint, exemplars are included in a specific format. Let's examine how this works.

### Enabling Exemplar Scraping

Your metrics endpoint must be configured to serve exemplars. Here's the complete HTTP handler setup:

```go
package main

import (
    "net/http"

    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// setupMetricsEndpoint configures the /metrics endpoint with exemplar support
// The EnableOpenMetrics option is required for exemplar exposure
func setupMetricsEndpoint() http.Handler {
    return promhttp.HandlerFor(
        prometheus.DefaultGatherer,
        promhttp.HandlerOpts{
            // EnableOpenMetrics enables the OpenMetrics format
            // which is required for exemplar support
            EnableOpenMetrics: true,
        },
    )
}
```

### Exemplar Format in OpenMetrics

When you curl your metrics endpoint with the correct Accept header, you'll see exemplars attached to histogram observations:

```bash
# Request metrics with OpenMetrics format to see exemplars
curl -H "Accept: application/openmetrics-text" http://localhost:8080/metrics
```

The output includes exemplars in the following format:

```text
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",path="/api/users",status="200",le="0.1"} 45 # {trace_id="abc123def456",span_id="789xyz"} 0.089 1704672000.000
http_request_duration_seconds_bucket{method="GET",path="/api/users",status="200",le="0.25"} 98 # {trace_id="def456abc789",span_id="xyz123"} 0.234 1704672001.000
http_request_duration_seconds_bucket{method="GET",path="/api/users",status="200",le="0.5"} 120 # {trace_id="ghi789jkl012",span_id="mno345"} 0.445 1704672002.000
```

Each exemplar contains:

- `trace_id`: The OpenTelemetry trace ID
- `span_id`: The span ID at the time of recording
- The observed value (e.g., 0.089 seconds)
- A Unix timestamp

## Querying Exemplars in Grafana

Grafana provides excellent support for visualizing exemplars. Here's how to set it up and query them effectively.

### Configuring the Prometheus Data Source

Enable exemplar support in your Grafana Prometheus data source configuration:

```yaml
# grafana-datasource.yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    jsonData:
      # Enable exemplar support
      exemplarTraceIdDestinations:
        - name: trace_id
          datasourceUid: tempo
          urlDisplayLabel: "View Trace"
      httpMethod: POST
```

### Building Queries with Exemplars

In Grafana, create a panel with a histogram query and enable exemplar display:

```promql
# Query for request latency histogram with exemplars
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, method, path)
)
```

In the panel settings:

1. Go to the Query tab
2. Toggle "Exemplars" to ON
3. The graph will show exemplar dots on the chart
4. Clicking a dot links directly to the trace

### Creating an Exemplar-Focused Dashboard

Here's a complete dashboard JSON snippet for visualizing metrics with exemplars:

```json
{
  "panels": [
    {
      "title": "Request Latency with Exemplars",
      "type": "timeseries",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "p99 latency",
          "exemplar": true
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "p95 latency",
          "exemplar": true
        },
        {
          "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "p50 latency",
          "exemplar": true
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "s"
        }
      }
    }
  ]
}
```

## Best Practices for Exemplar Cardinality

Exemplars add overhead to your metrics, so it's important to manage them carefully. Here are best practices for production use.

### Limiting Exemplar Storage

Prometheus has built-in limits for exemplar storage. Configure these in your prometheus.yml:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

storage:
  exemplars:
    # Maximum number of exemplars to store
    # Older exemplars are evicted when this limit is reached
    max_exemplars: 100000

scrape_configs:
  - job_name: 'my-go-service'
    static_configs:
      - targets: ['localhost:8080']
    # Scrape with OpenMetrics format to capture exemplars
    scrape_protocols:
      - OpenMetricsText1.0.0
```

### Selective Exemplar Recording

Not every metric observation needs an exemplar. Here's how to be selective:

```go
package main

import (
    "context"
    "math/rand"
    "time"

    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/trace"
)

// ExemplarSampler controls which observations get exemplars attached
type ExemplarSampler struct {
    // sampleRate is the probability of recording an exemplar (0.0 to 1.0)
    sampleRate float64
}

// NewExemplarSampler creates a sampler with the specified rate
func NewExemplarSampler(rate float64) *ExemplarSampler {
    return &ExemplarSampler{sampleRate: rate}
}

// ShouldSample returns true if this observation should include an exemplar
func (s *ExemplarSampler) ShouldSample() bool {
    return rand.Float64() < s.sampleRate
}

// recordWithSampledExemplar records a metric observation with optional exemplar
// Only includes trace context when the sampler decides to include an exemplar
func recordWithSampledExemplar(
    ctx context.Context,
    histogram metric.Float64Histogram,
    value float64,
    sampler *ExemplarSampler,
    attrs ...metric.RecordOption,
) {
    if sampler.ShouldSample() {
        // Record with full context - exemplar will be attached
        histogram.Record(ctx, value, attrs...)
    } else {
        // Record without span context - no exemplar
        histogram.Record(context.Background(), value, attrs...)
    }
}
```

### Prioritizing High-Value Exemplars

Focus exemplar collection on observations that are most valuable for debugging:

```go
package main

import (
    "context"
    "time"

    "go.opentelemetry.io/otel/metric"
)

// LatencyThreshold defines when an observation is "interesting" enough for an exemplar
const LatencyThreshold = 500 * time.Millisecond

// recordWithThresholdExemplar attaches exemplars only to slow requests
// This ensures exemplars capture the problematic requests we want to investigate
func recordWithThresholdExemplar(
    ctx context.Context,
    histogram metric.Float64Histogram,
    duration time.Duration,
    attrs ...metric.RecordOption,
) {
    durationSeconds := duration.Seconds()

    if duration > LatencyThreshold {
        // Slow request - attach exemplar for debugging
        histogram.Record(ctx, durationSeconds, attrs...)
    } else {
        // Fast request - no exemplar needed
        histogram.Record(context.Background(), durationSeconds, attrs...)
    }
}

// recordWithAdaptiveSampling uses adaptive sampling based on current latency
// More samples are taken when latency increases, fewer when system is healthy
func recordWithAdaptiveSampling(
    ctx context.Context,
    histogram metric.Float64Histogram,
    duration time.Duration,
    p99Latency time.Duration, // Current p99 from a moving window
    attrs ...metric.RecordOption,
) {
    durationSeconds := duration.Seconds()

    // Always capture exemplars for requests above p99
    if duration > p99Latency {
        histogram.Record(ctx, durationSeconds, attrs...)
        return
    }

    // Sample 10% of requests between p95 and p99
    if duration > p99Latency*80/100 && rand.Float64() < 0.1 {
        histogram.Record(ctx, durationSeconds, attrs...)
        return
    }

    // Sample 1% of normal requests
    if rand.Float64() < 0.01 {
        histogram.Record(ctx, durationSeconds, attrs...)
        return
    }

    // No exemplar for this observation
    histogram.Record(context.Background(), durationSeconds, attrs...)
}
```

## Troubleshooting Latency Spikes with Exemplars

Let's walk through a complete example of using exemplars to debug a production latency issue.

### Setting Up the Instrumented Application

Here's a complete application that demonstrates exemplar-based debugging:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math/rand"
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    otelprometheus "go.opentelemetry.io/otel/exporters/prometheus"
    "go.opentelemetry.io/otel/metric"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
    "go.opentelemetry.io/otel/trace"
)

var (
    tracer          trace.Tracer
    meter           metric.Meter
    requestDuration metric.Float64Histogram
    requestCounter  metric.Int64Counter
    errorCounter    metric.Int64Counter
)

func main() {
    ctx := context.Background()

    // Initialize OpenTelemetry
    shutdown, err := initOTel(ctx)
    if err != nil {
        log.Fatalf("Failed to initialize OpenTelemetry: %v", err)
    }
    defer shutdown(ctx)

    // Initialize metrics
    if err := initMetrics(); err != nil {
        log.Fatalf("Failed to initialize metrics: %v", err)
    }

    // Set up HTTP routes
    http.HandleFunc("/api/users", instrumentedHandler(handleUsers))
    http.HandleFunc("/api/orders", instrumentedHandler(handleOrders))
    http.Handle("/metrics", promhttp.HandlerFor(
        prometheus.DefaultGatherer,
        promhttp.HandlerOpts{EnableOpenMetrics: true},
    ))

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

// initOTel initializes both tracing and metrics with proper shutdown handling
func initOTel(ctx context.Context) (func(context.Context) error, error) {
    // Create resource
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("exemplar-demo"),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Set up tracer provider
    traceExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(traceExporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )
    otel.SetTracerProvider(tp)
    tracer = tp.Tracer("exemplar-demo")

    // Set up meter provider with Prometheus exporter
    metricExporter, err := otelprometheus.New()
    if err != nil {
        return nil, err
    }

    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(metricExporter),
        sdkmetric.WithResource(res),
    )
    otel.SetMeterProvider(mp)
    meter = mp.Meter("exemplar-demo")

    // Return shutdown function
    return func(ctx context.Context) error {
        if err := tp.Shutdown(ctx); err != nil {
            return err
        }
        return mp.Shutdown(ctx)
    }, nil
}

// initMetrics creates all metric instruments
func initMetrics() error {
    var err error

    requestDuration, err = meter.Float64Histogram(
        "http_request_duration_seconds",
        metric.WithDescription("HTTP request latency in seconds"),
        metric.WithUnit("s"),
        metric.WithExplicitBucketBoundaries(
            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
        ),
    )
    if err != nil {
        return err
    }

    requestCounter, err = meter.Int64Counter(
        "http_requests_total",
        metric.WithDescription("Total number of HTTP requests"),
    )
    if err != nil {
        return err
    }

    errorCounter, err = meter.Int64Counter(
        "http_errors_total",
        metric.WithDescription("Total number of HTTP errors"),
    )
    if err != nil {
        return err
    }

    return nil
}

// instrumentedHandler wraps an HTTP handler with tracing and metrics
func instrumentedHandler(handler func(context.Context, http.ResponseWriter, *http.Request) (int, error)) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Create span for this request
        ctx, span := tracer.Start(r.Context(), fmt.Sprintf("%s %s", r.Method, r.URL.Path),
            trace.WithAttributes(
                attribute.String("http.method", r.Method),
                attribute.String("http.url", r.URL.Path),
                attribute.String("http.user_agent", r.UserAgent()),
            ),
        )
        defer span.End()

        // Call the actual handler
        status, err := handler(ctx, w, r)

        // Calculate duration
        duration := time.Since(start)

        // Record metrics with exemplar (context contains span)
        attrs := metric.WithAttributes(
            attribute.String("method", r.Method),
            attribute.String("path", r.URL.Path),
            attribute.Int("status", status),
        )

        requestDuration.Record(ctx, duration.Seconds(), attrs)
        requestCounter.Add(ctx, 1, attrs)

        if err != nil {
            errorCounter.Add(ctx, 1, attrs)
            span.RecordError(err)
        }

        // Add status to span
        span.SetAttributes(attribute.Int("http.status_code", status))
    }
}

// handleUsers simulates a user API with occasional slow responses
func handleUsers(ctx context.Context, w http.ResponseWriter, r *http.Request) (int, error) {
    _, span := tracer.Start(ctx, "fetchUsers")
    defer span.End()

    // Simulate database query with variable latency
    baseLatency := 20 * time.Millisecond

    // 5% chance of slow query (simulating N+1 or missing index)
    if rand.Float64() < 0.05 {
        baseLatency = 800 * time.Millisecond
        span.SetAttributes(attribute.Bool("slow_query", true))
    }

    time.Sleep(baseLatency + time.Duration(rand.Intn(30))*time.Millisecond)

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"users": []}`))
    return http.StatusOK, nil
}

// handleOrders simulates an order API with dependency on external service
func handleOrders(ctx context.Context, w http.ResponseWriter, r *http.Request) (int, error) {
    // Fetch order data
    _, orderSpan := tracer.Start(ctx, "fetchOrders")
    time.Sleep(time.Duration(30+rand.Intn(20)) * time.Millisecond)
    orderSpan.End()

    // Call external payment service - occasionally slow
    _, paymentSpan := tracer.Start(ctx, "checkPaymentStatus")
    paymentLatency := 50 * time.Millisecond

    // 10% chance of slow external service
    if rand.Float64() < 0.10 {
        paymentLatency = 2 * time.Second
        paymentSpan.SetAttributes(attribute.Bool("external_service_slow", true))
    }
    time.Sleep(paymentLatency)
    paymentSpan.End()

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"orders": []}`))
    return http.StatusOK, nil
}
```

### Debugging Workflow

When you observe a latency spike, follow this workflow:

1. **Identify the spike in Grafana**: Look at your latency percentile graph and notice the spike.

2. **Enable exemplar display**: Toggle the exemplar option in your Grafana panel.

3. **Click on an exemplar point**: Grafana shows dots on the graph representing exemplars. Click one during the spike.

4. **Follow the trace link**: Grafana opens the trace in your tracing backend (Tempo, Jaeger, etc.).

5. **Analyze the trace**: Look for:
   - Which span took the longest
   - Any error annotations
   - Slow dependencies
   - Missing or slow database indexes

### Creating an Alert with Trace Context

You can also include trace IDs in alerts for faster debugging:

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel/trace"
)

// AlertThreshold defines when to trigger a latency alert
const AlertThreshold = 2 * time.Second

// checkAndAlert evaluates request latency and logs an alert with trace context
// This enables direct correlation between alerts and traces
func checkAndAlert(ctx context.Context, duration time.Duration, endpoint string) {
    if duration > AlertThreshold {
        spanCtx := trace.SpanContextFromContext(ctx)

        // Log alert with trace ID for direct lookup
        log.Printf(
            "ALERT: High latency detected on %s: %v (trace_id=%s, span_id=%s)",
            endpoint,
            duration,
            spanCtx.TraceID().String(),
            spanCtx.SpanID().String(),
        )

        // You could also send this to an alerting system with the trace URL
        // alertManager.Send(Alert{
        //     Message: fmt.Sprintf("High latency on %s", endpoint),
        //     TraceURL: fmt.Sprintf("https://tempo.example.com/trace/%s", spanCtx.TraceID()),
        // })
    }
}
```

## Advanced Exemplar Patterns

### Custom Exemplar Labels

You can include additional context in exemplars beyond just trace IDs:

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/baggage"
    "go.opentelemetry.io/otel/metric"
)

// recordWithCustomLabels demonstrates adding custom context to exemplars
// Baggage is propagated through the context and can enhance exemplar data
func recordWithCustomLabels(
    ctx context.Context,
    histogram metric.Float64Histogram,
    value float64,
    userID string,
    region string,
) error {
    // Add custom context via baggage (propagates through trace context)
    userMember, err := baggage.NewMember("user_id", userID)
    if err != nil {
        return err
    }
    regionMember, err := baggage.NewMember("region", region)
    if err != nil {
        return err
    }

    bag, err := baggage.New(userMember, regionMember)
    if err != nil {
        return err
    }

    ctx = baggage.ContextWithBaggage(ctx, bag)

    // Record with enhanced context
    histogram.Record(ctx, value,
        metric.WithAttributes(
            attribute.String("user_id", userID),
            attribute.String("region", region),
        ),
    )

    return nil
}
```

### Exemplars for Counter Metrics

While histograms are the primary use case for exemplars, you can also attach them to counters for error tracking:

```go
package main

import (
    "context"
    "errors"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/trace"
)

// recordErrorWithExemplar attaches trace context to error counter increments
// This allows drilling down from error rate spikes to specific failing traces
func recordErrorWithExemplar(
    ctx context.Context,
    errorCounter metric.Int64Counter,
    err error,
    endpoint string,
) {
    span := trace.SpanFromContext(ctx)

    // Record the error in the span
    span.RecordError(err)

    // Increment counter with exemplar
    errorCounter.Add(ctx, 1,
        metric.WithAttributes(
            attribute.String("endpoint", endpoint),
            attribute.String("error_type", errorType(err)),
        ),
    )
}

// errorType categorizes errors for metric labeling
func errorType(err error) string {
    switch {
    case errors.Is(err, context.DeadlineExceeded):
        return "timeout"
    case errors.Is(err, context.Canceled):
        return "canceled"
    default:
        return "internal"
    }
}
```

## Complete Example: Production-Ready Setup

Here's a complete, production-ready setup that combines all the concepts:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    otelprometheus "go.opentelemetry.io/otel/exporters/prometheus"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/propagation"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
    "go.opentelemetry.io/otel/trace"
)

// Config holds application configuration
type Config struct {
    ServiceName    string
    ServiceVersion string
    OTLPEndpoint   string
    MetricsPort    int
    HTTPPort       int
}

// Telemetry holds all observability components
type Telemetry struct {
    TracerProvider *sdktrace.TracerProvider
    MeterProvider  *sdkmetric.MeterProvider
    Tracer         trace.Tracer
    Meter          metric.Meter

    // Metrics
    RequestDuration metric.Float64Histogram
    RequestsTotal   metric.Int64Counter
    ErrorsTotal     metric.Int64Counter
}

// NewTelemetry initializes the complete telemetry stack
func NewTelemetry(ctx context.Context, cfg Config) (*Telemetry, error) {
    // Create shared resource
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName(cfg.ServiceName),
            semconv.ServiceVersion(cfg.ServiceVersion),
            semconv.DeploymentEnvironment(os.Getenv("ENVIRONMENT")),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("creating resource: %w", err)
    }

    // Initialize tracer provider
    traceExporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(cfg.OTLPEndpoint),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("creating trace exporter: %w", err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(traceExporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))),
    )
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    // Initialize meter provider with Prometheus
    metricExporter, err := otelprometheus.New()
    if err != nil {
        return nil, fmt.Errorf("creating metric exporter: %w", err)
    }

    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(metricExporter),
        sdkmetric.WithResource(res),
    )
    otel.SetMeterProvider(mp)

    tel := &Telemetry{
        TracerProvider: tp,
        MeterProvider:  mp,
        Tracer:         tp.Tracer(cfg.ServiceName),
        Meter:          mp.Meter(cfg.ServiceName),
    }

    // Initialize metrics
    if err := tel.initMetrics(); err != nil {
        return nil, fmt.Errorf("initializing metrics: %w", err)
    }

    return tel, nil
}

// initMetrics creates all metric instruments
func (t *Telemetry) initMetrics() error {
    var err error

    t.RequestDuration, err = t.Meter.Float64Histogram(
        "http_request_duration_seconds",
        metric.WithDescription("HTTP request latency distribution"),
        metric.WithUnit("s"),
        metric.WithExplicitBucketBoundaries(
            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
        ),
    )
    if err != nil {
        return err
    }

    t.RequestsTotal, err = t.Meter.Int64Counter(
        "http_requests_total",
        metric.WithDescription("Total HTTP requests processed"),
    )
    if err != nil {
        return err
    }

    t.ErrorsTotal, err = t.Meter.Int64Counter(
        "http_errors_total",
        metric.WithDescription("Total HTTP errors"),
    )
    if err != nil {
        return err
    }

    return nil
}

// Shutdown gracefully shuts down telemetry components
func (t *Telemetry) Shutdown(ctx context.Context) error {
    if err := t.TracerProvider.Shutdown(ctx); err != nil {
        return err
    }
    return t.MeterProvider.Shutdown(ctx)
}

// HTTPMiddleware creates middleware that instruments HTTP handlers
func (t *Telemetry) HTTPMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        ctx, span := t.Tracer.Start(r.Context(), fmt.Sprintf("%s %s", r.Method, r.URL.Path),
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                semconv.HTTPMethod(r.Method),
                semconv.HTTPURL(r.URL.String()),
                semconv.HTTPUserAgent(r.UserAgent()),
            ),
        )
        defer span.End()

        // Wrap response writer to capture status code
        wrapped := &responseWriter{ResponseWriter: w, status: http.StatusOK}

        // Call next handler
        next.ServeHTTP(wrapped, r.WithContext(ctx))

        // Record metrics with exemplar
        duration := time.Since(start)
        attrs := metric.WithAttributes(
            attribute.String("method", r.Method),
            attribute.String("path", r.URL.Path),
            attribute.Int("status", wrapped.status),
        )

        t.RequestDuration.Record(ctx, duration.Seconds(), attrs)
        t.RequestsTotal.Add(ctx, 1, attrs)

        if wrapped.status >= 400 {
            t.ErrorsTotal.Add(ctx, 1, attrs)
        }

        span.SetAttributes(semconv.HTTPStatusCode(wrapped.status))
    })
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
    http.ResponseWriter
    status int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.status = code
    rw.ResponseWriter.WriteHeader(code)
}

func main() {
    ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer cancel()

    cfg := Config{
        ServiceName:    "exemplar-demo",
        ServiceVersion: "1.0.0",
        OTLPEndpoint:   getEnv("OTLP_ENDPOINT", "localhost:4317"),
        MetricsPort:    8081,
        HTTPPort:       8080,
    }

    // Initialize telemetry
    tel, err := NewTelemetry(ctx, cfg)
    if err != nil {
        log.Fatalf("Failed to initialize telemetry: %v", err)
    }
    defer tel.Shutdown(context.Background())

    // Set up application routes
    mux := http.NewServeMux()
    mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })

    // Apply middleware
    handler := tel.HTTPMiddleware(mux)

    // Start metrics server
    go func() {
        metricsMux := http.NewServeMux()
        metricsMux.Handle("/metrics", promhttp.HandlerFor(
            prometheus.DefaultGatherer,
            promhttp.HandlerOpts{EnableOpenMetrics: true},
        ))
        log.Printf("Metrics server starting on :%d", cfg.MetricsPort)
        if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.MetricsPort), metricsMux); err != nil {
            log.Printf("Metrics server error: %v", err)
        }
    }()

    // Start HTTP server
    server := &http.Server{
        Addr:    fmt.Sprintf(":%d", cfg.HTTPPort),
        Handler: handler,
    }

    go func() {
        log.Printf("HTTP server starting on :%d", cfg.HTTPPort)
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("HTTP server error: %v", err)
        }
    }()

    // Wait for shutdown signal
    <-ctx.Done()
    log.Println("Shutting down...")

    shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer shutdownCancel()

    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Printf("HTTP server shutdown error: %v", err)
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

## Conclusion

Trace exemplars bridge the gap between aggregate metrics and detailed traces, dramatically reducing the time needed to investigate performance issues. By following the patterns in this guide, you can:

1. Set up OpenTelemetry with both tracing and metrics
2. Automatically attach trace context to histogram observations
3. Expose exemplars in Prometheus format
4. Query and visualize exemplars in Grafana
5. Implement smart sampling strategies to manage cardinality
6. Debug latency spikes efficiently using exemplar links

The key takeaway is that exemplars should be treated as a first-class citizen in your observability strategy. When you record a metric observation within an active span context, the exemplar attachment happens automatically, making it easy to adopt this powerful debugging technique.

Start by instrumenting your most critical paths with exemplar-enabled metrics, and you'll quickly see the value when investigating your next production incident.

## Additional Resources

- [OpenTelemetry Go SDK Documentation](https://opentelemetry.io/docs/instrumentation/go/)
- [Prometheus Exemplars Specification](https://prometheus.io/docs/prometheus/latest/feature_flags/#exemplars-storage)
- [Grafana Exemplar Support](https://grafana.com/docs/grafana/latest/fundamentals/exemplars/)
- [OpenMetrics Specification](https://openmetrics.io/)
