# How to Monitor CRI-O Container Runtime gRPC Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CRI-O, GRPC Tracing, Kubernetes

Description: Enable OpenTelemetry tracing for CRI-O gRPC calls to monitor container runtime operations and export traces to your observability backend.

CRI-O communicates with the kubelet through gRPC calls defined by the Container Runtime Interface (CRI). Each container operation (pull image, create sandbox, start container, stop container) is a gRPC method call. By enabling OpenTelemetry tracing in CRI-O, you can see exactly how long each runtime operation takes and identify bottlenecks.

## Enabling OpenTelemetry Tracing in CRI-O

CRI-O supports OpenTelemetry tracing natively. Configure it in the CRI-O configuration file at `/etc/crio/crio.conf` or `/etc/crio/crio.conf.d/`:

```toml
# /etc/crio/crio.conf.d/10-tracing.conf

[crio.tracing]
# Enable OpenTelemetry tracing
enable_tracing = true

# OTLP gRPC endpoint for the Collector
tracing_endpoint = "localhost:4317"

# Samples to collect per million spans
# 1000000 traces everything, 100000 traces 10% of operations
tracing_sampling_rate_per_million = 1000000
```

Restart CRI-O to apply:

```bash
sudo systemctl restart crio
```

## Setting Up the Collector

Configure the Collector to receive CRI-O traces:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 256

  # Filter out noisy low-value spans
  filter:
    error_mode: ignore
    trace_conditions:
      # Exclude health check spans
      - 'IsMatch(span.name, ".*HealthCheck.*")'

  resource:
    attributes:
      - key: k8s.node.name
        value: "worker-01"
        action: upsert

exporters:
  otlp:
    endpoint: "your-tracing-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter, resource, batch]
      exporters: [otlp]
```

## Understanding CRI-O gRPC Spans

With tracing enabled, CRI-O produces spans for every CRI gRPC method. Here are the key operations:

### Pod Sandbox Operations
```text
runtime.v1.RuntimeService/RunPodSandbox     - Create a new pod sandbox
runtime.v1.RuntimeService/StopPodSandbox    - Stop a running sandbox
runtime.v1.RuntimeService/RemovePodSandbox  - Remove a stopped sandbox
```

### Container Operations
```text
runtime.v1.RuntimeService/CreateContainer   - Create a container in a sandbox
runtime.v1.RuntimeService/StartContainer    - Start a created container
runtime.v1.RuntimeService/StopContainer     - Stop a running container
runtime.v1.RuntimeService/RemoveContainer   - Remove a stopped container
```

### Image Operations
```text
runtime.v1.ImageService/PullImage           - Pull a container image
runtime.v1.ImageService/ListImages          - List available images
runtime.v1.ImageService/ImageStatus         - Get image status
```

## Analyzing Container Start Latency

A typical pod start trace shows the full chain of operations:

```text
RunPodSandbox                          [total: 450ms]
  setup_network                        [200ms]
  create_sandbox_container             [50ms]
  start_sandbox_container              [100ms]
CreateContainer                        [80ms]
  pull_image (if not cached)           [varies]
  create_rootfs                        [30ms]
  write_config                         [5ms]
StartContainer                         [120ms]
  mount_rootfs                         [40ms]
  start_process                        [60ms]
  post_start_hooks                     [20ms]
```

If network setup consistently takes 200ms, that points to a CNI plugin performance issue. If image pulls are slow, it suggests registry latency or missing image caches.

## Correlating with Kubernetes Traces

Kubernetes 1.27+ supports system component tracing in beta, and kubelet tracing is stable in Kubernetes 1.34+. When all layers are instrumented, you get an end-to-end trace:

```text
kubectl apply -> API Server -> Scheduler -> Kubelet -> CRI-O
```

To enable this correlation, make sure the kubelet passes trace context to CRI-O:

```yaml
# kubelet config
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
tracing:
  endpoint: "localhost:4317"
  samplingRatePerMillion: 1000000
```

The trace context propagates through the gRPC metadata, creating connected spans from the API server down to the container runtime.

## Monitoring CRI-O Metrics Alongside Traces

CRI-O also exposes Prometheus metrics when metrics are enabled:

```toml
# /etc/crio/crio.conf.d/20-metrics.conf
[crio.metrics]
enable_metrics = true
```

Collect both traces and metrics for full visibility:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

  prometheus/crio:
    config:
      scrape_configs:
        - job_name: "crio"
          scrape_interval: 15s
          static_configs:
            - targets: ["localhost:9090"]
          metrics_path: /metrics

processors:
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    metrics:
      receivers: [prometheus/crio]
      processors: [batch]
      exporters: [otlp]
```

Key CRI-O metrics to watch:

```text
# Operation latency
crio_operations_latency_seconds{operation="CreateContainer"}
crio_operations_latency_seconds{operation="StartContainer"}

# Operation error counts
crio_operations_errors_total{operation="CreateContainer"}

# Image pull data
crio_image_pulls_layer_size_bucket
crio_image_pulls_success_total
crio_image_pulls_failure_total
```

## Production Sampling Strategy

Tracing every CRI-O operation in production generates significant data. Use a sensible sampling strategy:

```toml
# /etc/crio/crio.conf.d/10-tracing.conf
[crio.tracing]
enable_tracing = true
tracing_endpoint = "localhost:4317"
# Export all spans so the Collector can keep slow and error traces
tracing_sampling_rate_per_million = 1000000
```

Then use tail sampling in the Collector to keep interesting traces:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: slow-operations
        type: latency
        latency:
          threshold_ms: 5000
      - name: errors
        type: status_code
        status_codes: [ERROR]
      - name: routine-sample
        type: probabilistic
        probabilistic:
          sampling_percentage: 1
```

This captures all slow operations (over 5 seconds) and all errors, while sampling routine operations at 1%. If you lower `tracing_sampling_rate_per_million` at the CRI-O source instead, the Collector can only make tail-sampling decisions for traces CRI-O already exported.

## Summary

CRI-O's built-in OpenTelemetry tracing exposes the full lifecycle of container operations as distributed traces. Enable it in the CRI-O config, point it at your Collector, and you can analyze exactly where time is spent in pod sandbox creation, container starts, and image pulls. Combined with Kubernetes API server and kubelet tracing, you get end-to-end visibility from `kubectl apply` to container process start.
