# How to Tag Chaos Engineering Experiments in OpenTelemetry Spans for Isolated Failure Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Chaos Engineering, Span Attributes, Failure Analysis, Observability

Description: Tag your OpenTelemetry spans with chaos experiment metadata so you can isolate and analyze failure behavior separately from normal traffic.

When you run chaos experiments in production or staging, the telemetry data mixes with normal traffic. This makes it hard to answer basic questions: "Did this error happen because of the chaos experiment, or is it a real bug?" Tagging spans with experiment metadata solves this problem. You can filter, group, and analyze chaos-affected traffic independently.

## The Tagging Strategy

Every chaos experiment should inject three pieces of information into spans:

1. The experiment name (e.g., "payment-latency-500ms")
2. The experiment ID (a unique run identifier)
3. The experiment type (e.g., "network-delay", "pod-kill", "cpu-stress")

These attributes let you query for all spans affected by a specific experiment and compare them against your baseline.

## Injecting Experiment Tags via Baggage

The cleanest approach is to use OpenTelemetry Baggage. Baggage propagates key-value pairs across service boundaries along with trace context. Set baggage at the entry point of your system, and every downstream service can read it.

```python
# chaos_baggage_middleware.py
from opentelemetry import baggage, context
from opentelemetry.context import attach, detach

class ChaosBaggageMiddleware:
    """Middleware that reads chaos experiment headers and sets them as baggage."""

    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        # Chaos Mesh or your chaos tool can set these headers on injected traffic
        experiment_name = environ.get('HTTP_X_CHAOS_EXPERIMENT', '')
        experiment_id = environ.get('HTTP_X_CHAOS_EXPERIMENT_ID', '')
        experiment_type = environ.get('HTTP_X_CHAOS_TYPE', '')

        if experiment_name:
            # Set baggage so all downstream services receive this info
            ctx = baggage.set_baggage("chaos.experiment.name", experiment_name)
            ctx = baggage.set_baggage("chaos.experiment.id", experiment_id, context=ctx)
            ctx = baggage.set_baggage("chaos.experiment.type", experiment_type, context=ctx)
            token = attach(ctx)

            try:
                return self.app(environ, start_response)
            finally:
                detach(token)
        else:
            return self.app(environ, start_response)
```

## Converting Baggage to Span Attributes

Baggage propagates across services but does not automatically appear on spans. Use a custom SpanProcessor to copy baggage values to span attributes:

```python
# baggage_span_processor.py
from opentelemetry import baggage
from opentelemetry.sdk.trace import SpanProcessor

class BaggageToSpanProcessor(SpanProcessor):
    """Copies chaos-related baggage entries to span attributes."""

    CHAOS_KEYS = [
        "chaos.experiment.name",
        "chaos.experiment.id",
        "chaos.experiment.type",
    ]

    def on_start(self, span, parent_context=None):
        for key in self.CHAOS_KEYS:
            value = baggage.get_baggage(key, context=parent_context)
            if value:
                span.set_attribute(key, value)

    def on_end(self, span):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        pass
```

Register this processor when you configure your tracer:

```python
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter

provider = TracerProvider()

# Add the baggage processor BEFORE the batch exporter
provider.add_span_processor(BaggageToSpanProcessor())
provider.add_span_processor(BatchSpanExporter(your_exporter))
```

## Tagging via the OpenTelemetry Collector

If you cannot modify application code, use the OpenTelemetry Collector's transform processor to tag spans based on external signals:

```yaml
# collector-config.yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Tag spans from pods that have chaos-mesh annotations
          - set(attributes["chaos.experiment.active"], "true")
            where resource.attributes["k8s.pod.annotation.chaos-mesh.org/experiment"] != nil

          # Extract the experiment name from the pod annotation
          - set(attributes["chaos.experiment.name"],
              resource.attributes["k8s.pod.annotation.chaos-mesh.org/experiment"])
            where resource.attributes["k8s.pod.annotation.chaos-mesh.org/experiment"] != nil
```

## Filtering Chaos Traffic in Queries

Once spans are tagged, you can write precise queries. Here are some examples:

```promql
# Compare error rates: chaos traffic vs normal traffic
# Chaos-affected error rate
sum(rate(span_errors_total{chaos_experiment_active="true"}[5m]))
/
sum(rate(span_total{chaos_experiment_active="true"}[5m]))

# Normal traffic error rate (baseline)
sum(rate(span_errors_total{chaos_experiment_active!="true"}[5m]))
/
sum(rate(span_total{chaos_experiment_active!="true"}[5m]))
```

For trace queries, filter by the experiment attributes:

```bash
# Find all traces from a specific chaos experiment
curl -G "http://trace-backend/api/traces" \
  --data-urlencode 'tags=chaos.experiment.name:payment-latency-500ms' \
  --data-urlencode 'limit=50'
```

## Automating Before/After Comparison

Write a script that captures baseline metrics, runs the chaos experiment, and then compares:

```python
# chaos_comparison.py
import time
import requests

def run_chaos_comparison(trace_backend, experiment_duration_sec=300):
    # Phase 1: Capture baseline (5 minutes before chaos)
    baseline_end = int(time.time() * 1_000_000)
    baseline_start = baseline_end - (experiment_duration_sec * 1_000_000)

    baseline_traces = requests.get(f"{trace_backend}/api/traces", params={
        "start": baseline_start,
        "end": baseline_end,
        "tags": "chaos.experiment.active:!true",
    }).json()

    # Phase 2: Chaos is running, capture affected traces
    time.sleep(experiment_duration_sec)
    chaos_end = int(time.time() * 1_000_000)
    chaos_start = chaos_end - (experiment_duration_sec * 1_000_000)

    chaos_traces = requests.get(f"{trace_backend}/api/traces", params={
        "start": chaos_start,
        "end": chaos_end,
        "tags": "chaos.experiment.active:true",
    }).json()

    # Compare key metrics
    baseline_avg = avg_duration(baseline_traces)
    chaos_avg = avg_duration(chaos_traces)

    print(f"Baseline avg duration: {baseline_avg:.2f}ms")
    print(f"Chaos avg duration: {chaos_avg:.2f}ms")
    print(f"Impact: {((chaos_avg - baseline_avg) / baseline_avg) * 100:.1f}% increase")

def avg_duration(traces_response):
    durations = []
    for trace in traces_response.get("traces", []):
        root_span = trace["spans"][0]
        durations.append(root_span["duration"] / 1000)  # Convert to ms
    return sum(durations) / len(durations) if durations else 0
```

## Span Events for Chaos Milestones

Beyond attributes, use span events to mark when a chaos experiment starts and stops:

```python
from opentelemetry import trace

tracer = trace.get_tracer("chaos-controller")

def start_experiment(name, experiment_type):
    span = trace.get_current_span()
    span.add_event("chaos.experiment.started", attributes={
        "chaos.experiment.name": name,
        "chaos.experiment.type": experiment_type,
    })

def stop_experiment(name):
    span = trace.get_current_span()
    span.add_event("chaos.experiment.stopped", attributes={
        "chaos.experiment.name": name,
    })
```

Tagging chaos experiments in your spans is a small investment that pays off every time you need to figure out whether a production issue is real or experiment-induced. The separation it provides makes chaos testing safer and the results far more actionable.
