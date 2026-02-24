# How to Set Up Grafana Dashboards for Istio Service Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Grafana, Service Metrics, Monitoring, Prometheus

Description: Build Grafana dashboards that display detailed per-service metrics from Istio including request rates, latencies, and error breakdowns.

---

While a mesh-wide overview tells you the big picture, you need per-service dashboards to actually troubleshoot problems. When a service starts throwing errors or its latency spikes, you want a dashboard that shows exactly what changed: which endpoints are affected, what response codes are coming back, where the traffic is coming from, and how the service's dependencies are behaving. Here is how to build service-level Grafana dashboards for Istio.

## Prerequisites

You need Prometheus scraping Istio metrics and Grafana connected to that Prometheus instance. If you followed a standard Istio installation with addons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

Verify both are running:

```bash
kubectl get pods -n istio-system -l app=prometheus
kubectl get pods -n istio-system -l app=grafana
```

## Istio's Built-in Service Dashboard

Istio ships with an "Istio Service Dashboard" that provides per-service views. Access it through:

```bash
istioctl dashboard grafana
```

Navigate to Dashboards -> Browse -> Istio -> Istio Service Dashboard. The default dashboard has panels for:

- Client and server request volume
- Client and server success rate
- Request duration by source and response code

This is a solid starting point, but you'll want to extend it with your own panels.

## Building Service-Specific Panels

### Inbound Request Rate

Show the request rate coming into your service, broken down by source:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service=~"$service"
}[5m])) by (source_workload, source_workload_namespace)
```

This tells you which services are calling yours and how heavily. It's invaluable for understanding your service's dependency graph from the receiving end.

### Outbound Request Rate

Show the request rate going out from your service to its dependencies:

```promql
sum(rate(istio_requests_total{
  reporter="source",
  source_workload=~"$workload",
  source_workload_namespace=~"$namespace"
}[5m])) by (destination_service)
```

When your service has a latency spike, this panel helps you see if it's because a downstream dependency slowed down.

### Response Code Breakdown

Break down responses by status code:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service=~"$service"
}[5m])) by (response_code)
```

Use a stacked bar chart or pie chart to visualize the ratio of 200s, 400s, and 500s. This gives you immediate visibility into what kind of errors are happening.

### Request Duration Heatmap

A heatmap of request durations shows you the distribution of latencies over time:

```promql
sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_service=~"$service"
}[5m])) by (le)
```

In Grafana, select "Heatmap" as the visualization type. This is better than percentile lines for spotting bimodal distributions (e.g., most requests are fast but a chunk is very slow).

### Latency Percentiles

For the classic percentile view:

```promql
# P50
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_service=~"$service"
}[5m])) by (le))

# P90
histogram_quantile(0.90, sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_service=~"$service"
}[5m])) by (le))

# P99
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_service=~"$service"
}[5m])) by (le))
```

Display all three on the same panel so you can see if the tail latency (P99) is growing even while median (P50) stays stable.

### TCP Connection Metrics

For services using TCP (not just HTTP), track connection-level metrics:

```promql
# Bytes sent
sum(rate(istio_tcp_sent_bytes_total{
  reporter="destination",
  destination_service=~"$service"
}[5m])) by (source_workload)

# Bytes received
sum(rate(istio_tcp_received_bytes_total{
  reporter="destination",
  destination_service=~"$service"
}[5m])) by (source_workload)

# Open connections
sum(istio_tcp_connections_opened_total{
  reporter="destination",
  destination_service=~"$service"
}) by (source_workload)
- sum(istio_tcp_connections_closed_total{
  reporter="destination",
  destination_service=~"$service"
}) by (source_workload)
```

### gRPC-Specific Metrics

If your service uses gRPC, add gRPC-specific panels:

```promql
# gRPC request rate by method
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service=~"$service",
  request_protocol="grpc"
}[5m])) by (grpc_response_status)
```

gRPC status codes are different from HTTP status codes, so you need a separate panel to track them properly.

## Setting Up Dashboard Variables

Create variables so one dashboard works for any service:

**Variable: namespace**
```
label_values(istio_requests_total{reporter="destination"}, destination_workload_namespace)
```

**Variable: service** (dependent on namespace)
```
label_values(istio_requests_total{reporter="destination", destination_workload_namespace=~"$namespace"}, destination_service)
```

**Variable: workload** (dependent on namespace)
```
label_values(istio_requests_total{reporter="destination", destination_workload_namespace=~"$namespace"}, destination_workload)
```

Add these as dropdown selectors at the top of your dashboard. Now you can switch between services without editing any queries.

## Dashboard JSON Model

Here is a minimal dashboard definition you can import into Grafana:

```json
{
  "dashboard": {
    "title": "Istio Service Detail",
    "templating": {
      "list": [
        {
          "name": "namespace",
          "type": "query",
          "query": "label_values(istio_requests_total{reporter=\"destination\"}, destination_workload_namespace)"
        },
        {
          "name": "service",
          "type": "query",
          "query": "label_values(istio_requests_total{reporter=\"destination\", destination_workload_namespace=~\"$namespace\"}, destination_service)"
        }
      ]
    },
    "panels": [
      {
        "title": "Request Volume",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [{
          "expr": "sum(rate(istio_requests_total{reporter=\"destination\", destination_service=~\"$service\"}[5m])) by (source_workload)"
        }]
      },
      {
        "title": "Success Rate",
        "type": "gauge",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [{
          "expr": "sum(rate(istio_requests_total{reporter=\"destination\", destination_service=~\"$service\", response_code!~\"5.*\"}[5m])) / sum(rate(istio_requests_total{reporter=\"destination\", destination_service=~\"$service\"}[5m])) * 100"
        }]
      }
    ]
  }
}
```

Import this through Grafana -> Dashboards -> Import -> Paste JSON.

## Best Practices

**Use "destination" reporter for server-side metrics.** The `reporter="destination"` filter gives you metrics from the server's perspective, which is more accurate for measuring actual service behavior.

**Set refresh intervals appropriately.** For a service dashboard, 30 seconds or 1 minute refresh is usually fine. Don't set it to 5 seconds unless you're actively debugging.

**Add annotations for deployments.** Mark when deployments happen on your time series panels so you can correlate changes in metrics with code releases.

**Create links between dashboards.** Link your mesh overview dashboard to service dashboards so you can click on a service in the overview table and jump to its detailed view.

## Summary

Service-level Grafana dashboards for Istio give you deep visibility into individual service behavior. Build panels for inbound and outbound request rates, response code breakdowns, latency distributions, and TCP/gRPC metrics. Use template variables to make dashboards reusable across services. Start with Istio's built-in service dashboard and extend it with panels that match your specific observability needs.
