# How to Set Up Grafana to Navigate Seamlessly Between Tempo Traces, Mimir Metrics, Loki Logs, and Pyroscope Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana, Tempo, Mimir, Loki, Pyroscope

Description: Configure Grafana to enable seamless navigation between Tempo traces, Mimir metrics, Loki logs, and Pyroscope profiles for full observability.

Having all four signals (traces, metrics, logs, and profiles) in separate backends is only half the battle. The real value comes when you can click from a metric spike to a trace, from that trace to related logs, and from a slow span to a CPU profile, all without leaving your browser or manually copying IDs. Grafana supports all of these navigation links natively when you configure the data source connections correctly.

## Prerequisites

Before configuring Grafana, make sure your data backends are running and receiving data from your OpenTelemetry Collector:

- **Tempo** for traces (OTLP gRPC on port 4317, query API on port 3200)
- **Mimir** for metrics (Prometheus Remote Write on port 9009)
- **Loki** for logs (OTLP on port 3100)
- **Pyroscope** for profiles (HTTP on port 4040)

## Step 1: Configure the Mimir Data Source (Metrics)

Start with Mimir since metrics are typically the starting point for investigations:

```yaml
# grafana/provisioning/datasources/mimir.yaml
apiVersion: 1
datasources:
  - name: Mimir
    type: prometheus
    uid: mimir
    url: http://mimir:9009/prometheus
    access: proxy
    isDefault: true
    jsonData:
      timeInterval: "15s"
      # Link exemplars to Tempo traces
      exemplarTraceIdDestinations:
        - name: traceID
          datasourceUid: tempo
          urlDisplayLabel: "View Trace in Tempo"
```

The `exemplarTraceIdDestinations` configuration is the key. It tells Grafana that when a metric data point has an exemplar with a `traceID` field, clicking it should open that trace in the Tempo data source.

## Step 2: Configure the Tempo Data Source (Traces)

Tempo is the hub that links to all other signals:

```yaml
# grafana/provisioning/datasources/tempo.yaml
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    uid: tempo
    url: http://tempo:3200
    access: proxy
    jsonData:
      # Link from traces to logs in Loki
      tracesToLogsV2:
        datasourceUid: loki
        spanStartTimeShift: "-5m"
        spanEndTimeShift: "5m"
        filterByTraceID: true
        filterBySpanID: false
        tags:
          - key: "service.name"
            value: "service_name"
        customQuery: false

      # Link from traces to metrics in Mimir
      tracesToMetrics:
        datasourceUid: mimir
        spanStartTimeShift: "-5m"
        spanEndTimeShift: "5m"
        tags:
          - key: "service.name"
            value: "service_name"
          - key: "http.route"
            value: "http_route"
        queries:
          - name: "Request Rate"
            query: "sum(rate(http_server_request_duration_seconds_count{$$__tags}[5m]))"
          - name: "Error Rate"
            query: "sum(rate(http_server_request_duration_seconds_count{$$__tags, http_response_status_code=~\"5..\"}[5m])) / sum(rate(http_server_request_duration_seconds_count{$$__tags}[5m]))"
          - name: "P99 Latency"
            query: "histogram_quantile(0.99, sum(rate(http_server_request_duration_seconds_bucket{$$__tags}[5m])) by (le))"

      # Link from traces to profiles in Pyroscope
      tracesToProfiles:
        datasourceUid: pyroscope
        tags:
          - key: "service.name"
            value: "service_name"
        profileTypeId: "process_cpu:cpu:nanoseconds:cpu:nanoseconds"
        customQuery: true
        query: '{service_name="$${__span.tags["service.name"]}"}'

      # Service graph powered by span metrics
      serviceMap:
        datasourceUid: mimir

      # Node graph for trace visualization
      nodeGraph:
        enabled: true

      # Search configuration
      search:
        hide: false

      # Span bar display
      spanBar:
        type: "Tag"
        tag: "http.response.status_code"
```

This Tempo configuration creates four navigation links:

1. **Traces to Logs**: Opens Loki filtered by trace ID and service name
2. **Traces to Metrics**: Shows related metric queries in a side panel
3. **Traces to Profiles**: Opens Pyroscope filtered to the span's time range and service
4. **Service Graph**: Renders the service dependency map using span metrics from Mimir

## Step 3: Configure the Loki Data Source (Logs)

Configure Loki with derived fields that link back to traces:

