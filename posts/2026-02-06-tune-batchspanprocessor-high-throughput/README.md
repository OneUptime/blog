# How to Tune BatchSpanProcessor maxQueueSize, scheduledDelayMillis, and maxExportBatchSize for High-Throughput Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, BatchSpanProcessor, Performance Tuning, SDK

Description: Learn how to tune BatchSpanProcessor parameters like maxQueueSize, scheduledDelayMillis, and maxExportBatchSize for high-throughput services.

The BatchSpanProcessor is the default way to export spans from the OpenTelemetry SDK. It buffers completed spans in a queue and periodically flushes them in batches to the configured exporter. The default settings work well for moderate workloads, but high-throughput services that generate thousands of spans per second need careful tuning to avoid dropped spans and excessive memory usage.

## The Three Key Parameters

The BatchSpanProcessor has three parameters that interact with each other:

- **maxQueueSize**: Maximum number of spans held in the buffer. When full, new spans are dropped. Default: 2048
- **scheduledDelayMillis**: How often the processor flushes the queue, in milliseconds. Default: 5000 (5 seconds)
- **maxExportBatchSize**: Maximum number of spans sent in a single export call. Default: 512

## Understanding the Interaction

Think of it as a pipeline: spans enter the queue, and every `scheduledDelayMillis` the processor takes up to `maxExportBatchSize` spans from the queue and sends them to the exporter. If your service produces spans faster than the processor can drain the queue, spans get dropped.

The throughput formula is roughly:

```
max_throughput = maxQueueSize / scheduledDelayMillis * 1000
```

With defaults: 2048 / 5000 * 1000 = 409 spans/second. If your service generates more than that and the exporter cannot keep up, you will lose data.

## Tuning for a High-Throughput Java Service

```java
// Java SDK configuration for a service handling 5000+ requests/second
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;

import java.time.Duration;

public class TracingConfig {
    public static SdkTracerProvider createProvider() {
        OtlpGrpcSpanExporter exporter = OtlpGrpcSpanExporter.builder()
            .setEndpoint("http://collector:4317")
            .setTimeout(Duration.ofSeconds(10))
            .build();

        BatchSpanProcessor processor = BatchSpanProcessor.builder(exporter)
            // Increase queue to handle burst traffic
            // Rule of thumb: queue should hold 10-30 seconds of spans
            .setMaxQueueSize(16384)
            // Flush every 2 seconds instead of 5
            // Lower values = less latency, more export calls
            .setScheduleDelay(Duration.ofMillis(2000))
            // Send up to 2048 spans per batch
            // Larger batches = fewer network calls, but more memory per call
            .setMaxExportBatchSize(2048)
            // Timeout for each export operation
            .setExporterTimeout(Duration.ofSeconds(30))
            .build();

        return SdkTracerProvider.builder()
            .addSpanProcessor(processor)
            .build();
    }
}
```

## Tuning for Python

```python
# Python SDK configuration
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

exporter = OTLPSpanExporter(endpoint="http://collector:4317", insecure=True)

processor = BatchSpanProcessor(
    exporter,
    # Queue can hold 16K spans before dropping
    max_queue_size=16384,
    # Flush every 2 seconds
    schedule_delay_millis=2000,
    # Send up to 2048 spans per batch
    max_export_batch_size=2048,
    # 30-second timeout for exports
    export_timeout_millis=30000,
)

provider = TracerProvider()
provider.add_span_processor(processor)
```

## Tuning Guidelines

Here is a practical approach to choosing values:

**Step 1: Estimate your span rate.** If your service handles 3000 requests per second and each request generates an average of 5 spans, your span rate is 15,000 spans/second.

**Step 2: Set maxQueueSize.** This should hold at least 10 seconds of spans so the queue can absorb bursts. For 15,000 spans/second: `maxQueueSize = 15000 * 10 = 150000`. In practice, start with something like 65536 and increase if you see drops.

**Step 3: Set scheduledDelayMillis.** Lower values mean lower export latency but more export calls. For high throughput, 1000-2000ms works well.

**Step 4: Set maxExportBatchSize.** This controls the payload size. Larger batches are more network-efficient but use more memory during serialization. Values between 1024 and 4096 are typical for high-throughput services.

## Monitoring for Dropped Spans

The SDK exposes metrics that tell you if spans are being dropped. In Java, you can check the internal logging:

```java
// Enable SDK internal logging to see drop warnings
// Add this JVM argument:
// -Dio.opentelemetry.sdk.trace.internal.LOGGING_LEVEL=FINE

// Or check programmatically with a custom SpanProcessor wrapper
public class MonitoringSpanProcessor implements SpanProcessor {
    private final AtomicLong dropCount = new AtomicLong(0);
    private final BatchSpanProcessor delegate;

    // Track queue state by monitoring onEnd timing
    @Override
    public void onEnd(ReadableSpan span) {
        delegate.onEnd(span);
    }
}
```

In Python, watch for log messages like:

```
WARNING: Dropping span because queue is full. Consider increasing maxQueueSize.
```

## Environment Variable Configuration

You can also tune these via environment variables without changing code:

```bash
# Set via environment variables
export OTEL_BSP_MAX_QUEUE_SIZE=16384
export OTEL_BSP_SCHEDULE_DELAY=2000
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE=2048
export OTEL_BSP_EXPORT_TIMEOUT=30000
```

This is useful for adjusting values per deployment environment without recompiling.

## Common Pitfalls

**Setting maxExportBatchSize larger than maxQueueSize.** The batch size should always be smaller than the queue size. A good ratio is queue = 8x batch.

**Setting scheduledDelayMillis too low.** Going below 500ms creates a lot of small export calls that can overwhelm the network and the Collector. Find the balance between latency and efficiency.

**Ignoring exporter timeout.** If the Collector is slow, exports back up. The exporter timeout should be long enough to handle slow responses but short enough that the queue does not fill up while waiting.

Start with the defaults, measure your span throughput, and adjust one parameter at a time. Monitor the queue depth and drop rate after each change to confirm the improvement.
