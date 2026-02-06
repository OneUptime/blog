# How to Implement Developer Experience (DevEx) Metrics Using OpenTelemetry Custom Instrumentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Developer Experience, Custom Instrumentation, Metrics

Description: Learn how to build custom OpenTelemetry instrumentation that captures developer experience metrics like build times, deploy frequency, and CI feedback loops.

Most engineering organizations track system performance religiously but completely ignore the performance of their development workflows. Build times creep up. CI pipelines slow down. Deploy frequency drops. Nobody notices until developer productivity tanks.

OpenTelemetry's custom instrumentation APIs give you the tools to measure developer experience (DevEx) the same way you measure production systems - with structured, queryable telemetry data.

## What Are DevEx Metrics?

DevEx metrics quantify the friction developers encounter during their daily work. The DORA metrics (deployment frequency, lead time for changes, change failure rate, mean time to recovery) are a good starting point, but you can go deeper:

- **Build duration** - how long local and CI builds take
- **CI pipeline wait time** - time spent waiting for feedback
- **Code review turnaround** - time from PR open to first review
- **Deploy lead time** - commit to production
- **Environment setup time** - how long it takes to get a working dev environment

## Setting Up the Custom Meter

First, configure a dedicated meter for DevEx metrics. This keeps your developer experience telemetry separate from application telemetry.

Here is the meter provider setup in Python:

```python
# devex_metrics.py - Central module for all DevEx metric definitions
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure the OTLP exporter pointing to your collector
exporter = OTLPMetricExporter(endpoint="http://otel-collector:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=30000)

# Create a dedicated meter provider for DevEx metrics
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

# All DevEx instruments come from this single meter
meter = metrics.get_meter("devex.metrics", version="1.0.0")

# Histogram for build durations (in seconds)
build_duration = meter.create_histogram(
    name="devex.build.duration",
    description="Time taken for builds to complete",
    unit="s",
)

# Counter for deployments
deploy_count = meter.create_counter(
    name="devex.deploy.count",
    description="Number of deployments performed",
)

# Histogram for CI pipeline wait times
ci_wait_time = meter.create_histogram(
    name="devex.ci.wait_time",
    description="Time developers wait for CI feedback",
    unit="s",
)
```

## Instrumenting CI Pipelines

The most impactful place to start is your CI/CD pipeline. You can emit telemetry from pipeline scripts or use webhook handlers.

This script records CI stage durations and sends them as OpenTelemetry metrics:

```python
# ci_instrumentation.py - Hook this into your CI pipeline stages
import time
from devex_metrics import build_duration, ci_wait_time, deploy_count

def record_build(project: str, branch: str, start_time: float, success: bool):
    """Record a build completion with relevant attributes."""
    elapsed = time.time() - start_time
    build_duration.record(
        elapsed,
        attributes={
            "project": project,
            "branch_type": "main" if branch == "main" else "feature",
            "result": "success" if success else "failure",
        },
    )

def record_ci_wait(project: str, queue_time: float, execution_time: float):
    """Record both queue wait and execution time separately."""
    # Queue time is pure waste - developers waiting for a runner
    ci_wait_time.record(
        queue_time,
        attributes={"project": project, "phase": "queue"},
    )
    # Execution time is the actual work
    ci_wait_time.record(
        execution_time,
        attributes={"project": project, "phase": "execution"},
    )

def record_deployment(project: str, environment: str, trigger: str):
    """Track deployment frequency by project and environment."""
    deploy_count.add(
        1,
        attributes={
            "project": project,
            "environment": environment,
            "trigger": trigger,  # "manual", "merge", "scheduled"
        },
    )
```

## Tracking Code Review Turnaround

Code review latency is one of the biggest DevEx pain points. You can instrument your Git platform's webhook events to capture this.

This webhook handler measures time-to-first-review from pull request events:

```python
# webhook_handler.py - GitHub/GitLab webhook processor
from datetime import datetime, timezone
from devex_metrics import meter

# Histogram for review turnaround time
review_turnaround = meter.create_histogram(
    name="devex.code_review.turnaround",
    description="Time from PR creation to first review",
    unit="s",
)

def handle_review_event(payload: dict):
    """Process a pull request review webhook event."""
    pr_created = datetime.fromisoformat(payload["pull_request"]["created_at"])
    review_submitted = datetime.fromisoformat(payload["review"]["submitted_at"])

    turnaround_seconds = (review_submitted - pr_created).total_seconds()

    review_turnaround.record(
        turnaround_seconds,
        attributes={
            "repository": payload["repository"]["name"],
            "team": resolve_team(payload["pull_request"]["user"]["login"]),
            "review_result": payload["review"]["state"],  # approved, changes_requested
        },
    )
```

## Collector Configuration for DevEx Data

Route DevEx metrics through a dedicated pipeline in the OpenTelemetry Collector so you can apply specific processing rules.

This Collector config separates DevEx metrics from application metrics using attribute-based routing:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Add metadata to all DevEx metrics
  attributes/devex:
    actions:
      - key: telemetry.category
        value: developer-experience
        action: upsert

  # Batch for efficient export
  batch:
    timeout: 10s
    send_batch_size: 256

exporters:
  # Send DevEx metrics to a dedicated backend or dashboard
  otlphttp/devex:
    endpoint: https://devex-metrics.internal:4318

service:
  pipelines:
    metrics/devex:
      receivers: [otlp]
      processors: [attributes/devex, batch]
      exporters: [otlphttp/devex]
```

## Building a DevEx Dashboard

Once telemetry flows in, build dashboards around these key questions:

- Which projects have the slowest builds, and are they getting worse?
- How much time per week do developers spend waiting on CI?
- What is the deploy frequency per team per week?
- Which teams have the longest code review turnaround?

The histogram metrics give you percentile breakdowns automatically. A p95 build time of 20 minutes hitting a team of 50 developers means hundreds of hours of lost productivity per month.

## Practical Tips

**Start small.** Instrument one pipeline for one team. Get feedback. Iterate. Rolling this out across the entire org on day one will create noise before you have the dashboards to make sense of it.

**Use semantic conventions.** Prefix all DevEx metric names with `devex.` to make them easy to filter and avoid collisions with application metrics.

**Set alerts on trends, not absolutes.** A 10-minute build might be fine today but a problem if it was 5 minutes last month. Alert on week-over-week regressions rather than fixed thresholds.

**Correlate with satisfaction surveys.** Numbers without context can mislead. Pair quantitative DevEx metrics with periodic developer satisfaction surveys to validate that what you are measuring actually reflects developer pain.

Developer experience is a system, and like any system, it benefits from observability. OpenTelemetry gives you the instrumentation framework - the hard part is deciding what to measure and acting on what you find.
