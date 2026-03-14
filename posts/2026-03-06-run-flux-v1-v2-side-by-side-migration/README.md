# How to Run Flux v1 and v2 Side by Side During Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Flux v1, Flux v2, Migration, GitOps, Kubernetes

Description: A practical guide to running Flux v1 and Flux v2 simultaneously in the same cluster for a safe, incremental migration.

---

Flux v1 reached end of life, but many teams still run it in production. Migrating to Flux v2 does not require a big-bang cutover. You can run both versions side by side in the same cluster, gradually moving workloads from v1 to v2. This guide covers the technical details of coexistence and provides a step-by-step migration plan.

## Key Differences Between Flux v1 and v2

Before running them together, understand the architectural differences.

| Aspect | Flux v1 | Flux v2 |
|---|---|---|
| Architecture | Single controller (fluxd) | Multiple specialized controllers |
| Namespace | Typically runs in one namespace | Runs in flux-system by default |
| Git sync | Built into fluxd | Source controller handles Git |
| Helm support | Helm Operator (separate) | Helm controller (integrated) |
| Custom Resources | HelmRelease (v1) | GitRepository, Kustomization, HelmRelease (v2) |
| Image automation | Built into fluxd annotations | Image reflector and automation controllers |
| Multi-tenancy | Limited | Native support with service accounts |

## Step 1: Verify Your Flux v1 Setup

Before adding Flux v2, document your Flux v1 configuration.

```bash
# Check Flux v1 version and namespace
kubectl get pods -n flux -l app=flux

# List Flux v1 managed namespaces
kubectl get namespaces -l fluxcd.io/sync-gc-mark

# Check Flux v1 Helm Releases
kubectl get helmreleases --all-namespaces

# Verify Flux v1 git repository configuration
kubectl get deployment flux -n flux -o jsonpath='{.spec.template.spec.containers[0].args}'
```

```bash
# Document all workloads managed by Flux v1
# These annotations indicate Flux v1 management
kubectl get deployments --all-namespaces -o json | \
  jq '.items[] | select(.metadata.annotations["fluxcd.io/automated"] == "true") | .metadata.name'
```

## Step 2: Install Flux v2 Without Conflicts

Flux v2 installs into the `flux-system` namespace by default, which does not conflict with the typical Flux v1 `flux` namespace.

```bash
# Install the Flux v2 CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify prerequisites
flux check --pre

# Bootstrap Flux v2 into the cluster
# Use a different path than Flux v1 to avoid conflicts
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-cluster/flux-v2 \
  --personal
```

Verify both are running:

```bash
# Flux v1 pods in the 'flux' namespace
kubectl get pods -n flux

# Flux v2 pods in the 'flux-system' namespace
kubectl get pods -n flux-system
```

## Step 3: Understand Resource Ownership

The critical rule for coexistence: each resource must be managed by only one Flux version at a time. Never let both Flux v1 and v2 manage the same Kubernetes resource.

```yaml
# Flux v1 manages resources through its git sync
# Flux v2 manages resources through Kustomization CRs

# BAD: Both trying to manage the same deployment
# This causes conflicts and flapping

# GOOD: Flux v1 manages service-a, Flux v2 manages service-b
# Clear ownership boundaries
```

## Step 4: Configure Flux v1 to Ignore Migrated Resources

As you migrate workloads to Flux v2, tell Flux v1 to ignore them.

```yaml
# In your Flux v1 repository, update the flux configuration
# to exclude directories that Flux v2 now manages

# Option 1: Use Flux v1's --git-path to narrow its scope
# Edit the Flux v1 deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flux
  namespace: flux
spec:
  template:
    spec:
      containers:
        - name: flux
          args:
            - --git-url=git@github.com:your-org/k8s-manifests.git
            - --git-branch=main
            # Only sync specific paths, excluding migrated services
            - --git-path=namespaces,workloads/legacy
            # Previously this was: --git-path=namespaces,workloads
            - --git-poll-interval=5m
            - --sync-garbage-collection
```

```yaml
# Option 2: Use .flux.yaml to ignore specific directories
# Place this in directories you want Flux v1 to skip

# workloads/migrated/.flux.yaml
version: 1
commandUpdated:
  generators: []
  updaters: []
# This effectively makes Flux v1 skip this directory
```

## Step 5: Migrate Workloads One at a Time

Start with low-risk workloads and move them to Flux v2 management.

```yaml
# Step 5a: Create the Flux v2 Kustomization for the workload

# clusters/my-cluster/flux-v2/apps/worker-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: worker-service
  namespace: flux-system
spec:
  interval: 5m
  # Point to the manifests in your repository
  path: ./workloads/worker-service
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: worker-service
      namespace: default
```

```bash
# Step 5b: Move the workload manifests to Flux v2 managed path
# In your git repository:

# Move from Flux v1 path to a shared path that Flux v2 references
mv workloads/worker-service workloads/migrated/worker-service

# Update Flux v1 --git-path to exclude the migrated directory
# (already done in Step 4)

# Commit and push
git add .
git commit -m "Migrate worker-service from Flux v1 to v2"
git push origin main
```

```bash
# Step 5c: Verify the migration
# Check Flux v2 has picked up the workload
flux get kustomizations

# Verify the deployment is healthy
kubectl get deployment worker-service -n default

# Confirm Flux v1 is no longer managing it
# (no sync events for worker-service in Flux v1 logs)
kubectl logs -n flux deployment/flux | grep worker-service
```

