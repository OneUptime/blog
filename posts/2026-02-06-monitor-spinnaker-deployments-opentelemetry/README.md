# How to Monitor Spinnaker Deployments with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Spinnaker, Deployment, Monitoring, CI/CD, Tracing, Kubernetes

Description: Learn how to monitor Spinnaker deployment pipelines with OpenTelemetry for better visibility into multi-stage rollouts.

---

Spinnaker is a powerful multi-cloud deployment platform, but its internal visibility can be limited. When a deployment pipeline stalls or a canary analysis takes longer than expected, you often end up clicking through the Spinnaker UI trying to piece together what happened. OpenTelemetry provides a way to instrument Spinnaker pipelines so you get structured traces and metrics for every stage of every deployment.

This guide covers how to set up OpenTelemetry monitoring for Spinnaker, from pipeline-level tracing to stage-by-stage metrics.

---

## How Spinnaker Pipelines Work

```mermaid
flowchart LR
    Trigger["Trigger\n(Git/Jenkins/Webhook)"] --> Bake["Bake Stage\n(Build AMI/Image)"]
    Bake --> Deploy["Deploy Stage\n(Server Group)"]
    Deploy --> Canary["Canary Analysis"]
    Canary --> Approve["Manual Approval"]
    Approve --> Promote["Promote to Prod"]
```

Each stage in a Spinnaker pipeline is an independently executed unit. Stages can run sequentially or in parallel, and each one has its own lifecycle with status, timing, and potential failure modes. OpenTelemetry lets you capture all of this as a trace.

---

## Setting Up the Webhook-Based Approach

Spinnaker supports webhook stages and can forward pipeline events to downstream listeners. The most straightforward way to instrument Spinnaker without modifying its source code is to use these hooks to send telemetry data to an external service that emits OpenTelemetry spans.

First, create a small service that receives Spinnaker event calls and converts them into spans:

