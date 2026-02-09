# How to Correlate Traces Metrics and Logs Using OpenTelemetry Resource Attributes in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTelemetry, Observability, Distributed Tracing, Logging

Description: Learn how to correlate traces, metrics, and logs using OpenTelemetry resource attributes in Kubernetes environments for unified observability and faster troubleshooting across telemetry signals.

---

Effective observability requires connecting traces, metrics, and logs to understand system behavior from multiple perspectives. When investigating an issue, you need to move seamlessly from a high-level metric spike to specific trace spans to detailed log entries. OpenTelemetry resource attributes provide the foundation for this correlation.

Resource attributes are key-value pairs that describe the entity producing telemetry data. By ensuring all three signal types share consistent resource attributes, you create the links needed for unified observability in Kubernetes environments.

## Understanding Resource Attributes for Correlation

Resource attributes identify the source of telemetry data. In Kubernetes, critical attributes include service name, namespace, pod name, container name, and cluster identifier. When these attributes are consistent across traces, metrics, and logs, observability tools can correlate signals automatically.

OpenTelemetry defines semantic conventions for resource attributes to ensure consistency. The most important attributes for correlation include `service.name`, `service.namespace`, `service.instance.id`, `k8s.namespace.name`, `k8s.pod.name`, and `k8s.container.name`.

## Configuring Resource Attributes in Application Code

Start by configuring consistent resource attributes in your OpenTelemetry SDK initialization. Here's a Go application example:

```go
// main.go
package main

import (
    "context"
    "log"
    "os"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initResource() (*resource.Resource, error) {
    // Create resource with semantic conventions
    return resource.New(context.Background(),
        // Service identification
        resource.WithAttributes(
            semconv.ServiceName("payment-service"),
            semconv.ServiceVersion(os.Getenv("APP_VERSION")),
            semconv.ServiceNamespace("production"),
            semconv.ServiceInstanceID(os.Getenv("HOSTNAME")),
        ),
        // Kubernetes attributes
        resource.WithAttributes(
            semconv.K8SNamespaceName(os.Getenv("K8S_NAMESPACE")),
            semconv.K8SPodName(os.Getenv("K8S_POD_NAME")),
            semconv.K8SPodUID(os.Getenv("K8S_POD_UID")),
            semconv.K8SContainerName(os.Getenv("K8S_CONTAINER_NAME")),
            semconv.K8SNodeName(os.Getenv("K8S_NODE_NAME")),
            semconv.K8SClusterName(os.Getenv("K8S_CLUSTER_NAME")),
        ),
        // Deployment metadata
        resource.WithAttributes(
            semconv.DeploymentEnvironment(os.Getenv("ENVIRONMENT")),
        ),
        // Auto-detect additional attributes
        resource.WithFromEnv(),
        resource.WithProcess(),
        resource.WithOS(),
        resource.WithContainer(),
        resource.WithHost(),
    )
}

func initTracer(res *resource.Resource) (*trace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(context.Background(),
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
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

func initMeter(res *resource.Resource) (*metric.MeterProvider, error) {
    exporter, err := otlpmetricgrpc.New(context.Background(),
        otlpmetricgrpc.WithEndpoint("otel-collector:4317"),
        otlpmetricgrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    mp := metric.NewMeterProvider(
        metric.WithReader(metric.NewPeriodicReader(exporter)),
        metric.WithResource(res),
    )

    otel.SetMeterProvider(mp)
    return mp, nil
}

func main() {
    // Initialize shared resource
    res, err := initResource()
    if err != nil {
        log.Fatalf("Failed to create resource: %v", err)
    }

    // Initialize tracing
    tp, err := initTracer(res)
    if err != nil {
        log.Fatalf("Failed to initialize tracer: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // Initialize metrics
    mp, err := initMeter(res)
    if err != nil {
        log.Fatalf("Failed to initialize meter: %v", err)
    }
    defer mp.Shutdown(context.Background())

    // Initialize logging with same resource attributes
    initLogger(res)

    // Start application
    log.Println("Payment service started")
    // ... rest of application
}
```

## Configuring Structured Logging with Resource Attributes

Configure your logging library to include the same resource attributes. Here's an example using the `slog` package:

