# How to Configure Alerting via Email for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Alert, Email, Monitoring

Description: Configure Alertmanager to send email notifications for Rook-Ceph Prometheus alerts using SMTP with severity-based routing.

---

## Overview

Email notifications for Rook-Ceph alerts provide a low-barrier way to keep storage operations teams informed without requiring third-party services. Alertmanager handles email delivery through an SMTP relay, and the `AlertmanagerConfig` CRD makes it easy to define routing rules scoped to the `rook-ceph` namespace.

## Prerequisites

- Prometheus and Alertmanager running (kube-prometheus-stack recommended)
- An SMTP server or relay (e.g., SendGrid, Postfix, AWS SES, Gmail SMTP)
- Rook-Ceph Prometheus alerting rules deployed

## Create a Secret for SMTP Credentials

```bash
kubectl create secret generic smtp-credentials \
  --from-literal=smtp_password="<your-smtp-password>" \
  -n rook-ceph
```

## Configure Alertmanager with Email Receiver

Using the Prometheus Operator `AlertmanagerConfig` CRD:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: rook-ceph-email
  namespace: rook-ceph
spec:
  route:
    groupBy: ["alertname", "severity"]
    groupWait: 1m
    groupInterval: 10m
    repeatInterval: 24h
    matchers:
    - name: namespace
      value: rook-ceph
    receiver: email-receiver
    routes:
    - matchers:
      - name: severity
        value: critical
      receiver: email-critical
      repeatInterval: 4h
  receivers:
  - name: email-receiver
    emailConfigs:
    - to: storage-team@example.com
      from: alerts@example.com
      smarthost: smtp.example.com:587
      authUsername: alerts@example.com
      authPassword:
        name: smtp-credentials
        key: smtp_password
      requireTLS: true
      headers:
      - key: Subject
        value: '[ROOK-CEPH] {{ .GroupLabels.alertname }} - {{ .Status | toUpper }}'
  - name: email-critical
    emailConfigs:
    - to: storage-oncall@example.com,cto@example.com
      from: alerts@example.com
      smarthost: smtp.example.com:587
      authUsername: alerts@example.com
      authPassword:
        name: smtp-credentials
        key: smtp_password
      requireTLS: true
```

## Alertmanager Global SMTP Configuration

For kube-prometheus-stack Helm values, set global SMTP settings:

```yaml
alertmanager:
  config:
    global:
      smtp_smarthost: "smtp.gmail.com:587"
      smtp_from: "alerts@example.com"
      smtp_auth_username: "alerts@example.com"
      smtp_auth_password: "<app-password>"
      smtp_require_tls: true
    route:
      receiver: default-email
      routes:
      - matchers:
        - alertname =~ "Ceph.*"
        receiver: ceph-email
    receivers:
    - name: default-email
    - name: ceph-email
      email_configs:
      - to: "storage-team@example.com"
        send_resolved: true
```

## Customize the Email Template

Add a custom HTML email template for richer formatting:

```yaml
templates:
- '/etc/alertmanager/config/*.tmpl'
```

Example template snippet:

```text
{{ define "email.ceph.html" }}
<h2>Ceph Alert: {{ .GroupLabels.alertname }}</h2>
<p>Severity: {{ .CommonLabels.severity }}</p>
<p>Cluster: {{ .CommonLabels.ceph_cluster }}</p>
{{ range .Alerts }}
<p>{{ .Annotations.description }}</p>
{{ end }}
{{ end }}
```

## Test Email Delivery

Send a test notification:

```bash
kubectl port-forward -n monitoring svc/alertmanager-operated 9093:9093 &

curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"CephOSDDown","namespace":"rook-ceph","severity":"warning"},"annotations":{"summary":"OSD.0 is down"}}]'
```

## Summary

Email alerting for Rook-Ceph via Alertmanager provides reliable notifications without external service dependencies. Using severity-based routing, critical alerts like `CephHealthError` or `CephMonDown` can be sent to a wider distribution list or escalated with shorter repeat intervals, while warning-level alerts go to the storage team's shared inbox.
