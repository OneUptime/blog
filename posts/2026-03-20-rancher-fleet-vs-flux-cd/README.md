# Rancher Fleet vs Flux CD: GitOps Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, Flux-cd, GitOps, Kubernetes, Comparison

Description: A comprehensive comparison of Rancher Fleet and Flux CD for GitOps-based Kubernetes management, focusing on multi-cluster support, tooling, and operational experience.

## Overview

Flux CD and Rancher Fleet are both popular GitOps tools for Kubernetes, but they approach the problem from different angles. Flux is a CNCF-graduated project with a modular toolkit and strong integration with the Kubernetes ecosystem. Fleet is SUSE Rancher's purpose-built GitOps engine optimized for large-scale multi-cluster management. This guide helps you evaluate which fits your needs.

## What Is Flux CD?

Flux CD is a CNCF-graduated GitOps tool built from multiple controllers. Common controllers include Source Controller, Kustomize Controller, Helm Controller, and Notification Controller, with optional image-reflector-controller and image-automation-controller components for image automation. Each controller is independent and composable. Flux integrates with Helm, Kustomize, and OCI registries, and is widely used across the Kubernetes ecosystem.

## What Is Rancher Fleet?

Fleet is SUSE Rancher's GitOps engine, designed specifically for managing applications across large numbers of clusters from a central management plane with downstream agents. It uses a bundle model and integrates natively with Rancher for authentication, RBAC, and cluster targeting.

## Feature Comparison

| Feature | Fleet | Flux CD |
|---|---|---|
| CNCF Status | Not a CNCF project | Graduated |
| Multi-cluster Model | Central manager + downstream agents | Commonly one install per cluster; can also target remote clusters |
| Helm Support | Yes | Yes (Helm Controller) |
| Kustomize Support | Yes | Yes (Kustomize Controller) |
| OCI Registry Support | Yes | Yes |
| Image Automation | Experimental (Image Scan) | Yes (optional image-reflector-controller + image-automation-controller) |
| Notification / Alerting | No dedicated notification controller | Yes (Notification Controller) |
| UI | Via Rancher | No built-in UI (ecosystem UIs available) |
| RBAC | Kubernetes/Rancher | Kubernetes native |
| Drift Detection | Yes | Yes |
| Multi-tenancy | Namespaces/RBAC | Kubernetes RBAC and impersonation |
| Air-gap Support | Yes | Yes |
| CLI | fleet CLI | flux CLI |

## Flux Toolkit Architecture

```text
┌─────────────────────────────────┐
│         Flux Controllers         │
│  ┌──────────────────────────┐   │
│  │  Source Controller        │   │ ← Watches Git, Helm, OCI
│  │  Kustomize Controller     │   │ ← Applies Kustomize overlays
│  │  Helm Controller          │   │ ← Manages Helm releases
│  │  Notification Controller  │   │ ← Sends alerts
│  │  Image Controllers        │   │ ← Optional; updates image refs in Git
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

## Defining GitOps Resources

### Fleet GitRepo

```yaml
# Fleet: sync a Git repo to clusters labeled env=staging

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: webapp
  namespace: fleet-default
spec:
  repo: https://github.com/myorg/webapp-config
  branch: main
  targets:
    - name: staging
      clusterSelector:
        matchLabels:
          env: staging
```

### Flux GitRepository + Kustomization

```yaml
# Flux Step 1: Define the Git source
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/webapp-config
  ref:
    branch: main
---
# Flux Step 2: Apply the Kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: webapp
  targetNamespace: webapp # namespace must already exist or be defined in ./staging
```

## Helm Management

### Fleet with Helm

```yaml
# fleet.yaml in chart directory
helm:
  repo: https://charts.myorg.com
  chart: webapp
  version: 1.2.3
  values:
    replicaCount: 2
    image:
      tag: v1.2.3
```

### Flux Helm Controller

```yaml
# Flux HelmRelease (assumes a HelmRepository named myorg-charts exists in this namespace)
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: webapp
  namespace: webapp
spec:
  interval: 5m
  chart:
    spec:
      chart: webapp
      version: '>=1.2.0 <2.0.0'
      sourceRef:
        kind: HelmRepository
        name: myorg-charts
  values:
    replicaCount: 2
```

## Image Automation

Flux has a more mature image automation story, while Fleet offers an experimental Image Scan feature. Flux can monitor container registries for new image tags and automatically update Git with the new image references:

```yaml
# Flux ImagePolicy - select latest semver image
# assumes an ImageRepository named webapp-repo exists in flux-system
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: webapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: webapp-repo
  policy:
    semver:
      range: '>=1.0.0'
```

## Multi-cluster with Flux

Flux multi-cluster management commonly uses one Flux installation per cluster and a central management repository, but Flux can also reconcile resources to remote clusters using `.spec.kubeConfig` on resources such as `Kustomization` and `HelmRelease`. This works well but requires more planning.

Fleet's multi-cluster management is centralized by design - a Fleet manager runs in the management cluster while each downstream cluster runs a Fleet agent.

## When to Choose Fleet

- You run Rancher and want tight integration
- Large-scale multi-cluster management
- Centralized cluster targeting with label-based routing
- Simplified centralized operations from a management cluster

## When to Choose Flux CD

- CNCF-graduation and community support are important factors
- Mature image automation (auto-updating image tags in Git) is needed
- Modular, composable tooling is preferred
- You use Weave GitOps or other Flux-compatible UIs
- Notification to Slack, Teams, or PagerDuty is required

## Conclusion

Flux CD and Fleet are both mature, capable GitOps tools. Flux wins on modularity, CNCF backing, and ecosystem integrations, especially its more mature image automation. Fleet wins on centralized operations in Rancher environments and large-scale multi-cluster management. Teams using Rancher should default to Fleet for cluster configuration management. Teams looking for a standalone CNCF-backed GitOps solution should evaluate Flux.
