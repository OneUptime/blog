# How to Set Up Log Alerting with LogCLI (Loki) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Loki, LogCLI, Log Alerting, Monitoring

Description: A hands-on guide to setting up log alerting with LogCLI and Grafana Loki on Ubuntu, covering LogQL queries, alert rules, and notification channel configuration.

---

Grafana Loki stores logs using a label-based index (similar to how Prometheus stores metrics) and allows querying with LogQL. LogCLI is the command-line interface for querying Loki, and Loki itself has a built-in ruler component that evaluates LogQL alert rules on a schedule and fires alerts to Alertmanager.

This guide covers querying logs with LogCLI, writing alert rules, and setting up notifications.

## Architecture

```
Applications / Promtail
      |
   [Loki] - log storage and query engine
      |
  [Ruler] - evaluates alert rules periodically
      |
[Alertmanager] - deduplicates and routes alerts
      |
  [Slack/PagerDuty/Email]
```

## Prerequisites

- Loki running (via Docker or binary)
- Alertmanager running or accessible
- Ubuntu 20.04 or 22.04

## Installing Loki and Promtail with Docker Compose

If you do not already have Loki running:

```bash
mkdir -p ~/loki-stack && cd ~/loki-stack

# Download the Docker Compose and config files from Grafana
curl -O https://raw.githubusercontent.com/grafana/loki/main/production/docker-compose.yaml

docker compose up -d
```

Or run a minimal Loki with a custom config:

```bash
mkdir -p /etc/loki /var/lib/loki
```

```yaml
# /etc/loki/loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /var/lib/loki
  storage:
    filesystem:
      chunks_directory: /var/lib/loki/chunks
      rules_directory: /var/lib/loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://localhost:9093
  storage:
    type: local
    local:
      directory: /var/lib/loki/rules
  rule_path: /var/lib/loki/rules
  enable_api: true
```

## Installing LogCLI

```bash
# Download LogCLI binary
LOKI_VERSION=$(curl -s https://api.github.com/repos/grafana/loki/releases/latest | grep tag_name | cut -d'"' -f4)
curl -Lo logcli.gz "https://github.com/grafana/loki/releases/download/${LOKI_VERSION}/logcli-linux-amd64.zip"
unzip logcli.gz -d /tmp
sudo mv /tmp/logcli-linux-amd64 /usr/local/bin/logcli
sudo chmod +x /usr/local/bin/logcli

# Verify
logcli --version
```

## Configuring LogCLI

Set the Loki address:

```bash
# Set in shell profile for convenience
export LOKI_ADDR=http://localhost:3100

# Or specify per command
logcli --addr=http://localhost:3100 labels
```

## Basic LogCLI Queries

```bash
# List all available labels
logcli labels

# List all values for a label
logcli labels job

# Stream logs from a specific job label
logcli query '{job="nginx"}'

# Query with a time range (last 1 hour)
logcli query '{job="nginx"}' --since=1h

# Query with explicit time range
logcli query '{job="nginx"}' \
  --from="2026-03-02T10:00:00Z" \
  --to="2026-03-02T11:00:00Z"

# Filter logs containing a string
logcli query '{job="nginx"} |= "error"'

# Filter with regex
logcli query '{job="nginx"} |~ "5[0-9][0-9]"'

# Exclude lines matching a pattern
logcli query '{job="nginx"} != "healthcheck"'
```

## LogQL Metric Queries

LogQL can compute metrics from log streams - this is what alert rules use:

```bash
# Count all error log lines in the last 5 minutes
logcli query 'count_over_time({job="myapp"} |= "ERROR" [5m])'

# Rate of 500 errors per second
logcli query 'rate({job="nginx"} |~ "HTTP/1.1\" 5" [5m])'

# Count distinct error messages
logcli query 'count by (error) (rate({job="myapp"} |= "ERROR" [5m]))'

# Parse and extract fields from log lines
logcli query '{job="myapp"} | json | status_code >= 500'
```

## Setting Up Alert Rules

Loki alert rules use the same format as Prometheus alerting rules. Create a rules directory and file:

```bash
sudo mkdir -p /var/lib/loki/rules/fake
sudo nano /var/lib/loki/rules/fake/alerts.yaml
```

