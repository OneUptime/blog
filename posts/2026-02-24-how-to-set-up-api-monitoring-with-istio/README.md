# How to Set Up API Monitoring with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Monitoring, Prometheus, Grafana, Observability

Description: A hands-on guide to monitoring your APIs with Istio, covering Prometheus metrics, Grafana dashboards, access logging, and alerting for API performance and errors.

---

One of the biggest benefits of running Istio is the observability you get for free. Every request flowing through the mesh generates metrics, and you can use those metrics to build a solid API monitoring setup without adding any instrumentation code to your services.

## What Istio Gives You Out of the Box

When you install Istio with the default profile, every sidecar proxy automatically collects metrics for all HTTP traffic. The key metrics are:

- `istio_requests_total` - Total request count, labeled by response code, source, destination, and more
- `istio_request_duration_milliseconds` - Request latency as a histogram
- `istio_request_bytes` - Request body sizes
- `istio_response_bytes` - Response body sizes

These metrics are exposed on port 15020 of each sidecar proxy and can be scraped by Prometheus.

## Setting Up Prometheus

If you installed Istio with `istioctl`, you can deploy the Prometheus addon:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
```

For production setups, you will want a proper Prometheus installation. Here is a ServiceMonitor that scrapes Istio sidecars:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istio-proxy-metrics
  namespace: monitoring
spec:
  selector:
    matchExpressions:
    - key: istio-prometheus-ignore
      operator: DoesNotExist
  namespaceSelector:
    any: true
  jobLabel: istio-mesh
  endpoints:
  - path: /stats/prometheus
    targetPort: 15020
    interval: 15s
```

## Key PromQL Queries for API Monitoring

Once Prometheus is scraping your mesh, here are the queries you will use most often.

Request rate per service:

```promql
sum(rate(istio_requests_total{destination_service_namespace="default"}[5m])) by (destination_service_name)
```

Error rate (5xx responses):

```promql
sum(rate(istio_requests_total{destination_service_namespace="default", response_code=~"5.."}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{destination_service_namespace="default"}[5m])) by (destination_service_name)
```

P99 latency per service:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_namespace="default"}[5m]))
  by (destination_service_name, le)
)
```

P50 latency:

```promql
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_namespace="default"}[5m]))
  by (destination_service_name, le)
)
```

Request rate by HTTP method and path:

```promql
sum(rate(istio_requests_total{destination_service_name="my-api"}[5m])) by (request_protocol, response_code)
```

## Setting Up Grafana Dashboards

Deploy Grafana with the Istio addon:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
```

Istio ships with several pre-built dashboards. Access Grafana through port-forwarding:

```bash
kubectl port-forward svc/grafana -n istio-system 3000:3000
```

The most useful built-in dashboards are:

- **Istio Mesh Dashboard** - overview of all services in the mesh
- **Istio Service Dashboard** - detailed view of a single service
- **Istio Workload Dashboard** - per-pod metrics

For a custom API monitoring dashboard, create a dashboard JSON and load it via ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-monitoring-dashboard
  namespace: istio-system
  labels:
    grafana_dashboard: "1"
data:
  api-monitoring.json: |
    {
      "dashboard": {
        "title": "API Monitoring",
        "panels": [
          {
            "title": "Request Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(rate(istio_requests_total{destination_service_namespace=\"default\"}[5m])) by (destination_service_name)",
                "legendFormat": "{{destination_service_name}}"
              }
            ]
          },
          {
            "title": "Error Rate",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(rate(istio_requests_total{response_code=~\"5..\", destination_service_namespace=\"default\"}[5m])) by (destination_service_name)",
                "legendFormat": "{{destination_service_name}}"
              }
            ]
          },
          {
            "title": "P99 Latency",
            "type": "graph",
            "targets": [
              {
                "expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_namespace=\"default\"}[5m])) by (destination_service_name, le))",
                "legendFormat": "{{destination_service_name}}"
              }
            ]
          }
        ]
      }
    }
```

## Configuring Access Logging

Metrics give you aggregates. Access logs give you individual requests. Enable access logging in Istio:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

To customize the log format:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
      %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%
      "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%"
      "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%"
      "%UPSTREAM_HOST%" %UPSTREAM_CLUSTER%
```

## Setting Up Alerts

Prometheus alerting rules catch problems before your users do:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-api-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-api
    rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(istio_requests_total{response_code=~"5..", destination_service_namespace="default"}[5m])) by (destination_service_name)
        /
        sum(rate(istio_requests_total{destination_service_namespace="default"}[5m])) by (destination_service_name)
        > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate on {{ $labels.destination_service_name }}"
        description: "Service {{ $labels.destination_service_name }} has error rate above 5% for 5 minutes"
    - alert: HighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{destination_service_namespace="default"}[5m]))
          by (destination_service_name, le)
        ) > 5000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High P99 latency on {{ $labels.destination_service_name }}"
        description: "Service {{ $labels.destination_service_name }} P99 latency is above 5 seconds"
    - alert: NoTraffic
      expr: |
        absent(rate(istio_requests_total{destination_service_name="my-api"}[5m]))
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "No traffic to my-api"
```

## Monitoring API SLOs

Define your SLO targets and track them:

```promql
# SLO: 99.9% availability (less than 0.1% errors)
1 - (
  sum(rate(istio_requests_total{response_code=~"5..", destination_service_name="my-api"}[30d]))
  /
  sum(rate(istio_requests_total{destination_service_name="my-api"}[30d]))
)

# Error budget remaining
(0.001 - (
  sum(rate(istio_requests_total{response_code=~"5..", destination_service_name="my-api"}[30d]))
  /
  sum(rate(istio_requests_total{destination_service_name="my-api"}[30d]))
)) / 0.001
```

## Quick Checks from the Command Line

You do not always need a dashboard. Sometimes a quick CLI check is enough:

```bash
# Check the request stats for a specific pod
istioctl dashboard envoy <pod-name>.default

# Get a quick overview of mesh traffic
istioctl x describe service my-api.default

# Check proxy stats directly
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -E "downstream_rq|upstream_rq"
```

API monitoring with Istio is mostly about knowing which metrics to look at and setting up the right alerts. The data is already there because the sidecars collect it automatically. Your job is to build the dashboards and alerting rules that turn that raw data into actionable insights.
