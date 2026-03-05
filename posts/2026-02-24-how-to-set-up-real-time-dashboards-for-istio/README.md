# How to Set Up Real-Time Dashboards for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Dashboard, Grafana, Real-Time Monitoring, Observability

Description: A practical guide to building real-time dashboards for your Istio service mesh using Grafana, Kiali, and Prometheus, with dashboard templates for mesh overview and service detail views.

---

When something breaks in production, you do not want to be running ad-hoc queries. You want to glance at a dashboard and immediately understand what is happening. Building good real-time dashboards for Istio means choosing the right metrics, the right refresh rates, and the right layout so that problems jump out at you.

## Choosing Your Dashboard Tool

The two main options for Istio dashboards are Grafana and Kiali.

**Grafana** is the general-purpose choice. It connects to Prometheus, supports complex PromQL queries, and lets you build custom dashboards for any use case.

**Kiali** is purpose-built for Istio. It shows a service graph, traffic flow, and configuration validation. It is great for understanding the mesh topology but less flexible for custom metrics.

For real-time monitoring, most teams use both: Kiali for topology visualization and Grafana for detailed metrics.

## Setting Up Grafana with Istio

Deploy Grafana with the Istio addon:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
```

For production, use the Grafana Helm chart with persistent storage:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  --set adminPassword=your-secure-password
```

Configure the Prometheus data source:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus.monitoring.svc.cluster.local:9090
      isDefault: true
      access: proxy
      jsonData:
        timeInterval: 15s
```

## Mesh Overview Dashboard

The mesh overview dashboard gives you a bird's-eye view of your entire service mesh. Here is a complete dashboard definition:

```json
{
  "dashboard": {
    "title": "Istio Mesh Overview",
    "refresh": "10s",
    "time": {"from": "now-15m", "to": "now"},
    "panels": [
      {
        "title": "Total Request Rate",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 0, "y": 0},
        "targets": [{
          "expr": "sum(rate(istio_requests_total{reporter=\"destination\"}[5m]))",
          "legendFormat": "req/sec"
        }]
      },
      {
        "title": "Global Error Rate",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 4, "y": 0},
        "targets": [{
          "expr": "sum(rate(istio_requests_total{reporter=\"destination\", response_code=~\"5..\"}[5m])) / sum(rate(istio_requests_total{reporter=\"destination\"}[5m])) * 100",
          "legendFormat": "error %"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 5}
              ]
            },
            "unit": "percent"
          }
        }
      },
      {
        "title": "Global P99 Latency",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 8, "y": 0},
        "targets": [{
          "expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter=\"destination\"}[5m])) by (le))",
          "legendFormat": "P99 ms"
        }],
        "fieldConfig": {"defaults": {"unit": "ms"}}
      },
      {
        "title": "Active Services",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 12, "y": 0},
        "targets": [{
          "expr": "count(count(istio_requests_total{reporter=\"destination\"}) by (destination_service_name))",
          "legendFormat": "services"
        }]
      },
      {
        "title": "Request Rate by Service",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
        "targets": [{
          "expr": "topk(10, sum(rate(istio_requests_total{reporter=\"destination\"}[5m])) by (destination_service_name))",
          "legendFormat": "{{destination_service_name}}"
        }],
        "options": {"legend": {"placement": "right"}}
      },
      {
        "title": "Error Rate by Service",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
        "targets": [{
          "expr": "sum(rate(istio_requests_total{reporter=\"destination\", response_code=~\"5..\"}[5m])) by (destination_service_name) > 0",
          "legendFormat": "{{destination_service_name}}"
        }],
        "fieldConfig": {"defaults": {"custom": {"fillOpacity": 10}}}
      },
      {
        "title": "P99 Latency by Service",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 12},
        "targets": [{
          "expr": "topk(10, histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter=\"destination\"}[5m])) by (destination_service_name, le)))",
          "legendFormat": "{{destination_service_name}}"
        }],
        "fieldConfig": {"defaults": {"unit": "ms"}}
      }
    ]
  }
}
```

Set the refresh interval to 10 seconds for real-time feel. Going lower than 10 seconds is usually not useful because Prometheus scrapes at 15-second intervals.

## Service Detail Dashboard

A drill-down dashboard for individual services:

```json
{
  "dashboard": {
    "title": "Istio Service Detail",
    "refresh": "10s",
    "templating": {
      "list": [{
        "name": "service",
        "type": "query",
        "query": "label_values(istio_requests_total{reporter=\"destination\"}, destination_service_name)",
        "refresh": 2
      }]
    },
    "panels": [
      {
        "title": "Request Rate",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m]))",
            "legendFormat": "Total"
          },
          {
            "expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (response_code)",
            "legendFormat": "{{response_code}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 8, "x": 8, "y": 0},
        "targets": [{
          "expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", response_code=~\"5..\", reporter=\"destination\"}[5m])) / sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) * 100",
          "legendFormat": "Error %"
        }],
        "fieldConfig": {"defaults": {"unit": "percent"}}
      },
      {
        "title": "Latency Distribution",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 8, "x": 16, "y": 0},
        "targets": [
          {"expr": "histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (le))", "legendFormat": "P50"},
          {"expr": "histogram_quantile(0.90, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (le))", "legendFormat": "P90"},
          {"expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (le))", "legendFormat": "P99"}
        ],
        "fieldConfig": {"defaults": {"unit": "ms"}}
      },
      {
        "title": "Inbound Traffic by Source",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "targets": [{
          "expr": "sum(rate(istio_requests_total{destination_service_name=\"$service\", reporter=\"destination\"}[5m])) by (source_workload)",
          "legendFormat": "{{source_workload}}"
        }]
      },
      {
        "title": "Outbound Traffic by Destination",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
        "targets": [{
          "expr": "sum(rate(istio_requests_total{source_workload=\"$service\", reporter=\"source\"}[5m])) by (destination_service_name)",
          "legendFormat": "{{destination_service_name}}"
        }]
      },
      {
        "title": "Pod CPU Usage",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16},
        "targets": [
          {"expr": "sum(rate(container_cpu_usage_seconds_total{container=\"$service\"}[5m])) by (pod)", "legendFormat": "App - {{pod}}"},
          {"expr": "sum(rate(container_cpu_usage_seconds_total{container=\"istio-proxy\", pod=~\"$service.*\"}[5m])) by (pod)", "legendFormat": "Proxy - {{pod}}"}
        ]
      },
      {
        "title": "Pod Memory Usage",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 16},
        "targets": [
          {"expr": "sum(container_memory_working_set_bytes{container=\"$service\"}) by (pod)", "legendFormat": "App - {{pod}}"},
          {"expr": "sum(container_memory_working_set_bytes{container=\"istio-proxy\", pod=~\"$service.*\"}) by (pod)", "legendFormat": "Proxy - {{pod}}"}
        ],
        "fieldConfig": {"defaults": {"unit": "bytes"}}
      }
    ]
  }
}
```

## Setting Up Kiali

Deploy Kiali:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/kiali.yaml
```

