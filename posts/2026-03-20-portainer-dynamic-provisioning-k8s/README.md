# How to Configure Dynamic Provisioning for Kubernetes Storage in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Storage, StorageClass, DevOps

Description: Learn how to configure dynamic volume provisioning for Kubernetes storage in Portainer using StorageClasses and PersistentVolumeClaims.

## Introduction

Dynamic provisioning in Kubernetes allows PersistentVolumes (PVs) to be created automatically when a PersistentVolumeClaim (PVC) is submitted. Portainer provides a UI-friendly way to work with available StorageClasses and configure storage options for application deployments, while still allowing manifests or `kubectl` when needed.

## Prerequisites

- Portainer BE or CE with a Kubernetes environment connected
- A storage provisioner installed in your cluster (e.g., Rancher Local Path Provisioner, NFS Subdir External Provisioner, Longhorn, OpenEBS)
- Admin access to Portainer

## Understanding StorageClasses

A StorageClass defines:
- **Provisioner**: Which plugin creates the volume (e.g., `rancher.io/local-path`)
- **Reclaim Policy**: `Delete` or `Retain` - what happens to the PV when the PVC is deleted
- **Volume Binding Mode**: `Immediate` or `WaitForFirstConsumer`

## Step 1: Verify a Provisioner Is Installed

Before configuring dynamic provisioning, ensure a provisioner runs in your cluster:

```bash
# Check for storage provisioner pods

kubectl get pods -A | grep -E "(provisioner|local-path|nfs|longhorn)"

# Check available StorageClasses
kubectl get storageclass
```

## Step 2: Review StorageClasses in Portainer and create one if needed

### Via Portainer UI

1. Log into Portainer.
2. Select your **Kubernetes** environment.
3. Navigate to **Volumes** → **Storage**.
4. Review the StorageClasses already available in your cluster.
5. If the class you want is not listed, create it with a manifest or from Portainer's **kubectl shell**.

### Via kubectl (for example, in Portainer's kubectl shell)

```yaml
# storageclass-local-path.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

```bash
# Apply via Portainer's kubectl shell
kubectl apply -f storageclass-local-path.yaml
```

## Step 3: Set a Default StorageClass

```bash
# If another StorageClass is already the default, patch it to false first.
# Then set your chosen StorageClass as the default.
kubectl patch storageclass local-path \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# Verify
kubectl get storageclass
# Look for "local-path (default)" in the NAME column.
```

## Step 4: Configure Dynamic Provisioning in Portainer

In Portainer's Kubernetes settings:

1. Go to **Cluster** → **Setup**.
2. Under **Available storage options**, ensure your desired StorageClass is enabled for application deployments.
3. StorageClasses marked as default in Kubernetes are automatically enabled here, and in clusters with the default admission controller enabled, PVCs without `storageClassName` use the cluster's default StorageClass.

## Step 5: Deploy an Application with a PVC

When deploying via Portainer's **Applications** UI:

1. Go to **Applications** → **Add with form**.
2. Select your namespace and deployment type.
3. In the **Persisted folders** section, add a persisted folder.
4. Configure:
   - Whether to use a new or existing volume
   - **Storage location**: Select the option backed by your configured StorageClass
   - **Size**: e.g., `5Gi`
   - **Data access policy**: `Isolated` for per-instance storage or `Shared` if your backend supports multi-writer access
   - **Mount path**: `/data`
5. Deploy the application. Portainer automatically creates the PVC and the provisioner creates the PV.

## Step 6: Verify Provisioning

```bash
# Check PVCs in namespace
kubectl get pvc -n your-namespace

# Check that PV was dynamically created
kubectl get pv

# Example output showing dynamic provisioning:
# NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   STORAGECLASS
# pvc-a1b2c3d4-e5f6-7890-abcd-ef1234567890   5Gi        RWO            Delete           Bound    local-path
```

## Configuring NFS Dynamic Provisioning

For shared storage with `ReadWriteMany` access, install the NFS Subdir External Provisioner first. Configure the NFS server and export path in the provisioner deployment, then use a StorageClass such as:

```yaml
# nfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  onDelete: delete             # Delete the backing subdirectory when the PVC is removed
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

## Conclusion

Dynamic provisioning in Kubernetes eliminates the need to manually pre-provision PersistentVolumes. By configuring StorageClasses in Portainer, both administrators and developers can request storage on demand through PVCs. Choose the right provisioner for your environment, set sensible reclaim policies, and configure a default StorageClass to simplify the developer experience.
