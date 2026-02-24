# How to Set Up Grafana Dashboards for Istio Mesh Overview

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Grafana, Monitoring, Observability, Service Mesh

Description: Set up and customize Grafana dashboards to get a complete overview of your Istio service mesh including traffic, errors, and latency.

---

Running Istio without good dashboards is like driving without a speedometer. You need visibility into what's happening across your entire mesh: how much traffic is flowing, which services are healthy, what the error rates look like, and where latency bottlenecks exist. Grafana paired with Prometheus gives you exactly this, and Istio ships with pre-built dashboards that you can deploy in minutes.

## Installing Grafana for Istio

If you installed Istio with the demo profile, Grafana might already be included. If not, install it from the Istio addons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

Wait for it to be ready:

```bash
kubectl rollout status deployment/grafana -n istio-system
```

Access the Grafana dashboard:

```bash
istioctl dashboard grafana
```

This opens Grafana in your browser. By default, Istio's Grafana deployment comes with several pre-configured dashboards.

## The Mesh Dashboard

Istio includes a pre-built "Istio Mesh Dashboard" that gives you a high-level view of your entire mesh. It shows:

- Global request volume
- Global success rate
- Number of services in the mesh
- Per-service request rates and error rates

If the dashboard isn't already imported, you can find it in the Grafana dashboard store. Istio publishes their dashboards with specific IDs:

```bash
# The Istio mesh dashboard is typically available at
# Grafana -> Dashboards -> Browse -> Istio -> Istio Mesh Dashboard
```

## Building a Custom Mesh Overview Dashboard

The pre-built dashboards are good starting points, but you'll probably want to customize them for your needs. Here is how to build a mesh overview dashboard from scratch.

### Panel 1: Total Request Volume

```promql
round(sum(rate(istio_requests_total{reporter="source"}[5m])), 0.001)
```

This gives you the total request rate across all services in the mesh. Use a Stat panel for a single big number, or a Time Series panel to see the trend.

### Panel 2: Global Success Rate

```promql
sum(rate(istio_requests_total{reporter="source", response_code!~"5.*"}[5m]))
/
sum(rate(istio_requests_total{reporter="source"}[5m]))
* 100
```

Display this as a gauge with thresholds: green for 99%+, yellow for 95-99%, red for below 95%.

### Panel 3: 4xx Error Rate

```promql
sum(rate(istio_requests_total{reporter="source", response_code=~"4.*"}[5m]))
/
sum(rate(istio_requests_total{reporter="source"}[5m]))
* 100
```

### Panel 4: 5xx Error Rate

```promql
sum(rate(istio_requests_total{reporter="source", response_code=~"5.*"}[5m]))
/
sum(rate(istio_requests_total{reporter="source"}[5m]))
* 100
```

### Panel 5: Request Rate by Service

This is typically the most useful panel on the dashboard:

```promql
sort_desc(
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
)
```

Use a Table panel to show all services sorted by traffic volume. Add columns for error rate and latency:

```promql
# Error rate per service
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.*"}[5m])) by (destination_service)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
* 100
```

### Panel 6: P50/P95/P99 Latency

```promql
# P50
histogram_quantile(0.50, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m])) by (le))

# P95
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m])) by (le))

# P99
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m])) by (le))
```

### Panel 7: Top Error Services

```promql
topk(10,
  sum(rate(istio_requests_total{reporter="destination", response_code=~"5.*"}[5m])) by (destination_service)
)
```

This highlights the top 10 services with the most errors. Use a bar chart for easy visual scanning.

## Configuring Prometheus as Data Source

If Prometheus isn't already configured as a data source in Grafana, add it:

1. Go to Grafana -> Configuration -> Data Sources -> Add data source
2. Select Prometheus
3. Set the URL to `http://prometheus.istio-system:9090`
4. Click "Save & Test"

Alternatively, configure it through a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: istio-system
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus.istio-system:9090
        access: proxy
        isDefault: true
```

## Persistent Dashboard Storage

By default, Grafana dashboards are stored in memory and lost when the pod restarts. To persist them, use a ConfigMap or a persistent volume.

Using a ConfigMap to provision dashboards:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-mesh-dashboard
  namespace: istio-system
  labels:
    grafana_dashboard: "1"
data:
  istio-mesh-dashboard.json: |
    {
      "dashboard": {
        "title": "Istio Mesh Overview",
        "panels": [
          ...
        ]
      }
    }
```

Or use a PVC for full persistence:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-storage
  namespace: istio-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

Then mount it in the Grafana deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: istio-system
spec:
  template:
    spec:
      containers:
        - name: grafana
          volumeMounts:
            - mountPath: /var/lib/grafana
              name: grafana-storage
      volumes:
        - name: grafana-storage
          persistentVolumeClaim:
            claimName: grafana-storage
```

## Setting Up Dashboard Variables

Make your dashboard reusable with Grafana variables:

1. Go to Dashboard Settings -> Variables
2. Add a variable called `namespace`:
   - Query: `label_values(istio_requests_total, destination_workload_namespace)`
   - Refresh: On Dashboard Load
3. Add a variable called `service`:
   - Query: `label_values(istio_requests_total{destination_workload_namespace="$namespace"}, destination_service)`

Then use `$namespace` and `$service` in your queries to make panels filterable.

## Alerting from Grafana

Grafana can also fire alerts based on your dashboard panels. Add an alert to the error rate panel:

1. Edit the panel
2. Go to the Alert tab
3. Set condition: `WHEN avg() OF query(A) IS ABOVE 5` (5% error rate)
4. Set evaluation interval and notification channels

This gives you a visual + alerting setup all in one place.

## Summary

Setting up Grafana dashboards for Istio mesh overview involves installing Grafana, configuring Prometheus as a data source, and building panels for request volume, success rates, error rates, and latency distributions. Start with Istio's pre-built dashboards for quick value, then customize them with additional panels specific to your services. Use variables to make dashboards interactive and persistent storage to keep your customizations across pod restarts.
