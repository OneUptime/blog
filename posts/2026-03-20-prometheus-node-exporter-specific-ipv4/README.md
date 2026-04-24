# How to Configure Prometheus Node Exporter to Listen on a Specific IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, IPv4, Monitoring, Metric, Linux

Description: Configure Prometheus Node Exporter to bind to a specific IPv4 address, restrict which collectors are enabled, and set up firewall rules to secure metrics access.

## Introduction

Node Exporter defaults to listening on all network interfaces on port 9100 (`:9100`). On servers with multiple network interfaces, binding to the monitoring network's IPv4 address prevents the metrics endpoint from being accessible on public-facing interfaces.

## Installation

```bash
# Install Node Exporter

NODEEXPORTER_VERSION="1.11.1"
wget https://github.com/prometheus/node_exporter/releases/download/v${NODEEXPORTER_VERSION}/node_exporter-${NODEEXPORTER_VERSION}.linux-amd64.tar.gz
tar xzf node_exporter-*.tar.gz
sudo cp node_exporter-*/node_exporter /usr/local/bin/
sudo chmod +x /usr/local/bin/node_exporter
```

## Binding to Specific IPv4

```bash
# Run Node Exporter bound to specific IP
node_exporter --web.listen-address="10.0.0.5:9100"

# systemd service unit:
# /etc/systemd/system/node_exporter.service
```

## systemd Service Unit

```ini
# /etc/systemd/system/node_exporter.service

[Unit]
Description=Prometheus Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
  --web.listen-address=10.0.0.5:9100 \
  --collector.disable-defaults \
  --collector.cpu \
  --collector.meminfo \
  --collector.diskstats \
  --collector.filesystem \
  --collector.netdev \
  --collector.netstat \
  --collector.loadavg \
  --collector.uname

Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

```bash
# Create user (no login shell)
sudo useradd -rs /bin/false node_exporter

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter

# Verify
sudo ss -tlnp | grep 9100
# Expected: 10.0.0.5:9100
```

## Firewall Rules

```bash
# Allow Node Exporter only from Prometheus server
sudo ufw allow proto tcp from 10.0.0.30 to any port 9100    # Prometheus server IP
sudo ufw deny proto tcp to any port 9100

# iptables
sudo iptables -A INPUT -p tcp --dport 9100 -s 10.0.0.30/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9100 -j DROP
```

## Prometheus Scrape Configuration

```yaml
# /etc/prometheus/prometheus.yml

scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets:
          - '10.0.0.5:9100'
          - '10.0.0.2:9100'
          - '10.0.0.3:9100'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

## Verifying Metrics

```bash
# Check Node Exporter is accessible
curl -s http://10.0.0.5:9100/metrics | head -20

# Check specific metrics
curl -s "http://10.0.0.5:9100/metrics" | grep node_cpu_seconds_total | head -5
curl -s "http://10.0.0.5:9100/metrics" | grep node_memory_MemAvailable_bytes

# Verify from Prometheus
curl -sG "http://10.0.0.30:9090/api/v1/query" \
  --data-urlencode 'query=node_uname_info{instance="10.0.0.5:9100"}'
```

## Conclusion

Configure Node Exporter to bind to a specific IPv4 with `--web.listen-address=ip:9100`. Use a systemd service unit for production deployments with a dedicated non-root user. Restrict access to port 9100 with firewall rules allowing only the Prometheus server's IP. Disable unnecessary collectors with `--collector.disable-defaults` and explicitly enable only what you need for reduced overhead.
