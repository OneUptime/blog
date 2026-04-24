# How to Set Up Node Exporter for Host Metrics with Portainer - Host Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Node Exporter, Prometheus, Host Metrics, Monitoring

Description: Learn how to deploy Prometheus Node Exporter as a Portainer stack to collect comprehensive host-level metrics including CPU, memory, disk, and network for your Docker infrastructure.

## Introduction

While cAdvisor captures container-level metrics, Node Exporter collects host-level system metrics - CPU load, memory usage, disk I/O, network throughput, and system statistics for the entire host machine. Deploying Node Exporter through Portainer gives you full-stack visibility: container metrics from cAdvisor and host metrics from Node Exporter, all scraped by Prometheus.

## Prerequisites

- Portainer CE or BE running
- Prometheus deployed and accessible
- Grafana deployed for dashboard visualization

## Step 1: Deploy Node Exporter as a Portainer Stack

Navigate to **Stacks** → **Add Stack**.

Name: `node-exporter`

```yaml
version: "3.8"

services:
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    command:
      - "--path.rootfs=/host"                         # Read host filesystem
      - "--path.sysfs=/host/sys"                      # Read host sysfs
      - "--path.procfs=/host/proc"                    # Read host procfs
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"
      - "--collector.netdev.device-exclude=^(veth.*|br-.*|docker.*)$$"        # Exclude Docker virtual interfaces from netdev stats
      - "--no-collector.ipvs"                         # Disable IPVS collector
      - "--no-collector.nfs"                          # Disable NFS collector (if not using NFS)
    volumes:
      - /:/host:ro,rslave    # Read-only access to entire host filesystem
    networks:
      - monitoring
    ports:
      - "127.0.0.1:9100:9100"    # Expose only to localhost

networks:
  monitoring:
    external: true
    name: monitoring
```

## Step 2: Verify Node Exporter is Collecting Metrics

```bash
# Check metrics endpoint

curl -s http://localhost:9100/metrics | head -30

# Check specific metric categories
curl -s http://localhost:9100/metrics | grep "^node_cpu_seconds_total" | head -5
curl -s http://localhost:9100/metrics | grep "^node_memory_MemAvailable_bytes"
curl -s http://localhost:9100/metrics | grep "^node_disk_read_bytes_total"
curl -s http://localhost:9100/metrics | grep "^node_filesystem_avail_bytes"
```

## Step 3: Add Node Exporter to Prometheus Scrape Config

```yaml
# /opt/monitoring/prometheus.yml - Add Node Exporter job
scrape_configs:
  - job_name: "node"
    scrape_interval: 15s
    static_configs:
      - targets: ["node-exporter:9100"]    # Prometheus must also be attached to the monitoring Docker network
    relabel_configs:
      # Override the instance label with a friendly name
      - source_labels: [__address__]
        target_label: instance
        replacement: "production-server-1"
```

```bash
# Reload Prometheus (requires --web.enable-lifecycle)
# Otherwise, send SIGHUP to the Prometheus process
curl -X POST http://localhost:9090/-/reload

# Verify target is up
curl -s http://localhost:9090/api/v1/targets | \
  jq '.data.activeTargets[] | select(.labels.job=="node") | {health, scrapeUrl}'
```

## Step 4: Key Node Exporter Metrics

```text
CPU Metrics:
  node_cpu_seconds_total{mode=~"user|system|idle|iowait|irq|softirq"}
  node_load1, node_load5, node_load15                - System load averages

Memory Metrics:
  node_memory_MemTotal_bytes        - Total physical memory
  node_memory_MemAvailable_bytes    - Available memory (free + reclaimable)
  node_memory_MemFree_bytes         - Actually free memory
  node_memory_Buffers_bytes         - Kernel buffers
  node_memory_Cached_bytes          - Page cache

Disk Metrics:
  node_filesystem_size_bytes{mountpoint="/"}     - Total disk size
  node_filesystem_avail_bytes{mountpoint="/"}    - Available disk space
  node_disk_read_bytes_total                     - Bytes read from disk
  node_disk_written_bytes_total                  - Bytes written to disk
  node_disk_io_time_seconds_total                - Time in disk I/O operations

Network Metrics:
  node_network_receive_bytes_total{device="eth0"}     - Bytes received
  node_network_transmit_bytes_total{device="eth0"}    - Bytes transmitted
  node_network_receive_errors_total                   - Receive errors

System Metrics:
  node_uname_info                    - OS/kernel version info
  node_boot_time_seconds             - System boot time (→ uptime)
  node_time_seconds                  - Current system time
```

## Step 5: Useful Prometheus Queries for Host Metrics

```promql
# CPU usage percentage (all cores combined)
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Disk usage percentage for root filesystem
(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100

# Disk I/O rate (bytes per second)
rate(node_disk_read_bytes_total[5m]) + rate(node_disk_written_bytes_total[5m])

# Network throughput (megabits per second)
rate(node_network_receive_bytes_total{device="eth0"}[5m]) * 8 / 1024 / 1024

# System uptime in days
(time() - node_boot_time_seconds) / 86400
```

## Step 6: Alert on Host Resource Issues

```yaml
# /opt/monitoring/host-alerts.yml
groups:
  - name: host_alerts
    rules:
      # CPU high
      - alert: HostCPUHigh
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | humanize }}%"

      # Disk almost full
      - alert: HostDiskSpaceLow
        expr: (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          description: "Root filesystem is {{ $value | humanize }}% full"

      # Memory high
      - alert: HostMemoryHigh
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
```

## Step 7: Multi-Host Node Exporter Configuration

For Portainer managing multiple Docker environments, deploy Node Exporter on each host, publish port 9100 on an address Prometheus can reach, and add all targets to Prometheus:

```yaml
# prometheus.yml - Multi-host Node Exporter scraping
scrape_configs:
  - job_name: "node"
    static_configs:
      - targets:
          - "192.168.1.10:9100"    # Server 1
          - "192.168.1.11:9100"    # Server 2
          - "192.168.1.12:9100"    # Server 3
        labels:
          datacenter: "us-east-1"

      - targets:
          - "10.0.0.10:9100"    # Remote server
        labels:
          datacenter: "eu-west-1"
```

## Conclusion

Node Exporter provides essential host-level metrics that complement cAdvisor's container metrics, giving you full infrastructure visibility through Prometheus and Grafana. The key metrics to monitor are CPU idle rate (inverted for usage), available memory bytes, filesystem availability, and disk I/O rates. Import Grafana dashboard ID 1860 (Node Exporter Full) for a quick host dashboard if you keep the default Prometheus job name `node`; some panels also expect the optional `--collector.systemd` and `--collector.processes` collectors. Configure alerts for disk space and memory thresholds to catch resource issues before they impact running containers.