```yaml
groups:
  - name: application-alerts
    rules:

      # Alert when error rate exceeds threshold
      - alert: HighErrorRate
        expr: |
          sum(rate({job="myapp"} |= "ERROR" [5m])) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in {{ $labels.job }}"
          description: "Error rate is {{ $value }} errors/second"

      # Alert on specific error messages
      - alert: DatabaseConnectionFailed
        expr: |
          count_over_time({job="myapp"} |= "Failed to connect to database" [5m]) > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failures detected"
          description: "{{ $value }} database connection failures in the last 5 minutes"

      # Alert when no logs are received (log stream went silent)
      - alert: LogStreamSilent
        expr: |
          sum(count_over_time({job="myapp"}[10m])) < 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "No logs received from {{ $labels.job }}"
          description: "Log stream has been silent for 10 minutes - service may be down"

      # Alert on high 5xx rate in Nginx
      - alert: NginxHigh5xxRate
        expr: |
          sum(rate({job="nginx"} |~ "\" 5[0-9][0-9] " [5m])) by (host) > 1
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate on {{ $labels.host }}"
          description: "{{ $value }} 5xx responses/second"
```

## Setting Up Alertmanager

Install and configure Alertmanager for alert routing:

```bash
# Install Alertmanager
ALERTMANAGER_VERSION=0.27.0
curl -Lo alertmanager.tar.gz \
  "https://github.com/prometheus/alertmanager/releases/download/v${ALERTMANAGER_VERSION}/alertmanager-${ALERTMANAGER_VERSION}.linux-amd64.tar.gz"
tar xzf alertmanager.tar.gz
sudo mv alertmanager-${ALERTMANAGER_VERSION}.linux-amd64/alertmanager /usr/local/bin/
```

Configure Alertmanager:

```yaml
# /etc/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  group_by: ['alertname', 'job']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-notifications'

  # Route critical alerts to PagerDuty
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        title: 'Alert: {{ .CommonLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

Start Alertmanager:

```bash
sudo nano /etc/systemd/system/alertmanager.service
```

```ini
[Unit]
Description=Alertmanager
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/var/lib/alertmanager
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable alertmanager
sudo systemctl start alertmanager
```

## Querying Active Alerts via LogCLI

```bash
# List currently firing rules
logcli rules

# Show alert status
logcli alerts

# Query rules for a specific namespace
logcli rules --namespace=fake
```

## Using LogCLI for Live Log Tailing

```bash
# Tail logs matching a query (like tail -f)
logcli query '{job="nginx"}' --tail

# Tail with filtering
logcli query '{job="nginx"} |= "error"' --tail

# Tail with output formatting
logcli query '{job="myapp"}' --tail --output=jsonl
```

## Sending Logs to Loki with Promtail

For the alert rules to work, logs need to be ingested. Install Promtail to ship local logs:

```bash
LOKI_VERSION=$(logcli --version 2>&1 | awk '{print $3}')
curl -Lo promtail.gz \
  "https://github.com/grafana/loki/releases/download/${LOKI_VERSION}/promtail-linux-amd64.zip"
unzip promtail.gz
sudo mv promtail-linux-amd64 /usr/local/bin/promtail
```

Configure Promtail:

```yaml
# /etc/promtail/config.yaml
server:
  http_listen_port: 9080

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: nginx
    static_configs:
      - targets: [localhost]
        labels:
          job: nginx
          __path__: /var/log/nginx/access.log

  - job_name: system
    static_configs:
      - targets: [localhost]
        labels:
          job: syslog
          __path__: /var/log/syslog
```

## Testing Alert Rules

Manually trigger a condition to test alerting:

```bash
# Generate error logs (for testing)
for i in $(seq 1 20); do
  logger -t myapp "ERROR: Failed to connect to database (test)"
done

# Wait for the alert evaluation interval, then check
logcli alerts
# Should show HighErrorRate or DatabaseConnectionFailed in FIRING state
```

## Troubleshooting

**LogCLI returns "no results":**
```bash
# Verify Loki is receiving logs
logcli labels
# If this returns nothing, no logs have been ingested

# Check Loki is healthy
curl http://localhost:3100/ready
```

**Alert rules not firing:**
```bash
# Check Loki ruler is processing rules
curl http://localhost:3100/loki/api/v1/rules

# Verify rule syntax
logcli rules

# Check Loki logs for ruler errors
docker logs loki --tail 50 2>&1 | grep -i ruler
```

**Alertmanager not receiving alerts:**
```bash
# Check Alertmanager is running
curl http://localhost:9093/-/healthy

# Verify Loki's alertmanager_url config matches
grep alertmanager_url /etc/loki/loki-config.yaml
```

Log-based alerting catches a different class of issues than metric-based alerting - specific error messages, unexpected patterns, and silence detection. Combined with metrics from Prometheus, it gives a complete picture of system health without requiring code changes to emit specific metrics for every error condition.
