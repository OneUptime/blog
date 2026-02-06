# How to Build a Unified Query That Jumps from a Metric Spike to Related Traces to Correlated Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Unified Query, Metrics, Traces, Logs, Correlation

Description: Build a unified investigation workflow that lets you navigate from a metric spike to related traces and then to correlated logs.

The observability workflow everyone wants but few actually have: you see a metric spike, click to find the traces that caused it, then drill into the logs from those traces. This is not about a single magic query. It is about setting up your telemetry pipeline so that each signal carries enough shared context to link to the others. This post walks through building that end-to-end workflow.

## The Prerequisite: Shared Context Across Signals

For the jump from metrics to traces to logs to work, all three signals need to share identifiers. Here is what needs to be in place:

```
Metrics:
  - resource attributes: service.name, deployment.environment
  - exemplars: trace_id, span_id (linked to sampled traces)

Traces:
  - resource attributes: service.name, deployment.environment
  - span attributes: http.route, http.response.status_code
  - trace_id, span_id (unique identifiers)

Logs:
  - resource attributes: service.name, deployment.environment
  - trace_id, span_id (injected from active span context)
  - log body and attributes
```

The OpenTelemetry SDK configuration that enables all of this:

```yaml
# otel-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION}"
    deployment.environment: "${DEPLOY_ENV}"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1

meter_provider:
  exemplar_filter: "trace_based"
  readers:
    - periodic:
        interval: 30000
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"

logger_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"

propagator:
  composite: [tracecontext, baggage]
```

## Step 1: Start with the Metric Spike

You have a dashboard showing p99 latency for your checkout service. It spikes from 200ms to 3 seconds at 14:23 UTC.

The PromQL query on your dashboard:

```promql
histogram_quantile(0.99,
  sum(rate(http_server_request_duration_seconds_bucket{
    service_name="checkout-service",
    http_route="/api/checkout"
  }[5m])) by (le)
)
```

The spike is visible. Now you need to find the traces that contributed to it.

## Step 2: Jump to Traces via Exemplars

If you have exemplars configured, the metric data points carry direct links to trace IDs. In Grafana, exemplar dots appear on the graph. Click one to jump directly to the trace.

If you do not have exemplars, use the time range and attributes to search for traces:

```
# TraceQL query in Tempo
{
  resource.service.name = "checkout-service" &&
  name = "POST /api/checkout" &&
  duration > 2s
} | select(status.code)
```

This finds all traces for the checkout endpoint that took longer than 2 seconds during the spike window.

## Step 3: Examine the Slow Trace

You open a trace and see the span waterfall:

```
POST /api/checkout (3.2s)
  |-- validate_cart (50ms)
  |-- calculate_total (120ms)
  |-- check_inventory (2.8s)  <-- the slow span
  |    |-- db.query SELECT inventory (2.7s)  <-- database query
  |-- charge_payment (200ms)
```

The `check_inventory` span is responsible for the latency, and it is dominated by a database query.

## Step 4: Jump to Logs for the Slow Span

Copy the trace ID from the slow trace and query your log backend:

```
# LogQL in Loki
{service_name="checkout-service"} | json | trace_id="abc123456789abcdef0123456789abcd"
```

Or use the span ID for more precision:

```
{service_name="checkout-service"} | json | span_id="def456789abcdef0"
```

The logs reveal:

```json
{"timestamp":"2026-02-06T14:23:12Z","level":"WARN","message":"Inventory query slow: 2.7s","trace_id":"abc123...","span_id":"def456...","query":"SELECT * FROM inventory WHERE sku IN (...)","sku_count":847}
{"timestamp":"2026-02-06T14:23:12Z","level":"INFO","message":"Cart contains 847 unique SKUs","trace_id":"abc123..."}
```

Now you have the full picture: a customer with 847 unique SKUs in their cart triggered an IN clause with 847 values, which caused a slow database query.

## Building This Workflow in Grafana

Configure Grafana data sources to link all three signals:

```yaml
# Grafana datasource provisioning
apiVersion: 1
datasources:
  - name: Mimir
    type: prometheus
    url: http://mimir:9009/prometheus
    jsonData:
      exemplarTraceIdDestinations:
        - name: traceID
          datasourceUid: tempo
          urlDisplayLabel: "View Trace"

  - name: Tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      tracesToLogs:
        datasourceUid: "loki"
        tags: ["service.name"]
        mappedTags: [{ key: "service.name", value: "service_name" }]
        mapTagNamesEnabled: true
        filterByTraceID: true
        filterBySpanID: true
      tracesToMetrics:
        datasourceUid: "mimir"
        tags: ["service.name", "http.route"]
      serviceMap:
        datasourceUid: "mimir"

  - name: Loki
    type: loki
    url: http://loki:3100
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: '"trace_id":"(\\w+)"'
          name: TraceID
          url: '$${__value.raw}'
```

This configuration creates the full bidirectional navigation:

- **Metrics to Traces**: Click exemplar dots on a metric graph to open the linked trace in Tempo
- **Traces to Logs**: In the Tempo trace view, click "Logs" to see logs filtered by trace ID in Loki
- **Logs to Traces**: In Loki, click on a trace_id field to open the trace in Tempo
- **Traces to Metrics**: In Tempo, click "Metrics" to see related metrics in Mimir

## Automating the Investigation with Scripts

For programmatic investigation, build a script that chains the queries:

```python
#!/usr/bin/env python3
# investigate_spike.py
# Chains metric, trace, and log queries for a given time window

import requests
from datetime import datetime

MIMIR_URL = "http://mimir:9009"
TEMPO_URL = "http://tempo:3200"
LOKI_URL = "http://loki:3100"

def find_slow_traces(service, route, start, end, min_duration="2s"):
    """Find traces that match the spike criteria."""
    query = f'{{resource.service.name="{service}" && name=~".*{route}.*" && duration > {min_duration}}}'
    resp = requests.get(f"{TEMPO_URL}/api/search", params={
        "q": query, "start": start, "end": end, "limit": 10
    })
    return resp.json().get("traces", [])

def get_logs_for_trace(trace_id, service):
    """Get logs for a specific trace."""
    query = f'{{service_name="{service}"}} | json | trace_id="{trace_id}"'
    resp = requests.get(f"{LOKI_URL}/loki/api/v1/query_range", params={
        "query": query, "limit": 100
    })
    return resp.json()

# Example usage
traces = find_slow_traces("checkout-service", "/api/checkout", "1706745600", "1706749200")
for t in traces[:5]:
    print(f"Trace: {t['traceID']} Duration: {t['durationMs']}ms")
    logs = get_logs_for_trace(t["traceID"], "checkout-service")
    print(f"  Found {len(logs.get('data', {}).get('result', []))} log streams")
```

## Wrapping Up

The unified query workflow is not a single query but a chain of correlated queries linked by shared identifiers. Resource attributes link metrics to services. Exemplars link metric data points to traces. Trace IDs and span IDs link traces to logs. Set up your SDK to emit all three signals with consistent context, configure your observability tools to navigate between them, and the next time you see a spike on a dashboard, you are three clicks away from the root cause.
