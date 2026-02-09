# How to Configure Prometheus Exemplars to Link Kubernetes Metrics to Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Observability

Description: Learn how to configure Prometheus exemplars in Kubernetes to create direct links between metrics and distributed traces, enabling seamless navigation from metric anomalies to specific trace examples.

---

When you spot a latency spike in your Prometheus metrics, the next question is always "which specific requests caused this?" Traditionally, this requires correlating timestamps between your metrics and traces, then manually searching through your tracing backend. Prometheus exemplars eliminate this friction by embedding trace IDs directly into metrics, creating clickable links from metric graphs to specific trace examples.

This guide shows you how to configure Prometheus exemplars in Kubernetes, instrument your applications to emit exemplars, and set up Grafana to display them as interactive trace links.

## Understanding Prometheus Exemplars

Exemplars are sample data points attached to metrics that include trace IDs. When you record a histogram or counter metric, you can optionally attach an exemplar containing a trace ID from that specific request. Prometheus stores a subset of these exemplars alongside your metrics.

The key benefit: when you see high latency in a histogram, you can click directly to a trace that exemplifies that high latency, seeing the exact request flow that caused the spike.

## Enabling Exemplar Support in Prometheus

First, ensure your Prometheus deployment supports exemplars. Exemplar support requires Prometheus 2.26.0 or later:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.45.0
        args:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--web.enable-lifecycle'
        - '--enable-feature=exemplar-storage'  # Enable exemplar storage
        - '--storage.tsdb.max-exemplars=100000'  # Increase exemplar storage limit
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        - name: prometheus-storage
          mountPath: /prometheus
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
      - name: prometheus-storage
        emptyDir: {}
```

The `--enable-feature=exemplar-storage` flag activates exemplar support, while `--storage.tsdb.max-exemplars` controls how many exemplars Prometheus retains.

## Instrumenting Go Applications with Exemplars

For Go applications using the Prometheus client library, add exemplar support to your histogram metrics:

```go
package main

import (
    "context"
    "net/http"
    "time"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

var (
    // Create histogram with native support for exemplars
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint", "status"},
    )
)

func init() {
    prometheus.MustRegister(requestDuration)
}

// Middleware that records metrics with exemplars
func metricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Execute request
        next.ServeHTTP(w, r)

        duration := time.Since(start).Seconds()

        // Extract trace context from request
        ctx := r.Context()
        span := trace.SpanFromContext(ctx)
        spanContext := span.SpanContext()

        // Record metric with exemplar if trace is sampled
        if spanContext.IsValid() && spanContext.IsSampled() {
            // Create exemplar with trace ID
            exemplar := prometheus.Labels{
                "traceID": spanContext.TraceID().String(),
            }

            // Observe with exemplar
            requestDuration.WithLabelValues(
                r.Method,
                r.URL.Path,
                "200",
            ).(prometheus.ExemplarObserver).ObserveWithExemplar(
                duration,
                exemplar,
            )
        } else {
            // Regular observation without exemplar
            requestDuration.WithLabelValues(
                r.Method,
                r.URL.Path,
                "200",
            ).Observe(duration)
        }
    })
}

func main() {
    // Set up your OpenTelemetry tracer here
    // tracer := initTracer()

    mux := http.NewServeMux()
    mux.HandleFunc("/api/users", handleUsers)

    // Wrap with metrics middleware
    http.Handle("/", metricsMiddleware(mux))
    http.Handle("/metrics", promhttp.Handler())

    http.ListenAndServe(":8080", nil)
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
    // Your handler logic
    w.Write([]byte("Users endpoint"))
}
```

This code records request duration metrics and attaches trace IDs as exemplars when the request is sampled.

## Configuring OpenTelemetry for Trace Context

Ensure your OpenTelemetry setup propagates trace context correctly:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() *trace.TracerProvider {
    // Create OTLP exporter
    exporter, err := otlptracegrpc.New(
        context.Background(),
        otlptracegrpc.WithEndpoint("tempo.monitoring.svc.cluster.local:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        panic(err)
    }

    // Create tracer provider with sampling
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithSampler(trace.TraceIDRatioBased(0.1)), // Sample 10% of traces
    )

    // Set global tracer provider
    otel.SetTracerProvider(tp)

    // Set propagator for W3C trace context
    otel.SetTextMapPropagator(
        propagation.NewCompositeTextMapPropagator(
            propagation.TraceContext{},
            propagation.Baggage{},
        ),
    )

    return tp
}
```

## Instrumenting Python Applications with Exemplars

For Python applications using the prometheus_client library:

