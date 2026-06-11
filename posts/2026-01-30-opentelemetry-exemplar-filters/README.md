# How to Implement OpenTelemetry Exemplar Filters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTelemetry, Metric, Exemplars, Tracing

Description: Learn how to implement exemplar filters in OpenTelemetry to connect metrics with traces for faster root cause analysis.

---

> Metrics tell you **what** is happening. Exemplars tell you **which specific request** caused it.

Exemplars are the bridge between aggregated metrics and individual traces. When your latency spikes or error rate jumps, exemplars point you to the exact trace that contributed to that anomaly. This guide walks through implementing exemplar filters in OpenTelemetry to control which trace samples get attached to your metrics.

---

## Table of Contents

1. What Are Exemplars?
2. Why Exemplar Filters Matter
3. How Exemplar Filters Work
4. Built-in Exemplar Filters
5. Implementing a Custom Exemplar Filter
6. Configuration in Different Languages
7. Collector Configuration for Exemplars
8. Best Practices
9. Common Pitfalls
10. Putting It All Together

---

## 1. What Are Exemplars?

An exemplar is a sample data point that includes:

- A measured value (e.g., latency of 847ms)
- A timestamp
- Trace context (trace_id, span_id)
- Optional filtered attributes

Think of exemplars as bookmarks. When you see a metric data point, the exemplar says: "Here is one specific request that contributed to this value. Go look at its trace for details."

```jsonc
{
  "metric": "http.server.duration",
  "bucket": "500-1000ms",
  "count": 42,
  "exemplar": {
    "value": 847.3,
    "timestamp": "2026-01-30T14:23:45.123Z",
    "trace_id": "4f3ae9c1b2d4e5f6a7b8c9d0e1f2a3b4",
    "span_id": "1a2b3c4d5e6f7890",
    "filtered_attributes": {
      "http.route": "/api/checkout"
    }
  }
}
```

---

## 2. Why Exemplar Filters Matter

Without filtering, every single measurement could potentially become an exemplar. This creates problems:

| Problem | Impact |
|---------|--------|
| Storage overhead | Exemplars consume space in your metrics backend |
| Noise | Too many exemplars dilute the signal |
| Irrelevant samples | Not all requests are equally interesting |
| Performance | Capturing every trace context adds CPU overhead |

Exemplar filters let you decide: "Under what conditions should we attach trace context to this metric measurement?"

The following diagram shows how exemplars connect metrics to traces for investigation.

```mermaid
flowchart LR
    A[Incoming Request] --> B[Create Span]
    B --> C[Record Metric]
    C --> D{Exemplar Filter}
    D -->|Pass| E[Attach Trace Context]
    D -->|Reject| F[Metric Only]
    E --> G[Export to Backend]
    F --> G
    G --> H[Dashboard Shows Spike]
    H --> I[Click Exemplar]
    I --> J[Jump to Trace]
```

---

## 3. How Exemplar Filters Work

Exemplar filters are invoked during metric recording. They receive context about the current measurement and decide whether to sample it as an exemplar.

The filter receives:

- The current OpenTelemetry context (which contains the active span)
- The recorded value and metric attributes in SDKs whose filter interface exposes them

The filter returns:

- `true`: Make the measurement eligible for the exemplar reservoir
- `false`: Skip exemplar sampling for this measurement

The decision flow can be visualized as follows.

```mermaid
flowchart TD
    A[Metric.record called] --> B[Get active span context]
    B --> C{Is span context valid?}
    C -->|No| D[No exemplar]
    C -->|Yes| E{Is span sampled?}
    E -->|No| D
    E -->|Yes| F{Run ExemplarFilter}
    F -->|false| D
    F -->|true| G[Offer measurement to exemplar reservoir]
    G --> H[Export stored exemplar with trace_id + span_id]
```

---

## 4. Built-in Exemplar Filters

OpenTelemetry defines several built-in exemplar filters. SDKs commonly expose them through code, environment configuration, or both.

### AlwaysOnExemplarFilter

Makes every measurement eligible to become an exemplar. The exemplar reservoir still decides whether to store it.

SDK environment configuration, where supported:
```bash
export OTEL_METRICS_EXEMPLAR_FILTER=always_on
```

Use case: Development environments, low-traffic services, debugging sessions.

### AlwaysOffExemplarFilter

Never attaches exemplars.

