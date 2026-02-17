# How to Configure Trace Sampling Rates in Cloud Trace to Control Data Collection Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Trace, Sampling, OpenTelemetry, Performance Monitoring

Description: Learn how to configure trace sampling rates in Cloud Trace using OpenTelemetry samplers to balance observability needs with cost and performance overhead.

---

Tracing every single request in a high-traffic production system is neither practical nor necessary. If your service handles 10,000 requests per second, collecting a trace for each one would generate massive amounts of data, increase your Cloud Trace costs, and add measurable latency overhead to every request. This is where sampling comes in.

Sampling lets you collect traces for a representative subset of requests. The trick is choosing the right sampling strategy so you capture enough data to diagnose problems without drowning in volume.

## How Sampling Works in OpenTelemetry

OpenTelemetry implements sampling at two points in the trace lifecycle:

1. **Head-based sampling**: Decides whether to trace a request at the very beginning, before any work is done. This is the most common approach.
2. **Tail-based sampling**: Decides whether to keep a trace after it is complete, based on characteristics like duration or error status. This requires a separate collector.

Cloud Trace itself does not enforce sampling - it accepts whatever you send. The sampling decision happens in your application through OpenTelemetry's sampler configuration.

## Built-in OpenTelemetry Samplers

OpenTelemetry provides several sampler implementations out of the box.

### Always On / Always Off

The simplest samplers. Use AlwaysOn for development and AlwaysOff to disable tracing entirely.

```python
# Always sample every request (good for development, bad for production)
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ALWAYS_ON, ALWAYS_OFF

# Trace everything
provider = TracerProvider(sampler=ALWAYS_ON)

# Trace nothing
provider = TracerProvider(sampler=ALWAYS_OFF)
```

### TraceIdRatioBased Sampler

This sampler traces a fixed percentage of requests based on the trace ID. It is deterministic, meaning the same trace ID always gets the same sampling decision across services.

This example configures a 10% sampling rate, which means roughly 1 in 10 requests will be traced.

```python
# Sample 10% of requests based on trace ID
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# 0.1 means 10% of traces will be sampled
sampler = TraceIdRatioBased(0.1)
provider = TracerProvider(sampler=sampler)
```

The deterministic nature is important for distributed systems. If Service A decides to sample a request, Service B will make the same decision when it receives the propagated trace context. This prevents partial traces where half the spans are missing.

### ParentBased Sampler

This sampler respects the parent span's sampling decision. If an incoming request already has a trace context that says "sample this," the sampler honors that decision. If there is no parent, it falls back to a configurable root sampler.

```python
# Use parent's decision for child spans, 20% sampling for root spans
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased

sampler = ParentBased(
    root=TraceIdRatioBased(0.2),  # 20% for new traces
    # Remote parent sampled: always sample (default)
    # Remote parent not sampled: never sample (default)
)

provider = TracerProvider(sampler=sampler)
```

This is the recommended approach for microservices because it ensures consistency across the entire request chain.

## Configuring Sampling in Node.js

Here is the equivalent setup in Node.js using the OpenTelemetry SDK.

```javascript
// tracing.js - Node.js sampling configuration
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { TraceExporter } = require('@google-cloud/opentelemetry-cloud-trace-exporter');
const {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Configure a ParentBased sampler with 15% root sampling
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.15),
});

const sdk = new NodeSDK({
  traceExporter: new TraceExporter(),
  sampler: sampler,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

## Building a Custom Sampler

Sometimes the built-in samplers are not enough. You might want to always sample error responses, sample more aggressively for slow requests, or sample specific endpoints at a higher rate.

Here is a custom Python sampler that always traces errors and slow requests, while sampling normal requests at 5%.

```python
# custom_sampler.py - Sample errors and slow requests at 100%, everything else at 5%
from opentelemetry.sdk.trace.sampling import (
    Sampler,
    SamplingResult,
    Decision,
    TraceIdRatioBased,
)
from opentelemetry.trace import SpanKind
from opentelemetry.context import Context


