# How to Handle Resource Tracking Conflicts in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Management, Troubleshooting

Description: Learn how to identify, diagnose, and resolve resource tracking conflicts in ArgoCD when multiple applications attempt to manage the same Kubernetes resources.

---

Resource tracking conflicts are one of the most common headaches in ArgoCD environments that manage more than a handful of applications. They happen when two or more ArgoCD applications claim ownership of the same Kubernetes resource. When this occurs, you get unpredictable sync behavior, endless OutOfSync states, and resources that flip-flop between configurations. In this guide, we will walk through why these conflicts happen, how to detect them, and the practical steps to fix them.

## What Causes Resource Tracking Conflicts

ArgoCD uses a tracking mechanism to know which resources belong to which application. By default, it uses labels to tag each resource with the owning application's name. When two applications define or reference the same resource (same name, kind, namespace), both try to claim ownership. This is a tracking conflict.

Common scenarios that trigger conflicts include:

- Two applications deploying the same ConfigMap or Secret
- An umbrella application and a child application both managing a Namespace resource
- Migrating an application from one ArgoCD Application definition to another without cleaning up the old one
- Using shared CRDs or ClusterRoles across multiple applications

## Understanding ArgoCD Tracking Methods

ArgoCD supports three resource tracking methods, and each behaves differently when conflicts arise.

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Options: label, annotation, annotation+label
  application.resourceTrackingMethod: annotation
```

**Label-based tracking** (default) uses the `app.kubernetes.io/instance` label. This is the simplest approach but also the most conflict-prone because labels are visible and easily overwritten.

**Annotation-based tracking** stores ownership data in the `argocd.argoproj.io/tracking-id` annotation. This reduces conflicts with external tools that might set the `app.kubernetes.io/instance` label.

**Annotation+Label tracking** uses both. The annotation is the source of truth, while the label is maintained for backward compatibility.

## Detecting Resource Tracking Conflicts

The first sign of a tracking conflict is usually an application stuck in OutOfSync status or resources appearing in multiple applications. You can check for conflicts using the CLI.

```bash
# List all resources managed by a specific application
argocd app resources my-app --output json | jq '.[] | {kind, name, namespace}'

# Check which application owns a specific resource
kubectl get deployment my-deployment -n production \
  -o jsonpath='{.metadata.labels.app\.kubernetes\.io/instance}'

# For annotation-based tracking, check the annotation instead
kubectl get deployment my-deployment -n production \
  -o jsonpath='{.metadata.annotations.argocd\.argoproj\.io/tracking-id}'
```

You can also find conflicts by searching for resources claimed by multiple applications.

```bash
# Find all resources with ArgoCD tracking annotations
kubectl get all -n production \
  -o custom-columns="NAME:.metadata.name,TRACKED-BY:.metadata.annotations.argocd\.argoproj\.io/tracking-id"

# Look for resources with mismatched labels and annotations
kubectl get configmap shared-config -n production -o yaml | \
  grep -E "(app.kubernetes.io/instance|tracking-id)"
```

## Resolving Tracking Conflicts

### Strategy 1: Remove the Resource from One Application

The cleanest fix is to ensure only one application manages the resource. Remove the duplicate resource definition from one of the applications.

```yaml
# In the application that should NOT own the resource,
# exclude it from sync using resource exclusions
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-secondary
spec:
  source:
    repoURL: https://github.com/org/repo
    path: manifests/
  ignoreDifferences:
    - group: ""
      kind: ConfigMap
      name: shared-config
      jsonPointers:
        - /data
```

### Strategy 2: Use Shared Resource Annotations

For resources that genuinely need to be referenced by multiple applications, you can mark them as shared.

```yaml
# Mark a resource as shared so ArgoCD does not enforce single ownership
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-config
  namespace: production
  annotations:
    # Tell ArgoCD this resource is managed externally
    argocd.argoproj.io/managed-by: external
