# How to Use OpenTelemetry Exemplars to Jump from a Metric Anomaly Directly to the Causing Trace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Exemplars, Metrics, Traces, Debugging

Description: Learn how to configure OpenTelemetry exemplars to link metric anomalies directly to the traces that caused them for faster debugging.

You are staring at a dashboard. The error rate just spiked. You know something is wrong, but which request caused it? Which trace should you look at among the millions flowing through your system? This is exactly the problem that OpenTelemetry exemplars solve. They attach trace context to individual metric data points, letting you jump from a suspicious metric directly to a representative trace.

## What Are Exemplars?

An exemplar is a sample measurement that includes a reference to the trace context (trace ID and span ID) that was active when the measurement was recorded. Think of it as a bookmark embedded in your metric stream. When you see an unusual histogram bucket or a counter spike, the exemplar tells you "here is one specific request that contributed to this data point."

## Enabling Exemplars in the OpenTelemetry SDK

By default, exemplar collection is not always turned on. Here is how to enable it in a Java application using the OpenTelemetry SDK:

```java
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.sdk.metrics.export.PeriodicMetricReader;
import io.opentelemetry.exporter.otlp.metrics.OTLPMetricExporter;
import io.opentelemetry.sdk.metrics.exemplar.ExemplarFilter;

// Configure the meter provider with exemplar recording enabled
SdkMeterProvider meterProvider = SdkMeterProvider.builder()
    // TRACE_BASED filter records exemplars only when a sampled trace is active
    // This avoids storing exemplars for unsampled requests
    .setExemplarFilter(ExemplarFilter.traceBased())
    .registerMetricReader(
        PeriodicMetricReader.builder(
            OTLPMetricExporter.builder()
                .setEndpoint("http://localhost:4317")
                .build()
        ).build()
    )
    .build();
```

For Python, the setup looks like this:

```python
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics._internal.exemplar import (
    TraceBasedExemplarFilter,
)

# Create meter provider with trace-based exemplar filtering
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://localhost:4317"),
)

meter_provider = MeterProvider(
    metric_readers=[reader],
    exemplar_filter=TraceBasedExemplarFilter(),
)
```

## Recording Metrics That Carry Exemplars

Once exemplars are enabled, every metric measurement automatically captures the active trace context. You do not need to do anything special when recording:

```python
from opentelemetry import metrics, trace

meter = metrics.get_meter("order-service")
tracer = trace.get_tracer("order-service")

# Create a histogram for tracking order processing time
order_duration = meter.create_histogram(
    name="order.processing.duration",
    description="Time to process an order",
    unit="ms",
)

def process_order(order):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order.id)
        span.set_attribute("order.total", order.total)

        start = time.monotonic()
        result = execute_order_pipeline(order)
        elapsed_ms = (time.monotonic() - start) * 1000

        # This histogram record automatically picks up the current
        # trace_id and span_id as an exemplar
        order_duration.record(elapsed_ms, {"order.type": order.type})
        return result
```

## The Debugging Workflow

Here is the step-by-step workflow when you spot an anomaly:

1. You notice the `order.processing.duration` histogram shows a spike in the 5000ms+ bucket at 14:32 UTC.
2. Query the histogram for that time window and look at the exemplars attached to that bucket.
3. Each exemplar contains a `trace_id`. Pick one.
4. Open that trace in your tracing backend (OneUptime, Jaeger, etc.).
5. You now see the exact request that took over 5 seconds and can inspect every span in the call chain.

## Configuring Your Collector for Exemplar Passthrough

The OpenTelemetry Collector needs to be configured to preserve exemplars when processing metrics. Here is a collector config snippet:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    # Keep batch sizes reasonable to preserve exemplar associations
    send_batch_size: 1024
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://otel.oneuptime.com:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

The key thing is to make sure both your metrics and traces pipelines export to the same backend. Exemplars are only useful if you can resolve the trace ID they reference.

## Choosing the Right Exemplar Filter

OpenTelemetry offers three exemplar filter strategies:

- **AlwaysOn**: Records exemplars for every measurement. High overhead. Good for development.
- **AlwaysOff**: Never records exemplars. Use this if you do not want the feature.
- **TraceBased**: Records exemplars only when the current context contains a sampled span. This is the recommended option for production because it aligns exemplar collection with your existing sampling decisions.

## Practical Tips

Keep your metric cardinality in check. High-cardinality label sets dilute exemplars because each label combination gets its own reservoir. Stick to low-cardinality attributes on your metrics and put the high-cardinality details (like user IDs or request IDs) on the span attributes instead. The exemplar bridges the gap.

Also, make sure your tracing backend retains traces long enough. If your exemplar points to a trace ID that has already been evicted due to retention policies, the link is useless. Align your metric and trace retention windows.

## Summary

Exemplars close the gap between metrics and traces. Without them, you are left guessing which trace corresponds to a metric spike. With them, you get a direct link from "something looks wrong in this metric" to "here is the exact request that went wrong." Enable `TraceBased` exemplar filtering, make sure both metrics and traces go to the same backend, and keep your trace retention aligned with your metric retention. The next time you see an anomaly on a dashboard, you will be one click away from the root cause.
