# How to Configure OpenTelemetry Sampling Strategies to Reduce Cost on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, OpenTelemetry, Cloud Trace, Observability, Cost Optimization

Description: Learn how to configure OpenTelemetry sampling strategies to reduce tracing costs on Google Cloud while maintaining visibility into important transactions and errors.

---

Tracing every single request in a production system generates an enormous volume of data. If you are sending all of that to Cloud Trace on Google Cloud, the costs pile up quickly. The solution is sampling - deciding which traces to keep and which to discard. But sample too aggressively and you lose visibility into the requests that matter. Sample too little and you are paying for millions of routine health check traces.

Getting sampling right is about finding the balance between cost and visibility. In this post, I will walk through the different sampling strategies available in OpenTelemetry and how to configure them for Google Cloud.

## Understanding Sampling in OpenTelemetry

OpenTelemetry supports two types of sampling:

**Head-based sampling** makes the sampling decision at the start of a trace (at the root span). If the trace is sampled, all spans in the trace are recorded. If not, none are. The decision propagates to all downstream services.

**Tail-based sampling** waits until a trace is complete, then decides whether to keep it based on the full picture (duration, error status, specific attributes). This is more powerful but requires more infrastructure.

Let's start with head-based sampling since it is simpler to set up.

## Head-Based Sampling Configuration

### Probability Sampler

The simplest approach samples a fixed percentage of traces:

```python
# Python: Configure a probability-based sampler
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Sample 10% of all traces
sampler = TraceIdRatioBased(0.10)

# Create provider with the sampler
provider = TracerProvider(sampler=sampler)

# Add the Cloud Trace exporter
exporter = CloudTraceSpanExporter()
provider.add_span_processor(BatchSpanProcessor(exporter))

# Set as the global provider
trace.set_tracer_provider(provider)
```

With a 10% sampling rate, you reduce your trace volume (and cost) by 90% while still getting a statistically representative picture of your system behavior.

### Parent-Based Sampler

In a microservices architecture, you want downstream services to respect the sampling decision made by the root service. The parent-based sampler does this:

```python
# Python: Parent-based sampler that respects upstream decisions
from opentelemetry.sdk.trace.sampling import (
    ParentBased,
    TraceIdRatioBased,
    ALWAYS_ON,
)

# If the parent span was sampled, always sample the child
# If there is no parent (root span), sample 10%
sampler = ParentBased(
    root=TraceIdRatioBased(0.10),
)

provider = TracerProvider(sampler=sampler)
```

This is the recommended default for most services. It ensures that if a trace is sampled at the edge, every service in the chain records its spans for that trace.

### Rule-Based Sampler

For more control, you can combine samplers based on span attributes. Here is how to always sample error traces while sampling only 5% of normal traffic:

```python
# Python: Custom rule-based sampler
from opentelemetry.sdk.trace.sampling import (
    Sampler,
    Decision,
    ParentBased,
    TraceIdRatioBased,
    ALWAYS_ON,
)
from opentelemetry.context import Context
from opentelemetry.trace import SpanKind
from typing import Optional, Sequence

class RuleBasedSampler(Sampler):
    """Custom sampler that applies different rates based on attributes."""

    def __init__(self, default_rate=0.05):
        # Default sampler for normal traffic
        self._default_sampler = TraceIdRatioBased(default_rate)
        # Always sample these paths
        self._always_sample_paths = ['/api/payment', '/api/checkout']

    def should_sample(
        self,
        parent_context: Optional[Context],
        trace_id: int,
        name: str,
        kind: SpanKind = None,
        attributes=None,
        links=None,
    ):
        # Always sample critical endpoints
        if attributes:
            http_target = attributes.get('http.target', '')
            for path in self._always_sample_paths:
                if path in str(http_target):
                    return Decision.RECORD_AND_SAMPLE, attributes, []

        # Use default rate for everything else
        return self._default_sampler.should_sample(
            parent_context, trace_id, name, kind, attributes, links
        )

    def get_description(self):
        return "RuleBasedSampler"

# Use the custom sampler
sampler = ParentBased(root=RuleBasedSampler(default_rate=0.05))
provider = TracerProvider(sampler=sampler)
```

## Configuring Sampling in the OpenTelemetry Collector

If you are using the OpenTelemetry Collector as a gateway (which is recommended for production), you can configure sampling there instead of in your application code:

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
  # Probabilistic sampler in the collector pipeline
  probabilistic_sampler:
    # Hash the trace ID to decide sampling
    hash_seed: 22
    # Keep 15% of traces
    sampling_percentage: 15

  # Batch processor for efficient export
  batch:
    timeout: 5s
    send_batch_size: 256

