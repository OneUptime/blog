# How to Remove a Kubernetes Application in Portainer - Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Application Management, Cleanup, DevOps

Description: Learn how to safely remove a Kubernetes application and its associated resources through the Portainer UI.

## Overview

Removing a Kubernetes application in Portainer removes the selected application from Portainer. The exact Kubernetes resources deleted depend on how the application was deployed. Deleting a workload such as a Deployment removes its managed dependents, but separate resources like Services, ConfigMaps, Secrets, and PVCs often require separate cleanup.

## Removing an Application in Portainer

1. Select your Kubernetes environment.
2. Go to **Applications** in the sidebar.
3. Find the application to remove.
4. Click the checkbox next to the app and click **Remove** in the toolbar.
5. Confirm the deletion in the dialog.

## What Gets Deleted

When you remove an application in Portainer:

- The selected application or workload is removed.
- If it is a **Deployment**, **StatefulSet**, or **DaemonSet**, Kubernetes also removes controller-managed dependents such as **ReplicaSets** and **Pods**.
- **Services**, **ConfigMaps**, **Secrets**, **Ingresses**, and **PVCs** are separate resources and are not removed just because the workload was deleted.

**Note**: Deleting a **PVC** may also delete the backing storage if the bound PersistentVolume uses the `Delete` reclaim policy. Delete PVCs separately and intentionally.

## Removing Associated Resources via CLI

```bash
# Delete a deployment and its pods

kubectl delete deployment my-app --namespace=production

# Delete the associated service
kubectl delete service my-app --namespace=production

# Delete ConfigMaps
kubectl delete configmap app-config --namespace=production

# Delete Secrets (carefully!)
kubectl delete secret app-secrets --namespace=production

# Delete PVC (this may also delete the backing storage, depending on the reclaim policy!)
kubectl delete pvc my-app-data-pvc --namespace=production
```

## Removing Multiple Resources for an Application (Using Labels)

If your resources were created with consistent labels, you can target multiple resource types with label selectors:

```bash
# Delete common workload and networking resources with a specific app label
kubectl delete deployment,statefulset,daemonset,service,ingress --selector=app=my-app --namespace=production

# Delete configuration and storage resources with the same label
kubectl delete configmap,secret,pvc --selector=app=my-app --namespace=production
```

## Removing from a Manifest

```bash
# Remove everything defined in a YAML manifest
kubectl delete -f my-app-deployment.yaml

# Or with a directory of manifests
kubectl delete -f ./manifests/ -R
```

## Verifying Removal

```bash
# Confirm no labeled pods remain
kubectl get pods --selector=app=my-app --namespace=production

# Check for leftover workload and networking resources
kubectl get deployment,statefulset,daemonset,service,ingress --selector=app=my-app --namespace=production

# Check for leftover configuration and storage resources
kubectl get configmap,secret,pvc --selector=app=my-app --namespace=production
```

## Graceful Termination

Kubernetes sends a `SIGTERM` to containers before forceful termination. Ensure your application handles it:

```bash
# Check the termination grace period (default 30s)
kubectl get deployment my-app --namespace=production \
  -o jsonpath='{.spec.template.spec.terminationGracePeriodSeconds}'

# Force-delete a stuck pod (last resort)
kubectl delete pod stuck-pod --namespace=production --grace-period=0 --force
```

## Conclusion

Removing applications in Portainer is straightforward, but always verify that associated persistent data (PVCs) is intentionally preserved or deleted. Use label selectors via CLI to clean up related resources with targeted delete commands.
