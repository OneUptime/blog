# How to Browse Storage Classes in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Storage Class, Persistent Storage, DevOps

Description: Learn how to view, understand, and use Kubernetes StorageClasses in Portainer for dynamic volume provisioning and storage management.

## Introduction

StorageClasses define how Kubernetes dynamically provisions PersistentVolumes when a PersistentVolumeClaim is created. Instead of manually creating PVs, a StorageClass acts as a template that automatically provisions storage from the underlying infrastructure - AWS EBS, Azure Disk, GCE PD, or on-premises Ceph or NFS. Portainer provides visibility into available StorageClasses in your cluster. This guide covers browsing StorageClasses in Portainer and using them for dynamic provisioning.

## Prerequisites

- Portainer with Kubernetes environment
- Kubernetes cluster with a storage provisioner

## What StorageClasses Define

```text
Provisioner         - Which storage backend creates volumes (e.g., ebs.csi.aws.com)
Parameters          - Storage backend-specific configuration (type, encryption)
ReclaimPolicy       - What happens to PVs when PVCs are deleted (Delete/Retain)
VolumeBindingMode   - When to bind PVCs (Immediate or WaitForFirstConsumer)
AllowVolumeExpansion - Whether PVCs can be resized after creation
```

## Step 1: View StorageClasses in Portainer

1. Select your Kubernetes environment in Portainer
2. In the sidebar, click **Volumes**, then open the **Storage** tab

The list shows:
```text
Name                     Provisioner                     ReclaimPolicy    Default
standard                 kubernetes.io/no-provisioner               Delete           No
gp3                      ebs.csi.aws.com                            Delete           Yes
gp2                      ebs.csi.aws.com                            Delete           No
io1-high-iops            ebs.csi.aws.com                            Delete           No
nfs-client               k8s-sigs.io/nfs-subdir-external-provisioner Delete           No
local-path               rancher.io/local-path                      Delete           No
```

## Step 2: View StorageClass Details

Portainer's **Storage** tab lets you browse the available classes and expand them to see the volumes using each one. For the full StorageClass configuration, use `kubectl`:

```text
Name:            gp3
Provisioner:     ebs.csi.aws.com
ReclaimPolicy:   Delete
VolumeBindingMode: WaitForFirstConsumer
AllowVolumeExpansion: true

Parameters:
  type: gp3
  encrypted: "true"
  throughput: "125"
  iops: "3000"
```

## Step 3: View StorageClasses via kubectl

```bash
# List all StorageClasses

kubectl get storageclasses

# Detailed view
kubectl describe storageclass gp3

# View as YAML
kubectl get storageclass gp3 -o yaml

# Check which StorageClass is the default
kubectl get storageclass | grep "(default)"
# or
kubectl get storageclass -o json | \
  jq -r '.items[] | select(.metadata.annotations["storageclass.kubernetes.io/is-default-class"] == "true") | .metadata.name'
```

## Step 4: Common StorageClass Examples

### AWS EBS gp3

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  type: gp3
  encrypted: "true"
  throughput: "125"      # MiB/s
  iops: "3000"
```

### Azure Managed Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  cachingMode: ReadOnly
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

### GCE Persistent Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gce-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: none
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

### On-Premises NFS

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  archiveOnDelete: "false"
reclaimPolicy: Delete
```

### Local Path (Rancher/k3s)

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

## Step 5: Create a PVC Using a StorageClass

Reference a StorageClass in a PVC to trigger dynamic provisioning:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3      # Reference the StorageClass
  resources:
    requests:
      storage: 50Gi
```

Kubernetes automatically creates a PV from the StorageClass provisioner.

To use the default StorageClass (omit `storageClassName` if your cluster has one):

```yaml
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  # No storageClassName - uses cluster default if one exists
```

## Step 6: Set a Default StorageClass

```bash
# Mark a StorageClass as default
kubectl patch storageclass gp3 \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "true"}}}'

# Remove default from another StorageClass
kubectl patch storageclass standard \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "false"}}}'
```

Only one StorageClass should be the default to avoid ambiguity. Kubernetes allows multiple defaults; if that happens, a PVC without an explicit `storageClassName` uses the most recently created default StorageClass.

## Step 7: Check StorageClass Usage

Find PVCs using each StorageClass:

```bash
# List PVCs with their StorageClass
kubectl get pvc --all-namespaces \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,CLASS:.spec.storageClassName,SIZE:.spec.resources.requests.storage,STATUS:.status.phase'

# Count PVCs by StorageClass
kubectl get pvc --all-namespaces -o json | \
  jq -r '.items[] | (.spec.storageClassName // "<unset>")' | \
  sort | uniq -c | sort -rn

# Find PVCs using the current default StorageClass
DEFAULT_SC=$(kubectl get storageclass -o json | \
  jq -r '[.items[]
    | select(.metadata.annotations["storageclass.kubernetes.io/is-default-class"] == "true")
    | {name: .metadata.name, created: .metadata.creationTimestamp}]
    | sort_by(.created) | last | .name // empty')

kubectl get pvc --all-namespaces -o json | \
  jq -r --arg sc "$DEFAULT_SC" '.items[] | select(.spec.storageClassName == $sc) | "\(.metadata.namespace)/\(.metadata.name)"'
```

## Step 8: Migrate PVCs Between StorageClasses

To move data from one StorageClass to another (for example, from gp2 to gp3), stop the workload or otherwise quiesce writes first:

```bash
# 1. Create a new PVC with the target StorageClass
# 2. Copy data using a temporary pod
kubectl run data-migrator \
  --image=alpine \
  --restart=Never \
  -n production \
  --overrides='{
    "spec": {
      "volumes": [
        {"name":"source","persistentVolumeClaim":{"claimName":"old-pvc"}},
        {"name":"dest","persistentVolumeClaim":{"claimName":"new-pvc"}}
      ],
      "containers": [{
        "name":"migrator",
        "image":"alpine",
        "command":["sh","-c","cp -av /source/. /dest/"],
        "volumeMounts":[
          {"name":"source","mountPath":"/source","readOnly":true},
          {"name":"dest","mountPath":"/dest"}
        ]
      }]
    }
  }'

# 3. Watch the migration
kubectl logs -f data-migrator -n production

# 4. Update the deployment to use the new PVC
# 5. Delete the old PVC after verifying
```

## Conclusion

StorageClasses are the foundation of dynamic storage provisioning in Kubernetes. Browsing StorageClasses in Portainer gives you visibility into available storage options and their configurations. Choose the right StorageClass for each workload's requirements - high IOPS for databases, bulk storage for file shares, local-path for development. For topology-constrained backends, set `WaitForFirstConsumer` to avoid binding volumes in the wrong availability zone, enable `allowVolumeExpansion` where the driver supports it, and keep a default StorageClass configured for workloads that don't specify one explicitly.