```python
import time
from prometheus_client import Histogram, REGISTRY
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Create histogram metric
REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint', 'status']
)

# Initialize OpenTelemetry
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# Configure OTLP exporter
otlp_exporter = OTLPSpanExporter(
    endpoint="tempo.monitoring.svc.cluster.local:4317",
    insecure=True
)
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(otlp_exporter)
)

def process_request(method, endpoint):
    """Example request handler with exemplar support."""
    start_time = time.time()

    # Start trace span
    with tracer.start_as_current_span(f"{method} {endpoint}") as span:
        # Process request logic here
        time.sleep(0.1)

        duration = time.time() - start_time

        # Get trace context
        span_context = span.get_span_context()

        # Record metric with exemplar
        if span_context.is_valid and span_context.trace_flags.sampled:
            REQUEST_DURATION.labels(
                method=method,
                endpoint=endpoint,
                status='200'
            ).observe(
                duration,
                exemplar={'traceID': format(span_context.trace_id, '032x')}
            )
        else:
            REQUEST_DURATION.labels(
                method=method,
                endpoint=endpoint,
                status='200'
            ).observe(duration)
```

## Configuring Prometheus Scrape for Exemplars

Update your Prometheus scrape configuration to collect exemplars:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod

      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      # Enable exemplar scraping
      metric_relabel_configs:
      - source_labels: [__name__]
        regex: '.*'
        action: keep

      # Scrape exemplars for histograms
      scrape_configs:
        - job_name: 'kubernetes-pods-exemplars'
          honor_labels: true
          kubernetes_sd_configs:
          - role: pod
          scrape_interval: 30s
```

## Connecting Prometheus to Tempo in Grafana

Configure Grafana to link Prometheus exemplars to Tempo traces:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus.monitoring.svc.cluster.local:9090
      jsonData:
        httpMethod: POST
        # Configure exemplar support
        exemplarTraceIdDestinations:
          # Link to Tempo datasource using trace ID
          - name: traceID
            datasourceUid: tempo
            urlDisplayLabel: "View Trace"

    - name: Tempo
      type: tempo
      access: proxy
      uid: tempo
      url: http://tempo.monitoring.svc.cluster.local:3100
      jsonData:
        httpMethod: GET
        tracesToLogs:
          datasourceUid: 'loki'
```

This configuration tells Grafana to create clickable links from Prometheus exemplars to Tempo traces.

## Creating Grafana Dashboards with Exemplar Support

Build dashboards that display exemplars:

```json
{
  "panels": [
    {
      "type": "timeseries",
      "title": "Request Duration with Exemplars",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))",
          "legendFormat": "p95 - {{endpoint}}",
          "exemplar": true
        }
      ],
      "options": {
        "tooltip": {
          "mode": "multi"
        }
      },
      "fieldConfig": {
        "defaults": {
          "custom": {
            "showPoints": "always"
          }
        }
      }
    }
  ]
}
```

The `"exemplar": true` setting enables exemplar display on the graph. You'll see diamond markers on the graph representing exemplars.

## Advanced Exemplar Patterns

Add additional context to exemplars beyond trace IDs:

```go
// Add span ID for more precise linking
exemplar := prometheus.Labels{
    "traceID": spanContext.TraceID().String(),
    "spanID":  spanContext.SpanID().String(),
}

// Add user context for filtering
exemplar := prometheus.Labels{
    "traceID": spanContext.TraceID().String(),
    "userID":  extractUserID(r),
}

// Add request identifiers
exemplar := prometheus.Labels{
    "traceID":   spanContext.TraceID().String(),
    "requestID": r.Header.Get("X-Request-ID"),
}
```

## Querying Exemplars via PromQL

Access exemplars programmatically using Prometheus API:

```bash
# Query exemplars for a specific metric
curl 'http://prometheus:9090/api/v1/query_exemplars' \
  --data-urlencode 'query=http_request_duration_seconds_bucket{endpoint="/api/users"}' \
  --data-urlencode 'start=2026-02-09T00:00:00Z' \
  --data-urlencode 'end=2026-02-09T23:59:59Z'
```

## Troubleshooting Exemplar Collection

Common issues and solutions:

```promql
# Check if metrics are being scraped with exemplars
scrape_samples_post_metric_relabeling{job="kubernetes-pods"}

# Verify exemplar storage usage
prometheus_tsdb_exemplar_series_current

# Check exemplar out-of-order rejections
prometheus_tsdb_exemplar_out_of_order_total
```

## Conclusion

Prometheus exemplars bridge the gap between metrics and traces, transforming your observability workflow. Instead of manually correlating timestamps to find relevant traces, you click directly from a metric spike to the exact trace that caused it. This dramatically reduces investigation time during incidents.

Start by enabling exemplar support in Prometheus, instrument your applications to emit trace IDs with metrics, and configure Grafana to link exemplars to your tracing backend. The result is a seamless navigation experience that connects metrics to traces with a single click, making it trivial to understand the root cause of metric anomalies.
