# How to Monitor Multi-Cluster Health with Centralized OpenTelemetry Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Monitoring, Multi-Cluster, Observability, Distributed Tracing

Description: Learn how to implement centralized OpenTelemetry pipelines for comprehensive health monitoring across multiple Kubernetes clusters with unified traces, metrics, and logs.

---

Monitoring the health of applications distributed across multiple Kubernetes clusters requires unified observability. OpenTelemetry provides vendor-neutral instrumentation and telemetry collection that works consistently across clusters, allowing you to correlate traces, metrics, and logs from your entire distributed system.

In this guide, you'll learn how to deploy OpenTelemetry collectors in each cluster and aggregate telemetry data into a central backend for unified observability.

## Understanding OpenTelemetry Architecture for Multi-Cluster

OpenTelemetry separates telemetry generation from collection and export. Applications generate traces, metrics, and logs using OpenTelemetry SDKs. Collectors in each cluster receive telemetry, process it, and forward to backends. A central backend stores and visualizes telemetry across all clusters.

For multi-cluster deployments, each cluster runs collectors in agent mode (deployed as DaemonSet) and gateway mode (deployed as Deployment). Agents collect telemetry from local workloads. Gateways aggregate and batch telemetry before sending to central backends.

## Deploying OpenTelemetry Collector in Each Cluster

Install the OpenTelemetry Operator:

```bash
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/download/v0.92.0/opentelemetry-operator.yaml
```

Deploy collectors in agent mode as DaemonSet:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-agent
  namespace: observability
spec:
  mode: daemonset
  image: otel/opentelemetry-collector-contrib:0.92.0
  env:
  - name: K8S_NODE_NAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
  - name: K8S_POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: K8S_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  - name: CLUSTER_NAME
    value: "cluster-1"  # Change per cluster

  config: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Collect host metrics
      hostmetrics:
        collection_interval: 30s
        scrapers:
          cpu:
          memory:
          disk:
          network:
          filesystem:

      # Collect Kubernetes events
      k8s_events:
        auth_type: serviceAccount
        namespaces: [default, production]

    processors:
      # Add cluster and node information
      resource:
        attributes:
        - key: cluster.name
          value: ${CLUSTER_NAME}
          action: upsert
        - key: k8s.node.name
          value: ${K8S_NODE_NAME}
          action: upsert
        - key: k8s.pod.name
          value: ${K8S_POD_NAME}
          action: upsert
        - key: k8s.namespace.name
          value: ${K8S_NAMESPACE}
          action: upsert

      # Batch telemetry for efficiency
      batch:
        timeout: 10s
        send_batch_size: 1024

      # Sample traces to reduce volume
      probabilistic_sampler:
        sampling_percentage: 10

      # Add resource detection
      resourcedetection:
        detectors: [env, system, docker]
        timeout: 5s

    exporters:
      # Forward to gateway collector
      otlp:
        endpoint: otel-gateway.observability.svc.cluster.local:4317
        tls:
          insecure: true

      # For debugging
      logging:
        loglevel: info

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [resource, batch, probabilistic_sampler]
          exporters: [otlp]

        metrics:
          receivers: [otlp, hostmetrics]
          processors: [resource, batch]
          exporters: [otlp]

        logs:
          receivers: [otlp, k8s_events]
          processors: [resource, batch]
          exporters: [otlp]
```

Deploy gateway collectors:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-gateway
  namespace: observability
spec:
  mode: deployment
  replicas: 3
  image: otel/opentelemetry-collector-contrib:0.92.0
  env:
  - name: CLUSTER_NAME
    value: "cluster-1"

  config: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 30s
        send_batch_size: 2048

      # Add additional cluster metadata
      resource:
        attributes:
        - key: deployment.environment
          value: production
          action: upsert
        - key: cluster.region
          value: us-east-1
          action: upsert

      # Tail sampling for intelligent trace retention
      tail_sampling:
        decision_wait: 10s
        num_traces: 100
        expected_new_traces_per_sec: 10
        policies:
        - name: errors-policy
          type: status_code
          status_code:
            status_codes: [ERROR]
        - name: slow-traces
          type: latency
          latency:
            threshold_ms: 1000
        - name: random-sampling
          type: probabilistic
          probabilistic:
            sampling_percentage: 5

    exporters:
      # Export to centralized backend
      otlp/jaeger:
        endpoint: jaeger-central.monitoring.svc.cluster.local:4317
        tls:
          insecure: true

      prometheus:
        endpoint: "0.0.0.0:8889"
        namespace: otel
        const_labels:
          cluster: ${CLUSTER_NAME}

      loki:
        endpoint: http://loki-gateway.logging.svc.cluster.local/loki/api/v1/push
        labels:
          resource:
            cluster.name: "cluster"
            k8s.namespace.name: "namespace"
            k8s.pod.name: "pod"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [resource, batch, tail_sampling]
          exporters: [otlp/jaeger]

        metrics:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [prometheus]

        logs:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [loki]
```

## Instrumenting Applications

Instrument applications to emit OpenTelemetry data:

