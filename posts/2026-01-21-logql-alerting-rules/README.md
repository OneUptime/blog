# How to Build Alerting Rules with LogQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, LogQL, Alerting, Loki Ruler, Alertmanager, Observability

Description: A comprehensive guide to building alerting rules with LogQL in Grafana Loki, covering ruler configuration, alert rule syntax, recording rules, and Alertmanager integration.

---

Loki's ruler component enables you to create alerting and recording rules based on LogQL queries. This allows proactive monitoring of log patterns, error rates, and anomalies without constantly watching dashboards. This guide covers configuring the ruler, writing effective alert rules, and integrating with Alertmanager.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki instance with ruler enabled
- Alertmanager instance (optional but recommended)
- Understanding of LogQL queries
- Familiarity with Prometheus alerting concepts

## Understanding Loki Ruler

The Loki ruler evaluates LogQL expressions at regular intervals and:

- **Alerting Rules**: Fire alerts when conditions are met
- **Recording Rules**: Compute and store frequently used queries as metrics

## Enabling the Ruler

### Loki Configuration

```yaml
ruler:
  storage:
    type: local
    local:
      directory: /loki/rules
  rule_path: /tmp/loki/rules
  alertmanager_url: http://alertmanager:9093
  ring:
    kvstore:
      store: inmemory
  enable_api: true
  enable_alertmanager_v2: true
  wal:
    dir: /loki/ruler-wal
  remote_write:
    enabled: true
    client:
      url: http://prometheus:9090/api/v1/write
```

### S3-Based Rule Storage

```yaml
ruler:
  storage:
    type: s3
    s3:
      bucketnames: loki-ruler
      endpoint: s3.amazonaws.com
      region: us-east-1
      access_key_id: ${AWS_ACCESS_KEY_ID}
      secret_access_key: ${AWS_SECRET_ACCESS_KEY}
  alertmanager_url: http://alertmanager:9093
  enable_api: true
```

### Kubernetes ConfigMap Storage

```yaml
ruler:
  storage:
    type: configdb
  enable_api: true
  alertmanager_url: http://alertmanager:9093
```

## Alert Rule Syntax

Alert rules use the same format as Prometheus:

```yaml
groups:
  - name: <group_name>
    interval: <evaluation_interval>
    rules:
      - alert: <alert_name>
        expr: <logql_expression>
        for: <pending_duration>
        labels:
          <label_name>: <label_value>
        annotations:
          <annotation_name>: <annotation_value>
```

## Creating Alert Rules

### File Structure

Create rules in `/loki/rules/<tenant_id>/`:

```
/loki/rules/
  fake/
    alerts.yaml
    recording.yaml
  production/
    error-alerts.yaml
    latency-alerts.yaml
```

### Basic Error Alert

```yaml
# /loki/rules/fake/error-alerts.yaml
groups:
  - name: error-alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({namespace="production"} |= "error" [5m])) > 10
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | printf \"%.2f\" }} errors/sec in production"
```

### HTTP Status Code Alerts

```yaml
groups:
  - name: http-alerts
    interval: 1m
    rules:
      - alert: High5xxErrorRate
        expr: |
          (
            sum(rate({namespace="production", app="api"} | json | status_code >= 500 [5m]))
            /
            sum(rate({namespace="production", app="api"} | json [5m]))
          ) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate"
          description: "5xx error rate is {{ $value | printf \"%.2f%%\" }}"

      - alert: High4xxErrorRate
        expr: |
          (
            sum(rate({namespace="production", app="api"} | json | status_code >= 400 | status_code < 500 [5m]))
            /
            sum(rate({namespace="production", app="api"} | json [5m]))
          ) > 0.05
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High 4xx error rate"
          description: "4xx error rate is {{ $value | printf \"%.2f%%\" }}"
```

### Latency Alerts

```yaml
groups:
  - name: latency-alerts
    interval: 1m
    rules:
      - alert: HighP99Latency
        expr: |
          quantile_over_time(0.99,
            {namespace="production", app="api"}
            | json
            | unwrap duration_ms
            [5m]
          ) > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High P99 latency"
          description: "P99 latency is {{ $value | printf \"%.0f\" }}ms"

      - alert: HighP50Latency
        expr: |
          quantile_over_time(0.5,
            {namespace="production", app="api"}
            | json
            | unwrap duration_ms
            [5m]
          ) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High median latency"
          description: "Median latency is {{ $value | printf \"%.0f\" }}ms"
```

