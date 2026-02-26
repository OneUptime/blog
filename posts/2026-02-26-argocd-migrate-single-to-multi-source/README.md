# How to Migrate Single-Source Apps to Multi-Source in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Source, Migration

Description: Learn how to safely migrate existing ArgoCD applications from single-source to multi-source configuration without downtime or resource disruption.

---

If you have existing ArgoCD applications using the `source` (singular) field and want to take advantage of multi-source capabilities, you need a migration path that does not disrupt running workloads. The migration is straightforward but requires careful handling to avoid accidentally triggering resource deletions or unintended syncs.

## Understanding the Difference

The change is structural in the Application spec:

```yaml
# Single-source (before)
spec:
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-app

# Multi-source (after)
spec:
  sources:
    - repoURL: https://github.com/your-org/k8s-manifests.git
      targetRevision: main
      path: apps/my-app
```

The fields `source` and `sources` are mutually exclusive. You cannot have both. When you switch from `source` to `sources`, ArgoCD treats it as an update to the Application resource.

## Pre-Migration Checklist

Before migrating, verify these conditions:

```bash
# 1. Check current application status - should be Synced and Healthy
argocd app get my-app

# 2. Verify no ongoing sync operations
argocd app get my-app -o json | jq '.status.operationState.phase'

# 3. List current resources managed by the app
argocd app resources my-app

# 4. Save the current Application spec for rollback
argocd app get my-app -o yaml > my-app-backup.yaml

# 5. Save the current rendered manifests for comparison
argocd app manifests my-app > my-app-manifests-before.yaml
```

## Migration Method 1: In-Place Update

The simplest approach - directly modify the Application spec. This works if the resulting multi-source application produces the same manifests as the single-source version:

```yaml
# Step 1: Current single-source application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-app
    helm:
      releaseName: my-app
      values: |
        replicaCount: 3
        image:
          tag: v2.1.0
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```yaml
# Step 2: Convert to multi-source (equivalent configuration)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  sources:  # Changed from "source" to "sources"
    - repoURL: https://github.com/your-org/k8s-manifests.git
      targetRevision: main
      path: apps/my-app
      helm:
        releaseName: my-app
        values: |
          replicaCount: 3
          image:
            tag: v2.1.0
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Apply the update:

```bash
# Disable auto-sync first for safety
argocd app set my-app --sync-policy none

# Apply the updated Application spec
kubectl apply -f my-app-multisource.yaml

# Verify the manifests are identical
argocd app manifests my-app > my-app-manifests-after.yaml
diff my-app-manifests-before.yaml my-app-manifests-after.yaml

# If manifests match, re-enable auto-sync
argocd app set my-app --sync-policy automated --auto-prune --self-heal
```

## Migration Method 2: Blue-Green Application Swap

For zero-risk migration, create a new multi-source application alongside the existing one, verify it, then switch:

```bash
# Step 1: Create the new multi-source application (initially with manual sync)
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-v2
  namespace: argocd
spec:
  project: default
  sources:
    - repoURL: https://github.com/your-org/k8s-manifests.git
      targetRevision: main
      path: apps/my-app
      helm:
        releaseName: my-app
        values: |
          replicaCount: 3
          image:
            tag: v2.1.0
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy: {}  # Manual sync only
EOF
```

```bash
# Step 2: Compare manifests between old and new
diff <(argocd app manifests my-app) <(argocd app manifests my-app-v2)

# Step 3: If identical, disable auto-sync on the old app
argocd app set my-app --sync-policy none

# Step 4: Sync the new app
argocd app sync my-app-v2

# Step 5: Verify the new app is Synced and Healthy
argocd app get my-app-v2

# Step 6: Enable auto-sync on the new app
argocd app set my-app-v2 --sync-policy automated --auto-prune --self-heal

# Step 7: Delete the old application (without deleting managed resources)
argocd app delete my-app --cascade=false

# Step 8: Optionally rename the new app
# (requires delete + recreate since Application names are immutable)
```

## Migration Method 3: Gradual Source Addition

Start with a single source in the `sources` array, then gradually add more sources:

```yaml
# Phase 1: Convert to multi-source with just the original source
spec:
  sources:
    - repoURL: https://github.com/your-org/k8s-manifests.git
      targetRevision: main
      path: apps/my-app
      helm:
        releaseName: my-app
        values: |
          replicaCount: 3
```

