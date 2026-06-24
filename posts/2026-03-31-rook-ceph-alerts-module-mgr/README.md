# How to Configure the Ceph Alerts Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Alert, Monitoring, Manager

Description: Configure the Ceph Manager alerts module to send email or webhook notifications when cluster health changes, OSDs go down, or capacity thresholds are breached.

---

The Ceph Manager alerts module monitors cluster health and sends notifications when conditions change. It integrates with email (SMTP) for alerting.

## Enabling the Alerts Module

```bash
# Enable the alerts module
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- ceph mgr module enable alerts

# Verify activation
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- ceph mgr module ls | grep alerts
```

## Configuring Email Notifications

```bash
# Set SMTP server
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/smtp_host smtp.example.com

kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/smtp_port 465

# Set sender and recipient
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/smtp_sender ceph-alerts@example.com

kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/smtp_destination ops-team@example.com

# Enable SMTP authentication
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/smtp_user ceph-alerts@example.com

kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/smtp_password YOUR_SMTP_PASSWORD

# Enable SSL
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/smtp_ssl true
```

## Setting the Check Interval

```bash
# Check health every 60 seconds (default: 60)
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/interval 60
```

## Configuring the Subject and From Name

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/alerts/smtp_from_name "Ceph Cluster"
```

## Triggering a Test Alert

```bash
# Force an immediate alert check
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph alerts send
```

## Integrating with Prometheus Alertmanager

For production Rook deployments, Prometheus-based alerting is preferred over the MGR alerts module:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-health-alerts
  namespace: rook-ceph
spec:
  groups:
  - name: ceph-health
    rules:
    - alert: CephHealthError
      expr: ceph_health_status == 2
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Ceph cluster health is ERROR"
        description: "Ceph cluster {{ $labels.cluster }} is in ERROR state"
```

## Summary

The Ceph MGR alerts module sends email notifications for cluster health changes. Configure SMTP settings via `ceph config set mgr mgr/alerts/*` parameters. For production Rook deployments, supplement this with Prometheus `PrometheusRule` resources for richer alerting through Alertmanager, PagerDuty, or Slack integrations.
