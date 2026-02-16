# How to Fix Traces Not Appearing in Jaeger When Spans Are Marked with sampling_type 'unknown'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Jaeger, Sampling, Tracing

Description: Fix traces not appearing in Jaeger caused by spans being marked with sampling_type unknown due to missing sampling decisions.

You send traces from the OpenTelemetry Collector to Jaeger. The Collector logs confirm spans are being exported. But when you search in the Jaeger UI, the traces are missing. Digging into the Jaeger internals, you find spans tagged with `sampler.type: unknown` and `sampler.param: 0`.

## Why This Happens

Jaeger has its own sampling model that predates OpenTelemetry. When Jaeger receives spans via the OpenTelemetry protocol, it tries to map the OpenTelemetry sampling flag to its internal sampling type. If the mapping fails or the sampling flag is not set correctly, Jaeger tags the span with `sampler.type: unknown`.

Depending on Jaeger's storage configuration, spans with unknown sampling type might be:
- Stored but not indexed properly (making them unsearchable)
- Dropped entirely if Jaeger's internal sampling filter is active
- Visible only when queried by trace ID directly, not through the search UI

## Diagnosing the Problem

### Step 1: Query by Trace ID

If you know a trace ID (from application logs), query it directly in Jaeger:

```
http://jaeger:16686/trace/<trace-id>
```

If the trace appears when queried by ID but not through the search UI, the spans are stored but not indexed correctly.

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

If you see `sampler.type: unknown`, the issue is confirmed.

### Step 3: Check the W3C Trace Flags

OpenTelemetry uses the W3C trace context format. The trace flags byte indicates whether the trace is sampled. Check if your SDK is setting the `sampled` flag:

```go
// In your Go application
span := trace.SpanFromContext(ctx)
fmt.Println("TraceFlags:", span.SpanContext().TraceFlags())
// Should print: TraceFlags: 01 (sampled)
// If it prints: TraceFlags: 00 (not sampled), that's the problem
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

## Fix 2: Configure Jaeger to Accept All Incoming Spans

If you are doing sampling at the Collector level (tail sampling), you want Jaeger to accept everything the Collector sends. Update Jaeger's sampling configuration:

```yaml
# Jaeger environment variables
SAMPLING_CONFIG_TYPE: const
SAMPLING_CONFIG_PARAM: 1
```

Or if using Jaeger's collector component:

```yaml
# jaeger-collector configuration
collector:
  sampling:
    default-strategy:
      type: const
      param: 1
```

## Fix 3: Use the Collector to Set Sampling Tags

If you cannot change the SDK, use the Collector's `attributes` processor to set the correct sampling tags:

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

Newer versions of Jaeger support native OTLP ingestion, which handles the sampling flag correctly without needing the legacy Jaeger sampling tags:

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
# Jaeger configuration
collector:
  otlp:
    enabled: true
    grpc:
      host-port: 4317
    http:
      host-port: 4318
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

Also check that the sampling tags are correct:

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

The root cause is almost always that the sampling decision is not being communicated correctly between OpenTelemetry and Jaeger. Setting the sampler to `AlwaysOn` in the SDK and using OTLP ingestion in Jaeger resolves the issue in most cases.
