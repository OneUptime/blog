# How to Handle Helm Chart Hooks vs ArgoCD Hooks Conflict

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Troubleshooting

Description: Learn how to resolve conflicts between Helm chart hooks and ArgoCD sync hooks, understand how each system interprets hook annotations, and implement working solutions.

---

If you have ever deployed a Helm chart through ArgoCD and watched your pre-install Jobs or post-upgrade hooks behave unexpectedly, you have hit one of the most common ArgoCD gotchas. Helm hooks and ArgoCD hooks use different annotation systems, and ArgoCD maps many Helm hook annotations into its own sync lifecycle. That works well for supported hooks, but the systems can still conflict in subtle and frustrating ways when a manifest mixes both annotation styles or relies on unsupported Helm lifecycle events. This guide explains the conflict and shows you how to resolve it.

## Understanding the Two Hook Systems

### Helm Hooks

Helm uses annotations to define lifecycle hooks that run at specific points during chart installation or upgrade:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation
```

Helm hooks are designed for the `helm install` and `helm upgrade` lifecycle. They run before or after install, upgrade, rollback, and delete operations.

### ArgoCD Hooks

ArgoCD has its own hook system that maps to the sync lifecycle:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
```

ArgoCD hooks run during the sync process: PreSync, Sync, PostSync, SyncFail, PostDelete, and PreDelete.

## Where the Conflict Happens

When ArgoCD renders a Helm chart, it runs `helm template` to generate plain Kubernetes manifests. Here is the critical part: **ArgoCD does not execute `helm install` or `helm upgrade`**. It inflates the chart and applies the resulting manifests itself.

This means Helm is not managing the release lifecycle, but ArgoCD does recognize many Helm hook annotations and maps them to ArgoCD hook annotations internally. For example, `helm.sh/hook: pre-install` and `helm.sh/hook: pre-upgrade` are treated like `argocd.argoproj.io/hook: PreSync`, while `helm.sh/hook-weight` maps to `argocd.argoproj.io/sync-wave`.

The specific conflicts:

1. **ArgoCD hooks override Helm hooks** - If a manifest contains an `argocd.argoproj.io/hook` annotation, ArgoCD ignores the Helm hook annotations on that manifest
2. **Install and upgrade hooks have the same sync behavior** - ArgoCD cannot distinguish a first install from a later sync the same way Helm can, so `pre-install` and `pre-upgrade` both map to PreSync
3. **Unsupported Helm hooks are not equivalent** - Helm hooks such as rollback hooks do not have a direct ArgoCD sync lifecycle equivalent
4. **Delete policy timing is ArgoCD-specific** - `helm.sh/hook-delete-policy: before-hook-creation`, `hook-succeeded`, and `hook-failed` are mapped, but the deletion is handled by ArgoCD's hook lifecycle rather than by Helm

## Solution 1: Replace Helm Hooks with ArgoCD Hooks

The cleanest solution is to convert Helm hooks to ArgoCD hooks. This means the resource is managed by ArgoCD's sync lifecycle instead of Helm's.

Map Helm hooks to ArgoCD hooks:

| Helm Hook | ArgoCD Hook |
|-----------|-------------|
| pre-install | PreSync |
| pre-upgrade | PreSync |
| post-install | PostSync |
| post-upgrade | PostSync |
| pre-delete | PreDelete |
| post-delete | PostDelete |
| pre-rollback | No direct equivalent |
| test | No direct equivalent |

Replace the annotations in your chart values or use a Kustomize overlay:

```yaml
# Original Helm hook

apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation

# Converted to ArgoCD hook
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-5"
```

## Solution 2: Skip Helm Hooks in ArgoCD

If you want to exclude Helm hook resources from ArgoCD management entirely, disable them with chart values if the chart provides a hook toggle:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://charts.example.com
    chart: my-chart
    targetRevision: "1.0.0"
    helm:
      skipCrds: false
      parameters:
        - name: hooks.enabled
          value: "false"
```

This only works if the chart supports a parameter to disable hooks. Most charts do not have this toggle, and ArgoCD's Helm source options do not provide a general `--no-hooks` switch for all hook resources.

Another approach is to use ArgoCD's resource exclusion, but this is broad and should be used carefully:

```yaml
# In argocd-cm ConfigMap
data:
  resource.exclusions: |
    - apiGroups:
        - "batch"
      kinds:
        - "Job"
      clusters:
        - "*"
      # This excludes all batch Jobs from ArgoCD management, which is usually too broad
