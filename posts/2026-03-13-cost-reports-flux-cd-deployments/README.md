# Cost Reports for Flux CD Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, cost-management, kubernetes, finops, gitops, opencost

Description: Learn how to generate cost reports for Flux CD-managed deployments using OpenCost and Prometheus, enabling FinOps visibility into GitOps-driven infrastructure.

---

## Introduction

Understanding the cost of individual deployments is crucial for engineering teams practicing FinOps. When you manage dozens or hundreds of applications through Flux CD, it can be challenging to attribute Kubernetes resource costs to specific deployments, teams, or GitOps sources. Cost visibility enables teams to optimize resource requests, identify wasteful workloads, and make informed decisions about scaling.

OpenCost is the open-source standard for Kubernetes cost monitoring. When combined with Flux CD labels and annotations, you can break down costs by Flux Kustomization, HelmRelease, or GitRepository source—giving you direct visibility into how much each GitOps-managed deployment costs per hour, day, or month.

This guide covers deploying OpenCost via Flux, configuring cost allocation by Flux deployment labels, and querying cost reports for specific deployments.

## Prerequisites

- Kubernetes cluster with Flux CD v2 bootstrapped
- Prometheus running in the cluster (kube-prometheus-stack recommended)
- `kubectl` access
- Cloud provider pricing configured (or on-premises pricing model)

## Step 1: Deploy OpenCost via Flux HelmRelease

Install OpenCost using a Flux-managed HelmRelease for GitOps-driven cost monitoring.

```yaml
# infrastructure/opencost/helmrepository.yaml
# Flux HelmRepository for the OpenCost Helm chart
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: opencost
  namespace: flux-system
spec:
  interval: 24h
  url: https://opencost.github.io/opencost-helm-chart
---
# infrastructure/opencost/helmrelease.yaml
# Flux HelmRelease deploying OpenCost for Kubernetes cost monitoring
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: opencost
  namespace: opencost
spec:
  interval: 10m
  chart:
    spec:
      chart: opencost
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: opencost
        namespace: flux-system
  values:
    opencost:
      prometheus:
        # Point OpenCost to your Prometheus instance
        internal:
          enabled: false
        external:
          enabled: true
          url: http://prometheus-operated.monitoring.svc.cluster.local:9090
      # Configure cloud provider pricing
      cloudProvider:
        # Use 'aws', 'gcp', 'azure', or 'custom'
        provider: "aws"
    # Enable the OpenCost UI
    ui:
      enabled: true
```

## Step 2: Label Flux-Managed Resources for Cost Attribution

Ensure Flux deployments include labels that OpenCost can use for cost breakdown.

```yaml
# infrastructure/my-app/helmrelease.yaml
# HelmRelease with cost attribution labels for FinOps reporting
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-application
  namespace: production
  labels:
    # Cost attribution labels visible in OpenCost reports
    team: platform
    environment: production
    cost-center: engineering
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    # Propagate cost labels to pod templates for per-pod cost attribution
    podLabels:
      team: platform
      environment: production
      cost-center: engineering
      flux-kustomization: my-application
```

## Step 3: Query Cost Reports via OpenCost API

Use the OpenCost API to generate cost reports broken down by Flux deployment.

```bash
# Port-forward to OpenCost service
kubectl port-forward -n opencost svc/opencost 9090:9090 &

# Get total cluster cost for the last 7 days
curl -s "http://localhost:9090/allocation/compute?window=7d" | \
  jq '.data[0] | to_entries | sort_by(-.value.totalCost) | .[0:10][] | {name: .key, cost: .value.totalCost}'

# Get costs broken down by team label
curl -s "http://localhost:9090/allocation/compute?window=7d&aggregate=label:team" | \
  jq '.data[0] | to_entries[] | {team: .key, cost: (.value.totalCost | . * 100 | round / 100)}'

# Get costs for a specific namespace (corresponding to a Flux deployment)
curl -s "http://localhost:9090/allocation/compute?window=7d&aggregate=namespace&filter=namespace:production" | \
  jq '.data[0]'

# Get daily cost breakdown for the last 30 days
curl -s "http://localhost:9090/allocation/compute?window=30d&step=1d&aggregate=label:flux-kustomization" | \
  jq '.data[] | to_entries[] | {kustomization: .key, daily_cost: .value.totalCost}'
```

## Step 4: Create Cost Report Prometheus Alerts

Set up alerts when deployment costs exceed defined thresholds.

```yaml
# infrastructure/monitoring/cost-alerts.yaml
# PrometheusRule alerting when namespace costs exceed budget thresholds
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-budget-alerts
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: cost.budgets
    rules:
    # Alert when a namespace's hourly cost exceeds $5
    - alert: NamespaceCostBudgetExceeded
      expr: |
        sum by (namespace) (
          node_namespace_pod_container:container_cpu_usage_seconds_total:sum_rate
          * on(node) group_left() node_total_hourly_cost
        ) > 5
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Namespace {{ $labels.namespace }} cost exceeds budget"
        description: "Estimated hourly cost for {{ $labels.namespace }} is ${{ $value | humanize }}"
```

## Best Practices

- Add `team`, `environment`, and `cost-center` labels to all Flux HelmRelease and Kustomization resources for accurate cost attribution
- Propagate labels from HelmReleases to pod templates using `podLabels` in Helm values to enable per-workload cost tracking
- Set monthly cost budgets per namespace or team and alert when they are exceeded
- Review cost reports weekly to identify pods with overprovisioned CPU/memory requests
- Use OpenCost's efficiency metrics to find pods consuming less than 50% of their requested resources

## Conclusion

Combining OpenCost with Flux CD deployment labels gives your team direct visibility into the cost of each GitOps-managed deployment. By labeling Flux resources with team and environment metadata and propagating those labels to pods, you can generate accurate cost reports that break down spending by deployment, team, or cost center. This FinOps visibility helps engineering teams make informed decisions about resource optimization and enables accountability for cloud spending at the deployment level.
