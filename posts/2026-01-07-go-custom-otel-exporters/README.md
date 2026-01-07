# How to Implement Custom OpenTelemetry Exporters in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, OpenTelemetry, Exporters, Observability, Tracing, Metrics

Description: Build custom OpenTelemetry exporters in Go to send traces, metrics, and logs to any backend or storage system.

---

OpenTelemetry provides a vendor-neutral standard for collecting telemetry data, but sometimes you need to send that data to a custom backend, proprietary system, or specialized storage. This guide walks you through implementing custom exporters in Go for traces, metrics, and logs, giving you complete control over how your telemetry data is processed and transmitted.

## Prerequisites

Before diving in, ensure you have:

- Go 1.21 or later installed
- Basic understanding of OpenTelemetry concepts
- Familiarity with Go interfaces and concurrency patterns

## Understanding Exporter Interface Contracts

OpenTelemetry defines specific interfaces that exporters must implement. Understanding these contracts is crucial for building reliable custom exporters.

### The SpanExporter Interface

The `SpanExporter` interface defines how trace spans are exported to backends.

```go
// The SpanExporter interface from the OpenTelemetry SDK
// Any custom trace exporter must implement these three methods
type SpanExporter interface {
    // ExportSpans exports a batch of spans
    ExportSpans(ctx context.Context, spans []ReadOnlySpan) error

    // Shutdown notifies the exporter of a pending halt to operations
    Shutdown(ctx context.Context) error
}
```

### The MetricExporter Interface

The metric exporter interface handles the export of aggregated metric data.

```go
// The metric exporter interface for push-based metric export
// Implements both Export and Shutdown methods
type Exporter interface {
    // Export exports a batch of metrics
    Export(ctx context.Context, rm *metricdata.ResourceMetrics) error

    // Temporality returns the temporality preference for the given instrument kind
    Temporality(kind metric.InstrumentKind) metricdata.Temporality

    // Aggregation returns the aggregation preference for the given instrument kind
    Aggregation(kind metric.InstrumentKind) metric.Aggregation

    // Shutdown shuts down the exporter
    Shutdown(ctx context.Context) error
}
```

### Common Interface Patterns

All OpenTelemetry exporters share certain characteristics that you should understand.

```go
// Key patterns across all exporter interfaces:
// 1. Context-aware operations for cancellation and timeouts
// 2. Batch-based export methods for efficiency
// 3. Explicit Shutdown method for graceful termination
// 4. Error returns for handling export failures
```

## Implementing a Custom SpanExporter

Let's build a custom span exporter that sends traces to a hypothetical HTTP backend.

### Basic Structure

First, define the exporter struct with necessary configuration.

```go
package customexporter

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
    "time"

    "go.opentelemetry.io/otel/sdk/trace"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// CustomSpanExporter sends spans to a custom HTTP backend
// It implements the trace.SpanExporter interface
type CustomSpanExporter struct {
    // endpoint is the URL where spans will be sent
    endpoint string

    // client is the HTTP client used for requests
    client *http.Client

    // headers contains custom headers to include in requests
    headers map[string]string

    // mu protects the stopped field
    mu sync.RWMutex

    // stopped indicates whether the exporter has been shut down
    stopped bool
}

// Option is a function that configures the exporter
type Option func(*CustomSpanExporter)

// WithEndpoint sets the target endpoint for the exporter
func WithEndpoint(endpoint string) Option {
    return func(e *CustomSpanExporter) {
        e.endpoint = endpoint
    }
}

// WithHeaders sets custom headers for HTTP requests
func WithHeaders(headers map[string]string) Option {
    return func(e *CustomSpanExporter) {
        e.headers = headers
    }
}

// WithHTTPClient sets a custom HTTP client
func WithHTTPClient(client *http.Client) Option {
    return func(e *CustomSpanExporter) {
        e.client = client
    }
}

// NewCustomSpanExporter creates a new exporter with the given options
func NewCustomSpanExporter(opts ...Option) (*CustomSpanExporter, error) {
    // Create exporter with sensible defaults
    e := &CustomSpanExporter{
        endpoint: "http://localhost:8080/traces",
        client: &http.Client{
            Timeout: 30 * time.Second,
        },
        headers: make(map[string]string),
    }

    // Apply all provided options
    for _, opt := range opts {
        opt(e)
    }

    return e, nil
}
```

### Implementing ExportSpans

The core export method converts spans to your desired format and sends them.