SDK environment configuration, where supported:
```bash
export OTEL_METRICS_EXEMPLAR_FILTER=always_off
```

Use case: High-volume services where exemplar overhead is unacceptable, or when your backend does not support exemplars.

### TraceBasedExemplarFilter (Default)

Only attaches exemplars when the span is sampled for tracing.

SDK environment configuration, where supported:
```bash
export OTEL_METRICS_EXEMPLAR_FILTER=trace_based
```

Use case: Production environments. Aligns exemplar sampling with trace sampling decisions.

---

## 5. Implementing a Custom Exemplar Filter

Custom filters let you implement business logic for exemplar selection. Here is an example that selects exemplars based on value thresholds and specific attributes.

First, define the filter class that implements the Python SDK's ExemplarFilter interface.

```python
from opentelemetry.context import Context
from opentelemetry.sdk.metrics import ExemplarFilter
from opentelemetry.trace import INVALID_SPAN_CONTEXT, get_current_span
import random


class SmartExemplarFilter(ExemplarFilter):
    """Custom exemplar filter that captures exemplars for important measurements."""

    def __init__(self, latency_threshold_ms: float = 500, high_value_routes: list[str] | None = None):
        self.latency_threshold_ms = latency_threshold_ms
        self.high_value_routes = set(high_value_routes or [
            "/api/checkout",
            "/api/payment",
            "/api/order",
        ])

    def should_sample(self, value: int | float, time_unix_nano: int, attributes: dict | None, context: Context) -> bool:
        attributes = attributes or {}
        span_context = get_current_span(context).get_span_context()

        if span_context == INVALID_SPAN_CONTEXT:
            return False

        if not span_context.trace_flags.sampled:
            return False

        if value > self.latency_threshold_ms:
            return True

        status_code = attributes.get("http.status_code", 0)
        if isinstance(status_code, int) and status_code >= 400:
            return True

        route = attributes.get("http.route", "")
        if route in self.high_value_routes:
            return True

        return random.random() < 0.1
```

Now wire the custom filter into the MeterProvider.

```python
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

metric_exporter = OTLPMetricExporter(
    endpoint="https://oneuptime.com/otlp/v1/metrics",
    headers={"x-oneuptime-token": "YOUR_TOKEN"},
)

reader = PeriodicExportingMetricReader(
    metric_exporter,
    export_interval_millis=15000,
)

meter_provider = MeterProvider(
    metric_readers=[reader],
    exemplar_filter=SmartExemplarFilter(
        latency_threshold_ms=500,
        high_value_routes=["/api/checkout", "/api/payment", "/api/order"],
    ),
)
```

---

## 6. Configuration in Different Languages

### Node.js / TypeScript

The full SDK setup with metrics and traces exported to the same backend. In current OpenTelemetry JavaScript SDK releases, `MeterProviderOptions` does not expose a stable custom exemplar filter option; use the SDK's built-in exemplar behavior for your version and keep trace context active when recording metrics.

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'checkout-service',
  [ATTR_SERVICE_VERSION]: '2.1.0'
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: 'https://oneuptime.com/otlp/v1/traces',
    headers: { 'x-oneuptime-token': process.env.ONEUPTIME_TOKEN || '' }
  }),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: 'https://oneuptime.com/otlp/v1/metrics',
        headers: { 'x-oneuptime-token': process.env.ONEUPTIME_TOKEN || '' }
      }),
      exportIntervalMillis: 15000
    })
  ],
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

### Python

Python implementation of a custom exemplar filter.

