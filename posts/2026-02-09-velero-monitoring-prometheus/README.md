# How to Implement Velero Backup Monitoring and Alerting Using Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Monitoring, Prometheus, Observability

Description: Learn how to implement comprehensive Velero backup monitoring and alerting using Prometheus metrics, ensuring your disaster recovery strategy remains healthy and reliable through proactive monitoring.

---

Backups are useless if they fail silently. Your disaster recovery strategy depends on knowing when backups succeed, when they fail, and when backup infrastructure experiences issues. Velero exposes Prometheus metrics that enable comprehensive monitoring and alerting for your backup operations.

## Understanding Velero Metrics

Velero exposes metrics on port 8085 at the /metrics endpoint. These metrics cover backup operations, restore operations, storage locations, and overall Velero health.

Key metric categories include:

- Backup success and failure counts
- Backup duration and size
- Restore success and failure counts
- Storage location availability
- Volume snapshot operations

## Enabling Prometheus Metrics

Velero enables metrics by default, but you need to configure Prometheus to scrape them. First, verify metrics are exposed:

```bash
# Port-forward to Velero metrics endpoint
kubectl port-forward -n velero deployment/velero 8085:8085

# Check metrics in another terminal
curl http://localhost:8085/metrics
```

You should see metrics like `velero_backup_total`, `velero_restore_total`, and others.

## Configuring Prometheus Scraping

Add Velero to your Prometheus scrape configuration. If using the Prometheus Operator, create a ServiceMonitor:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: velero-metrics
  namespace: velero
  labels:
    app: velero
spec:
  ports:
  - name: metrics
    port: 8085
    targetPort: 8085
  selector:
    app: velero
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: velero
  namespace: velero
  labels:
    app: velero
spec:
  selector:
    matchLabels:
      app: velero
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

For standard Prometheus, add a scrape config:

```yaml
scrape_configs:
  - job_name: 'velero'
    kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
        - velero
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_label_app]
      action: keep
      regex: velero
    - source_labels: [__meta_kubernetes_pod_container_port_number]
      action: keep
      regex: 8085
```

## Key Metrics to Monitor

Track these critical metrics for comprehensive backup monitoring:

```promql
# Total successful backups
velero_backup_success_total

# Total failed backups
velero_backup_failure_total

# Backup duration in seconds
velero_backup_duration_seconds

# Current number of backups
velero_backup_total

# Backup deletion operations
velero_backup_deletion_success_total
velero_backup_deletion_failure_total

# Restore operations
velero_restore_success_total
velero_restore_failed_total

# Volume snapshot operations
velero_volume_snapshot_success_total
velero_volume_snapshot_failure_total

# Storage location availability
velero_backup_storage_location_available
```

## Creating Backup Success Rate Alerts

Monitor backup success rate to catch systematic failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-backup-alerts
  namespace: velero
  labels:
    prometheus: kube-prometheus
spec:
  groups:
  - name: velero.backups
    interval: 30s
    rules:
    - alert: VeleroBackupFailureRate
      expr: |
        (
          rate(velero_backup_failure_total[1h])
          /
          (rate(velero_backup_success_total[1h]) + rate(velero_backup_failure_total[1h]))
        ) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High Velero backup failure rate"
        description: "{{ $value | humanizePercentage }} of backups failed in the last hour"
```

This alerts when more than 10% of backups fail within an hour.

## Alerting on Backup Failures

Create alerts for any backup failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-backup-failures
  namespace: velero
spec:
  groups:
  - name: velero.failures
    interval: 30s
    rules:
    - alert: VeleroBackupFailed
      expr: |
        increase(velero_backup_failure_total[5m]) > 0
      labels:
        severity: critical
      annotations:
        summary: "Velero backup failed"
        description: "At least one Velero backup failed in the last 5 minutes"

    - alert: VeleroRestoreFailed
      expr: |
        increase(velero_restore_failed_total[5m]) > 0
      labels:
        severity: critical
      annotations:
        summary: "Velero restore failed"
        description: "At least one Velero restore failed in the last 5 minutes"
```

## Monitoring Backup Duration

Alert when backups take too long:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-backup-duration
  namespace: velero
spec:
  groups:
  - name: velero.duration
    interval: 30s
    rules:
    - alert: VeleroBackupTooSlow
      expr: |
        velero_backup_duration_seconds{schedule!=""} > 3600
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Velero backup taking too long"
        description: "Backup {{ $labels.schedule }} took {{ $value | humanizeDuration }}"

    - alert: VeleroBackupDurationIncreasing
      expr: |
        rate(velero_backup_duration_seconds[1h]) >
        rate(velero_backup_duration_seconds[1h] offset 1d) * 1.5
      for: 2h
      labels:
        severity: warning
      annotations:
        summary: "Velero backup duration increasing"
        description: "Backup duration increased by 50% compared to yesterday"
