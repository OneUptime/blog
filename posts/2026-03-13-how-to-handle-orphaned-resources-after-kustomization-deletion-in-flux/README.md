# How to Handle Orphaned Resources After Kustomization Deletion in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kustomization, Orphaned-Resources, Garbage-Collection, Kubernetes

Description: Learn how to handle orphaned resources that remain in your cluster after deleting a Flux Kustomization resource.

---

## Introduction

When you delete a Flux Kustomization resource from your cluster, the behavior regarding the managed resources depends on your configuration. By default, Flux will attempt to garbage collect all resources tracked in the Kustomization inventory. However, there are situations where resources become orphaned, meaning they remain in the cluster without any Flux Kustomization managing them. This can happen due to misconfiguration, partial failures during deletion, or intentional design choices.

Understanding how to handle these orphaned resources is critical for maintaining a clean and predictable cluster state. This post covers the different scenarios that lead to orphaned resources and how to address each one.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- `kubectl` and `flux` CLI tools installed
- Basic understanding of Flux Kustomization and garbage collection

## What Happens When You Delete a Kustomization

When a Flux Kustomization is deleted, the kustomize-controller processes the deletion based on the `prune` setting:

If `prune: true` is set, Flux attempts to delete all resources in the Kustomization's inventory before the Kustomization itself is removed. This is handled through a Kubernetes finalizer.

If `prune: false` is set, Flux removes the Kustomization without touching any of the managed resources. All resources remain in the cluster as orphans.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Identifying Orphaned Resources

Orphaned resources are those that were once managed by a Flux Kustomization but are no longer tracked by any Kustomization. They retain the Flux labels but have no active controller managing them.

To find orphaned resources, look for resources with Flux labels:

```bash
kubectl get all --all-namespaces -l kustomize.toolkit.fluxcd.io/name=my-app
```

If this returns resources but the `my-app` Kustomization no longer exists, those resources are orphaned:

```bash
kubectl get kustomization my-app -n flux-system
```

If the Kustomization is not found, any resources still carrying its labels are orphans.

## Intentionally Orphaning Resources

Sometimes you want to remove the Kustomization without deleting the managed resources. This is common during migrations or when transferring resource ownership to another controller.

To intentionally orphan resources, you have two options. First, set `prune: false` before deleting:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Apply the change, then delete:

```bash
kubectl apply -f kustomization.yaml
kubectl delete kustomization my-app -n flux-system
```

Second, you can remove the finalizer to skip garbage collection entirely:

```bash
kubectl patch kustomization my-app -n flux-system \
  --type json \
  -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
kubectl delete kustomization my-app -n flux-system
```

This removes the finalizer that triggers garbage collection, causing Kubernetes to delete the Kustomization resource immediately without cleaning up managed resources.

## Cleaning Up Orphaned Resources

If you have orphaned resources that need to be removed, you can clean them up using label selectors:

```bash
# List all orphaned resources for a deleted Kustomization
kubectl get all --all-namespaces \
  -l kustomize.toolkit.fluxcd.io/name=my-app \
  -l kustomize.toolkit.fluxcd.io/namespace=flux-system

# Delete orphaned Deployments
kubectl delete deployments --all-namespaces \
  -l kustomize.toolkit.fluxcd.io/name=my-app

# Delete orphaned Services
kubectl delete services --all-namespaces \
  -l kustomize.toolkit.fluxcd.io/name=my-app

# Delete orphaned ConfigMaps
kubectl delete configmaps --all-namespaces \
  -l kustomize.toolkit.fluxcd.io/name=my-app
```

For a more thorough cleanup, check multiple resource types:

```bash
for resource in deployments services configmaps secrets serviceaccounts \
  clusterroles clusterrolebindings roles rolebindings; do
  echo "Checking $resource..."
  kubectl get $resource --all-namespaces \
    -l kustomize.toolkit.fluxcd.io/name=my-app \
    --no-headers 2>/dev/null
done
```

## Adopting Orphaned Resources into a New Kustomization

Instead of deleting orphaned resources, you can adopt them into a new Kustomization. To do this, create a new Kustomization that includes the same resources in its path:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-v2
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app-v2
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  force: true
```

When Flux applies the new Kustomization, it will take ownership of any matching resources by updating the Flux labels. The `force: true` option ensures that Flux can overwrite the labels even if they reference the old Kustomization.

## Handling Partial Deletion Failures

Sometimes garbage collection partially fails, leaving some resources deleted and others remaining. This can happen due to finalizers on resources, RBAC restrictions, or network issues.

Check the Kustomization for error status:

```bash
kubectl get kustomization my-app -n flux-system -o yaml | grep -A 10 "status:"
```

If the Kustomization is stuck in a terminating state, check for resources blocking deletion:

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries[*].id}'
```

For each resource in the inventory, verify whether it still exists and investigate why deletion failed:

```bash
kubectl get deployment my-deployment -n default -o yaml | grep -A 5 "finalizers:"
```

## Preventing Orphaned Resources

To avoid orphaned resources, follow these practices. Always use `prune: true` for Kustomizations that manage application lifecycle resources. Use the prune-disabled annotation for resources that should persist independently. Test Kustomization deletions in staging environments before production. Monitor Kustomization status regularly to catch deletion failures early.

```bash
# Check all Kustomization statuses
flux get kustomizations
```

## Conclusion

Orphaned resources are a natural consequence of managing Kubernetes clusters with GitOps. Whether they result from intentional decisions, partial failures, or migrations, understanding how to identify, clean up, and prevent orphaned resources is essential for cluster hygiene. Use Flux labels to track managed resources, clean up orphans with targeted kubectl commands, and adopt resources into new Kustomizations when migrating workloads. By establishing clear practices around Kustomization deletion, you can maintain a predictable and well-organized cluster.
