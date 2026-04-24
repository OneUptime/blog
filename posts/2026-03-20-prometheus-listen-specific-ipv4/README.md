# How to Configure Prometheus to Listen on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, IPv4, Listen, Configuration, Monitoring, Metric

Description: Configure Prometheus to listen on a specific IPv4 address using the --web.listen-address flag, restrict API access, and verify the binding.

## Introduction

Prometheus defaults to listening on all interfaces (0.0.0.0:9090). On multi-homed servers, binding to a specific IPv4 address restricts the UI, API, and metrics endpoints to a single interface, reducing exposure while maintaining monitoring functionality.

## Configuration

```bash
# Command-line flag (preferred)

prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --web.listen-address="10.0.0.5:9090" \
  --storage.tsdb.path=/var/lib/prometheus

# Restrict to localhost only (access via SSH tunnel or reverse proxy)
prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --web.listen-address="127.0.0.1:9090"
```

## systemd Service Configuration

```bash
# /etc/systemd/system/prometheus.service
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --web.listen-address=10.0.0.5:9090 \
  --web.external-url=http://10.0.0.5:9090

Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart prometheus

# Verify binding
sudo ss -tlnp | grep prometheus
# Expected: 10.0.0.5:9090
```

## Prometheus Configuration File

```yaml
# /etc/prometheus/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Where to store alert rules
rule_files:
  - "/etc/prometheus/rules/*.yml"

# Alertmanager connection
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['10.0.0.5:9093']

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['10.0.0.5:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['10.0.0.1:9100', '10.0.0.2:9100', '10.0.0.3:9100']
```

## Firewall Rules

```bash
# Allow Prometheus only from approved monitoring clients
sudo ufw allow from 10.0.0.10 to any port 9090    # Grafana
sudo ufw allow from 10.0.0.11 to any port 9090    # Another monitoring tool
sudo ufw deny 9090

# iptables
sudo iptables -A INPUT -p tcp --dport 9090 -s 10.0.0.10/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9090 -s 10.0.0.11/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9090 -j DROP
```

## Verifying

```bash
# Check Prometheus is accessible
curl -s http://10.0.0.5:9090/api/v1/status/config | python3 -m json.tool

# Check targets are being scraped
curl -s http://10.0.0.5:9090/api/v1/targets | \
  python3 -c "import sys,json; [print(t['scrapeUrl'], t['health']) for t in json.load(sys.stdin)['data']['activeTargets']]"

# Check specific metric
curl -s "http://10.0.0.5:9090/api/v1/query?query=up" | python3 -m json.tool
```

## Conclusion

Set Prometheus's listen address with `--web.listen-address=ip:port`. Use a specific IPv4 address to limit exposure, or `127.0.0.1:9090` for maximum security with access through SSH tunnels or a reverse proxy. Always pair binding with firewall rules - Prometheus does not enable authentication by default, so network-level access control is critical.
