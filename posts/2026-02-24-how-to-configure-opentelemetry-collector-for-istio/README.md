# How to Configure OpenTelemetry Collector for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry Collector, Observability, Kubernetes, Telemetry Pipeline

Description: A detailed guide to configuring the OpenTelemetry Collector to receive, process, and export telemetry data from an Istio service mesh.

---

The OpenTelemetry Collector is the central piece of any OpenTelemetry-based observability pipeline. For Istio users, it sits between the mesh's telemetry output and your observability backends. Getting the collector configuration right is important because it determines how your metrics, traces, and logs are received, transformed, and delivered. This post walks through a production-ready collector setup specifically optimized for Istio telemetry.

## Collector Architecture

The collector has four main components:

- **Receivers** - accept telemetry data from various sources
- **Processors** - transform, filter, or enrich data as it passes through
- **Exporters** - send data to backends
- **Pipelines** - connect receivers, processors, and exporters together

For Istio, you typically need to handle three types of data: traces from the Envoy proxies, metrics from Prometheus endpoints, and access logs from the sidecar containers.

## Deployment Strategy

There are two main patterns for deploying the collector:

**Gateway mode** - a centralized deployment that all proxies send to:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-gateway
  namespace: istio-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
      mode: gateway
  template:
    metadata:
      labels:
        app: otel-collector
        mode: gateway
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.96.0
        args: ["--config=/etc/otel/config.yaml"]
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
        - containerPort: 8889
          name: prometheus
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

**Agent mode** - a DaemonSet that runs on every node, reducing network hops:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector-agent
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: otel-collector
      mode: agent
  template:
    metadata:
      labels:
        app: otel-collector
        mode: agent
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.96.0
        args: ["--config=/etc/otel/config.yaml"]
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        ports:
        - containerPort: 4317
          name: otlp-grpc
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-agent-config
```

For most Istio deployments, the gateway mode with 2-3 replicas works well. Switch to agent mode when you have very high telemetry volumes or need to reduce network traversal.

## Complete Collector Configuration

Here is a production-grade configuration for collecting all Istio telemetry:

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
            max_recv_msg_size_mib: 4
          http:
            endpoint: 0.0.0.0:4318

      prometheus:
        config:
          scrape_configs:
          - job_name: 'istiod'
            kubernetes_sd_configs:
            - role: pod
              namespaces:
                names: [istio-system]
            relabel_configs:
            - source_labels: [__meta_kubernetes_pod_label_app]
              action: keep
              regex: istiod
            - source_labels: [__address__]
              action: replace
              target_label: __address__
              regex: ([^:]+)(?::\d+)?
              replacement: ${1}:15014

          - job_name: 'istio-proxies'
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
              replacement: ${1}:15020
              target_label: __address__
            metric_relabel_configs:
            - source_labels: [__name__]
              action: keep
              regex: istio_.*

    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
        send_batch_max_size: 2048

      memory_limiter:
        check_interval: 5s
        limit_mib: 1536
        spike_limit_mib: 512

      resource:
        attributes:
        - key: cluster
          value: "production-us-east-1"
          action: upsert
        - key: mesh
          value: "istio"
          action: upsert

      filter/traces:
        traces:
          span:
          - 'attributes["http.target"] == "/healthz"'
          - 'attributes["http.target"] == "/ready"'

      attributes/cleanup:
        actions:
        - key: source_principal
          action: delete
        - key: destination_principal
          action: delete

    exporters:
      debug:
        verbosity: basic

      otlp/traces:
        endpoint: "tempo.monitoring:4317"
        tls:
          insecure: true
        retry_on_failure:
          enabled: true
          initial_interval: 5s
          max_interval: 30s
          max_elapsed_time: 300s

      prometheus:
        endpoint: "0.0.0.0:8889"
        resource_to_telemetry_conversion:
          enabled: true

    extensions:
      health_check:
        endpoint: 0.0.0.0:13133
      zpages:
        endpoint: 0.0.0.0:55679

    service:
      extensions: [health_check, zpages]
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, filter/traces, resource, batch]
          exporters: [otlp/traces, debug]
        metrics:
          receivers: [otlp, prometheus]
          processors: [memory_limiter, attributes/cleanup, resource, batch]
          exporters: [prometheus]
```

## Key Receiver Configuration

**OTLP Receiver** - handles trace and metric data pushed from Istio proxies:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 4
        keepalive:
          server_parameters:
            max_connection_age: 60s
            max_connection_age_grace: 5s
```

The `max_recv_msg_size_mib` setting prevents huge payloads from overwhelming the collector. The keepalive settings help with connection management when proxies reconnect after restarts.

**Prometheus Receiver** - scrapes metrics from Istio components and sidecars. This is the most common way to collect Istio metrics through the collector.

## Essential Processors

**Memory limiter** should always be first in the pipeline:

```yaml
processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 1536
    spike_limit_mib: 512
```

This prevents the collector from running out of memory under high load. When the limit is hit, the collector starts dropping data rather than crashing.

**Batch processor** should always be last before exporters:

```yaml
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048
```

Batching reduces the number of export calls and improves throughput.

**Filter processor** removes noise:

```yaml
processors:
  filter/health-checks:
    traces:
      span:
      - 'attributes["http.target"] == "/healthz"'
      - 'attributes["http.target"] == "/ready"'
      - 'attributes["http.target"] == "/metrics"'
```

Health check spans add noise without much value. Filtering them at the collector keeps your trace storage clean.

## Service and Connector Configuration

Create the Service that Istio proxies will connect to:

```yaml
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
    targetPort: 4317
  - port: 4318
    name: otlp-http
    targetPort: 4318
  - port: 8889
    name: prometheus
    targetPort: 8889
  - port: 13133
    name: health
    targetPort: 13133
```

## Monitoring the Collector Itself

The collector exposes its own metrics. Scrape them with Prometheus:

```yaml
scrape_configs:
- job_name: 'otel-collector'
  static_configs:
  - targets: ['otel-collector.istio-system:8888']
```

Key collector metrics to watch:

```promql
# Data received
rate(otelcol_receiver_accepted_spans[5m])
rate(otelcol_receiver_accepted_metric_points[5m])

# Data exported
rate(otelcol_exporter_sent_spans[5m])
rate(otelcol_exporter_sent_metric_points[5m])

# Failures
rate(otelcol_exporter_send_failed_spans[5m])
rate(otelcol_receiver_refused_spans[5m])

# Queue pressure
otelcol_exporter_queue_size
otelcol_exporter_queue_capacity
```

## Scaling Considerations

For high-traffic meshes, consider:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-collector-hpa
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-collector-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
```

## Troubleshooting

```bash
# Check collector health
kubectl exec -n istio-system -l app=otel-collector -- curl -s localhost:13133

# View zpages for pipeline status
kubectl port-forward -n istio-system svc/otel-collector 55679:55679
# Open http://localhost:55679/debug/tracez

# Check for configuration errors
kubectl logs -n istio-system -l app=otel-collector | grep -i error

# Validate configuration locally
otelcol-contrib validate --config=config.yaml
```

The OpenTelemetry Collector is the glue between Istio's telemetry output and your observability stack. A well-configured collector handles the heavy lifting of receiving, filtering, transforming, and routing data so your backends get clean, relevant telemetry without being overwhelmed by noise or volume.
