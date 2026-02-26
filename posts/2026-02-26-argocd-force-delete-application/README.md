# How to Force Delete an Application in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Application Management

Description: Learn how to force delete an ArgoCD application when normal deletion fails, including finalizer removal, kubectl patches, and handling edge cases with stuck resources.

---

When an ArgoCD application refuses to delete through normal channels, you need to force the issue. Force deletion bypasses the standard cleanup process, removes blocking finalizers, and gets rid of the Application resource regardless of what is happening with its managed resources.

This is a last-resort operation. Normal deletion should always be tried first, followed by diagnosing the root cause. But when you are staring at an application that has been stuck in "Deleting" state for hours or you need to clean up during an incident, force deletion gets the job done.

## When to use force deletion

Force deletion is appropriate when:

- An application has been stuck in Deleting state for an extended period
- The target cluster has been decommissioned and is no longer reachable
- A circular dependency between resources prevents normal deletion
- You need to clean up during an incident and cannot wait for normal processes
- ArgoCD controller is unable to process the deletion due to bugs or resource constraints

Force deletion is NOT appropriate when:

- You simply want to delete an application (use normal delete instead)
- You want to keep managed resources running (use non-cascade delete)
- The application is healthy and you have not tried normal deletion first

## Method 1: Force delete via CLI

The ArgoCD CLI does not have an explicit "force delete" flag, but you can combine flags to achieve it:

```bash
# Try normal delete with cascade first
argocd app delete my-app -y

# If that hangs, try non-cascade to at least remove the Application
argocd app delete my-app --cascade=false -y
```

If the CLI also hangs (which happens when the API server is waiting for the controller to process the finalizer), move to kubectl-based approaches.

## Method 2: Remove finalizers with kubectl

The most common force deletion technique is removing finalizers from the Application resource:

```bash
# Check what finalizers are present
kubectl get application my-app -n argocd -o jsonpath='{.metadata.finalizers}'

# Remove all finalizers using a JSON merge patch
kubectl patch application my-app -n argocd \
  --type merge \
  -p '{"metadata":{"finalizers":null}}'

# Alternative: Remove specific finalizer using JSON patch
kubectl patch application my-app -n argocd \
  --type json \
  -p '[{"op": "remove", "path": "/metadata/finalizers/0"}]'
```

Once the finalizer is removed, Kubernetes will immediately garbage-collect the Application resource. The managed resources in the cluster will NOT be deleted - they become orphaned.

## Method 3: Force delete with kubectl delete

If the Application is stuck even without finalizers:

```bash
# Standard kubectl delete
kubectl delete application my-app -n argocd

# With a timeout to prevent hanging
kubectl delete application my-app -n argocd --timeout=30s

# Absolute last resort: force delete
kubectl delete application my-app -n argocd --grace-period=0 --force
```

The `--force --grace-period=0` combination tells Kubernetes to remove the resource from etcd immediately without waiting for any graceful shutdown or finalizer processing.

## Method 4: Direct API call

When kubectl commands also hang (usually due to webhook issues), you can bypass everything with a direct API call:

```bash
# Get the ArgoCD Application's resource version
RESOURCE_VERSION=$(kubectl get application my-app -n argocd -o jsonpath='{.metadata.resourceVersion}')

# Delete via API with zero grace period
kubectl proxy &
curl -X DELETE \
  "http://localhost:8001/apis/argoproj.io/v1alpha1/namespaces/argocd/applications/my-app" \
  -H "Content-Type: application/json" \
  -d "{\"kind\":\"DeleteOptions\",\"apiVersion\":\"v1\",\"preconditions\":{\"resourceVersion\":\"$RESOURCE_VERSION\"},\"propagationPolicy\":\"Orphan\"}"
```

## Force deleting multiple stuck applications

When you have several applications stuck, use a script to handle them in bulk:

