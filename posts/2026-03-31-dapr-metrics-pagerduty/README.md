# How to Use Dapr Metrics with PagerDuty

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PagerDuty, Alerting, Incident Management, Monitoring

Description: Route Dapr Prometheus alerts to PagerDuty for incident management, configure escalation policies, and set up on-call schedules for Dapr service failures.

---

PagerDuty turns Dapr metrics alerts into actionable incidents with escalation, on-call scheduling, and team notification. Connecting your Prometheus alerting stack to PagerDuty ensures that critical Dapr failures like control plane outages and high error rates wake the right people at the right time.

## Architecture Overview

The integration works through this chain:

```text
Dapr Sidecar Metrics -> Prometheus -> Alertmanager -> PagerDuty
```

Alertmanager handles routing, deduplication, and silencing. PagerDuty handles on-call scheduling, escalation, and acknowledgment.

## Configuring Alertmanager for PagerDuty

Create a PagerDuty integration in your service:

1. In PagerDuty, go to Services - your service - Integrations
2. Add an integration of type "Events API v2"
3. Copy the Integration Key

Configure Alertmanager with the PagerDuty integration key:

```yaml
# alertmanager.yaml
global:
  pagerduty_url: https://events.pagerduty.com/v2/enqueue

route:
  group_by: ['alertname', 'app_id', 'namespace']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'dapr-warning-pagerduty'
  routes:
    - match:
        severity: critical
      receiver: dapr-critical-pagerduty
    - match:
        severity: warning
      receiver: dapr-warning-pagerduty

receivers:
  - name: dapr-critical-pagerduty
    pagerduty_configs:
      - routing_key: YOUR_PAGERDUTY_INTEGRATION_KEY
        severity: critical
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        details:
          app_id: '{{ .GroupLabels.app_id }}'
          namespace: '{{ .GroupLabels.namespace }}'
          runbook: '{{ .CommonAnnotations.runbook_url }}'

  - name: dapr-warning-pagerduty
    pagerduty_configs:
      - routing_key: YOUR_PAGERDUTY_INTEGRATION_KEY
        severity: warning
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
```

## Setting Up Dapr Alert Routing

Create specific routes for different Dapr component failures:

```yaml
routes:
  - match:
      alertname: DaprControlPlaneDown
    receiver: dapr-critical-pagerduty
    continue: false

  - match_re:
      alertname: "DaprSLO.*BurnRate"
    receiver: dapr-slo-pagerduty
    group_wait: 0s

  - match:
      alertname: DaprPubSubConsumerLag
    receiver: dapr-warning-pagerduty
    group_wait: 5m
```

## Deploying Alertmanager to Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-config
  namespace: monitoring
type: Opaque
stringData:
  alertmanager.yaml: |
    global:
      pagerduty_url: https://events.pagerduty.com/v2/enqueue
    route:
      receiver: dapr-critical-pagerduty
      routes:
        - match:
            severity: critical
          receiver: dapr-critical-pagerduty
    receivers:
      - name: dapr-critical-pagerduty
        pagerduty_configs:
          - routing_key: "{{ PAGERDUTY_KEY }}"
            severity: critical
```

## Adding Runbook Links to Alerts

Enrich PagerDuty incidents with runbook URLs:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-pagerduty-alerts
  namespace: monitoring
spec:
  groups:
    - name: dapr.pagerduty
      rules:
        - alert: DaprControlPlaneDown
          expr: absent(up{job="dapr-operator"} == 1)
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr Operator is down"
            runbook_url: "https://wiki.company.com/runbooks/dapr/control-plane-down"
            description: "Dapr control plane unavailable for 1+ minutes."
```

## Testing PagerDuty Integration

Send a test alert via Alertmanager API:

```bash
curl -X POST http://localhost:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "DaprTestAlert",
      "severity": "critical",
      "app_id": "test-service"
    },
    "annotations": {
      "summary": "Test alert from Dapr monitoring"
    }
  }]'
```

## Summary

Connecting Dapr metrics to PagerDuty via Alertmanager enables production-grade incident management with on-call scheduling and escalation policies. Routing critical Dapr alerts (control plane failures, high error rates, SLO breaches) to PagerDuty while sending warnings through lower-priority channels keeps on-call engineers focused on what matters most.
