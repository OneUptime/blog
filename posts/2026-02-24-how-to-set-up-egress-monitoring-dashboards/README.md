# How to Set Up Egress Monitoring Dashboards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Monitoring, Grafana, Prometheus, Observability

Description: Build Grafana dashboards to monitor all outbound traffic flowing through your Istio egress gateway with practical PromQL queries and panel configurations.

---

Having an egress gateway is great for controlling outbound traffic, but it is only half the picture. You also need visibility into what traffic is flowing through that gateway. A well-built monitoring dashboard tells you at a glance which services are calling which external endpoints, how much data is flowing out, and whether there are any errors.

This guide walks through building Grafana dashboards for Istio egress monitoring using Prometheus metrics.

## Prerequisites

You need:
- Istio with an egress gateway enabled
- Prometheus scraping Istio metrics (typically via the Prometheus Operator or the built-in Istio Prometheus addon)
- Grafana connected to your Prometheus data source

If you installed Istio with the demo profile, Prometheus and Grafana addons are included. For production, you likely have your own Prometheus and Grafana setup.

## Key Metrics for Egress Monitoring

Istio generates several metrics that are useful for egress monitoring. These are reported by the Envoy proxies:

**Request-based metrics (L7)**:
- `istio_requests_total` - Total count of requests
- `istio_request_duration_milliseconds` - Request duration histogram
- `istio_request_bytes` - Request body sizes
- `istio_response_bytes` - Response body sizes

**Connection-based metrics (L4)**:
- `istio_tcp_connections_opened_total` - New TCP connections
- `istio_tcp_connections_closed_total` - Closed TCP connections
- `istio_tcp_sent_bytes_total` - Bytes sent
- `istio_tcp_received_bytes_total` - Bytes received

For egress monitoring, you want to filter these metrics by the egress gateway.

## Dashboard Panel 1: Egress Request Rate

This panel shows the total request rate through the egress gateway over time:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="istio-egressgateway"
}[5m]))
```

For a breakdown by source workload:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="istio-egressgateway"
}[5m])) by (source_workload, source_workload_namespace)
```

Use a time series panel in Grafana with the legend set to `{{source_workload}} ({{source_workload_namespace}})`.

## Dashboard Panel 2: Egress Traffic by External Destination

This shows which external services are receiving traffic:

```promql
sum(rate(istio_requests_total{
  reporter="source",
  source_workload="istio-egressgateway"
}[5m])) by (destination_service_name)
```

Display this as a bar chart or pie chart to see the distribution of outbound traffic across external services.

## Dashboard Panel 3: Error Rate

Track errors on outbound connections:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="istio-egressgateway",
  response_code!~"2.."
}[5m])) by (response_code, source_workload)
```

Set up threshold coloring in Grafana: green when the error rate is below 1%, yellow between 1-5%, and red above 5%.

## Dashboard Panel 4: Bytes Transferred

Track data volume flowing through the egress gateway:

**Bytes sent to external services:**

```promql
sum(rate(istio_tcp_sent_bytes_total{
  reporter="source",
  source_workload="istio-egressgateway"
}[5m])) by (destination_service_name)
```

**Bytes received from external services:**

```promql
sum(rate(istio_tcp_received_bytes_total{
  reporter="source",
  source_workload="istio-egressgateway"
}[5m])) by (destination_service_name)
```

Display these as stacked area charts to visualize traffic volume over time. Multiply by the appropriate unit conversion (e.g., divide by 1024 for KB/s).

## Dashboard Panel 5: TCP Connection Count

Monitor active TCP connections through the egress gateway:

```promql
sum(rate(istio_tcp_connections_opened_total{
  reporter="destination",
  destination_workload="istio-egressgateway"
}[5m])) by (source_workload)
```

A sudden spike in new connections might indicate a connection leak or a burst of traffic from a particular workload.

## Dashboard Panel 6: Request Duration

Track how long external requests take:

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="destination",
    destination_workload="istio-egressgateway"
  }[5m])) by (le, source_workload)
)
```

This gives you the 95th percentile latency for requests flowing through the egress gateway, broken down by source workload. High latency on a specific external service could indicate issues with that service.

## Dashboard Panel 7: Blocked Traffic (BlackHoleCluster)

Monitor traffic that is being blocked because it does not match any ServiceEntry:

```promql
sum(rate(istio_requests_total{
  destination_service="BlackHoleCluster"
}[5m])) by (source_workload, source_workload_namespace)
```

This is one of the most important panels for security monitoring. Any non-zero value means some workload is trying to reach an external host that is not registered. Display this as a stat panel with a red background when the value is above zero.

## Creating the Dashboard in Grafana

Here is a JSON snippet for a Grafana dashboard row with two panels. You can import this into Grafana and customize it:

```json
{
  "panels": [
    {
      "title": "Egress Request Rate by Source",
      "type": "timeseries",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "sum(rate(istio_requests_total{reporter=\"destination\", destination_workload=\"istio-egressgateway\"}[5m])) by (source_workload)",
          "legendFormat": "{{source_workload}}"
        }
      ],
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
    },
    {
      "title": "Egress Error Rate",
      "type": "timeseries",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "sum(rate(istio_requests_total{reporter=\"destination\", destination_workload=\"istio-egressgateway\", response_code!~\"2..\"}[5m])) by (response_code)",
          "legendFormat": "HTTP {{response_code}}"
        }
      ],
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
    }
  ]
}
```

## Dashboard Variables

Make your dashboard interactive with Grafana variables:

**Namespace variable:**

```promql
label_values(istio_requests_total{destination_workload="istio-egressgateway"}, source_workload_namespace)
```

**Source workload variable:**

```promql
label_values(istio_requests_total{destination_workload="istio-egressgateway", source_workload_namespace="$namespace"}, source_workload)
```

Use these variables in your panel queries to let users filter the dashboard by namespace and workload:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload="istio-egressgateway",
  source_workload_namespace=~"$namespace",
  source_workload=~"$workload"
}[5m])) by (source_workload)
```

## Alert Rules

Set up Grafana alerts directly on your dashboard panels, or use Prometheus alerting rules:

```yaml
groups:
- name: egress-monitoring
  rules:
  - alert: UnexpectedEgressTraffic
    expr: sum(rate(istio_requests_total{destination_service="BlackHoleCluster"}[5m])) > 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Blocked egress traffic detected"
  - alert: EgressGatewayDown
    expr: absent(up{job="istio-egressgateway"} == 1)
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Egress gateway is not reporting metrics"
  - alert: HighEgressLatency
    expr: |
      histogram_quantile(0.95,
        sum(rate(istio_request_duration_milliseconds_bucket{
          destination_workload="istio-egressgateway"
        }[5m])) by (le)
      ) > 5000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "95th percentile egress latency exceeds 5 seconds"
```

## Dashboard Organization Tips

**Group panels by concern**: Put request rate and error rate panels together, traffic volume panels together, and security-related panels (blocked traffic) in their own section.

**Use dashboard annotations**: Add annotations for deployment events so you can correlate changes in egress patterns with deployments.

**Set appropriate refresh intervals**: For a production egress dashboard, a 30-second refresh is usually sufficient. Higher frequency refreshes add load to Prometheus without providing much additional value.

**Save common time ranges**: For egress dashboards, the last 6 hours and last 24 hours are typically the most useful time ranges. The last 7 days view is good for trend analysis.

A well-built egress monitoring dashboard gives your team confidence that outbound traffic is behaving as expected and makes it easy to spot anomalies quickly.
