# How to Implement GitOps for Dapr with Flux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Flux, GitOps, Kubernetes, DevOps

Description: Learn how to implement GitOps for Dapr applications using Flux v2 to automatically reconcile Dapr components, configurations, and workloads from a Git repository.

---

Flux v2 is a CNCF-graduated GitOps tool that continuously syncs Kubernetes cluster state with Git repositories. For Dapr applications, Flux manages Dapr components, Configuration resources, and application deployments through declarative GitRepository and Kustomization sources.

## Install Flux CLI and Bootstrap

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify prerequisites
flux check --pre

# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=myorg \
  --repository=dapr-fleet \
  --branch=main \
  --path=clusters/production \
  --personal
```

## Repository Structure

```bash
dapr-fleet/
├── clusters/
│   └── production/
│       ├── flux-system/           # Flux components (auto-generated)
│       ├── sources/
│       │   └── dapr-gitops.yaml   # GitRepository source
│       └── kustomizations/
│           ├── dapr-components.yaml
│           ├── dapr-config.yaml
│           └── apps.yaml
├── infrastructure/
│   └── dapr/
│       ├── components/
│       │   ├── pubsub.yaml
│       │   └── state-store.yaml
│       └── config/
│           └── dapr-config.yaml
└── apps/
    └── order-service/
        ├── deployment.yaml
        └── kustomization.yaml
```

## Define a GitRepository Source

```yaml
# clusters/production/sources/dapr-gitops.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: dapr-gitops
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/dapr-fleet
  ref:
    branch: main
  secretRef:
    name: flux-system
```

## Kustomization for Dapr Components

```yaml
# clusters/production/kustomizations/dapr-components.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: dapr-components
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/dapr/components
  prune: true
  sourceRef:
    kind: GitRepository
    name: dapr-gitops
  targetNamespace: production
  timeout: 2m
  healthChecks:
  - apiVersion: dapr.io/v1alpha1
    kind: Component
    name: pubsub
    namespace: production
```

## Kustomization for Applications with Dependency

```yaml
# clusters/production/kustomizations/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: dapr-gitops
  dependsOn:
  - name: dapr-components
  - name: dapr-config
  targetNamespace: production
```

## Image Automation for Continuous Deployment

```yaml
# Automatically update image tags when new images are pushed
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: order-service
  namespace: flux-system
spec:
  image: myrepo/order-service
  interval: 1m

---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: order-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: order-service
  policy:
    semver:
      range: '>=1.0.0'
```

## Monitoring Flux Reconciliation

```bash
# Watch Flux reconciliation status
flux get all

# Check kustomization health
flux get kustomizations

# Reconcile immediately (skip the interval wait)
flux reconcile source git dapr-gitops
flux reconcile kustomization dapr-components

# View events for troubleshooting
kubectl events -n flux-system --for=Kustomization/dapr-components
```

## Summary

Flux v2 implements GitOps for Dapr through GitRepository sources and Kustomization reconcilers. Use `dependsOn` to ensure Dapr components are deployed before applications. Flux's image automation controllers enable fully automated CD by updating deployment manifests when new container images are published to your registry.
