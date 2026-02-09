# How to use Grafana Explore for ad-hoc querying across data sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Explore, Querying

Description: Master Grafana Explore to perform ad-hoc queries across multiple data sources for troubleshooting and investigation without creating dashboards.

---

When production issues strike, you don't have time to build dashboards. You need immediate answers from your metrics, logs, and traces. Grafana Explore provides a dedicated workspace for ad-hoc querying and investigation, allowing you to dive deep into your observability data without the overhead of dashboard creation.

## Understanding Explore vs Dashboards

Dashboards are perfect for ongoing monitoring and predefined views, but they're not ideal for investigation. Explore focuses on discovery and troubleshooting with a streamlined interface designed for asking questions and following leads.

Explore gives you split views, query history, rich time controls, and the ability to correlate data across different sources. It's where you go when you know something is wrong but don't yet know what.

## Starting Your First Exploration

Access Explore from the sidebar compass icon or by pressing `g` then `e`. Select your data source from the dropdown at the top.

For Prometheus, start with a simple query to see current values:

```promql
# Check current CPU usage across all nodes
node_cpu_seconds_total

# View HTTP request rate for the last 5 minutes
rate(http_requests_total[5m])

# See memory usage by pod
container_memory_usage_bytes{namespace="production"}
```

Explore shows results immediately as you type, with auto-completion helping you discover available metrics and labels.

## Using Split View for Correlation

One of Explore's most powerful features is split view, which lets you query multiple data sources simultaneously and correlate the results.

Click the split button to create a second query pane. This is invaluable for correlating metrics with logs or traces.

```promql
# Left pane - Prometheus
rate(http_requests_total{status="500"}[5m])

# Right pane - Loki logs
{namespace="production"} |= "error" | json | status="500"
```

Time ranges and cursor positions sync across both panes, making it easy to see the relationship between metrics spikes and log entries.

## Exploring Logs with Loki

When querying Loki in Explore, use LogQL to filter and parse logs effectively.

```logql
# Basic log stream selection
{app="nginx", environment="prod"}

# Filter for specific text
{app="nginx"} |= "error"

# Exclude certain patterns
{app="nginx"} |= "error" != "connection reset"

# Parse JSON logs and filter by field
{app="api"} | json | status_code >= 500

# Extract and count error types
sum by (error_type) (
  rate({app="api"} | json | error_type != "" [5m])
)
```

Explore automatically formats log lines and highlights matching text, making it easier to spot patterns.

## Investigating Traces with Tempo

When you've identified a problematic time window in metrics or logs, pivot to traces to see the full request flow.

```traceql
# Search traces by service and duration
{service.name="checkout-service" && duration > 2s}

# Find traces with errors
{status=error}

# Search by specific span attributes
{span.http.status_code=500}

# Combine multiple conditions
{service.name="api-gateway" &&
 duration > 1s &&
 span.http.route="/checkout"}
```

Explore displays traces as flame graphs and lists, allowing you to drill into individual spans and see request flows across services.

## Using Query Builder vs Raw Queries

Grafana Explore offers both a visual query builder and raw query mode. The builder helps when learning query languages or exploring unfamiliar data.

For Prometheus, the builder shows available metrics, labels, and operations:

```text
Metric: http_requests_total
Label filters:
  - namespace = production
  - status = 500
Operations:
  - rate [5m]
  - sum by (pod)
```

This generates the PromQL:

```promql
sum by (pod) (rate(http_requests_total{namespace="production", status="500"}[5m]))
```

Switch between builder and code mode using the toggle button to learn query syntax while maintaining flexibility.

## Leveraging Query History

Explore maintains a history of all your queries, which is incredibly useful during investigations. Access it via the History tab or `Ctrl+H`.

```bash
# Query history stores:
- Query text
- Data source
- Timestamp
- Time range used
```

Star important queries to save them for future reference. You can also add comments to starred queries to document what you were investigating.

