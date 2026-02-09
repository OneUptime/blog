# How to Configure the OTLP/gRPC Exporter with Retry Policies, Backoff, and Timeout for Resilient Telemetry Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, gRPC Exporter, Retry Policies

Description: Configure the OTLP gRPC exporter with retry policies, exponential backoff, and timeouts to ensure telemetry data reaches your backend reliably.

The OTLP/gRPC exporter is the most common way to send telemetry from your application to an OpenTelemetry Collector or a backend that supports OTLP. But network failures happen, backends go down temporarily, and connections drop. Without proper retry configuration, you lose telemetry data during these windows. This post covers how to configure the exporter for production resilience.

## Default Behavior

By default, the OTLP/gRPC exporter will:
- Connect to `localhost:4317`
- Use a 10-second timeout per export
- Retry on transient failures with limited attempts
- Use TLS if configured, insecure otherwise

For production, you want to be explicit about every setting.

## Go Configuration

```go
package main

import (
    "context"
    "time"

    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials"
    "google.golang.org/grpc/keepalive"
)

func createExporter() (trace.SpanExporter, error) {
    // Configure the OTLP gRPC exporter with all production settings
    exporter, err := otlptracegrpc.New(
        context.Background(),

        // Endpoint (without scheme for gRPC)
        otlptracegrpc.WithEndpoint("otel-collector.prod.svc.cluster.local:4317"),

        // TLS configuration
        otlptracegrpc.WithTLSCredentials(
            credentials.NewClientTLSFromCert(nil, ""),
        ),

        // Timeout for each export batch
        otlptracegrpc.WithTimeout(30*time.Second),

        // Retry configuration
        otlptracegrpc.WithRetry(otlptracegrpc.RetryConfig{
            // Whether retries are enabled
            Enabled: true,

            // Initial delay before the first retry
            InitialInterval: 500 * time.Millisecond,

            // Maximum delay between retries
            MaxInterval: 5 * time.Second,

            // Maximum total time spent retrying
            MaxElapsedTime: 30 * time.Second,
        }),

        // Additional gRPC dial options
        otlptracegrpc.WithDialOption(
            // Keep-alive to detect dead connections
            grpc.WithKeepaliveParams(keepalive.ClientParameters{
                Time:                10 * time.Second,
                Timeout:             3 * time.Second,
                PermitWithoutStream: true,
            }),

            // Set the maximum message size (default is 4MB)
            grpc.WithDefaultCallOptions(
                grpc.MaxCallSendMsgSize(16*1024*1024), // 16MB
            ),
        ),

        // Compression to reduce bandwidth
        otlptracegrpc.WithCompressor("gzip"),

        // Custom headers for authentication
        otlptracegrpc.WithHeaders(map[string]string{
            "x-api-key": "your-api-key-here",
        }),
    )

    return exporter, err
}
```

## Configuring the Batch Span Processor

The exporter works with a batch processor. Configure the batch processor to control how spans are buffered and exported:

```go
func createTracerProvider(exporter trace.SpanExporter) *trace.TracerProvider {
    return trace.NewTracerProvider(
        trace.WithBatcher(exporter,
            // Maximum number of spans in a single batch
            trace.WithMaxExportBatchSize(512),

            // Maximum time to wait before exporting a batch
            trace.WithBatchTimeout(5*time.Second),

            // Maximum number of spans that can be queued
            // If the queue is full, new spans are dropped
            trace.WithMaxQueueSize(8192),

            // Time to wait for export to complete during shutdown
            trace.WithExportTimeout(30*time.Second),
        ),
    )
}
```

## Python Configuration

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace import TracerProvider

# Configure the exporter
exporter = OTLPSpanExporter(
    # The gRPC endpoint
    endpoint="otel-collector.prod.svc.cluster.local:4317",

    # Timeout in seconds for each export
    timeout=30,

    # Headers for authentication
    headers=(("x-api-key", "your-api-key-here"),),

    # Use TLS (set to True for insecure, False uses system certs)
    insecure=False,

    # Compression
    compression=Compression.Gzip,
)

# Configure the batch processor
processor = BatchSpanProcessor(
    exporter,
    # Maximum batch size
    max_export_batch_size=512,

    # Schedule delay in milliseconds
    schedule_delay_millis=5000,

    # Maximum queue size
    max_queue_size=8192,

    # Export timeout in milliseconds
    export_timeout_millis=30000,
)

provider = TracerProvider()
provider.add_span_processor(processor)
```

## Environment Variable Configuration

You can also configure the exporter through environment variables, which is useful for container deployments:

```bash
# Endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otel-collector.prod.svc.cluster.local:4317"

# Protocol (grpc or http/protobuf)
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"

# Timeout in milliseconds
export OTEL_EXPORTER_OTLP_TIMEOUT=30000

# Headers (comma-separated key=value pairs)
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=your-api-key-here"

# Compression
export OTEL_EXPORTER_OTLP_COMPRESSION="gzip"

# TLS certificate
export OTEL_EXPORTER_OTLP_CERTIFICATE="/etc/certs/ca.pem"

# Batch processor settings
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512
export OTEL_BSP_SCHEDULE_DELAY=5000
export OTEL_BSP_MAX_QUEUE_SIZE=8192
export OTEL_BSP_EXPORT_TIMEOUT=30000
```

## Collector-Side Configuration

On the Collector side, configure the OTLP gRPC receiver to handle retries gracefully:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
        keepalive:
          server_parameters:
            max_connection_idle: 60s
            max_connection_age: 300s
            max_connection_age_grace: 60s
            time: 30s
            timeout: 10s
          enforcement_policy:
            min_time: 5s
            permit_without_stream: true
```

## Testing Retry Behavior

You can verify your retry configuration by temporarily pointing the exporter at a non-existent endpoint and checking the logs:

```go
// Use a debug logger to see retry attempts
import "go.opentelemetry.io/otel/sdk/trace"

// The exporter will log retry attempts at debug level
// Look for messages like:
// "Transient error, retrying in 500ms..."
// "Transient error, retrying in 1s..."
// "Export failed after all retries"
```

Getting the retry and timeout configuration right means the difference between losing telemetry data during a brief network hiccup and seamlessly recovering. Set your initial interval low enough for quick recovery, your max elapsed time high enough to survive real outages, and your queue size large enough to buffer during retry windows.
