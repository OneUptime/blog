# How to Create Custom Grafana Dashboards in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Grafana

Description: Step-by-step guide to creating, provisioning, and managing custom Grafana dashboards in Rancher for Kubernetes monitoring.

While Rancher ships with a comprehensive set of pre-built Grafana dashboards, most teams need custom dashboards tailored to their specific applications and operational requirements. This guide covers creating dashboards both through the Grafana UI and through Kubernetes ConfigMaps for persistent, version-controlled dashboards.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Access to Grafana through the Rancher UI.
- Familiarity with PromQL for writing metric queries.

## Step 1: Create a Dashboard in the Grafana UI

1. Open Grafana from **Monitoring > Grafana** in the Rancher UI.
2. Click the **+** icon in the left sidebar and select **New dashboard**.
3. Click **Add a new panel**.

In the panel editor:
- **Query**: Enter a PromQL expression. For example: `sum(rate(container_cpu_usage_seconds_total{namespace="default"}[5m])) by (pod)`
- **Visualization**: Choose a visualization type (Time series, Gauge, Stat, Table, etc.).
- **Panel title**: Give the panel a descriptive name.
- Click **Apply** to add the panel to the dashboard.

## Step 2: Add Common Panel Types

### Time Series Panel for CPU Usage

```plaintext
Query: sum(rate(container_cpu_usage_seconds_total{namespace="$namespace", container!=""}[5m])) by (pod)
Legend: {{ pod }}
Unit: cores
```

### Gauge Panel for Memory Percentage

```plaintext
Query: (1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)) * 100
Unit: percent (0-100)
Thresholds: 0=green, 70=yellow, 85=red
```

### Stat Panel for Pod Count

```plaintext
Query: count(kube_pod_info{namespace="$namespace"})
Unit: short
Color mode: Value
```

### Table Panel for Top Resource Consumers

```plaintext
Query A: topk(10, sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (namespace, pod))
Query B: topk(10, sum(container_memory_working_set_bytes{container!=""}) by (namespace, pod))
Format: Table
```

## Step 3: Add Dashboard Variables

Variables make dashboards interactive by allowing users to filter data:

1. Click the gear icon (Dashboard settings) at the top.
2. Go to **Variables** and click **Add variable**.

### Namespace Variable

```plaintext
Name: namespace
Type: Query
Data source: Prometheus
Query type: Label values
Metric: kube_pod_info
Label: namespace
Sort: Alphabetical (asc)
```

### Pod Variable

```plaintext
Name: pod
Type: Query
Data source: Prometheus
Query type: Label values
Metric: kube_pod_info{namespace="$namespace"}
Label: pod
Sort: Alphabetical (asc)
Multi-value: enabled
Include All option: enabled
```

### Node Variable

```plaintext
Name: node
Type: Query
Data source: Prometheus
Query type: Label values
Metric: kube_node_info
Label: node
```

Reference variables in your queries using `$namespace`, `$pod`, or `$node`. If you enable **Multi-value** or **Include All option**, use regex matchers such as `namespace=~"$namespace"` or `pod=~"$pod"` instead of `=`.

## Step 4: Save and Export the Dashboard

1. Click the save icon (or Ctrl+S).
2. Give the dashboard a name and select a folder.
3. Click **Save**.

To export the dashboard as JSON for version control:

1. Click the gear icon (Dashboard settings).
2. Click **JSON Model** in the left sidebar.
3. Copy the JSON content.

Alternatively, use the authenticated Grafana API:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-grafana 3000:80

curl -s -u YOUR_GRAFANA_USERNAME:YOUR_GRAFANA_PASSWORD http://localhost:3000/api/dashboards/uid/YOUR_DASHBOARD_UID | jq '.dashboard' > my-dashboard.json
```

## Step 5: Provision Dashboards via ConfigMap

For persistent dashboards that survive Grafana pod restarts, create a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-app-dashboard
  namespace: cattle-dashboards
  labels:
    grafana_dashboard: "1"
data:
  app-overview.json: |
    {
      "annotations": { "list": [] },
      "editable": true,
      "fiscalYearStartMonth": 0,
      "graphTooltip": 1,
      "links": [],
      "panels": [
        {
          "datasource": { "type": "prometheus", "uid": "prometheus" },
          "fieldConfig": {
            "defaults": { "unit": "cores" }
          },
          "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
          "targets": [{
            "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"default\", container!=\"\"}[5m])) by (pod)",
            "legendFormat": "{{ pod }}"
          }],
          "title": "Pod CPU Usage",
          "type": "timeseries"
        },
        {
          "datasource": { "type": "prometheus", "uid": "prometheus" },
          "fieldConfig": {
            "defaults": { "unit": "bytes" }
          },
          "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
          "targets": [{
            "expr": "sum(container_memory_working_set_bytes{namespace=\"default\", container!=\"\"}) by (pod)",
            "legendFormat": "{{ pod }}"
          }],
          "title": "Pod Memory Usage",
          "type": "timeseries"
        }
      ],
      "title": "Application Overview",
      "uid": "custom-app-overview"
    }
```

