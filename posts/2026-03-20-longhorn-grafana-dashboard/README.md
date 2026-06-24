# How to View Longhorn Dashboard in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Grafana, Monitoring, Visualization

Description: Set up Grafana dashboards for Longhorn storage monitoring, including how to import the official Longhorn dashboard and create custom panels for capacity and health metrics.

## Introduction

Grafana provides powerful visualization capabilities for Longhorn metrics collected by Prometheus. The Longhorn docs reference a prebuilt Grafana dashboard that displays volume health, disk usage, backup status, and performance metrics in an easy-to-understand format. This guide covers importing that dashboard and customizing it for your environment.

## Prerequisites

- Prometheus configured to scrape Longhorn metrics (see the Longhorn Prometheus guide)
- Grafana installed and connected to the Prometheus data source
- Longhorn metrics visible in Prometheus

## Installing Grafana (if not already installed)

```bash
# Add the Grafana Helm repository

helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update

# Install Grafana
helm install grafana grafana-community/grafana \
  --namespace monitoring \
  --create-namespace \
  --set persistence.enabled=true \
  --set persistence.storageClassName=longhorn \
  --set persistence.size=10Gi

# Get the admin password
kubectl get secret --namespace monitoring grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80
```

## Connecting Grafana to Prometheus

1. Open Grafana at `http://localhost:3000`
2. Login with `admin` and the password from above
3. Navigate to **Connections** → **Data Sources**
4. Click **Add new data source**
5. Select **Prometheus**
6. Enter your Prometheus URL, for example: `http://prometheus.monitoring.svc.cluster.local:9090`
7. Click **Save & Test**

## Importing the Longhorn Example Dashboard

### Method 1: Import by Dashboard ID

1. In Grafana, click **Dashboards** → **New** → **Import**
2. Enter Dashboard ID `17626` (the Longhorn example dashboard referenced in the Longhorn docs)
3. Click **Load**
4. Select your Prometheus data source
5. Click **Import**

### Method 2: Import from JSON

Download the dashboard JSON:

```bash
# Download the Longhorn example dashboard
curl -sSfL \
  "https://grafana.com/api/dashboards/17626/revisions/latest/download" \
  -o longhorn-dashboard.json
```

1. In Grafana, click **Dashboards** → **New** → **Import**
2. Click **Upload JSON file**
3. Select the downloaded `longhorn-dashboard.json`
4. Configure the data source
5. Click **Import**

### Method 3: Via Grafana ConfigMap (GitOps)

```bash
# If your Grafana deployment already provisions dashboards from labeled ConfigMaps,
# generate a manifest from the downloaded dashboard JSON:
kubectl create configmap longhorn-dashboard \
  --from-file=longhorn-dashboard.json \
  -n monitoring \
  --dry-run=client -o yaml | \
kubectl label --local -f - grafana_dashboard=1 -o yaml \
  > grafana-longhorn-dashboard.yaml

kubectl apply -f grafana-longhorn-dashboard.yaml
```

## Creating Custom Dashboard Panels

### Panel 1: Volume Health Status

```json
{
  "title": "Volume Health",
  "type": "stat",
  "targets": [
    {
      "expr": "count(longhorn_volume_robustness{state=\"healthy\"} == 1)",
      "legendFormat": "Healthy"
    },
    {
      "expr": "count(longhorn_volume_robustness{state=\"degraded\"} == 1)",
      "legendFormat": "Degraded"
    },
    {
      "expr": "count(longhorn_volume_robustness{state=\"faulted\"} == 1)",
      "legendFormat": "Faulted"
    }
  ]
}
```

In Grafana:
1. Click **Add panel** on your dashboard
2. Select **Stat** visualization
3. Add one PromQL expression per state, for example: `count(longhorn_volume_robustness{state="healthy"} == 1)`

### Panel 2: Disk Usage Percentage

```promql
# PromQL for disk usage percentage per disk
(longhorn_disk_usage_bytes / longhorn_disk_capacity_bytes) * 100
```

Configuration:
- Visualization: **Gauge**
- Min: 0, Max: 100
- Thresholds: Green (0-70), Yellow (70-90), Red (90-100)

### Panel 3: Volume I/O Throughput

```promql
# Read throughput (bytes per second)
longhorn_volume_read_throughput

# Write throughput (bytes per second)
longhorn_volume_write_throughput
```

Configuration:
- Visualization: **Time series**
- Unit: `bytes/sec`
- Legend: Volume name

### Panel 4: Backup Status

```promql
# Number of volumes with at least one successful backup
count(longhorn_volume_last_backup_at > 0)

# Total completed backups
count(longhorn_backup_state == 3)
```

## Setting Up Dashboard Alerts in Grafana

Grafana can also send alerts based on dashboard metrics. For example, a degraded-volume alert can use this condition:

```promql
count(longhorn_volume_robustness{state="degraded"} == 1) > 0
```

In Grafana UI:
1. Open a **Time series** panel that uses the query above
2. Open the panel menu → **More** → **New alert rule**
3. Configure the evaluation interval, pending period, and notification settings
4. Click **Save rule**

## Dashboard Variables for Multi-Cluster

If your Prometheus setup adds a `cluster` label for multiple clusters, add a cluster variable:

1. Go to Dashboard **Settings** → **Variables**
2. Add a new variable:
   - **Name**: `cluster`
   - **Type**: Query
   - **Query**: `label_values(longhorn_volume_state, cluster)`
3. Use `$cluster` in your PromQL queries: `longhorn_volume_state{cluster="$cluster"}`

## Exporting Your Custom Dashboard

After creating custom panels, export your dashboard for GitOps or sharing:

1. Click the **Share** icon → **Export**
2. Click **Save to file**
3. Store the JSON in your GitOps repository

```bash
# Store dashboard as a labeled ConfigMap for automated provisioning
kubectl create configmap longhorn-custom-dashboard \
  --from-file=longhorn-custom.json \
  -n monitoring \
  --dry-run=client -o yaml | \
kubectl label --local -f - grafana_dashboard=1 -o yaml | \
kubectl apply -f -
```

## Conclusion

Grafana dashboards transform raw Longhorn Prometheus metrics into actionable visual insights. The Longhorn example dashboard provides a solid starting point, while custom panels allow you to focus on the metrics most relevant to your environment. Combined with Grafana or Prometheus alerting rules, Grafana dashboards give your operations team the visibility needed to maintain healthy, well-managed Kubernetes storage infrastructure.
