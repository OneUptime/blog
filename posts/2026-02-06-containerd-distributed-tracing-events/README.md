# How to Enable OpenTelemetry Distributed Tracing in containerd for Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Containerd, Distributed Tracing, Container Events

Description: Enable built-in OpenTelemetry distributed tracing in containerd to trace container create, start, and stop operations with OTLP export.

containerd has built-in support for OpenTelemetry tracing. When enabled, it generates spans for containerd's gRPC calls and manually instrumented CRI operations like create, start, stop, and delete. These traces show you where time is spent during container operations, making it easier to diagnose slow container starts or failing operations.

## Enabling Tracing in containerd

containerd supports OpenTelemetry tracing through its OTLP tracing processor and OpenTelemetry environment variables. Edit `/etc/containerd/config.toml` to point the tracing processor at your Collector:

```toml
# /etc/containerd/config.toml

version = 2

# Enable OpenTelemetry tracing
[plugins."io.containerd.tracing.processor.v1.otlp"]
  endpoint = "localhost:4317"
  protocol = "grpc"
  insecure = true
```

Configure the service name and sampling rate in the containerd daemon's environment. For a systemd-managed containerd service, add a drop-in such as `/etc/systemd/system/containerd.service.d/otel.conf`:

```text
[Service]
Environment="OTEL_SERVICE_NAME=containerd"
Environment="OTEL_TRACES_SAMPLER=traceidratio"
Environment="OTEL_TRACES_SAMPLER_ARG=1.0"
```

The `OTEL_TRACES_SAMPLER_ARG` value of 1.0 traces every operation when `OTEL_TRACES_SAMPLER` is `traceidratio`. In production, lower this to 0.1 or 0.01 to reduce overhead.

Restart containerd to apply the changes:

```bash
sudo systemctl daemon-reload
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
        value: "node-01"
        action: upsert

exporters:
  otlp:
    endpoint: "your-tracing-backend:4317"
    tls:
      insecure: false

  # Use debug exporter to see traces in stdout during testing
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp, debug]
```

## What Gets Traced

With tracing enabled, containerd creates spans for these operations:

### Container Create
When you run `ctr container create` or an orchestrator creates a container, containerd generates spans for:
- gRPC calls made by the client or orchestrator
- Snapshot preparation when the runtime path prepares a snapshot
- Container metadata creation
- CRI create operations when containerd is used through Kubernetes

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

If you are using the debug exporter with `verbosity: detailed`, you will see span data in the Collector output:

```text
Span #0
    Trace ID       : abc123def456...
    Span ID        : 1234567890ab
    Name           : pkg.cri.sbserver.CreateContainer
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

One practical use case is diagnosing slow container starts. The trace can show which containerd or CRI phase takes the longest:

```text
pkg.cri.sbserver.CreateContainer             [50ms]
  /containerd.services.snapshots.v1.Snapshots/Prepare [30ms]
  /containerd.services.content.v1.Content/Read         [15ms]
pkg.cri.sbserver.StartContainer              [200ms]
  /containerd.tasks.v1.Tasks/Create          [150ms]  <-- slow runtime create
  /containerd.tasks.v1.Tasks/Start           [40ms]
```

In this example, the runtime create call takes 150ms, suggesting a runtime or storage performance issue. Without tracing, you would only see that the container took 250ms to start without knowing why.

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

Watch `otelcol_receiver_accepted_spans`, `otelcol_receiver_refused_spans`, `otelcol_exporter_sent_spans`, and `otelcol_exporter_send_failed_spans` to verify data is flowing. When scraped through Prometheus, these counter names may also have a `_total` suffix.

## Summary

containerd's built-in OpenTelemetry tracing gives you visibility into container lifecycle operations. Enable the OTLP tracing processor, set the OpenTelemetry environment variables, point it at your Collector, and you get spans for containerd gRPC calls and manually instrumented CRI operations. Use tail sampling in production to keep trace volume manageable while still capturing slow operations and errors.
