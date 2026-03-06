# How to Fix 'conflict' Error When Multiple Kustomizations Manage Same Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kustomization, Kubernetes, Troubleshooting, GitOps, Server-Side Apply, Conflict Resolution

Description: A guide to resolving field ownership conflicts when multiple Flux CD Kustomizations manage the same Kubernetes resource using server-side apply and force configuration.

---

## Introduction

When multiple Flux CD Kustomizations attempt to manage the same Kubernetes resource, you will encounter "conflict" errors. This happens because Kubernetes server-side apply tracks field ownership, and when two different managers try to set the same field, a conflict is raised. This guide explains why these conflicts occur and provides multiple strategies to resolve them.

## Understanding the Error

The conflict error typically appears in the Kustomization status:

```bash
# Check the Kustomization status
kubectl get kustomization -n flux-system my-app -o yaml
```

```yaml
status:
  conditions:
    - type: Ready
      status: "False"
      reason: ReconciliationFailed
      message: |
        Apply failed: conflict with "flux-system/other-kustomization"
        for Deployment/default/my-app: .spec.replicas
```

This tells you that two Kustomizations are both trying to set the `spec.replicas` field on the same Deployment.

## Understanding Server-Side Apply and Field Ownership

Kubernetes server-side apply tracks which controller or user owns each field of a resource. When Flux applies a resource via a Kustomization, the field manager is set to the Kustomization name. If another Kustomization tries to set the same field, Kubernetes rejects the change.

```bash
# View field managers on a resource
kubectl get deployment my-app -n default -o yaml | grep -A 5 "managedFields"

# More readable output showing field ownership
kubectl get deployment my-app -n default -o json | \
  jq '.metadata.managedFields[] | {manager: .manager, fields: .fieldsV1}'
```

## Common Cause 1: Overlapping Resource Paths

Two Kustomizations include the same resource manifest in their paths.

### Example of Incorrect Configuration

```yaml
---
# Kustomization A includes everything in ./base
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: base-infra
  namespace: flux-system
spec:
  interval: 10m
  path: ./base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
# Kustomization B also includes resources from ./base
# via a kustomization.yaml that references ../base
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-overlay
  namespace: flux-system
spec:
  interval: 10m
  path: ./overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

If `./overlays/production/kustomization.yaml` includes `../../base` as a resource, both Flux Kustomizations will try to manage the same resources.

### Fix: Restructure to Avoid Overlap

```yaml
---
# Only one Kustomization should manage the final overlay
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  # Point directly to the overlay that includes the base
  path: ./overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Remove the separate Kustomization for `./base` since it is already included via the overlay.

## Common Cause 2: HPA and Deployment Replica Conflict

A very common scenario is when a Deployment sets `spec.replicas` and a HorizontalPodAutoscaler (HPA) also manages the replica count.

### Diagnosing the Issue

```bash
# Check if an HPA is managing the same deployment
kubectl get hpa -n default

# Check the deployment's managed fields
kubectl get deployment my-app -n default -o json | \
  jq '.metadata.managedFields[] | select(.fieldsV1 | has("f:spec") ) | .manager'
```

### Fix: Remove replicas from the Deployment

```yaml
# Do not set replicas in the Deployment when using HPA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  # Do NOT set replicas here when HPA manages scaling
  # replicas: 3  # Remove this line
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:v1.0.0
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80
```

## Common Cause 3: Multiple Kustomizations Setting Different Fields

Sometimes two Kustomizations legitimately need to manage different fields of the same resource.

### Fix: Use Force Apply

You can configure a Kustomization to force apply, which takes over field ownership:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Force apply takes over ownership of conflicting fields
  force: true
```

**Warning**: Using `force: true` means this Kustomization will take ownership of all fields it manages, potentially overriding changes from other controllers. Use this with caution.

## Common Cause 4: Conflict with kubectl Apply

If someone manually applied a resource with `kubectl apply`, the field manager is set to `kubectl`. When Flux then tries to manage the same fields, a conflict occurs.

### Diagnosing the Issue

```bash
# Check for kubectl as a field manager
kubectl get deployment my-app -n default -o json | \
  jq '.metadata.managedFields[] | .manager' | sort -u
```

If you see `kubectl` alongside a Flux manager, there is a conflict.

### Fix: Transfer Ownership to Flux

```bash
# Option 1: Apply with server-side apply using Flux's field manager
kubectl apply --server-side --field-manager=flux-system/my-app \
  --force-conflicts -f deployment.yaml

# Option 2: Delete and let Flux recreate
kubectl delete deployment my-app -n default
# Then trigger Flux reconciliation
flux reconcile kustomization my-app -n flux-system
```

## Strategy: Split Resources Between Kustomizations

The cleanest approach is to ensure each resource is managed by exactly one Kustomization.

### Repository Structure

```text
clusters/
  production/
    infrastructure.yaml    # Kustomization for infra
    apps.yaml             # Kustomization for apps

infrastructure/
  namespaces/             # Managed by infrastructure Kustomization
    production.yaml
  network-policies/       # Managed by infrastructure Kustomization
    default-deny.yaml

apps/
  my-app/                 # Managed by apps Kustomization
    deployment.yaml
    service.yaml
    ingress.yaml
```

### Kustomization Configuration

```yaml
---
# Infrastructure manages cluster-level resources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
# Apps manages application resources only
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

## Using Field Manager Annotations

You can use annotations to control which fields Flux manages:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  annotations:
    # Tell Flux to not manage specific fields
    kustomize.toolkit.fluxcd.io/ssa: "IfNotPresent"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:v1.0.0
```

The `IfNotPresent` SSA option tells Flux to only set fields that are not already present, avoiding conflicts with other managers.

### SSA Options

```yaml
# Merge: default behavior, merges fields (may cause conflicts)
kustomize.toolkit.fluxcd.io/ssa: "Merge"

# IfNotPresent: only sets fields that do not already exist
kustomize.toolkit.fluxcd.io/ssa: "IfNotPresent"

# Ignore: Flux will not apply this resource at all
kustomize.toolkit.fluxcd.io/ssa: "Ignore"
```

## Debugging Workflow

```bash
# Step 1: Identify the conflicting field from the error message
kubectl get kustomization -n flux-system -o yaml | grep -A 3 "conflict"

# Step 2: Check who owns the conflicting field
kubectl get <resource-type> <resource-name> -n <namespace> -o json | \
  jq '.metadata.managedFields'

# Step 3: List all Kustomizations to find overlaps
flux tree kustomization --all -n flux-system

# Step 4: Check if multiple Kustomizations reference the same path
kubectl get kustomization -n flux-system -o custom-columns=NAME:.metadata.name,PATH:.spec.path

# Step 5: After fixing, reconcile the affected Kustomization
flux reconcile kustomization my-app -n flux-system

# Step 6: Verify the conflict is resolved
kubectl get kustomization -n flux-system my-app
```

## Conclusion

Conflict errors in Flux CD arise from field ownership disputes in Kubernetes server-side apply. The best approach is to design your repository structure so that each resource is managed by exactly one Kustomization. When overlaps are unavoidable, use `force: true` cautiously, leverage SSA annotations like `IfNotPresent` for shared resources, and remove fields that are managed by other controllers (such as replica counts managed by HPA). Always check `managedFields` on the conflicting resource to understand which controllers are competing for ownership.
