# How to Handle Helm Chart Hooks vs ArgoCD Hooks Conflict

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Troubleshooting

Description: Learn how to resolve conflicts between Helm chart hooks and ArgoCD sync hooks, understand how each system interprets hook annotations, and implement working solutions.

---

If you have ever deployed a Helm chart through ArgoCD and watched your pre-install Jobs or post-upgrade hooks behave unexpectedly, you have hit one of the most common ArgoCD gotchas. Helm hooks and ArgoCD hooks use different annotation systems, and when a Helm chart with hooks is rendered by ArgoCD, the two systems can conflict in subtle and frustrating ways. This guide explains the conflict and shows you how to resolve it.

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

ArgoCD hooks run during the sync process: PreSync, Sync, PostSync, SyncFail, and PostDelete.

## Where the Conflict Happens

When ArgoCD renders a Helm chart, it runs `helm template` to generate plain Kubernetes manifests. Here is the critical part: **ArgoCD does not execute `helm install` or `helm upgrade`**. It generates templates and applies them with `kubectl apply`.

This means Helm hooks are included in the rendered output, but they are not treated specially by Helm because Helm is not managing the lifecycle. Instead, ArgoCD sees these resources and applies them alongside everything else.

The specific conflicts:

1. **Helm hook resources appear as regular resources** - A Job with `helm.sh/hook: pre-install` gets applied as a normal resource, not as a pre-install hook
2. **Hook delete policies don't work** - `helm.sh/hook-delete-policy: before-hook-creation` has no effect because Helm is not managing the resource
3. **ArgoCD shows hook resources as OutOfSync** - After a Job completes and is deleted, ArgoCD tries to recreate it
4. **Duplicate execution** - If you have both Helm and ArgoCD annotations, the resource may run at unexpected times

## Solution 1: Replace Helm Hooks with ArgoCD Hooks

The cleanest solution is to convert Helm hooks to ArgoCD hooks. This means the resource is managed by ArgoCD's sync lifecycle instead of Helm's.

Map Helm hooks to ArgoCD hooks:

| Helm Hook | ArgoCD Hook |
|-----------|-------------|
| pre-install | PreSync |
| pre-upgrade | PreSync |
| post-install | PostSync |
| post-upgrade | PostSync |
| pre-delete | PreSync (with careful logic) |
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

If you want to exclude Helm hook resources from ArgoCD management entirely, use the `--no-hooks` option in the Helm source configuration:

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
      # This prevents helm template from including hook resources
      parameters:
        - name: hooks.enabled
          value: "false"
```

However, this only works if the chart supports a parameter to disable hooks. Most charts do not have this toggle.

A more universal approach is to use ArgoCD's resource exclusion:

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
      # Only exclude resources with Helm hook annotations
      # Note: This excludes ALL Jobs, which may be too broad
```

## Solution 3: Post-Render Hook Conversion

Use a Helm post-renderer to automatically convert Helm hooks to ArgoCD hooks during template rendering:

```bash
#!/bin/bash
# post-renderer.sh - Convert Helm hooks to ArgoCD hooks
# Used as: helm template ... --post-renderer ./post-renderer.sh

cat | sed \
  -e 's|"helm.sh/hook": pre-install|argocd.argoproj.io/hook: PreSync|g' \
  -e 's|"helm.sh/hook": pre-upgrade|argocd.argoproj.io/hook: PreSync|g' \
  -e 's|"helm.sh/hook": post-install|argocd.argoproj.io/hook: PostSync|g' \
  -e 's|"helm.sh/hook": post-upgrade|argocd.argoproj.io/hook: PostSync|g' \
  -e 's|"helm.sh/hook": pre-install,pre-upgrade|argocd.argoproj.io/hook: PreSync|g' \
  -e 's|"helm.sh/hook": post-install,post-upgrade|argocd.argoproj.io/hook: PostSync|g' \
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

If you want to keep Helm hooks as regular resources but prevent ArgoCD from flagging them as out of sync:

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

The Helm hooks vs ArgoCD hooks conflict is one of the most common pitfalls when adopting ArgoCD for Helm-based deployments. The root cause is simple: ArgoCD uses `helm template`, not `helm install`, so Helm lifecycle hooks have no mechanism to execute. The cleanest solution is to replace Helm hooks with ArgoCD hooks using the PreSync, PostSync, and SyncFail annotations. For third-party charts where you cannot modify the templates, use Kustomize overlays or post-renderers to convert the annotations automatically.