class SmartSampler(Sampler):
    """Custom sampler that prioritizes errors and important endpoints."""

    def __init__(self, default_rate=0.05, important_paths=None):
        # Fallback sampler for normal requests
        self._default_sampler = TraceIdRatioBased(default_rate)
        # Paths that should always be sampled
        self._important_paths = important_paths or ["/api/checkout", "/api/payment"]

    def should_sample(self, parent_context, trace_id, name, kind, attributes, links):
        # Always sample if the span name matches an important path
        if attributes:
            path = attributes.get("http.target", "")
            if any(important in path for important in self._important_paths):
                return SamplingResult(
                    Decision.RECORD_AND_SAMPLE,
                    attributes,
                )

        # Delegate to the ratio-based sampler for everything else
        return self._default_sampler.should_sample(
            parent_context, trace_id, name, kind, attributes, links
        )

    def get_description(self):
        return "SmartSampler(default_rate=0.05)"


# Use the custom sampler
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ParentBased

sampler = ParentBased(
    root=SmartSampler(
        default_rate=0.05,
        important_paths=["/api/checkout", "/api/payment", "/api/auth"]
    )
)

provider = TracerProvider(sampler=sampler)
```

## Tail-Based Sampling with the OTel Collector

For more sophisticated sampling, you can deploy the OpenTelemetry Collector and use its tail-based sampling processor. This collects all spans first, then decides which traces to keep based on the complete trace data.

Here is an OpenTelemetry Collector configuration for tail-based sampling.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Tail-based sampling processor
  tail_sampling:
    # How long to wait for spans before making a decision
    decision_wait: 10s
    # Number of traces to keep in memory
    num_traces: 100000
    policies:
      # Always keep traces with errors
      - name: errors-policy
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Always keep slow traces (over 2 seconds)
      - name: latency-policy
        type: latency
        latency:
          threshold_ms: 2000
      # Sample 10% of everything else
      - name: probabilistic-policy
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  googlecloud:
    project: your-project-id

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [googlecloud]
```

With tail-based sampling, you configure your application to export all spans to the collector (with AlwaysOn sampling), and the collector makes the final decision about what to keep.

## Choosing the Right Sampling Rate

There is no universal answer, but here are some guidelines based on traffic volume:

- **Under 100 requests/second**: Sample at 100%. The cost is minimal and you get full visibility.
- **100-1,000 requests/second**: Sample at 10-25%. This gives you plenty of data for analysis.
- **1,000-10,000 requests/second**: Sample at 1-5%. Combined with always-sample-errors, this is usually sufficient.
- **Over 10,000 requests/second**: Sample at 0.1-1% with smart sampling for errors and slow requests.

## Environment-Based Configuration

A practical approach is to set the sampling rate through environment variables so you can adjust it without redeploying.

```python
# Configure sampling rate from environment variable
import os
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased

# Default to 10% sampling, override with TRACE_SAMPLE_RATE env var
sample_rate = float(os.environ.get("TRACE_SAMPLE_RATE", "0.1"))

sampler = ParentBased(root=TraceIdRatioBased(sample_rate))
provider = TracerProvider(sampler=sampler)
```

```bash
# Set different sampling rates per environment
# Development - trace everything
TRACE_SAMPLE_RATE=1.0

# Staging - trace 50%
TRACE_SAMPLE_RATE=0.5

# Production - trace 5%
TRACE_SAMPLE_RATE=0.05
```

## Wrapping Up

Sampling is a balancing act between visibility and cost. Start with a ParentBased sampler using TraceIdRatioBased at 10%, add always-on sampling for errors and critical paths, and adjust the rate based on your traffic volume and budget. If you need more sophistication, deploy the OpenTelemetry Collector with tail-based sampling to make decisions based on complete trace data rather than guessing at the start of each request.
