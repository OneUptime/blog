# How to Fix Traces Not Appearing in Jaeger When Spans Are Marked with

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Jaeger, Sampling, Tracing

Description: Fix traces not appearing in Jaeger caused by spans being marked with sampling_type unknown due to missing sampling decisions.

You send traces from the OpenTelemetry Collector to Jaeger. The Collector logs confirm spans are being exported. But when you search in the Jaeger UI, the traces are missing. Digging into the Jaeger internals, you find spans tagged with `sampler.type: unknown` and `sampler.param: 0`.

## Why This Happens

Jaeger has its own sampling model that predates OpenTelemetry. The `sampler.type` and `sampler.param` tags are legacy Jaeger SDK metadata, while OpenTelemetry communicates the actual sampled decision through the W3C `traceparent` trace-flags byte.

If that sampled flag is not set, an OpenTelemetry SDK normally treats the span as not sampled and will not record and export it. If spans do reach Jaeger but have missing or unrecognized legacy sampler tags, Jaeger adaptive-sampling calculations can ignore those sampler tags, but the tags by themselves are not a general reason for Jaeger search to drop or de-index the trace.

If a trace appears when queried by trace ID but not through the search UI, also check the service name, operation name, time range, tenant headers, and storage index configuration.

## Diagnosing the Problem

### Step 1: Query by Trace ID

If you know a trace ID (from application logs), query it directly in Jaeger:

```text
http://jaeger:16686/trace/<trace-id>
```

If the trace appears when queried by ID but not through the search UI, the spans are stored, but the service name, operation name, time range, tenant headers, or storage index may not match your search.

### Step 2: Check Span Tags

Look at the span's tags in the Jaeger response. The relevant tags are:

```json
{
    "tags": [
        {"key": "sampler.type", "value": "unknown"},
        {"key": "sampler.param", "value": "0"}
    ]
}
```

If you see `sampler.type: unknown`, you have confirmed that the legacy Jaeger sampler metadata is missing or unrecognized. Check the W3C sampled flag next to confirm whether the OpenTelemetry sampling decision is also missing.

### Step 3: Check the W3C Trace Flags

OpenTelemetry uses the W3C trace context format. The trace flags byte indicates whether the trace is sampled. Check if your SDK is setting the `sampled` flag:

```go
// In your Go application
span := trace.SpanFromContext(ctx)
fmt.Println("TraceFlags:", span.SpanContext().TraceFlags())
// Should print: TraceFlags: 01 (sampled)
// If it prints: TraceFlags: 00, the span context is not sampled
```

## Fix 1: Ensure the SDK Sampling Decision Propagates

Make sure your OpenTelemetry SDK uses a sampler that sets the trace flag:

```go
// Go SDK
tp := sdktrace.NewTracerProvider(
    sdktrace.WithSampler(sdktrace.AlwaysSample()),
    sdktrace.WithBatcher(exporter),
)
```

```csharp
// .NET SDK
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .SetSampler(new AlwaysOnSampler())
            .AddOtlpExporter();
    });
```

```python
# Python SDK

from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ALWAYS_ON

provider = TracerProvider(sampler=ALWAYS_ON)
```

## Fix 2: Configure Remote Sampling to Sample New Traces

If your clients use Jaeger remote sampling, configure the remote sampling strategy so new root traces are sampled. Jaeger's remote sampling strategy file supports `probabilistic` and `ratelimiting` strategy types, so use a probability of `1.0` to sample everything:

```json
{
  "default_strategy": {
    "type": "probabilistic",
    "param": 1.0
  }
}
```

Then point Jaeger at that strategy file:

```yaml
# Jaeger environment variables
SAMPLING_CONFIG_TYPE: file
SAMPLING_STRATEGIES_FILE: /etc/jaeger/sampling-strategies.json
```

## Fix 3: Use the Collector to Set Legacy Sampling Tags

If you cannot change the SDK and you still depend on Jaeger's legacy adaptive-sampling logic, use the Collector's `attributes` processor to add the legacy sampling tags. This does not change the W3C sampled flag, so it is not a substitute for configuring the SDK or tail-sampling policy correctly.

```yaml
processors:
  attributes/sampling:
    actions:
    - key: sampler.type
      value: "const"
      action: upsert
    - key: sampler.param
      value: "1"
      action: upsert

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/sampling, batch]
      exporters: [otlp/jaeger]
```

## Fix 4: Switch Jaeger to OTLP Native Ingestion

Jaeger supports native OTLP ingestion, which reads OpenTelemetry trace data directly and does not require legacy Jaeger sampling tags:

```yaml
# Collector exporter config - use OTLP directly
exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
```

Make sure Jaeger is configured to accept OTLP:

```yaml
# Jaeger environment variables
COLLECTOR_OTLP_ENABLED: "true"
COLLECTOR_OTLP_GRPC_HOST_PORT: ":4317"
COLLECTOR_OTLP_HTTP_HOST_PORT: ":4318"
```

## Verifying the Fix

After applying the fix, send a test trace and verify it appears in Jaeger search:

```bash
# Send a test span using otel-cli
otel-cli span \
  --service "test-service" \
  --name "test-span" \
  --endpoint "localhost:4317"

# Wait a few seconds, then search in Jaeger UI
# http://jaeger:16686/search?service=test-service
```

If you still rely on legacy Jaeger sampling tags, check that those tags are present:

```bash
# Query Jaeger API directly
curl -s "http://jaeger:16686/api/traces?service=test-service&limit=1" | \
  jq '.data[0].spans[0].tags[] | select(.key | startswith("sampler"))'
```

You should see:
```json
{"key": "sampler.type", "value": "const"}
{"key": "sampler.param", "value": "1"}
```

The root cause is usually that the sampling decision is not being communicated correctly between OpenTelemetry components, or that legacy Jaeger sampler tags are being mistaken for the OpenTelemetry sampled flag. Setting the sampler to `AlwaysOn` in the SDK and using OTLP ingestion in Jaeger resolves the issue in most cases.
