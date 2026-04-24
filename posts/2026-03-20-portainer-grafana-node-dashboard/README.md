# How to Create a Node Metrics Dashboard in Grafana via Portainer - Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Grafana, Node Exporter, Dashboard, Host Metrics

Description: Learn how to create a comprehensive host metrics dashboard in Grafana using Node Exporter data for your Portainer infrastructure, covering CPU, memory, disk, and network panels with alerting.

## Introduction

A node metrics dashboard shows the health of the underlying host machines running your Portainer-managed containers. Unlike container metrics, host metrics reveal system-level issues: disk filling up, memory pressure causing swapping, high CPU wait from I/O bottlenecks, or network saturation. This guide covers building a practical host metrics dashboard using Node Exporter data in Grafana.

## Prerequisites

- Grafana deployed and connected to Prometheus
- Node Exporter running on target hosts and scraped by Prometheus
- Basic familiarity with Grafana dashboard creation

## Step 1: Host Overview Row - Stat Panels

Create a row with at-a-glance health indicators:

**Panel: CPU Usage % (Stat)**

```promql
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

```text
Visualization: Stat
Title: CPU Usage
Unit: Percent (0-100)
Thresholds:
  Green: 0-70
  Yellow: 70-85
  Red: 85-100
Color mode: Background
```

**Panel: Memory Usage % (Stat)**

```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

**Panel: Disk Usage % (Stat)**

```promql
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100
```

**Panel: System Uptime (Stat)**

```promql
(time() - node_boot_time_seconds) / 86400
```

```text
Unit: Days
Decimals: 1
```

## Step 2: CPU Detailed Panel

**Panel: CPU Usage by Mode (Time Series)**

```promql
avg by (mode) (rate(node_cpu_seconds_total{mode!="idle"}[5m])) * 100
```

```text
Visualization: Time series
Title: CPU Mode Breakdown
Unit: Percent (0-100)
Stack series: Normal (stacked)
Fill opacity: 20

Legend aliases:
  mode="user"    → User
  mode="system"  → System/Kernel
  mode="iowait"  → I/O Wait (high value indicates disk bottleneck)
  mode="irq"     → Hardware Interrupts
  mode="softirq" → Software Interrupts
```

## Step 3: Memory Detailed Panel

**Panel: Memory Breakdown (Time Series)**

```text
Title: Memory Usage

Query A: Total Memory
  Expression: node_memory_MemTotal_bytes
  Legend: Total

Query B: Used Memory (excluding buffers/cache)
  Expression: node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes
  Legend: Used

Query C: Available
  Expression: node_memory_MemAvailable_bytes
  Legend: Available

Query D: Buffer/Cache
  Expression: node_memory_Buffers_bytes + node_memory_Cached_bytes + node_memory_SReclaimable_bytes
  Legend: Buffer/Cache

Unit: bytes (IEC)
```

**Panel: Swap Usage**

```promql
((node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes) / node_memory_SwapTotal_bytes) * 100
and node_memory_SwapTotal_bytes > 0
```

High swap usage alongside memory pressure indicates the host needs more RAM.

## Step 4: Disk Space Panels

**Panel: Filesystem Usage (Bar Gauge)**

```promql
(1 - node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} /
     node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) * 100
```

```text
Visualization: Bar gauge
Orientation: Horizontal
Min: 0, Max: 100
Unit: Percent (0-100)
Thresholds: Green/Yellow(80)/Red(90)
Legend: {{mountpoint}} on {{instance}}
```

**Panel: Disk I/O Rate (Time Series)**

```text
Query A (Reads):
  Expression: rate(node_disk_read_bytes_total[5m])
  Legend: Read {{device}}

Query B (Writes):
  Expression: rate(node_disk_written_bytes_total[5m])
  Legend: Write {{device}}

Unit: bytes/sec (IEC)
Field override for writes: Transform → Negative Y (shows below axis)
```

## Step 5: Network Traffic Panel

**Panel: Network I/O (Time Series)**

```text
Query A (Inbound):
  Expression: rate(node_network_receive_bytes_total{device!~"lo|veth.*|br-.*|docker.*"}[5m])
  Legend: IN {{device}}

Query B (Outbound):
  Expression: rate(node_network_transmit_bytes_total{device!~"lo|veth.*|br-.*|docker.*"}[5m])
  Legend: OUT {{device}}

Unit: bytes/sec (IEC)
```

## Step 6: Multi-Host Dashboard Variable

Add an instance variable for multi-server monitoring:

```text
Variable settings:
  Name: instance
  Type: Query
  Query: label_values(node_uname_info, instance)
  Refresh: On Dashboard Load
  Multi-value: ON
  Include All option: ON
  All value: .+
```

Update queries to use the variable:
```promql
avg by (instance) (rate(node_cpu_seconds_total{mode="idle", instance=~"$instance"}[5m]))
```

## Step 7: Add Dashboard Annotations for Alerting

When Grafana-managed alerts are linked to a panel, Grafana can show alert state history as annotations on time series:

1. Go to **Dashboard settings** → **Annotations**

```text
Name: Annotations & Alerts (Built-in query)
Data source: -- Grafana --
Enabled: ON

When creating the alert rule:
  - Use "Link dashboard and panel"
  - Select the dashboard and the target time series panel
```

## Step 8: Import the Node Exporter Full Dashboard

Instead of building from scratch, import the community dashboard:

```text
Import via Grafana UI:
1. Go to Dashboards → New → Import
2. Paste Grafana.com dashboard ID: 1860
3. Select the Prometheus data source
4. Click Import

Dashboard 1860 provides:
- CPU, memory, disk panels
- System information table (kernel, OS version)
- Network statistics
- systemd collector panels (if the systemd collector is enabled)
```

## Step 9: Set Up Grafana Alerts on Node Metrics

```text
Create alert in Grafana:
1. Open a time series panel that uses your Disk Usage query
2. Go to the "Alert" tab → "Create alert rule"
3. Configure:
   Name: Disk Space Critical
   Condition: Reduce the query with last() and trigger when the value is above 90
   Evaluate every: 1m
   Pending period: 5m
4. Use "Link dashboard and panel" so the alert state also appears on the panel

Notification channels:
  - Add Slack/email contact point in Alerting → Contact points
  - Assign to alert rule notification policy
```

## Conclusion

A Node Exporter Grafana dashboard provides the host-level visibility needed when managing containerized infrastructure through Portainer. The most important panels are CPU I/O wait (indicates disk bottleneck), disk usage approaching capacity, and memory utilization trending toward swap usage. For multi-server Portainer environments, dashboard variables that filter by `instance` allow you to inspect individual hosts without managing separate dashboards. Start with Grafana dashboard ID 1860 for immediate value, then customize with Portainer-specific annotations and alerts.
