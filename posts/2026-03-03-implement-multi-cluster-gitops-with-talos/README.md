# How to Implement Multi-Cluster GitOps with Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, GitOps, Flux, ArgoCD, Multi-Cluster

Description: A practical guide to implementing GitOps workflows across multiple Talos Linux clusters using Flux CD and ArgoCD for consistent, auditable deployments.

---

GitOps is the practice of using Git as the single source of truth for your infrastructure and application deployments. For a single cluster, this means pointing a GitOps controller at a repository and letting it reconcile the desired state. For multiple Talos Linux clusters, you need a strategy for managing what gets deployed where, how environments are promoted, and how cluster-specific configurations are handled.

This guide covers practical multi-cluster GitOps patterns using both Flux CD and ArgoCD with Talos Linux.

## Why GitOps for Multi-Cluster

Manual deployments across multiple clusters are error-prone and slow. Someone forgets to apply a change to one cluster. Configuration drift creeps in. There is no audit trail of who changed what and when.

GitOps solves these problems by making Git the authoritative source for cluster state. Every change is a pull request. Every deployment is a git commit. Every cluster continuously reconciles against the repository, ensuring drift is corrected automatically.

## Repository Structure

The first decision is how to organize your Git repository. For multi-cluster setups, a monorepo with clear directory structure works well:

```
gitops-repo/
  clusters/
    dev/
      flux-system/          # Flux bootstrap for dev cluster
      kustomization.yaml    # Points to shared + dev-specific resources
    staging/
      flux-system/
      kustomization.yaml
    prod-us/
      flux-system/
      kustomization.yaml
    prod-eu/
      flux-system/
      kustomization.yaml
  infrastructure/
    base/                   # Shared infrastructure components
      cert-manager/
      ingress-nginx/
      monitoring/
      sealed-secrets/
    overlays/
      dev/
      staging/
      prod/
  apps/
    base/                   # Shared application manifests
      api-server/
      web-frontend/
      worker/
    overlays/
      dev/
      staging/
      prod-us/
      prod-eu/
```

## Setting Up Flux CD for Multi-Cluster

Flux CD is a good fit for multi-cluster GitOps because it supports multi-tenancy and has strong Kustomize integration. Bootstrap Flux on each cluster:

```bash
# Bootstrap Flux on the dev cluster
flux bootstrap github \
  --context=dev \
  --owner=your-org \
  --repository=gitops-repo \
  --branch=main \
  --path=clusters/dev \
  --personal

# Bootstrap on prod-us
flux bootstrap github \
  --context=prod-us \
  --owner=your-org \
  --repository=gitops-repo \
  --branch=main \
  --path=clusters/prod-us \
  --personal
```

Each cluster watches its own directory in the repository. The cluster directory contains Kustomization resources that reference shared base resources with environment-specific overlays.

### Cluster Kustomization File

```yaml
# clusters/prod-us/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/overlays/prod
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  patches:
    - patch: |
        - op: add
          path: /metadata/labels/cluster
          value: prod-us
      target:
        kind: Namespace
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: infrastructure  # Apps wait for infra to be ready
  path: ./apps/overlays/prod-us
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### Shared Base with Overlays

The base directory holds the common resource definitions:

```yaml
# infrastructure/base/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: monitoring
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
```

```yaml
# infrastructure/base/monitoring/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "55.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
  values:
    prometheus:
      prometheusSpec:
        retention: 24h
```

Environment overlays customize the base:

```yaml
# infrastructure/overlays/prod/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/monitoring
patches:
  - target:
      kind: HelmRelease
      name: kube-prometheus-stack
    patch: |
      apiVersion: helm.toolkit.fluxcd.io/v2beta2
      kind: HelmRelease
      metadata:
        name: kube-prometheus-stack
      spec:
        values:
          prometheus:
            prometheusSpec:
              replicas: 2
              resources:
                requests:
                  memory: 4Gi
                  cpu: "2"
```

## Setting Up ArgoCD for Multi-Cluster

ArgoCD takes a different approach. Instead of running a controller on each cluster, you typically run a central ArgoCD instance that manages all clusters.

Install ArgoCD on a management cluster:

```bash
helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --set server.extraArgs[0]="--insecure" \
  --set configs.params."server\.insecure"=true
```

Register your Talos clusters with ArgoCD:

```bash
# Add cluster credentials
argocd cluster add dev --name dev-cluster
argocd cluster add prod-us --name prod-us-cluster
argocd cluster add prod-eu --name prod-eu-cluster

# List registered clusters
argocd cluster list
# SERVER                          NAME
# https://dev.internal:6443       dev-cluster
# https://prod-us.example.com     prod-us-cluster
# https://prod-eu.example.com     prod-eu-cluster
```

### ApplicationSets for Multi-Cluster

ArgoCD ApplicationSets let you define a template that generates Applications for each cluster:

```yaml
# appset-infrastructure.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: infrastructure
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: dev
            url: https://dev.internal:6443
            env: dev
          - cluster: prod-us
            url: https://prod-us.example.com:6443
            env: prod
          - cluster: prod-eu
            url: https://prod-eu.example.com:6443
            env: prod
  template:
    metadata:
      name: "infra-{{cluster}}"
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/gitops-repo
        targetRevision: main
        path: "infrastructure/overlays/{{env}}"
      destination:
        server: "{{url}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

This single ApplicationSet creates an ArgoCD Application for each cluster, pointing to the right overlay directory.

## Promotion Workflows

A critical part of multi-cluster GitOps is promoting changes between environments. The typical flow is: deploy to dev, validate, promote to staging, validate, promote to production.

With Flux, you can use separate branches or directories per environment and create pull requests to promote:

```bash
# After validating in dev, promote to staging
# Update the image tag in the staging overlay
cd apps/overlays/staging/api-server/
cat > kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/api-server
images:
  - name: api-server
    newTag: v2.3.1  # Promote this version
EOF

git add . && git commit -m "Promote api-server v2.3.1 to staging"
git push
```

For automated image promotion, Flux's Image Automation Controller can watch container registries and update the Git repository automatically:

```yaml
# image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: api-server
spec:
  imageRepositoryRef:
    name: api-server
  policy:
    semver:
      range: ">=2.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: api-server
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    commit:
      author:
        name: flux-bot
        email: flux@example.com
    push:
      branch: main
  update:
    path: ./apps/overlays/dev
    strategy: Setters
```

## Talos Configuration as GitOps

You can also manage Talos machine configurations through GitOps. Store your Talos configs in the same repository and use a custom controller or CI/CD pipeline to apply them:

```yaml
# talos-config/clusters/prod-us/machine-config.yaml
# This gets applied by a CI pipeline when merged
machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.6.1
  kubelet:
    extraArgs:
      rotate-server-certificates: true
```

## Monitoring GitOps Health

Track the sync status of all clusters from a central dashboard. Both Flux and ArgoCD expose metrics:

```promql
# Flux: reconciliation failures across clusters
sum by (cluster) (gotk_reconcile_condition{type="Ready",status="False"})

# ArgoCD: out-of-sync applications
sum by (dest_server) (argocd_app_info{sync_status="OutOfSync"})
```

## Summary

Multi-cluster GitOps with Talos Linux gives you consistent, auditable deployments across your entire fleet. Flux CD works well when you want each cluster to be self-managing with its own controller. ArgoCD is better when you want centralized visibility and control. Both approaches use the same Git repository patterns: shared bases with environment-specific overlays. The key is picking one approach, committing to it, and building your promotion workflows around it. Talos Linux complements GitOps perfectly because the OS itself is already configured declaratively through an API, making the entire stack - from OS to infrastructure to applications - manageable through code.
