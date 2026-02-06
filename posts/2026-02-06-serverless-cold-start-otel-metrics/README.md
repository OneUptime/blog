# How to Monitor Cold Start Performance Degradation in Serverless Functions with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Serverless, Cold Start, AWS Lambda, Performance Monitoring

Description: Monitor and track cold start performance degradation in serverless functions using OpenTelemetry metrics to identify and fix initialization bottlenecks.

Cold starts are the Achilles' heel of serverless computing. When a function has not been invoked recently, the platform needs to provision a new execution environment, and that initialization time gets added to the request latency. Monitoring cold start frequency and duration over time with OpenTelemetry helps you spot degradation before it impacts your users.

## Detecting Cold Starts in Your Function

The first step is reliably detecting whether a given invocation is a cold start. In AWS Lambda, you can do this by checking if a global variable has been initialized:

```python
# lambda_handler.py
import time
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

# This runs during initialization (cold start)
INIT_START = time.time()

# Track whether this is the first invocation in this container
_is_cold_start = True

# Set up OpenTelemetry during init
resource = Resource.create({
    "service.name": "order-processor",
    "faas.name": "order-processor",
    "cloud.provider": "aws",
    "cloud.platform": "aws_lambda",
})

# Initialize tracer
trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)

# Initialize meter
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=10000,
)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

meter = metrics.get_meter("lambda-cold-start")
tracer = trace.get_tracer("lambda-cold-start")

# Metrics for cold start tracking
cold_start_duration = meter.create_histogram(
    "faas.coldstart.duration",
    unit="ms",
    description="Duration of cold start initialization",
)
cold_start_counter = meter.create_counter(
    "faas.coldstart.count",
    description="Number of cold start invocations",
)
warm_start_counter = meter.create_counter(
    "faas.warmstart.count",
    description="Number of warm start invocations",
)

INIT_END = time.time()
INIT_DURATION_MS = (INIT_END - INIT_START) * 1000


def handler(event, context):
    global _is_cold_start

    with tracer.start_as_current_span("lambda_invocation") as span:
        span.set_attribute("faas.cold_start", _is_cold_start)
        span.set_attribute("faas.invocation_id", context.aws_request_id)
        span.set_attribute("faas.memory_size", context.memory_limit_in_mb)

        if _is_cold_start:
            # Record cold start metrics
            cold_start_counter.add(1, {
                "faas.name": context.function_name,
                "faas.version": context.function_version,
                "faas.memory_mb": str(context.memory_limit_in_mb),
            })
            cold_start_duration.record(INIT_DURATION_MS, {
                "faas.name": context.function_name,
                "faas.version": context.function_version,
            })
            span.set_attribute("faas.coldstart.duration_ms", INIT_DURATION_MS)
            _is_cold_start = False
        else:
            warm_start_counter.add(1, {"faas.name": context.function_name})

        # Your actual business logic
        result = process_order(event)
        return result
```

## Breaking Down Cold Start Phases

A cold start has multiple phases, and knowing which phase is slow is critical. Instrument each phase separately:

```python
# init_phases.py
import time

class InitPhaseTracker:
    def __init__(self, meter):
        self.meter = meter
        self.phase_histogram = meter.create_histogram(
            "faas.coldstart.phase.duration",
            unit="ms",
            description="Duration of individual cold start phases",
        )
        self.phases = {}
        self.total_start = time.time()

    def start_phase(self, name):
        self.phases[name] = {"start": time.time()}

    def end_phase(self, name):
        if name in self.phases:
            duration_ms = (time.time() - self.phases[name]["start"]) * 1000
            self.phases[name]["duration_ms"] = duration_ms
            self.phase_histogram.record(duration_ms, {"phase": name})

    def get_report(self):
        return {
            name: data.get("duration_ms", 0)
            for name, data in self.phases.items()
        }

# Usage during Lambda init
tracker = InitPhaseTracker(meter)

tracker.start_phase("sdk_init")
# ... initialize OpenTelemetry SDK
tracker.end_phase("sdk_init")

tracker.start_phase("db_connection")
# ... establish database connection pool
tracker.end_phase("db_connection")

tracker.start_phase("config_load")
# ... load configuration from SSM/Secrets Manager
tracker.end_phase("config_load")

tracker.start_phase("model_load")
# ... load ML model or other large assets
tracker.end_phase("model_load")
```

## Tracking Cold Start Trends Over Time

Query your metrics to build trend dashboards showing cold start degradation:

```promql
# Cold start ratio over time (what percentage of invocations are cold starts)
rate(faas_coldstart_count_total[5m])
/
(rate(faas_coldstart_count_total[5m]) + rate(faas_warmstart_count_total[5m]))

# Average cold start duration per function version
avg(faas_coldstart_duration_milliseconds) by (faas_version)

# P95 cold start duration trending up indicates degradation
histogram_quantile(0.95,
  sum(rate(faas_coldstart_duration_milliseconds_bucket[1h])) by (le, faas_name)
)

# Cold start phase breakdown
avg(faas_coldstart_phase_duration_milliseconds) by (phase)
```

## Alerting on Cold Start Degradation

Set up alerts when cold start metrics trend in the wrong direction:

```yaml
# alerts.yaml
groups:
  - name: cold-start-alerts
    rules:
      - alert: ColdStartDurationIncreasing
        expr: |
          histogram_quantile(0.95, sum(rate(faas_coldstart_duration_milliseconds_bucket[1h])) by (le, faas_name))
          >
          histogram_quantile(0.95, sum(rate(faas_coldstart_duration_milliseconds_bucket[1h] offset 1d)) by (le, faas_name))
          * 1.25
        for: 30m
        annotations:
          summary: "Cold start P95 is 25% higher than yesterday for {{ $labels.faas_name }}"

      - alert: HighColdStartRatio
        expr: |
          rate(faas_coldstart_count_total[15m])
          / (rate(faas_coldstart_count_total[15m]) + rate(faas_warmstart_count_total[15m]))
          > 0.3
        for: 15m
        annotations:
          summary: "More than 30% of invocations are cold starts for {{ $labels.faas_name }}"
```

## Common Causes of Cold Start Degradation

When your metrics show cold start times increasing, here are the usual suspects:

**Dependency bloat**: Every new dependency adds to the package size and import time. Track package size as a metric alongside cold start duration. A 10MB increase in deployment package size can add hundreds of milliseconds.

**Configuration fetching**: If you load secrets or config from external services during init, those network calls add up. Consider caching configs in Lambda layers or using Lambda extensions for async config loading.

**Database connection setup**: Establishing connection pools during init is expensive. Consider using RDS Proxy or connection pooling services that keep connections warm externally.

**Runtime version changes**: Upgrading your runtime (Python 3.11 to 3.12, Node 18 to 20) can change cold start characteristics. Always benchmark cold starts when changing runtimes.

## Wrapping Up

Cold start monitoring is not a one-time setup. As your functions evolve, dependencies grow, and configurations change, cold start times will shift. By instrumenting cold start phases with OpenTelemetry metrics and tracking them over time, you can catch degradation early and maintain snappy serverless performance. The key is breaking down the cold start into individual phases so you know exactly where the time is being spent.
