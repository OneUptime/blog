# How to Implement GitOps Observability by Monitoring Flux and ArgoCD Reconciliation Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitOps, Observability, Prometheus, Flux, ArgoCD

Description: Learn how to monitor GitOps reconciliation with Prometheus metrics from Flux and ArgoCD to track deployment health, sync failures, and reconciliation performance.

---

GitOps promises automated deployments, but how do you know it's working? Without proper observability, failed reconciliations go unnoticed, sync delays cause confusion, and troubleshooting becomes guesswork. Both Flux and ArgoCD expose detailed Prometheus metrics that give you complete visibility into your GitOps workflows.

This guide shows you how to build comprehensive GitOps observability.

## Key Metrics to Monitor

Essential metrics for GitOps health:

- **Reconciliation success rate**: Percentage of successful syncs
- **Reconciliation duration**: Time to complete sync
- **Sync failures**: Count of failed reconciliations
- **Out-of-sync resources**: Resources not matching Git state
- **Git repository fetch time**: Speed of Git operations
- **Resource apply time**: Kubernetes API performance

## Flux Metrics

Flux controllers expose metrics on port 8080 at `/metrics`.

### Discovering Flux Metrics

```bash
# Port forward to source-controller
kubectl port-forward -n flux-system svc/source-controller 8080:80

# View metrics
curl localhost:8080/metrics | grep gotk
```

### Key Flux Metrics

```prometheus
# Reconciliation duration
gotk_reconcile_duration_seconds_bucket

# Reconciliation condition (Ready status)
gotk_reconcile_condition{
  kind="Kustomization",
  name="apps",
  status="True|False|Unknown",
  type="Ready"
}

# Suspend status
gotk_suspend_status{kind="Kustomization", name="apps"}

# Git fetch duration
gotk_reconcile_duration_seconds{kind="GitRepository"}
```

## Monitoring Flux with Prometheus

Create ServiceMonitor for Flux controllers:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
spec:
  endpoints:
  - interval: 30s
    port: http-prom
    path: /metrics
  namespaceSelector:
    matchNames:
    - flux-system
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
```

### Flux Recording Rules

Create aggregate metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-recording-rules
  namespace: flux-system
spec:
  groups:
  - name: flux.rules
    interval: 30s
    rules:
    # Success rate
    - record: flux:reconcile:success:rate
      expr: |
        sum(rate(gotk_reconcile_condition{status="True",type="Ready"}[5m]))
        /
        sum(rate(gotk_reconcile_condition{type="Ready"}[5m]))

    # Average reconciliation duration
    - record: flux:reconcile:duration:avg
      expr: |
        rate(gotk_reconcile_duration_seconds_sum[5m])
        /
        rate(gotk_reconcile_duration_seconds_count[5m])

    # Failed reconciliations
    - record: flux:reconcile:failed:total
      expr: |
        sum by (namespace, name, kind) (
          gotk_reconcile_condition{status="False",type="Ready"}
        )
```

### Flux Alerting Rules

Alert on Flux problems:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-alerts
  namespace: flux-system
spec:
  groups:
  - name: flux.alerts
    interval: 1m
    rules:
    # Reconciliation failures
    - alert: FluxReconciliationFailure
      expr: |
        gotk_reconcile_condition{status="False",type="Ready"} == 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Flux reconciliation failing for {{$labels.kind}}/{{$labels.name}}"
        description: "{{$labels.kind}} {{$labels.name}} in {{$labels.namespace}} has been failing for 10 minutes"

    # Suspended resources
    - alert: FluxResourceSuspended
      expr: |
        gotk_suspend_status == 1
      for: 1h
      labels:
        severity: info
      annotations:
        summary: "Flux resource suspended: {{$labels.kind}}/{{$labels.name}}"

    # Slow reconciliation
    - alert: FluxSlowReconciliation
      expr: |
        gotk_reconcile_duration_seconds > 300
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Slow Flux reconciliation: {{$labels.kind}}/{{$labels.name}}"
        description: "Reconciliation taking longer than 5 minutes"

    # Git fetch failures
    - alert: FluxGitFetchFailure
      expr: |
        gotk_reconcile_condition{
          kind="GitRepository",
          status="False",
          type="Ready"
        } == 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Flux cannot fetch Git repository {{$labels.name}}"
```

## ArgoCD Metrics

ArgoCD exposes metrics on multiple components.

### ArgoCD Metric Endpoints

```bash
# Application controller metrics
kubectl port-forward -n argocd svc/argocd-metrics 8082:8082
curl localhost:8082/metrics

# API server metrics
kubectl port-forward -n argocd svc/argocd-server-metrics 8083:8083
curl localhost:8083/metrics

# Repo server metrics
kubectl port-forward -n argocd svc/argocd-repo-server 8084:8084
curl localhost:8084/metrics
```

### Key ArgoCD Metrics

```prometheus
# Application sync status
argocd_app_info{
  sync_status="Synced|OutOfSync",
  health_status="Healthy|Degraded|Progressing"
}

# Sync duration
argocd_app_sync_total
argocd_app_reconcile_duration_seconds

# API server requests
argocd_api_server_http_requests_total

# Repository operations
argocd_git_request_duration_seconds
argocd_git_request_total
```

## Monitoring ArgoCD with Prometheus

Create ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-metrics
  endpoints:
  - port: metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-server-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server-metrics
  endpoints:
  - port: metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-repo-server-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-repo-server
  endpoints:
  - port: metrics
```