```text
# Example starred query with note
"CPU spike investigation - found memory leak in pod api-7d8f9b"
Query: rate(container_cpu_usage_seconds_total{pod=~"api-.*"}[5m])
```

## Advanced Time Range Controls

Explore provides sophisticated time controls beyond simple relative ranges. Use absolute time ranges to investigate specific incidents:

```text
# Relative ranges
Last 5 minutes
Last 1 hour
Last 24 hours

# Absolute ranges
2026-02-09 14:30:00 to 2026-02-09 15:00:00

# Quick zoom
Click and drag on any graph to zoom into that time window
```

The time picker also includes a refresh interval option for live monitoring during active incidents.

## Creating Alerts from Explore

When you've identified a query that should trigger alerts, convert it directly to an alert rule.

After building your query in Explore, click the "Create alert rule from this query" button. This opens the alert rule editor pre-populated with your query.

```promql
# Query built in Explore
rate(http_requests_total{status="500"}[5m]) > 10

# Becomes an alert rule with:
- Expression: your query
- Condition: threshold already set
- Time range: preserved from Explore
```

This workflow eliminates the need to recreate queries when moving from investigation to ongoing monitoring.

## Using Inspector for Query Analysis

The inspector panel shows exactly what queries Grafana sends to data sources and the raw responses. This is critical for debugging query issues.

```json
{
  "request": {
    "url": "http://prometheus:9090/api/v1/query_range",
    "method": "POST",
    "data": {
      "query": "rate(http_requests_total[5m])",
      "start": 1707484800,
      "end": 1707488400,
      "step": 15
    }
  },
  "response": {
    "status": "success",
    "data": {
      "resultType": "matrix",
      "result": []
    }
  }
}
```

Use this information to understand why queries return unexpected results or to optimize query performance.

## Exploring Multiple Data Sources Simultaneously

Configure Explore to query multiple data sources at once, not just in split view but as part of the same query.

```yaml
# Mixed data source query
Data Source: -- Mixed --
Query A (Prometheus): up{job="api"}
Query B (Loki): {job="api"} |= "error"
Query C (Tempo): {service.name="api"}
```

This approach gives you a complete picture of your system's behavior across all observability signals.

## Using Exemplars to Connect Metrics and Traces

When your Prometheus metrics include exemplars, Explore automatically links them to traces in Tempo.

```promql
# Query with exemplar support
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)
```

Exemplars appear as diamonds on the graph. Click them to jump directly to the corresponding trace in Tempo, bridging metrics and traces seamlessly.

## Keyboard Shortcuts for Efficiency

Explore includes keyboard shortcuts that speed up investigations:

```text
Ctrl+Enter / Cmd+Enter - Run query
Shift+Enter - Add new query line
Ctrl+K / Cmd+K - Clear query
Ctrl+Space - Trigger autocomplete
Escape - Close panels/modals
```

Learning these shortcuts makes you significantly faster during time-sensitive troubleshooting.

## Sharing Explore Views

When you've found something important, share it with your team. Use the share button to generate a URL that includes:

- Data source selection
- Query text
- Time range
- Split view configuration

```bash
# Example share URL
https://grafana.example.com/explore?orgId=1&
  left={"datasource":"prometheus","queries":[{"expr":"rate(http[5m])"}]}&
  range={"from":"now-1h","to":"now"}
```

Team members can open this link and see exactly what you were investigating.

## Best Practices for Effective Exploration

Start broad and narrow down. Begin with high-level metrics, then add label filters and drill into specific components.

Use time range alignment across split panes to correlate metrics, logs, and traces at the exact same moment.

Save successful investigation queries to starred history with notes about what you found. This creates a knowledge base for future incidents.

Combine query types in mixed data source views to see the complete story. Metrics show what happened, logs show why, and traces show where.

Use the inspector when queries behave unexpectedly. Raw request and response data reveals issues that aren't obvious from the UI.

Explore transforms ad-hoc investigation from a painful process into a powerful workflow. It gives you the tools to ask questions, follow leads, and find answers quickly when every second counts.
