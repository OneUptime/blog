# How to Build an Error Triage Dashboard from OpenTelemetry Span Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Dashboard, Error Triage, Grafana

Description: Build a practical error triage dashboard using OpenTelemetry span events and exception stack traces with Grafana and Tempo.

When an incident hits, the first thing your on-call engineer needs is an error triage dashboard that answers three questions fast: What is breaking? Where is it breaking? When did it start? This post walks through building that dashboard from OpenTelemetry span events, using Grafana as the frontend and a trace backend like Tempo for the data.

## Data Requirements

For the dashboard to be useful, your spans need to include:

- Exception events with `exception.type`, `exception.message`, and `exception.stacktrace`
- Span status set to `ERROR`
- Service name in the resource attributes
- HTTP route or RPC method in span attributes

If you are using `span.record_exception()` and setting the span status to `ERROR` correctly, you already have most of this.

## Generating Span Metrics from Traces

The OpenTelemetry Collector can derive metrics from spans using the `spanmetrics` connector. This gives you counters and histograms without any additional instrumentation.

```yaml
# otel-collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  span_metrics:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 500ms, 1s, 5s]
    dimensions:
      - name: http.request.method
      - name: http.route
      - name: http.response.status_code
      - name: service.name
    aggregation_cardinality_limit: 1000
    metrics_flush_interval: 15s
    events:
      enabled: true
      dimensions:
        - name: exception.type

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  otlp/tempo:
    endpoint: "tempo:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [span_metrics, otlp/tempo]
    metrics:
      receivers: [span_metrics]
      exporters: [prometheus]
```

## Dashboard Panel 1: Error Rate Over Time

This panel shows the overall error rate trend, which answers "when did it start?"

```promql
# Error rate by service over time
sum by (service_name) (
  rate(traces_span_metrics_calls_total{status_code="STATUS_CODE_ERROR"}[5m])
)
/
sum by (service_name) (
  rate(traces_span_metrics_calls_total[5m])
)
```

Configure this as a time series panel in Grafana with the Y-axis formatted as a percentage.

## Dashboard Panel 2: Top Error Types

This panel answers "what is breaking?" by showing the most frequent exception types:

```promql
# Top exception types by count
topk(10,
  sum by (exception_type, service_name) (
    increase(traces_span_metrics_events_total{exception_type!=""}[1h])
  )
)
```

Use a table panel for this, sorted by count descending.

## Dashboard Panel 3: Error Hotspots by Endpoint

This shows which endpoints are producing the most errors:

```promql
# Error count by route and service
sum by (http_route, service_name) (
  increase(traces_span_metrics_calls_total{
    status_code="STATUS_CODE_ERROR",
    http_route!=""
  }[1h])
)
```

A bar gauge or horizontal bar chart works well here.

## Dashboard Panel 4: Recent Error Traces with Stack Traces

For this panel, use Grafana's Tempo data source to show recent traces that contain errors. Create a TraceQL query:

```text
{ span:status = error } | select(resource.service.name, span.http.route)
```

This gives your engineer clickable links to jump from the dashboard directly into the trace view with the full stack trace.

## Building a Custom Error Summary API

If you want more control over the triage dashboard, build a small API that queries your trace backend and summarizes errors:

```python
# error_summary_api.py - Query Tempo for error summary data
from flask import Flask, jsonify
import requests
from collections import Counter
from datetime import datetime, timedelta, timezone

app = Flask(__name__)

TEMPO_URL = "http://tempo:3200"

@app.route("/api/error-summary")
def error_summary():
    """
    Return a summary of errors from the last hour,
    grouped by exception type and service.
    """
    # Query Tempo for recent error traces
    end = datetime.now(timezone.utc)
    start = end - timedelta(hours=1)

    response = requests.get(
        f"{TEMPO_URL}/api/search",
        params={
            "q": '{ status = error }',
            "start": int(start.timestamp()),
            "end": int(end.timestamp()),
            "limit": 1000,
        },
    )
    response.raise_for_status()

    traces = response.json().get("traces", [])

    # Group errors by type and service
    error_groups = Counter()
    error_examples = {}

    def attr_value(attribute):
        value = attribute.get("value", {})
        for key in ("stringValue", "intValue", "doubleValue", "boolValue"):
            if key in value:
                return str(value[key])
        return ""

    for t in traces:
        service = t.get("rootServiceName", "unknown")
        # Fetch the full trace to get exception details
        trace_response = requests.get(
            f"{TEMPO_URL}/api/traces/{t['traceID']}"
        )
        trace_response.raise_for_status()
        trace_detail = trace_response.json()

        for resource_span in trace_detail.get("resourceSpans", []):
            resource_attrs = {
                a["key"]: attr_value(a)
                for a in resource_span.get("resource", {}).get("attributes", [])
            }
            service = resource_attrs.get("service.name", service)
            for scope_span in resource_span.get("scopeSpans", []):
                for span in scope_span.get("spans", []):
                    for event in span.get("events", []):
                        if event.get("name") == "exception":
                            attrs = {
                                a["key"]: attr_value(a)
                                for a in event.get("attributes", [])
                            }
                            exc_type = attrs.get("exception.type", "Unknown")
                            key = f"{service}:{exc_type}"
                            error_groups[key] += 1

                            if key not in error_examples:
                                error_examples[key] = {
                                    "trace_id": t["traceID"],
                                    "message": attrs.get("exception.message", ""),
                                    "stacktrace": attrs.get(
                                        "exception.stacktrace", ""
                                    )[:500],
                                }

    # Build the response
    summary = []
    for key, count in error_groups.most_common(20):
        service, exc_type = key.split(":", 1)
        summary.append({
            "service": service,
            "exception_type": exc_type,
            "count": count,
            "example": error_examples.get(key),
        })

    return jsonify({"errors": summary, "window": "1h"})
```

## Linking Dashboard to Action

The dashboard becomes most valuable when each error entry links to something actionable. Add template variables in Grafana so clicking an error type filters all panels. Add links to your trace backend so the engineer can jump from the count to a specific trace with the full stack trace.

A typical triage flow:
1. Notice a spike on the error rate panel.
2. Check the top error types panel to see what is new.
3. Click through to a specific trace to read the stack trace.
4. Identify the root cause and start fixing.

## Conclusion

An error triage dashboard built on OpenTelemetry span data gives your on-call team a single starting point for incident investigation. By combining span metrics for the high-level view with trace queries for the detail view, you cover both the "what is happening" and "why is it happening" questions in one place.
