# How to Create Custom Grafana Dashboards for RHEL System Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Grafana, Dashboards, Prometheus, Visualization, Monitoring

Description: Build custom Grafana dashboards with PromQL queries to visualize RHEL system metrics including CPU usage, memory, disk I/O, and network throughput.

---

While Grafana has many community dashboards you can import, building your own lets you focus on the metrics that matter most for your environment. This guide shows how to create panels with practical PromQL queries for RHEL systems.

## Create a New Dashboard

In the Grafana web UI, click Dashboards > New Dashboard > Add visualization.

Select your Prometheus data source, then use the PromQL queries below for each panel.

## CPU Usage Panel

```promql
# Overall CPU usage percentage (all modes except idle)
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# CPU usage broken down by mode
rate(node_cpu_seconds_total{mode="user"}[5m]) * 100
rate(node_cpu_seconds_total{mode="system"}[5m]) * 100
rate(node_cpu_seconds_total{mode="iowait"}[5m]) * 100
```

Set the panel type to "Time series" and add a threshold at 80% for a warning indicator.

## Memory Usage Panel

```promql
# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Memory breakdown in bytes
node_memory_MemTotal_bytes
node_memory_MemAvailable_bytes
node_memory_Buffers_bytes
node_memory_Cached_bytes

# Swap usage
node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes
```

Use a "Gauge" panel for the percentage and "Time series" for the breakdown.

## Disk Usage Panel

```promql
# Disk usage percentage per mount point
(1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"})) * 100

# Disk I/O read rate in MB/s
rate(node_disk_read_bytes_total[5m]) / 1024 / 1024

# Disk I/O write rate in MB/s
rate(node_disk_written_bytes_total[5m]) / 1024 / 1024

# Disk I/O latency (average wait time in ms)
rate(node_disk_io_time_weighted_seconds_total[5m]) / rate(node_disk_io_time_seconds_total[5m]) * 1000
```

## Network Throughput Panel

```promql
# Inbound traffic in Mbps
rate(node_network_receive_bytes_total{device!="lo"}[5m]) * 8 / 1024 / 1024

# Outbound traffic in Mbps
rate(node_network_transmit_bytes_total{device!="lo"}[5m]) * 8 / 1024 / 1024

# Network errors per second
rate(node_network_receive_errs_total[5m])
rate(node_network_transmit_errs_total[5m])
```

## System Load Average Panel

```promql
# 1-minute, 5-minute, and 15-minute load averages
node_load1
node_load5
node_load15

# Number of CPUs (for context)
count(node_cpu_seconds_total{mode="idle"}) without(cpu, mode)
```

## Uptime and System Info Panels

```promql
# System uptime in days
(time() - node_boot_time_seconds) / 86400
```

Use a "Stat" panel type for this metric.

## Create Dashboard Variables

Add a variable to filter by host. Go to Dashboard Settings > Variables > Add variable:

```
Name: instance
Type: Query
Query: label_values(node_uname_info, instance)
```

Then use `{instance="$instance"}` in your queries to filter by selected host.

## Export and Share

```bash
# Export a dashboard as JSON using the Grafana API
curl -s http://admin:admin@localhost:3000/api/dashboards/uid/YOUR_DASHBOARD_UID | \
    python3 -m json.tool > my-dashboard.json
```

Custom dashboards tuned to your specific RHEL infrastructure give you faster insight during incidents than generic dashboards with panels you never use.