```yaml
# Phase 2: Add a ref source for external values
spec:
  sources:
    - repoURL: https://github.com/your-org/k8s-manifests.git
      targetRevision: main
      path: apps/my-app
      helm:
        releaseName: my-app
        valueFiles:
          - $config/my-app/values.yaml
    - repoURL: https://github.com/your-org/config-repo.git
      targetRevision: main
      ref: config
```

```yaml
# Phase 3: Add more sources as needed
spec:
  sources:
    - repoURL: https://github.com/your-org/k8s-manifests.git
      targetRevision: main
      path: apps/my-app
      helm:
        releaseName: my-app
        valueFiles:
          - $config/my-app/values.yaml
    - repoURL: https://github.com/your-org/config-repo.git
      targetRevision: main
      ref: config
    - repoURL: https://github.com/your-org/monitoring-config.git
      targetRevision: main
      path: apps/my-app
```

Each phase can be verified independently before proceeding to the next.

## Migrating Helm Applications: Moving Values External

A common migration pattern is extracting inline Helm values into an external Git repository:

```yaml
# Before: Values inline in the Application spec
spec:
  source:
    repoURL: https://charts.example.com
    chart: my-app
    targetRevision: 1.0.0
    helm:
      releaseName: my-app
      values: |
        replicaCount: 3
        image:
          repository: my-registry/my-app
          tag: v2.1.0
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
        ingress:
          enabled: true
          hosts:
            - host: my-app.example.com
```

Step 1: Extract the inline values to a file in your config repository:

```yaml
# config-repo/my-app/values.yaml
replicaCount: 3
image:
  repository: my-registry/my-app
  tag: v2.1.0
resources:
  requests:
    cpu: 500m
    memory: 512Mi
ingress:
  enabled: true
  hosts:
    - host: my-app.example.com
```

Step 2: Update the Application to multi-source:

```yaml
# After: Values from external repo
spec:
  sources:
    - repoURL: https://charts.example.com
      chart: my-app
      targetRevision: 1.0.0
      helm:
        releaseName: my-app
        valueFiles:
          - $config/my-app/values.yaml
    - repoURL: https://github.com/your-org/config-repo.git
      targetRevision: main
      ref: config
```

Step 3: Verify the rendered output is identical:

```bash
# Compare rendered manifests
diff <(argocd app manifests my-app) <(helm template my-app charts/my-app \
  -f config-repo/my-app/values.yaml)
```

## Handling ApplicationSets

If your applications are managed by ApplicationSets, update the template:

```yaml
# Before: ApplicationSet with single source template
spec:
  template:
    spec:
      source:
        repoURL: '{{repoURL}}'
        path: '{{path}}'

# After: ApplicationSet with multi-source template
spec:
  template:
    spec:
      sources:
        - repoURL: '{{repoURL}}'
          path: '{{path}}'
        - repoURL: https://github.com/your-org/config-repo.git
          targetRevision: main
          ref: config
```

All applications generated by the ApplicationSet will be recreated with multi-source configuration.

## Rollback Plan

If the migration causes issues, rollback by applying the saved backup:

```bash
# Restore the original single-source Application
kubectl apply -f my-app-backup.yaml

# Verify it syncs correctly
argocd app get my-app
argocd app sync my-app
```

## Post-Migration Verification

After migration, run these checks:

```bash
# Verify application is Synced and Healthy
argocd app get my-app

# Verify all expected resources exist
argocd app resources my-app

# Verify manifests match pre-migration
argocd app manifests my-app > my-app-manifests-final.yaml
diff my-app-manifests-before.yaml my-app-manifests-final.yaml

# Verify webhooks still trigger (push a test change)
# Check that ArgoCD detects the change within expected timeframe
```

## Best Practices

**Always disable auto-sync before migrating** - This prevents ArgoCD from acting on the mid-migration state.

**Compare manifests before and after** - The rendered output should be identical (unless you are intentionally adding new sources).

**Migrate one application at a time** - Do not batch-migrate all applications simultaneously.

**Keep the backup** - Retain the original Application spec for at least a week after migration.

For more on multi-source applications, see [using multiple sources in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-multiple-sources-single-application/view) and [combining Helm with external values](https://oneuptime.com/blog/post/2026-02-26-argocd-helm-external-values-multiple-sources/view).
