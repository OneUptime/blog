# How to Fix Memory Growth in Go Applications When OpenTelemetry Metric Cardinality Exceeds Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Metrics, Cardinality

Description: Identify and fix unbounded memory growth in Go applications caused by high cardinality OpenTelemetry metric attributes.

Your Go application's memory usage keeps climbing. It does not crash immediately, but over hours or days, the RSS grows until the container gets OOM-killed. The culprit is often OpenTelemetry metrics with unbounded attribute cardinality.

## What Is Cardinality in Metrics

Every unique combination of metric name and attribute values creates a separate time series. If you record a histogram with attributes `{method="GET", path="/users/123"}`, that is one series. Change the path to `/users/456`, and that is another series. If you have a million users, you get a million time series for that one metric.

Each series takes memory. The OpenTelemetry SDK stores aggregation state (counters, histogram buckets) for every unique attribute combination. With high cardinality, this memory adds up fast.

## Identifying the Problem

Check your metrics for attributes with high cardinality. Common offenders:

- User IDs
- Request paths with dynamic segments (e.g., `/users/{id}`)
- Session tokens
- IP addresses
- Unique request IDs

Here is a problematic instrumentation example:

```go
func (s *Server) handleRequest(w http.ResponseWriter, r *http.Request) {
    start := time.Now()

    // Process the request
    status := processRequest(w, r)

    // BAD: r.URL.Path includes dynamic segments like /users/12345
    s.requestDuration.Record(r.Context(), time.Since(start).Seconds(),
        metric.WithAttributes(
            attribute.String("method", r.Method),
            attribute.String("path", r.URL.Path),        // HIGH CARDINALITY
            attribute.String("user_id", getUserID(r)),    // HIGH CARDINALITY
            attribute.Int("status", status),
        ),
    )
}
```

## Measuring the Impact

You can check how many unique attribute sets your meter is tracking by looking at the internal state. Add a simple monitoring endpoint:

```go
import "runtime"

func debugHandler(w http.ResponseWriter, r *http.Request) {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    fmt.Fprintf(w, "Alloc: %d MB\n", m.Alloc/1024/1024)
    fmt.Fprintf(w, "Sys: %d MB\n", m.Sys/1024/1024)
    fmt.Fprintf(w, "NumGC: %d\n", m.NumGC)
}
```

If `Alloc` keeps growing and never drops after GC, you likely have a cardinality leak.

## Fix 1: Normalize Dynamic Path Segments

Replace dynamic URL segments with placeholders:

```go
// normalizePath replaces dynamic segments with placeholders
// so that /users/123 and /users/456 both become /users/{id}
func normalizePath(path string) string {
    segments := strings.Split(path, "/")
    for i, seg := range segments {
        // Replace segments that look like IDs
        if isNumeric(seg) || isUUID(seg) {
            segments[i] = "{id}"
        }
    }
    return strings.Join(segments, "/")
}

func isNumeric(s string) bool {
    _, err := strconv.Atoi(s)
    return err == nil
}

func isUUID(s string) bool {
    _, err := uuid.Parse(s)
    return err == nil
}
```

Use it in your instrumentation:

```go
s.requestDuration.Record(r.Context(), time.Since(start).Seconds(),
    metric.WithAttributes(
        attribute.String("method", r.Method),
        attribute.String("path", normalizePath(r.URL.Path)), // normalized
        attribute.Int("status", status),
        // Removed user_id entirely
    ),
)
```

## Fix 2: Use Views to Drop High-Cardinality Attributes

OpenTelemetry Go SDK supports Views that can filter attributes at the SDK level:

```go
import sdkmetric "go.opentelemetry.io/otel/sdk/metric"

// Create a view that drops the "path" attribute from the request duration metric
pathDropView := sdkmetric.NewView(
    sdkmetric.Instrument{
        Name: "http.server.request.duration",
    },
    sdkmetric.Stream{
        // Only keep these attributes, drop everything else
        AttributeFilter: attribute.NewAllowKeysFilter(
            attribute.Key("method"),
            attribute.Key("status"),
        ),
    },
)

provider := sdkmetric.NewMeterProvider(
    sdkmetric.WithReader(exporter),
    sdkmetric.WithView(pathDropView),
)
```

## Fix 3: Set Cardinality Limits

The Go SDK allows you to set a cardinality limit on metric streams. When the limit is reached, new attribute combinations are mapped to an overflow bucket:

```go
overflowView := sdkmetric.NewView(
    sdkmetric.Instrument{
        Name: "http.server.request.duration",
    },
    sdkmetric.Stream{
        // Limit to 1000 unique attribute combinations
        CardinalityLimit: 1000,
    },
)

provider := sdkmetric.NewMeterProvider(
    sdkmetric.WithReader(exporter),
    sdkmetric.WithView(overflowView),
)
```

When the limit is exceeded, extra attribute sets are folded into a special overflow series. You lose granularity for the overflow data, but you protect your memory usage.

## Preventing Future Issues

Add a linting step that checks metric attribute values before recording:

```go
// warnHighCardinality logs a warning if an attribute value
// looks like it might be a high-cardinality value.
func warnHighCardinality(attrs []attribute.KeyValue) {
    for _, a := range attrs {
        val := a.Value.AsString()
        if isNumeric(val) || isUUID(val) || len(val) > 64 {
            log.Printf("WARNING: high-cardinality metric attribute %s=%s",
                a.Key, val)
        }
    }
}
```

Metric cardinality issues are easy to introduce and hard to notice until memory pressure builds up. Review your metric attributes regularly and use Views to enforce limits at the SDK level.
