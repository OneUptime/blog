# How to Customize Ceph Dashboard Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, Alert, Monitoring, Prometheus

Description: Customize Ceph Dashboard alerts by configuring Prometheus Alertmanager rules, adjusting alert thresholds, and routing notifications to Slack, PagerDuty, or email.

---

## Overview

The Ceph Dashboard displays active Prometheus alerts in its Alerts section. Customizing alerts involves modifying Prometheus alerting rules, adjusting thresholds for your environment, and configuring Alertmanager routing to notification channels.

## Access Dashboard Alerts

Navigate to the Alerts section in the Dashboard:

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443
# Navigate to: https://localhost:8443/#/monitoring/alerts
```

The Alerts page shows active and silenced alerts with:
- Alert name and severity
- Time since firing
- Labels and annotations
- Link to Prometheus for details

## Default Ceph Alerting Rules

Rook ships default Prometheus alerting rules. View them:

```bash
kubectl -n rook-ceph get prometheusrule -o yaml
kubectl -n rook-ceph get prometheusrule prometheus-ceph-rules -o yaml
```

Common built-in rules:

```yaml
groups:
  - name: ceph.rules
    rules:
      - alert: CephHealthError
        expr: ceph_health_status == 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Ceph cluster is in HEALTH_ERR state"

      - alert: CephOSDNearFull
        expr: (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "OSD {{ $labels.ceph_daemon }} is near full"
```

## Customize Alert Thresholds

Create a custom PrometheusRule to override thresholds:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-custom-alerts
  namespace: rook-ceph
  labels:
    prometheus: rook-prometheus
    role: alert-rules
spec:
  groups:
    - name: ceph.custom.rules
      rules:
        - alert: CephOSDNearFull
          expr: (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) > 0.80  # lowered from 0.85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "OSD {{ $labels.ceph_daemon }} exceeds 80% utilization"
            description: "OSD {{ $labels.ceph_daemon }} on {{ $labels.hostname }} is at {{ $value | humanizePercentage }} capacity"

        - alert: CephPoolNearFull
          expr: |
            (ceph_pool_stored / (ceph_pool_stored + ceph_pool_max_avail)) > 0.75
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Pool {{ $labels.name }} is over 75% full"
```

## Configure Alertmanager for Notifications

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-config
  namespace: rook-ceph
stringData:
  alertmanager.yaml: |
    global:
      slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

    route:
      receiver: 'slack'
      routes:
        - match:
            severity: critical
          receiver: pagerduty
        - match:
            severity: warning
          receiver: slack

    receivers:
      - name: pagerduty
        pagerduty_configs:
          - routing_key: 'YOUR_PAGERDUTY_ROUTING_KEY'

      - name: slack
        slack_configs:
          - channel: '#ceph-alerts'
            title: 'Ceph Alert: {{ .GroupLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

      - name: email
        email_configs:
          - to: 'oncall@example.com'
            from: 'ceph@example.com'
            smarthost: 'smtp.example.com:587'
```

## Silence Alerts During Maintenance

Use the Dashboard Alerts page to create silences, or use the CLI:

```bash
# Silence CephHealthWarn during a 4-hour maintenance window
curl -X POST http://alertmanager:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "CephHealthWarn", "isRegex": false}],
    "startsAt": "2026-03-31T02:00:00Z",
    "endsAt": "2026-03-31T06:00:00Z",
    "comment": "Planned maintenance window",
    "createdBy": "admin"
  }'
```

## Summary

Customizing Ceph Dashboard alerts requires creating PrometheusRule resources with tuned thresholds and configuring Alertmanager routing to your notification channels. Lower the default OSD near-full threshold to 75-80% to give more time for capacity planning, and use Alertmanager silences during planned maintenance to prevent alert fatigue.
