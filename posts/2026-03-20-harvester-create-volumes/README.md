# How to Create Volumes in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Storage, Longhorn, PVC

Description: Learn how to create and manage persistent storage volumes in Harvester for virtual machine disks and data storage.

## Introduction

Volumes in Harvester are backed by Longhorn, a distributed block storage system built into Kubernetes. Harvester VM volumes are exposed as Kubernetes PersistentVolumeClaims (PVCs). You can create volumes independently and then attach them to VMs, or let Harvester create volumes automatically when provisioning a VM. This guide covers creating volumes manually for use cases like additional data disks.

## Volume Types in Harvester

| Volume Type | Description | Use Case |
|---|---|---|
| VM Root Disk | Created from a VM image, contains the OS | VM boot disk |
| Empty Data Volume | Blank volume, formatted by the VM | Additional storage for a VM |
| Image-backed Volume | Created from an existing VM image | VM boot disk or preloaded data disk |

## Step 1: Create a Volume via the UI

1. Log into the Harvester dashboard
2. Navigate to **Volumes** in the left sidebar
3. Click **Create**
4. Fill in the volume configuration:

```text
Name:           web-server-data
Namespace:      default
Source:         New
Size:           100 Gi
Storage Class:  harvester-longhorn  (default)
```

5. Click **Create** - the volume is created immediately

## Step 2: Create a Volume via kubectl

### Empty Data Volume

```yaml
# data-volume.yaml

# Create an empty 100 GiB data volume for a VM

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: web-server-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: harvester-longhorn
  volumeMode: Block
  resources:
    requests:
      storage: 100Gi
```

```bash
kubectl apply -f data-volume.yaml

# Verify the volume was created and is Bound
kubectl get pvc web-server-data -n default

# Expected output:
# NAME              STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
# web-server-data   Bound     pvc-xxx  100Gi      RWX            harvester-longhorn  10s
```

### Volume from a VM Image

When creating a standalone volume from a VM image, Harvester uses a PVC with the `harvesterhci.io/imageId` annotation:

```yaml
# root-disk-from-image.yaml
# Create a 50 GiB volume from an existing Harvester VM image
# Replace image-8rb2z with the actual VirtualMachineImage name from:
# kubectl get virtualmachineimage -n default

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ubuntu-vm-01-root
  namespace: default
  annotations:
    harvesterhci.io/imageId: "default/image-8rb2z"
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn-image-8rb2z
  volumeMode: Block
  resources:
    requests:
      storage: 50Gi
```

## Step 3: Configure Longhorn Replicas

Longhorn distributes replicas across nodes for data redundancy. For Harvester volumes created through Kubernetes, replica count is controlled by the StorageClass:

```yaml
# high-replica-storageclass.yaml
# StorageClass with 3 replicas for production data durability

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: harvester-longhorn-high-replica
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  migratable: "true"
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

```bash
kubectl apply -f high-replica-storageclass.yaml

# Verify the replica count configured on the StorageClass
kubectl get storageclass harvester-longhorn-high-replica \
    -o jsonpath='{.parameters.numberOfReplicas}'
```

To use a different replica count for a specific volume, create the PVC with that StorageClass:

```yaml
# high-replica-volume.yaml
# Volume with 3 replicas for critical data

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: critical-database-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: harvester-longhorn-high-replica
  volumeMode: Block
  resources:
    requests:
      storage: 500Gi
```

## Step 4: Create a StorageClass with Custom Settings

Create a custom StorageClass for different performance tiers:

```yaml
# storage-class-fast.yaml
# High-performance storage class for latency-sensitive workloads

apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-fast
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  # Keep VM disks migratable
  migratable: "true"
  # Number of replicas
  numberOfReplicas: "2"
  # Node selector for replicas (requires nodes tagged "ssd")
  nodeSelector: "ssd"
  # Disk selector (requires disks tagged "nvme")
  diskSelector: "nvme"
  # Data locality - prefer local replica for reads
  dataLocality: "best-effort"
  # Recurring job (hourly snapshot)
  recurringJobSelector: '[{"name":"snap","isGroup":false}]'
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

```bash
kubectl apply -f storage-class-fast.yaml

# Use the custom storage class in a volume
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-fast-volume
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn-fast
  volumeMode: Block
  resources:
    requests:
      storage: 200Gi
EOF
```

## Step 5: Expand a Volume

Longhorn supports online volume expansion when the StorageClass allows expansion:

```bash
# Expand a volume from 100 GiB to 200 GiB
kubectl patch pvc web-server-data -n default \
    --type merge \
    -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'

# Watch the expansion progress
kubectl get pvc web-server-data -n default -w

# Inside the VM, you may need to resize the filesystem
# (for ext4)
sudo resize2fs /dev/vdb

# (for xfs)
sudo xfs_growfs /data
```

## Step 6: List and Monitor Volumes

```bash
# List all PVC-backed volumes in the default namespace
kubectl get pvc -n default

# List Longhorn volumes
kubectl get volumes.longhorn.io -n longhorn-system

# Get detailed info about the Longhorn volume behind a PVC
LH_VOLUME=$(kubectl get pvc web-server-data -n default -o jsonpath='{.spec.volumeName}')
kubectl describe volumes.longhorn.io "$LH_VOLUME" -n longhorn-system

# Check replica health
kubectl get replicas.longhorn.io -n longhorn-system \
    -o custom-columns=\
'NAME:.metadata.name,VOLUME:.spec.volumeName,NODE:.spec.nodeID,STATE:.status.currentState'
```

## Step 7: Delete a Volume

```bash
# Delete a volume (must not be attached to a VM)
LH_VOLUME=$(kubectl get pvc web-server-data -n default -o jsonpath='{.spec.volumeName}')
kubectl delete pvc web-server-data -n default

# Verify the Longhorn volume is also cleaned up
kubectl get volumes.longhorn.io "$LH_VOLUME" -n longhorn-system
# Expected: Error from server (NotFound) once cleanup completes
```

**Warning:** Deleting a PVC with `reclaimPolicy: Delete` permanently removes the data. Ensure you have a backup or snapshot before deleting.

## Conclusion

Volumes in Harvester are first-class Kubernetes resources powered by Longhorn's distributed storage. Creating volumes independently from VMs gives you flexibility to pre-provision storage, create data disks for existing VMs, and apply different storage policies to different workloads. Longhorn's replica mechanism ensures data durability across node failures, making it suitable for production VM storage. Always configure appropriate replica counts based on your availability requirements and node count.
