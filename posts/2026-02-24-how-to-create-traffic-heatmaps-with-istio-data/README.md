# How to Create Traffic Heatmaps with Istio Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Visualization, Grafana, Traffic Analysis, Observability

Description: Build traffic heatmaps using Istio telemetry data to visualize request patterns, latency distributions, and error hotspots across your service mesh.

---

When you have dozens or hundreds of services in a mesh, a list of numbers in a table just does not cut it anymore. You need a way to visually spot patterns, anomalies, and hotspots across your entire service topology. Traffic heatmaps do exactly that. They give you a color-coded view of what is happening across your mesh, making it obvious where problems are brewing.

Istio collects detailed telemetry on every request flowing through the mesh. With the right queries and visualization setup, you can turn this data into heatmaps that show latency distributions, error concentrations, and traffic volume patterns at a glance.

## What Makes a Good Traffic Heatmap

A traffic heatmap maps two dimensions (usually time and some category like service name or endpoint) to a color intensity that represents a metric value. High latency shows up as a hot red cell. Low traffic shows up as a cool blue cell. You can immediately spot which service is struggling at which time.

The three most useful types of heatmaps for Istio data are:

1. **Latency distribution heatmaps** - Shows how latency is distributed across histogram buckets over time
2. **Service-to-service traffic heatmaps** - Shows request volume between every pair of services
3. **Error rate heatmaps** - Shows which services have elevated error rates and when

## Latency Distribution Heatmap

Grafana has a native heatmap panel type that works perfectly with Prometheus histogram data. The key metric is `istio_request_duration_milliseconds_bucket`.

Create a new panel in Grafana with the Heatmap visualization type and use this query:

```promql
sum(increase(istio_request_duration_milliseconds_bucket{
  destination_service_name="my-service",
  reporter="destination"
}[$__rate_interval])) by (le)
```

Configure the panel with these settings:

- **Format**: Heatmap
- **Data format**: Time series buckets
- **Y-Axis**: Use `le` label (the histogram bucket boundary)
- **Color scheme**: Spectral or YlOrRd (yellow to red)

The result is a heatmap where the X axis is time, the Y axis is latency buckets, and the color intensity shows how many requests fell into that bucket at that time. Dense clusters of color show you where most requests land, and outliers at the top of the chart show tail latency.

## Service-to-Service Traffic Volume Heatmap

This heatmap shows the request volume between every pair of communicating services. It is great for understanding traffic patterns and spotting unexpected communication paths.

Use this Prometheus query:

```promql
sum(rate(istio_requests_total{
  reporter="source"
}[5m])) by (source_workload, destination_service_name)
```

In Grafana, create a panel using the "Status History" or "Table" visualization, or better yet, use the Heatmap panel with:

- X axis: `destination_service_name`
- Y axis: `source_workload`
- Cell value: Request rate

For a proper grid heatmap, you can use Grafana's "Table" panel with color-coded cells:

```promql
sum(rate(istio_requests_total{
  reporter="source"
}[5m])) by (source_workload, destination_service_name) > 0
```

Configure cell display mode to "Color background" with a gradient color scheme. Each cell represents a source-destination pair, and the color intensity shows traffic volume.

## Error Rate Heatmap Across Services

This heatmap shows error rates across all services over time, making it easy to spot which services are having problems and when they started:

```promql
sum(rate(istio_requests_total{
  response_code=~"5..",
  reporter="destination"
}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{
  reporter="destination"
}[5m])) by (destination_service_name)
```

Use the Status History panel type in Grafana with color thresholds:

- Green: error rate < 0.1%
- Yellow: error rate 0.1% - 1%
- Orange: error rate 1% - 5%
- Red: error rate > 5%

This gives you a timeline view where each row is a service and the color shows its health state at each point in time. A sudden row turning red tells you exactly when a service started having problems.

## Building a Comprehensive Dashboard

Here is a complete Grafana dashboard JSON model for an Istio traffic heatmap dashboard:

