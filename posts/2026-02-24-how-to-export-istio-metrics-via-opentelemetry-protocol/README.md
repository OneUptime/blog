# How to Export Istio Metrics via OpenTelemetry Protocol

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Metric, OTLP, Prometheus, Kubernetes

Description: Step-by-step guide to exporting Istio service mesh metrics through the OpenTelemetry Protocol for unified metrics collection and backend flexibility.

---

Istio generates a rich set of metrics for every request flowing through the mesh. Traditionally, these metrics were consumed through Prometheus scraping. But as organizations adopt OpenTelemetry as their standard telemetry framework, collecting Istio metrics with the OpenTelemetry Collector and exporting them via the OpenTelemetry Protocol (OTLP) provides a cleaner pipeline that works with any OTLP-compatible backend.

## Understanding Istio's Metric Architecture

Istio's Envoy sidecars generate metrics that cover the key signals:

- `istio_requests_total` - request count with response code, source, destination labels
- `istio_request_duration_milliseconds` - request latency histogram
- `istio_request_bytes` - request body size
- `istio_response_bytes` - response body size
- `istio_tcp_sent_bytes_total` - TCP bytes sent
- `istio_tcp_received_bytes_total` - TCP bytes received
- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed

These metrics are exposed on the sidecar's Prometheus endpoint (port 15020 by default when metrics merging is enabled) and can be scraped by an OpenTelemetry Collector.

## Setting Up the OpenTelemetry Collector

Deploy a collector configured to receive metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: istio-system
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
      prometheus:
        config:
          scrape_configs:
          - job_name: 'istio-proxies'
            metrics_path: /stats/prometheus
            kubernetes_sd_configs:
            - role: pod
            relabel_configs:
            - source_labels: [__meta_kubernetes_pod_container_port_name]
              action: keep
              regex: '.*-envoy-prom'
    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 5s
        limit_mib: 512
      filter:
        error_mode: ignore
        metric_conditions:
        - 'not IsMatch(metric.name, "^istio_.*")'
    exporters:
      debug:
        verbosity: basic
      otlphttp:
        endpoint: "https://your-backend.example.com"
      prometheus:
        endpoint: "0.0.0.0:8889"
    service:
      telemetry:
        metrics:
          readers:
          - pull:
              exporter:
                prometheus:
                  host: 0.0.0.0
                  port: 8888
      pipelines:
        metrics:
          receivers: [otlp, prometheus]
          processors: [memory_limiter, filter, batch]
          exporters: [prometheus, debug]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
