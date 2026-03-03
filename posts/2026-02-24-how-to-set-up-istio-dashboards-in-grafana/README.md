# How to Set Up Istio Dashboards in Grafana

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Grafana, Dashboard, Monitoring, Observability

Description: Install and configure Grafana dashboards for Istio to visualize service mesh metrics including traffic, latency, errors, and control plane health.

---

Prometheus collects your Istio metrics, but staring at raw PromQL queries isn't exactly fun. Grafana turns those metrics into visual dashboards that make it easy to spot problems, track trends, and understand your mesh's behavior at a glance. Istio provides several pre-built dashboards that cover the most common monitoring scenarios, and you can customize them or build your own.

## Installing Grafana

If you already have Grafana running (maybe from kube-prometheus-stack), you can skip this part. Otherwise, the quickest setup:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install grafana grafana/grafana \
  --namespace monitoring \
  --create-namespace \
  --set adminPassword='your-secure-password' \
  --set persistence.enabled=true \
  --set persistence.size=10Gi
```

Or if you're using kube-prometheus-stack, Grafana is already included:

```bash
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

## Adding Prometheus as a Data Source

Grafana needs to know where Prometheus lives. If you installed them together, this is usually pre-configured. Otherwise, add it manually:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
  labels:
    grafana_datasource: "true"
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-operated.monitoring.svc:9090
        access: proxy
        isDefault: true
        jsonData:
          timeInterval: 30s
```

You can also add it through the Grafana UI: go to Configuration > Data Sources > Add data source > Prometheus, and enter the URL `http://prometheus-operated.monitoring.svc:9090`.

## Importing Istio's Pre-Built Dashboards

Istio provides several dashboards that you can import. The easiest method is using the Grafana dashboard JSON files from the Istio repository.

### Method 1: Import via ConfigMaps

Create ConfigMaps with the dashboard JSON and label them so Grafana's sidecar picks them up:

```bash
# Download the dashboard JSON files
ISTIO_VERSION=1.24.0

for dashboard in mesh workload service pilot; do
  curl -sL "https://raw.githubusercontent.com/istio/istio/refs/tags/${ISTIO_VERSION}/manifests/addons/dashboards/${dashboard}-dashboard.json" \
    -o "${dashboard}-dashboard.json"
done

# Create ConfigMaps
for dashboard in mesh workload service pilot; do
  kubectl create configmap "istio-grafana-${dashboard}" \
    --from-file="${dashboard}-dashboard.json" \
    --namespace monitoring
  kubectl label configmap "istio-grafana-${dashboard}" \
    grafana_dashboard=1 \
    --namespace monitoring
done
```

### Method 2: Import via Grafana UI

Port-forward to Grafana and import manually:

```bash
kubectl port-forward svc/grafana 3000:80 -n monitoring
```

Open `http://localhost:3000`, log in, then go to Dashboards > Import. You can paste the dashboard JSON or enter the Grafana.com dashboard IDs:

- Istio Mesh Dashboard: `7639`
- Istio Service Dashboard: `7636`
- Istio Workload Dashboard: `7630`
- Istio Performance Dashboard: `11829`
- Istio Control Plane Dashboard: `7645`

## Understanding the Default Dashboards

### Mesh Dashboard

The mesh dashboard gives you a bird's-eye view of your entire service mesh:

- Global request rate
- Global success rate
- Number of 4xx and 5xx responses
- Per-service request rates and error rates

This is your go-to dashboard for spotting mesh-wide issues. If the global error rate spikes, you can drill down from here.

### Service Dashboard

The service dashboard focuses on a single service as a destination. You select a service from a dropdown and see:

- Incoming request rate by source
- Incoming success rate
- Request duration percentiles (P50, P90, P99)
- Request and response sizes
- TCP traffic details

This is what you use when investigating a specific service that might be having problems.

### Workload Dashboard

Similar to the service dashboard but focuses on workloads (deployments). It shows both inbound and outbound traffic for a specific workload, which helps you understand both who's calling your service and what your service calls.

### Control Plane Dashboard

