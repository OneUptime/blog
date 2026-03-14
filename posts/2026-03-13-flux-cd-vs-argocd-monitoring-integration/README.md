# Flux CD vs ArgoCD: Which Has Better Monitoring Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Monitoring, Prometheus, Grafana, Observability, GitOps, Comparison

Description: Compare monitoring and observability integrations in Flux CD and ArgoCD, covering Prometheus metrics, Grafana dashboards, and alerting capabilities.

---

## Introduction

Observability into your GitOps tool is essential for understanding deployment health, diagnosing reconciliation failures, and capacity planning. Both Flux CD and ArgoCD expose Prometheus metrics and provide Grafana dashboards, but they differ in the depth of metrics, built-in dashboard quality, and how events are surfaced to operations teams.

This post compares the monitoring story for both tools to help platform teams understand what they can observe and alert on.

## Prerequisites

- Prometheus and Grafana deployed in your cluster
- Either Flux CD or ArgoCD installed
- ServiceMonitor CRDs available (via kube-prometheus-stack)

## Step 1: Flux CD Metrics

Flux controllers expose Prometheus metrics on port 8080:

```yaml
# ServiceMonitor for all Flux controllers
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
  labels:
    release: kube-prometheus-stack
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
  endpoints:
    - port: http-prom
      interval: 30s
```

Key Flux metrics:

```
# Kustomization reconciliation duration
gotk_reconcile_duration_seconds{kind="Kustomization", name="myapp", namespace="flux-system"}

# Number of resources managed
gotk_resource_info{kind="Kustomization", exported_namespace="myapp", ready="True"}

# Helm release reconciliation duration  
gotk_reconcile_duration_seconds{kind="HelmRelease", name="nginx"}

# Source fetch duration
gotk_reconcile_duration_seconds{kind="GitRepository", name="fleet-repo"}
```

## Step 2: ArgoCD Metrics

ArgoCD exposes metrics from two endpoints: the application controller and the API server:

```yaml
# ServiceMonitor for ArgoCD
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
```

Key ArgoCD metrics:

```
# Application sync status
argocd_app_info{name="myapp", project="production", sync_status="Synced", health_status="Healthy"}

# Sync operation duration
argocd_app_sync_total{name="myapp", phase="Succeeded"}

# Repo server request duration
argocd_repo_pending_requests_total
```

## Step 3: Grafana Dashboards

**Flux CD** provides official Grafana dashboards:
- Flux Cluster Stats: overall reconciliation health
- Flux Control Plane: controller-level metrics

Import from Grafana.com dashboard IDs: 16714 and 16715.

**ArgoCD** provides official dashboards via the ArgoCD Helm chart or separate dashboard JSON. The ArgoCD dashboard includes application health overview, sync history, and cluster resource counts.

## Comparison Table

| Capability | Flux CD | ArgoCD |
|---|---|---|
| Prometheus metrics | Yes, all controllers | Yes, app controller + API server |
| Official Grafana dashboards | Yes (Grafana.com) | Yes (bundled with Helm chart) |
| Alert rules | Community-provided | Community-provided |
| Event streaming | Kubernetes Events | Kubernetes Events + UI audit log |
| Tracing | Limited | Limited |
| UI-based health view | No (no UI) | Yes, built-in application health |

## Step 4: Alerting Rules for Flux CD

```yaml
# PrometheusRule for Flux CD
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux.rules
      rules:
        - alert: FluxReconciliationFailure
          expr: |
            max(gotk_reconcile_condition{type="Ready", status="False"}) by (kind, name, namespace) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Flux reconciliation failure: {{ $labels.kind }}/{{ $labels.name }}"

        - alert: FluxReconciliationSlow
          expr: |
            gotk_reconcile_duration_seconds{quantile="0.99"} > 300
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux reconciliation is slow for {{ $labels.kind }}/{{ $labels.name }}"
```

## Best Practices

- Deploy the kube-prometheus-stack Helm chart to get Prometheus, Grafana, and Alertmanager in one package.
- Create separate Grafana dashboards for each application team showing their specific Kustomization or Application metrics.
- Alert on `gotk_reconcile_condition{status="False"}` for Flux and `argocd_app_info{health_status!="Healthy"}` for ArgoCD as your primary production alert.
- Correlate Flux/ArgoCD reconciliation events with application-level metrics to identify the root cause of degradations.
- Use Flux notifications or ArgoCD notifications to bridge GitOps events into your existing incident management workflow.

## Conclusion

Both Flux CD and ArgoCD have solid Prometheus and Grafana integration. ArgoCD's built-in UI provides an additional observability layer that Flux CD lacks, making it easier for non-SRE team members to understand deployment state at a glance. For teams investing in Prometheus-based monitoring, both tools provide equivalent metric depth; the choice comes down to whether you need the built-in UI health view.
