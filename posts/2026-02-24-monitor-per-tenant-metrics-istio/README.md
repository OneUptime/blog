# How to Monitor Per-Tenant Metrics in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Metrics, Prometheus, Multi-Tenancy, Observability

Description: How to collect, query, and visualize per-tenant metrics in Istio using Prometheus and Grafana with namespace-based tenant identification.

---

When you run a multi-tenant Istio mesh, aggregate metrics are not enough. Knowing that your cluster handled 50,000 requests in the last minute is nice, but what you really need is a breakdown by tenant. Which tenant is consuming the most resources? Which one is experiencing elevated error rates? Which one is generating the most latency?

Istio generates detailed telemetry through its Envoy sidecars, and with the right Prometheus queries and dashboards, you can slice all of it by tenant.

## How Istio Metrics Work

Every Envoy sidecar in the mesh emits a standard set of metrics. The most important ones for traffic monitoring are:

- `istio_requests_total` - Total request count
- `istio_request_duration_milliseconds` - Request latency histogram
- `istio_request_bytes` - Request body sizes
- `istio_response_bytes` - Response body sizes
- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed

These metrics come with labels that include `source_workload_namespace`, `destination_workload_namespace`, `source_workload`, `destination_workload`, `response_code`, and many others.

In a namespace-per-tenant setup, the namespace labels are your tenant identifiers.

## Setting Up Prometheus for Tenant Metrics

If you installed Istio with the demo or default profile, Prometheus might already be running. If not, install it:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
```

Verify it is scraping Envoy metrics:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```

Open `http://localhost:9090` and try a quick query:

```promql
istio_requests_total{destination_workload_namespace="tenant-a"}
```

If you see results, Prometheus is collecting Istio metrics and you are ready to build per-tenant queries.

## Essential Per-Tenant Prometheus Queries

Here are the queries you will use most often for per-tenant monitoring.

Request rate per tenant:

```promql
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload_namespace)
```

This gives you requests per second grouped by the destination namespace, which maps to your tenant.

Error rate per tenant:

```promql
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_workload_namespace)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload_namespace)
```

P99 latency per tenant:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
  by (le, destination_workload_namespace)
)
```

Bandwidth consumption per tenant:

```promql
sum(rate(istio_response_bytes_sum{reporter="destination"}[5m])) by (destination_workload_namespace)
```

Active TCP connections per tenant:

```promql
sum(istio_tcp_connections_opened_total{reporter="destination"} - istio_tcp_connections_closed_total{reporter="destination"}) by (destination_workload_namespace)
```

## Breaking Down Traffic Between Tenants

One useful view is seeing which tenants are calling shared services and how much traffic each generates:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload_namespace="shared-services"
}[5m])) by (source_workload_namespace)
```

This tells you exactly how much load each tenant is putting on your shared services. If one tenant is hogging 80% of the capacity, you know who to rate limit.

## Adding Custom Tenant Labels

If your tenant identity is not just the namespace but comes from a header or JWT claim, you can add custom metric labels using Istio's telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tenant-metrics
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
        mode: SERVER
      tagOverrides:
        tenant_id:
          operation: UPSERT
          value: "request.headers['x-tenant-id'] | 'unknown'"
    - match:
        metric: REQUEST_DURATION
        mode: SERVER
      tagOverrides:
        tenant_id:
          operation: UPSERT
          value: "request.headers['x-tenant-id'] | 'unknown'"
```

Now your metrics will have a `tenant_id` label extracted from the request header. Query it like this:

```promql
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (tenant_id)
```

Be careful with high-cardinality labels though. If you have thousands of tenants, adding a custom label multiplies the number of time series, which increases Prometheus memory and storage usage significantly.

## Building a Grafana Dashboard

Install Grafana if you have not already:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
```

Access it:

```bash
kubectl port-forward -n istio-system svc/grafana 3000:3000
```

Create a new dashboard with a variable for tenant selection. Go to Dashboard Settings > Variables and add:

- Name: `tenant`
- Type: Query
- Data source: Prometheus
- Query: `label_values(istio_requests_total{reporter="destination"}, destination_workload_namespace)`

Now build panels using the `$tenant` variable:

Request rate panel:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_workload_namespace="$tenant"}[5m]))
```

Error rate panel:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_workload_namespace="$tenant", response_code=~"5.."}[5m]))
/
sum(rate(istio_requests_total{reporter="destination", destination_workload_namespace="$tenant"}[5m]))
```

Latency heatmap panel:

```promql
sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination", destination_workload_namespace="$tenant"}[5m])) by (le)
```

## Setting Up Per-Tenant Alerts

Use Prometheus alerting rules to get notified when a specific tenant is having issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tenant-alerts
  namespace: istio-system
spec:
  groups:
  - name: tenant-slos
    rules:
    - alert: TenantHighErrorRate
      expr: |
        (
          sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_workload_namespace)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload_namespace)
        ) > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Tenant {{ $labels.destination_workload_namespace }} has error rate above 5%"

    - alert: TenantHighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
          by (le, destination_workload_namespace)
        ) > 1000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Tenant {{ $labels.destination_workload_namespace }} P99 latency above 1s"

    - alert: TenantTrafficSpike
      expr: |
        sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload_namespace)
        >
        2 * sum(rate(istio_requests_total{reporter="destination"}[1h])) by (destination_workload_namespace)
      for: 10m
      labels:
        severity: info
      annotations:
        summary: "Tenant {{ $labels.destination_workload_namespace }} traffic is 2x above hourly average"
```

The traffic spike alert is particularly useful in multi-tenant environments. It catches cases where a tenant suddenly ramps up usage, which might affect other tenants before rate limits kick in.

## Optimizing Metric Collection at Scale

With many tenants, the number of metric time series can explode. Here are some practical ways to keep it under control:

Reduce metric cardinality by dropping labels you do not need:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-labels
  namespace: istio-system
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        request_protocol:
          operation: REMOVE
        connection_security_policy:
          operation: REMOVE
```

Use Prometheus recording rules to pre-aggregate common queries:

```yaml
groups:
- name: tenant-aggregations
  interval: 30s
  rules:
  - record: tenant:istio_requests:rate5m
    expr: sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload_namespace)
  - record: tenant:istio_request_errors:rate5m
    expr: sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_workload_namespace)
```

Recording rules pre-compute expensive queries so your dashboards load faster and Prometheus uses less CPU during query time.

## Summary

Per-tenant monitoring in Istio is mostly about knowing which Prometheus labels to query. The namespace labels give you free tenant segmentation, and Istio's telemetry API lets you add custom labels for more complex tenant identification schemes. Build dashboards, set up alerts, and use recording rules to keep the system performant as you scale. The visibility you get is worth the setup effort because when one tenant complains about slow responses, you can pull up their specific metrics and diagnose the issue in minutes instead of hours.
