# How to Troubleshoot Unexpected Resource Deletion by Flux Pruning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Pruning, Troubleshooting, Garbage-Collection, Kubernetes

Description: Learn how to diagnose and fix unexpected resource deletions caused by Flux garbage collection pruning.

---

## Introduction

One of the most alarming issues in a Flux-managed cluster is when resources are unexpectedly deleted by garbage collection. A Deployment disappears, a Service stops working, or an entire set of resources vanishes without an obvious change in Git. These situations are stressful but usually have straightforward root causes once you know where to look.

This post provides a systematic approach to diagnosing why Flux pruned resources you expected to remain in the cluster, and how to prevent it from happening again.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- `kubectl` and `flux` CLI tools installed
- Access to the Git repository connected to Flux
- Basic understanding of Flux Kustomization and garbage collection

## Common Causes of Unexpected Pruning

Before diving into troubleshooting steps, here are the most common reasons Flux unexpectedly prunes resources:

1. A file was accidentally removed from Git
2. The Kustomization `path` was changed
3. A kustomization.yaml file was restructured and a resource was dropped from the resources list
4. A branch was switched or rebased, causing file disappearance
5. The GitRepository source is pointing to a different branch or tag
6. File naming or path issues prevent Kustomize from including the resource

## Step 1: Check the Kustomization Events

Start by examining the Kustomization events for any pruning activity:

```bash
kubectl events -n flux-system --for kustomization/my-app
```

Look for events that mention garbage collection or pruning. These events will indicate which resources were deleted and when.

You can also use the flux CLI:

```bash
flux get kustomization my-app
```

This shows the last applied revision and any error messages.

## Step 2: Compare the Git Revision

Check which Git revision Flux last applied:

```bash
kubectl get kustomization my-app -n flux-system \
  -o jsonpath='{.status.lastAppliedRevision}'
```

Compare this with the current HEAD of your repository to see if there were unexpected changes between revisions. Examine the Git log for the relevant path:

```bash
git log --oneline --diff-filter=D -- apps/production/
```

The `--diff-filter=D` flag shows only commits that deleted files, helping you identify if a manifest was accidentally removed.

## Step 3: Inspect the Kustomization Inventory

Check the current inventory to see what Flux is tracking:

```bash
kubectl get kustomization my-app -n flux-system \
  -o jsonpath='{.status.inventory.entries[*].id}' | tr ' ' '\n'
```

If the deleted resource is missing from the inventory, it means Flux already pruned it. Compare this inventory with what you expect to see.

## Step 4: Verify the Kustomize Build Output

A common cause of unexpected pruning is a broken kustomization.yaml that silently drops resources. Build the Kustomize output locally to see exactly what Flux would apply:

```bash
kustomize build apps/production/
```

Check if all expected resources appear in the output. If a resource is missing, investigate the kustomization.yaml:

```yaml
# Check that all resources are listed
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  # Was a resource accidentally removed from this list?
```

## Step 5: Check the GitRepository Source

Verify that the GitRepository is pointing to the correct branch and has the latest revision:

```bash
flux get source git flux-system
```

```bash
kubectl get gitrepository flux-system -n flux-system \
  -o jsonpath='{.spec.ref}'
```

If the branch or tag reference changed, Flux may be reading from a different version of your repository.

## Step 6: Examine the Kustomize Controller Logs

The kustomize-controller logs provide detailed information about what happened during reconciliation:

```bash
kubectl logs -n flux-system deployment/kustomize-controller \
  --since=1h | grep -i "my-app"
```

Look for lines mentioning pruning, deletion, or garbage collection:

```bash
kubectl logs -n flux-system deployment/kustomize-controller \
  --since=1h | grep -E "prune|delete|garbage|removed"
```

## Step 7: Check for Path Issues

If you recently reorganized your repository structure, verify the Kustomization path matches the actual directory:

```bash
kubectl get kustomization my-app -n flux-system \
  -o jsonpath='{.spec.path}'
```

Then verify this path exists in your repository and contains the expected files:

```bash
ls -la apps/production/
```

A trailing slash mismatch, case sensitivity issue, or symlink problem can cause Flux to see an empty directory and prune everything.

## Recovering Deleted Resources

If resources were already pruned, you can recover them by ensuring they are present in Git and triggering a reconciliation:

```bash
# Verify the manifests are in Git
git status
git log --oneline -5

# Force reconciliation
flux reconcile kustomization my-app
```

If the manifests were accidentally deleted from Git, restore them:

```bash
git checkout HEAD~1 -- apps/production/deployment.yaml
git commit -m "Restore accidentally deleted deployment manifest"
git push
```

## Preventing Future Unexpected Deletions

Add prune-disabled annotations to critical resources:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
  namespace: production
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-app
  template:
    metadata:
      labels:
        app: critical-app
    spec:
      containers:
        - name: app
          image: critical-app:v1.0.0
```

Set up monitoring and alerts on Flux Kustomization events to catch pruning early:

```bash
# Example: watch for pruning events
kubectl events -n flux-system --watch --field-selector reason=Prune
```

Use branch protection rules in Git to prevent accidental deletions of critical manifest directories. Require code reviews for changes to infrastructure paths.

## Diagnostic Checklist

When resources are unexpectedly deleted, run through this checklist:

```bash
# 1. Check Kustomization status
flux get kustomization my-app

# 2. Check last applied revision
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.lastAppliedRevision}'

# 3. Check current inventory
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries[*].id}' | tr ' ' '\n'

# 4. Check GitRepository status
flux get source git flux-system

# 5. Build kustomize locally
kustomize build apps/production/

# 6. Check controller logs
kubectl logs -n flux-system deployment/kustomize-controller --since=2h | grep my-app

# 7. Check Git history for deletions
git log --oneline --diff-filter=D -- apps/production/
```

## Conclusion

Unexpected resource deletion by Flux pruning is almost always caused by changes in the Git repository or Kustomization configuration that cause resources to disappear from the computed manifest set. By following a systematic troubleshooting approach, checking Git history, verifying Kustomize build output, and examining controller logs, you can quickly identify the root cause and prevent recurrence. Protect critical resources with prune-disabled annotations and establish monitoring for pruning events to catch issues before they impact production.
