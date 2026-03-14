# How to Install Crossplane with Flux HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, GitOps, Kubernetes, HelmRelease, Infrastructure as Code

Description: Install Crossplane using a Flux HelmRelease for fully GitOps-managed infrastructure provisioning on Kubernetes.

---

## Introduction

Crossplane extends Kubernetes with the ability to provision and manage cloud infrastructure using familiar Kubernetes APIs. Rather than running `helm install` manually, you can declare Crossplane as a HelmRelease in your Git repository and let Flux CD reconcile it continuously. This approach treats your infrastructure control plane the same way you treat application deployments: version-controlled, auditable, and automatically reconciled.

The combination of Flux and Crossplane creates a powerful GitOps-native infrastructure platform. Any change to the Crossplane version, configuration, or provider settings flows through a pull request, gets reviewed, and is applied automatically. Drift from the desired state is corrected without manual intervention.

This guide walks through bootstrapping Crossplane on a Kubernetes cluster using Flux HelmRelease, establishing the foundation for all subsequent cloud resource provisioning.

## Prerequisites

- A Kubernetes cluster (v1.26 or later)
- Flux CD bootstrapped on the cluster (`flux bootstrap`)
- `kubectl` configured to access the cluster
- A Git repository that Flux is tracking

## Step 1: Create the Crossplane Namespace

Crossplane runs in its own namespace. Define it declaratively so Flux manages it.

```yaml
# infrastructure/crossplane/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: crossplane-system
  labels:
    # Allow Flux to manage resources in this namespace
    app.kubernetes.io/managed-by: flux
```

## Step 2: Add the Crossplane Helm Repository Source

Create a Flux HelmRepository resource pointing to the official Crossplane chart repository.

```yaml
# infrastructure/crossplane/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: crossplane-stable
  namespace: flux-system
spec:
  # Official Crossplane Helm chart repository
  url: https://charts.crossplane.io/stable
  # Flux checks for new chart versions every 10 minutes
  interval: 10m
```

## Step 3: Create the Crossplane HelmRelease

Define the HelmRelease that installs Crossplane into the cluster.

```yaml
# infrastructure/crossplane/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: crossplane
  namespace: crossplane-system
spec:
  interval: 10m
  chart:
    spec:
      chart: crossplane
      # Pin to a specific version for reproducibility
      version: "1.15.x"
      sourceRef:
        kind: HelmRepository
        name: crossplane-stable
        namespace: flux-system
  values:
    # Enable leader election for high availability
    leaderElection: true
    # Resource limits for the Crossplane pod
    resourcesCrossplane:
      limits:
        cpu: 500m
        memory: 512Mi
      requests:
        cpu: 100m
        memory: 256Mi
    # Resource limits for the RBAC manager
    resourcesRBACManager:
      limits:
        cpu: 100m
        memory: 128Mi
      requests:
        cpu: 50m
        memory: 64Mi
```

## Step 4: Create a Flux Kustomization

Wire the Crossplane manifests together using a Flux Kustomization.

```yaml
# clusters/my-cluster/infrastructure/crossplane.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crossplane
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/crossplane
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for all resources to become ready before marking healthy
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: crossplane
      namespace: crossplane-system
    - apiVersion: apps/v1
      kind: Deployment
      name: crossplane-rbac-manager
      namespace: crossplane-system
```

## Step 5: Commit and Push to Git

```bash
# Stage the new files
git add infrastructure/crossplane/ clusters/my-cluster/infrastructure/crossplane.yaml

# Commit with a descriptive message
git commit -m "feat: add Crossplane HelmRelease managed by Flux"

# Push to trigger Flux reconciliation
git push origin main
```

## Step 6: Verify the Installation

```bash
# Watch Flux reconcile the Kustomization
flux get kustomization crossplane --watch

# Check that Crossplane pods are running
kubectl get pods -n crossplane-system

# Verify the HelmRelease status
flux get helmrelease crossplane -n crossplane-system
```

Expected output for the pods:
```plaintext
NAME                                       READY   STATUS    RESTARTS   AGE
crossplane-7d9c4b8f6-xk9p2                1/1     Running   0          2m
crossplane-rbac-manager-5b4f7d6c8-mj3q1   1/1     Running   0          2m
```

## Best Practices

- Pin the Crossplane chart version with a semantic version constraint (e.g., `1.15.x`) to receive patch updates automatically while preventing unexpected major version jumps.
- Place the HelmRepository in `flux-system` namespace and the HelmRelease in `crossplane-system` to keep source and release objects organized.
- Use Flux health checks on the Crossplane deployments so dependent Kustomizations (for providers, compositions) wait until Crossplane is fully ready.
- Set resource requests and limits on Crossplane pods to prevent runaway resource consumption in shared clusters.
- Use `prune: true` on the Kustomization so removing manifests from Git removes the corresponding Kubernetes objects.

## Conclusion

You now have Crossplane installed and managed entirely through Flux CD. Every configuration change, version update, or value override goes through Git, giving you a full audit trail and the ability to roll back by reverting a commit. The next step is to deploy cloud providers so Crossplane can begin provisioning real infrastructure resources.