The pilot dashboard monitors istiod health:

- xDS push latency and count
- Number of connected proxies
- Configuration conflicts
- Resource usage (CPU, memory)

Check this when you suspect Istio itself is having issues rather than your applications.

## Building Custom Dashboard Panels

The pre-built dashboards are great starting points, but you'll probably want custom panels. Here are some useful ones:

### Service Error Rate Panel

```promql
# Panel query - error rate per service
sum(rate(istio_requests_total{reporter="destination",response_code=~"5.."}[5m])) by (destination_workload)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload)
```

Set the panel type to "Time series" and add a threshold at 0.01 (1% error rate) to highlight problematic services.

### Latency Heatmap

```promql
# P99 latency by service
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
  by (destination_workload, le)
)
```

Use a "Heatmap" panel type to visualize latency distributions over time.

### Service Topology Panel

```promql
# Request rate between services (for a node graph)
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (source_workload, destination_workload)
```

Use the "Node Graph" panel type to create a service dependency map.

### mTLS Coverage Panel

```promql
# Percentage of mTLS traffic
sum(rate(istio_requests_total{connection_security_policy="mutual_tls",reporter="destination"}[5m]))
/
sum(rate(istio_requests_total{reporter="destination"}[5m]))
* 100
```

Display this as a "Stat" panel with a threshold at 100 to quickly see if all traffic is encrypted.

## Setting Up Dashboard Variables

Make your dashboards interactive with template variables. In Grafana, go to Dashboard Settings > Variables and add:

```text
Name: namespace
Type: Query
Query: label_values(istio_requests_total, destination_workload_namespace)

Name: workload
Type: Query
Query: label_values(istio_requests_total{destination_workload_namespace="$namespace"}, destination_workload)
```

Then use `$namespace` and `$workload` in your panel queries:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_workload_namespace="$namespace",
  destination_workload="$workload"
}[5m])) by (response_code)
```

This lets users select a namespace and workload from dropdowns instead of editing queries.

## Alerting from Grafana

Grafana can trigger alerts based on dashboard panels. Go to a panel, click the Alert tab, and set conditions:

```text
WHEN avg() OF query(A) IS ABOVE 0.05
FOR 5m
```

This would alert when the error rate exceeds 5% for 5 minutes. Configure notification channels (Slack, PagerDuty, email) under Alerting > Notification channels.

For production environments, it's usually better to define alerting rules in Prometheus directly (using PrometheusRule resources) since Prometheus alerting is more reliable for critical alerts. Grafana alerting works well for less critical notifications.

## Dashboard Organization

As your mesh grows, organize dashboards into folders:

- **Istio Overview** - mesh dashboard, control plane dashboard
- **Service Health** - per-service dashboards with error rates and latency
- **Infrastructure** - Envoy proxy resource usage, connection pools
- **SLOs** - dashboards tracking Service Level Objectives

## Provisioning Dashboards as Code

For reproducible setups, store your dashboards as JSON in Git and provision them automatically:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-istio-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  custom-mesh-overview.json: |
    {
      "dashboard": {
        "title": "Custom Mesh Overview",
        "panels": [
          {
            "title": "Total Request Rate",
            "type": "stat",
            "targets": [
              {
                "expr": "sum(rate(istio_requests_total{reporter=\"destination\"}[5m]))",
                "legendFormat": "requests/sec"
              }
            ]
          }
        ]
      }
    }
```

The Grafana sidecar (included in the Helm chart) watches for ConfigMaps with the `grafana_dashboard` label and automatically loads them.

## Performance Considerations

Complex dashboards with many panels can put significant load on Prometheus. A few tips:

- Use recording rules in Prometheus for frequently queried aggregations
- Set reasonable time ranges (last 6 hours instead of last 30 days)
- Limit the number of auto-refreshing dashboards you keep open
- Use `$__rate_interval` instead of hardcoded intervals in Grafana queries for correct rate calculations

With Grafana dashboards backed by Prometheus, you get a complete visual monitoring solution for your Istio mesh that requires zero changes to your application code.
