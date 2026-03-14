# How to Fix Flux Reconciliation Stuck at Not Ready Forever

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, NotReady, HealthCheck

Description: Diagnose and resolve Flux Kustomizations or HelmReleases that remain in a Not Ready state permanently, with practical debugging techniques and fixes.

---

When a Flux Kustomization or HelmRelease enters a `Not Ready` state and stays there indefinitely, your GitOps pipeline is effectively broken. Unlike the `Progressing` state where Flux is still trying, `Not Ready` usually means Flux has given up after encountering an error. This post covers how to identify the underlying cause and restore reconciliation.

## Symptoms

Running `flux get kustomizations` shows a persistent failure:

```bash
flux get kustomizations
```

```text
NAME        REVISION        SUSPENDED   READY   MESSAGE
my-app      main@sha1:abc   False       False   kustomize build failed: ...
```

The `READY` column remains `False` across multiple reconciliation cycles, and the error message may or may not be descriptive.

## Diagnostic Commands

### Get the full status with conditions

```bash
kubectl get kustomization my-app -n flux-system -o yaml | grep -A 20 'conditions:'
```

### Check the controller logs for errors

```bash
kubectl logs -n flux-system deployment/kustomize-controller --since=1h | grep -i error
```

### Verify the source is available

```bash
flux get sources git
flux get sources helm
```

### Check events on the resource

```bash
kubectl events --for kustomization/my-app -n flux-system
```

## Common Root Causes

### 1. Kustomize build failure

Invalid YAML, missing bases, or incompatible overlays cause the build step to fail before anything is applied.

```bash
# Test the build locally
kustomize build ./path/to/kustomization
```

### 2. Apply failure due to validation errors

The manifests build correctly but fail Kubernetes server-side validation. This happens with invalid field values, immutable field changes, or API version mismatches.

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep "validation"
```

### 3. Source not available

If the GitRepository or HelmRepository source is not ready, the Kustomization cannot proceed.

```bash
flux get sources git -A
```

### 4. RBAC permission issues

The Flux service account lacks permissions to create or modify certain resources.

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep "forbidden"
```

### 5. Dependency not ready

If the Kustomization depends on another Kustomization that is also not ready, it creates a cascade of failures.

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.spec.dependsOn}'
```

## Step-by-Step Fixes

### Fix 1: Resolve kustomize build errors

Check the error message in the Kustomization status. Common build errors include:

```bash
# Get the exact error
flux get kustomization my-app
```

Fix the manifests in your Git repository. If the error references a missing resource, ensure all referenced files exist:

```bash
# Verify file structure locally
tree ./my-app/
kustomize build ./my-app/ --enable-helm
```

### Fix 2: Fix server-side validation errors

If the error mentions validation failures, check what changed in your manifests:

```bash
# Dry-run the apply to see what would fail
kubectl apply --dry-run=server -f <(kustomize build ./my-app/)
```

Common validation errors include changing immutable fields on Services or Deployments. In those cases, you may need to delete and recreate the resource:

```bash
kubectl delete deployment my-app -n my-app-namespace
flux reconcile kustomization my-app --with-source
```

### Fix 3: Fix source availability

If the GitRepository is not ready:

```bash
flux get sources git my-repo -n flux-system
kubectl describe gitrepository my-repo -n flux-system
```

Common source issues include expired SSH keys, changed repository URLs, and authentication failures. Update the source credentials:

```bash
flux create secret git my-repo-auth \
  --url=ssh://git@github.com/org/repo \
  --private-key-file=./identity
```

### Fix 4: Fix RBAC permissions

If the controller lacks permissions, create the necessary ClusterRole and ClusterRoleBinding:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-custom-resources
rules:
  - apiGroups: ["custom.example.com"]
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-custom-resources
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-custom-resources
subjects:
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
```

### Fix 5: Force a fresh reconciliation

After fixing the underlying issue, force reconciliation:

```bash
flux reconcile source git my-repo
flux reconcile kustomization my-app --with-source
```

## Prevention Strategies

1. **Validate manifests in CI** before merging. Run `kustomize build` and `kubectl apply --dry-run=server` in your CI pipeline.
2. **Use Flux notifications** to alert on reconciliation failures immediately.
3. **Pin API versions** in your manifests to avoid surprises during cluster upgrades.
4. **Set up a Flux notification provider** to send alerts to Slack or other channels:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: on-call
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
```

Catching `Not Ready` states early and having clear error messages makes troubleshooting much faster and reduces downtime in your GitOps workflow.
