# How to Set Up a Complete Monitoring Stack with Prometheus and Grafana on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Prometheus, Grafana, Monitoring, Node Exporter, Alertmanager

Description: Build a complete monitoring stack on RHEL with Prometheus for metrics collection, Node Exporter for system metrics, Alertmanager for alerts, and Grafana for dashboards.

---

A Prometheus and Grafana stack gives you full observability for your RHEL infrastructure. This guide walks through setting up all the components on a single monitoring server.

## Install Prometheus

```bash
# Create a Prometheus user
sudo useradd --no-create-home --shell /bin/false prometheus

# Create directories
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus

# Download Prometheus
cd /tmp
curl -LO https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz
tar xzf prometheus-2.48.0.linux-amd64.tar.gz

# Install binaries
sudo cp prometheus-2.48.0.linux-amd64/prometheus /usr/local/bin/
sudo cp prometheus-2.48.0.linux-amd64/promtool /usr/local/bin/
sudo chown prometheus:prometheus /usr/local/bin/prometheus /usr/local/bin/promtool

# Copy console templates
sudo cp -r prometheus-2.48.0.linux-amd64/consoles /etc/prometheus/
sudo cp -r prometheus-2.48.0.linux-amd64/console_libraries /etc/prometheus/
sudo chown -R prometheus:prometheus /etc/prometheus
```

## Configure Prometheus

```bash
sudo tee /etc/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

# Load alert rules
rule_files:
  - "alert_rules.yml"

# Scrape configurations
scrape_configs:
  # Monitor Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Monitor RHEL hosts via Node Exporter
  - job_name: 'rhel-nodes'
    static_configs:
      - targets:
          - 'localhost:9100'
          - '192.168.1.51:9100'
          - '192.168.1.52:9100'
EOF

sudo chown prometheus:prometheus /etc/prometheus/prometheus.yml
```

## Create Prometheus systemd Service

```bash
sudo tee /etc/systemd/system/prometheus.service << 'EOF'
[Unit]
Description=Prometheus Monitoring
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/var/lib/prometheus/ \
    --storage.tsdb.retention.time=30d \
    --web.console.templates=/etc/prometheus/consoles \
    --web.console.libraries=/etc/prometheus/console_libraries
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now prometheus
```

## Install Node Exporter on Each Host

```bash
# On each monitored host
sudo useradd --no-create-home --shell /bin/false node_exporter
cd /tmp
curl -LO https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

sudo tee /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

## Install Grafana and Connect

```bash
# Add Grafana repo and install
sudo tee /etc/yum.repos.d/grafana.repo << 'EOF'
[grafana]
name=Grafana OSS
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF

sudo dnf install -y grafana
sudo systemctl enable --now grafana-server
```

## Open Firewall Ports

```bash
sudo firewall-cmd --permanent --add-port=9090/tcp  # Prometheus
sudo firewall-cmd --permanent --add-port=9100/tcp  # Node Exporter
sudo firewall-cmd --permanent --add-port=3000/tcp  # Grafana
sudo firewall-cmd --reload
```

## Verify the Stack

```bash
# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool | head -20

# Check Node Exporter
curl -s http://localhost:9100/metrics | head -5

# Access Grafana at http://your-server:3000
# Add Prometheus as a data source (URL: http://localhost:9090)
# Import dashboard ID 1860 for Node Exporter metrics
```

This stack provides metrics collection, long-term storage, alerting, and visualization for your entire RHEL infrastructure.
