# How to Add Custom Span Events and Attributes for Kubernetes-Specific Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTelemetry, Distributed Tracing, Observability, Microservice

Description: Learn how to add custom span events and attributes that capture Kubernetes-specific context in your traces.

---

Default OpenTelemetry instrumentation captures HTTP requests, database queries, and messaging operations. However, Kubernetes environments introduce additional context that can be crucial for debugging: pod lifecycle events, resource constraints, service mesh routing decisions, and configuration changes. Adding custom span events and attributes captures this Kubernetes-specific context directly in your traces.

Custom span attributes enrich spans with metadata like namespace, deployment name, pod template hash, and resource limits. Span events record point-in-time occurrences like container restarts, configuration reloads, or circuit breaker activations. Together, they provide the contextual information needed to understand distributed system behavior in Kubernetes.

## Understanding Span Attributes vs Span Events

Span attributes are key-value pairs that describe the entire span duration. Use attributes for metadata that characterizes the operation: HTTP status code, database table name, or Kubernetes pod name. Attributes are indexed and queryable in most tracing backends.

Span events represent discrete moments within a span's lifetime. Use events for things that happen at a specific time: exceptions, retries, cache hits, or configuration changes. Events have timestamps and can include their own attributes.

## Adding Kubernetes Resource Attributes

Start by capturing Kubernetes resource information as span attributes. This provides context about where code is running:

```go
// kubernetes_attributes.go
package observability

import (
    "context"
    "os"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// KubernetesAttributes holds Kubernetes-specific metadata
type KubernetesAttributes struct {
    Namespace       string
    PodName         string
    PodUID          string
    NodeName        string
    DeploymentName  string
    PodTemplateHash string
    ContainerName   string
}

// LoadFromEnvironment reads Kubernetes metadata from environment variables
func LoadFromEnvironment() *KubernetesAttributes {
    return &KubernetesAttributes{
        Namespace:       os.Getenv("K8S_NAMESPACE"),
        PodName:         os.Getenv("K8S_POD_NAME"),
        PodUID:          os.Getenv("K8S_POD_UID"),
        NodeName:        os.Getenv("K8S_NODE_NAME"),
        DeploymentName:  os.Getenv("K8S_DEPLOYMENT_NAME"),
        PodTemplateHash: os.Getenv("K8S_POD_TEMPLATE_HASH"),
        ContainerName:   os.Getenv("K8S_CONTAINER_NAME"),
    }
}

// ToAttributes converts Kubernetes metadata to OpenTelemetry attributes
func (k *KubernetesAttributes) ToAttributes() []attribute.KeyValue {
    attrs := []attribute.KeyValue{}

    if k.Namespace != "" {
        attrs = append(attrs, attribute.String("k8s.namespace.name", k.Namespace))
    }
    if k.PodName != "" {
        attrs = append(attrs, attribute.String("k8s.pod.name", k.PodName))
    }
    if k.PodUID != "" {
        attrs = append(attrs, attribute.String("k8s.pod.uid", k.PodUID))
    }
    if k.NodeName != "" {
        attrs = append(attrs, attribute.String("k8s.node.name", k.NodeName))
    }
    if k.DeploymentName != "" {
        attrs = append(attrs, attribute.String("k8s.deployment.name", k.DeploymentName))
    }
    if k.PodTemplateHash != "" {
        attrs = append(attrs, attribute.String("k8s.pod.label.pod-template-hash", k.PodTemplateHash))
    }
    if k.ContainerName != "" {
        attrs = append(attrs, attribute.String("k8s.container.name", k.ContainerName))
    }

    return attrs
}

// AddToSpan adds Kubernetes attributes to the current span
func (k *KubernetesAttributes) AddToSpan(ctx context.Context) {
    span := trace.SpanFromContext(ctx)
    if span.IsRecording() {
        span.SetAttributes(k.ToAttributes()...)
    }
}

// AddToNewSpan creates attributes for starting a new span
func (k *KubernetesAttributes) AddToNewSpan() trace.SpanStartOption {
    return trace.WithAttributes(k.ToAttributes()...)
}
```

