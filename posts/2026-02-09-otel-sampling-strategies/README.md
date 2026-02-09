# How to configure OpenTelemetry sampling strategies for trace volume control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sampling, Tracing, Performance, Observability

Description: Learn how to configure OpenTelemetry sampling strategies including always-on, probability-based, and parent-based sampling to control trace volume and reduce observability costs.

---

Sampling reduces the volume of traces sent to your observability backend while maintaining representative coverage of your application behavior. OpenTelemetry provides multiple sampling strategies that let you balance between complete visibility and resource efficiency.

## Understanding Sampling

Sampling makes sampling decisions at trace creation time, determining whether to record and export a trace. Sampled traces include all spans, while unsampled traces are dropped completely. The sampling decision propagates to downstream services to keep trace consistency.

Head-based sampling makes decisions at the start of a trace based on available information like trace ID or service name. This approach is efficient but may miss interesting traces like errors that occur later in request processing.

## Always-On Sampling

The always-on sampler records every trace. This provides complete visibility but generates high data volume and costs. Use it for low-traffic services or during debugging.

```python
# always_on_sampling.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ALWAYS_ON
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Configure tracer provider with always-on sampling
tracer_provider = TracerProvider(sampler=ALWAYS_ON)

# Add exporter
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:4317")
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Set as global tracer provider
trace.set_tracer_provider(tracer_provider)

# Get tracer
tracer = trace.get_tracer(__name__)

# Every trace is sampled
with tracer.start_as_current_span("operation") as span:
    span.set_attribute("sampled", "always")
```

Always-on sampling works well for development environments or services with low request rates where capturing every trace is feasible.

## Probability-Based Sampling

Probability sampling samples a percentage of traces based on the sampling rate. A rate of 0.1 samples 10% of traces, while 1.0 samples 100%.

```python
# probability_sampling.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Sample 10% of traces
sampling_rate = 0.1
sampler = TraceIdRatioBased(sampling_rate)

# Configure tracer provider
tracer_provider = TracerProvider(sampler=sampler)

# Add exporter
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:4317")
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

trace.set_tracer_provider(tracer_provider)

tracer = trace.get_tracer(__name__)

# Only 10% of traces are sampled
with tracer.start_as_current_span("sampled_operation") as span:
    span.set_attribute("sampling.rate", sampling_rate)
```

Probability sampling provides predictable trace volume and works well for high-traffic services where sampling most traces still gives good coverage.

## Parent-Based Sampling

Parent-based sampling respects the sampling decision made by parent spans. This ensures distributed traces remain consistent across service boundaries.

```python
# parent_based_sampling.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased, ALWAYS_ON
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Create root sampler (for traces without parents)
root_sampler = TraceIdRatioBased(0.1)  # Sample 10% of root traces

# Create parent-based sampler
# If parent is sampled, child is sampled
# If parent is not sampled, child is not sampled
sampler = ParentBased(
    root=root_sampler,
    remote_parent_sampled=ALWAYS_ON,     # Always sample if remote parent was sampled
    remote_parent_not_sampled=ALWAYS_ON,  # Never sample if remote parent was not sampled
)

# Configure tracer provider
tracer_provider = TracerProvider(sampler=sampler)
otlp_exporter = OTLPSpanExporter(endpoint="http://localhost:4317")
tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

trace.set_tracer_provider(tracer_provider)
tracer = trace.get_tracer(__name__)

# Sampling decision follows parent
with tracer.start_as_current_span("parent_aware_operation") as span:
    span.set_attribute("follows.parent", "true")
```

Parent-based sampling is the recommended default for distributed systems because it maintains trace consistency across services.

## Environment Variable Configuration

Configure sampling using environment variables for easier deployment management without code changes.

```bash
# .env file for probability sampling
export OTEL_TRACES_SAMPLER=traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling rate

# Parent-based with probability root sampler
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.25  # 25% sampling rate for root spans

# Always on sampling
export OTEL_TRACES_SAMPLER=always_on

# Always off sampling (for testing)
export OTEL_TRACES_SAMPLER=always_off
```

Environment variables provide flexibility to adjust sampling rates without redeploying applications.

## Collector-Side Sampling Configuration

Configure sampling at the collector level using the probabilistic sampler processor.

```yaml
# collector-sampling-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Probabilistic sampling processor
  probabilistic_sampler:
    sampling_percentage: 10  # Sample 10% of traces
    hash_seed: 22           # Consistent sampling across collectors

  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [probabilistic_sampler, batch]
      exporters: [otlp]
```

Collector-side sampling provides centralized control over sampling rates across multiple services.

## Rate-Limited Sampling

Implement rate-limited sampling to cap the maximum number of traces per second.

