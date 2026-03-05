# How to Create Custom Grafana Dashboards for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Grafana, Dashboard, Monitoring, Prometheus, Observability

Description: Build custom Grafana dashboards for Istio service mesh monitoring with practical PromQL queries for traffic, errors, latency, and saturation.

---

Istio ships with a handful of pre-built Grafana dashboards, and they are a decent starting point. But most teams quickly outgrow them. The default dashboards try to show everything, which means they end up showing nothing particularly well. Custom dashboards that focus on what your team actually cares about are far more useful for day-to-day operations.

This guide walks through building practical Grafana dashboards for Istio using real PromQL queries that you can copy and adapt.

## Prerequisites

You need Prometheus scraping Istio metrics and Grafana connected to that Prometheus instance. If you installed Istio with the default addons, you probably have this already:

```bash
# Install the Grafana addon if you have not already
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
```

Access Grafana:

```bash
kubectl port-forward svc/grafana -n istio-system 3000:3000
```

## Dashboard Structure: The RED Method

The best Istio dashboards follow the RED method:

- **Rate** - How many requests per second?
- **Errors** - What percentage of those requests are failing?
- **Duration** - How long do requests take?

Each section of your dashboard should cover one of these, with the ability to filter by service, namespace, or specific source-destination pairs.

## Setting Up Variables

Before building panels, set up dashboard variables so users can filter interactively:

1. **namespace** - Query: `label_values(istio_requests_total, destination_workload_namespace)`
2. **service** - Query: `label_values(istio_requests_total{destination_workload_namespace="$namespace"}, destination_service)`
3. **source** - Query: `label_values(istio_requests_total{destination_service="$service"}, source_workload)`

Configure each variable with the "Multi-value" and "Include All" options enabled.

## Rate Panels

### Overall Request Rate

```promql
sum(rate(istio_requests_total{destination_workload_namespace="$namespace"}[5m])) by (destination_service)
```

Panel type: Time series. Set the legend to `{{destination_service}}` and the Y-axis unit to "requests/sec".

### Request Rate by Response Code

```promql
sum(rate(istio_requests_total{destination_service=~"$service"}[5m])) by (response_code)
```

This is useful for seeing the distribution of 200s, 400s, 500s, etc. Use a stacked area chart for this one.

### Request Rate by Source

```promql
sum(rate(istio_requests_total{destination_service=~"$service"}[5m])) by (source_workload)
```

Shows which services are sending the most traffic to the selected service. Helpful for understanding dependency patterns.

## Error Panels

### Error Rate Percentage

```promql
sum(rate(istio_requests_total{destination_service=~"$service", response_code=~"5.."}[5m]))
/
sum(rate(istio_requests_total{destination_service=~"$service"}[5m]))
* 100
```

Panel type: Stat or Gauge. Set thresholds at 1% (yellow) and 5% (red). Unit should be "percent (0-100)".

### Error Rate by Service (Table)

```promql
sort_desc(
  sum(rate(istio_requests_total{destination_workload_namespace="$namespace", response_code=~"5.."}[5m])) by (destination_service)
  /
  sum(rate(istio_requests_total{destination_workload_namespace="$namespace"}[5m])) by (destination_service)
  * 100
)
```

Panel type: Table. This gives you a quick ranking of which services have the highest error rates.

### 4xx vs 5xx Breakdown

```promql
# Client errors
sum(rate(istio_requests_total{destination_service=~"$service", response_code=~"4.."}[5m]))

# Server errors
sum(rate(istio_requests_total{destination_service=~"$service", response_code=~"5.."}[5m]))
```

Two queries on the same panel. This distinction matters because 4xx errors are usually client problems (bad requests, auth failures) while 5xx errors indicate server-side issues.

## Duration Panels

### P50, P90, P99 Latency

```promql
# P50
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service=~"$service"}[5m])) by (le)
)

# P90
histogram_quantile(0.90,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service=~"$service"}[5m])) by (le)
)

# P99
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service=~"$service"}[5m])) by (le)
)
```

Put all three on a single time series panel. Set the Y-axis unit to "milliseconds". Use different colors or line styles for each percentile.

### Latency Heatmap

```promql
sum(increase(istio_request_duration_milliseconds_bucket{destination_service=~"$service"}[1m])) by (le)
```

Panel type: Heatmap. This shows the distribution of request durations over time, which is much more informative than a single percentile line. You can spot bimodal distributions and tail latency issues that percentile lines would hide.

### Latency by Source Service

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service=~"$service"}[5m])) by (source_workload, le)
)
```

Legend: `{{source_workload}}`. This reveals whether latency issues are specific to certain callers.

## Service Mesh Overview Panel

For a high-level dashboard, create a service map visualization using the node graph panel:

```promql
# Edge traffic between services
sum(rate(istio_requests_total{destination_workload_namespace="$namespace"}[5m])) by (source_workload, destination_workload)
```

You can also build a "traffic light" table:

```promql
# For each service, show rate, error rate, and P99 latency
# Rate
sum(rate(istio_requests_total{destination_workload_namespace="$namespace"}[5m])) by (destination_service)

# Error %
sum(rate(istio_requests_total{destination_workload_namespace="$namespace", response_code=~"5.."}[5m])) by (destination_service)
/
sum(rate(istio_requests_total{destination_workload_namespace="$namespace"}[5m])) by (destination_service) * 100

# P99 latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_workload_namespace="$namespace"}[5m])) by (destination_service, le)
)
```

Use a table panel with three queries, join them on `destination_service`, and apply color-coded thresholds to each column.

## TCP Metrics Panel

If you have non-HTTP services (databases, message queues), add TCP panels:

```promql
# Active TCP connections
sum(istio_tcp_connections_opened_total{destination_workload_namespace="$namespace"}) by (destination_service)
-
sum(istio_tcp_connections_closed_total{destination_workload_namespace="$namespace"}) by (destination_service)

# TCP bytes sent rate
sum(rate(istio_tcp_sent_bytes_total{destination_workload_namespace="$namespace"}[5m])) by (destination_service)
```

## Control Plane Health

Do not forget to monitor istiod itself:

```promql
# Pilot push latency
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))

# Connected proxies
pilot_xds

# Config push errors
sum(rate(pilot_xds_push_errors[5m]))

# Config validation errors
sum(pilot_total_xds_rejects)
```

## Dashboard Organization Tips

- **Use rows to group panels.** Create collapsible rows for "Rate", "Errors", "Duration", "Control Plane", and "TCP".
- **Set reasonable time ranges.** Default to "Last 1 hour" for operational dashboards.
- **Add annotations for deploys.** If you track deployments, add annotation queries so you can correlate metric changes with code changes.
- **Keep it fast.** Queries over long time ranges (7d, 30d) are slow. Use recording rules for those and query the recorded metrics instead.
- **Export as JSON.** Once you are happy with your dashboard, export it as JSON and store it in version control. Use Grafana's provisioning to deploy it automatically.

Custom Grafana dashboards built on Istio metrics give your team a shared understanding of service health. The key is to keep them focused on actionable information rather than trying to display every possible metric.