Use these attributes when creating spans:

```go
// handler.go
package main

import (
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"

    "your/module/observability"
)

var (
    tracer   = otel.Tracer("payment-service")
    k8sAttrs = observability.LoadFromEnvironment()
)

func handlePayment(w http.ResponseWriter, r *http.Request) {
    // Create span with Kubernetes context
    ctx, span := tracer.Start(
        r.Context(),
        "process_payment",
        k8sAttrs.AddToNewSpan(),
        trace.WithAttributes(
            attribute.String("http.request.method", r.Method),
            attribute.String("url.path", r.URL.Path),
        ),
    )
    defer span.End()

    // Process payment logic
    result := processPayment(ctx, r)

    // Add result attributes
    span.SetAttributes(
        attribute.String("payment.status", result.Status),
        attribute.Float64("payment.amount", result.Amount),
    )

    w.WriteHeader(http.StatusOK)
}
```

## Capturing Resource Quota and Limits

Add span attributes that capture resource constraints affecting the operation:

```go
// resource_monitoring.go
package observability

import (
    "context"
    "os"
    "strconv"
    "strings"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// ResourceMetrics captures container resource usage
type ResourceMetrics struct {
    MemoryUsageBytes    int64
    MemoryLimitBytes    int64
    CPUUsageNanoseconds int64
    CPULimitMillicores  int64
}

// ReadContainerResources reads current resource usage from cgroup
func ReadContainerResources() (*ResourceMetrics, error) {
    metrics := &ResourceMetrics{}

    // Read memory usage from cgroup v2, then fall back to cgroup v1.
    if usage, err := readInt64File("/sys/fs/cgroup/memory.current"); err == nil {
        metrics.MemoryUsageBytes = usage
    } else if usage, err := readInt64File("/sys/fs/cgroup/memory/memory.usage_in_bytes"); err == nil {
        metrics.MemoryUsageBytes = usage
    }

    // Read memory limit from cgroup v2, then fall back to cgroup v1.
    if limit, err := readLimitFile("/sys/fs/cgroup/memory.max"); err == nil {
        metrics.MemoryLimitBytes = limit
    } else if limit, err := readLimitFile("/sys/fs/cgroup/memory/memory.limit_in_bytes"); err == nil {
        metrics.MemoryLimitBytes = limit
    }

    // Read cumulative CPU usage from cgroup v2, then fall back to cgroup v1.
    cpuUsageFound := false
    if stat, err := os.ReadFile("/sys/fs/cgroup/cpu.stat"); err == nil {
        for _, line := range strings.Split(string(stat), "\n") {
            fields := strings.Fields(line)
            if len(fields) == 2 && fields[0] == "usage_usec" {
                usageUs, _ := strconv.ParseInt(fields[1], 10, 64)
                metrics.CPUUsageNanoseconds = usageUs * 1000
                cpuUsageFound = true
                break
            }
        }
    }
    if !cpuUsageFound {
        usage, err := readFirstInt64File(
            "/sys/fs/cgroup/cpuacct/cpuacct.usage",
            "/sys/fs/cgroup/cpu,cpuacct/cpuacct.usage",
            "/sys/fs/cgroup/cpu/cpuacct.usage",
        )
        if err == nil {
            metrics.CPUUsageNanoseconds = usage
        }
    }

    quotaPath := "/sys/fs/cgroup/cpu/cpu.cfs_quota_us"
    periodPath := "/sys/fs/cgroup/cpu/cpu.cfs_period_us"
    if _, err := os.Stat(quotaPath); err != nil {
        quotaPath = "/sys/fs/cgroup/cpu,cpuacct/cpu.cfs_quota_us"
        periodPath = "/sys/fs/cgroup/cpu,cpuacct/cpu.cfs_period_us"
    }

    // Read CPU quota from cgroup v2, then fall back to cgroup v1.
    if cpuMax, err := os.ReadFile("/sys/fs/cgroup/cpu.max"); err == nil {
        fields := strings.Fields(string(cpuMax))
        if len(fields) >= 2 && fields[0] != "max" {
            quotaUs, _ := strconv.ParseInt(fields[0], 10, 64)
            periodUs, _ := strconv.ParseInt(fields[1], 10, 64)
            if quotaUs > 0 && periodUs > 0 {
                metrics.CPULimitMillicores = quotaUs * 1000 / periodUs
            }
        }
    } else if quotaUs, err := readInt64File(quotaPath); err == nil && quotaUs > 0 {
        if periodUs, err := readInt64File(periodPath); err == nil && periodUs > 0 {
            metrics.CPULimitMillicores = quotaUs * 1000 / periodUs
        }
    }

    return metrics, nil
}

func readFirstInt64File(paths ...string) (int64, error) {
    var lastErr error
    for _, path := range paths {
        value, err := readInt64File(path)
        if err == nil {
            return value, nil
        }
        lastErr = err
    }
    return 0, lastErr
}

func readInt64File(path string) (int64, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return 0, err
    }
    return strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
}

func readLimitFile(path string) (int64, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return 0, err
    }
    value := strings.TrimSpace(string(data))
    if value == "max" {
        return 0, nil
    }
    return strconv.ParseInt(value, 10, 64)
}

// AddResourceAttributesToSpan adds resource metrics to the current span
func AddResourceAttributesToSpan(ctx context.Context) {
    span := trace.SpanFromContext(ctx)
    if !span.IsRecording() {
        return
    }

    metrics, err := ReadContainerResources()
    if err != nil {
        return
    }

    span.SetAttributes(
        attribute.Int64("k8s.container.memory.usage_bytes", metrics.MemoryUsageBytes),
        attribute.Int64("k8s.container.memory.limit_bytes", metrics.MemoryLimitBytes),
        attribute.Int64("k8s.container.cpu.usage_nanoseconds", metrics.CPUUsageNanoseconds),
        attribute.Int64("k8s.container.cpu.limit_millicores", metrics.CPULimitMillicores),
    )

    // Add pressure indicators
    if metrics.MemoryLimitBytes > 0 {
        memoryPressure := float64(metrics.MemoryUsageBytes) / float64(metrics.MemoryLimitBytes)
        span.SetAttributes(
            attribute.Float64("k8s.container.memory.pressure", memoryPressure),
            attribute.Bool("k8s.container.memory.near_limit", memoryPressure > 0.9),
        )
    }
}
```