```python
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics import ExemplarFilter
from opentelemetry.trace import get_current_span, INVALID_SPAN_CONTEXT
from opentelemetry.context import Context
import random


class SmartExemplarFilter(ExemplarFilter):
    """Custom exemplar filter for high-value measurements."""

    def __init__(
        self,
        latency_threshold_ms: float = 500,
        high_value_routes: list[str] | None = None
    ):
        self.latency_threshold_ms = latency_threshold_ms
        self.high_value_routes = set(high_value_routes or [
            '/api/checkout',
            '/api/payment',
            '/api/order'
        ])

    def should_sample(
        self,
        value: float,
        time_unix_nano: int,
        attributes: dict | None,
        context: Context
    ) -> bool:
        attributes = attributes or {}

        # Check for valid sampled span
        span = get_current_span(context)
        span_context = span.get_span_context()

        if span_context == INVALID_SPAN_CONTEXT:
            return False

        if not span_context.trace_flags.sampled:
            return False

        # High latency
        if value > self.latency_threshold_ms:
            return True

        # Errors
        status_code = attributes.get('http.status_code', 0)
        if isinstance(status_code, int) and status_code >= 400:
            return True

        # High-value routes
        route = attributes.get('http.route', '')
        if route in self.high_value_routes:
            return True

        # 10% probabilistic fallback
        return random.random() < 0.1


# Configure the meter provider with the custom filter

exporter = OTLPMetricExporter(
    endpoint="https://oneuptime.com/otlp/v1/metrics",
    headers={"x-oneuptime-token": "YOUR_TOKEN"}
)

reader = PeriodicExportingMetricReader(
    exporter,
    export_interval_millis=15000
)

provider = MeterProvider(
    metric_readers=[reader],
    exemplar_filter=SmartExemplarFilter(
        latency_threshold_ms=500,
        high_value_routes=['/api/checkout', '/api/payment']
    )
)
```

### Go

Go implementation using the OpenTelemetry Go SDK. In Go, an exemplar filter receives the measurement context only, so value and attribute based decisions belong in SDKs whose filter interface exposes those fields.

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/metric/exemplar"
    "go.opentelemetry.io/otel/trace"
)

func sampledTraceFilter(ctx context.Context) bool {
    spanCtx := trace.SpanContextFromContext(ctx)
    return spanCtx.IsValid() && spanCtx.IsSampled()
}

func main() {
    provider := metric.NewMeterProvider(
        // TraceBasedFilter is the default, but setting it explicitly makes the
        // exemplar behavior clear.
        metric.WithExemplarFilter(exemplar.TraceBasedFilter),
    )
    defer provider.Shutdown(context.Background())

    _ = metric.NewMeterProvider(
        metric.WithExemplarFilter(sampledTraceFilter),
    )
}
```

---

## 7. Collector Configuration for Exemplars

The OpenTelemetry Collector needs configuration to preserve and forward exemplars.

Configure the OTLP receiver and exporter to handle exemplars properly.

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    send_batch_size: 512
    timeout: 5s

  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
    check_interval: 5s

exporters:
  otlphttp:
    endpoint: "https://oneuptime.com/otlp"
    headers:
      "x-oneuptime-token": "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
```

Important: Ensure both metrics and traces pipelines export to the same backend so exemplar trace lookups work correctly.

---

## 8. Best Practices

### Align Exemplar Sampling with Trace Sampling

If your trace sampler drops a trace, the exemplar becomes useless since there is no trace to link to.

```bash
export OTEL_METRICS_EXEMPLAR_FILTER=trace_based
```

### Keep Filtered Attributes Minimal

Exemplars can include "filtered attributes" for additional context. Keep these minimal to avoid bloating storage.

```typescript
// Good: Include only high-value, low-cardinality attributes
const filteredAttributes = {
  'http.route': '/api/checkout',
  'http.method': 'POST'
};

// Bad: Including high-cardinality or sensitive data
const badAttributes = {
  'user.id': '12345',           // High cardinality
  'request.body': '{"card":...' // Sensitive data
};
```

### Use Histograms for Latency Metrics

Exemplars work best with histograms. The exemplar attaches to the bucket that contains the value, giving you representative samples across the distribution.

```typescript
const meter = meterProvider.getMeter('http-server');

// Good: Histogram with exemplars
const latencyHistogram = meter.createHistogram('http.server.duration', {
  description: 'HTTP server request duration',
  unit: 'ms'
});

// Recording a value - exemplar filter decides if trace context attaches
latencyHistogram.record(247, {
  'http.method': 'POST',
  'http.route': '/api/checkout',
  'http.status_code': 200
});
```

### Monitor Exemplar Cardinality

Track how many exemplars you are generating to avoid storage surprises.

```yaml
# Collector metrics to monitor
otelcol_exporter_sent_metric_points
otelcol_processor_batch_batch_send_size
```

---

## 9. Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Always-on in production | Exemplar storage explodes | Use TraceBasedExemplarFilter or custom filter |
| Mismatched sampling | Exemplars point to dropped traces | Align exemplar filter with trace sampler |
| Missing trace context | Exemplars have no trace_id | Ensure spans are active when recording metrics |
| Filter too restrictive | No exemplars for anomalies | Include error and high-latency conditions |
| High-cardinality filtered attributes | Storage bloat | Limit to 2-3 low-cardinality attributes |

