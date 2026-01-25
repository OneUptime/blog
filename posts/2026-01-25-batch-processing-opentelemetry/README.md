# How to Implement Batch Processing in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Batch Processing, Performance, Collector, Telemetry, Optimization, Throughput

Description: Learn how to configure batch processing in OpenTelemetry for optimal throughput, reduced network overhead, and efficient telemetry export.

---

Sending telemetry data one span or metric at a time wastes network resources and overwhelms backends. Batch processing groups telemetry into larger payloads before export, reducing network calls and improving throughput. This guide covers batch processing configuration in both the OpenTelemetry Collector and application SDKs.

## Why Batch Processing Matters

Consider a service handling 10,000 requests per second. Without batching, each request generates at least one span, resulting in 10,000 export calls per second. With batching, you might send 10 batches of 1,000 spans each, reducing export calls by 99.9%.

Benefits of batching:
- Reduced network overhead (fewer TCP connections, less TLS handshake overhead)
- Better compression ratios (larger payloads compress more efficiently)
- Lower backend load (fewer API calls to process)
- Improved error handling (retry one batch instead of thousands of individual items)

## Batch Processor in the Collector

The batch processor in the OpenTelemetry Collector groups telemetry data before sending to exporters.

### Basic Configuration

```yaml
processors:
  batch:
    # Send a batch when it reaches this size
    send_batch_size: 1024

    # Never exceed this size (hard limit)
    send_batch_max_size: 2048

    # Send whatever we have after this timeout
    timeout: 5s
```

The processor sends a batch when either condition is met:
1. Batch reaches `send_batch_size` items
2. `timeout` duration passes since the last send

### Tuning for Different Scenarios

**High-Throughput Systems**

For services generating large volumes of telemetry:

```yaml
processors:
  batch:
    send_batch_size: 8192
    send_batch_max_size: 16384
    timeout: 10s
```

Larger batches maximize throughput but increase memory usage and latency.

**Low-Latency Requirements**

For systems where telemetry freshness matters:

```yaml
processors:
  batch:
    send_batch_size: 256
    send_batch_max_size: 512
    timeout: 1s
```

Smaller batches and shorter timeouts ensure data reaches the backend quickly.

**Cost-Sensitive Deployments**

When you pay per API call or want to minimize egress:

```yaml
processors:
  batch:
    send_batch_size: 10000
    send_batch_max_size: 20000
    timeout: 30s
```

Larger batches mean fewer API calls but longer delays before data appears.

## Batching in Application SDKs

The OpenTelemetry SDKs also support batching before sending to the collector.

### Node.js SDK Batching

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Configure the exporter
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

// Create a batch processor with custom settings
const spanProcessor = new BatchSpanProcessor(exporter, {
  // Maximum batch size
  maxExportBatchSize: 512,

  // Maximum queue size before dropping
  maxQueueSize: 2048,

  // Delay between batch exports (milliseconds)
  scheduledDelayMillis: 5000,

  // Timeout for export operation (milliseconds)
  exportTimeoutMillis: 30000,
});

const sdk = new NodeSDK({
  spanProcessor,
});

sdk.start();
```

### Python SDK Batching

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Configure the exporter
exporter = OTLPSpanExporter(
    endpoint="http://localhost:4318/v1/traces"
)

# Create batch processor with custom settings
span_processor = BatchSpanProcessor(
    exporter,
    # Maximum batch size
    max_export_batch_size=512,
    # Maximum queue size
    max_queue_size=2048,
    # Delay between exports (milliseconds)
    schedule_delay_millis=5000,
    # Export timeout (milliseconds)
    export_timeout_millis=30000,
)

# Set up the tracer provider
provider = TracerProvider()
provider.add_span_processor(span_processor)
trace.set_tracer_provider(provider)
```

### Go SDK Batching

```go
package main

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() (*trace.TracerProvider, error) {
    ctx := context.Background()

    // Create the exporter
    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint("localhost:4318"),
        otlptracehttp.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    // Create batch span processor with options
    bsp := trace.NewBatchSpanProcessor(exporter,
        // Maximum batch size
        trace.WithMaxExportBatchSize(512),
        // Maximum queue size
        trace.WithMaxQueueSize(2048),
        // Delay between batch exports
        trace.WithBatchTimeout(5*time.Second),
        // Export timeout
        trace.WithExportTimeout(30*time.Second),
    )

    // Create tracer provider
    tp := trace.NewTracerProvider(
        trace.WithSpanProcessor(bsp),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}
```

### Java SDK Batching

