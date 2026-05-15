# How to Configure Prometheus Node Exporter on RHEL for Metrics Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Prometheus, Node Exporter, Monitoring

Description: Install and configure Prometheus Node Exporter on RHEL to expose system metrics.

---

## Overview

Install and configure Prometheus Node Exporter on RHEL to expose system metrics. Effective monitoring is critical for maintaining system health, detecting issues early, and planning capacity.

## Prerequisites

- A RHEL system with a valid subscription or configured repositories
- Root or sudo access
- Network access for remote monitoring tools (if applicable)

## Step 1 - Install Required Packages

Install the tools needed to download and install Node Exporter:

```bash
sudo dnf install -y wget tar
```

Download and install the Node Exporter binary:

```bash
VERSION="1.11.1"
ARCH="amd64"

wget "https://github.com/prometheus/node_exporter/releases/download/v${VERSION}/node_exporter-${VERSION}.linux-${ARCH}.tar.gz"
tar xvf "node_exporter-${VERSION}.linux-${ARCH}.tar.gz"
id -u node_exporter >/dev/null 2>&1 || sudo useradd --no-create-home --shell /sbin/nologin node_exporter
sudo install -o node_exporter -g node_exporter -m 0755 "node_exporter-${VERSION}.linux-${ARCH}/node_exporter" /usr/local/bin/node_exporter
```

Select the correct release and architecture for your specific setup.

## Step 2 - Enable and Start Services

Create a systemd service for Node Exporter:

```bash
sudo tee /etc/systemd/system/node_exporter.service >/dev/null <<'EOF'
[Unit]
Description=Prometheus Node Exporter
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
```

## Step 3 - Configure the Monitoring Tool

Edit the Prometheus configuration file for your monitoring setup. Common locations include:

- `/etc/prometheus/prometheus.yml` for Prometheus
- `/etc/grafana/grafana.ini` for Grafana

Add Node Exporter as a Prometheus scrape target:

```yaml
scrape_configs:
  - job_name: node_exporter
    static_configs:
      - targets: ["localhost:9100"]
```

Apply your changes and restart Prometheus:

```bash
sudo systemctl restart prometheus
```

## Step 4 - Open Firewall Ports

```bash
# Common monitoring ports
sudo firewall-cmd --permanent --add-port=9090/tcp   # Prometheus
sudo firewall-cmd --permanent --add-port=9100/tcp   # Node Exporter
sudo firewall-cmd --permanent --add-port=3000/tcp   # Grafana
sudo firewall-cmd --reload
```

## Step 5 - Verify Data Collection

Confirm that metrics are being collected:

```bash
# Node Exporter metrics endpoint
curl -s http://localhost:9100/metrics | grep node_exporter_build_info

# Prometheus query API
curl -s 'http://localhost:9090/api/v1/query?query=up'
```

## Step 6 - Set Up Alerting (Optional)

Configure alerts based on thresholds so you are notified before issues become critical. Use Prometheus Alertmanager, Nagios notifications, or Red Hat Insights recommendations depending on your stack.

## Summary

You now know how to configure prometheus node exporter for metrics collection. Regular monitoring helps you detect performance degradation, plan capacity, and respond to incidents quickly on your RHEL systems.
