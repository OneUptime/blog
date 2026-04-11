# How to Build a Complete Redis Monitoring Stack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Prometheus, Grafana, Alertmanager, Monitoring, Observability

Description: Build a complete Redis monitoring stack with Prometheus, Grafana, and AlertManager to collect metrics, visualize dashboards, and send alerts.

---

## Overview

This guide sets up a full Redis observability stack:
- **redis_exporter** - scrapes Redis metrics and exposes them for Prometheus
- **Prometheus** - collects and stores time-series metrics
- **Grafana** - visualizes metrics in dashboards
- **AlertManager** - routes alerts via email, Slack, or PagerDuty

## Architecture

```text
Redis -> redis_exporter -> Prometheus -> Grafana (dashboards)
                                     -> AlertManager -> Slack/Email
```

## Step 1: Install redis_exporter

```bash
# Download redis_exporter
wget https://github.com/oliver006/redis_exporter/releases/download/v1.55.0/redis_exporter-v1.55.0.linux-amd64.tar.gz
tar xzf redis_exporter-v1.55.0.linux-amd64.tar.gz
sudo mv redis_exporter-v1.55.0.linux-amd64/redis_exporter /usr/local/bin/

# Run it (defaults to localhost:6379 and exposes on :9121)
redis_exporter --redis.addr=redis://localhost:6379

# With password
redis_exporter --redis.addr=redis://localhost:6379 --redis.password=yourpassword
```

Create a systemd service:

```bash
sudo tee /etc/systemd/system/redis_exporter.service << 'EOF'
[Unit]
Description=Redis Exporter
After=network.target

[Service]
User=redis
ExecStart=/usr/local/bin/redis_exporter \
  --redis.addr=redis://localhost:6379 \
  --redis.password=yourpassword
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now redis_exporter
```

Verify metrics are exposed:

```bash
curl http://localhost:9121/metrics | grep redis_connected_clients
# redis_connected_clients 5
```

## Step 2: Configure Prometheus

```yaml
# /etc/prometheus/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - /etc/prometheus/rules/redis.yml

scrape_configs:
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
    scrape_interval: 10s
```

Start Prometheus:

```bash
prometheus --config.file=/etc/prometheus/prometheus.yml
```

## Step 3: Define Alert Rules

```yaml
# /etc/prometheus/rules/redis.yml

groups:
  - name: redis
    rules:
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis instance is down"
          description: "Redis {{ $labels.instance }} has been down for 1 minute"

      - alert: RedisHighMemory
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage above 85%"
          description: "Redis memory is at {{ $value | printf \"%.0f\" }}%"

      - alert: RedisTooManyConnections
        expr: redis_connected_clients > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis has too many connections"
          description: "{{ $value }} clients connected"

      - alert: RedisHighReplicationLag
        expr: redis_connected_slave_lag_seconds > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis replication lag is too high"
          description: "Lag is {{ $value }} seconds"

      - alert: RedisKeyEvictions
        expr: increase(redis_evicted_keys_total[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "Redis is evicting keys"
          description: "{{ $value }} keys evicted in the last 5 minutes"
```

## Step 4: Configure AlertManager

```yaml
# /etc/alertmanager/alertmanager.yml

global:
  slack_api_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'

route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts-redis'
        title: 'Redis Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: 'your-pagerduty-integration-key'
```

Start AlertManager:

```bash
alertmanager --config.file=/etc/alertmanager/alertmanager.yml
```

## Step 5: Set Up Grafana Dashboard

```bash
# Start Grafana
sudo systemctl enable --now grafana-server

# Add Prometheus as data source (via UI or API)
curl -X POST http://admin:admin@localhost:3000/api/datasources \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "url": "http://localhost:9090",
    "access": "proxy",
    "isDefault": true
  }'
```

Import the official Redis Grafana dashboard (ID: 763):

```bash
curl -X POST http://admin:admin@localhost:3000/api/dashboards/import \
  -H 'Content-Type: application/json' \
  -d '{
    "dashboard": '"$(curl -s https://grafana.com/api/dashboards/763 | jq '.json')"',
    "inputs": [{"name": "DS_PROMETHEUS", "type": "datasource", "pluginId": "prometheus", "value": "Prometheus"}],
    "folderId": 0,
    "overwrite": false
  }'
```

Or import dashboard ID 763 directly from grafana.com via the Grafana UI: Dashboards - Import - Enter 763.

## Key Metrics to Dashboard

```text
# Memory usage
redis_memory_used_bytes
redis_memory_max_bytes

# Connected clients
redis_connected_clients

# Cache hit rate
rate(redis_keyspace_hits_total[5m]) /
  (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))

# Commands per second
rate(redis_commands_processed_total[1m])

# Replication lag
redis_connected_slave_lag_seconds

# Key count by database
redis_db_keys

# Evictions
rate(redis_evicted_keys_total[5m])
```

## Summary

A complete Redis monitoring stack pairs redis_exporter with Prometheus for metric collection, Grafana for visualization, and AlertManager for notifications. This setup takes about 30 minutes to configure from scratch and provides full visibility into memory usage, connection counts, cache hit rates, and replication health. The alert rules fire on critical thresholds and route to Slack for warnings and PagerDuty for critical incidents.
