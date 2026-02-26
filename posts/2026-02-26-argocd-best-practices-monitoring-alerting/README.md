# ArgoCD Best Practices for Monitoring and Alerting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monitoring, Observability

Description: Learn ArgoCD monitoring and alerting best practices including Prometheus metrics, Grafana dashboards, critical alerts, notification configuration, and operational visibility patterns.

---

ArgoCD manages your deployments, so when ArgoCD has problems, deployments stop working. Comprehensive monitoring and alerting for ArgoCD is not optional - it is a fundamental operational requirement. You need to know when syncs fail, when applications drift, when ArgoCD components are unhealthy, and when performance is degrading before it impacts your teams.

This guide covers the monitoring and alerting setup every ArgoCD installation should have.

## Enabling Prometheus metrics

ArgoCD exposes Prometheus metrics on each component. Enable scraping:

```yaml
# ServiceMonitor for all ArgoCD components
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: argocd
  labels:
    release: prometheus  # Match your Prometheus selector
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: argocd
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

Or if you are using annotations-based scraping:

```yaml
# Add to ArgoCD server, controller, and repo server services
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8083"  # Port varies by component
    prometheus.io/path: "/metrics"
```

## Key metrics to monitor

### Application sync status

```promql
# Count of applications by sync status
sum by (sync_status) (argocd_app_info)

# Applications that are OutOfSync
argocd_app_info{sync_status="OutOfSync"}

# Applications that have been OutOfSync for over 30 minutes
# (requires recording rule)
argocd_app_info{sync_status="OutOfSync"} offset 30m
```

### Application health status

```promql
# Count of applications by health status
sum by (health_status) (argocd_app_info)

# Degraded applications
argocd_app_info{health_status="Degraded"}

# Applications in Unknown health state (often indicates connectivity issues)
argocd_app_info{health_status="Unknown"}
```

### Sync operation performance

```promql
# Sync operation duration (histogram)
histogram_quantile(0.95, sum(rate(argocd_app_sync_total[5m])) by (le, name))

# Sync failures rate
sum(rate(argocd_app_sync_total{phase="Error"}[5m])) by (name)

# Sync success rate
sum(rate(argocd_app_sync_total{phase="Succeeded"}[5m])) /
sum(rate(argocd_app_sync_total[5m]))
```

### Controller performance

```promql
# Controller reconciliation queue depth
argocd_app_reconcile_count

# Controller reconciliation duration
histogram_quantile(0.95, sum(rate(argocd_app_reconcile_bucket[5m])) by (le))

# Controller memory usage
container_memory_working_set_bytes{namespace="argocd", container="argocd-application-controller"}
```

### Repo server performance

```promql
# Git request duration
histogram_quantile(0.95, sum(rate(argocd_git_request_duration_seconds_bucket[5m])) by (le))

# Git request failures
sum(rate(argocd_git_request_total{request_type="fetch", result="error"}[5m]))

# Manifest generation duration
histogram_quantile(0.95, sum(rate(argocd_repo_pending_request_total[5m])) by (le))
```

### API server performance

```promql
# API request rate
sum(rate(argocd_api_request_total[5m])) by (verb, resource)

# API request latency
histogram_quantile(0.95, sum(rate(argocd_api_request_duration_seconds_bucket[5m])) by (le))
```

## Critical alerts

These alerts should page someone:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-critical-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd.critical
      rules:
        # ArgoCD components down
        - alert: ArgocdControllerDown
          expr: absent(up{job="argocd-application-controller-metrics"} == 1)
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD Application Controller is down"
            description: "No ArgoCD Application Controller instance is running. Syncs will not occur."

        - alert: ArgocdServerDown
          expr: absent(up{job="argocd-server-metrics"} == 1)
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD API Server is down"
            description: "ArgoCD API Server is not responding. UI and CLI access is unavailable."

        - alert: ArgocdRepoServerDown
          expr: absent(up{job="argocd-repo-server-metrics"} == 1)
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD Repo Server is down"
            description: "Repo Server is not responding. Manifest generation will fail."

        # Production application failures
        - alert: ArgocdProductionAppDegraded
          expr: |
            argocd_app_info{health_status="Degraded", dest_namespace=~"prod.*|production.*"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Production application {{ $labels.name }} is degraded"
            description: "Application {{ $labels.name }} in {{ $labels.dest_namespace }} has been degraded for 5 minutes."

        # Controller OOM risk
        - alert: ArgocdControllerHighMemory
          expr: |
            container_memory_working_set_bytes{namespace="argocd", container="argocd-application-controller"}
            / container_spec_memory_limit_bytes{namespace="argocd", container="argocd-application-controller"}
            > 0.85
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD Controller memory usage above 85%"
            description: "Controller is at risk of OOMKill. Current usage: {{ $value | humanizePercentage }}"
```

## Warning alerts

These should notify the team but not page:

```yaml
    - name: argocd.warning
      rules:
        # Applications out of sync
        - alert: ArgocdAppOutOfSync
          expr: |
            argocd_app_info{sync_status="OutOfSync"} == 1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Application {{ $labels.name }} is out of sync for 30 minutes"

        # Sync failures
        - alert: ArgocdSyncFailed
          expr: |
            increase(argocd_app_sync_total{phase=~"Error|Failed"}[1h]) > 3
          labels:
            severity: warning
          annotations:
            summary: "Application {{ $labels.name }} has failed to sync 3+ times in the last hour"

        # Git fetch errors
        - alert: ArgocdGitFetchErrors
          expr: |
            increase(argocd_git_request_total{request_type="fetch", result="error"}[15m]) > 5
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD is experiencing Git fetch errors"

        # High reconciliation time
        - alert: ArgocdSlowReconciliation
          expr: |
            histogram_quantile(0.95, sum(rate(argocd_app_reconcile_bucket[5m])) by (le)) > 120
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD reconciliation P95 latency is above 2 minutes"

        # Redis connection issues
        - alert: ArgocdRedisConnectionErrors
          expr: |
            increase(argocd_redis_request_total{result="error"}[5m]) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD is experiencing Redis connection errors"
```

## Grafana dashboard essentials

Build a dashboard with these panels:

### Overview panel

```json
{
  "title": "ArgoCD Application Overview",
  "panels": [
    {
      "title": "Applications by Sync Status",
      "type": "piechart",
      "targets": [{"expr": "sum by (sync_status) (argocd_app_info)"}]
    },
    {
      "title": "Applications by Health Status",
      "type": "piechart",
      "targets": [{"expr": "sum by (health_status) (argocd_app_info)"}]
    },
    {
      "title": "Sync Operations (1h)",
      "type": "stat",
      "targets": [{"expr": "sum(increase(argocd_app_sync_total[1h])) by (phase)"}]
    }
  ]
}
```

### Component health panel

Monitor resource usage for each ArgoCD component:

```promql
# CPU usage per component
sum(rate(container_cpu_usage_seconds_total{namespace="argocd"}[5m])) by (container)

# Memory usage per component
container_memory_working_set_bytes{namespace="argocd"} / 1024 / 1024

# Pod restarts
sum(increase(kube_pod_container_status_restarts_total{namespace="argocd"}[1h])) by (container)
```

### Git operations panel

```promql
# Git fetch latency
histogram_quantile(0.95, sum(rate(argocd_git_request_duration_seconds_bucket{request_type="fetch"}[5m])) by (le))

# Git fetch rate
sum(rate(argocd_git_request_total{request_type="fetch"}[5m])) by (result)
```

## ArgoCD notifications for operational events

Set up notifications alongside Prometheus alerts for different communication channels:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Triggers
  trigger.on-sync-failed: |
    - send: [slack-sync-failed]
      when: app.status.operationState.phase in ['Error', 'Failed']
      oncePer: app.status.operationState.syncResult.revision

  trigger.on-health-degraded: |
    - send: [slack-health-degraded]
      when: app.status.health.status == 'Degraded'

  trigger.on-sync-succeeded: |
    - send: [slack-sync-succeeded]
      when: app.status.operationState.phase in ['Succeeded']
      oncePer: app.status.operationState.syncResult.revision

  # Templates
  template.slack-sync-failed: |
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "title": "Sync Failed: {{ .app.metadata.name }}",
          "fields": [
            {"title": "Project", "value": "{{ .app.spec.project }}", "short": true},
            {"title": "Cluster", "value": "{{ .app.spec.destination.server }}", "short": true},
            {"title": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}", "short": true},
            {"title": "Error", "value": "{{ .app.status.operationState.message | trunc 200 }}", "short": false}
          ]
        }]

  template.slack-health-degraded: |
    slack:
      attachments: |
        [{
          "color": "#f4c030",
          "title": "Health Degraded: {{ .app.metadata.name }}",
          "fields": [
            {"title": "Health", "value": "{{ .app.status.health.status }}", "short": true},
            {"title": "Namespace", "value": "{{ .app.spec.destination.namespace }}", "short": true}
          ]
        }]

  template.slack-sync-succeeded: |
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "Synced: {{ .app.metadata.name }}",
          "fields": [
            {"title": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}", "short": true},
            {"title": "Cluster", "value": "{{ .app.spec.destination.server }}", "short": true}
          ]
        }]
```

## Integration with OneUptime

For comprehensive monitoring that includes ArgoCD alongside your application metrics, consider integrating with [OneUptime](https://oneuptime.com). OneUptime can aggregate ArgoCD metrics with your application health data, giving you a unified view of deployment status and service health.

## Summary

ArgoCD monitoring requires metrics collection from all components (controller, server, repo server, Redis), critical alerts for component failures and production application degradation, warning alerts for sync failures and performance degradation, Grafana dashboards for operational visibility, and notifications for deployment events. The minimum viable monitoring setup includes component health checks, application sync status tracking, and sync failure alerts. Build from there based on your operational needs.