```go
// SpanData represents a span in our custom format
// This structure matches what our backend expects
type SpanData struct {
    TraceID      string            `json:"trace_id"`
    SpanID       string            `json:"span_id"`
    ParentSpanID string            `json:"parent_span_id,omitempty"`
    Name         string            `json:"name"`
    StartTime    time.Time         `json:"start_time"`
    EndTime      time.Time         `json:"end_time"`
    Status       string            `json:"status"`
    Attributes   map[string]any    `json:"attributes"`
    Events       []EventData       `json:"events,omitempty"`
}

// EventData represents a span event
type EventData struct {
    Name       string         `json:"name"`
    Timestamp  time.Time      `json:"timestamp"`
    Attributes map[string]any `json:"attributes"`
}

// ExportSpans exports a batch of spans to the custom backend
// This method is called by the SDK's batch span processor
func (e *CustomSpanExporter) ExportSpans(ctx context.Context, spans []sdktrace.ReadOnlySpan) error {
    // Check if exporter has been shut down
    e.mu.RLock()
    if e.stopped {
        e.mu.RUnlock()
        return fmt.Errorf("exporter is shut down")
    }
    e.mu.RUnlock()

    // Return early if there are no spans to export
    if len(spans) == 0 {
        return nil
    }

    // Convert OpenTelemetry spans to our custom format
    spanData := make([]SpanData, 0, len(spans))
    for _, span := range spans {
        data := e.convertSpan(span)
        spanData = append(spanData, data)
    }

    // Serialize the span data to JSON
    payload, err := json.Marshal(spanData)
    if err != nil {
        return fmt.Errorf("failed to marshal spans: %w", err)
    }

    // Send the spans to the backend
    return e.send(ctx, payload)
}

// convertSpan transforms an OpenTelemetry span to our custom format
func (e *CustomSpanExporter) convertSpan(span sdktrace.ReadOnlySpan) SpanData {
    // Extract span context information
    sc := span.SpanContext()

    // Build attributes map from span attributes
    attrs := make(map[string]any)
    for _, attr := range span.Attributes() {
        attrs[string(attr.Key)] = attr.Value.AsInterface()
    }

    // Convert span events
    events := make([]EventData, 0, len(span.Events()))
    for _, event := range span.Events() {
        eventAttrs := make(map[string]any)
        for _, attr := range event.Attributes {
            eventAttrs[string(attr.Key)] = attr.Value.AsInterface()
        }
        events = append(events, EventData{
            Name:       event.Name,
            Timestamp:  event.Time,
            Attributes: eventAttrs,
        })
    }

    // Determine status string from span status
    status := "UNSET"
    switch span.Status().Code {
    case 1:
        status = "OK"
    case 2:
        status = "ERROR"
    }

    // Build the final span data structure
    data := SpanData{
        TraceID:    sc.TraceID().String(),
        SpanID:     sc.SpanID().String(),
        Name:       span.Name(),
        StartTime:  span.StartTime(),
        EndTime:    span.EndTime(),
        Status:     status,
        Attributes: attrs,
        Events:     events,
    }

    // Include parent span ID if present
    if span.Parent().HasSpanID() {
        data.ParentSpanID = span.Parent().SpanID().String()
    }

    return data
}
```

### Sending Data to the Backend

Implement the HTTP communication with proper error handling.

```go
// send transmits the payload to the configured endpoint
func (e *CustomSpanExporter) send(ctx context.Context, payload []byte) error {
    // Create the HTTP request with the payload
    req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.endpoint, bytes.NewReader(payload))
    if err != nil {
        return fmt.Errorf("failed to create request: %w", err)
    }

    // Set content type and custom headers
    req.Header.Set("Content-Type", "application/json")
    for key, value := range e.headers {
        req.Header.Set(key, value)
    }

    // Execute the request
    resp, err := e.client.Do(req)
    if err != nil {
        return fmt.Errorf("failed to send request: %w", err)
    }
    defer resp.Body.Close()

    // Check for successful response
    if resp.StatusCode < 200 || resp.StatusCode >= 300 {
        return fmt.Errorf("server returned status %d", resp.StatusCode)
    }

    return nil
}
```

### Implementing Shutdown

Proper shutdown ensures all pending data is flushed.

```go
// Shutdown gracefully shuts down the exporter
// It marks the exporter as stopped and releases resources
func (e *CustomSpanExporter) Shutdown(ctx context.Context) error {
    e.mu.Lock()
    defer e.mu.Unlock()

    // Mark as stopped to prevent new exports
    e.stopped = true

    // Close idle connections in the HTTP client
    e.client.CloseIdleConnections()

    return nil
}
```

