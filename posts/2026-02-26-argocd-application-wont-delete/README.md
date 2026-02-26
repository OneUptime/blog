# How to Handle ArgoCD Application That Won't Delete

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Operations

Description: Fix ArgoCD applications stuck in a deleting state by understanding finalizers, orphan resources, and the correct deletion strategies.

---

You try to delete an ArgoCD Application and it just hangs. The application shows a "Deleting" status in the UI, but it never actually goes away. Or maybe the delete command returns immediately but the Application resource persists in the cluster. This is one of the most common operational headaches with ArgoCD.

The cause is almost always related to finalizers, and understanding how ArgoCD finalizers work will help you fix this quickly and prevent it from happening again.

## Why ArgoCD Applications Get Stuck Deleting

When you delete an ArgoCD Application, Kubernetes does not immediately remove the resource. Instead, it sets a `deletionTimestamp` on the Application and then waits for all finalizers to complete their work before actually deleting the object.

ArgoCD uses finalizers to control what happens to the resources that the Application manages. The main finalizer is `resources-finalizer.argocd.argoproj.io`, which tells ArgoCD to delete all the child resources (Deployments, Services, ConfigMaps, etc.) from the target cluster before the Application itself is removed.

The deletion gets stuck when the finalizer cannot complete its work. Common reasons include:

- The target cluster is unreachable
- Child resources have their own finalizers that are stuck
- RBAC permissions prevent ArgoCD from deleting resources
- A webhook is blocking the deletion of child resources
- The namespace of the child resources is also being deleted

## Quick Fix: Remove the Finalizer

If you just want the Application resource gone and do not care about cleaning up the child resources (or they are already gone), remove the finalizer.

```bash
# Remove the finalizer from the Application
kubectl -n argocd patch application my-app \
  -p '{"metadata": {"finalizers": null}}' \
  --type merge
```

This tells Kubernetes to stop waiting for the finalizer and delete the Application immediately. The managed resources in the target cluster will be left as-is (orphaned).

## Understanding the Deletion Cascade Options

ArgoCD provides three deletion behaviors, and choosing the right one upfront avoids stuck deletions.

```bash
# Option 1: Cascade delete (default) - deletes app AND managed resources
argocd app delete my-app

# Option 2: Non-cascade delete - deletes app, KEEPS managed resources (orphan)
argocd app delete my-app --cascade=false

# Option 3: Using kubectl with cascade control
kubectl -n argocd delete application my-app
```

When you use `--cascade=false`, ArgoCD removes the finalizer before deleting, so the Application is removed immediately without trying to clean up child resources.

## Diagnosing Why the Deletion Is Stuck

Before removing the finalizer, it is worth understanding why the deletion is stuck so you can fix the underlying issue.

### Check the Application Status

```bash
# Get detailed status of the application
argocd app get my-app

# Check the Application resource directly
kubectl -n argocd get application my-app -o yaml
```

Look for the `status.conditions` field and any error messages related to the deletion.

### Check ArgoCD Controller Logs

The application-controller handles finalizer processing. Check its logs for errors.

```bash
# Look for deletion-related errors
kubectl -n argocd logs deployment/argocd-application-controller | grep -i "my-app\|delete\|finaliz"
```

Common error patterns include:

- `failed to delete resource`: RBAC or network issues
- `context deadline exceeded`: Target cluster is unreachable
- `admission webhook denied`: A webhook is blocking deletion

### Check if the Target Cluster Is Reachable

```bash
# List registered clusters
argocd cluster list

# Check connectivity to the target cluster
argocd cluster get https://target-cluster-api:6443
```

If the target cluster has been decommissioned or its credentials have expired, ArgoCD cannot delete the child resources and the finalizer will be stuck forever.

## Fix for Unreachable Target Clusters

If the target cluster is gone or unreachable, the cleanest approach is to remove the finalizer.

```bash
# Remove the finalizer
kubectl -n argocd patch application my-app \
  -p '{"metadata": {"finalizers": []}}' \
  --type merge
```

If you have multiple stuck applications from the same unreachable cluster, you can batch this.

```bash
# Find all applications targeting a specific cluster
kubectl -n argocd get applications -o json | \
  jq -r '.items[] | select(.spec.destination.server == "https://dead-cluster:6443") | .metadata.name' | \
  while read app; do
    echo "Removing finalizer from $app"
    kubectl -n argocd patch application "$app" \
      -p '{"metadata": {"finalizers": []}}' \
      --type merge
  done
```

## Fix for Child Resources with Stuck Finalizers

Sometimes the Application deletion is stuck because a child resource has its own stuck finalizer. For example, a PersistentVolumeClaim might have a `kubernetes.io/pvc-protection` finalizer that waits until all pods using the PVC are terminated.

```bash
# Find resources in the target namespace that have finalizers
kubectl get all -n my-app-namespace -o json | \
  jq '.items[] | select(.metadata.finalizers != null) | {name: .metadata.name, kind: .kind, finalizers: .metadata.finalizers}'
```

Fix the stuck child resource first, and the Application deletion will proceed.

```bash
# Example: remove a stuck PVC finalizer
kubectl -n my-app-namespace patch pvc my-stuck-pvc \
  -p '{"metadata": {"finalizers": null}}' \
  --type merge
```

## Fix for Webhook-Blocked Deletions

If an admission webhook is blocking the deletion, you will see errors like "admission webhook denied the request" in the controller logs.

```bash
# Check for validating and mutating webhooks
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations

# Temporarily disable a problematic webhook
kubectl delete validatingwebhookconfiguration my-webhook
```

Be careful with disabling webhooks in production. A better approach is to add a namespace selector to the webhook so it does not apply to the namespace being cleaned up.

## Fix for Namespace Deletion Race Conditions

If you are deleting both the Application and the target namespace at the same time, you can hit a race condition where the namespace is deleted first, and then ArgoCD cannot delete the resources because the namespace is gone.

The solution is to delete the Application first and wait for it to finish before deleting the namespace.

```bash
# Delete the application and wait
argocd app delete my-app --wait

# Then delete the namespace
kubectl delete namespace my-app-namespace
```

## Preventing Stuck Deletions

To avoid this problem in the future, consider these practices.

**Set appropriate finalizer behavior in your Application spec**.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  # Choose your finalizer strategy
  finalizers:
    # Include this if you want ArgoCD to clean up resources on delete
    - resources-finalizer.argocd.argoproj.io
    # Or use the foreground variant for ordered cleanup
    # - resources-finalizer.argocd.argoproj.io/foreground
    # Or omit finalizers entirely if you want orphan behavior
spec:
  # ...
```

**Use sync waves for ordered teardown**. Resources with higher sync waves are deleted first during cascade deletion, which helps avoid dependency issues.

**Monitor your ArgoCD instance** for applications stuck in deleting state. [OneUptime](https://oneuptime.com) can track the health and sync status of your ArgoCD applications, alerting you when something is stuck.

**Regularly test your deletion workflows** in staging before you need them in production. The worst time to discover that your deletion process is broken is during an incident.

The key takeaway is that stuck ArgoCD Application deletions are almost always a finalizer issue. Understanding the finalizer lifecycle and having the kubectl commands ready to remove them will get you unstuck quickly.