```bash
#!/bin/bash
# Force delete all stuck applications (those with a deletion timestamp)

STUCK_APPS=$(kubectl get applications -n argocd -o json | \
  jq -r '.items[] | select(.metadata.deletionTimestamp != null) | .metadata.name')

if [ -z "$STUCK_APPS" ]; then
  echo "No stuck applications found"
  exit 0
fi

echo "Found stuck applications:"
echo "$STUCK_APPS"
echo ""

for app in $STUCK_APPS; do
  echo "Force deleting: $app"
  # Remove finalizers
  kubectl patch application "$app" -n argocd \
    --type merge \
    -p '{"metadata":{"finalizers":null}}'
  echo "  Finalizers removed for $app"
done

# Wait a moment for garbage collection
sleep 5

# Verify
echo ""
echo "Verification:"
kubectl get applications -n argocd -o json | \
  jq -r '.items[] | select(.metadata.deletionTimestamp != null) | .metadata.name' | \
  while read app; do
    echo "  Still stuck: $app"
  done || echo "  All stuck applications have been deleted"
```

## Cleaning up after force deletion

After force-deleting an Application, the managed Kubernetes resources are still running in the cluster. You need to decide what to do with them:

**Option 1: Leave them running (if still needed)**
```bash
# Just verify they are healthy
kubectl get all -n my-app-namespace
```

**Option 2: Manually delete the orphaned resources**
```bash
# Delete all resources in the namespace
kubectl delete all --all -n my-app-namespace

# Or delete the entire namespace if it is no longer needed
kubectl delete namespace my-app-namespace
```

**Option 3: Recreate the ArgoCD application to manage them again**
```bash
# Recreate the application (it will adopt existing resources)
argocd app create my-app \
  --repo https://github.com/myorg/my-app.git \
  --path manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app-namespace

# Sync to reconcile
argocd app sync my-app
```

## Handling force deletion of app-of-apps

Force deleting a parent application in an app-of-apps setup requires special care:

```bash
# Step 1: Force delete the parent
kubectl patch application parent-app -n argocd \
  --type merge \
  -p '{"metadata":{"finalizers":null}}'

# Step 2: Child applications are NOT automatically affected
# They continue to exist and manage their resources independently

# Step 3: If you also want to remove child applications
argocd app list -o name | xargs -I {} argocd app delete {} --cascade=false -y
```

If child applications are also stuck:

```bash
# Force delete all applications in a project
kubectl get applications -n argocd -l argocd.argoproj.io/project=my-project -o name | \
  xargs -I {} kubectl patch {} -n argocd --type merge \
  -p '{"metadata":{"finalizers":null}}'
```

## What force deletion does NOT do

It is important to understand what force deletion skips:

1. **Resource cleanup** - Managed Kubernetes resources remain in the cluster
2. **Notification hooks** - No PostDelete or SyncFail notifications are triggered
3. **Audit logging** - The deletion may not be properly captured in ArgoCD audit logs
4. **Cascade processing** - No ordered teardown of resources happens
5. **PVC cleanup** - Persistent volumes and claims remain
6. **External resources** - Cloud resources (load balancers, DNS entries) managed by controllers are not affected

## Preventing the need for force deletion

To reduce the likelihood of needing force deletion in the future:

```yaml
# Use background finalizer instead of foreground
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  finalizers:
    # Background deletion is less likely to get stuck
    - resources-finalizer.argocd.argoproj.io/background
```

Set up monitoring for stuck deletions:

```bash
# Add to your monitoring scripts
STUCK_COUNT=$(kubectl get applications -n argocd -o json | \
  jq '[.items[] | select(.metadata.deletionTimestamp != null)] | length')

if [ "$STUCK_COUNT" -gt 0 ]; then
  echo "WARNING: $STUCK_COUNT ArgoCD applications stuck in deletion"
fi
```

Ensure ArgoCD has sufficient RBAC permissions across all managed clusters and namespaces:

```yaml
# Verify cluster role bindings
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-application-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-application-controller
subjects:
  - kind: ServiceAccount
    name: argocd-application-controller
    namespace: argocd
```

For related troubleshooting, see the guide on [handling stuck application deletion](https://oneuptime.com/blog/post/2026-02-26-argocd-stuck-application-deletion/view) which covers diagnosing root causes in more detail.

## Summary

Force deletion in ArgoCD is about removing the Application resource when normal processes fail. The primary technique is removing finalizers from the Application using kubectl patch, which allows Kubernetes to garbage-collect the resource immediately. Always try normal deletion first, diagnose the root cause of the stuck state, and use force deletion only when necessary. Remember to clean up orphaned resources afterward and investigate why the deletion got stuck to prevent it from happening again.