### Debugging Missing Exemplars

If exemplars are not appearing, check these common issues.

```typescript
import { trace, context } from '@opentelemetry/api';

function debugExemplarContext() {
  const span = trace.getSpan(context.active());

  if (!span) {
    console.log('No active span - exemplars will not attach');
    return;
  }

  const spanCtx = span.spanContext();
  console.log('Trace ID:', spanCtx.traceId);
  console.log('Span ID:', spanCtx.spanId);
  console.log('Is sampled:', (spanCtx.traceFlags & 0x01) === 1);

  if ((spanCtx.traceFlags & 0x01) !== 1) {
    console.log('Span is not sampled - exemplars will not attach');
  }
}
```

---

## 10. Putting It All Together

Here is a complete example showing metrics with exemplars in a real HTTP handler.

```typescript
import express from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

// Setup meter provider for metrics export
const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: 'https://oneuptime.com/otlp/v1/metrics',
        headers: { 'x-oneuptime-token': process.env.ONEUPTIME_TOKEN || '' }
      }),
      exportIntervalMillis: 15000
    })
  ]
});

const meter = meterProvider.getMeter('checkout-service');

// Create metrics
const requestDuration = meter.createHistogram('http.server.duration', {
  description: 'HTTP request duration',
  unit: 'ms'
});

const requestCount = meter.createCounter('http.server.requests', {
  description: 'Total HTTP requests'
});

const app = express();

app.post('/api/checkout', async (req, res) => {
  const startTime = Date.now();

  // The auto-instrumentation creates a span, or create manually
  const span = trace.getSpan(context.active());

  try {
    // Simulate checkout processing
    await processCheckout(req.body);

    res.json({ status: 'success' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    span?.setStatus({ code: SpanStatusCode.ERROR, message });
    res.status(500).json({ error: 'Checkout failed' });
  } finally {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    const attributes = {
      'http.method': 'POST',
      'http.route': '/api/checkout',
      'http.status_code': statusCode
    };

    // Record metrics while the request span is active so exemplars can include trace context.
    requestDuration.record(duration, attributes);
    requestCount.add(1, attributes);

    span?.setAttribute('checkout.duration_ms', duration);
  }
});

async function processCheckout(data: any): Promise<void> {
  // Simulate variable latency
  const delay = Math.random() * 800 + 100;
  await new Promise(resolve => setTimeout(resolve, delay));

  // Simulate occasional errors
  if (Math.random() < 0.05) {
    throw new Error('Payment gateway timeout');
  }
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

The workflow in production looks like this.

```mermaid
sequenceDiagram
    participant User
    participant Service
    participant Filter as Exemplar Filter
    participant Collector
    participant Backend as OneUptime

    User->>Service: POST /api/checkout
    Service->>Service: Start span (trace sampled)
    Service->>Service: Process request (847ms)
    Service->>Filter: Record metric (847ms)
    Filter->>Filter: sampled trace? Yes
    Filter->>Service: shouldSample = true
    Service->>Collector: Metric + Exemplar (trace_id)
    Service->>Collector: Trace spans
    Collector->>Backend: Export metrics
    Collector->>Backend: Export traces
    Backend->>Backend: Link exemplar to trace
    Note over Backend: Dashboard shows latency spike
    Note over Backend: Click exemplar -> view trace
```

---

## Summary

| Concept | Purpose |
|---------|---------|
| Exemplar | Links a metric data point to a specific trace |
| ExemplarFilter | Decides which measurements get exemplars attached |
| AlwaysOnExemplarFilter | Make all measurements eligible for exemplars |
| AlwaysOffExemplarFilter | Never attach exemplars |
| TraceBasedExemplarFilter | Only attach when trace is sampled (default) |
| Custom filter | Business logic for high-value measurements in SDKs with a public custom filter hook |

Exemplar filters give you control over the metrics-to-traces bridge. Use them to ensure that when something goes wrong, you can jump directly from the metric anomaly to the trace that explains it.

---

*Want to see exemplars in action? Send your OpenTelemetry metrics and traces to [OneUptime](https://oneuptime.com) and click any exemplar to instantly view the linked trace.*

---

### Related Reading

- [What are Traces and Spans in OpenTelemetry: A Practical Guide](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