## Implementing a Custom MetricExporter

Metrics export follows similar patterns but handles aggregated data.

### Metric Exporter Structure

Define the metric exporter with appropriate configuration.

```go
package customexporter

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
    "time"

    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/metric/metricdata"
)

// CustomMetricExporter exports metrics to a custom backend
type CustomMetricExporter struct {
    endpoint    string
    client      *http.Client
    headers     map[string]string
    temporality metricdata.Temporality
    mu          sync.RWMutex
    stopped     bool
}

// MetricOption configures the metric exporter
type MetricOption func(*CustomMetricExporter)

// WithMetricEndpoint sets the metrics endpoint
func WithMetricEndpoint(endpoint string) MetricOption {
    return func(e *CustomMetricExporter) {
        e.endpoint = endpoint
    }
}

// WithTemporality sets the preferred temporality
func WithTemporality(t metricdata.Temporality) MetricOption {
    return func(e *CustomMetricExporter) {
        e.temporality = t
    }
}

// NewCustomMetricExporter creates a new metric exporter
func NewCustomMetricExporter(opts ...MetricOption) (*CustomMetricExporter, error) {
    e := &CustomMetricExporter{
        endpoint: "http://localhost:8080/metrics",
        client: &http.Client{
            Timeout: 30 * time.Second,
        },
        headers:     make(map[string]string),
        temporality: metricdata.CumulativeTemporality,
    }

    for _, opt := range opts {
        opt(e)
    }

    return e, nil
}
```

### Implementing the Export Method

Handle different metric data types appropriately.