## Recording Span Events for Kubernetes Operations

Use span events to record significant occurrences during request processing:

```go
// span_events.go
package observability

import (
    "context"
    "time"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

// RecordConfigMapReload records when configuration is reloaded
func RecordConfigMapReload(ctx context.Context, configMapName string, version string) {
    span := trace.SpanFromContext(ctx)
    if span.IsRecording() {
        span.AddEvent("config_map_reloaded", trace.WithAttributes(
            attribute.String("config_map.name", configMapName),
            attribute.String("config_map.version", version),
            attribute.String("event.type", "kubernetes.config_reload"),
        ))
    }
}

// RecordCircuitBreakerOpen records when circuit breaker opens
func RecordCircuitBreakerOpen(ctx context.Context, serviceName string, failureCount int) {
    span := trace.SpanFromContext(ctx)
    if span.IsRecording() {
        span.AddEvent("circuit_breaker_opened", trace.WithAttributes(
            attribute.String("circuit_breaker.service", serviceName),
            attribute.Int("circuit_breaker.failure_count", failureCount),
            attribute.String("event.type", "resilience.circuit_breaker"),
        ))
    }
}

// RecordRetryAttempt records retry attempts
func RecordRetryAttempt(ctx context.Context, attempt int, delay time.Duration, reason string) {
    span := trace.SpanFromContext(ctx)
    if span.IsRecording() {
        span.AddEvent("retry_attempt", trace.WithAttributes(
            attribute.Int("retry.attempt", attempt),
            attribute.Int64("retry.delay_ms", delay.Milliseconds()),
            attribute.String("retry.reason", reason),
            attribute.String("event.type", "resilience.retry"),
        ))
    }
}

// RecordCacheOperation records cache hits/misses
func RecordCacheOperation(ctx context.Context, operation string, key string, hit bool) {
    span := trace.SpanFromContext(ctx)
    if span.IsRecording() {
        span.AddEvent("cache_operation", trace.WithAttributes(
            attribute.String("cache.operation", operation),
            attribute.String("cache.key", key),
            attribute.Bool("cache.hit", hit),
            attribute.String("event.type", "cache.access"),
        ))
    }
}

// RecordServiceMeshRouting records routing decisions
func RecordServiceMeshRouting(ctx context.Context, targetService string, selectedPod string, routingRule string) {
    span := trace.SpanFromContext(ctx)
    if span.IsRecording() {
        span.AddEvent("service_mesh_routing", trace.WithAttributes(
            attribute.String("mesh.target_service", targetService),
            attribute.String("mesh.selected_pod", selectedPod),
            attribute.String("mesh.routing_rule", routingRule),
            attribute.String("event.type", "service_mesh.routing"),
        ))
    }
}

// RecordHealthCheckFailure records when dependencies fail health checks
func RecordHealthCheckFailure(ctx context.Context, serviceName string, checkType string, errorMsg string) {
    span := trace.SpanFromContext(ctx)
    if span.IsRecording() {
        span.AddEvent("health_check_failed", trace.WithAttributes(
            attribute.String("health_check.service", serviceName),
            attribute.String("health_check.type", checkType),
            attribute.String("health_check.error", errorMsg),
            attribute.String("event.type", "health_check.failure"),
        ))
        span.SetStatus(codes.Error, "dependency health check failed")
    }
}
```

