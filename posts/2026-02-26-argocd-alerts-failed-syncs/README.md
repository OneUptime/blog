# How to Set Up Alerts for Failed ArgoCD Syncs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Prometheus, Alerting

Description: Learn how to set up Prometheus alerts for failed ArgoCD sync operations, including alert rules, notification routing, and escalation strategies for reliable GitOps monitoring.

---

Failed syncs are the most visible problem in an ArgoCD deployment. When a sync fails, it means your intended changes did not make it to the cluster. The application is stuck between the old state and the new state, and depending on your auto-sync configuration, ArgoCD might keep retrying and failing repeatedly. Without alerts, failed syncs can go unnoticed for hours, especially in large deployments where individual applications are easy to miss in the UI.

Setting up proper alerts for failed syncs ensures your team knows immediately when deployments fail, giving them time to investigate and fix the issue before it impacts users.

## Understanding Sync Failure Metrics

ArgoCD tracks sync operations through the `argocd_app_sync_total` counter. Each sync operation increments this counter with a `phase` label indicating the outcome:

- `Succeeded` - Sync completed successfully
- `Failed` - Sync encountered an error during apply
- `Error` - Sync could not even start (e.g., Git fetch failed)
- `Running` - Sync is currently in progress

```promql
# All failed syncs in the last 5 minutes
rate(argocd_app_sync_total{phase="Failed"}[5m])

# All error syncs in the last 5 minutes
rate(argocd_app_sync_total{phase="Error"}[5m])

# Combined failure rate
rate(argocd_app_sync_total{phase=~"Failed|Error"}[5m])
```

## Basic Failed Sync Alert

Start with a simple alert that fires when any sync fails:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-sync-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
  - name: argocd-sync-failures
    rules:
    - alert: ArgocdSyncFailed
      expr: |
        increase(argocd_app_sync_total{phase=~"Failed|Error"}[5m]) > 0
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "ArgoCD sync failed for {{ $labels.name }}"
        description: "Application {{ $labels.name }} in project {{ $labels.project }} had a failed sync operation."
```

This alert fires within a minute of any sync failure. The `increase()` function over 5 minutes catches any new failures.

## Graduated Severity Alerts

A single alert is not enough for production. Create graduated alerts based on severity:

```yaml
groups:
- name: argocd-sync-failures
  rules:
  # Warning: Single sync failure
  - alert: ArgocdSyncFailedWarning
    expr: |
      increase(argocd_app_sync_total{phase=~"Failed|Error"}[10m]) > 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "ArgoCD sync failed for {{ $labels.name }}"
      description: "Application {{ $labels.name }} experienced a sync failure. Check the ArgoCD UI for details."

  # Critical: Repeated sync failures (application stuck)
  - alert: ArgocdSyncRepeatedFailures
    expr: |
      increase(argocd_app_sync_total{phase=~"Failed|Error"}[30m]) > 3
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "ArgoCD sync repeatedly failing for {{ $labels.name }}"
      description: "Application {{ $labels.name }} has failed {{ $value }} syncs in the last 30 minutes. The application is likely stuck in a failure loop."

  # Critical: Multiple applications failing simultaneously
  - alert: ArgocdMassSyncFailure
    expr: |
      count(
        increase(argocd_app_sync_total{phase=~"Failed|Error"}[15m]) > 0
      ) > 5
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Multiple ArgoCD applications have failing syncs"
      description: "{{ $value }} applications have experienced sync failures in the last 15 minutes. This may indicate a cluster-wide issue."

  # Critical: High sync failure rate across all apps
  - alert: ArgocdHighSyncFailureRate
    expr: |
      sum(rate(argocd_app_sync_total{phase=~"Failed|Error"}[15m]))
      / sum(rate(argocd_app_sync_total[15m])) > 0.3
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "ArgoCD sync failure rate exceeds 30%"
      description: "{{ $value | humanizePercentage }} of sync operations are failing. Investigate immediately."
