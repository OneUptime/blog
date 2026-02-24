# How to Set Up Cross-Cluster Observability with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Observability, Multi-Cluster, Tracing, Kubernetes

Description: Complete guide to building a unified observability stack for multi-cluster Istio with metrics, tracing, and logging.

---

Running Istio across multiple clusters without unified observability is like flying blind with extra engines. You have more things that can fail, more traffic paths to understand, and more configuration to get wrong. But all the telemetry data is siloed in each cluster, making it nearly impossible to trace a request from start to finish when it crosses cluster boundaries.

This guide walks through setting up a complete observability stack that gives you a unified view across all your Istio clusters.

## The Three Pillars Across Clusters

You need three things working across clusters:

1. **Metrics** - Request rates, error rates, latency, resource usage
2. **Distributed traces** - End-to-end request flows across cluster boundaries
3. **Logs** - Access logs from Envoy proxies, istiod logs, application logs

Each of these needs a strategy for collection, aggregation, and querying across clusters.

## Unified Metrics with Thanos

Prometheus federation works for small setups but struggles at scale. Thanos gives you a global view of metrics without moving all the raw data to a central location.

**Deploy Prometheus with Thanos sidecar in each cluster:**

```yaml
apiVersion: apps/v1
kind: StatefulSet
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
        thanos-store-api: "true"
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.48.0
        args:
        - --config.file=/etc/prometheus/prometheus.yml
        - --storage.tsdb.path=/prometheus
        - --storage.tsdb.min-block-duration=2h
        - --storage.tsdb.max-block-duration=2h
        - --web.enable-lifecycle
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: data
          mountPath: /prometheus
      - name: thanos-sidecar
        image: thanosio/thanos:v0.34.0
        args:
        - sidecar
        - --tsdb.path=/prometheus
        - --prometheus.url=http://localhost:9090
        - --objstore.config-file=/etc/thanos/bucket.yaml
        - --grpc-address=0.0.0.0:10901
        volumeMounts:
        - name: data
          mountPath: /prometheus
        - name: thanos-config
          mountPath: /etc/thanos
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: thanos-config
        secret:
          secretName: thanos-objstore-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 50Gi
```

Configure Prometheus to scrape Istio metrics with cluster-specific external labels:

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
      external_labels:
        cluster: cluster-a
        region: us-east-1
    scrape_configs:
    - job_name: envoy-stats
      metrics_path: /stats/prometheus
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: keep
        regex: istio-proxy
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
    - job_name: istiod
      kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names: [istio-system]
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: istiod;http-monitoring
```

**Deploy Thanos Query to aggregate across clusters:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thanos-query
  template:
    metadata:
      labels:
        app: thanos-query
    spec:
      containers:
      - name: thanos-query
        image: thanosio/thanos:v0.34.0
        args:
        - query
        - --http-address=0.0.0.0:9090
        - --grpc-address=0.0.0.0:10901
        - --store=dnssrv+_grpc._tcp.thanos-store-gateway.monitoring.svc
        - --store=prometheus-cluster-a.monitoring.svc:10901
        - --store=prometheus-cluster-b.monitoring.svc:10901
        - --query.replica-label=replica
        ports:
        - containerPort: 9090
          name: http
```

## Distributed Tracing with OpenTelemetry

For cross-cluster tracing, you need trace context to propagate across cluster boundaries. Istio supports this out of the box as long as your applications forward the tracing headers.

**Configure Istio for tracing in each cluster:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10.0
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        port: 4317
        service: otel-collector.observability.svc.cluster.local
```

**Deploy an OpenTelemetry Collector in each cluster:**

```yaml
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
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.91.0
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        volumeMounts:
        - name: config
          mountPath: /etc/otelcol-contrib
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
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
    processors:
      batch:
        timeout: 5s
        send_batch_size: 1000
      resource:
        attributes:
        - key: k8s.cluster.name
          value: cluster-a
          action: upsert
    exporters:
      otlp:
        endpoint: central-jaeger.example.com:4317
        tls:
          insecure: false
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, resource]
          exporters: [otlp]
```

**Enable the tracing provider in Istio's telemetry API:**

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 10.0
```

## Centralized Logging

Envoy access logs contain a wealth of information about every request. Collecting and centralizing them across clusters gives you another dimension of observability.

**Enable access logging in Istio:**

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

**Deploy Fluent Bit to ship logs to a central system:**

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.2
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: config
          mountPath: /fluent-bit/etc
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: config
        configMap:
          name: fluent-bit-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info

    [INPUT]
        Name              tail
        Path              /var/log/containers/*istio-proxy*.log
        Parser            docker
        Tag               istio.*
        Mem_Buf_Limit     5MB

    [FILTER]
        Name    modify
        Match   istio.*
        Add     cluster cluster-a

    [OUTPUT]
        Name            es
        Match           istio.*
        Host            elasticsearch.example.com
        Port            9200
        Index           istio-access-logs
        Type            _doc
```

## Building Grafana Dashboards

With all data flowing into centralized backends, build dashboards that show the cross-cluster picture:

```json
{
  "title": "Cross-Cluster Service Map",
  "panels": [
    {
      "title": "Request Rate by Cluster Pair",
      "targets": [
        {
          "expr": "sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m])) by (source_cluster, destination_cluster)",
          "legendFormat": "{{source_cluster}} -> {{destination_cluster}}"
        }
      ]
    },
    {
      "title": "Cross-Cluster P99 Latency",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{source_cluster!=destination_cluster}[5m])) by (le, source_cluster, destination_cluster))",
          "legendFormat": "{{source_cluster}} -> {{destination_cluster}}"
        }
      ]
    }
  ]
}
```

## Correlating Data Across Pillars

The real power comes from correlating metrics, traces, and logs. When you see a spike in cross-cluster error rates in your metrics dashboard:

1. Click through to see which services are affected
2. Use the trace ID from an error response to find the distributed trace
3. Use the trace ID to find the corresponding Envoy access log entries

Set up exemplars in Prometheus to link metrics to traces:

```yaml
global:
  scrape_interval: 15s
  external_labels:
    cluster: cluster-a
scrape_configs:
- job_name: envoy-stats
  metrics_path: /stats/prometheus
  enable_http2: true
```

Cross-cluster observability requires investment in infrastructure, but once running, it fundamentally changes how quickly you can understand and resolve issues in a multi-cluster Istio deployment. The key is making sure all three pillars (metrics, traces, logs) include cluster identification and can be queried from a single pane of glass.
