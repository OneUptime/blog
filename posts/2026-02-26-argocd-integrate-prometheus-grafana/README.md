# How to Integrate ArgoCD with Prometheus and Grafana

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Prometheus, Grafana

Description: Learn how to integrate ArgoCD with Prometheus and Grafana for monitoring sync operations, tracking deployment metrics, building GitOps dashboards, and alerting on deployment failures.

---

ArgoCD exposes a rich set of Prometheus metrics that give you visibility into every aspect of your GitOps workflow - sync durations, application health, reconciliation counts, and resource tracking. By connecting these metrics to Grafana, you get dashboards that show deployment velocity, failure rates, and application health trends. This guide covers the complete integration from metric collection to production-ready dashboards.

## ArgoCD Metrics Overview

ArgoCD exposes metrics through three endpoints:

- **Application Controller** (port 8082) - Application sync status, reconciliation metrics, cluster cache stats
- **API Server** (port 8083) - API request metrics, gRPC stats
- **Repo Server** (port 8084) - Git operations, manifest generation metrics

These endpoints serve Prometheus-format metrics at the `/metrics` path.

## Configuring Prometheus to Scrape ArgoCD

### Using ServiceMonitor (Prometheus Operator)

If you are running the Prometheus Operator:

```yaml
# ServiceMonitor for ArgoCD Application Controller
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-application-controller
  namespace: argocd
  labels:
    release: prometheus  # Must match your Prometheus operator selector
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-application-controller
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics

---
# ServiceMonitor for ArgoCD API Server
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-server
  namespace: argocd
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics

---
# ServiceMonitor for ArgoCD Repo Server
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-repo-server
  namespace: argocd
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-repo-server
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics

---
# ServiceMonitor for ArgoCD Notifications
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-notifications
  namespace: argocd
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-notifications-controller
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Using Prometheus Annotations

If you are not using the Prometheus Operator, add scrape annotations to ArgoCD services:

```yaml
# Patch ArgoCD services with Prometheus annotations
kubectl annotate service argocd-application-controller-metrics -n argocd \
  prometheus.io/scrape="true" \
  prometheus.io/port="8082" \
  prometheus.io/path="/metrics"

kubectl annotate service argocd-server-metrics -n argocd \
  prometheus.io/scrape="true" \
  prometheus.io/port="8083" \
  prometheus.io/path="/metrics"

kubectl annotate service argocd-repo-server -n argocd \
  prometheus.io/scrape="true" \
  prometheus.io/port="8084" \
  prometheus.io/path="/metrics"
```

## Key ArgoCD Metrics

Here are the most important metrics to monitor:

### Application Sync Metrics

```promql
# Total sync operations by status
argocd_app_sync_total{name="my-app", phase="Succeeded"}
argocd_app_sync_total{name="my-app", phase="Failed"}

# Current sync status of all applications
argocd_app_info{sync_status="OutOfSync"}
argocd_app_info{sync_status="Synced"}

# Application health status
argocd_app_info{health_status="Healthy"}
argocd_app_info{health_status="Degraded"}
argocd_app_info{health_status="Progressing"}
```

### Reconciliation Metrics

```promql
# Reconciliation duration (time to compare Git vs cluster)
histogram_quantile(0.95, rate(argocd_app_reconcile_bucket[5m]))

# Reconciliation count by result
rate(argocd_app_reconcile_count{result="error"}[5m])
rate(argocd_app_reconcile_count{result="ok"}[5m])
```

### Cluster and Resource Metrics

```promql
# Number of resources managed per application
argocd_app_info{name="my-app"} * on(name) group_left() argocd_app_resource_info

# Cluster cache size
argocd_cluster_info

# API server request rates
rate(argocd_app_k8s_request_total[5m])
```

### Git and Repo Server Metrics

```promql
# Git request duration
histogram_quantile(0.95, rate(argocd_git_request_duration_seconds_bucket[5m]))