```

## Environment-Specific Alerts

Different environments deserve different alert thresholds and routing:

```yaml
groups:
- name: argocd-sync-by-environment
  rules:
  # Production failures - immediate alert
  - alert: ArgocdProductionSyncFailed
    expr: |
      increase(argocd_app_sync_total{
        phase=~"Failed|Error",
        dest_namespace=~"production|prod|prod-.*"
      }[5m]) > 0
    for: 1m
    labels:
      severity: critical
      environment: production
    annotations:
      summary: "PRODUCTION sync failed: {{ $labels.name }}"
      description: "Production application {{ $labels.name }} sync failed. This requires immediate attention."
      runbook_url: "https://wiki.example.com/runbooks/argocd-sync-failure"

  # Staging failures - slower alert
  - alert: ArgocdStagingSyncFailed
    expr: |
      increase(argocd_app_sync_total{
        phase=~"Failed|Error",
        dest_namespace=~"staging|stage|stg-.*"
      }[10m]) > 0
    for: 5m
    labels:
      severity: warning
      environment: staging
    annotations:
      summary: "Staging sync failed: {{ $labels.name }}"
      description: "Staging application {{ $labels.name }} sync failed."

  # Development failures - informational
  - alert: ArgocdDevSyncFailed
    expr: |
      increase(argocd_app_sync_total{
        phase=~"Failed|Error",
        dest_namespace=~"dev|development|dev-.*"
      }[15m]) > 2
    for: 10m
    labels:
      severity: info
      environment: development
    annotations:
      summary: "Dev sync failures: {{ $labels.name }}"
      description: "Development application {{ $labels.name }} has repeated sync failures."
```

## Configuring Alert Routing with Alertmanager

Route alerts to the right channels based on severity and environment:

```yaml
# alertmanager.yml
route:
  receiver: default
  routes:
  # Production sync failures go to PagerDuty
  - match:
      alertname: ArgocdProductionSyncFailed
    receiver: pagerduty-critical
    continue: true

  # All sync failures go to Slack
  - match_re:
      alertname: Argocd.*SyncFail.*
    receiver: slack-argocd
    group_by: [alertname, name]
    group_wait: 30s
    group_interval: 5m
    repeat_interval: 4h

receivers:
- name: default
  slack_configs:
  - channel: '#alerts'
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

- name: pagerduty-critical
  pagerduty_configs:
  - service_key: '<your-pagerduty-key>'
    severity: critical

- name: slack-argocd
  slack_configs:
  - channel: '#argocd-alerts'
    title: 'ArgoCD Sync Failure'
    text: |
      *Alert:* {{ .GroupLabels.alertname }}
      *Application:* {{ .GroupLabels.name }}
      {{ range .Alerts }}
      {{ .Annotations.description }}
      {{ end }}
    send_resolved: true
```

## Combining Metrics-Based and ArgoCD Notifications

ArgoCD has its own notification system that can alert on sync failures. Use both approaches for defense in depth:

Prometheus alerts catch metric-based patterns (failure rates, trends, fleet-wide issues). ArgoCD notifications provide immediate, per-application notifications with more context.

Configure ArgoCD notifications for immediate feedback:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-failed: |
    - description: Application sync failed
      send:
      - app-sync-failed
      when: app.status.operationState.phase in ['Error', 'Failed']

  template.app-sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync failed.
      Error: {{.app.status.operationState.message}}
      Revision: {{.app.status.sync.revision}}

  service.slack: |
    token: $slack-token
```

And use Prometheus alerts for pattern detection:

```promql
# Alert on sustained failure patterns that ArgoCD notifications might miss
increase(argocd_app_sync_total{phase=~"Failed|Error"}[1h]) > 5
```

## Testing Your Alerts

Before relying on alerts in production, test them:

```bash
# Trigger a sync failure intentionally
# Deploy an invalid manifest to a test application
argocd app set test-app --parameter invalid.key=invalid.value
argocd app sync test-app

# Verify the failure metric incremented
kubectl port-forward -n argocd deployment/argocd-application-controller 8082:8082 &
curl -s localhost:8082/metrics | grep 'argocd_app_sync_total.*Failed'

# Check if the alert fired in Prometheus
curl -s "http://prometheus:9090/api/v1/alerts" | jq '.data.alerts[] | select(.labels.alertname | contains("Sync"))'
```

## Suppressing Alerts During Maintenance

During planned maintenance windows, suppress ArgoCD sync alerts using Alertmanager silences:

```bash
# Create a silence for 2 hours
amtool silence add \
  --alertmanager.url=http://alertmanager:9093 \
  --comment="Planned maintenance window" \
  --duration=2h \
  alertname=~"Argocd.*SyncFail.*"
```

Or configure ArgoCD sync windows to prevent syncs during maintenance, which avoids the alerts entirely. See our guide on [configuring sync windows](https://oneuptime.com/blog/post/2026-02-26-argocd-configure-sync-windows/view) for details.

Failed sync alerts are the foundation of your GitOps incident response. Start with simple alerts, refine the thresholds based on real-world patterns, and evolve toward environment-specific routing as your ArgoCD deployment matures.
