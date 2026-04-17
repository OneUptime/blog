# How to Set Up ClickHouse Alerts with Prometheus AlertManager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Prometheus, Alertmanager, Monitoring, Alert, Observability

Description: Learn how to configure Prometheus alerting rules for ClickHouse and route them through AlertManager to Slack, PagerDuty, and email with inhibition and grouping strategies.

---

Alerting on ClickHouse metrics requires two components working together: Prometheus evaluates alerting rules against scraped metrics and fires alerts, and AlertManager receives those alerts and routes, groups, deduplicates, and delivers them to on-call channels. This guide covers writing effective alerting rules for ClickHouse and configuring AlertManager to handle them intelligently.

## Prerequisites

This guide assumes ClickHouse metrics are already flowing into Prometheus via the `clickhouse-exporter`. See the companion post on monitoring ClickHouse with Prometheus and Grafana for that setup.

Verify metrics are available:

```bash
curl -sg 'http://localhost:9090/api/v1/query?query=ClickHouseMetrics_Query' | python3 -m json.tool
```

## Installing AlertManager

```bash
# Download AlertManager
wget https://github.com/prometheus/alertmanager/releases/download/v0.32.0/alertmanager-0.32.0.linux-amd64.tar.gz
tar -xzf alertmanager-0.32.0.linux-amd64.tar.gz
sudo mv alertmanager-0.32.0.linux-amd64/alertmanager /usr/local/bin/
sudo mv alertmanager-0.32.0.linux-amd64/amtool /usr/local/bin/

# Create directories
sudo mkdir -p /etc/alertmanager /var/lib/alertmanager
```

Create the AlertManager systemd service:

```bash
sudo tee /etc/systemd/system/alertmanager.service > /dev/null <<'EOF'
[Unit]
Description=Prometheus AlertManager
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/var/lib/alertmanager \
  --web.listen-address=:9093
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable alertmanager
```

## Writing ClickHouse Alerting Rules

Create a dedicated rules file for ClickHouse:

```bash
sudo tee /etc/prometheus/rules/clickhouse.yml > /dev/null <<'EOF'
groups:
  - name: clickhouse.critical
    interval: 30s
    rules:

      - alert: ClickHouseDown
        expr: up{job="clickhouse"} == 0
        for: 1m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "ClickHouse instance {{ $labels.instance }} is down"
          description: "The ClickHouse exporter on {{ $labels.instance }} has been unreachable for more than 1 minute."
          runbook: "https://wiki.example.com/runbooks/clickhouse-down"

      - alert: ClickHouseHighMemoryUsage
        expr: >
          ClickHouseAsyncMetrics_MemoryResident / 1024 / 1024 / 1024
          > 28
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "ClickHouse memory usage above 28 GB on {{ $labels.instance }}"
          description: "Resident memory is {{ $value }} GB, which may indicate a memory leak or oversized queries."

      - alert: ClickHouseReplicationLagCritical
        expr: ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay > 300
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "ClickHouse replication lag is {{ $value }}s on {{ $labels.instance }}"
          description: "Replica is more than 5 minutes behind the leader. Data consistency is at risk."

  - name: clickhouse.warning
    interval: 60s
    rules:

      - alert: ClickHouseHighQueryCount
        expr: rate(ClickHouseProfileEvents_Query[5m]) > 1000
        for: 10m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "ClickHouse QPS above 1000 on {{ $labels.instance }}"
          description: "Query rate is {{ $value | humanize }} per second over the last 5 minutes."

      - alert: ClickHouseMergeBacklog
        expr: ClickHouseMetrics_Merge > 50
        for: 15m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "ClickHouse has {{ $value }} merges in progress on {{ $labels.instance }}"
          description: "A high merge count can indicate a write-heavy workload exceeding merge throughput."

      - alert: ClickHouseHighDiskUsage
        expr: >
          ClickHouseAsyncMetrics_DiskUsed_default
          / ClickHouseAsyncMetrics_DiskTotal_default
          > 0.85
        for: 10m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "ClickHouse disk usage above 85% on {{ $labels.instance }}"
          description: "Disk utilisation is {{ $value | humanizePercentage }}. Add capacity or drop old data."

      - alert: ClickHouseReplicationLagWarning
        expr: ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay > 60
        for: 5m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "ClickHouse replication lag is {{ $value }}s on {{ $labels.instance }}"
          description: "Replica is more than 60 seconds behind the leader."

      - alert: ClickHouseZookeeperErrors
        expr: rate(ClickHouseProfileEvents_ZooKeeperHardwareExceptions[5m]) > 0
        for: 5m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "ZooKeeper hardware exceptions on {{ $labels.instance }}"
          description: "ZooKeeper connection issues will affect replication and distributed DDL."
EOF
```

