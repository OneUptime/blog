# How to Integrate Istio with Grafana for Dashboards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Grafana, Dashboards, Monitoring, Kubernetes, Observability

Description: A step-by-step guide to setting up Grafana dashboards for Istio service mesh monitoring with pre-built and custom dashboard configurations.

---

Grafana turns your Istio metrics into visual dashboards that make it easy to spot problems, track trends, and understand service behavior. Istio ships with several pre-built Grafana dashboards that cover mesh-level health, per-service metrics, and workload performance. Getting them set up is straightforward, and customizing them for your needs is where the real value comes in.

## Quick Setup

Deploy Grafana using the Istio sample addon:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

You also need Prometheus since Grafana queries it for data:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
```

Verify both are running:

```bash
kubectl get pods -n istio-system -l app.kubernetes.io/name=grafana
kubectl get pods -n istio-system -l app=prometheus
```

Open Grafana:

```bash
istioctl dashboard grafana
```

## Pre-built Istio Dashboards

The Istio addon Grafana comes with several dashboards pre-loaded. You'll find them under the Istio folder in the Grafana sidebar.

### Istio Mesh Dashboard

This gives you a bird's-eye view of your entire mesh:

- Global request volume (requests per second)
- Global success rate
- Number of 4xx and 5xx errors across all services
- Top services by request volume
- Top services by error rate

This is the dashboard you put on a wall monitor. If something's wrong anywhere in the mesh, you'll see it here.

### Istio Service Dashboard

Drill into a specific service:

- Incoming request rate
- Incoming success rate
- Request duration (P50, P90, P99)
- Request size and response size distributions
- TCP traffic metrics
- Client workloads (who's calling this service)

Select a service from the dropdown at the top, and all panels update.

### Istio Workload Dashboard

Similar to the service dashboard but focused on a specific workload (deployment/pod):

- Inbound and outbound request rates
- Error rates by source and destination
- Latency breakdowns
- TCP connection metrics

This is useful when you need to see both incoming and outgoing traffic for a single workload.

### Istio Performance Dashboard

Focuses on the control plane:

- Resource usage (CPU, memory) for Istiod
- xDS push latency
- Config push rates
- Number of connected proxies
- Proxy convergence time

Watch this dashboard during upgrades and when adding large numbers of services to the mesh.

## Setting Up Grafana with an Existing Installation

If you already have Grafana running (maybe through the Grafana Operator or a Helm chart), you need to:

1. Add Prometheus as a data source
2. Import the Istio dashboards

### Add the Data Source

In Grafana, go to Configuration > Data Sources > Add data source:

```
Name: Prometheus
Type: Prometheus
URL: http://prometheus.istio-system.svc:9090
Access: Server (default)
```

If Prometheus is in a different namespace, adjust the URL accordingly.

Or configure it via the Grafana provisioning system:

```yaml
apiVersion: 1
datasources:
- name: Prometheus
  type: prometheus
  url: http://prometheus.istio-system.svc:9090
  access: proxy
  isDefault: true
  editable: true
```

### Import Dashboards

The Istio dashboards are available as JSON files in the Istio repository. Download them:

```bash
# Mesh dashboard
curl -L https://raw.githubusercontent.com/istio/istio/release-1.20/manifests/addons/dashboards/istio-mesh-dashboard.json -o mesh-dashboard.json

# Service dashboard
curl -L https://raw.githubusercontent.com/istio/istio/release-1.20/manifests/addons/dashboards/istio-service-dashboard.json -o service-dashboard.json

# Workload dashboard
curl -L https://raw.githubusercontent.com/istio/istio/release-1.20/manifests/addons/dashboards/istio-workload-dashboard.json -o workload-dashboard.json

# Performance dashboard
curl -L https://raw.githubusercontent.com/istio/istio/release-1.20/manifests/addons/dashboards/istio-performance-dashboard.json -o performance-dashboard.json
```

Import them through the Grafana UI: Dashboards > Import > Upload JSON file.

Or use the Grafana API:

```bash
for dashboard in mesh-dashboard.json service-dashboard.json workload-dashboard.json performance-dashboard.json; do
  curl -X POST http://localhost:3000/api/dashboards/db \
    -H "Content-Type: application/json" \
    -d "{\"dashboard\": $(cat $dashboard), \"overwrite\": true}"