```go
// MetricPayload represents our custom metric format
type MetricPayload struct {
    ResourceAttributes map[string]any  `json:"resource_attributes"`
    ScopeMetrics       []ScopeMetric   `json:"scope_metrics"`
    Timestamp          time.Time       `json:"timestamp"`
}

// ScopeMetric groups metrics by instrumentation scope
type ScopeMetric struct {
    ScopeName    string       `json:"scope_name"`
    ScopeVersion string       `json:"scope_version"`
    Metrics      []MetricData `json:"metrics"`
}

// MetricData represents a single metric with its data points
type MetricData struct {
    Name        string         `json:"name"`
    Description string         `json:"description"`
    Unit        string         `json:"unit"`
    Type        string         `json:"type"`
    DataPoints  []DataPoint    `json:"data_points"`
}

// DataPoint represents a single measurement
type DataPoint struct {
    Attributes map[string]any `json:"attributes"`
    StartTime  time.Time      `json:"start_time,omitempty"`
    Time       time.Time      `json:"time"`
    Value      any            `json:"value"`
}

// Export sends metrics to the custom backend
func (e *CustomMetricExporter) Export(ctx context.Context, rm *metricdata.ResourceMetrics) error {
    e.mu.RLock()
    if e.stopped {
        e.mu.RUnlock()
        return fmt.Errorf("exporter is shut down")
    }
    e.mu.RUnlock()

    // Convert resource attributes
    resourceAttrs := make(map[string]any)
    for _, attr := range rm.Resource.Attributes() {
        resourceAttrs[string(attr.Key)] = attr.Value.AsInterface()
    }

    // Build the payload
    payload := MetricPayload{
        ResourceAttributes: resourceAttrs,
        Timestamp:          time.Now(),
    }

    // Process each scope's metrics
    for _, sm := range rm.ScopeMetrics {
        scopeMetric := ScopeMetric{
            ScopeName:    sm.Scope.Name,
            ScopeVersion: sm.Scope.Version,
        }

        // Convert each metric
        for _, m := range sm.Metrics {
            metricData := e.convertMetric(m)
            scopeMetric.Metrics = append(scopeMetric.Metrics, metricData)
        }

        payload.ScopeMetrics = append(payload.ScopeMetrics, scopeMetric)
    }

    // Serialize and send
    data, err := json.Marshal(payload)
    if err != nil {
        return fmt.Errorf("failed to marshal metrics: %w", err)
    }

    return e.sendMetrics(ctx, data)
}

// convertMetric transforms OpenTelemetry metric data to our format
func (e *CustomMetricExporter) convertMetric(m metricdata.Metrics) MetricData {
    md := MetricData{
        Name:        m.Name,
        Description: m.Description,
        Unit:        m.Unit,
    }

    // Handle different aggregation types
    switch data := m.Data.(type) {
    case metricdata.Gauge[int64]:
        md.Type = "gauge"
        md.DataPoints = e.convertNumberDataPoints(data.DataPoints)
    case metricdata.Gauge[float64]:
        md.Type = "gauge"
        md.DataPoints = e.convertFloatDataPoints(data.DataPoints)
    case metricdata.Sum[int64]:
        md.Type = "sum"
        md.DataPoints = e.convertNumberDataPoints(data.DataPoints)
    case metricdata.Sum[float64]:
        md.Type = "sum"
        md.DataPoints = e.convertFloatDataPoints(data.DataPoints)
    case metricdata.Histogram[int64]:
        md.Type = "histogram"
        md.DataPoints = e.convertHistogramDataPoints(data.DataPoints)
    case metricdata.Histogram[float64]:
        md.Type = "histogram"
        md.DataPoints = e.convertFloatHistogramDataPoints(data.DataPoints)
    }

    return md
}

// convertNumberDataPoints handles integer data points
func (e *CustomMetricExporter) convertNumberDataPoints(dps []metricdata.DataPoint[int64]) []DataPoint {
    result := make([]DataPoint, 0, len(dps))
    for _, dp := range dps {
        attrs := make(map[string]any)
        for _, attr := range dp.Attributes.ToSlice() {
            attrs[string(attr.Key)] = attr.Value.AsInterface()
        }
        result = append(result, DataPoint{
            Attributes: attrs,
            StartTime:  dp.StartTime,
            Time:       dp.Time,
            Value:      dp.Value,
        })
    }
    return result
}

// convertFloatDataPoints handles floating-point data points
func (e *CustomMetricExporter) convertFloatDataPoints(dps []metricdata.DataPoint[float64]) []DataPoint {
    result := make([]DataPoint, 0, len(dps))
    for _, dp := range dps {
        attrs := make(map[string]any)
        for _, attr := range dp.Attributes.ToSlice() {
            attrs[string(attr.Key)] = attr.Value.AsInterface()
        }
        result = append(result, DataPoint{
            Attributes: attrs,
            StartTime:  dp.StartTime,
            Time:       dp.Time,
            Value:      dp.Value,
        })
    }
    return result
}

// convertHistogramDataPoints handles histogram data
func (e *CustomMetricExporter) convertHistogramDataPoints(dps []metricdata.HistogramDataPoint[int64]) []DataPoint {
    result := make([]DataPoint, 0, len(dps))
    for _, dp := range dps {
        attrs := make(map[string]any)
        for _, attr := range dp.Attributes.ToSlice() {
            attrs[string(attr.Key)] = attr.Value.AsInterface()
        }
        result = append(result, DataPoint{
            Attributes: attrs,
            StartTime:  dp.StartTime,
            Time:       dp.Time,
            Value: map[string]any{
                "count":         dp.Count,
                "sum":           dp.Sum,
                "bucket_counts": dp.BucketCounts,
                "bounds":        dp.Bounds,
                "min":           dp.Min,
                "max":           dp.Max,
            },
        })
    }
    return result
}

// convertFloatHistogramDataPoints handles float histogram data
func (e *CustomMetricExporter) convertFloatHistogramDataPoints(dps []metricdata.HistogramDataPoint[float64]) []DataPoint {
    result := make([]DataPoint, 0, len(dps))
    for _, dp := range dps {
        attrs := make(map[string]any)
        for _, attr := range dp.Attributes.ToSlice() {
            attrs[string(attr.Key)] = attr.Value.AsInterface()
        }
        result = append(result, DataPoint{
            Attributes: attrs,
            StartTime:  dp.StartTime,
            Time:       dp.Time,
            Value: map[string]any{
                "count":         dp.Count,
                "sum":           dp.Sum,
                "bucket_counts": dp.BucketCounts,
                "bounds":        dp.Bounds,
                "min":           dp.Min,
                "max":           dp.Max,
            },
        })
    }
    return result
}
```

### Temporality and Aggregation Preferences

Configure how the exporter handles temporality and aggregation.