## Implementing Custom HTTP Middleware

Create middleware that automatically adds Kubernetes context to all HTTP requests:

```go
// middleware.go
package middleware

import (
    "net/http"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"

    "your/module/observability"
)

var (
    tracer   = otel.Tracer("http-middleware")
    k8sAttrs = observability.LoadFromEnvironment()
)

// KubernetesContextMiddleware adds Kubernetes context to traces
func KubernetesContextMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx, span := tracer.Start(
            r.Context(),
            r.Method+" "+r.URL.Path,
            k8sAttrs.AddToNewSpan(),
            trace.WithSpanKind(trace.SpanKindServer),
            trace.WithAttributes(
                attribute.String("http.request.method", r.Method),
                attribute.String("url.path", r.URL.Path),
                attribute.String("url.scheme", requestScheme(r)),
                attribute.String("server.address", r.Host),
                attribute.String("user_agent.original", r.UserAgent()),
            ),
        )
        defer span.End()

        // Add resource metrics at request start
        observability.AddResourceAttributesToSpan(ctx)

        // Wrap response writer to capture status code
        wrapped := &responseWriter{
            ResponseWriter: w,
            statusCode:     http.StatusOK,
        }

        startTime := time.Now()

        // Process request
        next.ServeHTTP(wrapped, r.WithContext(ctx))

        // Add response attributes
        duration := time.Since(startTime)
        span.SetAttributes(
            attribute.Int("http.response.status_code", wrapped.statusCode),
            attribute.Int64("http.response.body.size", wrapped.bytesWritten),
            attribute.Int64("http.duration_ms", duration.Milliseconds()),
        )

        // Record slow request event
        if duration > 5*time.Second {
            span.AddEvent("slow_request", trace.WithAttributes(
                attribute.Int64("request.duration_ms", duration.Milliseconds()),
                attribute.String("event.type", "performance.slow_request"),
            ))
        }

        // Set span status based on HTTP status
        if wrapped.statusCode >= 500 {
            span.SetStatus(codes.Error, http.StatusText(wrapped.statusCode))
        }
    })
}

type responseWriter struct {
    http.ResponseWriter
    statusCode   int
    bytesWritten int64
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
    n, err := rw.ResponseWriter.Write(b)
    rw.bytesWritten += int64(n)
    return n, err
}

func requestScheme(r *http.Request) string {
    if scheme := r.Header.Get("X-Forwarded-Proto"); scheme != "" {
        return scheme
    }
    if r.TLS != nil {
        return "https"
    }
    return "http"
}
```

