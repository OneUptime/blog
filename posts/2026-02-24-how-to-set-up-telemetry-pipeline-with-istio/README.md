# How to Set Up Telemetry Pipeline with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Pipeline, Observability, OpenTelemetry

Description: How to build a complete telemetry pipeline with Istio that collects, processes, and routes metrics, traces, and logs to your backends.

---

A telemetry pipeline is the system that moves observability data from where it is generated (Istio's Envoy proxies) to where it is stored and queried (your monitoring backends). Getting this pipeline right is the difference between having a wall of useless dashboards and having actionable observability that helps you fix problems fast.

This guide walks through building a production-grade telemetry pipeline for Istio from scratch.

## Pipeline Architecture

A well-designed telemetry pipeline has three stages:

1. **Collection** - Envoy proxies generate metrics, traces, and access logs
2. **Processing** - An intermediary (typically OpenTelemetry Collector) batches, filters, enriches, and routes the data
3. **Storage and Querying** - Backend systems store the data and provide query interfaces

The pipeline looks like this:

```
Envoy Proxies --> OTel Collector --> Backends
  (metrics)         (batch)           (Prometheus)
  (traces)          (filter)          (Jaeger/Tempo)
  (logs)            (enrich)          (Loki/Elasticsearch)
```

## Step 1: Deploy the Observability Stack

Start by deploying your backends. For this guide, we will use Prometheus for metrics, Grafana Tempo for traces, and Loki for logs:

```bash
# Create namespace
kubectl create namespace observability

# Deploy Prometheus
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/prometheus.yaml

# Deploy Grafana
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/grafana.yaml
```

For Tempo and Loki, use Helm:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install tempo grafana/tempo -n observability
helm install loki grafana/loki -n observability --set loki.auth_enabled=false
```

## Step 2: Deploy the OpenTelemetry Collector

The Collector is the central piece that ties everything together:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
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
              kubernetes_sd_configs:
                - role: pod
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
                  regex: "true"
                  action: keep

    processors:
      batch:
        timeout: 5s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 1s
        limit_mib: 2048
        spike_limit_mib: 512
      resource:
        attributes:
          - key: cluster
            value: "production"
            action: upsert
      filter:
        error_mode: ignore
        traces:
          span:
            - 'attributes["http.target"] == "/healthz"'
            - 'attributes["http.target"] == "/readyz"'

    exporters:
      otlp/tempo:
        endpoint: tempo.observability:4317
        tls:
          insecure: true
      prometheusremotewrite:
        endpoint: http://prometheus.observability:9090/api/v1/write
      loki:
        endpoint: http://loki.observability:3100/loki/api/v1/push

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, filter, resource, batch]
          exporters: [otlp/tempo]
        metrics:
          receivers: [otlp, prometheus]
          processors: [memory_limiter, batch]
          exporters: [prometheusremotewrite]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [loki]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 2
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
          image: otel/opentelemetry-collector-contrib:0.92.0
          args: ["--config=/etc/otelcol-contrib/config.yaml"]
          ports:
            - containerPort: 4317
            - containerPort: 4318
            - containerPort: 8888
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "2"
              memory: 4Gi
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol-contrib
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
    - name: otlp-http
      port: 4318
    - name: metrics
      port: 8888
```

Note the `filter` processor that drops health check spans. These are noise and can account for a large percentage of trace volume.

## Step 3: Configure Istio Telemetry Providers

Register the Collector as a provider in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel-tracing
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
      - name: otel-access-log
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
          - "cluster_manager"
          - "server"
```

## Step 4: Activate Telemetry Collection

Create Telemetry resources to route data to the pipeline:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-telemetry
  namespace: istio-system
spec:
  # Tracing configuration
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 5.0
      customTags:
        environment:
          literal:
            value: "production"

  # Access logging
  accessLogging:
    - providers:
        - name: otel-access-log
      filter:
        expression: "response.code >= 400"

  # Metrics
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            connection_security_policy:
              operation: REMOVE
```

## Step 5: Set Up Prometheus Scraping

Make sure Prometheus scrapes the Istio proxies and the control plane:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: observability
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s

    scrape_configs:
      - job_name: 'istio-mesh'
        kubernetes_sd_configs:
          - role: endpoints
            namespaces:
              names: [istio-system]
        relabel_configs:
          - source_labels: [__meta_kubernetes_service_name]
            regex: istiod
            action: keep

      - job_name: 'envoy-stats'
        metrics_path: /stats/prometheus
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_container_name]
            regex: istio-proxy
            action: keep
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__
```

## Step 6: Configure Grafana Dashboards

Import the Istio dashboards into Grafana:

```bash
# Port forward to Grafana
kubectl port-forward svc/grafana -n observability 3000:3000
```

Add data sources in Grafana:

- **Prometheus** - URL: `http://prometheus.observability:9090`
- **Tempo** - URL: `http://tempo.observability:3100`
- **Loki** - URL: `http://loki.observability:3100`

Import the standard Istio dashboards from the Istio GitHub repo or use the Grafana dashboard IDs:

- Mesh Dashboard: 7639
- Service Dashboard: 7636
- Workload Dashboard: 7630

## Step 7: Validate the Pipeline

Run through each telemetry signal to verify data is flowing:

```bash
# Check metrics in Prometheus
kubectl port-forward svc/prometheus -n observability 9090:9090
# Query: istio_requests_total

# Check traces in Tempo
kubectl port-forward svc/tempo -n observability 3200:3200
# Use Grafana Explore with Tempo data source

# Check access logs
kubectl port-forward svc/loki -n observability 3100:3100
# Use Grafana Explore with Loki data source

# Check OTel Collector health
kubectl logs deploy/otel-collector -n observability | tail -20
```

Generate some test traffic:

```bash
kubectl exec deploy/sleep -c sleep -- curl -s http://httpbin.default:8000/status/200
kubectl exec deploy/sleep -c sleep -- curl -s http://httpbin.default:8000/status/500
```

Then verify the data appears in each backend.

## Pipeline Reliability

For a production pipeline, add reliability measures:

```yaml
# In OTel Collector config
exporters:
  otlp/tempo:
    endpoint: tempo.observability:4317
    tls:
      insecure: true
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
```

The retry and queue settings prevent data loss when backends are temporarily unavailable.

Building a telemetry pipeline is one of those investments that pays for itself the first time you need to debug a production incident. The key is getting all three signals (metrics, traces, logs) flowing through a single pipeline so you can correlate them during investigations.
