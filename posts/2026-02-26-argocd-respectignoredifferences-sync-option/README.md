# How to Use the 'RespectIgnoreDifferences' Sync Option in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Options, Diff Management

Description: Learn how to use the RespectIgnoreDifferences sync option in ArgoCD to ensure that ignored fields are not overwritten during sync operations.

---

ArgoCD has a feature called `ignoreDifferences` that lets you tell ArgoCD to ignore certain fields when comparing live state to desired state. This is useful for fields that are modified by external controllers, admission webhooks, or Kubernetes itself. But there is a catch - by default, even though ArgoCD ignores these differences when computing sync status, it still overwrites those fields during the actual sync operation.

The `RespectIgnoreDifferences` sync option changes this. When enabled, ArgoCD not only ignores the differences in its comparison, but also respects them during sync by not overwriting the fields you told it to ignore.

## The Problem Without RespectIgnoreDifferences

Let me walk through a concrete example. Say you have a Deployment where an HPA (Horizontal Pod Autoscaler) manages the `replicas` field:

```yaml
# Your Git manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web
          image: myorg/web:1.0
```

You have an HPA that scales this Deployment between 3 and 10 replicas. During high traffic, the HPA scales it to 7 replicas. You have configured `ignoreDifferences` to ignore the `replicas` field:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

Without `RespectIgnoreDifferences`, here is what happens:

1. HPA scales the Deployment to 7 replicas
2. ArgoCD shows the app as "Synced" because it ignores the replicas difference
3. Someone triggers a sync (or auto-sync runs)
4. ArgoCD applies the full manifest from Git, setting replicas back to 3
5. The HPA immediately scales it back up, but there is a brief disruption

The `ignoreDifferences` only affects the comparison, not the apply.

## Enabling RespectIgnoreDifferences

Add both the `ignoreDifferences` configuration and the sync option:

```yaml
# Application that truly respects ignored differences
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/web-app.git
    targetRevision: main
    path: k8s/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
  syncPolicy:
    syncOptions:
      - RespectIgnoreDifferences=true
```

Now when ArgoCD syncs, it strips the `/spec/replicas` field from the manifest before applying it. The live value set by the HPA is preserved.

## How It Works Internally

When `RespectIgnoreDifferences` is enabled, ArgoCD modifies the sync process:

1. It reads the desired manifest from Git
2. It looks at the `ignoreDifferences` configuration
3. For each ignored field, it removes that field from the manifest to be applied
4. It applies the modified manifest (without the ignored fields)
5. Kubernetes merges the applied manifest with the existing resource, preserving the ignored fields

This is fundamentally different from just hiding the diff in the UI. The field is actually removed from the apply operation.

## Common Use Cases

### HPA-Managed Replicas

The most common use case is preventing ArgoCD from fighting with HPAs over replica counts:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: scalable-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/services.git
    targetRevision: main
    path: scalable-service/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: apps
      kind: StatefulSet
      jsonPointers:
        - /spec/replicas
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - RespectIgnoreDifferences=true
```

### Webhook-Injected Fields

Admission webhooks like Istio sidecar injection or Vault secret injection add fields to your resources. These fields do not exist in Git but should not be overwritten:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      # Ignore Istio sidecar container injected by webhook
      - .spec.template.spec.containers[] | select(.name == "istio-proxy")
      # Ignore Vault agent init container
      - .spec.template.spec.initContainers[] | select(.name == "vault-agent-init")
syncPolicy:
  syncOptions:
    - RespectIgnoreDifferences=true
```

### Controller-Managed Annotations

Some controllers add annotations to resources for tracking purposes:

```yaml
ignoreDifferences:
  - group: ""
    kind: Service
    jsonPointers:
      - /metadata/annotations/cloud.google.com~1neg-status
  - group: networking.k8s.io
    kind: Ingress
    jsonPointers:
      - /metadata/annotations/ingress.kubernetes.io~1backends
syncPolicy:
  syncOptions:
    - RespectIgnoreDifferences=true
```

Note the `~1` in the JSON pointer - this is the JSON Pointer encoding for `/` in field names.

### Mutating Default Values

Kubernetes sometimes adds default values to fields you did not specify. For example, if you do not set a `strategy` on a Deployment, Kubernetes adds `RollingUpdate` with default values:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/strategy
syncPolicy:
  syncOptions:
    - RespectIgnoreDifferences=true
```

## Using jqPathExpressions for Complex Ignores

For complex field patterns, `jqPathExpressions` provide more power than simple JSON pointers:

```yaml
# Ignore all container resource limits set by LimitRange
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .spec.template.spec.containers[].resources.limits
      - .spec.template.spec.containers[].resources.requests
```

Combined with `RespectIgnoreDifferences`, this ensures that resource limits set by a LimitRange admission controller are not overwritten by syncs.

## System-Level Configuration

You can also configure `ignoreDifferences` globally in the ArgoCD ConfigMap for patterns that apply across all applications:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
      - cluster-autoscaler
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jqPathExpressions:
      - .spec.replicas
```

When combined with `RespectIgnoreDifferences=true` on individual applications, the global ignore rules are also respected during sync.

## Important Caveats

**ServerSideApply interaction.** When using `ServerSideApply=true` with `RespectIgnoreDifferences`, the behavior might differ because server-side apply has its own field ownership model. In many cases, server-side apply alone handles the HPA replica count problem without needing `RespectIgnoreDifferences`.

**Field removal.** If you later want ArgoCD to manage a previously ignored field, removing it from `ignoreDifferences` and syncing will start applying it again. But the first sync might cause unexpected changes if the live value has drifted significantly.

**Replace sync option.** The `Replace=true` sync option is incompatible with `RespectIgnoreDifferences` because `replace` does a full resource replacement rather than a strategic merge patch.

## Debugging

To see what ArgoCD actually applies during sync:

```bash
# Dry run to see the applied manifest
argocd app sync web-app --dry-run

# Check the diff including ignored fields
argocd app diff web-app --local /path/to/manifests
```

## Summary

`RespectIgnoreDifferences` bridges the gap between ArgoCD's diff display and its sync behavior. Without it, `ignoreDifferences` only hides differences in the UI while still overwriting them on sync. With it, ArgoCD truly respects those differences by removing the ignored fields from the apply operation. This is essential for any environment where external controllers, webhooks, or HPAs manage certain fields on your resources.
