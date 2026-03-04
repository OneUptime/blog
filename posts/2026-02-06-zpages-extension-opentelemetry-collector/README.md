# How to Configure the zPages Extension in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Extensions, zPages, Debugging, Observability

Description: Learn how to configure and use the zPages extension in the OpenTelemetry Collector for real-time debugging and monitoring of telemetry pipelines with live trace sampling and aggregation views.

The zPages extension in the OpenTelemetry Collector provides a powerful debugging interface that allows you to inspect and troubleshoot your telemetry pipelines in real-time. Originally developed as part of the OpenCensus project, zPages offers browser-based views of spans and metrics without requiring external dependencies or backend systems.

## What is the zPages Extension?

The zPages extension exposes internal monitoring data from the OpenTelemetry Collector through a web interface. It provides insights into what traces are flowing through your collector, performance characteristics of your pipelines, and helps diagnose issues with trace sampling and processing. This makes it an invaluable tool during development, testing, and production troubleshooting.

Unlike traditional observability backends that require data export and storage, zPages operates entirely within the collector process, providing immediate visibility into telemetry data as it flows through the system.

## Key Features of zPages

The zPages extension offers several diagnostic pages:

**TracezZ Page**: Displays aggregated statistics about traces that have passed through the collector, including latency distributions and error counts. It samples traces across different latency buckets, allowing you to quickly identify slow operations.

**RpczZ Page**: Shows RPC statistics for services, including request counts, error rates, and latency percentiles. This is particularly useful for monitoring communication between services.

These pages update continuously, providing real-time insights into your telemetry pipeline's behavior and performance characteristics.

## Architecture Overview

Here's how the zPages extension integrates with the OpenTelemetry Collector:

```mermaid
graph LR
    A[Application] -->|Telemetry Data| B[Collector Receiver]
    B --> C[Processor Pipeline]
    C --> D[Exporter]
    E[zPages Extension] -.->|Monitors| C
    F[Browser] -->|HTTP Request| E
    E -->|HTML Response| F
    style E fill:#f9f,stroke:#333,stroke-width:2px
```

The zPages extension operates as a sidecar monitoring component, observing telemetry data as it flows through the collector's pipeline without interfering with data processing or export operations.

## Basic Configuration

To enable the zPages extension in your OpenTelemetry Collector, you need to define it in the extensions section and reference it in the service configuration.

Here's a minimal configuration that enables zPages on the default endpoint:

```yaml
# Basic zPages configuration
extensions:
  # Enable the zPages extension with default settings
  zpages:
    # The endpoint where zPages will be served
    # Default is localhost:55679
    endpoint: localhost:55679

# Receivers define how telemetry data enters the collector
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

# Processors transform telemetry data
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

# Exporters send telemetry data to backends
exporters:
  logging:
    loglevel: debug

# Service configuration ties everything together
service:
  # Extensions must be declared in the service section
  extensions: [zpages]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
```

After starting the collector with this configuration, you can access the zPages interface by navigating to `http://localhost:55679/debug/tracez` in your web browser.

## Advanced Configuration Options

The zPages extension supports several configuration options for customization:

```yaml
extensions:
  zpages:
    # Network endpoint for the zPages server
    # Use 0.0.0.0 to allow access from other machines
    endpoint: 0.0.0.0:55679

    # TLS configuration for secure access
    tls:
      # Path to the server certificate
      cert_file: /path/to/cert.pem
      # Path to the server private key
      key_file: /path/to/key.pem
      # Minimum TLS version (1.0, 1.1, 1.2, 1.3)
      min_version: "1.2"
      # Maximum TLS version
      max_version: "1.3"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Memory limiter prevents the collector from running out of memory
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

  # Batch processor reduces the number of outgoing requests
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: backend.example.com:4317
    tls:
      insecure: false

service:
  extensions: [zpages]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

## Production Configuration

For production environments, you should restrict access to zPages since it exposes internal telemetry data. Here's a production-ready configuration:

```yaml
extensions:
  zpages:
    # Bind to localhost only to prevent external access
    endpoint: 127.0.0.1:55679

    # Enable TLS for secure access
    tls:
      cert_file: /etc/otel/certs/zpages.crt
      key_file: /etc/otel/certs/zpages.key
      min_version: "1.2"
      # Require client certificates for mutual TLS
      client_ca_file: /etc/otel/certs/ca.crt

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls:
          cert_file: /etc/otel/certs/server.crt
          key_file: /etc/otel/certs/server.key

