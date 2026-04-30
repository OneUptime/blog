# How to Fix 'Storage Class Detection Error' in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Kubernetes, Storage Class, StorageClass, CSI

Description: Learn how to fix 'Storage Class Detection Error' in Portainer Kubernetes environments by configuring default StorageClasses and resolving CSI driver issues.

---

The "Storage Class Detection Error" in Portainer appears when managing Kubernetes environments and Portainer cannot enumerate the available storage classes. This affects the ability to create PersistentVolumeClaims from the Portainer UI.

## Step 1: Check Storage Classes in Kubernetes

```bash
# List all storage classes in the cluster

kubectl get storageclasses

# Check if a default storage class is set
kubectl get storageclasses -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.storageclass\.kubernetes\.io/is-default-class}{"\n"}{end}'
```

## Step 2: Set a Default Storage Class

If no default storage class is set, Portainer cannot automatically choose one for PersistentVolumeClaims that do not set `storageClassName`:

```bash
# Mark a storage class as default (replace 'local-path' with your storage class name)
kubectl patch storageclass local-path \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'

# Verify
kubectl get storageclasses
# The default class should show "(default)" next to its name
```

## Step 3: Install a Storage Provisioner

For bare-metal Kubernetes clusters without dynamic provisioning, install a storage provisioner. After installation, return to Step 2 and mark the new StorageClass as default if needed:

```bash
# Option 1: Rancher Local Path Provisioner (good for single-node)
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.35/deploy/local-path-storage.yaml

# Option 2: NFS Subdir External Provisioner (for NFS)
helm repo add nfs-subdir-external-provisioner \
  https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/

helm install nfs-subdir-external-provisioner \
  nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=192.168.1.100 \
  --set nfs.path=/mnt/nfs_share
```

## Step 4: Check Portainer RBAC Permissions

Portainer or the Portainer Agent needs permission to read storage classes:

```bash
# Replace <service-account-name> with the account used by your Portainer deployment
# Common values are 'portainer' for local installs and 'portainer-sa-clusteradmin' for agent installs
kubectl auth can-i list storageclasses \
  --as=system:serviceaccount:portainer:<service-account-name>

# If "no", create a minimal ClusterRole and bind it to that service account
kubectl create clusterrole portainer-storageclasses \
  --verb=get,list,watch \
  --resource=storageclasses.storage.k8s.io

kubectl create clusterrolebinding portainer-storageclasses \
  --clusterrole=portainer-storageclasses \
  --serviceaccount=portainer:<service-account-name>
```

## Step 5: Refresh Kubernetes Environment in Portainer

After fixing the storage class:

1. In Portainer go to **Environments > Kubernetes environment**.
2. Click **Edit** and then **Update environment**.
3. Portainer will re-enumerate cluster resources including storage classes.

## Step 6: Check CSI Driver Pods

If using a CSI driver, verify its pods are healthy (replace `kube-system` if your driver runs in a different namespace):

```bash
# Check CSI driver pods are running
kubectl get pods -n kube-system | grep csi

# Check CSI driver logs for errors
kubectl logs -n kube-system <csi-pod-name>
```