```

### Strategy 3: Move Shared Resources to a Dedicated Application

Create a separate ArgoCD Application that owns all shared resources. Other applications reference them but do not include them in their manifests.

```yaml
# shared-resources application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shared-resources
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/shared-resources
    targetRevision: main
    path: shared/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: false  # Be cautious with shared resources
      selfHeal: true
```

### Strategy 4: Switch Tracking Methods

If you are experiencing conflicts because external tools set the `app.kubernetes.io/instance` label, switching to annotation-based tracking eliminates the clash.

```yaml
# Update argocd-cm to use annotation-based tracking
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation+label
```

After switching, you need to force a sync on all affected applications so ArgoCD applies the new tracking annotations.

```bash
# Force refresh and sync all applications after changing tracking method
argocd app list -o name | while read app; do
  argocd app get "$app" --refresh
  argocd app sync "$app" --force
done
```

## Preventing Conflicts with Project Policies

ArgoCD Projects can help prevent conflicts by restricting which namespaces and resource kinds each application can target.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-alpha
  namespace: argocd
spec:
  destinations:
    - namespace: alpha-*
      server: https://kubernetes.default.svc
  # Deny ClusterRole and ClusterRoleBinding to avoid cluster-level conflicts
  clusterResourceBlacklist:
    - group: rbac.authorization.k8s.io
      kind: ClusterRole
    - group: rbac.authorization.k8s.io
      kind: ClusterRoleBinding
  namespaceResourceWhitelist:
    - group: "*"
      kind: "*"
```

## Using the FailOnSharedResource Sync Option

ArgoCD provides a built-in safety net. The `FailOnSharedResource` sync option will cause a sync to fail if any resource in the application is already tracked by another application.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  syncPolicy:
    syncOptions:
      - FailOnSharedResource=true
```

This does not fix conflicts automatically, but it prevents silent overwrites. When a sync fails due to this option, you get a clear error message telling you which resource is shared and which application already owns it.

## Diagnosing Conflicts in the ArgoCD UI

In the ArgoCD UI, tracking conflicts often manifest as:

1. Resources showing a yellow warning icon
2. Sync results with "shared resource" warnings
3. Applications stuck in "OutOfSync" despite having correct manifests

Navigate to the application's resource tree and look for resources with unexpected ownership labels. The diff view will often show the tracking label or annotation as a changed field.

## Handling Conflicts During Migration

When migrating resources between applications, follow this sequence to avoid conflicts:

```bash
# Step 1: Remove the resource from the old application without pruning
argocd app sync old-app --prune=false

# Step 2: Remove the resource definition from the old app's Git source
# (commit and push)

# Step 3: Wait for the old app to reconcile and release ownership
argocd app get old-app --refresh
argocd app wait old-app --sync

# Step 4: Add the resource to the new application's Git source
# (commit and push)

# Step 5: Sync the new application
argocd app sync new-app
```

Skipping any of these steps, or doing them out of order, will create a tracking conflict.

## Monitoring for Conflicts with Prometheus

You can set up alerts for tracking conflicts using ArgoCD's built-in Prometheus metrics.

```yaml
# Prometheus alert rule for shared resource warnings
groups:
  - name: argocd-tracking
    rules:
      - alert: ArgocdResourceTrackingConflict
        expr: argocd_app_sync_total{phase="Error"} > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ArgoCD sync errors detected - possible tracking conflict"
          description: "Application {{ $labels.name }} has sync errors that may indicate a resource tracking conflict."
```

For deeper monitoring of your ArgoCD environment, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-09-argocd-resource-tracking/view) to track deployment health and detect tracking issues before they cascade.

## Key Takeaways

Resource tracking conflicts in ArgoCD are preventable if you follow these principles:

- Ensure each Kubernetes resource is owned by exactly one ArgoCD Application
- Use annotation-based tracking to avoid label collisions with external tools
- Enable `FailOnSharedResource=true` on applications to catch conflicts early
- Move genuinely shared resources into a dedicated application
- Use ArgoCD Projects to enforce namespace and resource boundaries between teams
- Follow a deliberate migration sequence when moving resources between applications

By building these habits into your GitOps workflow, you can avoid the confusion and downtime that tracking conflicts create.
