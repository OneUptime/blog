# How to Migrate from Flux Helm Operator to Flux v2 Helm Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Helm, Migration, Kubernetes, GitOps, Helm operator, Helm Controller

Description: A practical guide to migrating your Helm-based workloads from the legacy Flux Helm Operator to the Flux v2 Helm Controller.

---

## Introduction

The Flux Helm Operator was a core component of Flux v1 that managed Helm chart releases declaratively. With Flux v2, the Helm Operator has been replaced by the **Helm Controller**, which is part of the new modular Flux architecture. This guide walks you through migrating your existing HelmRelease custom resources from the v1 format to the v2 format.

## Understanding the Key Differences

Before migrating, it is important to understand the architectural changes between Flux v1 Helm Operator and Flux v2 Helm Controller.

### Flux v1 Helm Operator

- Used a single `HelmRelease` CRD under `helm.fluxcd.io/v1`
- Chart sources were defined inline within the HelmRelease
- Managed its own Git and Helm repository access

### Flux v2 Helm Controller

- Uses a new `HelmRelease` CRD under `helm.toolkit.fluxcd.io/v2`
- Chart sources are separate objects (`HelmRepository`, `GitRepository`)
- Works alongside Source Controller for repository management

## Prerequisites

Before starting the migration, ensure you have the following:

- A running Kubernetes cluster with Flux v1 Helm Operator installed
- `flux` CLI v2 installed
- `kubectl` access to the cluster
- A Git repository for your Flux v2 configuration

```bash
# Install the Flux v2 CLI

curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the CLI version
flux --version

# Check prerequisites for your cluster
flux check --pre
```

## Step 1: Export Existing Flux v1 HelmReleases

Start by exporting all existing HelmRelease resources from your cluster.

```bash
# List all v1 HelmReleases across namespaces
kubectl get helmreleases.helm.fluxcd.io --all-namespaces

# Export a specific HelmRelease to YAML
kubectl get helmrelease.helm.fluxcd.io my-app \
  -n default -o yaml > my-app-v1-helmrelease.yaml
```

A typical Flux v1 HelmRelease looks like this:

```yaml
# Flux v1 HelmRelease format (helm.fluxcd.io/v1)
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  releaseName: my-app
  chart:
    repository: https://charts.example.com
    name: my-app
    version: 1.2.3
  values:
    replicaCount: 3
    image:
      repository: myregistry/my-app
      tag: latest
    service:
      type: ClusterIP
      port: 80
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 100m
        memory: 128Mi
```

## Step 2: Install Flux v2 Components

Install Flux v2 components, then stop the Flux v1 Helm Operator before applying converted HelmReleases. The old Helm Operator and the new Helm Controller ignore each other's custom resources, but if both controllers manage the same Helm release at the same time they can fight over it.

```bash
# Bootstrap Flux v2 into the cluster
flux install \
  --namespace=flux-system \
  --components=source-controller,helm-controller

# Verify Flux v2 components are running
flux check

# Stop the v1 Helm Operator before applying converted HelmReleases
kubectl scale deployment helm-operator -n flux --replicas=0
```

## Step 3: Create HelmRepository Sources

In Flux v2, chart repositories are managed as separate `HelmRepository` resources. Create one for each Helm repository referenced in your v1 HelmReleases.

```yaml
# helmrepository.yaml
# Defines the Helm chart repository as a source for Flux v2
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: example-charts
  namespace: flux-system
spec:
  # The URL of the Helm chart repository
  url: https://charts.example.com
  # How often to fetch the repository index
  interval: 10m
  # Optional: authentication for private repositories
  # secretRef:
  #   name: helm-repo-credentials
```

```bash
# Apply the HelmRepository resource
kubectl apply -f helmrepository.yaml

# Verify the repository is ready
kubectl get helmrepository -n flux-system
```

## Step 4: Convert HelmRelease Resources

Now convert each Flux v1 HelmRelease to the Flux v2 format. The key changes are:

- API version changes from `helm.fluxcd.io/v1` to `helm.toolkit.fluxcd.io/v2`
- Chart specification now references a `HelmRepository` source
- Value overrides structure remains similar but lives under `spec.values`

```yaml
# my-app-helmrelease.yaml
# Flux v2 HelmRelease format (helm.toolkit.fluxcd.io/v2)
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  # Reconciliation interval
  interval: 5m
  # Optional: explicit release name (defaults to metadata.name unless targetNamespace is set)
  releaseName: my-app
  chart:
    spec:
      # Chart name from the repository
      chart: my-app
      # Chart version (supports semver ranges)
      version: "1.2.3"
      # Reference to the HelmRepository source
      sourceRef:
        kind: HelmRepository
        name: example-charts
        namespace: flux-system
      # How often to check for new chart versions
      interval: 10m
  # Helm values (same structure as v1)
  values:
    replicaCount: 3
    image:
      repository: myregistry/my-app
      tag: latest
    service:
      type: ClusterIP
      port: 80
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 100m
        memory: 128Mi
```

## Step 5: Handle Git-Based Charts