```go
// Temporality returns the temporality preference for each instrument kind
// Cumulative keeps running totals, Delta reports changes since last export
func (e *CustomMetricExporter) Temporality(kind metric.InstrumentKind) metricdata.Temporality {
    // You can customize temporality per instrument type
    switch kind {
    case metric.InstrumentKindCounter, metric.InstrumentKindHistogram:
        return e.temporality
    default:
        return metricdata.CumulativeTemporality
    }
}

// Aggregation returns the aggregation preference for each instrument kind
// This determines how measurements are combined before export
func (e *CustomMetricExporter) Aggregation(kind metric.InstrumentKind) metric.Aggregation {
    // Use default aggregations for each instrument type
    return metric.DefaultAggregationSelector(kind)
}

// sendMetrics transmits metric data to the backend
func (e *CustomMetricExporter) sendMetrics(ctx context.Context, payload []byte) error {
    req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.endpoint, bytes.NewReader(payload))
    if err != nil {
        return fmt.Errorf("failed to create request: %w", err)
    }

    req.Header.Set("Content-Type", "application/json")
    for key, value := range e.headers {
        req.Header.Set(key, value)
    }

    resp, err := e.client.Do(req)
    if err != nil {
        return fmt.Errorf("failed to send metrics: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode < 200 || resp.StatusCode >= 300 {
        return fmt.Errorf("server returned status %d", resp.StatusCode)
    }

    return nil
}

// Shutdown gracefully shuts down the metric exporter
func (e *CustomMetricExporter) Shutdown(ctx context.Context) error {
    e.mu.Lock()
    defer e.mu.Unlock()
    e.stopped = true
    e.client.CloseIdleConnections()
    return nil
}
```

## Batch Processing and Buffering

For high-throughput scenarios, implement buffering in your exporter.

```go
// BufferedSpanExporter adds local buffering on top of export
// Useful when the SDK's batch processor settings need augmentation
type BufferedSpanExporter struct {
    *CustomSpanExporter
    buffer     []sdktrace.ReadOnlySpan
    bufferSize int
    mu         sync.Mutex
    flushCh    chan struct{}
    doneCh     chan struct{}
}

// NewBufferedSpanExporter creates an exporter with internal buffering
func NewBufferedSpanExporter(bufferSize int, opts ...Option) (*BufferedSpanExporter, error) {
    base, err := NewCustomSpanExporter(opts...)
    if err != nil {
        return nil, err
    }

    b := &BufferedSpanExporter{
        CustomSpanExporter: base,
        buffer:             make([]sdktrace.ReadOnlySpan, 0, bufferSize),
        bufferSize:         bufferSize,
        flushCh:            make(chan struct{}, 1),
        doneCh:             make(chan struct{}),
    }

    // Start background flush goroutine
    go b.backgroundFlush()

    return b, nil
}

// backgroundFlush periodically flushes the buffer
func (b *BufferedSpanExporter) backgroundFlush() {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            b.flush(context.Background())
        case <-b.flushCh:
            b.flush(context.Background())
        case <-b.doneCh:
            return
        }
    }
}

// ExportSpans adds spans to the buffer and triggers flush if needed
func (b *BufferedSpanExporter) ExportSpans(ctx context.Context, spans []sdktrace.ReadOnlySpan) error {
    b.mu.Lock()
    b.buffer = append(b.buffer, spans...)
    shouldFlush := len(b.buffer) >= b.bufferSize
    b.mu.Unlock()

    // Trigger immediate flush if buffer is full
    if shouldFlush {
        select {
        case b.flushCh <- struct{}{}:
        default:
            // Flush already pending
        }
    }

    return nil
}

// flush sends all buffered spans
func (b *BufferedSpanExporter) flush(ctx context.Context) error {
    b.mu.Lock()
    if len(b.buffer) == 0 {
        b.mu.Unlock()
        return nil
    }
    spans := b.buffer
    b.buffer = make([]sdktrace.ReadOnlySpan, 0, b.bufferSize)
    b.mu.Unlock()

    return b.CustomSpanExporter.ExportSpans(ctx, spans)
}

// Shutdown flushes remaining data and stops the background goroutine
func (b *BufferedSpanExporter) Shutdown(ctx context.Context) error {
    close(b.doneCh)
    if err := b.flush(ctx); err != nil {
        return err
    }
    return b.CustomSpanExporter.Shutdown(ctx)
}
```

## Error Handling and Retries

Implement robust retry logic for transient failures.