Apply the ConfigMap:

```bash
kubectl apply -f custom-app-dashboard.yaml
```

By default in Rancher Monitoring, the Grafana sidecar watches ConfigMaps with the `grafana_dashboard: "1"` label in the `cattle-dashboards` namespace and loads them as dashboards.

## Step 6: Organize Dashboards into Folders

Folder-based organization for ConfigMap-provisioned dashboards is not enabled by default in Rancher Monitoring. To organize provisioned dashboards into folders, first enable the Grafana sidecar settings `grafana.sidecar.dashboards.folderAnnotation` and `grafana.sidecar.dashboards.provider.foldersFromFilesStructure=true` in the Monitoring chart.

After that, annotate the ConfigMap with the configured folder annotation. With the sidecar's default annotation name, it looks like this:

```yaml
metadata:
  annotations:
    k8s-sidecar-target-directory: "Team A Dashboards"
```

Different teams can have their own folders:
- `Platform Engineering`
- `Application Monitoring`
- `SRE Dashboards`
- `Business Metrics`

## Step 7: Import Community Dashboards

Grafana has a large library of community dashboards. To import one:

1. Visit [grafana.com/grafana/dashboards](https://grafana.com/grafana/dashboards).
2. Find a dashboard and note its ID.
3. In Grafana, click **+** > **Import**.
4. Enter the dashboard ID and click **Load**.
5. Select the Prometheus data source and click **Import**.

Popular dashboard IDs for Kubernetes:
- **315** - Kubernetes cluster monitoring (via Prometheus)
- **6417** - Kubernetes Cluster (Prometheus)
- **1860** - Node Exporter Full
- **9614** - NGINX Ingress controller

To persist an imported dashboard, export its JSON and create a ConfigMap as shown in Step 5.

## Step 8: Create a Dashboard for Application SLIs

Build a dashboard focused on Service Level Indicators:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sli-dashboard
  namespace: cattle-dashboards
  labels:
    grafana_dashboard: "1"
data:
  sli.json: |
    {
      "title": "Service Level Indicators",
      "uid": "sli-dashboard",
      "panels": [
        {
          "title": "Availability (Success Rate)",
          "type": "gauge",
          "gridPos": { "h": 8, "w": 8, "x": 0, "y": 0 },
          "targets": [{
            "expr": "sum(rate(http_requests_total{status!~\"5..\"}[1h])) / sum(rate(http_requests_total[1h])) * 100"
          }],
          "fieldConfig": {
            "defaults": {
              "unit": "percent",
              "thresholds": {
                "steps": [
                  { "value": 0, "color": "red" },
                  { "value": 99, "color": "yellow" },
                  { "value": 99.9, "color": "green" }
                ]
              }
            }
          }
        },
        {
          "title": "P99 Latency",
          "type": "stat",
          "gridPos": { "h": 8, "w": 8, "x": 8, "y": 0 },
          "targets": [{
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
          }],
          "fieldConfig": {
            "defaults": { "unit": "s" }
          }
        }
      ]
    }
```

## Summary

Custom Grafana dashboards in Rancher can be created through the Grafana UI for quick prototyping or provisioned through Kubernetes ConfigMaps for persistence and version control. Use dashboard variables for interactivity, import community dashboards for common monitoring scenarios, and store dashboard JSON in ConfigMaps in the `cattle-dashboards` namespace so dashboards persist across pod restarts. If you want ConfigMap-provisioned dashboards grouped into Grafana folders, enable folder-based sidecar provisioning in the Monitoring chart first.
