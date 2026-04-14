# How to Manage Dapr CRDs with GitOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GitOps, ArgoCD, Flux, Kubernetes

Description: Manage Dapr CRDs using GitOps tools like ArgoCD and Flux to ensure Dapr components, configurations, and subscriptions are version-controlled and automatically reconciled.

---

## Why GitOps for Dapr CRDs

Dapr Component, Configuration, Resiliency, and Subscription CRDs are configuration that belongs in version control. GitOps tools like ArgoCD and Flux watch Git repositories and automatically reconcile the desired state to the cluster, ensuring Dapr components are consistently deployed across environments.

## Repository Structure for Dapr CRDs

Organize your Dapr manifests in a structured GitOps repository:

```text
gitops-repo/
  clusters/
    production/
      dapr/
        components/
          statestore.yaml
          pubsub.yaml
          secretstore.yaml
        configuration/
          appconfig.yaml
        resiliency/
          resiliency.yaml
        subscriptions/
          orders-sub.yaml
    staging/
      dapr/
        ...
```

## ArgoCD Application for Dapr CRDs

Create an ArgoCD Application that syncs Dapr CRDs from Git:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dapr-components-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops-repo
    targetRevision: main
    path: clusters/production/dapr
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

ArgoCD will automatically apply any changes merged to the `main` branch.

## Flux GitRepository and Kustomization

For Flux-based GitOps:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gitops-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/gitops-repo
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: dapr-components
  namespace: flux-system
spec:
  interval: 5m
  path: "./clusters/production/dapr"
  prune: true
  sourceRef:
    kind: GitRepository
    name: gitops-repo
  healthChecks:
  - apiVersion: dapr.io/v1alpha1
    kind: Component
    name: statestore
    namespace: default
```

## Kustomize Overlays for Environments

Use Kustomize to manage environment-specific component values:

```yaml
# base/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

```yaml
# overlays/production/statestore-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  metadata:
  - name: redisHost
    value: "redis-master.redis-prod.svc.cluster.local:6379"
  - name: enableTLS
    value: "true"
```

## Making Changes Through Git

To update a Dapr component in production:

```bash
# Edit the component
vim clusters/production/dapr/components/statestore.yaml

# Commit and push
git add clusters/production/dapr/components/statestore.yaml
git commit -m "Update Redis host for statestore component"
git push origin main

# ArgoCD/Flux detects the change and syncs automatically
# Monitor sync status
argocd app sync dapr-components-production
argocd app wait dapr-components-production
```

## Validating Changes Before Merge

Add a CI pipeline step to validate Dapr CRDs before merging:

```yaml
# .github/workflows/validate.yaml
- name: Validate Dapr CRDs
  run: |
    kubectl apply --dry-run=server \
      -f clusters/production/dapr/ \
      --context staging
```

## Summary

GitOps-managed Dapr CRDs provide audit trails, automated reconciliation, and environment-specific configuration through Kustomize overlays. Use ArgoCD or Flux to watch your CRD repository and automatically apply changes, with `selfHeal` enabled to prevent manual kubectl edits from drifting out of sync with Git. Run dry-run validation in CI before merging CRD changes to production clusters.