```go
// RetryConfig configures retry behavior
type RetryConfig struct {
    MaxAttempts     int
    InitialInterval time.Duration
    MaxInterval     time.Duration
    Multiplier      float64
}

// DefaultRetryConfig provides sensible retry defaults
func DefaultRetryConfig() RetryConfig {
    return RetryConfig{
        MaxAttempts:     3,
        InitialInterval: 100 * time.Millisecond,
        MaxInterval:     5 * time.Second,
        Multiplier:      2.0,
    }
}

// RetryableSpanExporter wraps an exporter with retry logic
type RetryableSpanExporter struct {
    exporter trace.SpanExporter
    config   RetryConfig
}

// NewRetryableSpanExporter creates an exporter with retry capability
func NewRetryableSpanExporter(exporter trace.SpanExporter, config RetryConfig) *RetryableSpanExporter {
    return &RetryableSpanExporter{
        exporter: exporter,
        config:   config,
    }
}

// ExportSpans exports with automatic retries on failure
func (r *RetryableSpanExporter) ExportSpans(ctx context.Context, spans []sdktrace.ReadOnlySpan) error {
    var lastErr error
    interval := r.config.InitialInterval

    for attempt := 0; attempt < r.config.MaxAttempts; attempt++ {
        // Attempt export
        err := r.exporter.ExportSpans(ctx, spans)
        if err == nil {
            return nil
        }

        lastErr = err

        // Check if error is retryable
        if !r.isRetryable(err) {
            return fmt.Errorf("non-retryable error: %w", err)
        }

        // Check context before waiting
        if ctx.Err() != nil {
            return ctx.Err()
        }

        // Wait before next attempt with exponential backoff
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(interval):
            // Calculate next interval with jitter
            interval = time.Duration(float64(interval) * r.config.Multiplier)
            if interval > r.config.MaxInterval {
                interval = r.config.MaxInterval
            }
        }
    }

    return fmt.Errorf("max retries exceeded: %w", lastErr)
}

// isRetryable determines if an error should trigger a retry
func (r *RetryableSpanExporter) isRetryable(err error) bool {
    // Network errors and server errors (5xx) are typically retryable
    // Client errors (4xx) are usually not retryable
    errStr := err.Error()

    // Check for network-related errors
    if contains(errStr, "connection refused", "timeout", "temporary failure") {
        return true
    }

    // Check for server errors (status 500-599)
    if contains(errStr, "status 5") {
        return true
    }

    // Rate limiting (429) should be retried
    if contains(errStr, "status 429") {
        return true
    }

    return false
}

// contains checks if the string contains any of the substrings
func contains(s string, substrs ...string) bool {
    for _, sub := range substrs {
        if len(s) >= len(sub) {
            for i := 0; i <= len(s)-len(sub); i++ {
                if s[i:i+len(sub)] == sub {
                    return true
                }
            }
        }
    }
    return false
}

// Shutdown delegates to the wrapped exporter
func (r *RetryableSpanExporter) Shutdown(ctx context.Context) error {
    return r.exporter.Shutdown(ctx)
}
```

## Shutdown and Cleanup

Proper shutdown is critical for data integrity and resource management.

```go
// GracefulExporter wraps exporters with graceful shutdown handling
type GracefulExporter struct {
    exporter    trace.SpanExporter
    shutdownCh  chan struct{}
    wg          sync.WaitGroup
    mu          sync.RWMutex
    isShutdown  bool
}

// NewGracefulExporter creates an exporter with enhanced shutdown handling
func NewGracefulExporter(exporter trace.SpanExporter) *GracefulExporter {
    return &GracefulExporter{
        exporter:   exporter,
        shutdownCh: make(chan struct{}),
    }
}

// ExportSpans tracks in-flight exports for graceful shutdown
func (g *GracefulExporter) ExportSpans(ctx context.Context, spans []sdktrace.ReadOnlySpan) error {
    g.mu.RLock()
    if g.isShutdown {
        g.mu.RUnlock()
        return fmt.Errorf("exporter is shut down")
    }
    g.wg.Add(1)
    g.mu.RUnlock()

    defer g.wg.Done()

    // Create a context that respects both the passed context and shutdown signal
    exportCtx, cancel := context.WithCancel(ctx)
    defer cancel()

    go func() {
        select {
        case <-g.shutdownCh:
            cancel()
        case <-exportCtx.Done():
        }
    }()

    return g.exporter.ExportSpans(exportCtx, spans)
}

// Shutdown performs graceful shutdown with timeout
func (g *GracefulExporter) Shutdown(ctx context.Context) error {
    g.mu.Lock()
    if g.isShutdown {
        g.mu.Unlock()
        return nil
    }
    g.isShutdown = true
    close(g.shutdownCh)
    g.mu.Unlock()

    // Wait for in-flight exports to complete or context to expire
    done := make(chan struct{})
    go func() {
        g.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        // All exports completed
    case <-ctx.Done():
        return fmt.Errorf("shutdown timeout: %w", ctx.Err())
    }

    return g.exporter.Shutdown(ctx)
}
```

## Testing Custom Exporters

Comprehensive testing ensures your exporter works correctly.

