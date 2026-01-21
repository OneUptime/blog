# How to Integrate Loki with Alertmanager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Alertmanager, Alerting, LogQL, Observability, Incident Management

Description: A comprehensive guide to integrating Grafana Loki with Alertmanager for log-based alerting, covering ruler configuration, alert rules, grouping strategies, and high availability setups.

---

Grafana Loki includes a ruler component that evaluates LogQL queries and sends alerts to Alertmanager when conditions are met. This integration enables powerful log-based alerting that complements traditional metric-based alerts. This guide covers everything you need to know about setting up and managing the Loki-Alertmanager integration.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki 2.4 or later
- Alertmanager 0.24 or later
- Basic understanding of LogQL queries
- Familiarity with Prometheus alerting concepts

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Loki Cluster                              │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Distributor │───▶│   Ingester   │───▶│    Querier   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                  │                │
│                      ┌──────────────┐            │                │
│                      │    Ruler     │────────────┘                │
│                      │              │   Evaluates                 │
│                      │  - Rules     │   LogQL Queries             │
│                      │  - Alerts    │                             │
│                      └──────┬───────┘                             │
│                             │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │ Sends Alerts
                              ▼
                    ┌──────────────────┐
                    │   Alertmanager   │
                    │                  │
                    │  - Deduplication │
                    │  - Grouping      │
                    │  - Routing       │
                    │  - Silencing     │
                    │  - Notifications │
                    └──────────────────┘
```

## Deploying the Stack

### Docker Compose Setup

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.4
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - ./rules:/loki/rules
      - loki-data:/loki
    command: -config.file=/etc/loki/config.yaml
    networks:
      - loki-alerting

  alertmanager:
    image: prom/alertmanager:v0.26.0
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yaml:/etc/alertmanager/alertmanager.yaml
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yaml'
      - '--storage.path=/alertmanager'
      - '--cluster.advertise-address=0.0.0.0:9093'
    networks:
      - loki-alerting

  grafana:
    image: grafana/grafana:10.3.1
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_UNIFIED_ALERTING_ENABLED=true
    volumes:
      - ./grafana-provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana
    networks:
      - loki-alerting
    depends_on:
      - loki
      - alertmanager

networks:
  loki-alerting:
    driver: bridge

volumes:
  loki-data:
  alertmanager-data:
  grafana-data:
```

### Loki Configuration with Ruler

Create `loki-config.yaml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  max_query_length: 721h
  max_query_parallelism: 32

# Ruler configuration
ruler:
  storage:
    type: local
    local:
      directory: /loki/rules
  rule_path: /tmp/rules
  alertmanager_url: http://alertmanager:9093
  ring:
    kvstore:
      store: inmemory
  enable_api: true
  enable_alertmanager_v2: true
  evaluation_interval: 1m
  poll_interval: 1m
  # Send resolved notifications
  alertmanager_client:
    basic_auth_username: ""
    basic_auth_password: ""
    tls_config:
      insecure_skip_verify: false
  # External URL for alert links
  external_url: http://grafana:3000
  # Remote write for recording rules (optional)
  # remote_write:
  #   enabled: true
  #   client:
  #     url: http://prometheus:9090/api/v1/write

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100
```

### Alertmanager Configuration

Create `alertmanager.yaml`:

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'

