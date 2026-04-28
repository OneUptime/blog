# How to Build a Node Metrics Dashboard in Grafana with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Portainer, Prometheus, Node Metrics, Monitoring Dashboard

Description: Learn how to deploy a complete Prometheus and Grafana monitoring stack with Portainer and build a node metrics dashboard for real-time infrastructure visibility.

## Introduction

Combining Portainer, Prometheus, and Grafana gives you a complete monitoring stack for your Docker and Kubernetes workloads. This guide covers deploying the entire stack through Portainer and building a node metrics dashboard that displays CPU, memory, disk, and network metrics.

## Step 1: Deploy the Monitoring Stack

In Portainer, create a new stack called `monitoring`:

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - prometheus_data:/prometheus
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=15d"
      - "--web.enable-lifecycle"

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_USERS_ALLOW_SIGN_UP: "false"

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    pid: host
    network_mode: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--path.rootfs=/rootfs"

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro

volumes:
  prometheus_data:
  grafana_data:
```

## Step 2: Create Prometheus Configuration

Before deploying the stack, create `prometheus.yml` on the Portainer host:

```yaml
# /path/to/stack/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['host.docker.internal:9100']
        labels:
          host: 'portainer-host'

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

## Step 3: Configure Grafana Data Source

1. Open Grafana at `http://your-server:3000`.
2. Log in with admin / your configured password.
3. Go to **Connections** > **Data sources** > **Add data source**.
4. Select **Prometheus**.
5. Set URL to `http://prometheus:9090`.
6. Click **Save & Test**.

## Step 4: Build the Node Metrics Dashboard

Create a new dashboard with the following panels:

### Panel 1: CPU Usage

- **Panel type**: Time series
- **Title**: CPU Usage (%)
- **Query**:

```promql
100 - (avg by (instance) (
  irate(node_cpu_seconds_total{mode="idle"}[5m])
) * 100)
```

- **Unit**: Percent (0-100)
- Set alert threshold at 80%.

### Panel 2: Memory Usage

- **Panel type**: Gauge
- **Title**: Memory Usage
- **Query**:

```promql
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
```

- **Unit**: Percent (0-100)
- **Thresholds**: Green 0-70, Yellow 70-85, Red 85+

### Panel 3: Disk Usage per Mount

- **Panel type**: Bar chart
- **Title**: Disk Usage by Mount
- **Query**:

```promql
(1 - node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} /
     node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) * 100
```

- Group by `mountpoint` label.

### Panel 4: Network I/O

- **Panel type**: Time series
- **Title**: Network Traffic
- **Queries**:

```promql
# Inbound
irate(node_network_receive_bytes_total{device="eth0"}[5m])

# Outbound
irate(node_network_transmit_bytes_total{device="eth0"}[5m])
```

### Panel 5: Container Count

- **Panel type**: Stat
- **Title**: Running Containers
- **Query** (from cAdvisor):

```promql
count(container_last_seen{name!=""})
```

### Panel 6: System Load Average

- **Panel type**: Time series
- **Title**: System Load
- **Queries**:

```promql
node_load1
node_load5
node_load15
```

## Step 5: Set Up Alerting

In Grafana, configure alert rules for critical thresholds:

1. Navigate to **Alerting** > **Alert rules** > **Create alert rule**.
2. Create an alert for high disk usage:

```promql
# Alert when any filesystem is over 90% used
(1 - node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} /
     node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) * 100 > 90
```

3. Set the notification channel (Slack, email, PagerDuty).

## Best Practices

- Set Prometheus retention to match your compliance requirements (default 15 days).
- Use Grafana variables to switch between multiple hosts on the same dashboard.
- Export dashboards as JSON and store in version control.
- Configure Grafana to use a persistent volume so dashboards survive container restarts.
- Import community dashboard ID 1860 for a comprehensive pre-built node dashboard.

## Conclusion

A Portainer-deployed monitoring stack with Prometheus and Grafana provides real-time visibility into host and container metrics. The node metrics dashboard gives operators immediate insight into CPU, memory, disk, and network performance, enabling proactive capacity management and rapid issue detection.
