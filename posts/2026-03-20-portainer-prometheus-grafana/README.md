# How to Deploy Prometheus and Grafana via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Prometheus, Grafana, Monitoring, Metric

Description: Learn how to deploy a complete Prometheus and Grafana monitoring stack through Portainer to collect and visualize container and host metrics for your Docker infrastructure.

## Introduction

Prometheus collects time-series metrics from your containers and host, while Grafana provides rich dashboards and alerting on top of those metrics. Deploying both as a Portainer stack gives you a production-grade monitoring solution managed through the same interface as your applications. This guide covers deploying the full monitoring stack with container metrics, host metrics, and example dashboards.

## Prerequisites

- Portainer CE or BE running
- A Linux Docker host for the Node Exporter host-metrics setup shown below
- At least 1GB free RAM for the monitoring stack
- A domain name (optional, if you later expose Grafana behind a reverse proxy)

## Step 1: Create the Monitoring Stack in Portainer

Navigate to **Stacks** → **Add Stack**.

Name: `monitoring`

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - prometheus_data:/prometheus
      - /opt/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=30d"    # Keep 30 days of metrics
      - "--web.enable-lifecycle"               # Allow config reload via HTTP
    extra_hosts:
      - "host.docker.internal=host-gateway"
    networks:
      - monitoring
    ports:
      - "9090:9090"    # Prometheus UI (restrict to internal only in production)

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      GF_SECURITY_ADMIN_USER: "${GRAFANA_USER:-admin}"
      GF_SECURITY_ADMIN_PASSWORD: "${GRAFANA_PASSWORD}"
      GF_USERS_ALLOW_SIGN_UP: "false"
    networks:
      - monitoring
    ports:
      - "3000:3000"    # Optional: direct access

  cadvisor:
    image: ghcr.io/google/cadvisor:v0.55.1
    container_name: cadvisor
    restart: unless-stopped
    privileged: true
    devices:
      - /dev/kmsg
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    networks:
      - monitoring

  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    command:
      - "--path.rootfs=/host"
    network_mode: host
    pid: host
    volumes:
      - /:/host:ro,rslave

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
```

## Step 2: Create Prometheus Configuration

Create the `/opt/monitoring/prometheus.yml` file on the host before deploying:

```bash
# On the host, create config file

mkdir -p /opt/monitoring
cat > /opt/monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s         # Collect metrics every 15 seconds
  evaluation_interval: 15s    # Evaluate alerting rules every 15 seconds

scrape_configs:
  # Prometheus self-monitoring
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  # Container metrics via cAdvisor
  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]

  # Host metrics via node-exporter
  - job_name: "node"
    static_configs:
      - targets: ["host.docker.internal:9100"]
EOF
```

## Step 3: Deploy the Stack

```bash
# Set Portainer environment variables before deploying:
# GRAFANA_PASSWORD: your-secure-grafana-password
# GRAFANA_USER: admin (optional)

# In Portainer stack editor → Environment variables:
# GRAFANA_PASSWORD = mysecurepassword
```

Click **Deploy the stack**.

## Step 4: Verify All Services Are Running

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Expected: all targets with health: "up"
# If any show "down", check the target is reachable from the Prometheus container

# Check Grafana is running
curl http://localhost:3000/api/health
# Expected: {"database":"ok", ...}
```

## Step 5: Add Prometheus as Grafana Data Source

1. Open Grafana at `http://YOUR_SERVER:3000`
2. Login with admin credentials
3. Go to **Connections** → **Data sources** → **Add new data source**
4. Select **Prometheus**
5. Configure:
   ```text
   Prometheus server URL: http://prometheus:9090
   ```
6. Click **Save & Test** - should show "Data source is working"

## Step 6: Import Pre-Built Dashboards

1. Go to **Dashboards** → **New** → **Import**
2. Enter dashboard ID `14282` (containers) or `1860` (node metrics)
3. Select Prometheus data source
4. Click **Import**

## Conclusion

Deploying Prometheus and Grafana as a Portainer stack gives you a complete container and host monitoring solution managed through a single interface. cAdvisor provides rich container-level metrics including CPU, memory, and network per container, while Node Exporter captures host-level metrics like disk usage and system load. Pre-built Grafana dashboards from grafana.com make it quick to get useful visualizations without building them from scratch - start with dashboard IDs 14282 and 1860 for immediate value.
