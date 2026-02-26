# How to Use the argocd.argoproj.io/sync-options Annotation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Options, Configuration

Description: Master the ArgoCD sync-options annotation to control pruning, validation, apply strategies, and resource-level sync behavior for precise deployment management.

---

The `argocd.argoproj.io/sync-options` annotation gives you resource-level control over how ArgoCD syncs individual Kubernetes resources. While Application-level sync options apply to everything in the application, this annotation lets you customize behavior for specific resources - preventing certain resources from being pruned, using different apply strategies for different resource types, or skipping validation for resources that do not conform to strict schemas.

## Annotation syntax

The annotation accepts a comma-separated list of key=value pairs:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=false,ServerSideApply=true,Validate=false
```

You can also set sync options at the Application level in the `spec.syncPolicy.syncOptions` field, but the resource-level annotation takes precedence for that specific resource.

## Available sync options

### Prune=false

Prevents ArgoCD from deleting this resource when it is removed from Git:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-storage
  namespace: production
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 100Gi
  storageClassName: gp3-retain
```

When you remove this PVC from your Git repository and sync, ArgoCD will not delete it from the cluster. The resource becomes "orphaned" from ArgoCD's perspective but continues to exist.

**Use cases:**
- PersistentVolumeClaims with critical data
- Namespaces that should persist even if the application is removed
- Resources shared between applications
- Resources that were migrated to management by another tool

```yaml
# Protect a Namespace from pruning
apiVersion: v1
kind: Namespace
metadata:
  name: production-critical
  annotations:
    argocd.argoproj.io/sync-options: Prune=false

---
# Protect a ConfigMap that is referenced by resources outside this app
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-config
  namespace: shared
  annotations:
    argocd.argoproj.io/sync-options: Prune=false
data:
  CLUSTER_NAME: production-us-east
  REGION: us-east-1
```

### Delete=false

Prevents ArgoCD from deleting this resource during cascade application deletion:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: important-data
  annotations:
    argocd.argoproj.io/sync-options: Prune=false,Delete=false
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 500Gi
```

The difference between Prune and Delete:
- **Prune=false**: Resource is not deleted when removed from Git (during sync)
- **Delete=false**: Resource is not deleted when the Application itself is deleted (during cascade delete)

For maximum protection, use both:

```yaml
annotations:
  argocd.argoproj.io/sync-options: Prune=false,Delete=false
```

### ServerSideApply=true

Uses Kubernetes server-side apply instead of client-side apply:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: managed-by-multiple
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=true
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
        - name: app
          image: myorg/app:v1.0.0
```

**When to use ServerSideApply:**

- Resources managed by multiple controllers (ArgoCD + HPA changing replicas)
- Large ConfigMaps or Secrets that exceed annotation size limits
- Resources with fields set by admission webhooks
- CRDs with complex schemas that cause client-side apply issues

```yaml
# HPA changes replicas, ArgoCD manages the rest of the Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: autoscaled-app
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=true
spec:
  # Do NOT set replicas here - let HPA manage it
  selector:
    matchLabels:
      app: autoscaled-app
  template:
    metadata:
      labels:
        app: autoscaled-app
    spec:
      containers:
        - name: app
          image: myorg/app:v1.0.0
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
```

### Replace=true

Uses `kubectl replace` instead of `kubectl apply`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-import
  annotations:
    argocd.argoproj.io/sync-options: Replace=true
spec:
  template:
    spec:
      containers:
        - name: import
          image: myorg/importer:v1.0.0
      restartPolicy: Never
```

**When to use Replace:**

- Immutable resources that cannot be patched (Jobs, some ConfigMaps)
- Resources where you want a clean replacement rather than a merge
- Fixing resources that are in a broken state and need complete recreation

Note: Replace deletes and recreates the resource, causing a brief moment where the resource does not exist. Do not use it for Services or Deployments in production.

### Validate=false

Skips Kubernetes schema validation for this resource:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-config
  annotations:
    argocd.argoproj.io/sync-options: Validate=false
data:
  config.yaml: |
    # Complex nested configuration
    # that might not pass strict validation
    server:
      port: 8080
```

**When to use:**

- Custom Resource Definitions with non-standard schemas
- Resources generated by CMP plugins that include non-standard fields
- Temporary workaround for schema validation bugs

