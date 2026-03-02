# How to Install and Configure Prometheus on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Monitoring, Prometheus, Metrics, DevOps

Description: Complete guide to installing and configuring Prometheus on Ubuntu for collecting and storing time-series metrics from servers and applications.

---

Prometheus is an open-source monitoring system and time-series database built around a pull-based model. Instead of agents pushing metrics to a central server, Prometheus scrapes metrics endpoints at configured intervals. This pull model simplifies configuration and makes it easy to discover whether monitoring is working - if Prometheus cannot scrape a target, it knows immediately.

This guide covers installing Prometheus, configuring basic scraping, setting up Node Exporter for system metrics, and writing useful queries.

## Installing Prometheus

Prometheus is not in the Ubuntu repositories in a current version, so download it directly from the GitHub releases:

```bash
# Create a dedicated user for Prometheus
sudo useradd --no-create-home --shell /bin/false prometheus

# Create configuration and data directories
sudo mkdir -p /etc/prometheus /var/lib/prometheus

# Set ownership
sudo chown prometheus:prometheus /etc/prometheus /var/lib/prometheus

# Download Prometheus (check https://github.com/prometheus/prometheus/releases for latest)
PROM_VERSION="2.49.1"
cd /tmp
wget "https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz"

# Verify the download (compare with checksum from releases page)
sha256sum "prometheus-${PROM_VERSION}.linux-amd64.tar.gz"

# Extract
tar xzf "prometheus-${PROM_VERSION}.linux-amd64.tar.gz"
cd "prometheus-${PROM_VERSION}.linux-amd64"

# Copy binaries
sudo cp prometheus promtool /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/prometheus /usr/local/bin/promtool

# Copy console files
sudo cp -r consoles/ console_libraries/ /etc/prometheus/
sudo chown -R prometheus:prometheus /etc/prometheus/consoles /etc/prometheus/console_libraries
```

## Configuring Prometheus

Create the main configuration file:

```bash
sudo tee /etc/prometheus/prometheus.yml << 'EOF'
# Global configuration - applies to all scrape jobs
global:
  scrape_interval: 15s       # How often to scrape targets
  evaluation_interval: 15s   # How often to evaluate rules
  scrape_timeout: 10s        # Timeout for each scrape

# Alertmanager configuration (optional, configure later)
# alerting:
#   alertmanagers:
#     - static_configs:
#         - targets: ['localhost:9093']

# Rule files - load alerting and recording rules
rule_files:
  - "rules/*.yml"

# Scrape configurations
scrape_configs:
  # Prometheus scrapes itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter for system metrics
  - job_name: 'node'
    static_configs:
      - targets:
          - 'localhost:9100'    # Local node
          - '192.168.1.11:9100' # Remote node2
          - '192.168.1.12:9100' # Remote node3
        labels:
          environment: 'production'

  # Example: scrape a web application
  - job_name: 'myapp'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:8080']
        labels:
          app: 'myapp'
          environment: 'production'
EOF

sudo chown prometheus:prometheus /etc/prometheus/prometheus.yml
```

## Creating a Systemd Service

```bash
sudo tee /etc/systemd/system/prometheus.service << 'EOF'
[Unit]
Description=Prometheus Monitoring System
Documentation=https://prometheus.io/docs/introduction/overview/
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/var/lib/prometheus \
    --storage.tsdb.retention.time=30d \
    --web.listen-address=0.0.0.0:9090 \
    --web.enable-lifecycle \
    --web.console.templates=/etc/prometheus/consoles \
    --web.console.libraries=/etc/prometheus/console_libraries

# Restart if it crashes
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start Prometheus
sudo systemctl daemon-reload
sudo systemctl enable --now prometheus

# Check status
sudo systemctl status prometheus

# Verify it's listening
ss -tlnp | grep 9090
```

## Installing Node Exporter

Node Exporter exposes Linux system metrics (CPU, memory, disk, network):

