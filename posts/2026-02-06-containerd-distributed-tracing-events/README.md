# How to Enable OpenTelemetry Distributed Tracing in containerd for Container Create, Start, and Stop Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, containerd, Distributed Tracing, Container Events

Description: Enable built-in OpenTelemetry distributed tracing in containerd to trace container create, start, and stop operations with OTLP export.

containerd has built-in support for OpenTelemetry tracing. When enabled, it generates spans for container lifecycle operations like create, start, stop, and delete. These traces show you exactly where time is spent during container operations, making it easier to diagnose slow container starts or failing operations.

## Enabling Tracing in containerd

containerd supports OpenTelemetry tracing through its configuration file. Edit `/etc/containerd/config.toml`:

```toml
# /etc/containerd/config.toml
version = 2

# Enable OpenTelemetry tracing
[plugins."io.containerd.tracing.processor.v1.otlp"]
  endpoint = "localhost:4317"
  protocol = "grpc"
  insecure = true

[plugins."io.containerd.internal.v1.tracing"]
  sampling_ratio = 1.0
  service_name = "containerd"
```

The `sampling_ratio` of 1.0 traces every operation. In production, lower this to 0.1 or 0.01 to reduce overhead.

Restart containerd to apply the changes:

```bash
sudo systemctl restart containerd
```

## Setting Up the Collector to Receive Traces

The Collector needs an OTLP receiver on the endpoint containerd is configured to use:

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

  # Add resource attributes for identification
  resource:
    attributes:
      - key: service.name
        value: containerd
        action: upsert
      - key: host.name
        from_attribute: ""
        action: upsert
        value: "node-01"

exporters:
  otlp:
    endpoint: "your-tracing-backend:4317"
    tls:
      insecure: false

  # Use logging exporter to see traces in stdout during testing
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp, logging]
```

## What Gets Traced

With tracing enabled, containerd creates spans for these operations:

### Container Create
When you run `ctr container create` or an orchestrator creates a container, containerd generates spans for:
- Image resolution and unpacking
- Snapshot preparation
- Container metadata creation
- Network namespace setup

### Container Start
Starting a container produces spans for:
- Process creation via the shim
- Rootfs mount operations
- Container process initialization

### Container Stop
Stopping generates spans for:
- Signal delivery to the container process
- Grace period wait
- Process cleanup
- Resource deallocation

## Viewing the Traces

After starting a container, check the Collector logs for trace data:

```bash
# Create and start a container to generate traces
sudo ctr image pull docker.io/library/alpine:latest
sudo ctr run --rm docker.io/library/alpine:latest test-container echo "hello"
```

If you are using the logging exporter, you will see span data in the Collector output:

```
Span #0
    Trace ID       : abc123def456...
    Span ID        : 1234567890ab
    Name           : containerd.services.containers.v1.Create
    Start          : 2026-02-06 10:00:00.000
    End            : 2026-02-06 10:00:00.150
    Status         : Ok
```

## Correlating with Application Traces

To get end-to-end tracing from your orchestrator through containerd to the application, propagate trace context. In Kubernetes, the kubelet passes trace context to containerd:

```yaml
# kubelet configuration to enable tracing
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
tracing:
  endpoint: "localhost:4317"
  samplingRatePerMillion: 1000000
```

This creates a connected trace that shows: API server request -> kubelet -> containerd -> container start -> application ready.

## Filtering and Sampling

In production, you do not want to trace every container operation. Use the Collector's tail sampling processor:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      # Always trace operations that take longer than 2 seconds
      - name: slow-operations
        type: latency
        latency:
          threshold_ms: 2000
      # Always trace errors
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Sample 10% of everything else
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp]
```

This keeps all slow operations and errors while sampling routine operations at 10%.

## Debugging Slow Container Starts

One practical use case is diagnosing slow container starts. The trace will show which phase takes the longest:

```
containerd.services.containers.v1.Create     [50ms]
  containerd.services.snapshots.v1.Prepare   [30ms]
  containerd.services.content.v1.Read        [15ms]
containerd.runtime.v2.task.Create            [200ms]
  runtime.mount                              [150ms]  <-- slow mount
  runtime.create_process                     [40ms]
```

In this example, the filesystem mount takes 150ms, suggesting a storage performance issue. Without tracing, you would only see that the container took 250ms to start without knowing why.

## Monitoring Trace Volume

containerd can produce a significant volume of trace data, especially on busy nodes. Monitor the Collector itself to make sure it can keep up:

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: "otel-collector"
          scrape_interval: 15s
          static_configs:
            - targets: ["localhost:8888"]
```

Watch `otelcol_receiver_accepted_spans` and `otelcol_exporter_sent_spans` to verify no data is being dropped.

## Summary

containerd's built-in OpenTelemetry tracing gives you detailed visibility into container lifecycle operations. Enable it in the containerd config, point it at your Collector, and you get spans for every create, start, stop, and delete operation. Use tail sampling in production to keep trace volume manageable while still capturing slow operations and errors.