### Unit Testing the Exporter

```go
package customexporter

import (
    "context"
    "encoding/json"
    "io"
    "net/http"
    "net/http/httptest"
    "testing"
    "time"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    "go.opentelemetry.io/otel/sdk/trace/tracetest"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
    "go.opentelemetry.io/otel/trace"
)

// TestExportSpans verifies spans are correctly exported
func TestExportSpans(t *testing.T) {
    // Track received spans
    var receivedSpans []SpanData

    // Create test server that captures requests
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        body, err := io.ReadAll(r.Body)
        if err != nil {
            t.Fatalf("failed to read body: %v", err)
        }

        if err := json.Unmarshal(body, &receivedSpans); err != nil {
            t.Fatalf("failed to unmarshal: %v", err)
        }

        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    // Create exporter pointing to test server
    exporter, err := NewCustomSpanExporter(
        WithEndpoint(server.URL),
    )
    if err != nil {
        t.Fatalf("failed to create exporter: %v", err)
    }

    // Create test spans using the in-memory span recorder
    spans := createTestSpans()

    // Export the spans
    ctx := context.Background()
    if err := exporter.ExportSpans(ctx, spans); err != nil {
        t.Fatalf("export failed: %v", err)
    }

    // Verify the received data
    if len(receivedSpans) != len(spans) {
        t.Errorf("expected %d spans, got %d", len(spans), len(receivedSpans))
    }

    // Verify span content
    if receivedSpans[0].Name != "test-span" {
        t.Errorf("expected span name 'test-span', got '%s'", receivedSpans[0].Name)
    }
}

// createTestSpans generates test span data
func createTestSpans() []sdktrace.ReadOnlySpan {
    // Use the tracetest package to create stub spans
    spanStubs := []tracetest.SpanStub{
        {
            Name:      "test-span",
            SpanKind:  trace.SpanKindServer,
            StartTime: time.Now().Add(-time.Second),
            EndTime:   time.Now(),
            Status: sdktrace.Status{
                Code:        codes.Ok,
                Description: "",
            },
            Attributes: []attribute.KeyValue{
                attribute.String("http.method", "GET"),
                attribute.Int("http.status_code", 200),
            },
            Resource: resource.NewWithAttributes(
                semconv.SchemaURL,
                semconv.ServiceName("test-service"),
            ),
        },
    }

    // Convert stubs to ReadOnlySpan interface
    spans := make([]sdktrace.ReadOnlySpan, len(spanStubs))
    for i, stub := range spanStubs {
        spans[i] = stub.Snapshot()
    }

    return spans
}

// TestExportSpansWithRetry tests retry behavior
func TestExportSpansWithRetry(t *testing.T) {
    attempts := 0

    // Server that fails twice then succeeds
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        attempts++
        if attempts < 3 {
            w.WriteHeader(http.StatusServiceUnavailable)
            return
        }
        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    baseExporter, _ := NewCustomSpanExporter(WithEndpoint(server.URL))
    exporter := NewRetryableSpanExporter(baseExporter, RetryConfig{
        MaxAttempts:     5,
        InitialInterval: 10 * time.Millisecond,
        MaxInterval:     100 * time.Millisecond,
        Multiplier:      2.0,
    })

    spans := createTestSpans()
    ctx := context.Background()

    if err := exporter.ExportSpans(ctx, spans); err != nil {
        t.Fatalf("export should have succeeded after retries: %v", err)
    }

    if attempts != 3 {
        t.Errorf("expected 3 attempts, got %d", attempts)
    }
}

// TestShutdownPreventsExport verifies shutdown behavior
func TestShutdownPreventsExport(t *testing.T) {
    exporter, _ := NewCustomSpanExporter()

    ctx := context.Background()
    if err := exporter.Shutdown(ctx); err != nil {
        t.Fatalf("shutdown failed: %v", err)
    }

    spans := createTestSpans()
    err := exporter.ExportSpans(ctx, spans)

    if err == nil {
        t.Error("expected error when exporting after shutdown")
    }
}

// TestContextCancellation verifies context handling
func TestContextCancellation(t *testing.T) {
    // Server that delays response
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        time.Sleep(5 * time.Second)
        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    exporter, _ := NewCustomSpanExporter(WithEndpoint(server.URL))

    // Create a context with short timeout
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    spans := createTestSpans()
    err := exporter.ExportSpans(ctx, spans)

    if err == nil {
        t.Error("expected timeout error")
    }
}
```

### Integration Testing