```python
# rate_limited_sampling.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, ReadableSpan
from opentelemetry.sdk.trace.sampling import Sampler, Decision, SamplingResult
from opentelemetry.trace import Link, SpanKind
from opentelemetry.context import Context
import time
import threading

class RateLimitingSampler(Sampler):
    """Custom sampler that limits traces per second"""

    def __init__(self, traces_per_second: int):
        self.traces_per_second = traces_per_second
        self.current_count = 0
        self.last_reset = time.time()
        self.lock = threading.Lock()

    def should_sample(
        self,
        parent_context: Context,
        trace_id: int,
        name: str,
        kind: SpanKind = None,
        attributes: dict = None,
        links: list = None,
        trace_state: dict = None,
    ) -> SamplingResult:
        with self.lock:
            # Reset counter every second
            current_time = time.time()
            if current_time - self.last_reset >= 1.0:
                self.current_count = 0
                self.last_reset = current_time

            # Check if under rate limit
            if self.current_count < self.traces_per_second:
                self.current_count += 1
                return SamplingResult(
                    decision=Decision.RECORD_AND_SAMPLE,
                    attributes={"sampling.rate_limited": True},
                )
            else:
                return SamplingResult(
                    decision=Decision.DROP,
                    attributes={"sampling.rate_limited": False},
                )

    def get_description(self) -> str:
        return f"RateLimitingSampler({self.traces_per_second} traces/sec)"

# Use rate-limiting sampler
sampler = RateLimitingSampler(traces_per_second=100)
tracer_provider = TracerProvider(sampler=sampler)
trace.set_tracer_provider(tracer_provider)
```

Rate-limited sampling protects backends from trace volume spikes while maintaining consistent sampling during normal traffic.

## Composite Sampling Strategies

Combine multiple sampling strategies to create sophisticated sampling rules.

```python
# composite_sampling.py
from opentelemetry.sdk.trace.sampling import (
    Sampler, Decision, SamplingResult, ParentBased, TraceIdRatioBased
)
from opentelemetry.trace import SpanKind
from opentelemetry.context import Context

class CompositeS ampler(Sampler):
    """Sample based on multiple conditions"""

    def __init__(self, default_rate: float = 0.1):
        self.default_rate = default_rate
        self.probability_sampler = TraceIdRatioBased(default_rate)

    def should_sample(
        self,
        parent_context: Context,
        trace_id: int,
        name: str,
        kind: SpanKind = None,
        attributes: dict = None,
        links: list = None,
        trace_state: dict = None,
    ) -> SamplingResult:
        # Always sample errors
        if attributes and attributes.get("error", False):
            return SamplingResult(
                decision=Decision.RECORD_AND_SAMPLE,
                attributes={"sampling.rule": "error"},
            )

        # Always sample slow operations
        if attributes and attributes.get("duration_ms", 0) > 1000:
            return SamplingResult(
                decision=Decision.RECORD_AND_SAMPLE,
                attributes={"sampling.rule": "slow"},
            )

        # Always sample specific endpoints
        if "critical" in name.lower():
            return SamplingResult(
                decision=Decision.RECORD_AND_SAMPLE,
                attributes={"sampling.rule": "critical_endpoint"},
            )

        # Default to probability sampling
        result = self.probability_sampler.should_sample(
            parent_context, trace_id, name, kind, attributes, links, trace_state
        )

        # Add sampling rule attribute
        new_attributes = result.attributes or {}
        new_attributes["sampling.rule"] = "probability"

        return SamplingResult(
            decision=result.decision,
            attributes=new_attributes,
            trace_state=result.trace_state,
        )

    def get_description(self) -> str:
        return f"CompositeSampler(default_rate={self.default_rate})"
```

## Adjusting Sampling Rates

Adjust sampling rates dynamically based on traffic patterns and costs.

```python
# dynamic_sampling.py
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
import os

class DynamicSamplingConfig:
    """Manage sampling rates based on environment and time"""

    @staticmethod
    def get_sampling_rate():
        """Get sampling rate based on environment"""
        env = os.getenv("DEPLOYMENT_ENV", "development")
        hour = datetime.now().hour

        # Development: sample everything
        if env == "development":
            return 1.0

        # Staging: sample 50%
        elif env == "staging":
            return 0.5

        # Production: vary by time of day
        elif env == "production":
            # Sample more during business hours
            if 9 <= hour <= 17:
                return 0.05  # 5% during high traffic
            else:
                return 0.2   # 20% during low traffic

        return 0.1  # Default 10%

# Configure with dynamic rate
sampling_rate = DynamicSamplingConfig.get_sampling_rate()
sampler = TraceIdRatioBased(sampling_rate)
```

## Monitoring Sampling Effectiveness

Monitor sampling decisions to ensure you're capturing representative traces.

```python
# sampling_metrics.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
from opentelemetry.sdk.metrics import MeterProvider

# Set up metrics
meter_provider = MeterProvider()
meter = meter_provider.get_meter(__name__)

# Create sampling metrics
sampled_counter = meter.create_counter(
    "traces.sampled",
    description="Number of sampled traces"
)

dropped_counter = meter.create_counter(
    "traces.dropped",
    description="Number of dropped traces"
)

# Track sampling decisions
def track_sampling_decision(span):
    """Track whether span was sampled"""
    if span.is_recording():
        sampled_counter.add(1, {"service": "my-service"})
    else:
        dropped_counter.add(1, {"service": "my-service"})
```

## Best Practices

Follow these best practices for effective sampling strategies.

First, start with parent-based sampling with a reasonable probability root sampler. This balances cost and visibility while maintaining trace integrity across services.

Second, use higher sampling rates in non-production environments. Development and staging should sample 50-100% of traces for better debugging.

Third, consider implementing always-sample rules for errors and slow requests. These traces provide the most value for troubleshooting.

Fourth, monitor your sampling effectiveness. Track the ratio of sampled to dropped traces and adjust rates based on traffic patterns and costs.

Fifth, document your sampling strategy and rates. Make it easy for teams to understand what percentage of traffic is being traced.

OpenTelemetry sampling strategies provide flexible control over trace volume. Proper configuration balances observability needs with infrastructure costs while maintaining representative coverage of application behavior.