Access the Kiali dashboard:

```bash
istioctl dashboard kiali
```

Kiali shows the service graph in real-time. Traffic flows are animated, and error rates are highlighted in red. It is particularly useful for understanding request flow and spotting which service-to-service connections are failing.

## Real-Time Alerting Dashboard

Create a dashboard specifically for on-call engineers:

```json
{
  "dashboard": {
    "title": "Istio Alerts Dashboard",
    "refresh": "5s",
    "panels": [
      {
        "title": "Active Alerts",
        "type": "alertlist",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "options": {
          "showOptions": "current",
          "sortOrder": 1,
          "stateFilter": {
            "firing": true,
            "pending": true
          }
        }
      },
      {
        "title": "Services with Errors (Last 5 min)",
        "type": "table",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [{
          "expr": "sort_desc(sum(rate(istio_requests_total{response_code=~\"5..\", reporter=\"destination\"}[5m])) by (destination_service_name) > 0)",
          "format": "table",
          "instant": true
        }]
      },
      {
        "title": "Slowest Services (P99 > 1s)",
        "type": "table",
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8},
        "targets": [{
          "expr": "sort_desc(histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter=\"destination\"}[5m])) by (destination_service_name, le)) > 1000)",
          "format": "table",
          "instant": true
        }]
      }
    ]
  }
}
```

## Dashboard Auto-Provisioning

Store dashboards as ConfigMaps so they are version-controlled and automatically loaded:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-dashboards
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  mesh-overview.json: |
    { ... dashboard JSON ... }
  service-detail.json: |
    { ... dashboard JSON ... }
```

Configure Grafana to load dashboards from ConfigMaps:

```yaml
# Grafana Helm values
sidecar:
  dashboards:
    enabled: true
    label: grafana_dashboard
    searchNamespace: monitoring
```

## Performance Tips for Real-Time Dashboards

1. **Use recording rules** for complex queries. Pre-computed metrics load faster.

2. **Avoid `topk` in real-time panels** if you have many services. It is expensive. Use recording rules instead.

3. **Set appropriate time ranges**. A 15-minute window with 10-second refresh gives you real-time feel. A 24-hour window with 10-second refresh is wasteful.

4. **Use instant queries for tables**. Range queries for graphs, instant queries for stat panels and tables.

5. **Limit the number of panels**. Each panel is a separate Prometheus query. Keep your overview dashboard under 10 panels.

```bash
# Check Prometheus query performance
curl -s 'http://prometheus:9090/api/v1/query?query=sum(rate(istio_requests_total[5m]))' | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Query time: {d.get(\"stats\",{}).get(\"timings\",{}).get(\"evalTotalTime\",\"N/A\")}')"
```

## Sharing and Access

For teams that need view-only access:

```yaml
# Grafana organization and team setup
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-config
data:
  grafana.ini: |
    [auth.anonymous]
    enabled = true
    org_role = Viewer

    [dashboards]
    default_home_dashboard_path = /var/lib/grafana/dashboards/mesh-overview.json
```

Good real-time dashboards are the difference between a 5-minute incident response and a 30-minute one. Start with the mesh overview for the big picture, drill into the service detail for specifics, and keep an alerts dashboard for on-call. With Istio generating the metrics automatically, building these dashboards is mostly about writing the right PromQL queries and organizing the panels in a way that tells a clear story.