### Service Health Alerts

```yaml
groups:
  - name: service-health
    interval: 1m
    rules:
      - alert: NoLogsFromService
        expr: |
          absent_over_time({namespace="production", app="payment-service"}[10m])
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No logs from payment-service"
          description: "Payment service has not produced logs for 10 minutes"

      - alert: ServiceRestarting
        expr: |
          count_over_time({namespace="production"} |= "Starting application" [5m]) > 3
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Service is restarting frequently"
          description: "Detected {{ $value }} restarts in the last 5 minutes"
```

### Security Alerts

```yaml
groups:
  - name: security-alerts
    interval: 30s
    rules:
      - alert: FailedLoginSpike
        expr: |
          sum(rate({namespace="production"} | json | event="login_failed" [5m])) > 10
        for: 2m
        labels:
          severity: critical
          team: security
        annotations:
          summary: "Spike in failed login attempts"
          description: "{{ $value | printf \"%.0f\" }} failed logins per second"

      - alert: UnauthorizedAccess
        expr: |
          sum(rate({namespace="production"} | json | status_code=401 [5m])) > 50
        for: 5m
        labels:
          severity: warning
          team: security
        annotations:
          summary: "High rate of unauthorized access attempts"
          description: "{{ $value | printf \"%.0f\" }} 401 responses per second"

      - alert: SuspiciousActivity
        expr: |
          count_over_time({namespace="production"} |~ "SQL injection|XSS|<script>|UNION SELECT" [5m]) > 0
        for: 0m
        labels:
          severity: critical
          team: security
        annotations:
          summary: "Potential security attack detected"
          description: "Suspicious patterns found in logs"
```

### Infrastructure Alerts

```yaml
groups:
  - name: infrastructure-alerts
    interval: 1m
    rules:
      - alert: OOMKillDetected
        expr: |
          count_over_time({namespace="production"} |= "OOMKilled" [5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "OOM kill detected"
          description: "Container was killed due to out of memory"

      - alert: DiskSpaceWarning
        expr: |
          count_over_time({job="system"} |~ "No space left|disk full" [5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Disk space issue detected"
          description: "Disk space warning found in logs"

      - alert: ConnectionPoolExhausted
        expr: |
          sum(rate({namespace="production"} |~ "connection pool exhausted|no available connections" [5m])) > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Connection pool exhausted"
          description: "Database connection pool is exhausted"
```

### Log Volume Alerts

```yaml
groups:
  - name: log-volume-alerts
    interval: 5m
    rules:
      - alert: HighLogVolume
        expr: |
          sum by (app) (bytes_rate({namespace="production"}[5m])) > 10485760
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High log volume from {{ $labels.app }}"
          description: "Log volume is {{ $value | humanizeBytes }}/s"

      - alert: LogVolumeSpike
        expr: |
          (
            sum(rate({namespace="production"}[5m]))
            /
            sum(rate({namespace="production"}[5m] offset 1h))
          ) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Log volume spike detected"
          description: "Log volume is {{ $value | printf \"%.1f\" }}x higher than 1 hour ago"
```

## Recording Rules

Pre-compute frequently used queries:

```yaml
groups:
  - name: recording-rules
    interval: 1m
    rules:
      - record: job:loki_request_rate:5m
        expr: |
          sum by (app) (rate({namespace="production"}[5m]))

      - record: job:loki_error_rate:5m
        expr: |
          sum by (app) (rate({namespace="production"} |= "error" [5m]))

      - record: job:loki_error_ratio:5m
        expr: |
          sum by (app) (rate({namespace="production"} |= "error" [5m]))
          /
          sum by (app) (rate({namespace="production"}[5m]))

      - record: job:loki_p99_latency:5m
        expr: |
          quantile_over_time(0.99,
            {namespace="production"}
            | json
            | unwrap duration
            [5m]
          ) by (app)
```

## Managing Rules via API

