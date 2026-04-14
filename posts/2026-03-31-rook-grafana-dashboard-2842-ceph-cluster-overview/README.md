# How to Set Up Grafana Dashboard 2842 for Ceph Cluster Overview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Dashboard, Monitoring, Prometheus, Kubernetes

Description: Import and configure Grafana dashboard 2842 to get a comprehensive Ceph cluster overview including health, capacity, IOPS, and throughput in Rook deployments.

---

## Overview

Grafana dashboard 2842 (Ceph - Cluster) provides a high-level overview of your entire Ceph cluster including health status, capacity utilization, IOPS, throughput, and latency. It is one of the most widely used Ceph monitoring dashboards in the community.

## Prerequisites

- Prometheus configured to scrape Rook-Ceph metrics
- Grafana connected to the Prometheus data source

Verify metrics are available:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  curl -s http://rook-ceph-mgr.rook-ceph.svc.cluster.local:9283/metrics | \
  grep -c "ceph_"
```

Enable Rook monitoring:

```yaml
spec:
  monitoring:
    enabled: true
```

## Step 1: Enable ServiceMonitor for Prometheus

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
  labels:
    prometheus: kube-prometheus
spec:
  namespaceSelector:
    matchNames:
    - rook-ceph
  selector:
    matchLabels:
      app: rook-ceph-mgr
  endpoints:
  - port: http-metrics
    path: /metrics
    interval: 30s
```

```bash
kubectl apply -f servicemonitor.yaml
```

## Step 2: Import Dashboard 2842

In Grafana:

1. Navigate to Dashboards - Import
2. Enter dashboard ID `2842`
3. Click Load
4. Select your Prometheus data source
5. Click Import

Or via the Grafana API (two-step process - fetch the dashboard JSON from grafana.com, then import it):

```bash
# Fetch the dashboard JSON from grafana.com
DASHBOARD_JSON=$(curl -s http://localhost:3000/api/gnet/dashboards/2842 | jq .json)

# Import the dashboard
curl -X POST \
  -H "Content-Type: application/json" \
  -d "{\"dashboard\": ${DASHBOARD_JSON}, \"overwrite\": true, \"inputs\": [{\"name\": \"DS_PROMETHEUS\", \"type\": \"datasource\", \"pluginId\": \"prometheus\", \"value\": \"Prometheus\"}]}" \
  http://admin:admin@localhost:3000/api/dashboards/import
```

## Step 3: Configure the Data Source Variable

The dashboard uses a variable `datasource` to select the Prometheus instance. Verify the template variable is set correctly:

1. Open the dashboard
2. Click the gear icon (Dashboard settings)
3. Navigate to Variables
4. Ensure the `datasource` variable points to your Prometheus

## What Dashboard 2842 Shows

Key panels included:

```yaml
Top row:   Health Status | Monitors | OSDs Up | OSDs In | PGs Active+Clean
Second row: Capacity Used % | Used Bytes | Available Bytes
Third row:  Client IOPS | Client Throughput | Recovery Rate
Bottom:     OSD Apply Latency | OSD Commit Latency
```

## Customizing the Dashboard

Add a custom panel for your environment. For example, add pool-specific usage:

```javascript
// PromQL for custom panel
sum by(name) (ceph_pool_bytes_used) /
sum by(name) (ceph_pool_bytes_used + ceph_pool_max_avail) * 100
```

Panel type: Table with columns: Pool Name, Usage %

## Step 4: Set Up Dashboard Alerts

Configure Grafana alerts on key panels:

```yaml
# In Grafana panel settings
Alert rule:
  Name: "Ceph Cluster Usage Critical"
  Condition: WHEN avg() OF query(A, 5m, now) IS ABOVE 85
  Notifications: [your-alertmanager-channel]
```

## Organizing Dashboards in a Folder

```bash
# Create a Ceph folder in Grafana via API
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"title": "Ceph Storage"}' \
  http://admin:admin@localhost:3000/api/folders
```

## Summary

Grafana dashboard 2842 provides an out-of-the-box comprehensive Ceph cluster overview that covers health, capacity, IOPS, throughput, and latency. Import it by ID using Grafana's dashboard import feature, configure the Prometheus data source variable, and customize panels with environment-specific queries for pool-level or OSD-specific visibility.