```

## Solution 3: Post-Render Hook Conversion

Use a Helm post-renderer in your rendering pipeline, or an ArgoCD config management plugin, to automatically convert Helm hooks to ArgoCD hooks during template rendering:

```bash
#!/bin/bash
# post-renderer.sh - Convert Helm hooks to ArgoCD hooks
# Used as: helm template ... --post-renderer ./post-renderer.sh

cat | sed \
  -e 's|"helm.sh/hook": pre-install,pre-upgrade|argocd.argoproj.io/hook: PreSync|g' \
  -e 's|"helm.sh/hook": post-install,post-upgrade|argocd.argoproj.io/hook: PostSync|g' \
  -e 's|"helm.sh/hook": pre-install|argocd.argoproj.io/hook: PreSync|g' \
  -e 's|"helm.sh/hook": pre-upgrade|argocd.argoproj.io/hook: PreSync|g' \
  -e 's|"helm.sh/hook": post-install|argocd.argoproj.io/hook: PostSync|g' \
  -e 's|"helm.sh/hook": post-upgrade|argocd.argoproj.io/hook: PostSync|g' \
  -e 's|"helm.sh/hook-delete-policy": before-hook-creation|argocd.argoproj.io/hook-delete-policy: BeforeHookCreation|g' \
  -e 's|"helm.sh/hook-delete-policy": hook-succeeded|argocd.argoproj.io/hook-delete-policy: HookSucceeded|g' \
  -e 's|"helm.sh/hook-delete-policy": hook-failed|argocd.argoproj.io/hook-delete-policy: HookFailed|g' \
  -e 's|"helm.sh/hook-weight": "\(.*\)"|argocd.argoproj.io/sync-wave: "\1"|g'
```

## Solution 4: Kustomize Overlay for Hook Conversion

If you use Kustomize alongside Helm, create an overlay that patches the annotations:

```yaml
# kustomization.yaml
resources:
  - ../../base

patches:
  - target:
      kind: Job
      annotationSelector: "helm.sh/hook"
    patch: |
      - op: remove
        path: /metadata/annotations/helm.sh~1hook
      - op: remove
        path: /metadata/annotations/helm.sh~1hook-delete-policy
      - op: add
        path: /metadata/annotations/argocd.argoproj.io~1hook
        value: PreSync
      - op: add
        path: /metadata/annotations/argocd.argoproj.io~1hook-delete-policy
        value: BeforeHookCreation
```

## Solution 5: Use ignoreDifferences for Hook Resources

If a hook Job is managed as a normal Kubernetes Job, `ignoreDifferences` can help with immutable Job fields that Kubernetes defaults or mutates, but it does not replace hook lifecycle management:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
    - group: batch
      kind: Job
      jsonPointers:
        - /spec/selector
        - /spec/template/metadata/labels
  syncPolicy:
    syncOptions:
      - RespectIgnoreDifferences=true
```

## Common Scenarios and Recommendations

### Database Migration Jobs

For database migrations that should run before the main deployment:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-{{ .Values.image.tag | replace "." "-" }}
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["./migrate", "up"]
      restartPolicy: Never
  backoffLimit: 3
```

### Cleanup Jobs

For post-deployment cleanup:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cache-warm
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: warm-cache
          image: curlimages/curl
          command: ["curl", "-X", "POST", "http://my-app/api/warm-cache"]
      restartPolicy: Never
```

### Test Jobs

For post-deployment smoke tests:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: test
          image: my-app-tests:latest
          command: ["./run-smoke-tests.sh"]
      restartPolicy: Never
  backoffLimit: 0
```

## Summary

The Helm hooks vs ArgoCD hooks conflict is one of the most common pitfalls when adopting ArgoCD for Helm-based deployments. The root cause is simple: ArgoCD uses `helm template`, not `helm install`, and maps supported Helm lifecycle hooks into its own sync lifecycle. The cleanest solution is to use one hook system consistently, usually by replacing Helm hooks with ArgoCD hooks such as PreSync, PostSync, PreDelete, PostDelete, and SyncFail. For third-party charts where you cannot modify the templates, use Kustomize overlays or post-renderers to convert the annotations automatically.