If your v1 HelmRelease referenced a chart from a Git repository, you need to create a `GitRepository` source instead.

```yaml
# Flux v1 Git-based chart reference
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app-git
  namespace: default
spec:
  chart:
    git: ssh://git@github.com/org/charts-repo
    ref: main
    path: ./charts/my-app
```

Convert this to use a `GitRepository` source with Flux v2:

```yaml
# gitrepository.yaml
# Source definition for a Git-based chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: charts-repo
  namespace: flux-system
spec:
  url: ssh://git@github.com/org/charts-repo
  ref:
    branch: main
  interval: 5m
  secretRef:
    name: git-credentials
---
# my-app-git-helmrelease.yaml
# HelmRelease referencing a chart from a GitRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app-git
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: ./charts/my-app
      sourceRef:
        kind: GitRepository
        name: charts-repo
        namespace: flux-system
      interval: 10m
  values:
    replicaCount: 2
```

## Step 6: Migrate Upgrade and Rollback Policies

Flux v2 provides more granular control over upgrades and rollbacks.

```yaml
# HelmRelease with upgrade and rollback configuration
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: example-charts
        namespace: flux-system
  # Install configuration
  install:
    # Create the namespace if it does not exist
    createNamespace: true
    # Remediation settings for failed installs
    remediation:
      retries: 3
  # Upgrade configuration
  upgrade:
    # Clean up new resources created during a failed upgrade
    cleanupOnFail: true
    # Remediation settings for failed upgrades
    remediation:
      retries: 3
      # Automatically rollback on failure
      strategy: rollback
  # Rollback configuration
  rollback:
    # Clean up new resources created during a failed rollback
    cleanupOnFail: true
  # Uninstall configuration
  uninstall:
    keepHistory: false
  values:
    replicaCount: 3
```

## Step 7: Test the Migration

Apply the new v2 HelmRelease while the v1 Helm Operator is stopped, and verify it works correctly before removing the v1 version. When the Helm Controller first sees an existing release, it performs an upgrade to bring its bookkeeping in line with the v2 API.

```bash
# Apply the v2 HelmRelease
kubectl apply -f my-app-helmrelease.yaml

# Check the status of the v2 HelmRelease
flux get helmreleases -n default

# Verify the Helm release in the cluster
helm list -n default

# Check for any errors in the Helm Controller logs
kubectl logs -n flux-system deploy/helm-controller --tail=50
```

## Step 8: Remove Flux v1 HelmReleases

Once the v2 HelmRelease is working, remove the old v1 resource while the v1 Helm Operator is still stopped.

```bash
# Delete the v1 HelmRelease
kubectl delete helmrelease.helm.fluxcd.io my-app -n default

# Verify the v1 HelmRelease is gone
kubectl get helmreleases.helm.fluxcd.io --all-namespaces
```

## Step 9: Uninstall Flux v1 Helm Operator

After all HelmReleases have been migrated, remove the Flux v1 Helm Operator and the old HelmRelease CRD.

```bash
# Remove the v1 HelmRelease CRD
kubectl delete crd helmreleases.helm.fluxcd.io

# Delete the stopped Helm Operator deployment
kubectl delete deployment helm-operator -n flux

# Clean up the old flux namespace if no longer needed
kubectl delete namespace flux
```

## Migration Checklist

Use this checklist to track your migration progress:

1. Export all Flux v1 HelmReleases
2. Install Flux v2 controllers
3. Stop the Flux v1 Helm Operator before applying converted HelmReleases
4. Create HelmRepository and GitRepository sources
5. Convert each HelmRelease to v2 format
6. Configure upgrade and rollback policies
7. Test each converted HelmRelease
8. Delete Flux v1 HelmReleases
9. Uninstall Flux v1 Helm Operator
10. Update CI/CD pipelines to use Flux v2 CLI
11. Update documentation and runbooks

## Troubleshooting Common Issues

### Chart Not Found

If the Helm Controller cannot find the chart, verify the HelmRepository is synced:

```bash
# Check HelmRepository status
kubectl get helmrepository -n flux-system -o wide

# Force a reconciliation
flux reconcile source helm example-charts -n flux-system
```

### Release Already Exists

If you see a "release already exists" error, the Helm release may have been created by the v1 operator but the v2 HelmRelease does not match it. Make sure `spec.releaseName`, and `spec.targetNamespace` or `spec.storageNamespace` if you use them, match the existing release.

```bash
# Verify existing Helm releases
helm list -n default

# Check if the release name matches between v1 and v2 HelmRelease specs
kubectl get helmrelease.helm.toolkit.fluxcd.io my-app -n default -o jsonpath='{.spec.releaseName}'
```

## Conclusion

Migrating from the Flux Helm Operator to the Flux v2 Helm Controller involves converting your HelmRelease resources and separating chart source definitions. The v2 architecture provides better separation of concerns, more granular control over release lifecycle, and improved observability. Take a methodical approach by migrating one release at a time, testing thoroughly, and only removing the v1 operator after all releases have been successfully migrated.