## Adding Database Query Context

Capture Kubernetes context when tracing database operations:

```go
// database.go
package database

import (
    "context"
    "database/sql"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"

    "your/module/observability"
)

var (
    tracer   = otel.Tracer("database")
    k8sAttrs = observability.LoadFromEnvironment()
)

type TracedDB struct {
    *sql.DB
}

func (db *TracedDB) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
    ctx, span := tracer.Start(
        ctx,
        "db.query",
        k8sAttrs.AddToNewSpan(),
        trace.WithSpanKind(trace.SpanKindClient),
        trace.WithAttributes(
            attribute.String("db.system.name", "postgresql"),
            attribute.String("db.query.text", query),
        ),
    )
    defer span.End()

    startTime := time.Now()
    rows, err := db.DB.QueryContext(ctx, query, args...)
    duration := time.Since(startTime)

    span.SetAttributes(
        attribute.Int64("db.duration_ms", duration.Milliseconds()),
    )

    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        span.AddEvent("db_query_error", trace.WithAttributes(
            attribute.String("error.message", err.Error()),
            attribute.String("event.type", "database.error"),
        ))
        return nil, err
    }

    // Record slow query event
    if duration > 100*time.Millisecond {
        span.AddEvent("slow_query", trace.WithAttributes(
            attribute.Int64("query.duration_ms", duration.Milliseconds()),
            attribute.String("event.type", "database.slow_query"),
        ))
    }

    return rows, nil
}
```

## Kubernetes Deployment Configuration

Deploy your instrumented application with the necessary environment variables:

```yaml
# deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
  labels:
    app: payment-service
    version: v1.2.3
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        version: v1.2.3
    spec:
      containers:
      - name: payment-service
        image: payment-service:v1.2.3
        env:
        # Kubernetes metadata
        - name: K8S_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: K8S_POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: K8S_POD_UID
          valueFrom:
            fieldRef:
              fieldPath: metadata.uid
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: K8S_DEPLOYMENT_NAME
          value: "payment-service"
        - name: K8S_CONTAINER_NAME
          value: "payment-service"

        # Capture the Deployment's pod-template-hash label
        - name: K8S_POD_TEMPLATE_HASH
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['pod-template-hash']

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Querying Enriched Traces

Query traces using the custom attributes you added:

```bash
# Find traces for a specific pod
curl -G "http://tempo-query:3100/api/search" \
  --data-urlencode 'q={ span.k8s.pod.name = "payment-service-5d7c8f9b4d-x7k9m" }'

# Find slow requests on a specific node
curl -G "http://tempo-query:3100/api/search" \
  --data-urlencode 'q={ span.k8s.node.name = "node-3" && event:name = "slow_request" && event.event.type = "performance.slow_request" }'

# Find traces with memory pressure
curl -G "http://tempo-query:3100/api/search" \
  --data-urlencode 'q={ span.k8s.container.memory.near_limit = true }'
```

Custom span events and attributes transform generic traces into rich, contextual records of your Kubernetes application behavior. By capturing environment-specific details, you build traces that accelerate debugging and provide deeper insights into distributed system operations.
