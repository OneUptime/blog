# How to Build a MongoDB Performance Dashboard in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Grafana, Dashboard, Prometheus, Visualization

Description: Build a comprehensive MongoDB performance dashboard in Grafana with panels for connections, throughput, replication lag, and WiredTiger cache metrics.

---

## Introduction

A well-designed Grafana dashboard gives your team at-a-glance visibility into MongoDB health. This guide covers building a dashboard from scratch with panels for the most critical MongoDB metrics, using Prometheus as the data source with the MongoDB Exporter.

## Setting Up the Data Source

Ensure Prometheus is configured as a data source in Grafana and is scraping the MongoDB Exporter on port 9216.

## Dashboard JSON Skeleton

Create a new dashboard and set its time range to "Last 3 hours" with a 30-second auto-refresh:

```json
{
  "title": "MongoDB Performance",
  "refresh": "30s",
  "time": { "from": "now-3h", "to": "now" },
  "panels": []
}
```

## Panel 1: Instance Status (Stat Panel)

```promql
mongodb_up
```

Configure as a Stat panel with value mappings: `1 = UP (green)`, `0 = DOWN (red)`.

## Panel 2: Active Connections (Time Series)

```promql
# Current connections
mongodb_connections{state="current"}

# Available connections
mongodb_connections{state="available"}
```

Set thresholds at 80% of `maxIncomingConnections` (default 65536) to color-code pressure.

## Panel 3: Operations Per Second (Time Series)

```promql
rate(mongodb_opcounters_total[5m])
```

Display all operation types (insert, query, update, delete, command, getmore) as separate series with distinct colors.

## Panel 4: Replication Lag (Time Series)

```promql
(
  mongodb_mongod_replset_member_optime_date{member_state="PRIMARY"}
  - on() group_right() mongodb_mongod_replset_member_optime_date{member_state="SECONDARY"}
)
```

Add a threshold line at 30 seconds to visually flag lag issues.

## Panel 5: WiredTiger Cache Utilization (Gauge)

```promql
(
  mongodb_wiredtiger_cache_bytes_currently_in_cache
  / mongodb_wiredtiger_cache_maximum_bytes_configured
) * 100
```

Configure as a Gauge panel with color zones: 0-60% green, 60-85% yellow, 85-100% red.

## Panel 6: Memory Usage (Time Series)

```promql
# Resident memory in MB
mongodb_mem_resident_mb

# Virtual memory in MB
mongodb_mem_virtual_mb
```

## Panel 7: Network Traffic (Time Series)

```promql
rate(mongodb_network_bytes_in_total[5m])
rate(mongodb_network_bytes_out_total[5m])
```

## Dashboard Provisioning via YAML

To deploy the dashboard as code:

```yaml
# grafana/provisioning/dashboards/mongodb.yaml
apiVersion: 1
providers:
  - name: MongoDB
    type: file
    options:
      path: /var/lib/grafana/dashboards/mongodb
      foldersFromFilesStructure: true
```

```bash
# Import official dashboard from grafana.com
# Dashboard ID 2583 is the community MongoDB dashboard
curl -X POST http://grafana:3000/api/dashboards/import \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gnetId": 2583, "overwrite": true, "inputs": [{"name": "DS_PROMETHEUS", "type": "datasource", "pluginId": "prometheus", "value": "Prometheus"}]}'
```

## Summary

A MongoDB Grafana dashboard built on Prometheus metrics needs at minimum six panels: instance status, active connections, operations per second, replication lag, WiredTiger cache utilization, and memory usage. Use thresholds and color zones to make the dashboard self-annotating - an operator should be able to assess cluster health at a glance in under five seconds. Store dashboard JSON in version control and deploy via Grafana provisioning for reproducibility.
