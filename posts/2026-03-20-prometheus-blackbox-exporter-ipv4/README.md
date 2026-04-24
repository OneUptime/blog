# How to Use Prometheus Blackbox Exporter for IPv4 Endpoint Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Blackbox Exporter, IPv4, HTTP, TCP, ICMP, Monitoring

Description: Set up Prometheus Blackbox Exporter to probe IPv4 endpoints for HTTP availability, TCP connectivity, ICMP ping, and SSL certificate expiry monitoring.

## Introduction

Blackbox Exporter probes endpoints from the outside-testing whether HTTP(S), TCP, DNS, or ICMP targets are reachable and responding correctly. This is essential for uptime monitoring and detecting issues from a network perspective rather than from inside the target host.

## Installation

```bash
# Install Blackbox Exporter

BLACKBOX_VERSION="0.28.0"
wget https://github.com/prometheus/blackbox_exporter/releases/download/v${BLACKBOX_VERSION}/blackbox_exporter-${BLACKBOX_VERSION}.linux-amd64.tar.gz
tar xzf blackbox_exporter-*.tar.gz
sudo cp blackbox_exporter-*/blackbox_exporter /usr/local/bin/
sudo mkdir -p /etc/blackbox_exporter

# systemd service
sudo tee /etc/systemd/system/blackbox_exporter.service > /dev/null << 'EOF'
[Unit]
Description=Prometheus Blackbox Exporter
After=network.target

[Service]
User=blackbox_exporter
ExecStart=/usr/local/bin/blackbox_exporter \
  --config.file=/etc/blackbox_exporter/config.yml \
  --web.listen-address=10.0.0.5:9115

Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF

sudo useradd -rs /bin/false blackbox_exporter
sudo systemctl daemon-reload
sudo systemctl enable blackbox_exporter
```

## Blackbox Exporter Configuration

```yaml
# /etc/blackbox_exporter/config.yml

modules:
  # HTTP GET probe (2xx success)
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: []    # Default: 2xx
      method: GET
      preferred_ip_protocol: "ip4"
      ip_protocol_fallback: false

  # HTTPS with SSL certificate check
  https_2xx:
    prober: http
    timeout: 5s
    http:
      method: GET
      preferred_ip_protocol: "ip4"
      ip_protocol_fallback: false
      fail_if_ssl: false
      fail_if_not_ssl: true
      tls_config:
        insecure_skip_verify: false

  # TCP connection check
  tcp_connect:
    prober: tcp
    timeout: 5s
    tcp:
      preferred_ip_protocol: "ip4"
      ip_protocol_fallback: false

  # ICMP ping (requires root or cap_net_raw)
  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"
      ip_protocol_fallback: false
```

```bash
sudo systemctl start blackbox_exporter
```

## Prometheus Scrape Configuration

```yaml
# /etc/prometheus/prometheus.yml

scrape_configs:
  - job_name: 'blackbox_http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - 'http://10.0.0.1:80'
          - 'http://10.0.0.2:80'
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 10.0.0.5:9115   # Blackbox Exporter address

  - job_name: 'blackbox_https'
    metrics_path: /probe
    params:
      module: [https_2xx]
    static_configs:
      - targets:
          - 'https://example.com:443'
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 10.0.0.5:9115

  - job_name: 'blackbox_tcp'
    metrics_path: /probe
    params:
      module: [tcp_connect]
    static_configs:
      - targets:
          - '10.0.0.10:3306'    # MySQL
          - '10.0.0.11:5432'    # PostgreSQL
          - '10.0.0.12:6379'    # Redis
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 10.0.0.5:9115

  - job_name: 'blackbox_icmp'
    metrics_path: /probe
    params:
      module: [icmp]
    static_configs:
      - targets:
          - '10.0.0.20'
          - '10.0.0.21'
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: 10.0.0.5:9115
```

## Alerting on Probe Failures

```yaml
# /etc/prometheus/rules/blackbox_alerts.yml

groups:
  - name: blackbox_probes
    rules:
      - alert: EndpointDown
        expr: probe_success == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Endpoint {{ $labels.instance }} is down"

      - alert: SSLCertificateExpiring
        expr: (probe_ssl_earliest_cert_expiry - time()) / 86400 < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL cert expiring in {{ printf \"%.0f\" $value }} days on {{ $labels.instance }}"
```

## Conclusion

Blackbox Exporter probes IPv4 endpoints externally, measuring availability, response time, and SSL certificate validity. The relabeling configuration routes the target URL or address through the exporter. Use `preferred_ip_protocol: "ip4"` together with `ip_protocol_fallback: false` in module config to force IPv4 probes. Create alerts on `probe_success == 0` for downtime detection and `probe_ssl_earliest_cert_expiry` for certificate monitoring.
