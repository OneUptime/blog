# How to Create Alerting Rules for Dapr Sidecar Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alerting, Prometheus, Monitoring, Sidecar

Description: Learn how to create Prometheus alerting rules for Dapr sidecar failures covering crash-loops, high error rates, latency spikes, and pub/sub delivery failures.

---

Dapr sidecar failures can silently impact your microservices - a crashing sidecar blocks all Dapr API calls while the application container may continue running. Prometheus alerting rules catch these issues before they cause user-visible outages.

## Prometheus AlertManager Setup

Ensure Prometheus Operator is installed and configure AlertManager:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Alertmanager
metadata:
  name: dapr-alertmanager
  namespace: monitoring
spec:
  replicas: 1
  alertmanagerConfigSelector:
    matchLabels:
      alertmanager: dapr
```

## Core Dapr Sidecar Alerting Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-sidecar-alerts
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: dapr.sidecar
    interval: 30s
    rules:

    # Alert when Dapr sidecar container is crash-looping
    - alert: DaprSidecarCrashLoop
      expr: |
        increase(kube_pod_container_status_restarts_total{container="daprd"}[15m]) > 3
      for: 5m
      labels:
        severity: critical
        team: platform
      annotations:
        summary: "Dapr sidecar crash-looping on {{ $labels.pod }}"
        description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} daprd container restarted {{ $value }} times in 15m"

    # Alert on high HTTP error rate
    - alert: DaprHighErrorRate
      expr: |
        (
          sum(rate(dapr_http_server_request_count{status=~"5.."}[5m])) by (app_id)
          /
          sum(rate(dapr_http_server_request_count[5m])) by (app_id)
        ) > 0.05
      for: 3m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "High error rate on Dapr service {{ $labels.app_id }}"
        description: "Error rate for {{ $labels.app_id }} is {{ $value | humanizePercentage }}"

    # Alert on high P99 latency
    - alert: DaprHighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(dapr_http_server_latency_bucket[5m])) by (app_id, le)
        ) > 2000
      for: 5m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "High P99 latency on {{ $labels.app_id }}"
        description: "P99 latency for {{ $labels.app_id }} is {{ $value }}ms (threshold: 2000ms)"

    # Alert when pub/sub delivery fails
    - alert: DaprPubSubDeliveryFailures
      expr: |
        sum(rate(dapr_component_pubsub_ingress_count{process_status="drop"}[5m])) by (app_id, topic) > 0.1
      for: 5m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "Pub/sub delivery failures for {{ $labels.app_id }}/{{ $labels.topic }}"
        description: "{{ $value }} failed deliveries/s for topic {{ $labels.topic }}"

    # Alert when Dapr sidecar is absent from a running pod
    - alert: DaprSidecarMissing
      expr: |
        kube_pod_container_status_running{container="daprd"} == 0
        and on(pod, namespace)
        kube_pod_container_status_running{container!="daprd"} == 1
      for: 2m
      labels:
        severity: critical
        team: platform
      annotations:
        summary: "Dapr sidecar not running in {{ $labels.namespace }}/{{ $labels.pod }}"
```

## AlertManager Routing

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: dapr-alerts-config
  namespace: monitoring
  labels:
    alertmanager: dapr
spec:
  route:
    receiver: platform-team
    groupBy: [app_id, namespace]
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 1h
    routes:
    - matchers:
      - name: severity
        value: critical
      receiver: pagerduty-critical
  receivers:
  - name: platform-team
    slackConfigs:
    - apiURL:
        name: slack-webhook-secret
        key: url
      channel: "#dapr-alerts"
      text: "Alert: {{ .CommonAnnotations.summary }}"
  - name: pagerduty-critical
    pagerdutyConfigs:
    - routingKey:
        name: pagerduty-secret
        key: routingKey
```

## Summary

Dapr sidecar alerting requires rules covering crash-loop detection via container restart counts, HTTP error rate thresholds via `dapr_http_server_request_count`, latency SLOs via histogram quantiles, and pub/sub delivery failure rates. Route critical alerts like sidecar absence and crash-loops to PagerDuty for immediate response, and use Slack for warning-level alerts.