Add the rules file to Prometheus configuration:

```yaml
# /etc/prometheus/prometheus.yml  (add to existing config)
rule_files:
  - /etc/prometheus/rules/clickhouse.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093
```

Validate and reload:

```bash
promtool check rules /etc/prometheus/rules/clickhouse.yml
sudo systemctl reload prometheus
```

## Configuring AlertManager

Create the AlertManager configuration with routing for different severity levels:

```yaml
# /etc/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

templates:
  - /etc/alertmanager/templates/*.tmpl

route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: slack-warnings

  routes:
    - match:
        severity: critical
      receiver: pagerduty-critical
      continue: true

    - match:
        severity: critical
      receiver: slack-critical

    - match:
        severity: warning
      receiver: slack-warnings

inhibit_rules:
  # If ClickHouseDown fires, suppress all other alerts for that instance
  - source_match:
      alertname: ClickHouseDown
    target_match_re:
      alertname: 'ClickHouse.*'
    equal: ['instance']

receivers:
  - name: slack-critical
    slack_configs:
      - channel: '#clickhouse-critical'
        title: 'CRITICAL: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Instance:* {{ .Labels.instance }}
          *Summary:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Runbook:* {{ .Annotations.runbook }}
          {{ end }}
        send_resolved: true
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'

  - name: slack-warnings
    slack_configs:
      - channel: '#clickhouse-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Instance:* {{ .Labels.instance }}
          *Summary:* {{ .Annotations.summary }}
          {{ end }}
        send_resolved: true
        color: '{{ if eq .Status "firing" }}warning{{ else }}good{{ end }}'

  - name: pagerduty-critical
    pagerduty_configs:
      - routing_key: 'YOUR_PAGERDUTY_ROUTING_KEY'
        description: '{{ .GroupLabels.alertname }} on {{ .GroupLabels.instance }}'
        severity: critical
        details:
          summary: '{{ (index .Alerts 0).Annotations.summary }}'
          description: '{{ (index .Alerts 0).Annotations.description }}'
```

Start AlertManager:

```bash
sudo systemctl start alertmanager

# Verify configuration
amtool check-config /etc/alertmanager/alertmanager.yml
```

## Testing Alerts

Use `amtool` to send a test alert and verify routing:

```bash
# Send a test alert
amtool alert add \
  alertname=ClickHouseDown \
  instance=clickhouse-node-1 \
  severity=critical \
  --annotation=summary="Test alert - ClickHouse node down" \
  --annotation=description="This is a test firing"

# List active alerts
amtool alert query

# Silence an alert during maintenance
amtool silence add \
  alertname=ClickHouseHighDiskUsage \
  instance=clickhouse-node-1 \
  --duration=2h \
  --comment="Planned maintenance window"

# List silences
amtool silence query
```

## Firing Test Alerts via PromQL Simulation

You can also trigger a real alert by temporarily lowering the threshold in a test rule:

```bash
# Check current metric value
curl -sg 'http://localhost:9090/api/v1/query?query=ClickHouseMetrics_Merge' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['result'])"

# Check pending/firing alerts
curl -sg http://localhost:9090/api/v1/alerts | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(a['labels']['alertname'], a['state']) for a in d['data']['alerts']]"
```

## Verifying AlertManager Routes

```bash
# Test alert routing without actually sending
amtool config routes test \
  alertname=ClickHouseDown \
  severity=critical \
  instance=clickhouse-node-1

# Show full routing tree
amtool config routes show
```

## Summary

Effective ClickHouse alerting requires alerting rules that target the right metrics at appropriate thresholds, inhibition rules that suppress redundant child alerts when the parent alert fires (such as suppressing all ClickHouse alerts when the instance itself is down), and AlertManager routing that sends critical alerts to PagerDuty for immediate action while routing warnings to Slack for async review. The combination of `for` durations, grouping, and silences prevents alert fatigue while ensuring real incidents are never missed.