route:
  group_by: ['alertname', 'severity', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'critical-receiver'
      group_wait: 10s
      repeat_interval: 1h
      continue: true

    - match:
        severity: warning
      receiver: 'warning-receiver'
      repeat_interval: 4h

    - match_re:
        service: (payment|order).*
      receiver: 'business-critical-receiver'
      group_by: ['alertname', 'service']

receivers:
  - name: 'default-receiver'
    webhook_configs:
      - url: 'http://webhook-receiver:5001/webhook'
        send_resolved: true

  - name: 'critical-receiver'
    webhook_configs:
      - url: 'http://webhook-receiver:5001/critical'
        send_resolved: true
    email_configs:
      - to: 'oncall@example.com'
        send_resolved: true

  - name: 'warning-receiver'
    webhook_configs:
      - url: 'http://webhook-receiver:5001/warning'

  - name: 'business-critical-receiver'
    webhook_configs:
      - url: 'http://webhook-receiver:5001/business'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']

  - source_match:
      alertname: 'ServiceDown'
    target_match_re:
      alertname: '.+'
    equal: ['service']
```

## Creating Alert Rules

### Rule File Structure

Create `rules/application-alerts.yaml`:

```yaml
groups:
  - name: application-error-alerts
    interval: 1m
    limit: 10
    rules:
      # High Error Rate Alert
      - alert: HighErrorRate
        expr: |
          sum(rate({job="application"} |= "error" [5m])) by (service)
          /
          sum(rate({job="application"} [5m])) by (service)
          > 0.05
        for: 5m
        labels:
          severity: critical
          category: reliability
        annotations:
          summary: "High error rate in {{ $labels.service }}"
          description: |
            Error rate is {{ $value | humanizePercentage }} for service {{ $labels.service }}.
            This exceeds the 5% threshold.
          runbook_url: "https://wiki.example.com/runbooks/high-error-rate"
          dashboard_url: "http://grafana:3000/d/errors/error-dashboard?var-service={{ $labels.service }}"

      # Error Count Alert
      - alert: ErrorCountHigh
        expr: |
          sum by (service) (
            count_over_time({job="application"} |= "error" [5m])
          ) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error count in {{ $labels.service }}"
          description: "{{ $value }} errors in the last 5 minutes for {{ $labels.service }}"

      # No Logs Alert
      - alert: NoLogsReceived
        expr: |
          absent_over_time({job="application", service=~".+"} [10m])
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "No logs received from applications"
          description: "No log data has been ingested for 10 minutes"

  - name: security-alerts
    interval: 30s
    rules:
      # Authentication Failures
      - alert: AuthenticationFailureSpike
        expr: |
          sum(rate({job="auth-service"} |= "authentication failed" [5m])) > 1
        for: 2m
        labels:
          severity: warning
          category: security
        annotations:
          summary: "Authentication failure rate elevated"
          description: "Authentication failures are occurring at {{ $value }} per second"

      # Suspicious Log Patterns
      - alert: SuspiciousActivity
        expr: |
          count_over_time(
            {job=~".+"} |~ "(?i)(sql injection|xss|unauthorized|forbidden|hack)" [5m]
          ) > 0
        for: 0m
        labels:
          severity: critical
          category: security
        annotations:
          summary: "Suspicious activity detected in logs"
          description: "Potential security incident - suspicious patterns found in application logs"

  - name: infrastructure-alerts
    interval: 1m
    rules:
      # Disk Space from Logs
      - alert: DiskSpaceError
        expr: |
          count_over_time({job="syslog"} |= "No space left on device" [5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Disk space exhausted"
          description: "A system reported disk space issues in logs"

      # OOM Errors
      - alert: OutOfMemoryError
        expr: |
          count_over_time(
            {job=~".+"} |~ "(?i)(OutOfMemory|OOM|killed process|memory allocation failed)" [5m]
          ) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Out of memory error detected"
          description: "An application or system reported memory exhaustion"

      # Connection Errors
      - alert: ConnectionErrors
        expr: |
          sum by (service) (
            rate({job="application"} |~ "(?i)(connection refused|connection reset|timeout)" [5m])
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Connection errors in {{ $labels.service }}"
          description: "{{ $labels.service }} is experiencing connection issues"
```

### Recording Rules for Metrics

Create `rules/recording-rules.yaml`:

```yaml
groups:
  - name: log-metrics
    interval: 1m
    rules:
      # Error rate by service
      - record: log:errors:rate5m
        expr: |
          sum by (service) (
            rate({job="application"} |= "error" [5m])
          )

      # Request count by service
      - record: log:requests:rate5m
        expr: |
          sum by (service) (
            rate({job="application"} | json | __error__="" [5m])
          )

      # Error percentage
      - record: log:error_percentage:5m
        expr: |
          log:errors:rate5m / log:requests:rate5m * 100

      # Log volume by service
      - record: log:volume:rate1m
        expr: |
          sum by (service) (
            rate({job="application"} [1m])
          )

      # 95th percentile latency from logs
      - record: log:latency:p95_5m
        expr: |
          quantile_over_time(0.95,
            {job="application"}
            | json
            | unwrap duration [5m]
          ) by (service)
```

## Managing Rules via API

### List All Rules

```bash
curl -s http://localhost:3100/loki/api/v1/rules | jq
```

### Get Rules for Specific Namespace

```bash
curl -s http://localhost:3100/loki/api/v1/rules/application-alerts | jq
```

### Create or Update Rules

```bash
curl -X POST http://localhost:3100/loki/api/v1/rules/my-namespace \
  -H "Content-Type: application/yaml" \
  -d '
groups:
  - name: test-rules
    rules:
      - alert: TestAlert
        expr: count_over_time({job="test"} [5m]) > 0
        labels:
          severity: info
        annotations:
          summary: "Test alert"
'
```

### Delete Rules

```bash
curl -X DELETE http://localhost:3100/loki/api/v1/rules/my-namespace/test-rules
```

### Reload Rules

```bash
curl -X POST http://localhost:3100/ruler/ring/flush
```

## Alert Grouping Strategies

### Group by Alertname and Severity

```yaml
route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
```

### Group by Service

```yaml
route:
  group_by: ['alertname', 'service']
  routes:
    - match:
        category: business
      group_by: ['service']
      receiver: 'business-team'
```

### No Grouping for Critical Alerts

```yaml
route:
  routes:
    - match:
        severity: critical
      group_by: ['...']  # Disable grouping
      group_wait: 0s
      receiver: 'critical-alerts'
```

## High Availability Setup

### Loki Ruler HA Configuration

```yaml
# loki-config.yaml for HA
ruler:
  storage:
    type: s3
    s3:
      bucketnames: loki-rules
      endpoint: s3.amazonaws.com
      region: us-east-1
      access_key_id: ${AWS_ACCESS_KEY_ID}
      secret_access_key: ${AWS_SECRET_ACCESS_KEY}
  ring:
    kvstore:
      store: consul
      consul:
        host: consul:8500
    heartbeat_period: 5s
    heartbeat_timeout: 15s
  alertmanager_url: http://alertmanager-1:9093,http://alertmanager-2:9093
  enable_alertmanager_discovery: true
  alertmanager_discovery_refresh_interval: 60s
```

### Alertmanager Cluster Configuration

```yaml
# alertmanager.yaml for cluster
global:
  resolve_timeout: 5m

# Cluster configuration
cluster:
  peer:
    advertise_address: "{{ HOST_IP }}:9094"
  peers:
    - alertmanager-1:9094
    - alertmanager-2:9094
    - alertmanager-3:9094
```

Start Alertmanager with clustering:

```bash
alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yaml \
  --cluster.listen-address=0.0.0.0:9094 \
  --cluster.peer=alertmanager-1:9094 \
  --cluster.peer=alertmanager-2:9094
```

## Grafana Integration

### Provision Alertmanager Data Source

Create `grafana-provisioning/datasources/alertmanager.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Alertmanager
    type: alertmanager
    access: proxy
    url: http://alertmanager:9093
    jsonData:
      implementation: prometheus
      handleGrafanaManagedAlerts: false
```

### View Alerts in Grafana

1. Navigate to Alerting in Grafana sidebar
2. Select "Alert rules" to view Loki-defined alerts
3. Use "Alert groups" to see active alerts
4. Configure "Contact points" for Grafana-managed alerts

## Troubleshooting

### Check Ruler Status

```bash
# Ruler ring status
curl -s http://localhost:3100/ruler/ring | jq

# Ruler metrics
curl -s http://localhost:3100/metrics | grep loki_ruler
```

### Verify Alert Rules Are Loaded

```bash
# List all loaded rules
curl -s http://localhost:3100/loki/api/v1/rules | jq '.data.groups[].rules[].alert'

# Check for rule errors
curl -s http://localhost:3100/loki/api/v1/rules | jq '.data.groups[].rules[] | select(.health != "ok")'
```

### Check Alertmanager Connectivity

```bash
# Test from Loki container
docker exec loki wget -q -O- http://alertmanager:9093/api/v2/status | jq

# Check Alertmanager alerts
curl -s http://localhost:9093/api/v2/alerts | jq
```

### Common Issues and Solutions

**Rules not being evaluated:**
```bash
# Check ruler logs
docker logs loki 2>&1 | grep -i ruler

# Verify rule file syntax
promtool check rules rules/*.yaml
```

**Alerts not reaching Alertmanager:**
```bash
# Check Loki ruler metrics
curl -s http://localhost:3100/metrics | grep alertmanager

# Look for send errors
curl -s http://localhost:3100/metrics | grep loki_ruler_notifications_failed_total
```

**Duplicate alerts:**
```yaml
# Ensure proper grouping
route:
  group_by: ['alertname', 'instance']
  group_wait: 30s  # Wait before sending first notification
```

## Best Practices

1. **Rule Organization**: Group related alerts in the same file
2. **Meaningful Names**: Use descriptive alert names that indicate the issue
3. **Severity Levels**: Use consistent severity labels (critical, warning, info)
4. **For Duration**: Set appropriate `for` duration to avoid flapping
5. **Annotations**: Include summary, description, and runbook URLs
6. **Testing**: Test alert rules in a staging environment first
7. **Documentation**: Document what each alert means and how to respond
8. **Review Regularly**: Periodically review and tune alert thresholds

## Monitoring the Alerting System

### Key Metrics

```promql
# Alert rule evaluations
rate(loki_ruler_eval_total[5m])

# Alert rule evaluation failures
rate(loki_ruler_eval_failures_total[5m])

# Alerts sent to Alertmanager
rate(loki_ruler_notifications_total[5m])

# Failed alert notifications
rate(loki_ruler_notifications_failed_total[5m])

# Alert rule evaluation duration
histogram_quantile(0.99, rate(loki_ruler_eval_duration_seconds_bucket[5m]))
```

## Conclusion

Integrating Loki with Alertmanager enables powerful log-based alerting that catches issues that metrics alone might miss. By properly configuring the ruler component, creating meaningful alert rules, and setting up appropriate routing in Alertmanager, you can build a comprehensive alerting system that improves your incident response capabilities.

Key takeaways:
- Enable the ruler component in Loki for alert evaluation
- Create alert rules using LogQL metric queries
- Configure Alertmanager for routing, grouping, and notification
- Use recording rules to create metrics from logs
- Set up high availability for production deployments
- Monitor the alerting system itself for reliability
- Follow best practices for maintainable alert rules