```yaml
# grafana/provisioning/datasources/loki.yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    uid: loki
    url: http://loki:3100
    access: proxy
    jsonData:
      maxLines: 1000
      # Derived fields create clickable links from log fields
      derivedFields:
        # Link trace_id in logs to Tempo
        - datasourceUid: tempo
          matcherRegex: '"trace_id":"([a-f0-9]+)"'
          name: TraceID
          url: "$${__value.raw}"
          urlDisplayLabel: "View Trace"

        # Alternative pattern for non-JSON logs
        - datasourceUid: tempo
          matcherRegex: "trace_id=([a-f0-9]+)"
          name: TraceID
          url: "$${__value.raw}"
          urlDisplayLabel: "View Trace"
```

The `derivedFields` configuration uses regex to extract trace IDs from log lines and creates clickable links that open the trace in Tempo.

## Step 4: Configure the Pyroscope Data Source (Profiles)

```yaml
# grafana/provisioning/datasources/pyroscope.yaml
apiVersion: 1
datasources:
  - name: Pyroscope
    type: grafana-pyroscope-datasource
    uid: pyroscope
    url: http://pyroscope:4040
    access: proxy
```

Pyroscope does not need special link configuration since the links are initiated from Tempo (traces to profiles).

## Step 5: Build a Connected Dashboard

Create a dashboard that demonstrates the full navigation flow:

```json
{
  "dashboard": {
    "title": "Service Overview - Four Signal Correlation",
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "datasource": {"uid": "mimir"},
        "targets": [{
          "expr": "sum(rate(http_server_request_duration_seconds_count{service_name=\"$service\"}[5m]))",
          "exemplar": true
        }],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "title": "P99 Latency",
        "type": "timeseries",
        "datasource": {"uid": "mimir"},
        "targets": [{
          "expr": "histogram_quantile(0.99, sum(rate(http_server_request_duration_seconds_bucket{service_name=\"$service\"}[5m])) by (le))",
          "exemplar": true
        }],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "title": "Recent Traces",
        "type": "table",
        "datasource": {"uid": "tempo"},
        "targets": [{
          "queryType": "traceql",
          "query": "{resource.service.name = \"$service\"} | select(duration, status)"
        }],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      },
      {
        "title": "Error Logs",
        "type": "logs",
        "datasource": {"uid": "loki"},
        "targets": [{
          "expr": "{service_name=\"$service\"} |= \"ERROR\""
        }],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16}
      }
    ],
    "templating": {
      "list": [{
        "name": "service",
        "type": "query",
        "datasource": {"uid": "mimir"},
        "query": "label_values(http_server_request_duration_seconds_count, service_name)"
      }]
    }
  }
}
```

## The Complete Navigation Flow

With everything configured, here is how the investigation works:

1. **Start with metrics**: You see p99 latency spike on the dashboard. Exemplar dots appear on the graph.

2. **Metrics to Traces**: Click an exemplar dot. Grafana opens the linked trace in Tempo.

3. **Trace to Logs**: In the Tempo trace view, click the "Logs" button next to a span. Grafana opens Loki with a query filtered by trace ID and time range.

4. **Trace to Profile**: Click the "Profiles" button next to a slow span. Grafana opens Pyroscope showing a flamegraph scoped to that span's time range and service.

5. **Logs to Traces**: In the Loki log view, click on a trace_id field. Grafana opens the corresponding trace in Tempo.

6. **Trace to Metrics**: In the Tempo trace view, click the "Metrics" button. Grafana shows the related metric queries in a side panel.

Every step is a single click. No copying IDs, no switching tabs, no manually adjusting time ranges.

## Verifying the Setup

Test each navigation link to make sure it works:

```bash
# 1. Generate test traffic
curl -X POST http://your-service/api/test-endpoint

# 2. In Grafana, go to Explore > Mimir
#    Run a query with exemplars enabled
#    Verify exemplar dots appear and link to Tempo

# 3. In Grafana, go to Explore > Tempo
#    Search for recent traces
#    Click "Logs" on a span - verify it opens Loki
#    Click "Profiles" on a span - verify it opens Pyroscope

# 4. In Grafana, go to Explore > Loki
#    Search for logs with trace_id
#    Click on the TraceID derived field - verify it opens Tempo
```

## Wrapping Up

Grafana's data source linking is what turns four separate observability tools into a unified investigation experience. The configuration is declarative, version-controllable, and applies to all users of the Grafana instance. Set up the cross-references between Mimir, Tempo, Loki, and Pyroscope, build a dashboard with exemplars enabled, and every on-call engineer gets a one-click path from a metric anomaly to the root cause in code. The time saved during a single incident pays back the setup cost many times over.
