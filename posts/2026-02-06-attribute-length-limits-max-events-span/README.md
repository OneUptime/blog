# How to Set Attribute Value Length Limits and Max Events Per Span to Prevent SDK Memory Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SDK Configuration, Memory Limits, Span Limits

Description: Configure OpenTelemetry SDK attribute value length limits and max events per span to prevent memory issues in production applications.

Without limits, a single span can consume unbounded memory. A SQL query stored as an attribute might be 50KB. An exception stack trace recorded as a span event might be 200KB. Multiply that by thousands of concurrent spans, and your application runs out of memory. The OpenTelemetry SDK provides configurable limits on attribute value lengths, the number of attributes per span, the number of events per span, and the number of links per span.

## Default Limits

The OpenTelemetry specification defines these defaults:

| Limit | Default Value |
|-------|--------------|
| Max attributes per span | 128 |
| Max events per span | 128 |
| Max links per span | 128 |
| Max attributes per event | 128 |
| Max attributes per link | 128 |
| Attribute value length limit | No limit |

The missing attribute value length limit is the dangerous one. A single string attribute can be arbitrarily large.

## Python: Configuring Span Limits

```python
# setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, SpanLimits
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Define span limits
limits = SpanLimits(
    # Maximum number of attributes per span
    max_attributes=64,
    # Maximum number of events (like exceptions) per span
    max_events=32,
    # Maximum number of links per span
    max_links=32,
    # Maximum length of any attribute value string
    # Strings longer than this are truncated
    max_attribute_length=1024,
    # Maximum number of attributes per event
    max_event_attributes=16,
    # Maximum number of attributes per link
    max_link_attributes=16,
)

resource = Resource.create({"service.name": "api-service"})

provider = TracerProvider(
    resource=resource,
    span_limits=limits,
)

exporter = OTLPSpanExporter(endpoint="http://collector:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

# Now test the limits
tracer = trace.get_tracer("test")

with tracer.start_as_current_span("test-span") as span:
    # This long value will be truncated to 1024 characters
    long_query = "SELECT " + ", ".join([f"col_{i}" for i in range(500)])
    span.set_attribute("db.statement", long_query)

    # If you add more than 64 attributes, extras are dropped
    for i in range(100):
        span.set_attribute(f"key_{i}", f"value_{i}")
    # Only the first 64 attributes are kept
```

## Java: SpanLimits Configuration

```java
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.SpanLimits;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;

SpanLimits limits = SpanLimits.builder()
    .setMaxNumberOfAttributes(64)
    .setMaxNumberOfEvents(32)
    .setMaxNumberOfLinks(32)
    .setMaxAttributeValueLength(1024)
    .setMaxNumberOfAttributesPerEvent(16)
    .setMaxNumberOfAttributesPerLink(16)
    .build();

SdkTracerProvider provider = SdkTracerProvider.builder()
    .setSpanLimits(limits)
    .addSpanProcessor(BatchSpanProcessor.builder(
        OtlpGrpcSpanExporter.builder()
            .setEndpoint("http://collector:4317")
            .build()
    ).build())
    .build();
```

## Go: SpanLimits Configuration

```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func main() {
    ctx := context.Background()
    exporter, _ := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("collector:4317"),
        otlptracegrpc.WithInsecure(),
    )

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithSpanLimits(sdktrace.SpanLimits{
            // Limit attribute count per span
            AttributeCountLimit:          64,
            // Limit event count per span
            EventCountLimit:              32,
            // Limit link count per span
            LinkCountLimit:               32,
            // Truncate attribute values to this length
            AttributeValueLengthLimit:    1024,
            // Limit attributes per event
            AttributePerEventCountLimit:  16,
            // Limit attributes per link
            AttributePerLinkCountLimit:   16,
        }),
    )
    otel.SetTracerProvider(tp)
}
```

## Environment Variable Configuration

You can set limits via environment variables without changing code:

```bash
# Span attribute limits
export OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT=64
export OTEL_SPAN_EVENT_COUNT_LIMIT=32
export OTEL_SPAN_LINK_COUNT_LIMIT=32

# Attribute value length limit (applied globally)
export OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT=1024

# Attribute count limit (applied globally)
export OTEL_ATTRIBUTE_COUNT_LIMIT=64

# Event attribute count limit
export OTEL_EVENT_ATTRIBUTE_COUNT_LIMIT=16

# Link attribute count limit
export OTEL_LINK_ATTRIBUTE_COUNT_LIMIT=16
```

## Practical Limit Recommendations

For a typical web service:

```python
limits = SpanLimits(
    # 64 attributes covers most instrumentation libraries
    max_attributes=64,
    # 32 events is enough for exceptions and log correlations
    max_events=32,
    # Links are rarely used in high numbers
    max_links=16,
    # 1024 chars catches SQL queries and URLs without blowing up memory
    # Some teams use 4096 for services with large queries
    max_attribute_length=1024,
)
```

For a data pipeline service that processes large payloads:

```python
limits = SpanLimits(
    max_attributes=32,       # Fewer attributes needed
    max_events=16,           # Fewer events
    max_links=8,
    max_attribute_length=512,  # Aggressive truncation to save memory
)
```

## What Happens When Limits Are Hit

When limits are reached, the SDK does not crash or throw errors. It silently drops or truncates:

- **Attribute count exceeded**: New attributes are silently dropped. The span keeps the first N attributes.
- **Value length exceeded**: The string is truncated to the limit. No error is raised.
- **Event count exceeded**: New events are silently dropped.

This silent behavior means you need monitoring to detect when limits are being hit:

```python
# Log a warning when attributes are being truncated
import logging
logger = logging.getLogger("opentelemetry.sdk.trace")
logger.setLevel(logging.DEBUG)
# The SDK logs debug messages when limits are applied
```

## Calculating Memory Impact

A rough calculation for memory per span:

```
memory_per_span = num_attributes * (avg_key_length + avg_value_length)
                + num_events * (event_name_length + num_event_attributes * attr_size)
                + base_span_overhead (~200 bytes)
```

With limits of 64 attributes, 1024-byte max value, and 32 events:

```
worst_case = 64 * (50 + 1024) + 32 * (100 + 16 * 1024) + 200
           = 68,736 + 527,200 + 200
           = ~596 KB per span
```

With a BatchSpanProcessor queue of 8192 spans:

```
max_queue_memory = 8192 * 596 KB = ~4.8 GB
```

That is a lot. In practice, most spans are much smaller, but setting conservative limits prevents worst-case memory blowups from unusual spans like those with massive SQL queries or error messages.

Setting span limits is a simple configuration change that provides significant protection against memory issues. Every production OpenTelemetry deployment should have explicit limits configured rather than relying on the unbounded defaults.
