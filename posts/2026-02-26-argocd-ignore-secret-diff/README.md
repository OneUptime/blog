# How to Ignore Secret Changes in ArgoCD Diff

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Secrets, Configuration Management

Description: Learn how to configure ArgoCD to ignore secret data changes in diff comparisons, preventing false OutOfSync alerts when external tools manage your Kubernetes secrets.

---

If you have used ArgoCD with any external secret management tool, you have probably seen the frustrating cycle: ArgoCD shows your application as OutOfSync because the Secret data in the cluster does not match what is in Git. This is expected behavior since tools like External Secrets Operator, Sealed Secrets, or cert-manager create and update Secret data outside of Git. But it floods your ArgoCD dashboard with false OutOfSync indicators.

In this post, I will show you every way to configure ArgoCD to ignore secret changes in its diff calculations, from application-level settings to global configurations.

## Why Secrets Cause False OutOfSync

When ArgoCD compares live and desired state, it does a field-by-field comparison. For a Secret managed by External Secrets Operator, the situation looks like this:

**In Git (ExternalSecret manifest):**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  target:
    name: app-secrets
```

**In cluster (the resulting Kubernetes Secret):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  labels:
    reconcile.external-secrets.io/data-hash: abc123
  ownerReferences:
    - apiVersion: external-secrets.io/v1beta1
      kind: ExternalSecret
      name: app-secrets
data:
  DB_PASSWORD: c3VwZXJzZWNyZXQ=
  API_KEY: YWJjMTIz
```

ArgoCD sees data fields in the live state that do not exist in the desired state and marks the application as OutOfSync.

## Method 1: Application-Level ignoreDifferences

The most common approach is to configure `ignoreDifferences` directly in your ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/apps.git
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    # Ignore all data changes in all Secrets
    - group: ""
      kind: Secret
      jsonPointers:
        - /data
        - /stringData
    # Also ignore metadata that operators add
    - group: ""
      kind: Secret
      jsonPointers:
        - /metadata/annotations
        - /metadata/labels
```

### Using JSON Pointers

JSON Pointers let you target specific fields:

```yaml
ignoreDifferences:
  # Ignore only the data field
  - group: ""
    kind: Secret
    jsonPointers:
      - /data

  # Ignore a specific key within data
  - group: ""
    kind: Secret
    name: my-specific-secret
    jsonPointers:
      - /data/password
      - /data/api-key
```

### Using JQ Path Expressions

JQ expressions give you more power for conditional ignoring:

```yaml
ignoreDifferences:
  # Ignore data for secrets owned by ExternalSecret
  - group: ""
    kind: Secret
    jqPathExpressions:
      - >-
        select(.metadata.ownerReferences != null) |
        select(.metadata.ownerReferences[].kind == "ExternalSecret") |
        .data

  # Ignore data for secrets with a specific label
  - group: ""
    kind: Secret
    jqPathExpressions:
      - >-
        select(.metadata.labels."managed-by" == "external-secrets") |
        .data

  # Ignore only specific keys that change
  - group: ""
    kind: Secret
    jqPathExpressions:
      - .data.password
      - .data."api-key"
```

### Targeting Specific Secrets

You can narrow down which secrets to ignore:

```yaml
ignoreDifferences:
  # Only ignore changes for a specific secret
  - group: ""
    kind: Secret
    name: database-credentials
    namespace: production
    jsonPointers:
      - /data

  # Ignore changes for secrets matching a pattern
  - group: ""
    kind: Secret
    name: "eso-*"
    jsonPointers:
      - /data
```

## Method 2: Global Configuration in argocd-cm

To apply ignore rules across all applications, use the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Global ignore for all Secrets
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - external-secrets
      - sealed-secrets-controller
      - cert-manager-controller

  # Ignore differences specifically for Secrets
  resource.customizations.ignoreDifferences._Secret: |
    jsonPointers:
      - /data
      - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration
```

