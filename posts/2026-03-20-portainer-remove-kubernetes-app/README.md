# How to Remove a Kubernetes Application in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Application, DevOps

Description: Learn how to safely remove Kubernetes applications and their associated resources in Portainer without leaving orphaned objects.

## Introduction

Removing a Kubernetes application in Portainer removes the application workload. Depending on how storage, ConfigMaps, Secrets, Ingresses, or HPAs were created, you may need to remove some related resources separately. This guide covers the complete process of safely removing an application.

## Prerequisites

- Portainer with Kubernetes environment
- Application to remove
- Understanding of what resources need to be kept vs deleted

## Step 1: List Resources Before Deletion

Before removing, understand what the application has created:

```bash
# List all resources for an application

kubectl get all -n production -l app=my-app

# Output:
# NAME                          READY   STATUS
# pod/my-app-xxx-yyy            1/1     Running

# NAME              TYPE        CLUSTER-IP    PORT(S)
# service/my-app    ClusterIP   10.96.1.100   80/TCP

# NAME                     READY   UP-TO-DATE   AVAILABLE
# deployment.apps/my-app   1/1     1            1

# NAME                             DESIRED   CURRENT   READY
# replicaset.apps/my-app-abc123    1         1         1
```

## Step 2: Check for PVCs and Other Resources

```bash
# Check PVCs (they are not removed automatically when you remove the application)
kubectl get pvc -n production -l app=my-app

# Check ConfigMaps
kubectl get configmap -n production -l app=my-app

# Check Secrets
kubectl get secrets -n production -l app=my-app

# Check HPA
kubectl get hpa -n production -l app=my-app

# Check Ingress
kubectl get ingress -n production -l app=my-app
```

## Step 3: Remove the Application via Portainer

1. Navigate to **Applications** in the Kubernetes environment
2. Tick the checkbox next to the application you want to remove
3. Click **Remove**
4. In the confirmation dialog, click **Remove**

## Step 4: Delete Associated PVCs (If No Longer Needed)

Removing the application does not automatically delete PVCs:

```bash
# List PVCs related to the application
kubectl get pvc -n production -l app=my-app

# Delete specific PVC (IRREVERSIBLE - data will be lost)
kubectl delete pvc my-app-data -n production

# Or in Portainer, after the volume is detached and unused:
# navigate to Volumes and remove it
```

**Warning:** Deleting a PVC can permanently delete the backing storage if the bound PersistentVolume uses the `Delete` reclaim policy. Always back up important data before deleting PVCs.

## Step 5: Clean Up Associated Resources

```bash
# Delete ConfigMaps
kubectl delete configmap app-config -n production

# Delete Secrets (be careful - other apps may use them)
kubectl delete secret app-secrets -n production

# Delete HPA
kubectl delete hpa my-app-hpa -n production

# Delete Ingress
kubectl delete ingress my-app-ingress -n production
```

## Step 6: Remove via YAML

If the application was deployed via YAML, delete using the same manifest:

```bash
# Delete all resources defined in a YAML file
kubectl delete -f my-app.yaml -n production

# This deletes the resources defined in that YAML file
```

## Step 7: Remove Helm-Deployed Applications

For Helm-based applications:

```bash
# List Helm releases
helm list --namespace production

# Uninstall a release (removes all chart resources)
helm uninstall my-app --namespace production

# Check for any remaining resources
kubectl get all -n production -l app.kubernetes.io/instance=my-app
```

In Portainer: open the Helm application from **Applications** and use **Uninstall** on the application details page.

## Step 8: Verify Complete Removal

```bash
# Confirm pods are terminated
kubectl get pods -n production -l app=my-app

# Confirm services are removed
kubectl get svc -n production -l app=my-app

# Confirm no labeled resources remain
kubectl get all,pvc,configmap,secret,ingress,hpa -n production -l app=my-app
```

## Cleanup Complete Application Namespace

If you want to remove everything in a namespace:

```bash
# Delete entire namespace (removes ALL resources in it)
kubectl delete namespace my-old-namespace

# WARNING: This deletes everything including PVCs and Secrets
```

In Portainer: navigate to **Namespaces** and use the delete option.

## Step 9: Handle Finalizers (Stuck Deletions)

Sometimes resources get stuck in a `Terminating` state due to finalizers. Only remove finalizers manually after confirming the responsible controller can no longer complete cleanup on its own:

```bash
# Check for finalizers
kubectl get pod stuck-pod -n production -o jsonpath='{.metadata.finalizers}'

# Force remove by patching out the finalizer
kubectl patch pod stuck-pod -n production \
  --type json \
  --patch='[{"op": "remove", "path": "/metadata/finalizers"}]'

# For PVCs stuck terminating
kubectl patch pvc stuck-pvc -n production \
  --type json \
  --patch='[{"op": "remove", "path": "/metadata/finalizers"}]'
```

## Conclusion

Removing Kubernetes applications in Portainer is straightforward but requires careful consideration of associated resources. PVCs are not removed automatically when you delete the application, so always decide explicitly whether to delete them. For clean environments, check for orphaned resources after removal and consider using namespace-level cleanup when decommissioning entire environments. Use YAML manifests or Helm releases for reproducible deployments that can be removed predictably with `kubectl delete -f` or `helm uninstall`.