done
```

### Using ConfigMaps for Dashboard Provisioning

For a GitOps approach, store dashboards in ConfigMaps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-grafana-dashboards
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  istio-mesh-dashboard.json: |
    { ... dashboard JSON ... }
```

If you're using the Grafana Helm chart, enable sidecar dashboard loading:

```yaml
# Grafana Helm values
sidecar:
  dashboards:
    enabled: true
    searchNamespace: ALL
    label: grafana_dashboard
```

## Building Custom Dashboards

The pre-built dashboards are a great starting point, but you'll likely want custom panels for your specific services.

### Request Rate Panel

Create a new panel with this PromQL query:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service=~"$service"}[5m]))
by (destination_workload, source_workload)
```

Set the visualization to a time series graph with legend `{{source_workload}} -> {{destination_workload}}`.

### Error Rate Panel

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service=~"$service", response_code=~"5.."}[5m]))
by (destination_workload)
/
sum(rate(istio_requests_total{reporter="destination", destination_service=~"$service"}[5m]))
by (destination_workload)
```

Use a stat panel showing the percentage, with thresholds at 1% (yellow) and 5% (red).

### Latency Heatmap

```promql
sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination", destination_service=~"$service"}[5m]))
by (le)
```

Use a heatmap visualization to show latency distribution over time.

### Service Dependency Graph

```promql
sum(rate(istio_requests_total{reporter="destination"}[5m]))
by (source_workload, destination_workload)
```

Use the Node Graph panel (available in newer Grafana versions) to visualize service-to-service communication.

### Template Variables

Add a template variable for service selection:

```
Name: service
Type: Query
Query: label_values(istio_requests_total{reporter="destination"}, destination_service)
```

This creates a dropdown that lets users select which service to view.

## Setting Up Alerts

Grafana can fire alerts based on Istio metrics. Common alert rules:

### High Error Rate

```yaml
# Grafana alerting rule
- alert: IstioHighErrorRate
  expr: |
    sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m]))
    by (destination_service)
    / sum(rate(istio_requests_total{reporter="destination"}[5m]))
    by (destination_service) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate on {{ $labels.destination_service }}"
    description: "Error rate is {{ $value | humanizePercentage }}"
```

### High Latency

```yaml
- alert: IstioHighLatency
  expr: |
    histogram_quantile(0.99,
      sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
      by (le, destination_service)
    ) > 1000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High P99 latency on {{ $labels.destination_service }}"
```

### Control Plane Issues

```yaml
- alert: IstiodPushErrors
  expr: rate(pilot_xds_push_errors[5m]) > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Istiod is experiencing push errors"
```

## Production Tips

**Use persistent storage for Grafana.** The sample addon uses emptyDir, which means dashboards are lost on pod restart. Mount a PVC:

```yaml
persistence:
  enabled: true
  size: 10Gi
  storageClassName: standard
```

**Version control your dashboards.** Export dashboard JSON and store it in Git. Use Grafana's provisioning system to load dashboards from ConfigMaps or files rather than creating them manually in the UI.

**Separate Prometheus from Istio's namespace.** In production, Prometheus should be in its own namespace (like `monitoring`) with proper storage and retention settings. The Istio sample addon is minimal and not suitable for production data volumes.

**Set appropriate retention.** Istio metrics generate significant data. Configure Prometheus retention based on your storage capacity:

```yaml
# Prometheus config
retention: 15d
storage:
  tsdb:
    retention.size: 50GB
```

## Summary

Grafana and Istio together give you complete visibility into your service mesh. The pre-built dashboards cover the most common monitoring needs, and custom dashboards let you focus on your specific services. The key is having Prometheus properly set up to collect metrics, and then Grafana simply queries and visualizes them. Start with the defaults, then customize as you learn what metrics matter most for your services.