```python
# spinnaker_otel_bridge.py

# This service acts as a bridge between Spinnaker event webhooks
# and OpenTelemetry. It receives pipeline and stage events from Spinnaker
# and emits corresponding spans to the collector. Each pipeline execution
# becomes a parent span with child spans for each stage.

from flask import Flask, request, jsonify
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

app = Flask(__name__)

resource = Resource.create({"service.name": "spinnaker-otel-bridge"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("spinnaker.pipelines")

# Store active pipeline spans so stage events can be linked to their parent
active_pipelines = {}

def _execution_from_event(data):
    content = data.get("content", {})
    execution = content.get("execution", data.get("execution", {}))
    pipeline_id = execution.get("id") or content.get("executionId")
    return execution, pipeline_id

def _current_stage(execution, event_type):
    stages = execution.get("stages", [])
    status_by_event = {
        "orca:stage:starting": "RUNNING",
        "orca:stage:complete": "SUCCEEDED",
        "orca:stage:failed": "TERMINAL",
    }
    expected_status = status_by_event.get(event_type)
    candidates = [
        stage for stage in stages
        if not expected_status or stage.get("status") == expected_status
    ] or stages
    if not candidates:
        return None
    return max(candidates, key=lambda stage: stage.get("endTime") or stage.get("startTime") or 0)

@app.route("/spinnaker/events", methods=["POST"])
def spinnaker_event():
    """Handle events forwarded by Spinnaker Echo's REST event listener."""
    data = request.json or {}
    event_type = data.get("details", {}).get("type")
    execution, pipeline_id = _execution_from_event(data)

    if event_type == "orca:pipeline:starting":
        return pipeline_start(execution, pipeline_id)
    if event_type in ("orca:pipeline:complete", "orca:pipeline:failed"):
        return pipeline_complete(execution, pipeline_id)
    if event_type == "orca:stage:starting":
        return stage_start(execution, pipeline_id, event_type)
    if event_type in ("orca:stage:complete", "orca:stage:failed"):
        return stage_complete(execution, pipeline_id, event_type)

    return jsonify({"status": "ignored"}), 202

def pipeline_start(execution, pipeline_id):
    """Handle pipeline start events from Spinnaker."""
    pipeline_name = execution.get("name", "unknown")
    application = execution.get("application", "unknown")

    # Start a new root span for this pipeline execution
    span = tracer.start_span(
        f"pipeline:{pipeline_name}",
        attributes={
            "spinnaker.pipeline.id": pipeline_id,
            "spinnaker.pipeline.name": pipeline_name,
            "spinnaker.application": application,
            "spinnaker.trigger.type": execution.get("trigger", {}).get("type", "manual"),
        },
    )
    active_pipelines[pipeline_id] = span
    return jsonify({"status": "tracking"}), 200

def pipeline_complete(execution, pipeline_id):
    """Handle pipeline completion events."""
    status = execution.get("status", "UNKNOWN")

    span = active_pipelines.pop(pipeline_id, None)
    if span:
        span.set_attribute("spinnaker.pipeline.status", status)
        if status != "SUCCEEDED":
            span.set_status(Status(StatusCode.ERROR, f"Pipeline {status}"))
        span.end()

    return jsonify({"status": "completed"}), 200

def stage_start(execution, pipeline_id, event_type):
    """Handle stage start events from Spinnaker."""
    stage = _current_stage(execution, event_type)
    if not stage:
        return jsonify({"status": "ignored"}), 202

    stage_id = stage.get("id") or stage.get("refId") or stage.get("name")
    stage_name = stage.get("name", stage_id)
    stage_type = stage.get("type", "unknown")

    parent_span = active_pipelines.get(pipeline_id)
    if parent_span:
        ctx = trace.set_span_in_context(parent_span)
        stage_span = tracer.start_span(
            f"stage:{stage_name}",
            context=ctx,
            attributes={
                "spinnaker.stage.name": stage_name,
                "spinnaker.stage.type": stage_type,
                "spinnaker.pipeline.id": pipeline_id,
            },
        )
        # Store stage spans keyed by pipeline_id + stage_id because names can repeat.
        active_pipelines[f"{pipeline_id}:{stage_id}"] = stage_span

    return jsonify({"status": "tracking"}), 200

def stage_complete(execution, pipeline_id, event_type):
    """Handle stage completion events."""
    stage = _current_stage(execution, event_type)
    if not stage:
        return jsonify({"status": "ignored"}), 202

    stage_id = stage.get("id") or stage.get("refId") or stage.get("name")
    status = stage.get("status", "UNKNOWN")

    key = f"{pipeline_id}:{stage_id}"
    span = active_pipelines.pop(key, None)
    if span:
        span.set_attribute("spinnaker.stage.status", status)
        span.set_attribute("spinnaker.stage.duration_ms",
                          stage.get("endTime", 0) - stage.get("startTime", 0))
        if status != "SUCCEEDED":
            span.set_status(Status(StatusCode.ERROR, f"Stage {status}"))
        span.end()

    return jsonify({"status": "completed"}), 200
```

This bridge service maintains a map of active pipeline and stage spans. When Spinnaker sends a start event, a span begins. When it sends a completion event, the span ends with the appropriate status. Stage spans are nested under their parent pipeline span, giving you a proper trace hierarchy.

---

## Configuring Spinnaker Event Webhooks

Spinnaker can forward Orca pipeline and stage events to downstream listeners through Echo's REST event listener. Configure Echo to call your bridge service:

```yaml
# echo-local.yml
rest:
  enabled: true
  endpoints:
    - wrap: false
      url: http://spinnaker-otel-bridge:5000/spinnaker/events
```

This sends Orca events such as `orca:pipeline:starting`, `orca:pipeline:complete`, `orca:stage:starting`, `orca:stage:complete`, and `orca:stage:failed` to the bridge service. The service filters the event stream and creates spans only for the pipeline and stage lifecycle events it cares about.

---

## Monitoring Canary Deployments

Canary analysis is one of Spinnaker's strongest features, and it benefits greatly from OpenTelemetry monitoring. You can emit metrics from both the canary and baseline instances to compare their behavior:

```python
# canary_metrics.py
# This module emits metrics from your application that are tagged with
# the deployment strategy (canary vs baseline). Set these values in
# your manifest or deployment stage so Kayenta can query matching
# canary and baseline metric series.

import os
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=10000,
)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("canary.metrics")

# Determine if this instance is canary or baseline from deployment metadata
server_group = os.getenv("SERVER_GROUP", "unknown")
deployment_type = os.getenv("DEPLOYMENT_TYPE", "baseline")

# Create metrics with deployment type labels
request_latency = meter.create_histogram(
    "http.server.duration",
    unit="ms",
    description="HTTP request latency",
)

error_rate = meter.create_counter(
    "http.server.errors",
    description="HTTP server error count",
)

def record_request(endpoint, status_code, duration_ms):
    """Record request metrics with canary/baseline labels."""
    attrs = {
        "deployment.type": deployment_type,
        "server.group": server_group,
        "http.route": endpoint,
        "http.status_code": status_code,
    }
    request_latency.record(duration_ms, attrs)
    if status_code >= 500:
        error_rate.add(1, attrs)
```

With these metrics, you can compare canary and baseline performance side by side. If the canary shows higher latency or error rates, you know the new version has a problem before it reaches all your users.

---

## Tracking Deployment Rollbacks

Rollbacks are critical events that deserve their own tracing. When Spinnaker rolls back a deployment, you want to capture that as a distinct span with clear context about why:

```python
# rollback_tracker.py
# This handler specifically tracks rollback events from Spinnaker.
# Rollbacks are important signals during incident investigation,
# so we capture extra detail about what triggered the rollback.

from opentelemetry import trace

tracer = trace.get_tracer("spinnaker.rollbacks")

def track_rollback(pipeline_data):
    """Create a span for a deployment rollback event."""
    with tracer.start_as_current_span("deployment-rollback") as span:
        span.set_attribute("rollback.application", pipeline_data["application"])
        span.set_attribute("rollback.from_version", pipeline_data.get("from_version", "unknown"))
        span.set_attribute("rollback.to_version", pipeline_data.get("to_version", "unknown"))
        span.set_attribute("rollback.reason", pipeline_data.get("reason", "automated"))
        span.set_attribute("rollback.triggered_by", pipeline_data.get("user", "system"))

        # Record the server groups involved
        for sg in pipeline_data.get("server_groups", []):
            span.add_event("server_group_rollback", {
                "server_group": sg["name"],
                "cloud_provider": sg.get("provider", "unknown"),
                "region": sg.get("region", "unknown"),
            })
```

---

## Collector Configuration for Spinnaker

Configure your OpenTelemetry Collector to handle telemetry from the Spinnaker bridge and your application instances:

```yaml
# otel-collector-config.yaml
# Collector config that receives traces from the Spinnaker bridge service
# and metrics from canary/baseline application instances. It adds a
# deployment platform attribute and forwards the data to your backend.

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
  attributes:
    actions:
      - key: deployment.platform
        value: spinnaker
        action: upsert

exporters:
  otlp:
    endpoint: "https://your-oneuptime-endpoint:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [attributes, batch]
      exporters: [otlp]
```

---

## What You Get

Once everything is wired up, you get several useful views of your Spinnaker deployments:

A trace for each pipeline execution that shows every stage as a child span. You can see the bake stage taking 3 minutes, the deploy stage taking 45 seconds, and the canary analysis running for 10 minutes. If a stage fails, the error status and message are right there in the span.

Metrics that compare canary and baseline performance in real time. You can set up alerts that fire if the canary error rate exceeds the baseline by more than a threshold.

Rollback events that appear on your timeline alongside application traces. When investigating an incident, you can see not just that a rollback happened but what version it rolled back from and to.

The combination of these signals turns Spinnaker from a deployment tool into an observable deployment platform.

---

## Summary

Monitoring Spinnaker with OpenTelemetry requires a bridge service that converts Spinnaker event webhooks into OpenTelemetry spans. This gives you trace-level visibility into pipeline executions, stage-by-stage timing, canary analysis results, and rollback events. The setup is non-invasive since it uses Spinnaker's built-in event forwarding rather than requiring changes to Spinnaker itself. Combined with application-level metrics tagged with deployment type and version information, you get a complete picture of how deployments affect your production systems.