```go
// logger.go
package main

import (
    "log/slog"
    "os"

    "go.opentelemetry.io/otel/sdk/resource"
)

func initLogger(res *resource.Resource) {
    // Extract resource attributes
    attrs := res.Attributes()

    // Create logger with resource attributes as default fields
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    })

    // Wrap handler to add resource attributes to every log
    wrappedHandler := &ResourceHandler{
        handler: handler,
        attrs:   attrs,
    }

    logger := slog.New(wrappedHandler)
    slog.SetDefault(logger)
}

type ResourceHandler struct {
    handler slog.Handler
    attrs   []attribute.KeyValue
}

func (h *ResourceHandler) Enabled(ctx context.Context, level slog.Level) bool {
    return h.handler.Enabled(ctx, level)
}

func (h *ResourceHandler) Handle(ctx context.Context, r slog.Record) error {
    // Add resource attributes to every log record
    for _, attr := range h.attrs {
        r.AddAttrs(slog.String(string(attr.Key), attr.Value.AsString()))
    }

    // Extract trace context if present
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        r.AddAttrs(
            slog.String("trace_id", span.SpanContext().TraceID().String()),
            slog.String("span_id", span.SpanContext().SpanID().String()),
            slog.Bool("trace_flags.sampled", span.SpanContext().IsSampled()),
        )
    }

    return h.handler.Handle(ctx, r)
}

func (h *ResourceHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
    return &ResourceHandler{
        handler: h.handler.WithAttrs(attrs),
        attrs:   h.attrs,
    }
}

func (h *ResourceHandler) WithGroup(name string) slog.Handler {
    return &ResourceHandler{
        handler: h.handler.WithGroup(name),
        attrs:   h.attrs,
    }
}
```

## Injecting Kubernetes Metadata with Downward API

Use the Kubernetes Downward API to inject pod and container metadata as environment variables:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment-service
        image: payment-service:v1.2.3
        env:
        # Service identification
        - name: APP_VERSION
          value: "v1.2.3"
        - name: ENVIRONMENT
          value: "production"

        # Kubernetes metadata via Downward API
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
        - name: K8S_CONTAINER_NAME
          value: "payment-service"

        # Use pod name as service instance ID
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name

        # Cluster identifier (from ConfigMap)
        - name: K8S_CLUSTER_NAME
          valueFrom:
            configMapKeyRef:
              name: cluster-info
              key: cluster.name

        # OpenTelemetry collector endpoint
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector.observability.svc.cluster.local:4317"
```

## Enriching Telemetry with OpenTelemetry Collector

Use the OpenTelemetry Collector to add or normalize resource attributes across all signals:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Detect and add Kubernetes metadata
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.pod.start_time
        - k8s.deployment.name
        - k8s.node.name
      labels:
        - tag_name: app
          key: app
          from: pod
        - tag_name: version
          key: version
          from: pod
      annotations:
        - tag_name: team
          key: team
          from: pod

  # Add cluster-level attributes
  resource:
    attributes:
      - key: k8s.cluster.name
        value: production-us-east-1
        action: upsert
      - key: cloud.provider
        value: aws
        action: insert
      - key: cloud.region
        value: us-east-1
        action: insert

  # Transform attributes for consistency
  transform:
    trace_statements:
      - context: resource
        statements:
          # Ensure service.instance.id exists
          - set(attributes["service.instance.id"], attributes["k8s.pod.name"]) where attributes["service.instance.id"] == nil
          # Normalize service namespace
          - set(attributes["service.namespace"], attributes["k8s.namespace.name"]) where attributes["service.namespace"] == nil

    metric_statements:
      - context: resource
        statements:
          - set(attributes["service.instance.id"], attributes["k8s.pod.name"]) where attributes["service.instance.id"] == nil
          - set(attributes["service.namespace"], attributes["k8s.namespace.name"]) where attributes["service.namespace"] == nil

    log_statements:
      - context: resource
        statements:
          - set(attributes["service.instance.id"], attributes["k8s.pod.name"]) where attributes["service.instance.id"] == nil
          - set(attributes["service.namespace"], attributes["k8s.namespace.name"]) where attributes["service.namespace"] == nil

  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  # Export traces to Tempo
  otlp/tempo:
    endpoint: tempo-distributor.observability.svc.cluster.local:4317
    tls:
      insecure: true

  # Export metrics to Prometheus
  prometheusremotewrite:
    endpoint: http://prometheus.observability.svc.cluster.local:9090/api/v1/write

  # Export logs to Loki
  loki:
    endpoint: http://loki.observability.svc.cluster.local:3100/loki/api/v1/push
    labels:
      resource:
        service.name: "service_name"
        service.namespace: "service_namespace"
        k8s.namespace.name: "k8s_namespace"
        k8s.pod.name: "k8s_pod"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [k8sattributes, resource, transform, batch]
      exporters: [otlp/tempo]

    metrics:
      receivers: [otlp]
      processors: [k8sattributes, resource, transform, batch]
      exporters: [prometheusremotewrite]

    logs:
      receivers: [otlp]
      processors: [k8sattributes, resource, transform, batch]
      exporters: [loki]
```

## Querying Correlated Telemetry in Grafana

Configure Grafana to leverage resource attributes for correlation. Create a dashboard that shows all three signals for a service:

```json
{
  "dashboard": {
    "title": "Service Observability - Payment Service",
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "targets": [
          {
            "datasource": "Prometheus",
            "expr": "sum(rate(http_server_duration_count{service_name=\"payment-service\"}[5m])) by (service_instance_id)",
            "legendFormat": "{{service_instance_id}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "timeseries",
        "targets": [
          {
            "datasource": "Prometheus",
            "expr": "sum(rate(http_server_duration_count{service_name=\"payment-service\", http_status_code=~\"5..\"}[5m])) by (service_instance_id)",
            "legendFormat": "{{service_instance_id}}"
          }
        ]
      },
      {
        "title": "Recent Traces",
        "type": "traces",
        "targets": [
          {
            "datasource": "Tempo",
            "query": "{resource.service.name=\"payment-service\"}",
            "limit": 20
          }
        ]
      },
      {
        "title": "Error Logs",
        "type": "logs",
        "targets": [
          {
            "datasource": "Loki",
            "expr": "{service_name=\"payment-service\", level=\"error\"}"
          }
        ]
      }
    ],
    "templating": {
      "list": [
        {
          "name": "service_instance",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(http_server_duration_count{service_name=\"payment-service\"}, service_instance_id)"
        }
      ]
    }
  }
}
```

Configure Tempo data links in Grafana to enable click-through from traces to logs:

```yaml
# grafana-datasources.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: observability
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Tempo
      type: tempo
      access: proxy
      url: http://tempo-query-frontend.observability.svc.cluster.local:3100
      jsonData:
        tracesToLogs:
          datasourceUid: 'loki'
          tags: ['service.name', 'service.instance.id', 'k8s.namespace.name', 'k8s.pod.name']
          mappedTags:
            - key: service.name
              value: service_name
            - key: service.instance.id
              value: service_instance_id
          filterByTraceID: true
          filterBySpanID: true
        tracesToMetrics:
          datasourceUid: 'prometheus'
          tags:
            - key: service.name
              value: service_name
            - key: 'k8s.pod.name'
              value: k8s_pod
          queries:
            - name: 'Request rate'
              query: 'sum(rate(http_server_duration_count{$$__tags}[5m]))'

    - name: Loki
      type: loki
      access: proxy
      url: http://loki.observability.svc.cluster.local:3100
      jsonData:
        derivedFields:
          - datasourceUid: tempo
            matcherRegex: "trace_id=(\\w+)"
            name: TraceID
            url: "$${__value.raw}"
```

## Validating Correlation in Practice

Create a test to verify that all three signals are properly correlated:

```python
# test_correlation.py
import requests
import time
from prometheus_api_client import PrometheusConnect
import json

def test_signal_correlation():
    """Verify that traces, metrics, and logs are correlated"""

    # Make a request that will generate telemetry
    response = requests.post(
        'http://payment-service.production.svc.cluster.local/charge',
        json={'amount': 100.00, 'customer_id': 'test-123'}
    )

    # Extract trace ID from response headers
    trace_id = response.headers.get('X-Trace-Id')
    assert trace_id, "No trace ID in response"

    time.sleep(5)  # Wait for data propagation

    # Query Tempo for the trace
    tempo_response = requests.get(
        f'http://tempo-query-frontend.observability.svc.cluster.local:3100/api/traces/{trace_id}'
    )
    assert tempo_response.status_code == 200

    trace_data = tempo_response.json()
    resource_attrs = trace_data['batches'][0]['resource']['attributes']

    # Extract resource attributes from trace
    service_name = next(a['value']['stringValue'] for a in resource_attrs if a['key'] == 'service.name')
    pod_name = next(a['value']['stringValue'] for a in resource_attrs if a['key'] == 'k8s.pod.name')

    # Query Prometheus for metrics with same resource attributes
    prom = PrometheusConnect(url='http://prometheus.observability.svc.cluster.local:9090')
    metrics = prom.custom_query(
        f'http_server_duration_count{{service_name="{service_name}", k8s_pod="{pod_name}"}}'
    )
    assert len(metrics) > 0, "No metrics found with matching resource attributes"

    # Query Loki for logs with same resource attributes
    loki_response = requests.get(
        'http://loki.observability.svc.cluster.local:3100/loki/api/v1/query_range',
        params={
            'query': f'{{service_name="{service_name}", k8s_pod="{pod_name}", trace_id="{trace_id}"}}',
            'limit': 100,
        }
    )
    assert loki_response.status_code == 200

    logs = loki_response.json()['data']['result']
    assert len(logs) > 0, "No logs found with matching resource attributes and trace ID"

    print(f"Successfully correlated trace {trace_id} with metrics and logs")
    print(f"Service: {service_name}, Pod: {pod_name}")
```

Consistent resource attributes create the foundation for unified observability. By ensuring traces, metrics, and logs share the same identifying attributes, you enable seamless navigation across telemetry signals when investigating issues in Kubernetes environments.
