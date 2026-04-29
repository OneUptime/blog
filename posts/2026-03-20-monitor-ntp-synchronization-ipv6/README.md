# How to Monitor NTP Synchronization over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NTP, IPv6, Monitoring, Prometheus, Grafana, Time Synchronization, Alerting

Description: Set up comprehensive monitoring for NTP synchronization health over IPv6 using Prometheus metrics, Grafana dashboards, and alerting rules for time drift detection.

---

Monitoring NTP synchronization ensures your IPv6 infrastructure maintains accurate time, which is critical for security certificates, distributed system coordination, and compliance logging. This guide covers monitoring from simple command-line checks to full Prometheus/Grafana observability.

## Basic Command-Line Monitoring

```bash
# Check overall sync status

timedatectl status

# View chrony sources and their status
chronyc sources -v
# Status symbols: * = selected, + = combined, - = excluded, ? = unreachable

# View detailed tracking information
chronyc tracking

# Key metrics to watch:
# "System time" - current offset from true time
# "Last offset" - offset at last update
# "RMS offset" - root mean square of recent offsets
# "Frequency" - clock frequency error in ppm

# View statistics for each source
chronyc sourcestats
```

## Prometheus NTP Exporter

The `ntpmon` or `chrony_exporter` provides Prometheus metrics for NTP:

```bash
# Install chrony_exporter (check latest version at https://github.com/SuperQ/chrony_exporter/releases)
VERSION="0.13.3"
wget https://github.com/SuperQ/chrony_exporter/releases/download/v${VERSION}/chrony_exporter-${VERSION}.linux-amd64.tar.gz
tar xvf chrony_exporter-${VERSION}.linux-amd64.tar.gz
sudo mv chrony_exporter-${VERSION}.linux-amd64/chrony_exporter /usr/local/bin/

# Create systemd service
cat > /etc/systemd/system/chrony_exporter.service << 'EOF'
[Unit]
Description=Chrony Exporter for Prometheus
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/chrony_exporter \
  --web.listen-address="[::]:9123"
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now chrony_exporter
```

Configure Prometheus to scrape the exporter (supports IPv6):

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ntp_chrony'
    static_configs:
      - targets:
          - '[2001:db8::1]:9123'    # IPv6 host
          - '[2001:db8::2]:9123'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

## Key Prometheus Metrics for NTP

```promql
# System clock offset (seconds) - should be near 0
chrony_tracking_last_offset_seconds

# Frequency error in ppm
chrony_tracking_frequency_ppms

# NTP source reachability (1 = reachable, 0 = unreachable)
chrony_sources_reachability_ratio

# Root dispersion - should be very small
chrony_tracking_root_dispersion_seconds

# Number of sources online
count(chrony_sources_reachability_ratio == 1) by (job)
```

## Prometheus Alerting Rules for NTP

```yaml
# /etc/prometheus/rules/ntp_alerts.yml
groups:
  - name: ntp_sync
    rules:
      - alert: NTPOffsetHigh
        expr: abs(chrony_tracking_last_offset_seconds) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High NTP offset on {{ $labels.instance }}"
          description: "NTP offset is {{ $value }}s (threshold: 0.1s)"

      - alert: NTPSourceUnreachable
        expr: chrony_sources_reachability_ratio == 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "NTP source unreachable on {{ $labels.instance }}"

      - alert: NTPNotSynchronized
        expr: chrony_tracking_reference_timestamp_seconds == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "NTP not synchronized on {{ $labels.instance }}"
```

## Shell Script for Continuous NTP Monitoring

```bash
#!/bin/bash
# monitor_ntp_ipv6.sh - Monitor NTP sync over IPv6 with alerting

WARN_OFFSET_MS=50     # Warning threshold in milliseconds
CRIT_OFFSET_MS=500    # Critical threshold in milliseconds
LOG_FILE="/var/log/ntp-monitor.log"

monitor_ntp() {
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Get current time offset from chrony
  local offset_sec
  offset_sec=$(chronyc tracking | grep "Last offset" | \
    awk '{print $4}' | tr -d '+')

  # Convert to milliseconds
  local offset_ms
  offset_ms=$(echo "$offset_sec * 1000" | bc 2>/dev/null | xargs printf "%.2f")

  # Get reference server
  local ref_server
  ref_server=$(chronyc tracking | grep "Reference ID" | awk '{print $5}')

  # Get sync status
  local synced
  synced=$(timedatectl | grep "synchronized: yes" && echo "yes" || echo "no")

  echo "$timestamp offset=${offset_ms}ms ref=$ref_server synced=$synced" \
    >> "$LOG_FILE"

  # Alert on high offset
  if (( $(echo "${offset_ms#-} > $CRIT_OFFSET_MS" | bc -l) )); then
    echo "CRITICAL: NTP offset ${offset_ms}ms exceeds ${CRIT_OFFSET_MS}ms" >&2
  elif (( $(echo "${offset_ms#-} > $WARN_OFFSET_MS" | bc -l) )); then
    echo "WARNING: NTP offset ${offset_ms}ms exceeds ${WARN_OFFSET_MS}ms" >&2
  fi
}

# Run every minute
while true; do
  monitor_ntp
  sleep 60
done
```

## Grafana Dashboard Query Examples

```text
# Current offset panel
chrony_tracking_last_offset_seconds{job="ntp_chrony"}

# Source availability over time
avg_over_time(chrony_sources_reachability_ratio[5m])

# Frequency error trend
chrony_tracking_frequency_ppms
```

Regular NTP monitoring over IPv6 catches synchronization drift early, preventing the cascading failures that result from significant time differences between distributed systems.
