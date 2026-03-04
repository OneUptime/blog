# How to Configure Prometheus Node Exporter on RHEL for Metrics Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Prometheus, Node Exporter, Metrics, Monitoring, Grafana

Description: Install and configure Prometheus Node Exporter on RHEL to expose system metrics like CPU, memory, disk, and network for scraping by a Prometheus server.

---

Prometheus Node Exporter is a lightweight agent that exposes hardware and OS-level metrics in a format that Prometheus can scrape. It runs on each RHEL host you want to monitor and listens on port 9100 by default.

## Install Node Exporter

```bash
# Create a system user for node_exporter
sudo useradd --no-create-home --shell /bin/false node_exporter

# Download the latest release
cd /tmp
curl -LO https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz

# Extract and install
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter
```

## Create a systemd Service

```bash
sudo tee /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Prometheus Node Exporter
Documentation=https://prometheus.io/docs/guides/node-exporter/
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
    --collector.systemd \
    --collector.processes

# Restart on failure
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start the service
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

## Verify It Is Running

```bash
# Check the service status
systemctl status node_exporter

# Test the metrics endpoint
curl -s http://localhost:9100/metrics | head -20

# Check specific metrics
curl -s http://localhost:9100/metrics | grep "node_cpu_seconds_total"
curl -s http://localhost:9100/metrics | grep "node_memory_MemAvailable_bytes"
```

## Open the Firewall

```bash
# Allow Prometheus to reach port 9100
sudo firewall-cmd --permanent --add-port=9100/tcp
sudo firewall-cmd --reload
```

## Configure Prometheus to Scrape This Host

On your Prometheus server, add the target to `prometheus.yml`:

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'rhel-nodes'
    scrape_interval: 15s
    static_configs:
      - targets:
          - '192.168.1.50:9100'
          - '192.168.1.51:9100'
        labels:
          env: 'production'
```

```bash
# Reload Prometheus configuration
sudo systemctl reload prometheus
# or send SIGHUP
# kill -HUP $(pidof prometheus)
```

## Enable Additional Collectors

```bash
# Enable textfile collector for custom metrics
sudo mkdir -p /var/lib/node_exporter/textfile_collector

# Update the service to include the textfile path
# Add to ExecStart in the service file:
# --collector.textfile.directory=/var/lib/node_exporter/textfile_collector

# Write a custom metric file
echo 'myapp_last_backup_timestamp_seconds 1705334400' | \
    sudo tee /var/lib/node_exporter/textfile_collector/backup.prom
```

## Key Metrics to Monitor

```bash
# CPU usage rate
# node_cpu_seconds_total

# Available memory
# node_memory_MemAvailable_bytes

# Disk space
# node_filesystem_avail_bytes

# Network traffic
# node_network_receive_bytes_total
# node_network_transmit_bytes_total

# System load
# node_load1, node_load5, node_load15
```

Node Exporter is the standard way to get RHEL system metrics into Prometheus. Once configured, pair it with Grafana dashboards for visualization.
