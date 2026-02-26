# How to Understand Why an Application is OutOfSync in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Sync Status

Description: Learn how to diagnose and understand why an ArgoCD application shows OutOfSync status by examining diffs, resource comparisons, and common drift causes.

---

You open the ArgoCD dashboard and see your application showing "OutOfSync." The yellow warning indicator stares at you. But why is it out of sync? Is it a legitimate change from Git that needs deploying, someone manually editing a resource in the cluster, or ArgoCD disagreeing with Kubernetes about default values?

Understanding why an application is OutOfSync is one of the most important troubleshooting skills for ArgoCD operators. This guide walks through the systematic process of diagnosing OutOfSync status.

## What OutOfSync Actually Means

OutOfSync means ArgoCD detected a difference between the desired state (what is in Git) and the live state (what is in the cluster). Specifically:

- The resource exists in Git but not in the cluster (needs creation)
- The resource exists in the cluster but not in Git (needs pruning)
- The resource exists in both but the spec differs (needs updating)

ArgoCD performs this comparison continuously, typically every 3 minutes.

## Step 1: Check the Application Diff

The first thing to do is look at what exactly is different:

```bash
# View the diff between desired and live state
argocd app diff my-app
```

This shows a unified diff for each resource that is out of sync. The output looks like:

```diff
===== apps/Deployment my-namespace/my-deployment ======
--- desired
+++ live
@@ -15,7 +15,7 @@
     spec:
       containers:
       - name: web
-        image: myorg/web:v2.1.0
+        image: myorg/web:v2.0.0
         ports:
         - containerPort: 8080
```

This tells you the Git manifest has `v2.1.0` but the cluster still has `v2.0.0`.

## Step 2: Identify the Out-of-Sync Resources

If the application has many resources, find out which ones specifically are out of sync:

```bash
# List all resources and their sync status
argocd app resources my-app

# Filter to only out-of-sync resources
argocd app resources my-app --orphaned
```

In the UI, out-of-sync resources are highlighted with a yellow indicator in the resource tree.

## Step 3: Understand the Cause

OutOfSync conditions fall into several categories:

### Git Changes Not Yet Synced

The most common and expected cause. Someone pushed a change to Git, and ArgoCD detected the difference:

```bash
# Check the target revision and current sync revision
argocd app get my-app

# Output shows:
# Target:         HEAD (abc1234)
# Current Sync:   def5678
```

If the target revision differs from the current sync revision, there are unsynced Git changes.

### Manual Cluster Changes

Someone used `kubectl` directly to modify a resource:

```bash
# Common scenarios:
# kubectl scale deployment my-app --replicas=5
# kubectl set image deployment/my-app web=myorg/web:hotfix
# kubectl edit service my-service
```

The live state now differs from Git. ArgoCD correctly shows OutOfSync.

To find who made the change:

```bash
# Check Kubernetes audit logs
kubectl get events -n my-namespace --sort-by='.lastTimestamp'

# Check for recent modifications
kubectl get deployment my-deployment -n my-namespace -o yaml | grep -A 3 "managedFields"
```

### Default Values Added by Kubernetes

Kubernetes adds default values to resources when they are created. For example, if you do not specify a `strategy` for a Deployment, Kubernetes adds:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%
    maxUnavailable: 25%
```

This causes a diff because your Git manifest does not have these fields, but the live resource does. ArgoCD sees them as different.

To handle this, use `ignoreDifferences`:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/strategy
```

### Mutating Admission Webhooks

Admission webhooks can modify resources during creation. Common examples:

- Istio sidecar injection adds a container
- Vault agent injection adds init containers
- OPA/Gatekeeper adds labels
- cert-manager adds annotations

```bash
# Check if webhooks are modifying resources
kubectl get mutatingwebhookconfigurations
kubectl get validatingwebhookconfigurations
```

To handle webhook-injected fields:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .spec.template.spec.containers[] | select(.name == "istio-proxy")
        - .spec.template.spec.initContainers[] | select(.name == "vault-agent-init")
```

### Controller-Managed Fields

Some controllers modify resources they manage. For example:

- HPAs modify `spec.replicas`
- cert-manager updates TLS secrets
- External DNS modifies DNS records

```bash
# Check field ownership using server-side apply metadata
kubectl get deployment my-deployment -o yaml | grep -B 2 -A 10 "managedFields"
```

### Resource Version and Generation Changes

These fields change automatically and should never cause OutOfSync. If they do, it is usually a tracking configuration issue:

```yaml
# These should be ignored automatically
metadata:
  resourceVersion: "123456"
  generation: 3
  uid: "abc-def-ghi"
```

ArgoCD ignores these by default, but custom resource tracking configurations might not.

## Step 4: Using the UI for Investigation

The ArgoCD UI provides excellent tools for investigating OutOfSync:

1. **Application View**: Click on the application to see the resource tree. Yellow nodes are out of sync.

2. **Resource Diff**: Click on any out-of-sync resource to see its diff. The UI shows a side-by-side comparison of desired vs live state.

3. **History**: Check the sync history to see when the application last synced and what changed.

4. **Events**: The events tab shows recent operations and their results.

## Step 5: Advanced Diff Analysis

For complex diffs, use the local diff feature:

```bash
# Compare against local manifests
argocd app diff my-app --local /path/to/local/manifests

# Show the diff in a specific format
argocd app diff my-app --local /path/to/local/manifests --local-repo-root /path/to/repo
```

You can also use `kubectl diff` to see what Kubernetes would change:

```bash
# See what kubectl would change
kubectl diff -f manifests/
```

## Resolving OutOfSync

Once you understand the cause, you have several options:

### Sync the Application

If the OutOfSync is from a legitimate Git change:

```bash
# Sync to apply the changes
argocd app sync my-app
```

### Revert Cluster Changes

If someone manually modified the cluster and you want to restore Git state:

```bash
# Sync to overwrite manual changes
argocd app sync my-app

# Or if self-heal is enabled, it happens automatically
```

### Update ignoreDifferences

If the diff is from expected external modifications (HPA, webhooks, etc.):

```yaml
# Add ignore rules for expected differences
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: ""
      kind: Service
      jsonPointers:
        - /spec/clusterIP
        - /spec/clusterIPs
```

### Enable Self-Heal

If you want ArgoCD to automatically correct cluster drift:

```yaml
syncPolicy:
  automated:
    selfHeal: true
```

With self-heal, any manual cluster change that causes OutOfSync is automatically reverted by ArgoCD.

## Common OutOfSync Traps

**Service clusterIP.** Kubernetes assigns a clusterIP when you create a Service without specifying one. If your Git manifest does not include it, there is a diff. Either specify the clusterIP in Git or ignore it.

**Annotations added by controllers.** Load balancer controllers, DNS controllers, and monitoring agents add annotations. Use `ignoreDifferences` for these.

**Timestamp fields.** Some CRDs have timestamp fields that change on every status update. Ignore these with jqPathExpressions.

**Empty vs null vs missing.** An empty array `[]` in Git vs a missing field in the cluster can cause a diff. Similarly, `null` vs missing field.

```yaml
# Handle empty vs missing differences
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .spec.template.spec.tolerations
      - .spec.template.spec.nodeSelector
```

## Summary

Understanding OutOfSync status requires a systematic approach: check the diff, identify the specific resources, determine the cause, and choose the appropriate resolution. Most OutOfSync conditions are either legitimate Git changes waiting to be synced, manual cluster modifications that should be reverted, or expected controller-managed fields that should be added to `ignoreDifferences`. Building this diagnostic muscle is essential for operating ArgoCD effectively in production.
