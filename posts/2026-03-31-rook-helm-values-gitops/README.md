# How to Use Helm Values Files for Rook-Ceph GitOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Helm, GitOps, Kubernetes, Configuration Management

Description: Learn how to manage Rook-Ceph Helm deployments with versioned values files for GitOps workflows, enabling environment-specific customization and auditable configuration changes.

---

## Why Helm Values Files for GitOps

Helm values files provide a clean separation between the chart logic (maintained upstream) and your configuration (maintained in Git). This approach works well with both ArgoCD and Flux.

## Repository Structure

```text
rook-helm-gitops/
  environments/
    base-values.yaml
    staging-values.yaml
    production-values.yaml
  helmreleases/
    rook-ceph-operator.yaml
    rook-ceph-cluster.yaml
```

## Base Values File

```yaml
# environments/base-values.yaml
image:
  repository: rook/ceph
  tag: v1.14.0
  pullPolicy: IfNotPresent

crds:
  enabled: true

logLevel: INFO

monitoring:
  enabled: true

resources:
  requests:
    cpu: 200m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

tolerations: []
nodeSelector: {}
```

## Production Values Override

```yaml
# environments/production-values.yaml
# Merges with base-values.yaml

logLevel: WARNING

resources:
  requests:
    cpu: 500m
    memory: 256Mi
  limits:
    cpu: 2000m
    memory: 1Gi

nodeSelector:
  role: storage-operator

tolerations:
- key: "dedicated"
  operator: "Equal"
  value: "storage"
  effect: "NoSchedule"
```

## ArgoCD HelmRelease with Values Files

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: rook-ceph-operator
  namespace: argocd
spec:
  sources:
  - repoURL: https://charts.rook.io/release
    chart: rook-ceph
    targetRevision: v1.14.0
    helm:
      valueFiles:
      - $values/environments/base-values.yaml
      - $values/environments/production-values.yaml
  - repoURL: https://github.com/myorg/rook-helm-gitops.git
    targetRevision: main
    ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: rook-ceph
```

## Flux HelmRelease with Values Files

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  interval: 1h
  chart:
    spec:
      chart: rook-ceph
      version: v1.14.0
      sourceRef:
        kind: HelmRepository
        name: rook-ceph
  valuesFrom:
  - kind: ConfigMap
    name: rook-base-values
    valuesKey: values.yaml
  - kind: ConfigMap
    name: rook-production-values
    valuesKey: values.yaml
```

## Validating Values Before Applying

```bash
# Render the Helm chart locally with values
helm template rook-ceph rook-release/rook-ceph \
  -f environments/base-values.yaml \
  -f environments/production-values.yaml \
  --namespace rook-ceph | kubectl apply --dry-run=server -f -
```

## Tracking Values Changes in Git

```bash
git log --oneline environments/production-values.yaml
# See all changes to production values over time

git diff HEAD~1 environments/production-values.yaml
# See what changed in the last commit
```

## Summary

Using Helm values files for Rook-Ceph GitOps provides auditable, reviewable configuration with clear separation between environments. Base values define defaults, environment overrides customize them, and ArgoCD or Flux apply the merged result to the cluster ensuring GitOps-driven consistency.
