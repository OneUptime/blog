# How to Configure BatchSpanProcessor Export Timeout to Prevent Data Loss During Traffic Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, BatchSpanProcessor, Timeout, Data Loss Prevention

Description: Configure BatchSpanProcessor export timeout properly to prevent span data loss during traffic spikes and backend slowdowns.

When your observability backend slows down during traffic spikes, the BatchSpanProcessor's export timeout becomes the most important configuration parameter. If the timeout is too short, export calls fail even though the backend would have accepted the data with a bit more time. If it is too long, the processor's queue fills up while waiting, and new spans get dropped. Finding the right balance requires understanding how the timeout interacts with the queue and batch settings.

## The Cascade Failure Pattern

Here is what happens during a traffic spike without proper timeout configuration:

1. Your service receives a burst of traffic and generates many spans
2. The observability backend slows down under load
3. The BatchSpanProcessor's export call takes longer than usual
4. The export times out and the batch is lost
5. Meanwhile, new spans fill the queue because the processor was blocked
6. The queue reaches maxQueueSize and new spans are dropped
7. You lose data from exactly the period you care about most

## Default Timeout Values

The OpenTelemetry specification defines a default export timeout of 30 seconds. SDK implementations vary:

- Java SDK: 30,000ms
- Python SDK: 30,000ms
- Go SDK: 30,000ms
- Node.js SDK: 30,000ms

For many deployments, 30 seconds is too long. If an export is stuck for 30 seconds, the queue is not being drained, and you are accumulating spans that will eventually be dropped.

## Configuring the Timeout

### Java

```java
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import java.time.Duration;

OtlpGrpcSpanExporter exporter = OtlpGrpcSpanExporter.builder()
    .setEndpoint("http://collector:4317")
    // Exporter-level timeout for the gRPC/HTTP call itself
    .setTimeout(Duration.ofSeconds(10))
    .build();

BatchSpanProcessor processor = BatchSpanProcessor.builder(exporter)
    // Processor-level timeout for the entire export operation
    .setExporterTimeout(Duration.ofSeconds(15))
    .setMaxQueueSize(16384)
    .setScheduleDelay(Duration.ofMillis(2000))
    .setMaxExportBatchSize(1024)
    .build();
```

### Python

```python
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

exporter = OTLPSpanExporter(
    endpoint="http://collector:4317",
    insecure=True,
    timeout=10,  # Exporter timeout in seconds
)

processor = BatchSpanProcessor(
    exporter,
    export_timeout_millis=15000,  # Processor timeout
    max_queue_size=16384,
    schedule_delay_millis=2000,
    max_export_batch_size=1024,
)
```

### Go

```go
package main

import (
    "time"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    "context"
)

func setupTracing() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("collector:4317"),
        otlptracegrpc.WithInsecure(),
        // gRPC call timeout
        otlptracegrpc.WithTimeout(10*time.Second),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter,
            // Processor export timeout
            sdktrace.WithExportTimeout(15*time.Second),
            sdktrace.WithMaxQueueSize(16384),
            sdktrace.WithBatchTimeout(2*time.Second),
            sdktrace.WithMaxExportBatchSize(1024),
        ),
    )
    return tp, nil
}
```

## Two Levels of Timeout

There are actually two timeouts at play:

1. **Exporter timeout**: How long the HTTP/gRPC call waits for a response from the backend. This is set on the exporter itself.
2. **Processor export timeout**: How long the BatchSpanProcessor waits for the entire export operation (including serialization and the network call) to complete.

The processor timeout should always be larger than the exporter timeout. If the exporter timeout is 10 seconds, set the processor timeout to 15 seconds to give room for serialization overhead.

## Calculating the Right Timeout

Start with your backend's typical response time and add headroom:

```
exporter_timeout = p99_backend_latency * 2
processor_timeout = exporter_timeout + 5 seconds
```

If your Collector typically responds in 200ms at p99, set the exporter timeout to 400ms... wait, that is too aggressive. In practice, during traffic spikes the backend latency can increase 10-50x. A safer formula:

```
exporter_timeout = max(p99_backend_latency * 10, 5 seconds)
processor_timeout = exporter_timeout + 5 seconds
```

## Combining Timeout with Queue Sizing

The timeout and queue must work together. During a backend slowdown, the queue needs to be large enough to buffer spans while exports are retried:

```
buffer_duration = timeout * (maxQueueSize / maxExportBatchSize)
```

With a 15-second timeout, queue of 16384, and batch size of 1024:

```
buffer_duration = 15 * (16384 / 1024) = 240 seconds = 4 minutes
```

This means you can survive a 4-minute backend outage without dropping spans. Adjust the queue size based on how long your backend outages typically last.

## Environment Variable Configuration

```bash
# Set timeout via environment variables
export OTEL_BSP_EXPORT_TIMEOUT=15000
export OTEL_BSP_MAX_QUEUE_SIZE=16384
export OTEL_BSP_SCHEDULE_DELAY=2000
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE=1024

# Set exporter timeout
export OTEL_EXPORTER_OTLP_TIMEOUT=10000
```

## Monitoring Timeout Events

Watch for these indicators that your timeout is misconfigured:

- **Frequent timeout errors in logs**: Timeout is too short, increase it
- **Queue full warnings**: Either timeout is too long (blocking the drain) or queue is too small
- **Memory growth**: Queue is too large for your available memory

Log the export results to track timeout frequency:

```python
import logging
logger = logging.getLogger("opentelemetry.sdk.trace.export")
logger.setLevel(logging.WARNING)
# This will log timeout and failure events
```

The export timeout is not a set-and-forget parameter. Monitor it in production and adjust as your traffic patterns and backend performance change.