```json
{
  "dashboard": {
    "title": "Istio Traffic Heatmaps",
    "panels": [
      {
        "title": "Latency Distribution - All Services",
        "type": "heatmap",
        "gridPos": { "h": 8, "w": 24, "x": 0, "y": 0 },
        "targets": [{
          "expr": "sum(increase(istio_request_duration_milliseconds_bucket{reporter=\"destination\"}[$__rate_interval])) by (le)",
          "format": "heatmap",
          "legendFormat": "{{le}}"
        }],
        "options": {
          "yAxis": { "unit": "ms" },
          "color": { "scheme": "Spectral" }
        }
      },
      {
        "title": "Error Rate by Service Over Time",
        "type": "status-history",
        "gridPos": { "h": 8, "w": 24, "x": 0, "y": 8 },
        "targets": [{
          "expr": "sum(rate(istio_requests_total{response_code=~\"5..\",reporter=\"destination\"}[5m])) by (destination_service_name) / sum(rate(istio_requests_total{reporter=\"destination\"}[5m])) by (destination_service_name)",
          "legendFormat": "{{destination_service_name}}"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 0.001, "color": "yellow" },
                { "value": 0.01, "color": "orange" },
                { "value": 0.05, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "title": "Request Volume by Source-Destination",
        "type": "heatmap",
        "gridPos": { "h": 10, "w": 24, "x": 0, "y": 16 },
        "targets": [{
          "expr": "sum(rate(istio_requests_total{reporter=\"source\"}[5m])) by (source_workload, destination_service_name)",
          "legendFormat": "{{source_workload}} -> {{destination_service_name}}"
        }]
      }
    ]
  }
}
```

## Time-of-Day Traffic Patterns

One particularly interesting heatmap shows traffic patterns by hour of day and day of week. This requires a recording rule to bucket your data by time:

```promql
sum(rate(istio_requests_total{
  reporter="destination"
}[1h])) by (destination_service_name)
```

While Prometheus does not natively support day-of-week grouping, you can use Grafana transformations to reshape the data. Create a table panel and apply a "Group by" transformation on the hour extracted from the timestamp.

This type of heatmap reveals usage patterns. Maybe your payment service gets hammered at lunch time. Maybe your batch processing service spikes at midnight. Knowing these patterns helps with capacity planning and identifying abnormal traffic.

## Adding Request Path Dimension

You can make heatmaps even more useful by including the request path. Istio captures this in the `request_url_path` label when you have the right telemetry configuration:

```promql
sum(rate(istio_requests_total{
  destination_service_name="api-gateway",
  reporter="destination"
}[5m])) by (request_url_path)
```

This creates a heatmap where each row is an API endpoint, showing you which endpoints carry the most traffic and which ones are experiencing problems.

## Performance Considerations

Heatmap queries can be expensive, especially when you have many services and high-cardinality labels. A few tips to keep things responsive:

Use recording rules for any query that appears on multiple dashboards:

```yaml
groups:
  - name: heatmap-recording-rules
    rules:
      - record: mesh:request_rate:by_service_pair
        expr: |
          sum(rate(istio_requests_total{reporter="source"}[5m]))
            by (source_workload, destination_service_name)
      - record: mesh:error_rate:by_service
        expr: |
          sum(rate(istio_requests_total{response_code=~"5..",reporter="destination"}[5m]))
            by (destination_service_name)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m]))
            by (destination_service_name)
```

Limit the time range on heatmap panels to 6 or 12 hours instead of 24 hours. Heatmaps with too many data points become blurry and hard to read anyway.

Filter out low-traffic services that add noise. Adding a `> 0.1` threshold to your queries removes services with negligible traffic from the heatmap.

Traffic heatmaps turn raw Istio telemetry into actionable visual intelligence. Once you have them set up, you will find yourself catching issues faster and understanding your service mesh behavior in ways that raw numbers and line charts simply cannot convey.
