# How to Use Non-Cascade Delete to Orphan Resources in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Application Management, Resource Lifecycle

Description: Learn how to use non-cascade delete in ArgoCD to remove application management while keeping Kubernetes resources running, including when and why to orphan resources.

---

Sometimes you want to remove an application from ArgoCD management without actually deleting the workloads running in your cluster. Maybe you are migrating between ArgoCD instances, restructuring your GitOps repositories, or switching an application to a different deployment tool. Non-cascade delete, also known as orphaning resources, lets you do exactly that.

When you perform a non-cascade delete, ArgoCD removes only the Application custom resource. The Deployments, Services, ConfigMaps, and everything else that ArgoCD was managing continue to run untouched in the cluster. They just become "unmanaged" - no longer tracked or synced by ArgoCD.

## When to use non-cascade delete

Non-cascade delete is the right choice in these scenarios:

- **Migration between ArgoCD instances** - You are moving applications from one ArgoCD installation to another
- **Restructuring applications** - Splitting one large application into multiple smaller ones
- **Switching tools** - Moving from ArgoCD to another deployment method (Helm CLI, Flux, etc.)
- **Temporary removal** - Removing ArgoCD tracking temporarily for debugging or manual intervention
- **Cluster handoff** - Transferring ownership of running workloads to another team's ArgoCD

## Non-cascade delete from the CLI

The simplest way to perform a non-cascade delete is through the ArgoCD CLI:

```bash
# Delete the Application resource only, keep all managed resources
argocd app delete my-app --cascade=false

# Skip the confirmation prompt
argocd app delete my-app --cascade=false -y
```

After running this command, your application will disappear from ArgoCD, but every Kubernetes resource it managed will continue running.

## Non-cascade delete from the UI

In the ArgoCD web interface:

1. Navigate to the application
2. Click the **DELETE** button
3. In the deletion dialog, select **Non-cascade**
4. Type the application name to confirm
5. Click **OK**

## Non-cascade delete with kubectl

You can also achieve non-cascade behavior by removing the finalizer before deleting:

```bash
# Remove the cascade finalizer first
kubectl patch application my-app -n argocd \
  --type json \
  -p '[{"op": "remove", "path": "/metadata/finalizers"}]'

# Then delete the Application
kubectl delete application my-app -n argocd
```

Without the `resources-finalizer.argocd.argoproj.io` finalizer, Kubernetes simply deletes the Application resource without triggering ArgoCD's resource cleanup logic.

## What happens to orphaned resources

When resources are orphaned, several things change:

**ArgoCD tracking labels remain on the resources:**
```bash
# Orphaned resources still have ArgoCD labels
kubectl get deployment my-app -n production -o jsonpath='{.metadata.labels}' | jq
# Output includes: "app.kubernetes.io/instance": "my-app"
```

**Resources continue running normally:**
```bash
# Verify your deployments are still healthy
kubectl get deployments -n production
kubectl get pods -n production
kubectl get services -n production
```

**No more ArgoCD sync or health monitoring:**
The resources are no longer reconciled against a Git source. Manual changes will persist without ArgoCD reverting them.

## Cleaning up ArgoCD tracking metadata

After a non-cascade delete, you may want to remove the ArgoCD tracking labels and annotations from orphaned resources:

```bash
# Remove ArgoCD tracking annotation from all resources in the namespace
kubectl get all -n production -o name | xargs -I {} kubectl annotate {} \
  argocd.argoproj.io/tracking-id- \
  kubectl.kubernetes.io/last-applied-configuration-

# Remove ArgoCD instance labels
kubectl get all -n production -o name | xargs -I {} kubectl label {} \
  app.kubernetes.io/instance- \
  app.kubernetes.io/managed-by- \
  app.kubernetes.io/part-of-
```

Here is a more targeted approach using label selectors:

```bash
# Only clean up resources that belonged to a specific application
APP_NAME="my-app"
kubectl get all -n production -l app.kubernetes.io/instance=$APP_NAME -o name | \
  xargs -I {} kubectl label {} app.kubernetes.io/instance-
kubectl get all -n production -l app.kubernetes.io/instance=$APP_NAME -o name | \
  xargs -I {} kubectl annotate {} argocd.argoproj.io/tracking-id-
```

## Non-cascade delete in app-of-apps

When using the app-of-apps pattern, non-cascade delete at the parent level has specific behavior:

```yaml
# Parent application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/platform.git
    path: apps
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
```

```bash
# Non-cascade delete the parent application
argocd app delete platform-apps --cascade=false -y
```

This removes the parent Application, but all child Applications remain in ArgoCD. Each child application continues to manage its own resources and sync independently. If you want to clean everything up, you need to delete each child application separately.

## Practical example: migrating between ArgoCD instances

Here is a step-by-step workflow for migrating an application from one ArgoCD instance to another:

```bash
# Step 1: Export the application manifest from the old ArgoCD
argocd app get my-app -o yaml > my-app-migration.yaml

# Step 2: Clean up the manifest for import
# Remove status, metadata.resourceVersion, metadata.uid, metadata.creationTimestamp
kubectl neat -f my-app-migration.yaml > my-app-clean.yaml

# Step 3: Non-cascade delete from old ArgoCD
argocd app delete my-app --cascade=false -y

# Step 4: Switch context to new ArgoCD
argocd login new-argocd.example.com

# Step 5: Apply the application to new ArgoCD
kubectl apply -f my-app-clean.yaml

# Step 6: Verify the new ArgoCD picks up existing resources
argocd app get my-app
argocd app sync my-app
```

## Practical example: splitting a monolith application

If you have one large ArgoCD application managing multiple microservices and want to split it:

```bash
# Step 1: Document all resources in the current application
argocd app resources monolith-app > resource-list.txt

# Step 2: Create individual application manifests for each service
# (Prepare these in Git before the next step)

# Step 3: Non-cascade delete the monolith application
argocd app delete monolith-app --cascade=false -y

# Step 4: Apply the new individual applications
kubectl apply -f apps/service-a.yaml
kubectl apply -f apps/service-b.yaml
kubectl apply -f apps/service-c.yaml

# Step 5: Sync each new application to adopt existing resources
argocd app sync service-a
argocd app sync service-b
argocd app sync service-c
```

## Orphaned resource monitoring

After performing non-cascade deletions, you might end up with resources that are not managed by any ArgoCD application. ArgoCD can detect these:

```yaml
# Enable orphaned resource monitoring in your project
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  orphanedResources:
    warn: true  # Show warnings for orphaned resources
    ignore:
      - group: ""
        kind: ConfigMap
        name: kube-root-ca.crt  # Ignore system ConfigMaps
```

This helps you track which resources in your cluster are not managed by any ArgoCD application, which is useful after performing several non-cascade deletions.

## Common mistakes with non-cascade delete

1. **Forgetting to update resource tracking** - If you create a new application that targets the same namespace, ArgoCD might flag orphaned resources as managed by the new app
2. **Leaving stale ArgoCD labels** - Other tools might interpret ArgoCD labels incorrectly
3. **Not removing the application from Git** - If you use a declarative setup, the parent app-of-apps might recreate the application you just deleted

## Summary

Non-cascade delete is an essential tool for managing ArgoCD application lifecycles without disrupting running workloads. Use it when migrating, restructuring, or transitioning applications between management systems. Always verify that resources remain healthy after the deletion, clean up tracking metadata when appropriate, and watch for orphaned resources that might accumulate over time. The key principle is straightforward: non-cascade delete removes ArgoCD's awareness of resources, not the resources themselves.
