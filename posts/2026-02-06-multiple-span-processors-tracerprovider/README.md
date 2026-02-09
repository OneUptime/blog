# How to Set Up Multiple Span Processors in a Single TracerProvider for Enrichment, Filtering, and Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SpanProcessor, TracerProvider, SDK Configuration

Description: Configure multiple span processors in a single OpenTelemetry TracerProvider for span enrichment, filtering, and multi-destination export.

The OpenTelemetry SDK's TracerProvider supports adding multiple SpanProcessors. Each processor receives span start and end events, and they execute in the order they were added. This lets you build a processing pipeline within the SDK itself: one processor enriches spans with extra attributes, another filters out noisy spans, and a third exports the remaining spans to your backend.

## Why Multiple Processors

Common use cases:

- **Enrichment + Export**: Add request-scoped attributes before export
- **Multi-destination export**: Send spans to both a local debugger and a remote backend
- **Filtering + Export**: Drop health check spans before they reach the exporter
- **Sampling + Export**: Implement custom sampling logic as a processor

## Python: Adding Multiple Processors

```python
# multi_processor_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, ReadableSpan
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    SimpleSpanProcessor,
    SpanExporter,
    SpanExportResult,
    ConsoleSpanExporter,
)
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource


# Custom processor that adds attributes to every span
class EnrichmentProcessor:
    """Adds deployment metadata to all spans."""

    def __init__(self, attributes):
        self._attributes = attributes

    def on_start(self, span, parent_context=None):
        # Add attributes when the span starts
        for key, value in self._attributes.items():
            span.set_attribute(key, value)

    def on_end(self, span):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        return True


# Custom processor that filters out unwanted spans
class FilteringProcessor:
    """Drops spans that match filter criteria before they reach the exporter."""

    def __init__(self, drop_span_names=None):
        self._drop_names = set(drop_span_names or [])
        self._delegate_processors = []

    def add_delegate(self, processor):
        """Add a processor that receives spans after filtering."""
        self._delegate_processors.append(processor)

    def on_start(self, span, parent_context=None):
        # Forward to delegates
        for proc in self._delegate_processors:
            proc.on_start(span, parent_context)

    def on_end(self, span):
        # Filter: drop spans with matching names
        if span.name in self._drop_names:
            return  # Span is dropped, not forwarded

        # Forward to delegates
        for proc in self._delegate_processors:
            proc.on_end(span)

    def shutdown(self):
        for proc in self._delegate_processors:
            proc.shutdown()

    def force_flush(self, timeout_millis=None):
        for proc in self._delegate_processors:
            proc.force_flush(timeout_millis)
        return True


# Set up the TracerProvider with multiple processors
resource = Resource.create({
    "service.name": "api-gateway",
    "service.version": "3.1.0",
})

provider = TracerProvider(resource=resource)

# Processor 1: Enrich spans with deployment info
enrichment = EnrichmentProcessor({
    "deployment.region": "us-east-1",
    "deployment.canary": False,
    "build.commit": "abc123def",
})
provider.add_span_processor(enrichment)

# Processor 2: Export to console for local debugging
console_processor = SimpleSpanProcessor(ConsoleSpanExporter())
provider.add_span_processor(console_processor)

# Processor 3: Export to the Collector via OTLP
otlp_exporter = OTLPSpanExporter(
    endpoint="http://collector:4317",
    insecure=True,
)
batch_processor = BatchSpanProcessor(
    otlp_exporter,
    max_queue_size=8192,
    schedule_delay_millis=5000,
)
provider.add_span_processor(batch_processor)

trace.set_tracer_provider(provider)
```

## Execution Order

Processors run in the order they were added to the TracerProvider:

```python
# on_start is called in order: enrichment -> console -> batch
# on_end is called in order: enrichment -> console -> batch

# This means:
# 1. Enrichment adds attributes (on_start)
# 2. Console processor sees the enriched span
# 3. Batch processor exports the enriched span
```

## Java: Multiple Processors

```java
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.exporter.logging.LoggingSpanExporter;

SdkTracerProvider provider = SdkTracerProvider.builder()
    // Processor 1: Log spans to stdout for debugging
    .addSpanProcessor(SimpleSpanProcessor.create(
        LoggingSpanExporter.create()
    ))
    // Processor 2: Export to Collector in batches
    .addSpanProcessor(BatchSpanProcessor.builder(
        OtlpGrpcSpanExporter.builder()
            .setEndpoint("http://collector:4317")
            .build()
    ).build())
    // Processor 3: Export to a second backend
    .addSpanProcessor(BatchSpanProcessor.builder(
        OtlpGrpcSpanExporter.builder()
            .setEndpoint("http://secondary-collector:4317")
            .build()
    ).build())
    .build();
```

## Go: Multiple Processors

```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func main() {
    ctx := context.Background()

    // Exporter 1: Console output
    consoleExporter, _ := stdouttrace.New(stdouttrace.WithPrettyPrint())

    // Exporter 2: OTLP to Collector
    otlpExporter, _ := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("collector:4317"),
        otlptracegrpc.WithInsecure(),
    )

    tp := sdktrace.NewTracerProvider(
        // Add both processors - they run independently
        sdktrace.WithSpanProcessor(
            sdktrace.NewSimpleSpanProcessor(consoleExporter),
        ),
        sdktrace.WithBatcher(otlpExporter),
    )
    otel.SetTracerProvider(tp)
    defer tp.Shutdown(ctx)
}
```

## Performance Considerations

Each processor adds overhead to span start and end operations. Keep these guidelines in mind:

1. **Enrichment processors should be fast.** They run synchronously on the application thread. Do not make network calls in `on_start` or `on_end`.

2. **Use BatchSpanProcessor for exports.** SimpleSpanProcessor blocks the application thread during export. Only use it for local debugging.

3. **Avoid too many processors.** Three to four processors is typical. If you need more complex logic, consider consolidating into a single custom processor.

4. **Order matters for enrichment.** Put enrichment processors before export processors so the exported spans include the enriched attributes.

```python
# Good order: enrich first, then export
provider.add_span_processor(enrichment)    # Adds attributes
provider.add_span_processor(batch_export)   # Exports enriched spans

# Bad order: export sees spans without enrichment
provider.add_span_processor(batch_export)   # Exports before enrichment
provider.add_span_processor(enrichment)     # Too late
```

Multiple span processors give you a flexible in-SDK pipeline for span processing. Use them to keep your SDK-side logic organized and your spans enriched before they leave the process.
