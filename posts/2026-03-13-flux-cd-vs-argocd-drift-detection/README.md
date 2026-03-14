# Flux CD vs ArgoCD: Which Has Better Drift Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Drift Detection, GitOps, Kubernetes, Configuration Management, Comparison

Description: Compare configuration drift detection and alerting capabilities in Flux CD and ArgoCD, including detection latency, remediation strategies, and notification options.

---

## Introduction

Configuration drift occurs when the actual state of a Kubernetes cluster diverges from the desired state declared in Git. This can happen due to manual kubectl changes, external controllers modifying resources, or partial application failures. A GitOps tool's drift detection capability determines how quickly it detects and responds to these deviations.

Flux CD and ArgoCD differ fundamentally in their drift detection models: Flux CD uses periodic reconciliation, while ArgoCD uses an event-driven watch mechanism for near-real-time detection. Understanding these differences helps you set appropriate expectations and configure the right alerting strategy.

## Prerequisites

- Either Flux CD or ArgoCD installed on a Kubernetes cluster
- Prometheus and Alertmanager for metric-based alerting
- Understanding of Kubernetes controller patterns

## Step 1: How Flux CD Detects Drift

Flux CD detects drift through periodic reconciliation. Each Kustomization and HelmRelease has an `interval` setting that determines how often Flux fetches the source and applies it to the cluster:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m    # Reconcile every 5 minutes
  retryInterval: 2m  # Retry on failure every 2 minutes
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # Force reconciliation even if source hasn't changed
  force: false
```

Flux also watches for source changes (Git commits) and triggers immediate reconciliation when new commits are detected, without waiting for the interval. However, if manual changes are made to the cluster without touching Git, Flux will only detect and correct the drift at the next scheduled interval (up to `interval` minutes later).

To reduce drift correction latency:

```bash
# Manually trigger immediate reconciliation
flux reconcile kustomization myapp -n flux-system --with-source

# Check if drift exists
flux get kustomizations myapp -n flux-system
```

## Step 2: How ArgoCD Detects Drift

ArgoCD uses a Kubernetes controller watch to detect changes to managed resources in near-real-time:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  syncPolicy:
    automated:
      selfHeal: true      # Automatically fix drift
      prune: true         # Remove resources not in Git
    syncOptions:
      - RespectIgnoreDifferences=true
```

ArgoCD's application controller maintains watches on all managed resources. When any resource changes, ArgoCD detects the diff within seconds and can auto-sync if `selfHeal: true` is configured.

## Step 3: Configuring Drift Alerts in Flux CD

```yaml
# Alert on reconciliation failures (which indicate drift that couldn't be fixed)
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: drift-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-ops
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
  inclusionList:
    - ".*Health check failed.*"
    - ".*failed to apply.*"
  summary: "Flux drift correction failed"
```

Prometheus alert for sustained drift:

```yaml
- alert: FluxDriftDetected
  expr: |
    gotk_reconcile_condition{type="Ready", status="False"} == 1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Flux resource has been in non-Ready state for 10+ minutes"
```

## Step 4: Drift Ignore Rules

Both tools support ignoring certain fields that legitimately differ from Git state:

**Flux CD** via Kustomize strategic merge patches to ignore fields:

```yaml
# Ignore HPA-managed replica count
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  patches:
    - patch: |
        - op: add
          path: /metadata/annotations/kustomize.toolkit.fluxcd.io~1ssa-ignore-fields
          value: '{"spec.replicas": {}}'
      target:
        kind: Deployment
        name: myapp
```

**ArgoCD** via ignoreDifferences:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      name: myapp
      jsonPointers:
        - /spec/replicas  # Ignore HPA-managed replicas
    - group: ""
      kind: Service
      jsonPointers:
        - /spec/clusterIP  # Ignore auto-assigned ClusterIP
```

## Comparison Table

| Dimension | Flux CD | ArgoCD |
|---|---|---|
| Drift detection latency | Configurable interval (1m to 1h) | Near-real-time (seconds) |
| Self-healing | Yes, on next reconciliation interval | Yes, immediate with selfHeal: true |
| Manual drift check | flux reconcile command | argocd app sync or UI |
| Drift notification | Via Notification Controller | Via ArgoCD Notifications |
| Ignore rules | Kustomize annotations/patches | ignoreDifferences field |
| Prune on drift | prune: true in Kustomization | prune: true in syncPolicy |

## Best Practices

- Set Flux reconciliation intervals to 5 minutes or less for critical production applications to minimize drift correction latency.
- Enable `selfHeal: true` in ArgoCD for production applications to automatically correct drift without human intervention.
- Configure drift alerts that fire when reconciliation has been in a non-Ready state for more than a threshold period.
- Use the `ignoreDifferences` (ArgoCD) or SSA ignore annotations (Flux) to avoid false positive drift detection for fields managed by other controllers (HPA, VPA).
- Audit kubectl usage in production and require all changes to go through Git to minimize intentional drift.

## Conclusion

ArgoCD's near-real-time drift detection is a genuine advantage over Flux CD's interval-based model, especially for security-sensitive environments where manual changes must be detected and reverted quickly. For most production workloads, a 5-minute Flux reconciliation interval is acceptable. Teams requiring sub-minute drift correction should favor ArgoCD with `selfHeal: true`, while teams comfortable with interval-based correction can use either tool effectively.
