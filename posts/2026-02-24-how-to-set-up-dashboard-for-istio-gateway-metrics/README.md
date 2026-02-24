# How to Set Up Dashboard for Istio Gateway Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Grafana, Metrics, Dashboard, Monitoring

Description: Step-by-step instructions for building a Grafana dashboard to monitor Istio ingress and egress gateway performance and health.

---

Your Istio gateways are the front door to your mesh. All external traffic flows through them, which makes gateway monitoring absolutely critical. If your ingress gateway is struggling, every service behind it suffers. Building a solid dashboard for gateway metrics gives you the visibility to catch issues before your users notice them.

## Understanding Istio Gateway Metrics

Istio gateways are essentially Envoy proxies running in standalone mode (not as sidecars). They expose the same set of Envoy metrics plus Istio-specific telemetry. The metrics are available on port 15090 at the `/stats/prometheus` endpoint.

The key difference between gateway metrics and sidecar metrics is scope. Gateway metrics show you the edge of your mesh - everything entering and leaving. Sidecar metrics show you individual service-to-service communication.

## Prerequisites

Before building the dashboard, make sure you have:

- Prometheus scraping your Istio gateways
- Grafana connected to your Prometheus data source
- Istio installed with telemetry enabled (the default)

Verify that Prometheus is scraping your gateway:

```bash
kubectl port-forward svc/prometheus -n istio-system 9090:9090
```

Then query for `istio_requests_total{reporter="source",source_workload="istio-ingressgateway"}` to confirm data is flowing.

## Essential Gateway Metrics

Here are the metrics you want on your dashboard:

### Request Rate

Total requests per second flowing through the gateway:

```promql
sum(rate(istio_requests_total{reporter="source",source_workload="istio-ingressgateway"}[5m]))
```

Break it down by destination service:

```promql
sum(rate(istio_requests_total{reporter="source",source_workload="istio-ingressgateway"}[5m])) by (destination_service)
```

### Error Rate

Track 4xx and 5xx responses separately:

```promql
# 5xx errors
sum(rate(istio_requests_total{reporter="source",source_workload="istio-ingressgateway",response_code=~"5.*"}[5m]))

# 4xx errors
sum(rate(istio_requests_total{reporter="source",source_workload="istio-ingressgateway",response_code=~"4.*"}[5m]))
```

### Latency Distribution

```promql
# P50 latency
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source",source_workload="istio-ingressgateway"}[5m])) by (le))

# P95 latency
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source",source_workload="istio-ingressgateway"}[5m])) by (le))

# P99 latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source",source_workload="istio-ingressgateway"}[5m])) by (le))
```

### Request/Response Size

```promql
# Average request size
sum(rate(istio_request_bytes_sum{reporter="source",source_workload="istio-ingressgateway"}[5m]))
/
sum(rate(istio_request_bytes_count{reporter="source",source_workload="istio-ingressgateway"}[5m]))

# Average response size
sum(rate(istio_response_bytes_sum{reporter="source",source_workload="istio-ingressgateway"}[5m]))
/
sum(rate(istio_response_bytes_count{reporter="source",source_workload="istio-ingressgateway"}[5m]))
```

## Building the Dashboard

Here is a complete Grafana dashboard JSON that you can import directly:

```json
{
  "dashboard": {
    "title": "Istio Gateway Metrics",
    "tags": ["istio", "gateway"],
    "timezone": "browser",
    "panels": [
      {
        "title": "Requests Per Second",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{reporter=\"source\",source_workload=\"istio-ingressgateway\"}[5m])) by (destination_service)",
            "legendFormat": "{{ destination_service }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{reporter=\"source\",source_workload=\"istio-ingressgateway\",response_code=~\"5.*\"}[5m]))",
            "legendFormat": "5xx"
          },
          {
            "expr": "sum(rate(istio_requests_total{reporter=\"source\",source_workload=\"istio-ingressgateway\",response_code=~\"4.*\"}[5m]))",
            "legendFormat": "4xx"
          }
        ]
      },
      {
        "title": "Response Latency",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{reporter=\"source\",source_workload=\"istio-ingressgateway\"}[5m])) by (le))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{reporter=\"source\",source_workload=\"istio-ingressgateway\"}[5m])) by (le))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter=\"source\",source_workload=\"istio-ingressgateway\"}[5m])) by (le))",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Active Connections",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
        "targets": [
          {
            "expr": "sum(envoy_server_total_connections{pod=~\"istio-ingressgateway.*\"})",
            "legendFormat": "Total Connections"
          }
        ]
      },
      {
        "title": "Success Rate",
        "type": "gauge",
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 16},
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{reporter=\"source\",source_workload=\"istio-ingressgateway\",response_code!~\"5.*\"}[5m])) / sum(rate(istio_requests_total{reporter=\"source\",source_workload=\"istio-ingressgateway\"}[5m]))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 0.95},
                {"color": "green", "value": 0.99}
              ]
            },
            "unit": "percentunit"
          }
        }
      },
      {
        "title": "Gateway Pod CPU",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 9, "x": 6, "y": 16},
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{pod=~\"istio-ingressgateway.*\",container=\"istio-proxy\"}[5m])) by (pod)",
            "legendFormat": "{{ pod }}"
          }
        ]
      },
      {
        "title": "Gateway Pod Memory",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 9, "x": 15, "y": 16},
        "targets": [
          {
            "expr": "container_memory_working_set_bytes{pod=~\"istio-ingressgateway.*\",container=\"istio-proxy\"} / 1024 / 1024",
            "legendFormat": "{{ pod }} (MB)"
          }
        ]
      }
    ]
  }
}
```

## Adding Egress Gateway Monitoring

If you are using an egress gateway, duplicate the panels but swap the workload filter:

```promql
# Egress gateway request rate
sum(rate(istio_requests_total{reporter="source",source_workload="istio-egressgateway"}[5m])) by (destination_service)
```

## Gateway-Specific Envoy Metrics

Beyond the Istio telemetry metrics, the gateway Envoy proxies expose additional useful stats:

```promql
# Downstream connection stats
envoy_listener_downstream_cx_active{pod=~"istio-ingressgateway.*"}
envoy_listener_downstream_cx_total{pod=~"istio-ingressgateway.*"}

# SSL/TLS stats
envoy_listener_ssl_handshake{pod=~"istio-ingressgateway.*"}
envoy_listener_ssl_connection_error{pod=~"istio-ingressgateway.*"}

# HTTP/2 stats
envoy_cluster_http2_streams_active{pod=~"istio-ingressgateway.*"}
```

## Setting Up Variables for Flexibility

Make your dashboard more flexible by adding Grafana template variables:

```
# Gateway variable
label_values(istio_requests_total{reporter="source"}, source_workload)

# Namespace variable
label_values(istio_requests_total{reporter="source",source_workload="$gateway"}, destination_service_namespace)

# Service variable
label_values(istio_requests_total{reporter="source",source_workload="$gateway",destination_service_namespace="$namespace"}, destination_service)
```

This lets you filter the dashboard by gateway, namespace, and destination service without editing queries.

## Importing Pre-built Dashboards

Istio ships with several Grafana dashboards that you can use as a starting point. If you installed Istio with the addons, they are already available. Otherwise, you can find them in the Istio source:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

The built-in mesh dashboard includes gateway panels, but building your own gives you the flexibility to focus on what matters most for your specific setup.

Gateway monitoring is the first line of defense for your mesh. Get this dashboard set up early, add alerting on the error rate and latency panels, and you will have a clear picture of how traffic enters and exits your mesh at all times.
