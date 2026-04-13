# How to Monitor MongoDB with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Prometheus, Grafana, Monitoring, Metric

Description: Set up comprehensive MongoDB monitoring with Prometheus and Grafana using the mongodb_exporter to track performance, replication lag, and resource usage.

---

## Overview

Monitoring MongoDB with Prometheus and Grafana gives you real-time visibility into query performance, connection counts, replication lag, storage usage, and WiredTiger cache efficiency. The `mongodb_exporter` from Percona collects metrics from MongoDB's `serverStatus` and exposes them in Prometheus format.

## Architecture

```text
MongoDB
   |
mongodb_exporter (port 9216)
   |
Prometheus (scrapes metrics)
   |
Grafana (dashboards + alerts)
```

## Step 1 - Run the MongoDB Exporter

Using Docker:

```bash
docker run -d \
  --name mongodb-exporter \
  --restart unless-stopped \
  -p 9216:9216 \
  -e MONGODB_URI="mongodb://admin:password@mongodb:27017/admin?authSource=admin" \
  percona/mongodb_exporter:0.40 \
  --collect-all \
  --compatible-mode
```

Or directly:

```bash
./mongodb_exporter \
  --mongodb.uri="mongodb://admin:password@localhost:27017/admin?authSource=admin" \
  --collect-all \
  --compatible-mode \
  --web.listen-address=":9216"
```

Verify the exporter is working:

```bash
curl http://localhost:9216/metrics | grep mongodb_up
```

## Step 2 - Configure Prometheus to Scrape MongoDB

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "mongodb"
    static_configs:
      - targets:
          - "mongodb-exporter:9216"
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: "(.*):.*"
        replacement: "${1}"
    scrape_interval: 15s
    scrape_timeout: 10s
```

Reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Step 3 - Verify Metrics in Prometheus

Key metrics to check in Prometheus UI (`http://localhost:9090`):

```text
# Connection metrics
mongodb_connections{state="current"}
mongodb_connections{state="available"}

# Operation metrics
rate(mongodb_op_counters_total[5m])

# Memory usage
mongodb_memory{type="resident"}
mongodb_memory{type="virtual"}

# Replication lag (seconds)
mongodb_rs_members_optimeDate

# WiredTiger cache
mongodb_wiredtiger_cache_bytes_currently_in_cache
mongodb_wiredtiger_cache_maximum_bytes_configured
```

## Step 4 - Import Grafana Dashboard

Import the official MongoDB dashboard from Grafana Labs:

1. Open Grafana UI
2. Go to Dashboards - Import
3. Enter dashboard ID `2583` (MongoDB Overview) or `7353`

Or import via API (fetching dashboard JSON from Grafana.com first):

```bash
# Fetch the dashboard JSON from Grafana.com
DASHBOARD_JSON=$(curl -s https://grafana.com/api/dashboards/2583/revisions/latest/download)

# Import into your Grafana instance
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -d "{
    \"dashboard\": $DASHBOARD_JSON,
    \"inputs\": [{\"name\": \"DS_PROMETHEUS\", \"type\": \"datasource\", \"pluginId\": \"prometheus\", \"value\": \"Prometheus\"}],
    \"overwrite\": true,
    \"folderId\": 0
  }"
```

## Step 5 - Key Dashboard Panels to Build

### Connections Panel

```text
Query: mongodb_connections{state="current", instance=~"$instance"}
Title: Active Connections
Thresholds: warning=500, critical=1000
```

### Replication Lag Panel

```javascript
// Calculate replication lag from optime
// In Prometheus:
max(
  max_over_time(mongodb_rs_members_optimeDate{state="PRIMARY"}[1m]) -
  mongodb_rs_members_optimeDate{state="SECONDARY"}
) by (name)
```

### Query Operations Rate

```text
Query: sum(rate(mongodb_op_counters_total[5m])) by (type)
Title: Operations per Second
```

## Step 6 - Set Up Alerting Rules

```yaml
# mongodb-alerts.yaml
groups:
  - name: mongodb
    rules:
      - alert: MongoDBDown
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MongoDB instance is down"
          description: "MongoDB {{ $labels.instance }} has been down for more than 1 minute"

      - alert: MongoDBHighConnections
        expr: mongodb_connections{state="current"} > 800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB high connection count"
          description: "MongoDB has {{ $value }} active connections"

      - alert: MongoDBReplicationLag
        expr: |
          (max(mongodb_rs_members_optimeDate{state="PRIMARY"}) -
           min(mongodb_rs_members_optimeDate{state="SECONDARY"})) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB replication lag high"
          description: "Replication lag is {{ $value }} seconds"

      - alert: MongoDBWiredTigerCacheUsageHigh
        expr: |
          mongodb_wiredtiger_cache_bytes_currently_in_cache /
          mongodb_wiredtiger_cache_maximum_bytes_configured > 0.95
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "MongoDB WiredTiger cache usage is above 95%"
          description: "WiredTiger cache is {{ $value | humanizePercentage }} full"
```

Apply the rules by copying to the Prometheus rules directory and reloading:

```bash
# Copy to Prometheus rules directory
cp mongodb-alerts.yaml /etc/prometheus/rules/mongodb-alerts.yaml

# Reload Prometheus to pick up the new rules
curl -X POST http://localhost:9090/-/reload
```

If using the Prometheus Operator on Kubernetes, wrap the rules in a `PrometheusRule` CRD instead:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mongodb-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
    - name: mongodb
      rules:
        # ... same rules as above
```

```bash
kubectl apply -f mongodb-prometheusrule.yaml
```

## Step 7 - Monitor on Kubernetes with ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mongodb-exporter
  namespace: monitoring
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: mongodb-exporter
  namespaceSelector:
    matchNames:
      - mongodb
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

## Summary

Monitoring MongoDB with Prometheus and Grafana provides deep visibility into your database health. The mongodb_exporter collects hundreds of metrics from serverStatus and exposes them for Prometheus scraping. Combined with Grafana dashboards and alerting rules for replication lag, connection counts, and cache efficiency, you can proactively detect and resolve MongoDB performance issues.
