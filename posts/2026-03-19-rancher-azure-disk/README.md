# How to Configure Azure Disk Storage in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, Azure Disk

Description: Learn how to configure Azure Disk storage for persistent volumes in Rancher-managed Kubernetes clusters on Azure.

Azure Disk provides high-performance, durable block storage for Kubernetes workloads running on Azure. Rancher supports Azure Disk through the Azure Disk CSI driver, enabling dynamic provisioning, snapshots, and volume expansion. This guide walks through the complete setup.

## Prerequisites

- A running Rancher instance
- An Azure-based Kubernetes cluster (AKS or a self-managed Rancher/RKE cluster on Azure VMs)
- Azure CLI configured with appropriate permissions
- kubectl and Helm access to your cluster
- For self-managed clusters, Azure cloud-provider configuration and an identity with permission to create and attach managed disks

## Step 1: Install the Azure Disk CSI Driver

For AKS clusters, use the managed Azure Disk CSI driver. For self-managed Rancher or RKE clusters on Azure, install the upstream driver:

```bash
helm repo add azuredisk-csi-driver https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts
helm repo update

helm install azuredisk-csi-driver azuredisk-csi-driver/azuredisk-csi-driver \
  --namespace kube-system \
  --set snapshot.enabled=true
```

Verify the installation:

```bash
kubectl get pods -n kube-system -l app=csi-azuredisk-controller
kubectl get csidriver disk.csi.azure.com
```

## Step 2: Create Azure Disk Storage Classes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-premium-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  fsType: ext4
  cachingMode: ReadOnly
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-standard-ssd
provisioner: disk.csi.azure.com
parameters:
  skuName: StandardSSD_LRS
  fsType: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-premium-ssd-v2
provisioner: disk.csi.azure.com
parameters:
  skuName: PremiumV2_LRS
  fsType: ext4
  DiskIOPSReadWrite: "5000"
  DiskMBpsReadWrite: "200"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f azure-storageclasses.yaml
```

## Step 3: Create a PVC with Azure Disk

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: azure-disk-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: azure-premium-ssd
  resources:
    requests:
      storage: 32Gi
```

```bash
kubectl apply -f azure-disk-pvc.yaml
```

## Step 4: Deploy an Application with Azure Disk

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: default
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
  - port: 3306
    name: mysql
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: default
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: mysecretpassword
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: mysql-data
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: azure-premium-ssd
      resources:
        requests:
          storage: 50Gi
```

```bash
kubectl apply -f mysql.yaml
```

## Step 5: Configure Disk Caching

Azure Disk supports different caching modes:

- **None**: No host caching, required for Premium SSD v2 and Ultra disks, and common for write-heavy workloads
- **ReadOnly**: Caches reads, good for read-heavy or mixed workloads
- **ReadWrite**: Caches reads and writes, but it is deprecated and should only be used when the application handles persistence correctly

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-no-cache
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  cachingMode: None
  fsType: ext4
volumeBindingMode: WaitForFirstConsumer
```

## Step 6: Enable Encryption

Azure managed disks are encrypted at rest by default. To use customer-managed keys, specify a disk encryption set:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-encrypted
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  diskEncryptionSetID: /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Compute/diskEncryptionSets/<des-name>
  fsType: ext4
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

## Step 7: Configure Volume Snapshots

Make sure the VolumeSnapshot CRDs and snapshot controller are available in your cluster. On AKS, enable the snapshot controller. On self-managed clusters, install the VolumeSnapshot CRDs in addition to enabling the chart's snapshot components before creating snapshots.

Create a VolumeSnapshotClass:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-snapshot-class
driver: disk.csi.azure.com
deletionPolicy: Retain
parameters:
  incremental: "true"
```

Take a snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mysql-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: azure-snapshot-class
  source:
    persistentVolumeClaimName: mysql-data-mysql-0
```

## Step 8: Restore from Snapshot

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-mysql-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: azure-premium-ssd
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: mysql-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Step 9: Configure Zone-Redundant Storage

For high availability across zones:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-zrs
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_ZRS
  fsType: ext4
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

ZRS is supported for Premium SSD and Standard SSD managed disks and replicates data across three availability zones, providing higher durability.

## Step 10: Monitor Azure Disk Storage

```bash
# List PVCs

kubectl get pvc --all-namespaces

# Check CSI driver health
kubectl get pods -n kube-system -l app=csi-azuredisk-controller

# View volume details
kubectl describe pv <pv-name>

# Check CSI driver logs
kubectl logs -n kube-system -l app=csi-azuredisk-controller --all-containers=true --tail=50

# Check Azure CLI for disk details
az disk list --resource-group <rg-name> --output table
```

## Troubleshooting

- **PVC Pending**: Check CSI driver is running and, on self-managed clusters, that Azure cloud-provider credentials and disk permissions are configured
- **Attach errors**: Azure VMs have limits on the number of attached disks
- **Wrong zone**: Use `WaitForFirstConsumer` binding mode
- **Slow performance**: Check the SKU type and caching mode
- **Quota exceeded**: Check your Azure subscription disk quotas

## Summary

Azure Disk storage in Rancher provides reliable block storage for Kubernetes workloads on Azure. The Azure Disk CSI driver supports dynamic provisioning, snapshots, encryption, and zone-redundant storage. By choosing the right SKU (Premium SSD, Standard SSD, or Premium SSD v2) and configuring caching appropriately, you can optimize storage performance for your specific workload requirements.