```go
// main.go - Go application example
package main

import (
    "context"
    "log"
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initTracer() (*trace.TracerProvider, error) {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-agent.observability.svc.cluster.local:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("api-service"),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(res),
    )
    otel.SetTracerProvider(tp)

    return tp, nil
}

func main() {
    tp, err := initTracer()
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(context.Background())

    http.HandleFunc("/api/users", handleUsers)
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
    tracer := otel.Tracer("api-service")
    ctx, span := tracer.Start(r.Context(), "handleUsers")
    defer span.End()

    // Add span attributes
    span.SetAttributes(
        semconv.HTTPMethod(r.Method),
        semconv.HTTPURL(r.URL.String()),
    )

    // Your business logic here
    users := fetchUsers(ctx)

    w.WriteHeader(http.StatusOK)
    w.Write([]byte(users))
}
```

Python application example:

```python
# app.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
from flask import Flask

# Initialize tracing
resource = Resource.create({
    "service.name": "user-service",
    "service.version": "1.0.0",
})

trace_provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(
    endpoint="otel-agent.observability.svc.cluster.local:4317",
    insecure=True
)
trace_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
trace.set_tracer_provider(trace_provider)

# Initialize metrics
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(
        endpoint="otel-agent.observability.svc.cluster.local:4317",
        insecure=True
    )
)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

app = Flask(__name__)
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

# Create custom metrics
request_counter = meter.create_counter(
    "api_requests_total",
    description="Total API requests"
)

@app.route('/api/users')
def get_users():
    with tracer.start_as_current_span("get_users") as span:
        span.set_attribute("http.method", "GET")
        request_counter.add(1, {"endpoint": "/api/users"})

        users = fetch_users()
        return users

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Deploying Central Observability Backend

Deploy Jaeger for distributed tracing:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-central
  namespace: monitoring
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch.monitoring.svc:9200
        index-prefix: jaeger

  query:
    replicas: 3
    resources:
      requests:
        cpu: 500m
        memory: 1Gi

  collector:
    replicas: 5
    maxReplicas: 10
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
```

Configure Prometheus for metrics aggregation (already covered in previous posts, but here's a summary):

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: otel-gateway
  namespace: observability
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: otel-gateway
  endpoints:
  - port: prometheus
    interval: 30s
    path: /metrics
```

## Creating Health Dashboards

Build comprehensive health dashboards:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: multi-cluster-health-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Multi-Cluster Health Overview",
        "panels": [
          {
            "title": "Request Rate by Cluster",
            "targets": [{
              "expr": "sum(rate(http_requests_total[5m])) by (cluster)"
            }]
          },
          {
            "title": "Error Rate by Cluster",
            "targets": [{
              "expr": "sum(rate(http_requests_total{status=~'5..'}[5m])) by (cluster) / sum(rate(http_requests_total[5m])) by (cluster)"
            }]
          },
          {
            "title": "P99 Latency by Cluster",
            "targets": [{
              "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (cluster, le))"
            }]
          },
          {
            "title": "Active Spans by Cluster",
            "targets": [{
              "expr": "sum(otel_traces_active_spans) by (cluster)"
            }]
          }
        ]
      }
    }
```

## Implementing Health Checks Based on Telemetry

Create alerts based on OpenTelemetry data:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: multi-cluster-health-alerts
  namespace: monitoring
spec:
  groups:
  - name: health
    rules:
    - alert: HighErrorRateInCluster
      expr: |
        sum(rate(http_requests_total{status=~"5.."}[5m])) by (cluster)
        /
        sum(rate(http_requests_total[5m])) by (cluster) > 0.05
      for: 5m
      annotations:
        summary: "High error rate in {{ $labels.cluster }}"

    - alert: HighLatencyInCluster
      expr: |
        histogram_quantile(0.99,
          sum(rate(http_request_duration_seconds_bucket[5m])) by (cluster, le)
        ) > 2
      for: 10m
      annotations:
        summary: "High latency detected in {{ $labels.cluster }}"

    - alert: TelemetryCollectionFailure
      expr: rate(otelcol_receiver_refused_spans[5m]) > 0
      for: 5m
      annotations:
        summary: "OpenTelemetry collector refusing spans in {{ $labels.cluster }}"
```

## Best Practices

Use consistent resource attributes across all clusters. This enables accurate aggregation and filtering in your observability backend.

Implement tail sampling at the gateway level to keep only interesting traces while reducing storage costs.

Configure appropriate batch sizes and timeouts to balance latency with resource efficiency.

Monitor your observability pipeline itself. Failed telemetry collection creates blind spots during incidents.

Use semantic conventions for consistent attribute naming across services and clusters.

Implement sampling strategies that preserve error traces and slow requests while sampling routine traffic.

## Conclusion

OpenTelemetry provides a vendor-neutral, comprehensive solution for monitoring health across multiple Kubernetes clusters. By deploying collectors in each cluster and aggregating telemetry into centralized backends, you gain unified visibility into distributed applications.

Start with basic tracing and metrics collection, then expand to logs and custom instrumentation as your observability maturity grows. The standardized approach ensures you can switch backends or add new clusters without re-instrumenting applications.