exporters:
  googlecloud:
    project: my-project

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [probabilistic_sampler, batch]
      exporters: [googlecloud]
```

## Sampling Strategy by Service Type

Different services need different sampling rates. Here is a practical approach:

```yaml
# Different collector pipelines for different service tiers
service:
  pipelines:
    # Critical path services: higher sampling rate
    traces/critical:
      receivers: [otlp]
      processors: [filter/critical, probabilistic_sampler/high, batch]
      exporters: [googlecloud]

    # Internal services: lower sampling rate
    traces/internal:
      receivers: [otlp]
      processors: [filter/internal, probabilistic_sampler/low, batch]
      exporters: [googlecloud]

processors:
  # High rate for payment and auth services
  probabilistic_sampler/high:
    sampling_percentage: 50

  # Low rate for background workers
  probabilistic_sampler/low:
    sampling_percentage: 5

  # Route traces based on service name
  filter/critical:
    traces:
      include:
        match_type: regexp
        services: ["payment-.*", "auth-.*", "checkout-.*"]

  filter/internal:
    traces:
      include:
        match_type: regexp
        services: ["worker-.*", "cron-.*", "internal-.*"]
```

## Estimating Cost Savings

Here is how to estimate the impact of different sampling rates:

```python
# Simple cost estimation script
def estimate_trace_cost(
    requests_per_day: int,
    avg_spans_per_trace: int,
    sampling_rate: float,
    cost_per_million_spans: float = 0.20
):
    """Estimate monthly Cloud Trace cost with a given sampling rate."""
    daily_spans = requests_per_day * avg_spans_per_trace * sampling_rate
    monthly_spans = daily_spans * 30
    monthly_cost = (monthly_spans / 1_000_000) * cost_per_million_spans

    return {
        'sampling_rate': f'{sampling_rate * 100}%',
        'daily_spans': int(daily_spans),
        'monthly_spans': int(monthly_spans),
        'monthly_cost_usd': round(monthly_cost, 2),
    }

# Compare costs at different sampling rates
requests = 10_000_000  # 10M requests per day
spans = 8  # Average 8 spans per trace

for rate in [1.0, 0.5, 0.25, 0.10, 0.05, 0.01]:
    result = estimate_trace_cost(requests, spans, rate)
    print(f"{result['sampling_rate']:>6} -> "
          f"{result['monthly_spans']:>12,} spans/month -> "
          f"${result['monthly_cost_usd']:>8}/month")
```

Running this shows the dramatic difference:

```
  100% -> 2,400,000,000 spans/month ->   $480.00/month
   50% -> 1,200,000,000 spans/month ->   $240.00/month
   25% ->   600,000,000 spans/month ->   $120.00/month
   10% ->   240,000,000 spans/month ->    $48.00/month
    5% ->   120,000,000 spans/month ->    $24.00/month
    1% ->    24,000,000 spans/month ->     $4.80/month
```

## Always-Sample Error Traces

Regardless of your base sampling rate, you should always capture error traces. Here is a processor configuration that ensures errors are never dropped:

```yaml
# Collector config that preserves all error traces
processors:
  # Filter processor that keeps all error spans
  filter/errors:
    error_mode: propagate
    traces:
      span:
        - 'status.code == STATUS_CODE_ERROR'

  # Group traces by trace ID for tail-based sampling
  groupbytrace:
    wait_duration: 10s
    num_traces: 10000

  # Tail sampling that always keeps errors
  tail_sampling:
    decision_wait: 10s
    policies:
      # Always keep error traces
      - name: errors-policy
        type: status_code
        status_code: {status_codes: [ERROR]}
      # Sample 10% of successful traces
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: {sampling_percentage: 10}
```

## Monitoring Your Sampling

After configuring sampling, monitor that it is working correctly. Check these metrics:

1. **Spans received vs exported** - The collector exposes metrics about how many spans it receives and how many it exports. A large gap confirms sampling is working.
2. **Trace completeness** - Verify that sampled traces have all their spans, not partial traces.
3. **Error coverage** - Confirm that error traces are being captured at 100%.

You can set up alerts in OneUptime to watch for sudden changes in trace volume, which could indicate a misconfigured sampler.

## Practical Recommendations

For most teams running on Google Cloud, here is a sensible starting configuration:

- **Edge/API gateway services:** 20-50% sampling rate
- **Core business services (payment, auth):** 50-100% sampling rate
- **Internal/background services:** 5-10% sampling rate
- **Health checks and internal probes:** 0% (filter them out entirely)
- **Error traces:** Always 100%

Start with these rates, monitor your Cloud Trace costs for a month, and adjust. The goal is to have enough trace data to debug any production issue within minutes, without paying for traces you will never look at.
