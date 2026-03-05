# How to Understand Flux CD Finalizers and Resource Cleanup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Finalizer, Resource Cleanup, Lifecycle Management

Description: Learn how Flux CD uses Kubernetes finalizers to manage resource cleanup and what to do when finalizers cause deletion to hang.

---

Finalizers are a Kubernetes mechanism that prevents a resource from being deleted until a controller has performed cleanup actions. Flux CD uses finalizers on its custom resources to ensure that when a Flux resource is deleted, the managed cluster resources are properly cleaned up. Understanding how finalizers work in Flux is important for managing resource lifecycle, troubleshooting stuck deletions, and performing clean uninstallation.

This guide explains how Flux uses finalizers, what happens during resource deletion, and how to handle common issues related to finalizers.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` access to the cluster
- The `flux` CLI installed

## What Are Finalizers

A finalizer is a string added to a Kubernetes resource's `metadata.finalizers` list. When a deletion request is made for a resource with finalizers, Kubernetes sets the `deletionTimestamp` but does not actually remove the resource. Instead, it waits for all controllers that own finalizers to complete their cleanup work and remove their finalizer string. Only when the finalizers list is empty does Kubernetes delete the resource.

Check the finalizers on a Flux Kustomization:

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.metadata.finalizers}'
```

Output:

```json
["finalizers.fluxcd.io"]
```

## How Flux Uses Finalizers

Flux controllers add the `finalizers.fluxcd.io` finalizer to the resources they manage. This finalizer is added automatically when the resource is created. The purpose depends on the resource type:

**Kustomization**: When a Kustomization with `spec.prune: true` is deleted, the kustomize-controller uses the finalizer to garbage collect all resources listed in the Kustomization's inventory. This means deleting the Kustomization also deletes all the Kubernetes resources it manages (Deployments, Services, ConfigMaps, etc.).

**HelmRelease**: When a HelmRelease is deleted, the helm-controller uses the finalizer to uninstall the Helm release from the cluster, removing all resources the chart created.

**Source resources**: When a GitRepository, HelmRepository, or OCIRepository is deleted, the source-controller uses the finalizer to clean up stored artifacts from its local storage.

## The Deletion Process

When you delete a Flux Kustomization, the following sequence occurs:

1. You run `kubectl delete kustomization my-app -n flux-system`
2. Kubernetes sets the `deletionTimestamp` on the resource
3. The kustomize-controller detects the deletion timestamp
4. If `spec.prune` is true, the controller deletes all resources in the inventory
5. The controller removes the `finalizers.fluxcd.io` finalizer
6. Kubernetes removes the Kustomization resource

```bash
# Watch the deletion process
kubectl delete kustomization my-app -n flux-system &
kubectl get kustomization my-app -n flux-system -w
```

For HelmReleases:

1. You delete the HelmRelease resource
2. The helm-controller runs `helm uninstall` for the release
3. The controller removes the finalizer
4. Kubernetes removes the HelmRelease resource

## Preventing Resource Deletion with Finalizer Removal

Sometimes you want to delete a Flux Kustomization without deleting the resources it manages. For example, when migrating resources from one Kustomization to another. In this case, remove the finalizer before deleting:

```bash
kubectl patch kustomization my-app -n flux-system \
  --type json \
  -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
```

After removing the finalizer, deleting the Kustomization will not trigger cleanup of managed resources. The resources remain in the cluster but are no longer managed by Flux.

Alternatively, set `spec.prune` to false before deletion:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  prune: false
  # ... rest of spec
```

## Troubleshooting Stuck Deletions

The most common finalizer issue is a resource that gets stuck in a terminating state. This happens when the controller cannot complete its cleanup work.

**Symptom**: A Flux resource shows a `deletionTimestamp` but never gets deleted:

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.metadata.deletionTimestamp}'
```

**Common causes**:

1. **Controller not running**: If the kustomize-controller or helm-controller pod is not running, it cannot process the finalizer. Check controller status:

```bash
kubectl get pods -n flux-system
```

If the controller is in CrashLoopBackOff or not present, fix the controller first. Once it is running, it will process pending finalizers.

2. **RBAC permissions**: The controller may lack permissions to delete the managed resources. Check controller logs:

```bash
kubectl logs -n flux-system deployment/kustomize-controller --tail=50
```

3. **Namespace deletion**: If you delete a namespace that contains Flux resources, the namespace may get stuck because Flux controllers need to process finalizers but the namespace is terminating. Delete Flux resources before deleting the namespace.

4. **Network issues during Helm uninstall**: The helm-controller may fail to uninstall a release if the Kubernetes API is under heavy load.

**Resolution for stuck resources**: If you cannot fix the underlying issue and need to force deletion, remove the finalizer manually:

```bash
kubectl patch kustomization my-app -n flux-system \
  --type json \
  -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
```

Be aware that this skips cleanup, leaving managed resources orphaned in the cluster.

## Finalizers During Flux Uninstallation

When uninstalling Flux entirely with `flux uninstall`, the CLI handles finalizers in the correct order:

```bash
flux uninstall
```

The uninstallation process:

1. Suspends all Flux resources to prevent new reconciliations
2. Deletes Kustomizations (triggering garbage collection of managed resources)
3. Deletes HelmReleases (triggering Helm uninstalls)
4. Deletes source resources (cleaning up artifacts)
5. Removes Flux controllers and CRDs

If you delete the Flux CRDs manually before removing the custom resources, the finalizers cannot be processed and managed resources become orphaned. Always use `flux uninstall` for a clean removal.

## Controlling Finalizer Behavior

You can prevent Flux from adding finalizers to specific resources by suspending them before creation or by patching after creation. However, the recommended approach is to use `spec.prune` to control cleanup behavior:

```yaml
# Resources will NOT be deleted when this Kustomization is removed
spec:
  prune: false

# Resources WILL be deleted when this Kustomization is removed
spec:
  prune: true
```

For HelmReleases, you cannot disable the finalizer through spec configuration. The helm-controller always adds a finalizer to ensure proper Helm release cleanup. If you want to keep Helm-managed resources after deleting the HelmRelease, remove the finalizer manually before deletion.

## Summary

Flux CD finalizers ensure that deleting a Flux resource also cleans up the Kubernetes resources it manages. The kustomize-controller uses finalizers to garbage collect resources from the inventory, and the helm-controller uses them to run `helm uninstall`. When finalizers cause stuck deletions, check that the responsible controller is running and has the necessary permissions. For cases where you want to delete a Flux resource without cleaning up managed resources, remove the finalizer before deletion. Always use `flux uninstall` for complete removal to ensure finalizers are processed in the correct order.
