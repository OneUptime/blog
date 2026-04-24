# How to Write Prometheus Alerting Rules for IPv4 Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, IPv4, Alerting Rules, PromQL, Monitoring, Alert

Description: Write Prometheus alerting rules targeting IPv4 infrastructure metrics, configure alert severity levels, and route alerts through Alertmanager for notifications.

## Introduction

Prometheus alerting rules evaluate PromQL expressions at regular intervals. When an expression returns results, an alert becomes active; if a `for` duration is set, it fires only after the expression stays active for that long. Rules are grouped in YAML files and loaded by Prometheus. Good alerting rules focus on user-visible symptoms and avoid alert fatigue through appropriate thresholds and durations.

## Alert Rule File Structure

```yaml
# /etc/prometheus/rules/ipv4_infra_alerts.yml

groups:
  - name: ipv4_infrastructure
    # Evaluate rules every 30 seconds
    interval: 30s
    rules:
      - alert: AlertName
        expr: <PromQL expression>
        for: <duration>    # Expression must stay active for this duration before firing
        labels:
          severity: <critical|warning|info>
        annotations:
          summary: "Human-readable summary"
          description: "Detailed description with {{ $labels.instance }}"
```

## Common Infrastructure Alerts

```yaml
# /etc/prometheus/rules/ipv4_infra_alerts.yml

groups:
  - name: host_availability
    rules:
      # Instance down
      - alert: InstanceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
          description: "{{ $labels.job }} scrape target {{ $labels.instance }} has been down for 2 minutes"

      # High CPU usage
      - alert: HighCPUUsage
        expr: >
          100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ printf \"%.1f\" $value }}%"

      # Low memory
      - alert: LowMemory
        expr: >
          node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100 < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low memory on {{ $labels.instance }}"
          description: "Only {{ printf \"%.1f\" $value }}% memory available"

      # Disk space critical
      - alert: DiskSpaceCritical
        expr: >
          node_filesystem_avail_bytes{fstype!="tmpfs"} /
          node_filesystem_size_bytes{fstype!="tmpfs"} * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space critical on {{ $labels.instance }}"
          description: "Mount {{ $labels.mountpoint }}: {{ printf \"%.1f\" $value }}% free"
```

## Network-Specific Alerts

```yaml
# /etc/prometheus/rules/ipv4_infra_alerts.yml

groups:
  - name: network_alerts
    rules:
      # High network bandwidth
      - alert: HighNetworkBandwidth
        expr: >
          rate(node_network_receive_bytes_total{device!="lo"}[5m]) * 8 / 1000000 > 800
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High bandwidth on {{ $labels.instance }}:{{ $labels.device }}"
          description: "Inbound: {{ printf \"%.0f\" $value }}Mbps"

      # Packet drops
      - alert: NetworkPacketDrops
        expr: rate(node_network_receive_drop_total{device!="lo"}[5m]) > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Packet drops on {{ $labels.instance }}"
```

## Loading Rules

```yaml
# /etc/prometheus/prometheus.yml

rule_files:
  - "/etc/prometheus/rules/*.yml"
```

```bash
# Validate rule syntax

promtool check rules /etc/prometheus/rules/ipv4_infra_alerts.yml
# Expected: SUCCESS

# Reload Prometheus (requires `--web.enable-lifecycle`)
curl -X POST http://127.0.0.1:9090/-/reload

# Check alert status
curl -s http://127.0.0.1:9090/api/v1/rules | python3 -m json.tool
```

## Conclusion

Prometheus alerting rules use `expr` for PromQL, `for` for minimum duration before firing, and `labels` + `annotations` for metadata. Include `instance` labels in descriptions so alerts identify the affected host. Load rules from separate files using `rule_files` glob patterns. Always validate with `promtool check rules` before reloading. Focus alerts on symptoms (high latency, low availability) rather than causes.
