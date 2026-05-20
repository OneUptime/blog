# How to Use the argocd.argoproj.io/sync-options Annotation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Options, Configuration

Description: Master the ArgoCD sync-options annotation to control pruning, validation, apply strategies, and resource-level sync behavior for precise deployment management.

---

The `argocd.argoproj.io/sync-options` annotation gives you resource-level control over how ArgoCD syncs individual Kubernetes resources. While many Application-level sync options apply to everything in the application, this annotation lets you customize supported behavior for specific resources - preventing certain resources from being pruned, using different apply strategies for different resource types, or skipping validation for resources that do not conform to strict schemas.

## Annotation syntax

The annotation accepts a comma-separated list of key=value pairs:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: Prune=false,ServerSideApply=true,Validate=false
```

You can also set sync options at the Application level in the `spec.syncPolicy.syncOptions` field. For sync options that support both scopes, the resource-level annotation takes precedence for that specific resource.

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

- Resources with fields managed by another controller or process
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

Note: Replace makes ArgoCD use `kubectl replace` or `kubectl create` instead of `kubectl apply`. It can still be destructive and may cause resources to be recreated, especially when combined with `Force=true`, so do not use it for Services or Deployments in production unless you understand the outage risk.

### Validate=false

Skips kubectl schema validation for this resource:

```yaml
apiVersion: example.com/v1
kind: CustomResource
metadata:
  name: custom-resource
  annotations:
    argocd.argoproj.io/sync-options: Validate=false
spec:
  # Fields handled by a CRD that uses RawExtension or otherwise needs
  # kubectl apply --validate=false
  template:
    customField: value
```

**When to use:**

- Custom resources whose schemas require `kubectl apply --validate=false`
- Partial manifests used with server-side apply
- Temporary workaround for schema validation bugs

Use sparingly - validation catches real errors.

### ApplyOutOfSyncOnly=true

Only applies resources that are detected as out of sync, rather than all resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: large-application
spec:
  syncPolicy:
    syncOptions:
      - ApplyOutOfSyncOnly=true
```

This reduces the load on the Kubernetes API server during sync because only changed resources are sent. Useful for applications with many resources where most are unchanged between syncs.

### Force=true

Deletes and recreates the resource during sync:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: rerunnable-job
  annotations:
    argocd.argoproj.io/sync-options: Force=true,Replace=true
spec:
  template:
    spec:
      containers:
        - name: run
          image: myorg/job:v1.0.0
      restartPolicy: Never
```

ArgoCD uses this pattern for resources that should be deleted and created again, such as Jobs that need to run on each sync. Use with extreme caution as it can cause downtime by deleting and recreating resources.

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

While technically a sync option, this one is set at the Application level or passed through the CLI, not as a resource-level annotation.

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
# Application that only applies resources detected as out of sync
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app
spec:
  syncPolicy:
    syncOptions:
      - ApplyOutOfSyncOnly=true
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

Supported resource-level annotations override application-level settings for that specific resource:

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
# StatefulSet with server-side apply and retained PVCs
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
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: Retain
    whenScaled: Retain
  volumeClaimTemplates:
    - metadata:
        name: data
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

The `argocd.argoproj.io/sync-options` annotation provides resource-level control over supported ArgoCD sync behavior. Use `Prune=false` and `Delete=false` to protect critical resources from deletion, `ServerSideApply=true` for resources with fields managed by another controller or process, `Replace=true` for resources that should use `kubectl replace` or `kubectl create`, and `Validate=false` when kubectl schema validation causes issues. Use Application-level options such as `ApplyOutOfSyncOnly=true` to reduce API server load across large applications. Always be explicit about sync options for resources that need non-default behavior, and combine multiple options when a resource requires several overrides. Supported resource-level annotations take precedence over Application-level settings, giving you precise control over individual resources in your deployment.