```bash
# Download Node Exporter
NODE_EXP_VERSION="1.7.0"
cd /tmp
wget "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VERSION}/node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz"

tar xzf "node_exporter-${NODE_EXP_VERSION}.linux-amd64.tar.gz"
cd "node_exporter-${NODE_EXP_VERSION}.linux-amd64"

# Install binary
sudo cp node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service << 'UNIT'
[Unit]
Description=Node Exporter
Documentation=https://github.com/prometheus/node_exporter
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
    --collector.systemd \
    --collector.processes \
    --web.listen-address=0.0.0.0:9100

Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter

# Verify metrics endpoint
curl -s http://localhost:9100/metrics | head -30
```

## Configuring Alerting Rules

Create a rules directory and add some basic alerting rules:

```bash
sudo mkdir -p /etc/prometheus/rules
sudo chown prometheus:prometheus /etc/prometheus/rules

sudo tee /etc/prometheus/rules/node_alerts.yml << 'EOF'
groups:
  - name: node_alerts
    rules:
      # Alert when a node is down
      - alert: NodeDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Node {{ $labels.instance }} is down"
          description: "Node {{ $labels.instance }} has been down for more than 2 minutes"

      # Alert when CPU usage is high
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | printf \"%.1f\" }}%"

      # Alert when memory usage is high
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | printf \"%.1f\" }}%"

      # Alert when disk usage is high
      - alert: HighDiskUsage
        expr: (1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage on {{ $labels.instance }}"
          description: "Disk {{ $labels.mountpoint }} usage is {{ $value | printf \"%.1f\" }}%"
EOF

sudo chown prometheus:prometheus /etc/prometheus/rules/node_alerts.yml

# Validate the configuration
sudo -u prometheus promtool check config /etc/prometheus/prometheus.yml
sudo -u prometheus promtool check rules /etc/prometheus/rules/node_alerts.yml

# Reload Prometheus configuration
sudo systemctl reload prometheus
# Or use the API if --web.enable-lifecycle is set
curl -X POST http://localhost:9090/-/reload
```

## Useful PromQL Queries

Access the Prometheus web UI at `http://your-server:9090` and try these queries:

```promql
# CPU usage percentage per instance
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage percentage per mount
(1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes)) * 100

# Network bytes received per second
rate(node_network_receive_bytes_total{device!="lo"}[5m])

# System load average (1 minute)
node_load1

# Number of running processes
node_procs_running

# Time since last boot
time() - node_boot_time_seconds

# HTTP request rate (if using an HTTP exporter)
rate(http_requests_total[5m])
```

## Setting Up Data Retention

Prometheus stores data in a local TSDB. Configure retention based on your storage capacity:

```bash
# Edit the prometheus service file to adjust retention
sudo systemctl edit prometheus --force

# Add or modify the ExecStart line:
# [Service]
# ExecStart=
# ExecStart=/usr/local/bin/prometheus \
#     --config.file=/etc/prometheus/prometheus.yml \
#     --storage.tsdb.path=/var/lib/prometheus \
#     --storage.tsdb.retention.time=90d \
#     --storage.tsdb.retention.size=50GB \
#     --web.listen-address=0.0.0.0:9090

sudo systemctl daemon-reload
sudo systemctl restart prometheus
```

## Securing Prometheus

By default, Prometheus has no authentication. For production, place it behind a reverse proxy with authentication:

```bash
# Install nginx
sudo apt install -y nginx apache2-utils

# Create password file
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Configure nginx as reverse proxy for Prometheus
sudo tee /etc/nginx/sites-available/prometheus << 'EOF'
server {
    listen 443 ssl;
    server_name prometheus.example.com;

    ssl_certificate /etc/ssl/certs/prometheus.crt;
    ssl_certificate_key /etc/ssl/private/prometheus.key;

    location / {
        auth_basic "Prometheus";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://localhost:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/prometheus /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Prometheus is the foundation of modern infrastructure monitoring. By itself, it handles metric collection and storage. Pair it with Grafana for dashboards and Alertmanager for notifications, and you have a complete monitoring stack that scales from a single server to thousands of nodes.