### ArgoCD Recording Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-recording-rules
  namespace: argocd
spec:
  groups:
  - name: argocd.rules
    interval: 30s
    rules:
    # Applications out of sync
    - record: argocd:apps:outofync:count
      expr: |
        count by (namespace) (
          argocd_app_info{sync_status!="Synced"}
        )

    # Unhealthy applications
    - record: argocd:apps:unhealthy:count
      expr: |
        count by (namespace) (
          argocd_app_info{health_status!="Healthy"}
        )

    # Sync success rate
    - record: argocd:sync:success:rate
      expr: |
        rate(argocd_app_sync_total{phase="Succeeded"}[5m])
        /
        rate(argocd_app_sync_total[5m])
```

### ArgoCD Alerting Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-alerts
  namespace: argocd
spec:
  groups:
  - name: argocd.alerts
    interval: 1m
    rules:
    # Application out of sync
    - alert: ArgoCDAppOutOfSync
      expr: |
        argocd_app_info{sync_status="OutOfSync"} == 1
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "ArgoCD app out of sync: {{$labels.name}}"
        description: "Application {{$labels.name}} has been out of sync for 15 minutes"

    # Application degraded
    - alert: ArgoCDAppDegraded
      expr: |
        argocd_app_info{health_status="Degraded"} == 1
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "ArgoCD app degraded: {{$labels.name}}"
        description: "Application {{$labels.name}} is degraded"

    # Sync failures
    - alert: ArgoCDSyncFailure
      expr: |
        increase(argocd_app_sync_total{phase="Failed"}[15m]) > 0
      labels:
        severity: warning
      annotations:
        summary: "ArgoCD sync failures for {{$labels.name}}"

    # Slow Git operations
    - alert: ArgoCDSlowGitOps
      expr: |
        histogram_quantile(0.95,
          rate(argocd_git_request_duration_seconds_bucket[5m])
        ) > 30
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Slow Git operations in ArgoCD"
        description: "95th percentile Git request duration is {{$value}}s"
```

## Grafana Dashboards

### Flux Dashboard

Create a Grafana dashboard:

```json
{
  "dashboard": {
    "title": "Flux GitOps Overview",
    "panels": [
      {
        "title": "Reconciliation Success Rate",
        "targets": [
          {
            "expr": "flux:reconcile:success:rate * 100"
          }
        ]
      },
      {
        "title": "Failed Reconciliations",
        "targets": [
          {
            "expr": "sum by (kind, name) (flux:reconcile:failed:total)"
          }
        ]
      },
      {
        "title": "Reconciliation Duration",
        "targets": [
          {
            "expr": "gotk_reconcile_duration_seconds"
          }
        ]
      },
      {
        "title": "Suspended Resources",
        "targets": [
          {
            "expr": "sum by (kind, name) (gotk_suspend_status)"
          }
        ]
      }
    ]
  }
}
```

### ArgoCD Dashboard

```json
{
  "dashboard": {
    "title": "ArgoCD GitOps Overview",
    "panels": [
      {
        "title": "Application Health",
        "targets": [
          {
            "expr": "sum by (health_status) (argocd_app_info)"
          }
        ]
      },
      {
        "title": "Sync Status",
        "targets": [
          {
            "expr": "sum by (sync_status) (argocd_app_info)"
          }
        ]
      },
      {
        "title": "Sync Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(argocd_app_reconcile_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Custom Metrics

Add custom metrics to your applications:

```go
// Example: Custom Flux exporter
package main

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    deploymentsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "flux_deployments_total",
            Help: "Total number of deployments",
        },
        []string{"app", "environment"},
    )
)

func recordDeployment(app, env string) {
    deploymentsTotal.WithLabelValues(app, env).Inc()
}
```

## Logging Integration

Combine metrics with logs:

```yaml
# Loki datasource in Grafana
# Link logs to metrics
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus:9090
    - name: Loki
      type: loki
      url: http://loki:3100
      derivedFields:
        - name: TraceID
          matcherRegex: "reconciler group=(\\S+) namespace=(\\S+) name=(\\S+)"
          url: "$${__value.raw}"
```

## Distributed Tracing

Add OpenTelemetry for detailed traces:

```yaml
# Example: Flux with OpenTelemetry
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
      - name: manager
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://jaeger-collector:4317"
        - name: OTEL_SERVICE_NAME
          value: "flux-source-controller"
```

## Best Practices

1. **Monitor both success and failure**: Track what works, not just failures
2. **Set appropriate thresholds**: Balance between noise and missed issues
3. **Use recording rules**: Pre-aggregate expensive queries
4. **Correlate metrics and logs**: Link related observability data
5. **Dashboard per team**: Create focused views for different audiences
6. **Alert on trends**: Catch degrading performance before failure
7. **Document runbooks**: Link alerts to troubleshooting procedures

## Conclusion

Comprehensive GitOps observability transforms deployment automation from a black box into a transparent, debuggable system. Monitor reconciliation metrics to catch failures immediately, track performance trends to prevent degradation, and build dashboards that give your team confidence in automated deployments. Start with basic success rate and failure metrics, then expand to detailed performance analysis and custom business metrics as your GitOps practice matures.
