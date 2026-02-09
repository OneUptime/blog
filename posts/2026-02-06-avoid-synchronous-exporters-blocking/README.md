# How to Avoid the Anti-Pattern of Using Synchronous Exporters That Block Your Application's Hot Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Exporters, Performance, Latency

Description: Avoid blocking your application's request path by understanding the difference between synchronous and batch span exporters.

Using a synchronous exporter means every span is sent to the backend immediately, inline with your application's request processing. If the backend takes 50ms to respond, you just added 50ms to every single request. This post explains how to identify synchronous exporters and replace them with batch processing.

## Synchronous vs Batch Exporters

**SimpleSpanProcessor** (synchronous): Calls the exporter's `export()` method every time a span ends. The call to `span.end()` blocks until the export completes.

**BatchSpanProcessor** (asynchronous): Collects finished spans in an in-memory buffer and exports them in batches on a background thread or timer.

```javascript
const { SimpleSpanProcessor, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter();

// Bad - blocks on every span.end()
const syncProcessor = new SimpleSpanProcessor(exporter);

// Good - batches spans and exports in the background
const batchProcessor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000,
  exportTimeoutMillis: 30000,
});
```

## Measuring the Impact

With a synchronous exporter, every request pays the cost of a network round-trip to the telemetry backend. Here is what that looks like:

```
Request without telemetry:     10ms
Request with sync exporter:    10ms + 50ms (export) = 60ms
Request with batch exporter:   10ms + ~0.1ms (queuing) = ~10.1ms
```

The batch exporter adds negligible overhead because it only enqueues the span in memory. The actual network call happens on a background timer, completely decoupled from the request.

## When SimpleSpanProcessor Gets Used Accidentally

### Mistake 1: Using ConsoleSpanExporter for Testing

```javascript
// This is synchronous! It blocks on every span to write to stdout
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const sdk = new NodeSDK({
  spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
});
```

The `ConsoleSpanExporter` is often paired with `SimpleSpanProcessor` in tutorials. If this makes it to production, every request is delayed by the time it takes to serialize and print the span.

### Mistake 2: Explicit SimpleSpanProcessor in Configuration

Some developers use `SimpleSpanProcessor` intentionally because they want "real-time" trace data:

```python
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# This blocks on every span
provider.add_span_processor(SimpleSpanProcessor(OTLPSpanExporter()))
```

## The Fix: Always Use BatchSpanProcessor

### Node.js

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// NodeSDK uses BatchSpanProcessor by default
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
});
sdk.start();
```

If you are configuring the processor manually:

```javascript
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const processor = new BatchSpanProcessor(new OTLPTraceExporter(), {
  // Maximum number of spans in the queue
  maxQueueSize: 2048,
  // Maximum number of spans per export batch
  maxExportBatchSize: 512,
  // How often to flush (milliseconds)
  scheduledDelayMillis: 5000,
  // Export timeout
  exportTimeoutMillis: 30000,
});
```

### Python

```python
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Always use BatchSpanProcessor
processor = BatchSpanProcessor(
    OTLPSpanExporter(),
    max_queue_size=2048,
    max_export_batch_size=512,
    schedule_delay_millis=5000,
    export_timeout_millis=30000,
)
provider.add_span_processor(processor)
```

### Java

```java
SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .addSpanProcessor(BatchSpanProcessor.builder(
        OtlpGrpcSpanExporter.builder()
            .setEndpoint("http://collector:4317")
            .build())
        .setMaxQueueSize(2048)
        .setMaxExportBatchSize(512)
        .setScheduleDelay(Duration.ofSeconds(5))
        .build())
    .build();
```

## Tuning Batch Processor Parameters

| Parameter | Default | Guidance |
|-----------|---------|----------|
| `maxQueueSize` | 2048 | Increase for high-throughput services |
| `maxExportBatchSize` | 512 | Keep below maxQueueSize |
| `scheduledDelayMillis` | 5000 | Lower for more real-time data (min 1000) |
| `exportTimeoutMillis` | 30000 | Match to your backend's SLA |

## The One Exception

There is one legitimate use for `SimpleSpanProcessor`: in test code where you need to assert that spans were created immediately:

```javascript
// In tests only - use SimpleSpanProcessor with an in-memory exporter
const { InMemorySpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');

const memoryExporter = new InMemorySpanExporter();
provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));

// Now spans are immediately available for assertions
const spans = memoryExporter.getFinishedSpans();
```

Outside of tests, always use `BatchSpanProcessor`. Your application's latency depends on it.
