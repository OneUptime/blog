# How to Configure Pod Disruption Budgets with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Pod Disruption Budget, GitOps, High Availability, PDB

Description: A practical guide to managing Pod Disruption Budgets through Flux CD for safe cluster maintenance and high availability.

---

## Introduction

Pod Disruption Budgets (PDBs) are critical Kubernetes resources that protect your applications during voluntary disruptions such as node drains, cluster upgrades, and rolling updates. By defining PDBs through Flux CD, you ensure that availability constraints are version-controlled and consistently applied across all environments.

This guide walks you through configuring PDBs with Flux CD, covering common patterns, advanced strategies, and multi-environment setups.

## Prerequisites

Before you begin, make sure you have:

- A running Kubernetes cluster (v1.26 or later)
- Flux CD v2 installed and bootstrapped
- A Git repository connected to your Flux installation
- kubectl configured to access your cluster

## Understanding Pod Disruption Budgets

PDBs specify the minimum number of pods that must remain available during voluntary disruptions. They do not protect against involuntary disruptions like hardware failures.

There are two key fields:

- `minAvailable` - The minimum number of pods that must remain available
- `maxUnavailable` - The maximum number of pods that can be unavailable

You should use one or the other, not both.

## Setting Up the Repository Structure

Organize your Git repository for PDB management:

```yaml
# clusters/my-cluster/
# kustomization.yaml references the PDB definitions
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: pod-disruption-budgets
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: default
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/pdb
  prune: true
  wait: true
```

## Basic PDB with minAvailable

This ensures at least 2 pods of your application remain running during disruptions:

```yaml
# infrastructure/pdb/web-app-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  # At least 2 pods must remain available at all times
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
```

## PDB with maxUnavailable

This allows at most 1 pod to be unavailable during disruptions:

```yaml
# infrastructure/pdb/api-server-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
  namespace: production
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  # At most 1 pod can be unavailable during disruptions
  maxUnavailable: 1
  selector:
    matchLabels:
      app: api-server
```

## Using Percentage-Based PDBs

For deployments that scale dynamically, percentages work better than absolute numbers:

```yaml
# infrastructure/pdb/worker-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
  namespace: production
spec:
  # At least 80% of worker pods must remain available
  minAvailable: "80%"
  selector:
    matchLabels:
      app: worker
      tier: backend
```

## Combining PDBs with Flux Kustomization Patches

Use Kustomize overlays to manage PDBs across different environments:

```yaml
# infrastructure/pdb/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - web-app-pdb.yaml
  - api-server-pdb.yaml
  - worker-pdb.yaml
```

```yaml
# infrastructure/pdb/base/web-app-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: web-app
```

Create environment-specific overlays:

```yaml
# infrastructure/pdb/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: PodDisruptionBudget
      name: web-app-pdb
    patch: |
      - op: replace
        path: /spec/minAvailable
        # Production requires higher availability
        value: 3
```

```yaml
# infrastructure/pdb/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: PodDisruptionBudget
      name: web-app-pdb
    patch: |
      - op: replace
        path: /spec/minAvailable
        # Staging can tolerate lower availability
        value: 1
```

## Flux Kustomization for Multi-Environment PDBs

```yaml
# clusters/production/pdb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: pdb-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/pdb/production
  prune: true
  # Wait for PDBs to be ready before proceeding
  wait: true
  # Apply PDBs before deployments
  dependsOn:
    - name: namespaces
```

## PDB for StatefulSet Workloads

StatefulSets require careful PDB configuration to maintain quorum:

```yaml
# infrastructure/pdb/database-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-pdb
  namespace: production
spec:
  # For a 3-node database cluster, keep at least 2 available
  # to maintain quorum
  minAvailable: 2
  selector:
    matchLabels:
      app: postgresql
      role: replica
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: database-primary-pdb
  namespace: production
spec:
  # Primary database should never be disrupted
  minAvailable: 1
  selector:
    matchLabels:
      app: postgresql
      role: primary
```

## Health Checks and Notifications

Configure Flux to alert you when PDB-related issues occur:

```yaml
# clusters/my-cluster/alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: pdb-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  # Watch for PDB reconciliation failures
  eventSources:
    - kind: Kustomization
      name: pod-disruption-budgets
      namespace: flux-system
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: platform-alerts
  secretRef:
    name: slack-webhook-url
```

## Validating PDB Configuration

After Flux applies the PDBs, verify they are working correctly:

```bash
# Check all PDBs in the cluster
kubectl get pdb --all-namespaces

# Verify a specific PDB status
kubectl describe pdb web-app-pdb -n production

# Check Flux reconciliation status
flux get kustomizations pod-disruption-budgets
```

## Common Pitfalls and Best Practices

### Avoid Overly Restrictive PDBs

Setting `minAvailable` equal to the replica count will block all voluntary disruptions:

```yaml
# BAD: This blocks all node drains and upgrades
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: too-restrictive-pdb
spec:
  minAvailable: 3  # Same as replica count
  selector:
    matchLabels:
      app: my-app
```

```yaml
# GOOD: Allow at least one pod to be disrupted
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: balanced-pdb
spec:
  maxUnavailable: 1  # Always allows one disruption
  selector:
    matchLabels:
      app: my-app
```

### Coordinate PDBs with Deployment Strategy

Ensure your PDB works with your deployment rolling update strategy:

```yaml
# infrastructure/apps/web-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # These values must align with the PDB
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: web-app:latest
```

## Dependency Ordering with Flux

Ensure PDBs are created before the workloads they protect:

```yaml
# clusters/my-cluster/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  # PDBs must exist before deploying apps
  dependsOn:
    - name: pod-disruption-budgets
```

## Conclusion

Pod Disruption Budgets are essential for maintaining application availability during cluster maintenance. By managing PDBs through Flux CD, you gain version control, automated reconciliation, and consistent enforcement across environments. Remember to use percentage-based values for dynamically scaling workloads, coordinate PDBs with your deployment strategy, and always test PDB behavior in staging before applying to production.