The `_Secret` notation uses an underscore prefix to indicate the core API group (empty group). For resources in named API groups, use the full group:

```yaml
data:
  # For a CRD in a specific API group
  resource.customizations.ignoreDifferences.external-secrets.io_ExternalSecret: |
    jsonPointers:
      - /status
```

## Method 3: Server-Side Diff with Managed Fields

ArgoCD 2.5+ supports server-side diff, which uses Kubernetes managed fields to determine which controller owns each field. This is the most elegant solution:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Enable server-side diff
  controller.diff.server.side: "true"
```

With server-side diff enabled, ArgoCD understands that if External Secrets Operator owns the `/data` field of a Secret, it should not compare that field against Git. This works automatically without explicit `ignoreDifferences` configuration.

You can also enable it per application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    argocd.argoproj.io/compare-options: ServerSideDiff=true
```

## Method 4: RespectIgnoreDifferences with Self-Heal

When using automated sync with self-healing, you need `RespectIgnoreDifferences` to prevent ArgoCD from continuously trying to sync ignored fields:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  ignoreDifferences:
    - group: ""
      kind: Secret
      jsonPointers:
        - /data
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - RespectIgnoreDifferences=true
```

Without `RespectIgnoreDifferences=true`, this scenario occurs:

1. ESO updates the Secret data
2. ArgoCD detects the diff (Secret data changed)
3. ignoreDifferences says "ignore this"
4. ArgoCD shows the app as Synced
5. Self-heal triggers because the live state differs from desired
6. ArgoCD syncs, potentially overwriting ESO's changes
7. ESO detects the change and updates again
8. Infinite loop

With `RespectIgnoreDifferences=true`, step 5 also considers the ignore rules, breaking the cycle.

## Method 5: Resource Exclusion

If you do not want ArgoCD to track certain secrets at all:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - Secret
      clusters:
        - "*"
```

This is a heavy-handed approach that excludes all secrets from ArgoCD tracking. A more targeted version:

```yaml
data:
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - Secret
      clusters:
        - "*"
      # Only exclude secrets in specific namespaces
      namespaces:
        - cert-manager
        - external-secrets
```

## Common Patterns

### Pattern 1: Ignore ESO-managed secrets globally

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - external-secrets
```

### Pattern 2: Ignore cert-manager certificates

```yaml
ignoreDifferences:
  - group: ""
    kind: Secret
    jsonPointers:
      - /data/tls.crt
      - /data/tls.key
      - /data/ca.crt
```

### Pattern 3: Ignore Sealed Secrets controller additions

```yaml
ignoreDifferences:
  - group: ""
    kind: Secret
    jsonPointers:
      - /data
      - /metadata/annotations
      - /metadata/labels/sealedsecrets.bitnami.com~1managed
      - /metadata/ownerReferences
```

### Pattern 4: Ignore only auto-generated fields

```yaml
ignoreDifferences:
  - group: ""
    kind: Secret
    jqPathExpressions:
      - .metadata.annotations."kubectl.kubernetes.io/last-applied-configuration"
      - .metadata.resourceVersion
      - .metadata.uid
      - .metadata.creationTimestamp
```

## Verifying Your Configuration

After configuring ignoreDifferences, verify it works:

```bash
# Check if the application shows as Synced
argocd app get myapp

# Force a refresh to recalculate diff
argocd app get myapp --refresh

# View the diff (should be empty for ignored fields)
argocd app diff myapp

# Hard refresh to clear cache
argocd app get myapp --hard-refresh
```

## Summary

Ignoring secret changes in ArgoCD diffs is essential for any production GitOps setup that uses external secret management. Start with application-level `ignoreDifferences` using JSON pointers for quick fixes, then consider server-side diff for a cleaner long-term solution. Always pair `ignoreDifferences` with `RespectIgnoreDifferences=true` when using self-healing to avoid sync loops. For broader context on managing secret drift, see our post on [secret drift detection in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-secret-drift-detection/view).