Use sparingly - validation catches real errors.

### ApplyOutOfSyncOnly=true

Only applies resources that are detected as out of sync, rather than all resources:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: large-deployment
  annotations:
    argocd.argoproj.io/sync-options: ApplyOutOfSyncOnly=true
spec:
  replicas: 50
  # ... large spec
```

This reduces the load on the Kubernetes API server during sync because only changed resources are sent. Useful for applications with many resources where most are unchanged between syncs.

### Force=true

Force-applies the resource, overriding any conflicts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: overwritten-config
  annotations:
    argocd.argoproj.io/sync-options: Force=true
data:
  key: value
```

This is the equivalent of `kubectl apply --force`. Use with extreme caution as it can cause downtime by deleting and recreating resources.

### CreateNamespace=true

Automatically creates the destination namespace if it does not exist:

```yaml
# This is typically set at the Application level, not resource level
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

While technically a sync option, this one is almost always set at the Application level rather than on individual resources.

## Combining sync options

You can combine multiple options on a single resource:

```yaml
# Maximum protection for a database PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  annotations:
    argocd.argoproj.io/sync-options: Prune=false,Delete=false,ServerSideApply=true

---
# Job that needs replacement and skips validation
apiVersion: batch/v1
kind: Job
metadata:
  name: custom-job
  annotations:
    argocd.argoproj.io/sync-options: Replace=true,Validate=false

---
# Deployment managed by both ArgoCD and HPA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=true,ApplyOutOfSyncOnly=true
```

## Application-level vs resource-level sync options

Application-level sync options apply to all resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true     # All resources use SSA
      - CreateNamespace=true      # Namespace is auto-created
      - ApplyOutOfSyncOnly=true   # Only sync changed resources
```

Resource-level annotations override application-level settings for that specific resource:

```yaml
# Application sets ServerSideApply=true for everything
# But this specific Job needs Replace instead
apiVersion: batch/v1
kind: Job
metadata:
  name: migration
  annotations:
    argocd.argoproj.io/sync-options: Replace=true,ServerSideApply=false
```

## Real-world patterns

### Pattern: Protected stateful application

```yaml
# StatefulSet with full protection
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=true
    argocd.argoproj.io/sync-wave: "0"
spec:
  serviceName: postgres
  replicas: 3
  volumeClaimTemplates:
    - metadata:
        name: data
        annotations:
          argocd.argoproj.io/sync-options: Prune=false,Delete=false
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
```

### Pattern: Immutable Job re-runs

```yaml
# Job that needs to be recreated on each sync
apiVersion: batch/v1
kind: Job
metadata:
  name: seed-data-v2
  annotations:
    argocd.argoproj.io/sync-options: Replace=true,Force=true
    argocd.argoproj.io/hook: Sync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: seed
          image: myorg/seeder:v2
      restartPolicy: Never
```

### Pattern: Large ConfigMap with generated content

```yaml
# Large ConfigMap that might exceed annotation limits
apiVersion: v1
kind: ConfigMap
metadata:
  name: generated-config
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=true,Validate=false
data:
  # 50KB+ of generated configuration
  config.json: |
    { "generated": "content", "entries": [...] }
```

## Debugging sync option issues

```bash
# Check what sync options are applied to a resource
kubectl get deployment my-app -n production \
  -o jsonpath='{.metadata.annotations.argocd\.argoproj\.io/sync-options}'

# Check Application-level sync options
argocd app get my-app -o json | jq '.spec.syncPolicy.syncOptions'

# Check sync result for individual resource status
argocd app get my-app -o json | \
  jq '.status.operationState.syncResult.resources[] | {kind, name, status, message}'
```

## Summary

The `argocd.argoproj.io/sync-options` annotation provides resource-level control over ArgoCD sync behavior. Use `Prune=false` and `Delete=false` to protect critical resources from deletion, `ServerSideApply=true` for resources managed by multiple controllers, `Replace=true` for immutable resources like Jobs, `Validate=false` when strict schema validation causes issues, and `ApplyOutOfSyncOnly=true` to reduce API server load. Always be explicit about sync options for resources that need non-default behavior, and combine multiple options when a resource requires several overrides. Resource-level annotations take precedence over Application-level settings, giving you precise control over every resource in your deployment.
