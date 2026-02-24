# How to Configure OpenTelemetry Integration with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Observability, Tracing, Metrics, Kubernetes

Description: A complete guide to integrating OpenTelemetry with Istio for unified metrics, traces, and telemetry collection across your service mesh.

---

OpenTelemetry has become the standard for observability instrumentation. It provides a unified framework for collecting metrics, traces, and logs from applications and infrastructure. Istio generates rich telemetry data from every request flowing through the mesh, and integrating it with OpenTelemetry gives you a single pipeline for all your observability data. This post walks through setting up the integration from scratch.

## Why OpenTelemetry with Istio?

Istio has historically used its own telemetry pipeline. Metrics went to Prometheus, traces went to Jaeger or Zipkin, and access logs went to stdout. This worked, but it meant maintaining multiple telemetry backends and dealing with different data formats.

OpenTelemetry unifies this. Instead of separate pipelines, you get:

- A single collector that handles metrics, traces, and logs
- Standard OTLP protocol for data export
- Vendor-neutral format that works with any backend
- Better correlation between signals (connecting traces to metrics to logs)

## Setting Up the OpenTelemetry Collector

First, deploy the OpenTelemetry Collector in your cluster. It acts as the central hub for receiving, processing, and exporting telemetry data:

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
    processors:
      batch:
        timeout: 10s
        send_batch_size: 1024
      memory_limiter:
        check_interval: 5s
        limit_mib: 512
        spike_limit_mib: 128
    exporters:
      debug:
        verbosity: detailed
      prometheus:
        endpoint: "0.0.0.0:8889"
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [debug]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [prometheus]
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
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.96.0
        args:
        - --config=/etc/otel/config.yaml
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
    targetPort: 4317
  - port: 4318
    name: otlp-http
    targetPort: 4318
  - port: 8889
    name: prometheus
    targetPort: 8889
```

```bash
kubectl apply -f otel-collector.yaml
```

## Configuring Istio to Send Traces via OpenTelemetry

Configure Istio to export traces using the OpenTelemetry protocol:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel-tracing
```

```bash
istioctl install -f istio-otel.yaml
```

This tells Istio to send trace spans to the OpenTelemetry Collector using gRPC on port 4317.

## Configuring Trace Sampling

You don't want to trace every single request in production. Configure sampling:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel-tracing
```

The `sampling` value is a percentage (1.0 means 1% of requests get traced). For development, you might set it to 100.0 to trace everything. For production, 0.1 to 1.0 is typical.

## Using Telemetry API for Fine-Grained Control

Istio's Telemetry API gives you per-namespace and per-workload control:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 1.0
```

Override for a specific namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tracing-config
  namespace: production
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 0.1
```

Override for a specific workload:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-tracing
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 10.0
```

This lets you trace critical services like payment processing at a higher rate than less important services.

## Configuring Metrics Export via OpenTelemetry

Istio can also export its metrics through the OpenTelemetry pipeline:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
    - name: otel-metrics
      prometheus:
        scrape: true
    defaultProviders:
      tracing:
      - otel-tracing
```

For a full OpenTelemetry metrics pipeline, you can configure the collector to scrape Istio's Prometheus metrics and export them to your preferred backend. Add this to the collector config:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
  prometheus:
    config:
      scrape_configs:
      - job_name: 'istio-mesh'
        kubernetes_sd_configs:
        - role: pod
        relabel_configs:
        - source_labels: [__meta_kubernetes_pod_container_name]
          action: keep
          regex: istio-proxy
        - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
          action: replace
          target_label: __address__
          regex: (.+)
          replacement: ${1}:15020
```

## Verifying the Integration

Check that telemetry is flowing:

```bash
# Verify the collector is running
kubectl get pods -n istio-system -l app=otel-collector

# Check collector logs for received data
kubectl logs -n istio-system -l app=otel-collector --tail=50

# Generate some traffic
kubectl run test-client --image=curlimages/curl:7.85.0 --command -- sh -c "while true; do curl -s http://my-service; sleep 1; done"

# Check Envoy stats for trace export
POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD -c istio-proxy -- pilot-agent request GET /stats | grep tracing
```

## Adding Custom Trace Tags

Add custom tags to the spans generated by Istio:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-tags
  namespace: default
spec:
  tracing:
  - providers:
    - name: otel-tracing
    customTags:
      environment:
        literal:
          value: "production"
      request_id:
        header:
          name: x-request-id
      my_app_version:
        environment:
          name: APP_VERSION
          defaultValue: "unknown"
```

Custom tags can come from:
- `literal` - a fixed value
- `header` - extracted from an HTTP request header
- `environment` - taken from an environment variable on the proxy

## Access Logging via OpenTelemetry

You can also send access logs through the OpenTelemetry pipeline:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
    - name: otel-access-log
      envoyOtelAls:
        service: otel-collector.istio-system.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel-tracing
      accessLogging:
      - otel-access-log
```

The `envoyOtelAls` provider uses Envoy's native OpenTelemetry Access Log Service to stream access logs to the collector.

## Troubleshooting

Common issues and how to fix them:

```bash
# Check if the extension provider is configured
istioctl analyze

# Verify the proxy can reach the collector
kubectl exec $POD -c istio-proxy -- curl -v otel-collector.istio-system:4317

# Check for trace spans in the collector output
kubectl logs -n istio-system -l app=otel-collector | grep "Span"

# Verify the Telemetry resource is applied
kubectl get telemetry -A
```

If traces aren't appearing, the most common causes are:
- The collector service name is wrong in the Istio configuration
- Port mismatch between the provider configuration and the collector
- Sampling rate is set to 0
- The pod needs to be restarted after changing mesh configuration

OpenTelemetry integration with Istio gives you a modern, vendor-neutral observability pipeline. It takes a bit more setup than the built-in Prometheus/Jaeger stack, but the benefits of a unified pipeline and standard protocol pay off as your mesh and observability needs grow.