processors:
  # Memory limiter with conservative settings
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  # Batch processor for efficient export
  batch:
    timeout: 10s
    send_batch_size: 2048

  # Resource processor adds consistent metadata
  resource:
    attributes:
      - key: environment
        value: production
        action: upsert

exporters:
  otlp/backend:
    endpoint: backend.example.com:4317
    tls:
      insecure: false
      cert_file: /etc/otel/certs/client.crt
      key_file: /etc/otel/certs/client.key

  # Fallback logging exporter for troubleshooting
  logging:
    loglevel: info
    sampling_initial: 10
    sampling_thereafter: 100

service:
  extensions: [zpages]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp/backend, logging]
```

## Using the TracezZ Interface

Once zPages is running, access the TracezZ page at `http://localhost:55679/debug/tracez`. This page displays trace statistics organized by latency buckets:

**Latency Buckets**: Traces are automatically categorized into buckets (0-10ms, 10-100ms, 100ms-1s, 1s-10s, 10s+). This helps identify performance outliers quickly.

**Sample Traces**: Click on any latency bucket to view sample traces within that range. Each trace shows span names, durations, and attributes.

**Error Traces**: A dedicated section shows traces that encountered errors, making it easy to identify and diagnose failures.

**Active Spans**: View spans that are currently being processed by the collector, useful for detecting stuck or long-running operations.

## Integration with Kubernetes

When running the OpenTelemetry Collector in Kubernetes, you can expose zPages through a Service for internal debugging:

```yaml
extensions:
  zpages:
    # Bind to all interfaces for Kubernetes access
    endpoint: 0.0.0.0:55679

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: backend:4317

service:
  extensions: [zpages]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

Create a Kubernetes Service to access zPages:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: otel-collector-zpages
  namespace: observability
spec:
  selector:
    app: otel-collector
  ports:
    - name: zpages
      port: 55679
      targetPort: 55679
  type: ClusterIP
```

Then use kubectl port-forward to access zPages from your local machine:

```bash
kubectl port-forward -n observability svc/otel-collector-zpages 55679:55679
```

## Troubleshooting Common Issues

**zPages Not Accessible**: Verify that the endpoint is correctly configured and that no firewall rules block the port. Check collector logs for binding errors.

**No Traces Visible**: Ensure that traces are actually flowing through the collector by checking your receivers and that the pipeline is correctly configured. The TracezZ page only shows data that passes through the collector.

**High Memory Usage**: zPages samples and stores trace data in memory. If you process high volumes of traces, consider adjusting sampling rates or increasing collector memory limits.

## Best Practices

Use zPages as a debugging tool during development and troubleshooting, but avoid relying on it as a primary monitoring solution. For production monitoring, export telemetry data to dedicated observability backends.

Restrict zPages access in production environments by binding to localhost or using mutual TLS authentication. The interface exposes sensitive telemetry data that could reveal application internals.

Combine zPages with other collector extensions like the health check extension and pprof extension for comprehensive collector observability.

## Related Resources

For more information about OpenTelemetry Collector extensions, check out these related posts:

- [How to Configure Bearer Token Auth Extension in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-bearer-token-auth-extension-opentelemetry-collector/view)
- [How to Configure Basic Auth Extension in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-basic-auth-extension-opentelemetry-collector/view)

The zPages extension provides an essential debugging capability for OpenTelemetry Collector deployments. By offering real-time visibility into trace processing and pipeline performance, it helps teams quickly identify and resolve issues without requiring external tools or complex setup procedures.
