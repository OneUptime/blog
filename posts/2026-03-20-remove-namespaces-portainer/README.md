# How to Remove Namespaces in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, Cleanup, DevOps

Description: Learn how to safely remove Kubernetes namespaces and all their resources through the Portainer UI.

## Warning: Namespace Deletion Is Destructive

Deleting a namespace removes **all** resources within it - deployments, pods, services, ConfigMaps, Secrets, and PVCs. This action is irreversible. Always verify the contents of a namespace before deletion.

## Removing a Namespace in Portainer

1. Select your Kubernetes environment.
2. Go to **Namespaces** in the sidebar.
3. Check the checkbox next to the namespace(s) to remove.
4. Click **Remove** and confirm.

## Reviewing Namespace Contents Before Deletion

```bash
# Check all resources in a namespace before deleting it

kubectl get all --namespace=my-namespace

# Check PVCs (not shown by 'get all')
kubectl get pvc --namespace=my-namespace

# Check ConfigMaps and Secrets
kubectl get configmaps,secrets --namespace=my-namespace

# Check for any finalizers that might block deletion
kubectl get namespace my-namespace -o json | jq '.spec.finalizers'
```

## Deleting a Namespace via CLI

```bash
# Delete the namespace (and all its contents)
kubectl delete namespace my-namespace

# Watch the deletion progress (may take a minute for all resources to terminate)
kubectl get namespace my-namespace --watch
```

## Stuck Namespace Deletion

Sometimes namespaces get stuck in `Terminating` state. Check the namespace conditions and finalizers first:

```bash
# Check what's blocking termination
kubectl describe namespace my-namespace | grep -A5 Conditions

# As a last resort, force removal of a stuck namespace by clearing finalizers
kubectl get namespace my-namespace -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw /api/v1/namespaces/my-namespace/finalize -f -
```

## Preventing Accidental Deletion

Add labels as a reminder:

```bash
# Add a "do-not-delete" label as a reminder
kubectl label namespace production \
  lifecycle=permanent \
  team=platform
```

In Portainer Business Edition, use environment RBAC so only administrators for that environment can manage namespaces.

## Initial Namespaces You Should Not Delete

| Namespace | Purpose |
|-----------|---------|
| `default` | Default namespace for resources without a namespace |
| `kube-system` | Kubernetes system components |
| `kube-public` | Publicly accessible cluster info |
| `kube-node-lease` | Node heartbeat leases |

## Conclusion

Namespace deletion in Portainer is quick but irreversible. Always audit a namespace's contents - especially PVCs with important data - before removing it. Use the `kubectl get all` and `kubectl get pvc` commands to do a final check before confirming deletion.
