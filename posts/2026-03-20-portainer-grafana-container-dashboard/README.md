# How to Create a Container Metrics Dashboard in Grafana via Portainer - Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Grafana, Dashboard, cAdvisor, Metric

Description: Learn how to create comprehensive container metrics dashboards in Grafana using cAdvisor data from your Portainer-managed Docker environment, with practical panel examples and PromQL queries.

## Introduction

Grafana dashboards transform raw Prometheus metrics into actionable visualizations. For Portainer-managed containers, a well-designed dashboard shows CPU and memory usage per container, identifies resource-hungry services, tracks network I/O, and shows when containers were last seen by cAdvisor. This guide covers creating a practical container metrics dashboard from scratch using cAdvisor data.

## Prerequisites

- Grafana deployed and accessible
- Prometheus configured with cAdvisor as a scrape target
- cAdvisor running and collecting container metrics

## Step 1: Create a New Dashboard

1. In Grafana, click **Dashboards** → **New** → **New Dashboard**
2. Click **Add visualization**
3. Select **Prometheus** as the data source

## Step 2: CPU Usage Panel

**Panel: Container CPU Usage %**

```text
Visualization: Time series
Title: Container CPU Usage (% of one core)

Query A:
  Expression: sum by (name) (rate(container_cpu_usage_seconds_total{image!="",name!=""}[5m])) * 100
  Legend: {{name}}

Panel settings:
  Unit: Percent (0-100)
  Min: 0
  Thresholds:
    Green: 0
    Yellow: 70
    Red: 90
```

```promql
# Per-container CPU usage as a percentage of one CPU core.
# Values above 100 mean the container is using more than one core.

sum by (name) (
  rate(container_cpu_usage_seconds_total{
    image!="",
    name!=""
  }[5m])
) * 100
```

## Step 3: Memory Usage Panel

**Panel: Container Memory Usage**

```text
Visualization: Time series
Title: Container Memory Usage

Query A:
  Expression: container_memory_working_set_bytes{image!="",name!=""}
  Legend: {{name}}

Query B (memory limit):
  Expression: container_spec_memory_limit_bytes{image!="",name!=""} > 0
  Legend: {{name}} limit

Panel settings:
  Unit: bytes (IEC)
```

**Panel: Memory Usage as % of Limit**

```promql
(
  container_memory_working_set_bytes{image!="",name!=""}
  /
  (container_spec_memory_limit_bytes{image!="",name!=""} > 0)
) * 100
```

## Step 4: Top Containers Panels (Stat and Bar Gauge)

**Panel: Top 5 Memory Consumers (Bar Gauge)**

```text
Visualization: Bar gauge
Title: Top 5 Memory Consumers

Query:
  Expression: topk(5, container_memory_working_set_bytes{image!="",name!=""})
  Instant query: ON
  Legend: {{name}}

Panel settings:
  Unit: bytes (IEC)
  Orientation: Horizontal
  Display mode: Gradient
```

**Panel: Container Count (Stat)**

```text
Visualization: Stat
Title: Containers Seen

Query:
  Expression: count(container_last_seen{image!="",name!=""})
  Instant: ON
  Legend: Containers

Panel settings:
  Unit: Short
  Color mode: Background
```

## Step 5: Network I/O Panel

**Panel: Network Traffic per Container**

```text
Visualization: Time series
Title: Network I/O

Query A (received):
  Expression: sum by (name) (rate(container_network_receive_bytes_total{image!="",name!=""}[5m]))
  Legend: {{name}} RX

Query B (transmitted):
  Expression: sum by (name) (rate(container_network_transmit_bytes_total{image!="",name!=""}[5m]))
  Legend: {{name}} TX

Panel settings:
  Unit: bytes/sec (IEC)
  Field override:
    Query B → Graph styles > Transform: Negative Y to show upload below axis
```

## Step 6: Container Last Seen Table

**Panel: Container Last Seen**

```text
Visualization: Table
Title: Container Last Seen

Query:
  Expression: max(container_last_seen{image!="",name!=""} * 1000) by (name, image)
  Instant: ON
  Format: Table

Column overrides:
  Value → rename to "Last Seen"
  Apply unit: Date & Time
```

## Step 7: Dashboard Variables for Filtering

Add a container selector variable:

1. Go to **Dashboard settings** → **Variables** → **Add variable**

```text
Type: Query
Name: container
Label: Container
Query: label_values(container_cpu_usage_seconds_total{image!="",name!=""}, name)
Refresh: On Dashboard Load
Multi-value: ON
Include All option: ON
```

Update all panel queries to use the variable:
```promql
# Replace name!="" with name=~"$container" and keep the other filters
sum by (name) (
  rate(container_cpu_usage_seconds_total{
    image!="",
    name=~"$container"
  }[5m])
) * 100
```

## Step 8: Complete Dashboard JSON

Export the dashboard as JSON for GitOps storage and Portainer stack provisioning:

```bash
# Export dashboard JSON via API
GRAFANA_URL="http://localhost:3000"
AUTH="admin:password"

# Get all dashboards
curl -s -u "$AUTH" "${GRAFANA_URL}/api/search?type=dash-db" | jq '.[].uid'

# Export specific dashboard
DASHBOARD_UID="your-dashboard-uid"
curl -s -u "$AUTH" "${GRAFANA_URL}/api/dashboards/uid/$DASHBOARD_UID" | \
  jq '.dashboard | del(.id)' > /opt/monitoring/dashboards/container-metrics.json

# Import dashboard from JSON file
curl -s -X POST -u "$AUTH" \
  -H "Content-Type: application/json" \
  "${GRAFANA_URL}/api/dashboards/db" \
  -d "{\"dashboard\": $(cat /opt/monitoring/dashboards/container-metrics.json), \"overwrite\": true}"
```

## Step 9: Auto-Provision Dashboards via Config

For Portainer-deployed Grafana, provision dashboards automatically:

```yaml
# grafana stack
services:
  grafana:
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/monitoring/dashboards:/var/lib/grafana/dashboards:ro     # Mount dashboards
      - /opt/monitoring/grafana-provisioning:/etc/grafana/provisioning:ro  # Provisioning config
```

```yaml
# /opt/monitoring/grafana-provisioning/dashboards/default.yaml
apiVersion: 1
providers:
  - name: default
    type: file
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

## Conclusion

A well-designed Grafana container dashboard built on cAdvisor data gives you continuous visibility into resource usage across all Portainer-managed containers. Start with CPU and memory panels using the `name` label for per-container differentiation, add bar gauges for top consumers at a glance, and use dashboard variables to filter to specific containers during incident investigation. Export your dashboard JSON and store it in Git alongside your Portainer stack definitions for reproducible monitoring infrastructure.
