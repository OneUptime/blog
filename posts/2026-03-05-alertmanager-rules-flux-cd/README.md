# How to Set Up Alertmanager Rules for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Alertmanager, Prometheus, Alerting

Description: Learn how to set up Alertmanager rules for Flux CD to get notified when reconciliation fails, resources stall, or performance degrades.

---

Alertmanager works alongside Prometheus to route, deduplicate, and deliver alerts to your notification channels. By creating well-designed alert rules for Flux CD, you can catch reconciliation failures, stalled resources, and performance degradation before they impact your deployments. This guide walks through setting up comprehensive Alertmanager rules for Flux CD.

## Prerequisites

You need the following in your cluster:

- Flux CD installed and running.
- Prometheus Operator (kube-prometheus-stack) with Alertmanager configured.
- PodMonitor resources scraping Flux controller metrics.

If you have not yet configured Prometheus to scrape Flux metrics, create a PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: flux-system
  namespace: flux-system
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchExpressions:
      - key: app
        operator: In
        values:
          - source-controller
          - kustomize-controller
          - helm-controller
          - notification-controller
  podMetricsEndpoints:
    - port: http-prom
      path: /metrics
```

## Core Alert Rules

Create a PrometheusRule resource with alerts covering the most important failure scenarios:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-alerts
  namespace: flux-system
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: flux-reconciliation-health
      rules:
        - alert: FluxReconciliationFailure
          expr: gotk_reconcile_condition{type="Ready", status="False"} == 1
          for: 10m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "Flux reconciliation failing for {{ $labels.kind }}/{{ $labels.name }}"
            description: "{{ $labels.kind }}/{{ $labels.name }} in namespace {{ $labels.namespace }} has not been ready for more than 10 minutes."
            runbook_url: "https://fluxcd.io/flux/monitoring/alerts/"

        - alert: FluxReconciliationStalled
          expr: gotk_reconcile_condition{type="Stalled", status="True"} == 1
          for: 5m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "Flux resource stalled: {{ $labels.kind }}/{{ $labels.name }}"
            description: "{{ $labels.kind }}/{{ $labels.name }} in namespace {{ $labels.namespace }} is stalled. The controller has stopped retrying reconciliation."

        - alert: FluxSuspendedResource
          expr: gotk_suspend_status == 1
          for: 24h
          labels:
            severity: info
            team: platform
          annotations:
            summary: "Flux resource suspended for over 24h: {{ $labels.kind }}/{{ $labels.name }}"
            description: "{{ $labels.kind }}/{{ $labels.name }} in namespace {{ $labels.namespace }} has been suspended for more than 24 hours."
```

## Performance Alert Rules

Add rules for reconciliation duration to catch performance degradation:

```yaml
    - name: flux-performance
      rules:
        - alert: FluxSlowReconciliation
          expr: |
            histogram_quantile(0.95,
              sum by (le, kind, name, namespace) (
                rate(gotk_reconcile_duration_seconds_bucket[15m])
              )
            ) > 300
          for: 15m
          labels:
            severity: warning
            team: platform
          annotations:
            summary: "Slow Flux reconciliation: {{ $labels.kind }}/{{ $labels.name }}"
            description: "The P95 reconciliation duration for {{ $labels.kind }}/{{ $labels.name }} in {{ $labels.namespace }} is above 5 minutes."

        - alert: FluxReconciliationNotProgressing
          expr: |
            rate(gotk_reconcile_duration_seconds_count[30m]) == 0
          for: 30m
          labels:
            severity: critical
            team: platform
          annotations:
            summary: "Flux reconciliation not progressing"
            description: "No reconciliations have been recorded in the last 30 minutes. Flux controllers may be down."
```

## Configuring Alertmanager Routes

Configure Alertmanager to route Flux alerts to the right channels. Edit your Alertmanager configuration:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: flux-alertmanager-config
  namespace: flux-system
spec:
  route:
    receiver: flux-default
    groupBy:
      - alertname
      - kind
      - namespace
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 4h
    routes:
      - matchers:
          - name: severity
            value: critical
            matchType: "="
        receiver: flux-critical
        repeatInterval: 1h
      - matchers:
          - name: severity
            value: info
            matchType: "="
        receiver: flux-info
        repeatInterval: 24h
  receivers:
    - name: flux-default
      slackConfigs:
        - apiURL:
            name: alertmanager-slack
            key: webhook-url
          channel: '#flux-alerts'
          title: '{{ .GroupLabels.alertname }}'
          text: >-
            {{ range .Alerts }}
            *{{ .Labels.kind }}/{{ .Labels.name }}* in {{ .Labels.namespace }}
            {{ .Annotations.description }}
            {{ end }}
    - name: flux-critical
      pagerdutyConfigs:
        - routingKey:
            name: alertmanager-pagerduty
            key: routing-key
          severity: critical
          description: '{{ .GroupLabels.alertname }}'
    - name: flux-info
      slackConfigs:
        - apiURL:
            name: alertmanager-slack
            key: webhook-url
          channel: '#flux-info'
```

## Using Flux Native Notifications Alongside Alertmanager

Flux also has a built-in notification system through the notification-controller. You can use it to complement Alertmanager-based alerts:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-errors
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
    - kind: GitRepository
      name: '*'
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: flux-notifications
  secretRef:
    name: slack-webhook-url
```

The native notification system is event-driven and fires immediately when a reconciliation fails, while Alertmanager alerts are metric-based and fire after a configurable duration. Using both gives you fast notifications plus metric-based trend alerts.

## Testing Your Alerts

To verify your alerts work, you can temporarily introduce a failure. Point a GitRepository to a non-existent URL:

```bash
flux create source git test-alert \
  --url=https://github.com/nonexistent/repo \
  --branch=main \
  --interval=1m
```

After 10 minutes, the `FluxReconciliationFailure` alert should fire. Clean up after testing:

```bash
flux delete source git test-alert
```

## Summary

Setting up Alertmanager rules for Flux CD involves creating PrometheusRule resources that watch the `gotk_reconcile_condition`, `gotk_suspend_status`, and `gotk_reconcile_duration_seconds` metrics. Route alerts through Alertmanager based on severity, and complement them with Flux native notifications for immediate event-driven alerts. This combination ensures you are notified of reconciliation failures, stalled resources, and performance issues across your entire GitOps pipeline.