```java
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter;

import java.time.Duration;

public class TracingConfig {
    public static OpenTelemetrySdk initTracer() {
        // Create the exporter
        OtlpHttpSpanExporter exporter = OtlpHttpSpanExporter.builder()
            .setEndpoint("http://localhost:4318/v1/traces")
            .build();

        // Create batch processor with custom settings
        BatchSpanProcessor batchProcessor = BatchSpanProcessor.builder(exporter)
            // Maximum batch size
            .setMaxExportBatchSize(512)
            // Maximum queue size
            .setMaxQueueSize(2048)
            // Delay between batch exports
            .setScheduleDelay(Duration.ofSeconds(5))
            // Export timeout
            .setExporterTimeout(Duration.ofSeconds(30))
            .build();

        // Create tracer provider
        SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
            .addSpanProcessor(batchProcessor)
            .build();

        return OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .build();
    }
}
```

## Batching Metrics

Metrics batching works differently because metrics are aggregated over time rather than collected as individual events.

### Collector Metrics Batching

```yaml
processors:
  batch:
    send_batch_size: 1024
    timeout: 10s

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlphttp:
    endpoint: "https://backend.example.com"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

### SDK Metric Export Interval

In SDKs, configure the metric export interval:

```javascript
// Node.js
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: 'http://localhost:4318/v1/metrics',
  }),
  // Export metrics every 60 seconds
  exportIntervalMillis: 60000,
  // Timeout for export
  exportTimeoutMillis: 30000,
});
```

## Batching Logs

Logs can generate high volumes, making batching especially important.

### Collector Log Batching

```yaml
processors:
  batch/logs:
    send_batch_size: 2048
    send_batch_max_size: 4096
    timeout: 2s

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch/logs]
      exporters: [otlphttp]
```

Use shorter timeouts for logs to ensure error messages appear quickly.

## Memory Considerations

Batching requires memory to hold pending items. Calculate your memory requirements:

```
memory_per_pipeline = max_queue_size * average_item_size
total_memory = sum(memory_per_pipeline) + overhead
```

For example:
- Queue size: 2048
- Average span size: 2KB
- Memory per pipeline: 2048 * 2KB = 4MB

Configure the memory limiter processor to prevent OOM:

```yaml
processors:
  memory_limiter:
    check_interval: 5s
    limit_mib: 512
    spike_limit_mib: 128

  batch:
    send_batch_size: 1024
    send_batch_max_size: 2048
    timeout: 5s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
```

## Handling Backpressure

When the backend cannot keep up, batches queue up. Configure retry and queue settings to handle this:

```yaml
exporters:
  otlphttp:
    endpoint: "https://backend.example.com"

    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

    # Queue configuration
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s
```

The queue holds batches waiting to be sent. With 5000 queue slots and 1024 items per batch, you can buffer up to 5 million items temporarily.

## Monitoring Batch Performance

Track these metrics to ensure batching works effectively:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
```

Key metrics:
- `otelcol_processor_batch_batch_send_size` - Actual batch sizes
- `otelcol_processor_batch_timeout_trigger_send` - Batches sent due to timeout
- `otelcol_processor_batch_batch_size_trigger_send` - Batches sent due to size limit
- `otelcol_exporter_queue_size` - Current queue depth
- `otelcol_exporter_queue_capacity` - Maximum queue capacity

If you see many timeout-triggered sends, your traffic might be too low for the configured batch size. If you see consistent size-triggered sends, your traffic is healthy.

## Pipeline-Specific Batching

Configure different batch settings for different pipelines:

```yaml
processors:
  batch/traces:
    send_batch_size: 512
    timeout: 5s

  batch/metrics:
    send_batch_size: 1024
    timeout: 60s

  batch/logs:
    send_batch_size: 2048
    timeout: 2s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch/traces]
      exporters: [otlphttp]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch/metrics]
      exporters: [otlphttp]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch/logs]
      exporters: [otlphttp]
```

This allows you to optimize each signal type independently.

## Best Practices Summary

1. **Always use batching** in production. The overhead reduction is significant.

2. **Match batch size to your backend**. Some backends have payload size limits.

3. **Set appropriate timeouts**. Too long delays freshness, too short wastes batching benefits.

4. **Monitor queue metrics**. Growing queues indicate backend issues or insufficient resources.

5. **Pair with memory limiter**. Batching uses memory; protect against OOM.

6. **Test under load**. Verify your settings work at peak traffic before production.

## Conclusion

Batch processing is fundamental to running OpenTelemetry efficiently at scale. Proper configuration reduces network overhead, improves backend performance, and keeps costs manageable. Start with reasonable defaults, monitor the batch metrics, and tune based on your specific traffic patterns and backend capabilities.
