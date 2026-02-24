# How to Monitor Istio Ingress Gateway Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Prometheus, Grafana, Ingress Gateway, Observability

Description: Complete guide to monitoring Istio Ingress Gateway performance using Prometheus metrics, Grafana dashboards, and custom alerting rules.

---

The Istio ingress gateway is the front door to your entire mesh. If it slows down or drops connections, everything behind it suffers. Monitoring it properly means tracking the right metrics, setting up useful dashboards, and creating alerts that catch problems before your users do.

This guide covers the key metrics to watch, how to query them in Prometheus, how to build Grafana dashboards, and what alerts to configure.

## Metrics Available at the Ingress Gateway

The Istio ingress gateway runs Envoy, which exposes a rich set of metrics. You can see all available stats:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway -- \
  curl -s localhost:15000/stats/prometheus | head -50
```

Istio also generates standard metrics through its telemetry system. The most important ones for ingress monitoring are:

- `istio_requests_total` - total request count by response code, method, and destination
- `istio_request_duration_milliseconds` - request latency distribution
- `istio_request_bytes` - request body sizes
- `istio_response_bytes` - response body sizes
- `envoy_cluster_upstream_cx_active` - active connections to upstream services
- `envoy_cluster_upstream_cx_connect_fail` - failed connection attempts
- `envoy_server_live` - whether the gateway is alive

## Setting Up Prometheus

If you installed Istio with the demo profile or enabled Prometheus integration, metrics are already being scraped. Verify:

```bash
kubectl get svc prometheus -n istio-system
```

If Prometheus is not installed, you can deploy it alongside Istio:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
```

Or if you use the Prometheus Operator, add a ServiceMonitor for the ingress gateway:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  endpoints:
  - port: http-envoy-prom
    interval: 15s
    path: /stats/prometheus
```

## Key PromQL Queries

### Request Rate

Total requests per second hitting the ingress gateway:

```promql
sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway"}[5m]))
```

Request rate broken down by response code:

```promql
sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (response_code)
```

### Error Rate

Percentage of 5xx responses:

```promql
sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway", response_code=~"5.."}[5m]))
/
sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway"}[5m]))
* 100
```

### Latency

P50, P90, and P99 latency:

```promql
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (le))

histogram_quantile(0.90, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (le))

histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (le))
```

### Active Connections

```promql
sum(envoy_cluster_upstream_cx_active{pod=~"istio-ingressgateway.*"})
```

### Throughput (Bytes)

Inbound and outbound throughput:

```promql
sum(rate(istio_request_bytes_sum{reporter="source", source_workload="istio-ingressgateway"}[5m]))
sum(rate(istio_response_bytes_sum{reporter="source", source_workload="istio-ingressgateway"}[5m]))
```

## Grafana Dashboard Setup

Install Grafana if you don't have it:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
```

Access the Grafana UI:

```bash
kubectl port-forward svc/grafana -n istio-system 3000:3000
```

Istio ships with pre-built dashboards. Look for the "Istio Mesh Dashboard" and "Istio Service Dashboard" in Grafana. But for the ingress gateway specifically, you want a custom dashboard.

### Custom Ingress Gateway Dashboard

Create a dashboard with these panels:

**Panel 1: Request Rate by Response Code**

```promql
sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (response_code)
```

Visualization: time series, grouped by response_code.

**Panel 2: P50/P90/P99 Latency**

Three queries on the same panel:

```promql
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (le))
histogram_quantile(0.90, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (le))
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (le))
```

Visualization: time series with P50 in green, P90 in yellow, P99 in red.

**Panel 3: Error Rate Percentage**

```promql
sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway", response_code=~"5.."}[5m]))
/
sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway"}[5m]))
* 100
```

Visualization: stat panel with thresholds (green < 1%, yellow < 5%, red > 5%).

**Panel 4: Request Rate by Destination Service**

```promql
sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (destination_service_name)
```

Visualization: time series, showing which backend services get the most traffic.

**Panel 5: Gateway Pod Resource Usage**

```promql
sum(container_cpu_usage_seconds_total{pod=~"istio-ingressgateway.*", container="istio-proxy"}) by (pod)
sum(container_memory_working_set_bytes{pod=~"istio-ingressgateway.*", container="istio-proxy"}) by (pod)
```

## Alerting Rules

Set up Prometheus alerting rules for the ingress gateway:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-ingress-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-ingress
    rules:
    - alert: IngressGatewayHighErrorRate
      expr: |
        sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway", response_code=~"5.."}[5m]))
        /
        sum(rate(istio_requests_total{reporter="source", source_workload="istio-ingressgateway"}[5m]))
        > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Istio ingress gateway error rate above 5%"
        description: "The ingress gateway is returning 5xx errors for more than 5% of requests over the last 5 minutes."

    - alert: IngressGatewayHighLatency
      expr: |
        histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source", source_workload="istio-ingressgateway"}[5m])) by (le))
        > 5000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio ingress gateway P99 latency above 5 seconds"

    - alert: IngressGatewayDown
      expr: |
        absent(up{job="istio-ingressgateway"} == 1)
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Istio ingress gateway is down"

    - alert: IngressGatewayHighCPU
      expr: |
        sum(rate(container_cpu_usage_seconds_total{pod=~"istio-ingressgateway.*", container="istio-proxy"}[5m])) by (pod)
        > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Istio ingress gateway CPU usage is high"
```

## Envoy Admin Interface

For real-time debugging, Envoy's admin interface gives you instant access to stats, clusters, and configuration:

```bash
# Port-forward to a gateway pod
kubectl port-forward -n istio-system deploy/istio-ingressgateway 15000:15000

# View all clusters and their health
curl localhost:15000/clusters

# View current stats
curl localhost:15000/stats

# View server info
curl localhost:15000/server_info
```

You can also use `istioctl` to inspect the gateway's proxy status:

```bash
istioctl proxy-status
istioctl proxy-config cluster deploy/istio-ingressgateway -n istio-system
```

## Access Logging

Enable access logging for the ingress gateway to see individual request details:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: gateway-access-log
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  accessLogging:
  - providers:
    - name: envoy
```

Then check the logs:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway -f
```

Each log line includes response code, latency, upstream host, bytes transferred, and other details useful for troubleshooting.

## Summary

Monitoring the Istio ingress gateway requires tracking request rates, error rates, latency percentiles, and resource usage. Prometheus and Grafana give you the tools to build dashboards and alerts. Start with the key metrics (requests per second, 5xx rate, P99 latency), set up alerts for when they cross thresholds, and use access logging and the Envoy admin interface for deeper investigation when issues arise.
