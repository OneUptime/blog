# How to Migrate from Harness CD to Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Harness CD, Migration, GitOps, Kubernetes, CI/CD, Pipeline

Description: Learn how to migrate from Harness CD deployment pipelines to Flux CD GitOps for Kubernetes workloads, covering service mapping and approval workflow migration.

---

## Introduction

Harness CD is a commercial CD platform with powerful pipeline orchestration, approval gates, and built-in deployment verification. Migrating to Flux CD shifts deployment control from Harness's push model to Flux CD's GitOps pull model. While you lose Harness's visual pipeline builder, you gain a simpler, more auditable deployment model that doesn't require managing a separate CD platform.

## Prerequisites

- Harness account with CD pipelines for Kubernetes
- Kubernetes clusters with kubectl access
- Flux CD bootstrapped on target clusters
- A Git repository for fleet configuration

## Step 1: Inventory Harness Services and Environments

```bash
# Document all Harness services targeting Kubernetes
# In Harness UI: Deploy → Services → export list

# Document all environments
# In Harness UI: Deploy → Environments → export list

# Key information to capture per service:
# - Kubernetes cluster connector
# - Namespace
# - Manifest/Helm chart source
# - Deployment strategy (canary, blue-green, rolling)
# - Approval workflow requirements
# - Failure strategy
```

## Step 2: Map Harness Service to Flux Resources

**Harness Service** (Kubernetes, Helm chart):

```yaml
# Harness service configuration captures:
# - Chart name and version
# - Values files
# - Namespace
# - Connector (cluster access)
```

**Flux HelmRelease equivalent**:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: your-org-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.your-org.com
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: production
spec:
  interval: 10m
  chart:
    spec:
      chart: myapp
      version: ">=1.0.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: your-org-charts
  values:
    # Values previously in Harness service override
    replicaCount: 3
    image:
      tag: "1.5.0"
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
```

## Step 3: Map Harness Environment Overrides to Flux Patches

Harness allows environment-level value overrides. In Flux, use Kustomize overlays:

```yaml
# apps/myapp/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - patch: |
      apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      metadata:
        name: myapp
      spec:
        values:
          replicaCount: 5       # Production override
          autoscaling:
            enabled: true
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
    target:
      kind: HelmRelease
      name: myapp
```

## Step 4: Replace Harness Approval Gates

Harness approval gates pause pipelines for human approval. In Flux, use one of these approaches:

**Approach 1: Fleet Repository Pull Requests**

```bash
# CI creates a PR to update the image tag; requires human approval before merging
# Branch protection: require PR review before merging to main
# Flux reconciles after merge
```

**Approach 2: Flux Suspend/Resume with External Trigger**

```yaml
# Temporarily suspend production Kustomization
# An external approval system calls: flux resume kustomization myapp-production
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp/production
  suspend: true  # Set to false after approval
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

## Step 5: Replace Harness Deployment Verification

Harness has built-in deployment verification using metrics. Replace with Flagger:

```yaml
# Flagger Canary replaces Harness Canary deployment strategy
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 30s
```

## Step 6: Replace Harness Rollback Strategy

Harness automatic rollback can be replaced with Flux HelmRelease remediation:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
spec:
  # Automatic rollback on upgrade failure
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
      remediateLastFailure: true
  rollback:
    timeout: 5m
    disableWait: false
    cleanupOnFail: true
```

## Best Practices

- Map each Harness service to a Flux HelmRelease or Kustomization before starting the migration.
- Keep Harness in read-only mode (disable auto-deployment triggers) while Flux is validated in staging.
- Replace Harness's built-in deployment verification metrics dashboard with Prometheus + Grafana + Flagger dashboards.
- Document the cost reduction from removing Harness licenses when presenting the migration business case.
- Train operations teams on `flux` CLI commands as replacements for Harness UI actions.

## Conclusion

Migrating from Harness CD to Flux CD reduces platform complexity and licensing costs at the expense of some visual pipeline orchestration capabilities. The Flux model—where Git is the source of truth and the cluster reconciles continuously—is more reliable and auditable than push-based CD. For Kubernetes-focused organizations, Flux CD is a compelling replacement for Harness CD's Kubernetes deployment capabilities, complemented by Flagger for progressive delivery.