```

## Storage Location Health Monitoring

Monitor backup storage location availability:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-storage-location
  namespace: velero
spec:
  groups:
  - name: velero.storage
    interval: 30s
    rules:
    - alert: VeleroStorageLocationUnavailable
      expr: |
        velero_backup_storage_location_available == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Velero storage location unavailable"
        description: "Storage location {{ $labels.storage_location }} has been unavailable for 5 minutes"

    - alert: VeleroStorageLocationReadOnly
      expr: |
        velero_backup_storage_location_available{phase="ReadOnly"} == 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Velero storage location read-only"
        description: "Storage location {{ $labels.storage_location }} is in read-only mode"
```

## Monitoring Scheduled Backups

Ensure scheduled backups run on time:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-schedule-monitoring
  namespace: velero
spec:
  groups:
  - name: velero.schedules
    interval: 30s
    rules:
    - alert: VeleroScheduledBackupMissing
      expr: |
        (time() - velero_backup_last_successful_timestamp{schedule!=""}) > 90000
      labels:
        severity: critical
      annotations:
        summary: "Scheduled backup missing"
        description: "No successful backup for schedule {{ $labels.schedule }} in 25 hours"

    - alert: VeleroNoBackupsInLast24Hours
      expr: |
        increase(velero_backup_success_total[24h]) == 0
      labels:
        severity: critical
      annotations:
        summary: "No backups in 24 hours"
        description: "No successful backups completed in the last 24 hours"
```

## Creating Grafana Dashboards

Visualize Velero metrics with Grafana dashboards:

```json
{
  "dashboard": {
    "title": "Velero Backup Monitoring",
    "panels": [
      {
        "title": "Backup Success Rate",
        "targets": [
          {
            "expr": "rate(velero_backup_success_total[1h]) / (rate(velero_backup_success_total[1h]) + rate(velero_backup_failure_total[1h]))"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Backup Duration",
        "targets": [
          {
            "expr": "velero_backup_duration_seconds",
            "legendFormat": "{{ schedule }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Total Backups",
        "targets": [
          {
            "expr": "velero_backup_total"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Failed Backups (24h)",
        "targets": [
          {
            "expr": "increase(velero_backup_failure_total[24h])"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
```

Import community Grafana dashboards:

```bash
# Import Velero dashboard (ID: 11055)
kubectl create configmap grafana-dashboard-velero \
  --from-file=velero.json \
  -n monitoring
```

## Custom Metrics with Backup Hooks

Add custom metrics using backup hooks:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-metrics-hook
  namespace: velero
data:
  post-backup.sh: |
    #!/bin/bash
    # Send custom metrics after backup
    BACKUP_NAME=$1
    BACKUP_SIZE=$(velero backup describe $BACKUP_NAME -o json | jq -r '.status.totalItems')

    # Push to Prometheus pushgateway
    cat <<EOF | curl --data-binary @- http://pushgateway:9091/metrics/job/velero-backup
    velero_backup_items{backup="$BACKUP_NAME"} $BACKUP_SIZE
    EOF
```

## Integrating with Alertmanager

Configure Alertmanager to route Velero alerts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      slack_api_url: 'YOUR_SLACK_WEBHOOK'

    route:
      group_by: ['alertname']
      receiver: 'default'
      routes:
      - match:
          namespace: velero
        receiver: 'velero-alerts'
        continue: true

    receivers:
    - name: 'default'
      slack_configs:
      - channel: '#alerts'

    - name: 'velero-alerts'
      slack_configs:
      - channel: '#backup-alerts'
        title: 'Velero Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

## Exporting Metrics to External Systems

Send Velero metrics to external monitoring systems:

```python
#!/usr/bin/env python3
# velero-metrics-exporter.py

import requests
import time
from prometheus_client import start_http_server, Gauge

# Create custom metrics
backup_age = Gauge('velero_backup_age_hours', 'Age of oldest backup', ['schedule'])

def fetch_velero_metrics():
    """Fetch metrics from Velero and expose custom metrics."""
    response = requests.get('http://velero-metrics.velero:8085/metrics')
    # Parse and transform metrics as needed
    # Push to external systems

if __name__ == '__main__':
    start_http_server(8000)
    while True:
        fetch_velero_metrics()
        time.sleep(60)
```

## Testing Alert Rules

Validate your alert rules before deploying:

```bash
# Install promtool
go install github.com/prometheus/prometheus/cmd/promtool@latest

# Test alert rules
promtool check rules velero-alerts.yaml

# Unit test alerts
promtool test rules velero-alerts-test.yaml
```

Example test file:

```yaml
rule_files:
  - velero-alerts.yaml

evaluation_interval: 1m

tests:
  - interval: 1m
    input_series:
      - series: 'velero_backup_failure_total{}'
        values: '0+1x10'
    alert_rule_test:
      - eval_time: 10m
        alertname: VeleroBackupFailed
        exp_alerts:
          - exp_labels:
              severity: critical
```

## Conclusion

Monitoring Velero with Prometheus transforms passive backups into an actively managed disaster recovery system. By implementing comprehensive alerting on backup failures, duration anomalies, and storage location health, you ensure backup issues are caught and resolved before they impact recovery operations.

Start with basic success and failure alerts, then add duration monitoring and storage location health checks as your confidence grows. Regularly review your alerts to ensure they catch real issues without generating excessive noise.

Remember that monitoring backups is only half the solution. Regularly test your restore procedures to verify that your backups actually work when you need them.
