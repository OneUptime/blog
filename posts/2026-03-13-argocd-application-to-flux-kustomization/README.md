# How to Map ArgoCD Application to Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Migration, Kustomization, GitOps, Kubernetes

Description: Learn how to convert ArgoCD Application manifests to Flux CD GitRepository and Kustomization resources for GitOps migration.

---

## Introduction

The ArgoCD Application is the primary unit of deployment in ArgoCD. It defines the source repository, target cluster, destination namespace, and sync policy. Flux CD splits this concept into two resources: a Source (GitRepository, HelmRepository, or OCIRepository) and a Kustomization or HelmRelease that defines what to deploy and how.

This guide provides a systematic mapping of ArgoCD Application fields to Flux CD equivalents, with concrete before-and-after YAML examples.

## Prerequisites

- An ArgoCD Application to migrate
- A Flux CD fleet repository bootstrapped
- `flux` CLI installed
- kubectl access to the target cluster

## Step 1: Understand the Conceptual Mapping

```plaintext
ArgoCD Application                    Flux CD Resources
─────────────────────────────────     ─────────────────────────────────────
spec.source.repoURL          ──►      GitRepository.spec.url
spec.source.targetRevision   ──►      GitRepository.spec.ref.branch/tag
spec.source.path             ──►      Kustomization.spec.path
spec.destination.namespace   ──►      Kustomization.spec.targetNamespace
spec.syncPolicy.automated    ──►      Kustomization.spec.interval
spec.syncPolicy.prune        ──►      Kustomization.spec.prune
spec.ignoreDifferences       ──►      Kustomization patches / SSA annotations
```

## Step 2: Basic Application to Kustomization

**Before (ArgoCD Application)**:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/your-org/fleet-repo
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

**After (Flux CD Resources)**:

```yaml
# GitRepository source
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/fleet-repo
  ref:
    branch: main
  secretRef:
    name: flux-system
---
# Kustomization (equivalent to the Application)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m           # replaces automated.selfHeal interval
  path: ./apps/myapp     # replaces spec.source.path
  prune: true            # replaces automated.prune
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp # replaces destination.namespace
```

Note: Unlike ArgoCD's `CreateNamespace=true`, Flux does not have a built-in flag to auto-create namespaces. Instead, include a `Namespace` manifest in your source path, or create a separate Kustomization that deploys the namespace before the application resources.

## Step 3: Application with Source Repository Auth

**ArgoCD**: Repository credentials are managed in the ArgoCD secrets:

```bash
argocd repo add https://github.com/your-org/private-repo \
  --username git \
  --password $PAT
```

**Flux CD**: Credentials are a Kubernetes Secret referenced by the GitRepository:

```yaml
# Create the secret
kubectl create secret generic github-credentials \
  --from-literal=username=git \
  --from-literal=password=$GITHUB_PAT \
  --namespace=flux-system

# Reference in GitRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: private-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/private-repo
  ref:
    branch: main
  secretRef:
    name: github-credentials
```

## Step 4: Application with ignoreDifferences

**ArgoCD**:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas  # Ignore HPA-managed replicas
```

**Flux CD equivalent**: The recommended approach is to simply omit the `spec.replicas` field from your Deployment manifest entirely. When the replicas field is not present in the source manifest, Flux will not manage it, and the HPA will control the replica count without conflict.

```yaml
# In your Deployment manifest (apps/myapp/deployment.yaml)
# Simply remove the spec.replicas field:
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  # replicas: 3  <-- Remove this line; let HPA manage it
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
```

If you cannot remove the replicas field from the source manifest, you can use a kustomize patch to strip it:

```yaml
# apps/myapp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
patches:
  - patch: |
      - op: remove
        path: /spec/replicas
    target:
      kind: Deployment
      name: myapp
```

## Step 5: Application with Health Checks

**ArgoCD** uses custom health check Lua scripts. **Flux CD** uses standard Kubernetes readiness and availability conditions:

```yaml
# Flux Kustomization with health checks
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # Flux waits for these resources to be healthy
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      namespace: myapp
    - apiVersion: apps/v1
      kind: StatefulSet
      name: myapp-db
      namespace: myapp
  timeout: 5m  # Fail if not healthy within this time
```

## Step 6: Verify the Converted Kustomization

```bash
# Commit the new Flux resources
git add clusters/production/apps/myapp.yaml
git commit -m "feat: convert myapp ArgoCD Application to Flux Kustomization"
git push

# Verify Flux picks it up
flux get kustomizations myapp -n flux-system

# Check reconciliation status
flux events --for Kustomization/myapp -n flux-system

# Verify resources are still running
kubectl get all -n myapp
```

## Best Practices

- Reuse a single GitRepository source across multiple Kustomizations when they all point to the same fleet repository.
- Use `dependsOn` in Flux Kustomizations to model ordering relationships that ArgoCD sync waves provided.
- Set `timeout` on Kustomizations so that slow rollouts don't block the reconciliation queue indefinitely.
- Migrate one Application at a time, verifying health before moving to the next.
- After converting, run both ArgoCD (suspended) and Flux for a short period to compare state before deleting the ArgoCD Application.

## Conclusion

The conversion from ArgoCD Application to Flux Kustomization is straightforward for most applications. The split into a separate Source and Kustomization resource is more verbose but provides better composability-one GitRepository source can serve many Kustomizations. The migration effort is primarily in the health check and ignoreDifferences mappings, which require understanding Flux's different approach to resource health and field management.