## Step 6: Migrate Flux v1 Helm Releases

Flux v1 uses the Helm Operator with its own HelmRelease CRD. Flux v2 has a different HelmRelease CRD.

```yaml
# Flux v1 HelmRelease (API: helm.fluxcd.io/v1)
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress
spec:
  releaseName: nginx-ingress
  chart:
    repository: https://kubernetes.github.io/ingress-nginx
    name: ingress-nginx
    version: 4.0.0
  values:
    controller:
      replicaCount: 2
```

Convert to Flux v2 format:

```yaml
# clusters/my-cluster/flux-v2/sources/ingress-nginx-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  url: https://kubernetes.github.io/ingress-nginx
  interval: 30m
```

```yaml
# clusters/my-cluster/flux-v2/releases/nginx-ingress.yaml
# Flux v2 HelmRelease (API: helm.toolkit.fluxcd.io/v2)
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: ingress
  chart:
    spec:
      chart: ingress-nginx
      version: "4.0.0"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
  values:
    controller:
      replicaCount: 2
  # Adopt existing resources created by Flux v1 Helm Operator
  install:
    crds: Skip
  upgrade:
    crds: Skip
```

```bash
# Migration steps for Helm releases:

# 1. Delete the Flux v1 HelmRelease CR (but NOT the deployed resources)
kubectl delete helmrelease nginx-ingress -n ingress

# 2. Ensure the Helm release still exists in the cluster
helm list -n ingress

# 3. Apply the Flux v2 HelmRelease
# Flux v2 will adopt the existing Helm release
git add clusters/my-cluster/flux-v2/releases/nginx-ingress.yaml
git commit -m "Migrate nginx-ingress HelmRelease to Flux v2"
git push origin main

# 4. Verify Flux v2 has adopted the release
flux get helmreleases -A
```

## Step 7: Migrate Image Automation

Flux v1 uses annotations for image automation. Flux v2 uses dedicated CRDs.

```yaml
# Flux v1: annotation-based image automation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    # Flux v1 automation annotations
    fluxcd.io/automated: "true"
    fluxcd.io/tag.my-app: "semver:~1.0"
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-app:1.0.5
```

Convert to Flux v2 image automation:

```yaml
# clusters/my-cluster/flux-v2/image-automation/my-app.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 1m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: "~1.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxbot
        email: flux@example.com
    push:
      branch: main
  update:
    path: ./workloads/migrated
    strategy: Setters
```

Update the deployment manifest to use Flux v2 markers instead of annotations:

```yaml
# workloads/migrated/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  # Remove Flux v1 annotations
spec:
  template:
    spec:
      containers:
        - name: my-app
          # {"$imagepolicy": "flux-system:my-app"}
          image: registry.example.com/my-app:1.0.5
```

## Step 8: Decommission Flux v1

Once all workloads are migrated to Flux v2, remove Flux v1.

```bash
# Final verification: ensure no resources are managed by Flux v1
kubectl logs -n flux deployment/flux --tail=100

# Verify all Flux v2 Kustomizations and HelmReleases are healthy
flux get all -A

# Remove Flux v1 Helm Operator if installed
kubectl delete deployment helm-operator -n flux
kubectl delete crd helmreleases.helm.fluxcd.io

# Remove Flux v1 controller
kubectl delete namespace flux

# Clean up Flux v1 CRDs
kubectl delete crd fluxhelmreleases.helm.integrations.flux.weave.works 2>/dev/null
```

## Migration Checklist

Use this checklist to track your migration progress:

```bash
# Phase 1: Preparation
# [ ] Document all Flux v1 managed resources
# [ ] Install Flux v2 CLI
# [ ] Bootstrap Flux v2 in the cluster
# [ ] Verify both versions run without conflicts

# Phase 2: Incremental Migration
# [ ] Migrate non-critical workloads first
# [ ] Migrate Helm releases (delete v1 CR, create v2 CR)
# [ ] Migrate image automation
# [ ] Update Flux v1 git-path to exclude migrated resources

# Phase 3: Verification
# [ ] All Flux v2 Kustomizations reconciling successfully
# [ ] All Flux v2 HelmReleases reconciling successfully
# [ ] Image automation working correctly
# [ ] No resources left under Flux v1 management

# Phase 4: Cleanup
# [ ] Remove Flux v1 deployment
# [ ] Remove Flux v1 CRDs
# [ ] Remove Flux v1 namespace
# [ ] Clean up unused git paths
```

## Troubleshooting Common Issues

```bash
# Issue: Both Flux versions fighting over a resource
# Solution: Check for duplicate management
kubectl get deployment <name> -o yaml | grep -A5 "annotations"
# Remove Flux v1 annotations if the resource is now under Flux v2

# Issue: Flux v2 cannot adopt a Helm release created by v1
# Solution: Ensure the release name and namespace match
helm list -A | grep <release-name>
# The Flux v2 HelmRelease metadata.name should match the Helm release name

# Issue: Flux v1 keeps recreating deleted resources
# Solution: Ensure the git-path excludes the migrated directory
kubectl get deployment flux -n flux -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n'
```

## Summary

Running Flux v1 and v2 side by side is a safe migration strategy. Install Flux v2 in a separate namespace, migrate workloads incrementally by moving manifests to Flux v2-managed paths, convert Helm releases from v1 to v2 CRD format, replace annotation-based image automation with Flux v2 image controllers, and decommission Flux v1 only after all workloads are verified under Flux v2 management.
