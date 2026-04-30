# How to Create a Node Metrics Dashboard in Grafana via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Grafana, Node Exporter, Host Metrics, Dashboard

Description: Learn how to build a Grafana dashboard showing host-level CPU, memory, disk, and network metrics sourced from Node Exporter, with the entire monitoring stack managed via Portainer.

## Prerequisites

- Node Exporter running (see node-exporter-portainer guide)
- Prometheus scraping Node Exporter
- Grafana with Prometheus data source configured

## Quick Start: Import Dashboard 1860

The Node Exporter Full dashboard (ID 1860) is a popular community dashboard:

1. In Grafana: **Dashboards → New → Import dashboard**
2. Enter ID: **1860**
3. Select Prometheus data source
4. Click **Import**

This provides a broad set of host-level panels when your Prometheus scrape job uses the default `job_name: node`; some panels also expect the optional `--collector.systemd` and `--collector.processes` collectors.

## Building a Custom Host Metrics Dashboard

For a focused, custom dashboard:

### Panel 1: CPU Usage Over Time

```promql
# Total CPU usage (all cores)

100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

- Type: Gauge or Time series
- Unit: Percent (0-100)
- Thresholds: 0=green, 70=yellow, 90=red

### Panel 2: Memory Usage

```promql
# Used memory (excluding buffers and cache)
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100
```

```promql
# Memory breakdown for stacked chart
node_memory_MemFree_bytes
node_memory_Buffers_bytes
node_memory_Cached_bytes
node_memory_MemTotal_bytes - node_memory_MemFree_bytes - node_memory_Buffers_bytes - node_memory_Cached_bytes
```

### Panel 3: Disk Space per Mount Point

```promql
# Disk usage percentage
(node_filesystem_size_bytes{fstype!="tmpfs"} - node_filesystem_avail_bytes{fstype!="tmpfs"})
/ node_filesystem_size_bytes{fstype!="tmpfs"} * 100
```

- Legend: `{{mountpoint}}`
- Type: Gauge (one per mount point using repeat by variable)

### Panel 4: Disk I/O Rate

```promql
# Read rate
rate(node_disk_read_bytes_total[5m])

# Write rate
rate(node_disk_written_bytes_total[5m])
```

### Panel 5: Network Throughput

```promql
# Receive rate
rate(node_network_receive_bytes_total{device!~"lo|veth.*|docker.*|br.*"}[5m])

# Transmit rate
rate(node_network_transmit_bytes_total{device!~"lo|veth.*|docker.*|br.*"}[5m])
```

### Panel 6: System Load Average

```promql
node_load1    # 1 minute load average
node_load5    # 5 minute load average
node_load15   # 15 minute load average
```

Compare against CPU count: `node_load1 / count(node_cpu_seconds_total{mode="idle"}) by (instance)`

## Multi-Server Dashboard with Variables

Add an instance variable to monitor multiple hosts:

1. **Dashboard Settings → Variables → New Variable**
2. Type: `Query`
3. Data source: `Prometheus`
4. Query type: `Label values`
5. Metric: `node_cpu_seconds_total`
6. Label: `instance`
7. Name: `instance`
8. Multi-value: ON

Update all queries to include `instance=~"$instance"` inside their existing label selectors.

## Alerting Rules

```yaml
# prometheus-rules.yml for Portainer stack
groups:
  - name: host-alerts
    rules:
      - alert: DiskSpaceCritical
        expr: |
          (node_filesystem_avail_bytes{fstype!="tmpfs"} /
          node_filesystem_size_bytes{fstype!="tmpfs"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space critical: {{ $labels.instance }} {{ $labels.mountpoint }}"

      - alert: MemoryPressure
        expr: |
          (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 < 10
        for: 5m
        labels:
          severity: warning
```

## Conclusion

A Node Exporter Grafana dashboard managed via Portainer provides complete visibility into your Docker host hardware health. Pair it with the container metrics dashboard from cAdvisor and you have full-stack observability - from host CPU, memory, disk, and network metrics to individual container metrics - all maintained through Portainer's stack management.
