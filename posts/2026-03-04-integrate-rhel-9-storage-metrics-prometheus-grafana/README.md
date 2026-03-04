# How to Integrate RHEL Storage Metrics with Prometheus and Grafana

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Prometheus, Grafana, Storage, Monitoring, Metrics, Linux

Description: Learn how to export RHEL storage metrics to Prometheus and visualize them in Grafana dashboards for comprehensive storage monitoring.

---

Prometheus and Grafana together provide a powerful monitoring stack for RHEL storage. Prometheus collects and stores time-series metrics, while Grafana transforms that data into interactive dashboards. The node_exporter agent running on each RHEL host exposes detailed storage metrics that Prometheus scrapes automatically.

## Architecture Overview

The monitoring pipeline works as follows:

1. **node_exporter** runs on each RHEL server and exposes system metrics via HTTP
2. **Prometheus** scrapes these metrics at regular intervals and stores them
3. **Grafana** queries Prometheus and renders dashboards

## Installing node_exporter on RHEL

Download and install node_exporter:

```bash
sudo dnf install golang-github-prometheus-node-exporter
```

Or download from the Prometheus project:

```bash
curl -LO https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
```

Create a systemd service:

```bash
sudo useradd -r -s /sbin/nologin node_exporter

sudo tee /etc/systemd/system/node_exporter.service << UNIT
[Unit]
Description=Prometheus Node Exporter
After=network-online.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter --collector.diskstats --collector.filesystem --collector.mdadm

[Install]
WantedBy=multi-user.target
UNIT
```

Start and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

Open the firewall:

```bash
sudo firewall-cmd --add-port=9100/tcp --permanent
sudo firewall-cmd --reload
```

Verify metrics are available:

```bash
curl http://localhost:9100/metrics | grep node_disk
```

## Key Storage Metrics from node_exporter

### Disk I/O Metrics

- `node_disk_reads_completed_total` - Total read operations
- `node_disk_writes_completed_total` - Total write operations
- `node_disk_read_bytes_total` - Total bytes read
- `node_disk_written_bytes_total` - Total bytes written
- `node_disk_io_time_seconds_total` - Time spent doing I/O
- `node_disk_read_time_seconds_total` - Time spent reading
- `node_disk_write_time_seconds_total` - Time spent writing

### File System Metrics

- `node_filesystem_size_bytes` - Total size of file system
- `node_filesystem_free_bytes` - Free space on file system
- `node_filesystem_avail_bytes` - Space available to non-root users
- `node_filesystem_files` - Total number of inodes
- `node_filesystem_files_free` - Free inodes

### RAID Metrics

- `node_md_disks` - Number of disks in RAID array
- `node_md_disks_required` - Required number of disks
- `node_md_state` - Current state of the array

## Configuring Prometheus

Add RHEL targets to your Prometheus configuration:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'rhel-nodes'
    scrape_interval: 15s
    static_configs:
      - targets:
          - 'rhel-server1:9100'
          - 'rhel-server2:9100'
          - 'rhel-server3:9100'
```

Reload Prometheus:

```bash
curl -X POST http://localhost:9090/-/reload
```

## Useful PromQL Queries for Storage

### Disk Space Usage Percentage

```promql
100 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"} * 100)
```

### Disk Read/Write Throughput

```promql
rate(node_disk_read_bytes_total[5m])
rate(node_disk_written_bytes_total[5m])
```

### Disk IOPS

```promql
rate(node_disk_reads_completed_total[5m])
rate(node_disk_writes_completed_total[5m])
```

### Average Disk Latency

```promql
rate(node_disk_read_time_seconds_total[5m]) / rate(node_disk_reads_completed_total[5m])
```

### Disk Utilization

```promql
rate(node_disk_io_time_seconds_total[5m])
```

## Creating Grafana Dashboards

### Importing a Pre-built Dashboard

Grafana has community dashboards for node_exporter. Import dashboard ID 1860 (Node Exporter Full):

1. Open Grafana web UI
2. Go to Dashboards > Import
3. Enter dashboard ID: 1860
4. Select your Prometheus data source
5. Click Import

### Creating a Custom Storage Dashboard

Create a new dashboard with these panels:

**Panel 1: Disk Space Usage**

```promql
100 - (node_filesystem_avail_bytes{instance="$node",fstype!="tmpfs"} / node_filesystem_size_bytes{instance="$node",fstype!="tmpfs"} * 100)
```

Set visualization to Gauge with thresholds at 80% (yellow) and 90% (red).

**Panel 2: Disk Throughput**

```promql
rate(node_disk_read_bytes_total{instance="$node"}[5m])
rate(node_disk_written_bytes_total{instance="$node"}[5m])
```

Set visualization to Time Series.

**Panel 3: Disk IOPS**

```promql
rate(node_disk_reads_completed_total{instance="$node"}[5m])
rate(node_disk_writes_completed_total{instance="$node"}[5m])
```

## Setting Up Alerting Rules

Create Prometheus alerting rules for storage:

```yaml
# storage_alerts.yml
groups:
  - name: storage
    rules:
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "{{ $labels.mountpoint }} has {{ $value | printf \"%.1f\" }}% free space"

      - alert: DiskSpaceCritical
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Critical disk space on {{ $labels.instance }}"

      - alert: HighDiskLatency
        expr: rate(node_disk_read_time_seconds_total[5m]) / rate(node_disk_reads_completed_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High disk read latency on {{ $labels.instance }}"
```

## Summary

Integrating RHEL storage metrics with Prometheus and Grafana provides comprehensive, historical storage monitoring. Deploy node_exporter on each host, configure Prometheus scraping, build Grafana dashboards for visualization, and create alerting rules for proactive issue detection. This stack gives you full visibility into disk space, I/O throughput, latency, and RAID health across your entire infrastructure.
