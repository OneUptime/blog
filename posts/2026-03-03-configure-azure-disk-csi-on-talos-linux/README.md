# How to Configure Azure Disk CSI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Azure, CSI, Storage, Kubernetes, Azure Disk

Description: Step-by-step guide to deploying the Azure Disk CSI driver on Talos Linux for persistent block storage in Kubernetes.

---

Stateful workloads on Kubernetes need persistent storage, and if your cluster runs on Azure, Azure Managed Disks are the natural choice for block storage. The Azure Disk CSI driver replaces the legacy in-tree volume plugin and gives you access to newer features like disk snapshots, volume cloning, and Ultra Disk support. This guide covers deploying and configuring the driver on Talos Linux.

## Why Use the CSI Driver Instead of In-Tree

The in-tree Azure Disk plugin that shipped with older versions of Kubernetes is being deprecated. It was baked into the Kubernetes controller manager and kubelet, which made updates slow and tied storage fixes to Kubernetes release cycles. The CSI driver runs as standalone pods in your cluster and can be updated independently.

Beyond the operational benefits, the CSI driver supports features the in-tree plugin never had: volume snapshots, volume cloning, Ultra Disk and Premium SSD v2 support, shared disks, and on-demand bursting configuration.

## Prerequisites

Before you begin, ensure you have:

- A Talos Linux cluster running on Azure
- The Azure cloud provider configured and running
- `kubectl` and Helm installed
- A service principal or managed identity with disk management permissions

## IAM Permissions

The CSI driver needs permissions to create and manage Azure Managed Disks. If you are using a service principal, ensure it has the following role assignment:

```bash
# Assign the Contributor role (or a custom role) to the service principal
az role assignment create \
  --assignee <service-principal-app-id> \
  --role "Contributor" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>
```

For a more restrictive custom role, the driver needs these actions at minimum:

```json
{
  "actions": [
    "Microsoft.Compute/disks/read",
    "Microsoft.Compute/disks/write",
    "Microsoft.Compute/disks/delete",
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/write",
    "Microsoft.Compute/snapshots/read",
    "Microsoft.Compute/snapshots/write",
    "Microsoft.Compute/snapshots/delete"
  ]
}
```

## Deploying the Azure Disk CSI Driver

The recommended installation method is Helm:

```bash
# Add the Azure Disk CSI Helm repository
helm repo add azuredisk-csi-driver https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts
helm repo update

# Install the driver
helm install azuredisk-csi-driver azuredisk-csi-driver/azuredisk-csi-driver \
  --namespace kube-system \
  --set controller.replicas=2 \
  --set cloud=AzurePublicCloud \
  --set linux.distro=fedora
```

The `linux.distro=fedora` setting matters because Talos uses a non-standard filesystem layout. Setting it to `fedora` avoids issues with mount path detection.

## Verifying the Installation

After deployment, verify the driver is running:

```bash
# Check that controller and node pods are running
kubectl get pods -n kube-system -l app=csi-azuredisk-controller
kubectl get pods -n kube-system -l app=csi-azuredisk-node

# Verify CSI driver registration
kubectl get csidrivers | grep disk.csi.azure.com
```

You should see controller pods running on control plane nodes (or wherever they get scheduled) and node pods running as a DaemonSet on every worker node.

## Creating Storage Classes

Create StorageClasses for different performance tiers:

```yaml
# standard-ssd.yaml - Standard SSD (most common)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-standard-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: disk.csi.azure.com
parameters:
  skuName: StandardSSD_LRS
  # LRS = Locally Redundant Storage
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# premium-ssd.yaml - Premium SSD for production databases
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-premium-ssd
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  cachingMode: ReadOnly
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# ultra-disk.yaml - Ultra Disk for extreme IOPS
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-ultra-disk
provisioner: disk.csi.azure.com
parameters:
  skuName: UltraSSD_LRS
  # Configure IOPS and throughput per volume
  diskIOPSReadWrite: "4000"
  diskMBpsReadWrite: "125"
  cachingMode: None
  logicalSectorSize: "512"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

```bash
# Apply all storage classes
kubectl apply -f standard-ssd.yaml
kubectl apply -f premium-ssd.yaml
kubectl apply -f ultra-disk.yaml
```

The `WaitForFirstConsumer` binding mode is important. It delays volume creation until a pod actually needs the volume, ensuring the disk is created in the same availability zone as the pod.

## Testing with a Persistent Volume Claim

Create a PVC and a pod to validate the setup:

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-azure-disk
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: azure-standard-ssd
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-disk-pod
spec:
  containers:
    - name: app
      image: busybox
      command: ["sh", "-c", "echo 'Azure disk works' > /data/test.txt && sleep 3600"]
      volumeMounts:
        - mountPath: /data
          name: disk-volume
  volumes:
    - name: disk-volume
      persistentVolumeClaim:
        claimName: test-azure-disk
```

```bash
# Deploy and verify
kubectl apply -f test-pvc.yaml
kubectl get pvc test-azure-disk --watch

# Once bound, verify the pod
kubectl exec test-disk-pod -- cat /data/test.txt
```

## Volume Snapshots

The Azure Disk CSI driver supports volume snapshots. First, install the snapshot CRDs and controller if not already present:

```bash
# Install snapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
```

Create a VolumeSnapshotClass and take a snapshot:

```yaml
# snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-disk-snapshot
driver: disk.csi.azure.com
deletionPolicy: Delete
parameters:
  incremental: "true"
---
# snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: test-disk-snapshot
spec:
  volumeSnapshotClassName: azure-disk-snapshot
  source:
    persistentVolumeClaimName: test-azure-disk
```

Setting `incremental: "true"` creates incremental snapshots, which are much cheaper and faster than full snapshots.

## Volume Expansion

If you need more space, expand a PVC by editing the storage request:

```bash
# Expand the volume from 20Gi to 50Gi
kubectl patch pvc test-azure-disk -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'

# Check the status
kubectl get pvc test-azure-disk
```

The CSI driver handles the expansion automatically. For Standard and Premium SSDs, the expansion happens online without needing to restart the pod.

## Caching and Performance Tuning

Azure Disk caching can significantly impact performance. The `cachingMode` parameter in your StorageClass controls this:

- `None` - No caching, best for write-heavy workloads
- `ReadOnly` - Caches reads in the host memory, best for read-heavy workloads
- `ReadWrite` - Caches both reads and writes, best for general workloads (not recommended for databases)

For databases, `ReadOnly` caching on Premium SSD is usually the best balance of performance and data safety.

## Troubleshooting

If PVCs are stuck in Pending state, check the CSI controller logs:

```bash
# Check controller logs for provisioning errors
kubectl logs -n kube-system -l app=csi-azuredisk-controller -c azuredisk --tail=50

# Check events on the PVC
kubectl describe pvc test-azure-disk
```

Common issues include insufficient permissions on the service principal, reaching the disk count limit per VM, and availability zone mismatches. Each Azure VM size has a maximum number of data disks it can support, so verify your VM size supports the number of volumes you need.

## Conclusion

The Azure Disk CSI driver on Talos Linux provides robust persistent storage with support for multiple disk types, snapshots, cloning, and online expansion. Start with Standard SSD for general workloads, Premium SSD for production databases, and Ultra Disk when you need extreme IOPS. The key configuration decisions are StorageClass parameters and the volume binding mode, both of which directly impact performance and reliability.
