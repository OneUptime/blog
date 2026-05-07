# How to Configure Alertmanager with Prometheus via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Prometheus, Alertmanager, Monitoring, Alert, Self-Hosted

Description: Configure Alertmanager alongside Prometheus in a Portainer stack to route, group, and deliver alerts via Slack, email, and PagerDuty.

## Introduction

Prometheus handles metric collection and alert rule evaluation, while Alertmanager handles alert routing, grouping, inhibition, and notification delivery. Together they form a robust alerting pipeline. This guide shows how to deploy and configure both using Portainer with Docker Swarm configs.

## Prerequisites

- Portainer connected to a Docker Swarm environment
- Basic understanding of Prometheus alerting concepts
- Slack webhook URL (for the notification example)

## Deploying Prometheus with Alertmanager

### Step 1: Create Docker Configs

In Portainer, open a Docker Swarm environment and navigate to **Configs**. Create the following configs:

**Config name: `prometheus_config`**

```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Point Prometheus to Alertmanager
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load alert rules
rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

**Config name: `alert_rules`**

```yaml
# alert_rules.yml
groups:
  - name: node_alerts
    interval: 30s
    rules:
      # Alert when a target is down
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute."

      # Alert on high CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 85% for more than 5 minutes."

      # Alert on low disk space
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Disk {{ $labels.mountpoint }} has less than 10% free space."

      # Alert on high memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
```

**Config name: `alertmanager_config`**

```yaml
# alertmanager.yml
global:
  # SMTP settings for email alerts
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: 'your_smtp_password'
  smtp_require_tls: true

# Define routing tree
route:
  # Default receiver
  receiver: 'slack-notifications'
  group_by: ['alertname', 'job']
  group_wait: 30s       # Wait before sending first notification
  group_interval: 5m    # Wait before sending updates
  repeat_interval: 4h   # Resend if still firing

  routes:
    # Critical alerts go to PagerDuty first
    - matchers:
        - severity="critical"
      receiver: pagerduty
      continue: true  # Continue evaluating later routes

    # Critical alerts also go to email
    - matchers:
        - severity="critical"
      receiver: email
      continue: true

    # Warning and critical alerts go to Slack
    - matchers:
        - severity=~"warning|critical"
      receiver: slack-notifications

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        send_resolved: true
        title: '{{ template "slack.default.title" . }}'
        text: '{{ template "slack.default.text" . }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: 'your_pagerduty_integration_key'
        send_resolved: true

  - name: 'email'
    email_configs:
      - to: 'oncall@example.com'
        send_resolved: true

# Inhibition rules - suppress lower severity if higher is firing
inhibit_rules:
  - source_matchers:
      - severity="critical"
    target_matchers:
      - severity="warning"
    equal: ['alertname', 'instance']
```

### Step 2: Create the Stack

Navigate to **Stacks > Add stack**, name it `prometheus-alertmanager`:

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'   # Allow config reload via API
    volumes:
      - prometheus_data:/prometheus
    configs:
      - source: prometheus_config
        target: /etc/prometheus/prometheus.yml
      - source: alert_rules
        target: /etc/prometheus/rules/alert_rules.yml
    ports:
      - "9090:9090"
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    volumes:
      - alertmanager_data:/alertmanager
    configs:
      - source: alertmanager_config
        target: /etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/host'
    volumes:
      - /:/host:ro,rslave
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    restart: unless-stopped

volumes:
  prometheus_data:
  alertmanager_data:

configs:
  prometheus_config:
    external: true
  alert_rules:
    external: true
  alertmanager_config:
    external: true
```

### Step 3: Update Configuration

Docker Swarm configs are immutable. When you need to change `prometheus.yml`, alert rules, or `alertmanager.yml`, create new versioned configs in Portainer and redeploy the stack so the services mount the new config objects.

The `/-/reload` endpoints are useful when a configuration file changes in place, such as with a bind mount, but they do not replace a stack update when you are using Docker configs.

### Step 4: Test Alerts

Use Alertmanager's API to send a test alert:

```bash
curl -XPOST http://localhost:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "instance": "test-host"
    },
    "annotations": {
      "summary": "This is a test alert"
    }
  }]'
```

## Conclusion

Prometheus and Alertmanager deployed together via Portainer provide a powerful, flexible alerting pipeline. Docker Swarm configs make it easy to manage configuration as code. With inhibition rules and routing trees, you can fine-tune exactly who gets notified about what and when.
