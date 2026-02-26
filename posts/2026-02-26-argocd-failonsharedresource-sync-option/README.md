# How to Use the 'FailOnSharedResource' Sync Option in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Options, Resource Management

Description: Learn how to use the FailOnSharedResource sync option in ArgoCD to detect and prevent conflicts when multiple applications manage the same Kubernetes resource.

---

In a multi-team Kubernetes environment, it is easy for two ArgoCD applications to accidentally manage the same resource. Maybe two teams both define a ConfigMap with the same name in the same namespace, or a shared service gets included in multiple application manifests. When this happens, the applications fight over the resource - each sync overwrites the other's changes, leading to flapping configurations and hard-to-debug issues.

The `FailOnSharedResource` sync option prevents this by making ArgoCD fail the sync if it detects that a resource it is about to apply is already managed by another ArgoCD application.

## The Shared Resource Problem

Consider this scenario. Team A has an ArgoCD application that deploys a `redis` ConfigMap to the `shared` namespace. Team B also has an application that deploys the same `redis` ConfigMap to the same namespace but with different settings.

Without `FailOnSharedResource`, both applications happily sync and overwrite each other. The ConfigMap bounces between two different configurations every time either team syncs. Both teams see their application as "Synced" right after their sync completes, but then it goes "OutOfSync" when the other team syncs.

This is a recipe for production incidents.

## How ArgoCD Tracks Resource Ownership

ArgoCD tracks which application owns each resource using labels and annotations. When ArgoCD creates or adopts a resource, it adds tracking metadata:

```yaml
# ArgoCD adds these labels to track ownership
metadata:
  labels:
    app.kubernetes.io/instance: my-app-name
  annotations:
    # Depending on the tracking method configured
    argocd.argoproj.io/tracking-id: "my-app-name:/ConfigMap:shared/redis"
```

The tracking method (label, annotation, or annotation+label) determines exactly how ArgoCD identifies which application owns a resource.

## Enabling FailOnSharedResource

Add the option to your Application manifest:

```yaml
# Application that fails if resources conflict with another app
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: team-a-services
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/team-a/services.git
    targetRevision: main
    path: k8s/
  destination:
    server: https://kubernetes.default.svc
    namespace: shared
  syncPolicy:
    syncOptions:
      - FailOnSharedResource=true
```

## What Happens When a Conflict is Detected

When `FailOnSharedResource=true` is set and ArgoCD detects that a resource is already managed by another application, the sync fails with an error message like:

```
ComparisonError: shared resource found: ConfigMap shared/redis is already managed
by application team-b-services
```

The sync stops, and no resources are applied. This fail-fast behavior lets you know about the conflict immediately rather than silently overwriting another team's configuration.

## Enabling via CLI

For a one-time sync with the option:

```bash
# Sync and fail if shared resources are found
argocd app sync team-a-services --sync-option FailOnSharedResource=true
```

## Practical Example: Multi-Team Platform

Here is a realistic scenario where this option prevents issues:

```yaml
# Team A's application - deploys their services plus shared resources
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: team-a-platform
  namespace: argocd
spec:
  project: team-a
  source:
    repoURL: https://github.com/team-a/platform.git
    targetRevision: main
    path: deploy/
  destination:
    server: https://kubernetes.default.svc
    namespace: platform
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - FailOnSharedResource=true
---
# Team B's application - accidentally includes the same RBAC resources
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: team-b-platform
  namespace: argocd
spec:
  project: team-b
  source:
    repoURL: https://github.com/team-b/platform.git
    targetRevision: main
    path: deploy/
  destination:
    server: https://kubernetes.default.svc
    namespace: platform
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - FailOnSharedResource=true
```

If both teams include the same ClusterRole or ServiceAccount in their manifests, the second application to sync will fail, alerting the teams to the conflict.

## Resolving Shared Resource Conflicts

When you hit a `FailOnSharedResource` error, you have several options:

**Option 1: Move shared resources to a dedicated application.** Create a separate ArgoCD application that owns all shared resources:

```yaml
# Dedicated application for shared infrastructure
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shared-infrastructure
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/platform-team/shared.git
    targetRevision: main
    path: shared-resources/
  destination:
    server: https://kubernetes.default.svc
    namespace: platform
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - FailOnSharedResource=true
```

Then remove the shared resources from both Team A and Team B's repositories.

**Option 2: Use ArgoCD Projects to enforce boundaries.** Configure ArgoCD projects to restrict which namespaces and resource types each team can deploy:

```yaml
# Project restricting Team A to their namespace
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  description: Team A's project
  sourceRepos:
    - https://github.com/team-a/*
  destinations:
    - namespace: team-a-*
      server: https://kubernetes.default.svc
  # Prevent teams from creating cluster-scoped resources
  clusterResourceWhitelist: []
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota
```

**Option 3: Intentionally share resources.** If two applications legitimately need to manage the same resource, you can use the `argocd.argoproj.io/managed-by` annotation to explicitly assign ownership:

```yaml
# Explicitly assign resource to one application
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-config
  namespace: platform
  annotations:
    argocd.argoproj.io/managed-by: team-a-platform
data:
  key: value
```

## Combining with Resource Tracking Methods

The effectiveness of `FailOnSharedResource` depends on your resource tracking method. ArgoCD supports three methods:

```yaml
# In argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Options: label, annotation, annotation+label
  application.resourceTrackingMethod: annotation+label
```

The `annotation+label` method is the most reliable for detecting shared resources because it uses both the label and annotation for tracking. If you are using the basic `label` tracking method, there are edge cases where shared resources might not be detected.

## When to Use FailOnSharedResource

**Multi-team environments.** Any time multiple teams deploy to the same cluster, this option prevents accidental resource conflicts.

**App of Apps patterns.** When you use the app of apps pattern, child applications should not overlap. This option catches unintentional overlap.

**Migration scenarios.** When migrating resources from one ArgoCD application to another, you can use this option to verify that the old application no longer claims the resources.

## When NOT to Use It

**Single application per namespace.** If each application has exclusive ownership of its namespace, conflicts are unlikely and this option adds unnecessary overhead.

**Intentionally shared resources.** Some patterns, like shared ConfigMaps or Secrets that multiple applications read, do not fit the exclusive ownership model.

## Debugging Shared Resource Issues

```bash
# Find which application owns a specific resource
kubectl get configmap shared-config -n platform -o yaml | grep -A 5 "argocd"

# List all resources managed by a specific application
argocd app resources team-a-platform

# Compare resources between two applications
diff <(argocd app resources team-a-platform) <(argocd app resources team-b-platform)
```

## Summary

The `FailOnSharedResource` sync option is essential for maintaining clear resource ownership in multi-team ArgoCD environments. It prevents the silent resource conflict problem where multiple applications overwrite each other's configurations. Enable it on all applications in shared clusters, and use dedicated applications for genuinely shared resources.