- apiGroups: [""]
  resources: ["pods", "nodes", "endpoints", "services"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-collector
subjects:
- kind: ServiceAccount
  name: otel-collector
  namespace: istio-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      serviceAccountName: otel-collector
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.152.0
        args:
        - --config=/etc/otel/config.yaml
        ports:
        - containerPort: 4317
        - containerPort: 4318
        - containerPort: 8888
        - containerPort: 8889
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  selector:
    app: otel-collector
  ports:
  - port: 4317
    name: otlp-grpc
  - port: 4318
    name: otlp-http
  - port: 8888
    name: collector-metrics
  - port: 8889
    name: prometheus
```

```bash
kubectl apply -f otel-collector.yaml
```

## Approach 1: Prometheus Scraping Through OTel Collector

The simplest approach is having the OTel Collector scrape Istio's existing Prometheus endpoints. This doesn't require any changes to Istio's configuration:

The collector's Prometheus receiver (configured above) discovers the Envoy Prometheus ports exposed by Istio sidecars and gateways and scrapes their metrics. Those metrics then flow through the collector's pipeline and can be exported to any backend.

Verify metrics are being scraped:

```bash
kubectl logs -n istio-system -l app=otel-collector --tail=20
```

## Approach 2: Telemetry API Metrics Configuration

Istio's Telemetry API can select and customize metric providers, but Istio's OpenTelemetry extension provider is for traces and access logs, not direct OTLP metric export. Keep Prometheus as the metrics provider and use the collector to convert scraped metrics to OTLP:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultProviders:
      metrics:
      - prometheus
```

Then use the Telemetry API to enable the Prometheus metrics provider:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
```

## Customizing Which Metrics Are Exported

Use the Telemetry API to control which metrics get exported and how:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: default
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
        mode: CLIENT_AND_SERVER
      tagOverrides:
        source_principal:
          operation: REMOVE
        response_flags:
          operation: REMOVE
    - match:
        metric: REQUEST_DURATION
        mode: CLIENT
      disabled: true
```

This configuration:
- Removes the `source_principal` and `response_flags` tags from the request count metric (reducing cardinality)
- Disables the request duration metric on the client side

## Reducing Metric Cardinality

High cardinality metrics are the biggest challenge with Istio metrics at scale. Each unique combination of labels creates a separate time series. The default Istio metrics have many labels:

```text
source_workload, source_workload_namespace, source_principal,
destination_workload, destination_workload_namespace, destination_principal,
request_protocol, response_code, response_flags, connection_security_policy
```

Use the collector's processors to reduce cardinality:

```yaml
processors:
  attributes:
    actions:
    - key: source_principal
      action: delete
    - key: destination_principal
      action: delete
    - key: response_flags
      action: delete
  metrics_transform:
    transforms:
    - include: istio_requests_total
      action: update
      operations:
      - action: aggregate_labels
        label_set:
        - source_workload
        - destination_workload
        - response_code
        aggregation_type: sum
```

## Metric Transformation in the Collector

The collector can transform metrics before exporting:

```yaml
processors:
  metrics_transform:
    transforms:
    - include: istio_request_duration_milliseconds
      action: update
      new_name: http_request_duration_seconds
      operations:
      - action: experimental_scale_value
        experimental_scale: 0.001
    - include: istio_requests_total
      action: update
      new_name: http_requests_total
```

This renames Istio-specific metrics to more standard names, making them easier to work with in generic dashboards.

## Exporting to Multiple Backends

One of the strengths of the OTel Collector is fan-out. You can send the same metrics to multiple destinations:

```yaml
exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  otlp:
    endpoint: "your-otlp-metrics-backend.monitoring:4317"
    tls:
      insecure: true
  otlphttp:
    endpoint: "https://your-otlp-http-backend.example.com"
    headers:
      api-key: "${BACKEND_API_KEY}"

service:
  pipelines:
    metrics:
      receivers: [otlp, prometheus]
      processors: [batch]
      exporters: [prometheus, otlp, otlphttp]
```

## Monitoring the Pipeline

Make sure your metrics pipeline is healthy:

```bash
# Check collector metrics

kubectl port-forward -n istio-system svc/otel-collector 8888:8888
curl localhost:8888/metrics | grep otelcol

# Key metrics to watch:
# otelcol_receiver_accepted_metric_points - metrics received
# otelcol_exporter_sent_metric_points - metrics exported
# otelcol_exporter_send_failed_metric_points - metrics export failures
# otelcol_exporter_queue_size - export queue depth
```

Set up alerts for:

```promql
# Collector falling behind
max_over_time(otelcol_exporter_queue_size[5m]) > 0

# Export queue enqueue failures
rate(otelcol_exporter_enqueue_failed_metric_points[5m]) > 0

# Export failures
rate(otelcol_exporter_send_failed_metric_points[5m]) > 0
```

## High Availability Collector Setup

For production, run the collector as a DaemonSet or with multiple replicas behind a load balancer:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.152.0
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
```

## Troubleshooting

If metrics aren't flowing:

```bash
# Check collector errors
kubectl logs -n istio-system -l app=otel-collector | grep -i "error"

# Verify Istio proxy is generating metrics
POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD -c istio-proxy -- curl -s localhost:15020/stats/prometheus | head -20

# Check the collector's own metrics endpoint
kubectl port-forward -n istio-system svc/otel-collector 8888:8888
curl localhost:8888/metrics | grep otelcol_receiver_accepted_metric_points

# Check Telemetry resource status
kubectl get telemetry -A -o yaml
```

Exporting Istio metrics via OpenTelemetry gives you a flexible, vendor-neutral pipeline. With the scrape-based approach, the collector sits in the middle and gives you control over what gets exported, how it gets transformed, and where it goes. This separation of concerns makes it much easier to change backends or add new exporters without touching your mesh configuration.