```go
// TestIntegrationWithTracerProvider tests the exporter with a real tracer
func TestIntegrationWithTracerProvider(t *testing.T) {
    var receivedSpans []SpanData

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        body, _ := io.ReadAll(r.Body)
        json.Unmarshal(body, &receivedSpans)
        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()

    // Create the custom exporter
    exporter, err := NewCustomSpanExporter(WithEndpoint(server.URL))
    if err != nil {
        t.Fatalf("failed to create exporter: %v", err)
    }

    // Create a tracer provider with the custom exporter
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter,
            sdktrace.WithBatchTimeout(100*time.Millisecond),
        ),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("integration-test"),
        )),
    )
    defer tp.Shutdown(context.Background())

    // Get a tracer and create spans
    tracer := tp.Tracer("test-tracer")

    ctx, span := tracer.Start(context.Background(), "parent-span")
    _, child := tracer.Start(ctx, "child-span")
    child.End()
    span.End()

    // Force flush to ensure spans are exported
    if err := tp.ForceFlush(context.Background()); err != nil {
        t.Fatalf("force flush failed: %v", err)
    }

    // Wait briefly for async export
    time.Sleep(200 * time.Millisecond)

    // Verify spans were received
    if len(receivedSpans) < 2 {
        t.Errorf("expected at least 2 spans, got %d", len(receivedSpans))
    }
}
```

## Registering the Exporter with the SDK

Wire up your custom exporter with the OpenTelemetry SDK.

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"

    "yourmodule/customexporter"
)

func main() {
    ctx := context.Background()

    // Create the custom span exporter
    spanExporter, err := customexporter.NewCustomSpanExporter(
        customexporter.WithEndpoint("https://your-backend.com/traces"),
        customexporter.WithHeaders(map[string]string{
            "Authorization": "Bearer your-token",
        }),
    )
    if err != nil {
        log.Fatalf("failed to create exporter: %v", err)
    }

    // Wrap with retry logic for resilience
    retryExporter := customexporter.NewRetryableSpanExporter(
        spanExporter,
        customexporter.DefaultRetryConfig(),
    )

    // Create a resource describing this service
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("my-service"),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        log.Fatalf("failed to create resource: %v", err)
    }

    // Create the tracer provider with batch processing
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(retryExporter,
            sdktrace.WithBatchTimeout(5*time.Second),
            sdktrace.WithMaxExportBatchSize(512),
            sdktrace.WithMaxQueueSize(2048),
        ),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    // Register as global tracer provider
    otel.SetTracerProvider(tp)

    // Ensure clean shutdown
    defer func() {
        shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
        defer cancel()
        if err := tp.Shutdown(shutdownCtx); err != nil {
            log.Printf("tracer provider shutdown error: %v", err)
        }
    }()

    // Your application code here
    tracer := otel.Tracer("my-service")
    _, span := tracer.Start(ctx, "main")
    defer span.End()

    // Application logic...
}
```

## Best Practices and Recommendations

When building custom exporters, keep these guidelines in mind:

1. **Always respect context cancellation**: Check `ctx.Done()` in long-running operations and propagate cancellation to HTTP clients.

2. **Implement proper shutdown**: Track in-flight exports and wait for them to complete during shutdown, but respect timeout constraints.

3. **Use connection pooling**: Reuse HTTP clients and connections to reduce latency and resource consumption.

4. **Buffer appropriately**: Balance memory usage against data loss risk when buffering. Consider persistence for critical data.

5. **Handle backpressure**: Implement circuit breakers or rate limiting when the backend is overwhelmed.

6. **Log strategically**: Log errors and important events, but avoid logging at high frequency to prevent log flooding.

7. **Monitor your exporter**: Export metrics about your exporter's performance (queue depth, export latency, error rates).

8. **Test failure scenarios**: Simulate network failures, slow backends, and concurrent shutdown to ensure robustness.

## Conclusion

Building custom OpenTelemetry exporters in Go gives you complete control over how telemetry data is processed and transmitted. By implementing the standard interfaces, handling errors gracefully, and following best practices for shutdown and resource management, you can create reliable exporters that integrate seamlessly with any backend system.

The patterns demonstrated here, including retry logic, buffering, and graceful shutdown, apply to exporters for any data type: traces, metrics, or logs. As you build your exporter, remember to test thoroughly, especially edge cases like network failures and concurrent operations.

With custom exporters, you can send OpenTelemetry data to proprietary systems, specialized databases, or any custom infrastructure, all while maintaining compatibility with the broader OpenTelemetry ecosystem.
