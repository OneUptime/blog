# How to Configure Alerting via PagerDuty for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Alert, PagerDuty, Monitoring

Description: Configure Alertmanager to send Rook-Ceph Prometheus alerts to PagerDuty for on-call incident management and escalation workflows.

---

## Overview

Rook-Ceph generates Prometheus alerts for critical storage conditions like OSD failures, monitor quorum loss, and pool capacity exhaustion. Routing these alerts to PagerDuty ensures on-call teams are notified immediately with full incident management capabilities.

## Prerequisites

- Prometheus and Alertmanager deployed (via kube-prometheus-stack or standalone)
- Rook-Ceph Prometheus rules installed
- A PagerDuty account with an integration key

Create a PagerDuty integration:
1. In PagerDuty, go to `Services` - `Service Directory` - select your service
2. Add an integration - `Events API v2`
3. Copy the `Integration Key`

## Create a Secret for the PagerDuty Key

```bash
kubectl create secret generic pagerduty-config \
  --from-literal=routing_key="<your-integration-key>" \
  -n rook-ceph
```

## Configure Alertmanager

Update your Alertmanager configuration to include a PagerDuty receiver. If using the Prometheus Operator, update the `AlertmanagerConfig` resource:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: rook-ceph-pagerduty
  namespace: rook-ceph
spec:
  route:
    groupBy: ["alertname", "ceph_cluster"]
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 12h
    matchers:
    - name: namespace
      value: rook-ceph
    receiver: pagerduty-receiver
  receivers:
  - name: pagerduty-receiver
    pagerdutyConfigs:
    - routingKey:
        name: pagerduty-config
        key: routing_key
      severity: '{{ if eq .Labels.severity "critical" }}critical{{ else }}warning{{ end }}'
      description: '{{ .CommonAnnotations.summary }}'
      details:
      - key: cluster
        value: '{{ .CommonLabels.ceph_cluster }}'
      - key: alertname
        value: '{{ .CommonLabels.alertname }}'
```

## Alertmanager Values for kube-prometheus-stack

If managing Alertmanager via Helm values:

```yaml
alertmanager:
  config:
    global:
      pagerduty_url: "https://events.pagerduty.com/v2/enqueue"
    route:
      receiver: default
      routes:
      - matchers:
        - alertname =~ "Ceph.*"
        receiver: pagerduty-ceph
        group_wait: 30s
        repeat_interval: 4h
    receivers:
    - name: default
      pagerduty_configs: []
    - name: pagerduty-ceph
      pagerduty_configs:
      - routing_key: "<integration-key>"
        description: "{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}"
```

## Test the PagerDuty Integration

Trigger a test alert manually:

```bash
kubectl port-forward -n monitoring svc/alertmanager-operated 9093:9093 &

curl -X POST http://localhost:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {"alertname":"CephHealthError","namespace":"rook-ceph","severity":"critical"},
    "annotations": {"summary":"Test Ceph alert for PagerDuty verification"}
  }]'
```

Check PagerDuty for the incoming incident.

## Summary

Routing Rook-Ceph Prometheus alerts to PagerDuty via Alertmanager connects storage incidents directly to your on-call workflow. The `AlertmanagerConfig` CRD allows namespace-scoped routing rules, so Ceph alerts from the `rook-ceph` namespace are targeted specifically at the PagerDuty receiver, with severity and cluster context preserved in the incident details.