### List Rules

```bash
curl http://loki:3100/loki/api/v1/rules
```

### Get Rules for Tenant

```bash
curl -H "X-Scope-OrgID: production" http://loki:3100/loki/api/v1/rules
```

### Create/Update Rules

```bash
curl -X POST http://loki:3100/loki/api/v1/rules/production \
  -H "Content-Type: application/yaml" \
  -d '
groups:
  - name: test-alerts
    rules:
      - alert: TestAlert
        expr: sum(rate({namespace="production"}[5m])) > 0
        for: 1m
        labels:
          severity: info
        annotations:
          summary: "Test alert"
'
```

### Delete Rules

```bash
curl -X DELETE http://loki:3100/loki/api/v1/rules/production/test-alerts
```

## Alertmanager Integration

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    - match:
        team: security
      receiver: 'security-team'

receivers:
  - name: 'default'
    email_configs:
      - to: 'oncall@example.com'
        send_resolved: true

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
        severity: critical

  - name: 'security-team'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#security-alerts'
        send_resolved: true
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#alerts'
        send_resolved: true
```

### Alert Templates

```yaml
annotations:
  summary: "{{ $labels.app }}: {{ $labels.alertname }}"
  description: |
    Alert: {{ $labels.alertname }}
    Severity: {{ $labels.severity }}
    Service: {{ $labels.app }}
    Namespace: {{ $labels.namespace }}
    Value: {{ $value | printf "%.2f" }}
    Time: {{ now | date "2006-01-02 15:04:05" }}
  runbook_url: "https://runbooks.example.com/{{ $labels.alertname }}"
  dashboard_url: |
    https://grafana.example.com/d/loki-logs?var-namespace={{ $labels.namespace }}&var-app={{ $labels.app }}
```

## Kubernetes Deployment

### Ruler ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-ruler-rules
  namespace: loki
data:
  error-alerts.yaml: |
    groups:
      - name: error-alerts
        rules:
          - alert: HighErrorRate
            expr: sum(rate({namespace="production"} |= "error" [5m])) > 10
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "High error rate detected"

  latency-alerts.yaml: |
    groups:
      - name: latency-alerts
        rules:
          - alert: HighP99Latency
            expr: |
              quantile_over_time(0.99,
                {namespace="production"} | json | unwrap duration_ms [5m]
              ) > 5000
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High P99 latency"
```

### Mount ConfigMap

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki
spec:
  template:
    spec:
      containers:
        - name: loki
          volumeMounts:
            - name: rules
              mountPath: /loki/rules/fake
      volumes:
        - name: rules
          configMap:
            name: loki-ruler-rules
```

## Testing Alert Rules

### Using logcli

```bash
# Test query
logcli query 'sum(rate({namespace="production"} |= "error" [5m]))'

# Check alert would fire
logcli query 'sum(rate({namespace="production"} |= "error" [5m])) > 10'
```

### Using Grafana

1. Go to Explore
2. Run your LogQL query
3. Verify it returns expected results
4. Check the alert rule would fire

## Best Practices

### Alert Naming

- Use descriptive names: `HighErrorRate` not `Alert1`
- Include service name if specific: `PaymentServiceHighLatency`
- Be consistent with naming conventions

### Severity Levels

```yaml
# Critical - Immediate action required
severity: critical

# Warning - Needs attention soon
severity: warning

# Info - For awareness
severity: info
```

### Alert Fatigue Prevention

- Set appropriate `for` durations
- Use rate-based queries to smooth spikes
- Group related alerts
- Set appropriate repeat intervals in Alertmanager

### Testing

- Test queries in Grafana Explore first
- Use `for: 0m` during testing, then adjust
- Monitor Alertmanager for firing alerts
- Review and tune thresholds regularly

## Conclusion

LogQL alerting rules enable proactive monitoring of log patterns and anomalies. Key takeaways:

- Enable and configure the Loki ruler component
- Write alert rules using LogQL metric queries
- Use recording rules for frequently computed metrics
- Integrate with Alertmanager for notification routing
- Test alert queries before deployment
- Follow best practices to prevent alert fatigue

With proper alerting rules, you can catch issues in your logs before they become incidents.