# Git request failures
rate(argocd_git_request_total{request_type="fetch", result="error"}[5m])
```

## Building Grafana Dashboards

### Deployment Overview Dashboard

Create a dashboard showing the state of all applications:

```json
{
  "panels": [
    {
      "title": "Applications by Sync Status",
      "type": "piechart",
      "targets": [
        {
          "expr": "count(argocd_app_info{sync_status=\"Synced\"})",
          "legendFormat": "Synced"
        },
        {
          "expr": "count(argocd_app_info{sync_status=\"OutOfSync\"})",
          "legendFormat": "OutOfSync"
        },
        {
          "expr": "count(argocd_app_info{sync_status=\"Unknown\"})",
          "legendFormat": "Unknown"
        }
      ]
    },
    {
      "title": "Applications by Health Status",
      "type": "piechart",
      "targets": [
        {
          "expr": "count(argocd_app_info{health_status=\"Healthy\"})",
          "legendFormat": "Healthy"
        },
        {
          "expr": "count(argocd_app_info{health_status=\"Degraded\"})",
          "legendFormat": "Degraded"
        },
        {
          "expr": "count(argocd_app_info{health_status=\"Progressing\"})",
          "legendFormat": "Progressing"
        }
      ]
    }
  ]
}
```

### Deployment Velocity Dashboard

Track how often deployments happen:

```promql
# Deployments per hour
sum(increase(argocd_app_sync_total{phase="Succeeded"}[1h]))

# Failed deployments per hour
sum(increase(argocd_app_sync_total{phase="Failed"}[1h]))

# Deployment success rate
sum(rate(argocd_app_sync_total{phase="Succeeded"}[24h])) /
sum(rate(argocd_app_sync_total[24h])) * 100

# Mean time between deployments per app
1 / rate(argocd_app_sync_total{phase="Succeeded"}[24h])
```

### Reconciliation Performance Dashboard

Monitor ArgoCD controller performance:

```promql
# P95 reconciliation latency
histogram_quantile(0.95, sum(rate(argocd_app_reconcile_bucket[5m])) by (le))

# P50 reconciliation latency
histogram_quantile(0.50, sum(rate(argocd_app_reconcile_bucket[5m])) by (le))

# Reconciliation error rate
rate(argocd_app_reconcile_count{result="error"}[5m]) /
rate(argocd_app_reconcile_count[5m]) * 100
```

## Prometheus Alerting Rules

Configure alerts for ArgoCD issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-alerts
  namespace: argocd
  labels:
    release: prometheus
spec:
  groups:
    - name: argocd.rules
      rules:
        # Alert when an application is OutOfSync for more than 15 minutes
        - alert: ArgoAppOutOfSync
          expr: argocd_app_info{sync_status="OutOfSync"} > 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD application {{ $labels.name }} is OutOfSync"
            description: "Application {{ $labels.name }} in project {{ $labels.project }} has been OutOfSync for more than 15 minutes."

        # Alert when an application is Degraded
        - alert: ArgoAppDegraded
          expr: argocd_app_info{health_status="Degraded"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD application {{ $labels.name }} is Degraded"
            description: "Application {{ $labels.name }} health status is Degraded."

        # Alert on sync failures
        - alert: ArgoAppSyncFailed
          expr: increase(argocd_app_sync_total{phase="Failed"}[10m]) > 0
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD sync failed for {{ $labels.name }}"

        # Alert on high reconciliation latency
        - alert: ArgoReconciliationSlow
          expr: histogram_quantile(0.95, sum(rate(argocd_app_reconcile_bucket[5m])) by (le)) > 30
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD reconciliation P95 latency exceeds 30 seconds"

        # Alert when Git fetch fails repeatedly
        - alert: ArgoGitFetchFailing
          expr: rate(argocd_git_request_total{result="error"}[15m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD Git fetch operations are failing"
```

## Managing Prometheus and Grafana with ArgoCD

Use ArgoCD to deploy the monitoring stack itself:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kube-prometheus-stack
  namespace: argocd
spec:
  project: monitoring
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 55.0.0
    helm:
      values: |
        prometheus:
          prometheusSpec:
            serviceMonitorSelector: {}
            serviceMonitorNamespaceSelector: {}
        grafana:
          dashboardProviders:
            dashboardproviders.yaml:
              apiVersion: 1
              providers:
                - name: argocd
                  orgId: 1
                  folder: ArgoCD
                  type: file
                  options:
                    path: /var/lib/grafana/dashboards/argocd
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

## Best Practices

1. **Set appropriate scrape intervals** - 30 seconds is a good balance between resolution and load.
2. **Use recording rules** for frequently queried expressions to reduce Prometheus load.
3. **Alert on trends, not spikes** - use `for` duration in alert rules to avoid false positives.
4. **Separate operational dashboards from executive dashboards** - different audiences need different views.
5. **Monitor ArgoCD resource usage** alongside application metrics to catch controller performance issues.
6. **Export metrics to a long-term store** for deployment history analysis beyond Prometheus retention.

Prometheus and Grafana give you the observability layer that ArgoCD needs for production operations. For notification integration that complements this monitoring, see [How to Configure Notifications in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view).
