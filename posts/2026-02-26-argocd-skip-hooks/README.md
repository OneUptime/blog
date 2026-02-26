# How to Use Skip Hooks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Hooks, Deployment

Description: Learn how to use the Skip hook annotation in ArgoCD to exclude specific resources from sync operations while keeping them in your Git repository.

---

Sometimes you have resources in your Git repository that you do not want ArgoCD to sync to the cluster. Maybe it is a resource that is managed by another tool, a template that should only be applied manually, or a configuration that is environment-specific and should not be deployed everywhere.

The `Skip` hook in ArgoCD does exactly this. When you annotate a resource with `argocd.argoproj.io/hook: Skip`, ArgoCD completely ignores it during sync operations. The resource stays in your Git repository for documentation or reference, but ArgoCD will not apply it, delete it, or track its status.

## How Skip Works

The Skip annotation tells ArgoCD: "This resource exists in the repo, but pretend it does not when syncing." Specifically:

- The resource is not applied during any sync phase
- The resource is not included in diff calculations
- The resource does not affect sync status
- The resource is not pruned if it exists in the cluster
- The resource is invisible to ArgoCD's sync engine

```yaml
# This resource will be ignored by ArgoCD
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-dev-config
  annotations:
    argocd.argoproj.io/hook: Skip
data:
  environment: development
  debug: "true"
```

## When to Use Skip

### Resources Managed by Other Tools

If you have resources that are managed by Terraform, Helm outside of ArgoCD, or another operator, but you want to keep their manifests in the same repo:

```yaml
# Managed by Terraform, not ArgoCD
apiVersion: v1
kind: Secret
metadata:
  name: cloud-credentials
  annotations:
    argocd.argoproj.io/hook: Skip
type: Opaque
data:
  # Populated by Terraform
  aws-access-key: ""
  aws-secret-key: ""
```

### Environment-Specific Templates

Resources that serve as templates and should be customized before applying:

```yaml
# Template - customize before manual apply
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-config-template
  annotations:
    argocd.argoproj.io/hook: Skip
data:
  # Replace these values before applying
  custom_domain: "REPLACE_ME"
  custom_api_key: "REPLACE_ME"
```

### Resources for Manual Operations

Some resources should only be applied manually, like one-time data seeding jobs:

```yaml
# One-time data seed - run manually, not on every sync
apiVersion: batch/v1
kind: Job
metadata:
  name: seed-initial-data
  annotations:
    argocd.argoproj.io/hook: Skip
spec:
  template:
    spec:
      containers:
        - name: seed
          image: myorg/api:latest
          command: ["python", "manage.py", "seed_data", "--initial"]
      restartPolicy: Never
  backoffLimit: 1
```

### Documentation Manifests

Resources kept in the repo for documentation or as examples:

```yaml
# Example of how to create a custom resource
# This is not deployed - it is documentation
apiVersion: example.com/v1
kind: Widget
metadata:
  name: example-widget
  annotations:
    argocd.argoproj.io/hook: Skip
spec:
  size: large
  color: blue
  # Available colors: red, blue, green
  # Available sizes: small, medium, large
```

### Disabled Features

When you want to disable a feature temporarily without removing its manifests from Git:

```yaml
# Feature flag: disabled for now
# Remove the Skip annotation to enable
apiVersion: apps/v1
kind: Deployment
metadata:
  name: experimental-feature
  annotations:
    argocd.argoproj.io/hook: Skip
spec:
  replicas: 1
  selector:
    matchLabels:
      app: experimental
  template:
    metadata:
      labels:
        app: experimental
    spec:
      containers:
        - name: experimental
          image: myorg/experimental:latest
```

## Skip vs Exclude vs IgnoreDifferences

ArgoCD has several ways to handle resources you do not want to fully manage. Here is how they differ:

**Skip (hook annotation)**: Resource is completely invisible to ArgoCD sync. It is not applied, not tracked, not diffed.

**Resource exclusions (argocd-cm)**: Resources matching certain patterns are excluded from ArgoCD's discovery. They are not visible in the UI at all.

```yaml
# argocd-cm ConfigMap
data:
  resource.exclusions: |
    - apiGroups:
        - "events.k8s.io"
      kinds:
        - "Event"
      clusters:
        - "*"
```

**ignoreDifferences**: Resources are tracked and applied, but specific fields are ignored during comparison. The resource is still managed by ArgoCD.

Choose Skip when you want the resource in your repo but not managed by ArgoCD. Choose exclusions when you want entire resource types hidden from ArgoCD. Choose ignoreDifferences when ArgoCD should manage the resource but ignore certain fields.

## Skip with Other Annotations

The Skip annotation can be combined with other ArgoCD annotations, though it typically overrides them since the resource is not processed:

```yaml
metadata:
  annotations:
    # Skip overrides the sync wave since the resource is not synced
    argocd.argoproj.io/hook: Skip
    argocd.argoproj.io/sync-wave: "5"  # This has no effect
```

## Practical Pattern: Conditional Deployment with Kustomize

You can use Kustomize overlays to add or remove the Skip annotation per environment:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debug-tools
spec:
  replicas: 1
  selector:
    matchLabels:
      app: debug-tools
  template:
    metadata:
      labels:
        app: debug-tools
    spec:
      containers:
        - name: debug
          image: nicolaka/netshoot:latest
          command: ["sleep", "infinity"]
```

```yaml
# overlays/production/skip-debug.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debug-tools
  annotations:
    argocd.argoproj.io/hook: Skip
```

```yaml
# overlays/production/kustomization.yaml
resources:
  - ../../base
patchesStrategicMerge:
  - skip-debug.yaml
```

In development, the debug tools deploy normally. In production, the Skip annotation prevents deployment while keeping the manifest in the repository.

## Verifying Skip Behavior

To confirm a resource is being skipped:

```bash
# List managed resources - skipped resources will not appear
argocd app resources my-app

# Check the app diff - skipped resources will not show diffs
argocd app diff my-app
```

If the resource appears in the resource list or diff output, the Skip annotation is not being applied correctly. Check that the annotation key and value are exact: `argocd.argoproj.io/hook: Skip` (capital S).

## Removing the Skip Annotation

When you want ArgoCD to start managing a previously skipped resource, remove the annotation:

```yaml
metadata:
  annotations:
    # Remove this line to let ArgoCD manage the resource
    # argocd.argoproj.io/hook: Skip
```

On the next sync, ArgoCD will apply the resource to the cluster. If the resource already exists in the cluster (created manually or by another tool), ArgoCD will adopt it and start tracking it.

## Summary

The Skip hook is a simple but useful tool for keeping resources in your Git repository without having ArgoCD deploy them. It is ideal for templates, documentation manifests, resources managed by other tools, disabled features, and one-time manual operations. When you need more granular control over what ArgoCD ignores, consider resource exclusions for entire resource types or ignoreDifferences for specific fields.
