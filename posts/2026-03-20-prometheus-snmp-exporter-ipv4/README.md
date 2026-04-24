# How to Configure Prometheus SNMP Exporter for IPv4 Network Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, SNMP, IPv4, Network Monitoring, Metric, Exporter

Description: Configure the Prometheus SNMP exporter to collect metrics from IPv4 network devices using SNMPv2c and SNMPv3, generate snmp.yml with generator, and build Grafana dashboards.

## Introduction

The Prometheus SNMP exporter collects metrics from network devices (routers, switches, UPS units) via SNMP and exposes them as Prometheus metrics. Unlike node_exporter, SNMP exporter runs centrally and reaches out to devices by IP address at scrape time.

## Architecture

```text
Prometheus ──scrape──▶ snmp_exporter :9116 ──SNMP──▶ 10.0.0.1 (router)
                                              ──SNMP──▶ 10.0.0.2 (switch)
                                              ──SNMP──▶ 10.0.0.3 (UPS)
```

Prometheus passes the target device IP as a parameter to the SNMP exporter, which performs the SNMP walk and returns the results.

## Installing SNMP Exporter

```bash
# Download snmp_exporter

SNMP_VERSION="0.30.1"
wget https://github.com/prometheus/snmp_exporter/releases/download/v${SNMP_VERSION}/snmp_exporter-${SNMP_VERSION}.linux-amd64.tar.gz
tar xzf snmp_exporter-*.tar.gz
sudo cp snmp_exporter-*/snmp_exporter /usr/local/bin/
```

## snmp.yml Configuration

The exporter reads a generated `snmp.yml` file that defines SNMP modules and authentication. If you need custom modules, edit `generator.yml` and generate `snmp.yml`; otherwise you can use the default bundled config.

```yaml
# /etc/snmp_exporter/snmp.yml

auths:
  public_v2:
    community: public
    version: 2

  prometheus_v3:
    version: 3
    security_level: authPriv
    username: prometheus
    password: auth_password_here
    auth_protocol: SHA
    priv_protocol: AES
    priv_password: priv_password_here

modules:
  if_mib:
    walk:
      - 1.3.6.1.2.1.2
      - 1.3.6.1.2.1.31.1.1
    metrics:
      - name: ifOperStatus
        oid: 1.3.6.1.2.1.2.2.1.8
        type: gauge
        help: The current operational state of the interface
        indexes:
          - labelname: ifIndex
            type: gauge
        lookups:
          - labels:
              - ifIndex
            labelname: ifDescr
            oid: 1.3.6.1.2.1.2.2.1.2
            type: DisplayString
      - name: ifHCInOctets
        oid: 1.3.6.1.2.1.31.1.1.1.6
        type: counter
        help: Bytes received on interface
        indexes:
          - labelname: ifIndex
            type: gauge
        lookups:
          - labels:
              - ifIndex
            labelname: ifDescr
            oid: 1.3.6.1.2.1.2.2.1.2
            type: DisplayString
      - name: ifHCOutOctets
        oid: 1.3.6.1.2.1.31.1.1.1.10
        type: counter
        help: Bytes transmitted on interface
        indexes:
          - labelname: ifIndex
            type: gauge
        lookups:
          - labels:
              - ifIndex
            labelname: ifDescr
            oid: 1.3.6.1.2.1.2.2.1.2
            type: DisplayString
```

## Systemd Service

```ini
# /etc/systemd/system/snmp_exporter.service
[Unit]
Description=Prometheus SNMP Exporter
After=network-online.target

[Service]
Type=simple
User=prometheus
ExecStart=/usr/local/bin/snmp_exporter \
  --config.file=/etc/snmp_exporter/snmp.yml \
  --web.listen-address=10.0.0.5:9116

Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now snmp_exporter

# Verify
ss -tlnp | grep 9116
# Expected: 10.0.0.5:9116
```

## Prometheus Scrape Configuration

```yaml
# /etc/prometheus/prometheus.yml

scrape_configs:
  - job_name: 'snmp'
    static_configs:
      - targets:
          - 10.0.0.1   # router
          - 10.0.0.2   # switch
          - 10.0.0.3   # UPS
    metrics_path: /snmp
    params:
      auth: [public_v2]
      module: [if_mib]   # Module from snmp.yml
    relabel_configs:
      # Pass target IP as SNMP target parameter
      - source_labels: [__address__]
        target_label: __param_target
      # Use snmp_exporter as the actual scrape target
      - target_label: __address__
        replacement: 10.0.0.5:9116
      # Keep original device IP as 'instance' label
      - source_labels: [__param_target]
        target_label: instance

  # Per-device auth selection
  - job_name: 'snmp_v3'
    static_configs:
      - targets:
          - 10.0.0.10  # managed switch with SNMPv3
    metrics_path: /snmp
    params:
      auth: [prometheus_v3]
      module: [if_mib]
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: 10.0.0.5:9116
      - source_labels: [__param_target]
        target_label: instance
```

## Testing the SNMP Exporter

```bash
# Manual test - scrape metrics for a specific device
curl "http://10.0.0.5:9116/snmp?target=10.0.0.1&auth=public_v2&module=if_mib"

# Should return Prometheus-format metrics like:
# ifOperStatus{ifDescr="GigabitEthernet0/0",ifIndex="1"} 1
# ifHCInOctets{ifDescr="GigabitEthernet0/0",ifIndex="1"} 1234567890

# Check the exporter's own metrics
curl http://10.0.0.5:9116/metrics | grep snmp_
```

## Key PromQL Queries

```promql
# Interface operational status (common values: 1=up, 2=down, 7=lowerLayerDown)
ifOperStatus{job="snmp"}

# Interface receive throughput (bits/sec)
rate(ifHCInOctets{job="snmp"}[5m]) * 8

# Interface transmit throughput
rate(ifHCOutOctets{job="snmp"}[5m]) * 8

# Down interfaces
ifOperStatus{job="snmp"} == 2

# Top 10 interfaces by receive traffic
topk(10, rate(ifHCInOctets{job="snmp"}[5m]) * 8)
```

## Alerting Rules

```yaml
# /etc/prometheus/rules/snmp_alerts.yml
groups:
  - name: snmp_network
    rules:
      - alert: InterfaceDown
        expr: ifOperStatus{job="snmp"} == 2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Interface {{ $labels.ifDescr }} on {{ $labels.instance }} is down"

      - alert: HighInboundTraffic
        expr: rate(ifHCInOctets{job="snmp"}[5m]) * 8 / 1000000 > 800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High inbound traffic on {{ $labels.ifDescr }}: {{ $value | humanize }}Mbps"
```

## Firewall Rules

```bash
# Allow Prometheus to reach snmp_exporter
sudo iptables -A INPUT -s 10.0.0.100 -p tcp --dport 9116 -j ACCEPT

# Allow snmp_exporter to poll network devices via SNMP
sudo iptables -A OUTPUT -p udp --dport 161 -j ACCEPT

# SNMP traps use UDP/162, but snmp_exporter polls devices and does not receive traps
```

## Conclusion

The Prometheus SNMP exporter runs centrally and scrapes multiple IPv4 devices by IP at Prometheus scrape time. The key is the `relabel_configs` in `prometheus.yml` that rewrites `__address__` to point at the exporter while passing the original device IP as `__param_target`. Use `if_mib` module for standard interface metrics (ifOperStatus, ifHCInOctets, ifHCOutOctets), and build Grafana panels from `rate(ifHCInOctets[5m]) * 8` for bandwidth visualization. For SNMPv3, define `auth_protocol: SHA` and `priv_protocol: AES` in the `auths` section and select that auth with `params.auth`.
