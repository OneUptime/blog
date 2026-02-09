# How to Configure Azure Disk CSI Driver for AKS Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, AKS, Storage

Description: Configure the Azure Disk CSI driver on AKS for dynamic persistent volume provisioning with managed disks, snapshots, and performance tiers.

---

Azure Kubernetes Service uses the Azure Disk CSI driver as the default storage provider for block storage persistent volumes. The driver provides dynamic provisioning of Azure managed disks with support for different performance tiers, snapshots, and volume expansion.

This guide demonstrates how to use the Azure Disk CSI driver effectively, create storage classes for different workload requirements, and manage volume lifecycles.

## Understanding Azure Disk CSI Driver

The Azure Disk CSI driver integrates Azure managed disks with Kubernetes, providing:

**Dynamic provisioning** - Automatically creates managed disks when PersistentVolumeClaims are created.

**Performance tiers** - Support for Standard HDD, Standard SSD, Premium SSD, and Ultra Disk.

**Volume snapshots** - Create point-in-time snapshots for backup and recovery.

**Volume expansion** - Resize volumes without downtime.

**Zone redundancy** - Support for zone-redundant storage (ZRS) and locally-redundant storage (LRS).

AKS clusters version 1.21 and later have the CSI driver pre-installed and enabled by default.

## Verifying CSI Driver Installation

Check that the Azure Disk CSI driver is running:

```bash
# Check driver pods
kubectl get pods -n kube-system -l app=csi-azuredisk-controller
kubectl get pods -n kube-system -l app=csi-azuredisk-node

# Verify CSI driver registration
kubectl get csidrivers disk.csi.azure.com
```

View default storage classes:

```bash
# List storage classes
kubectl get storageclasses

# The default classes are:
# - managed-csi (Premium SSD)
# - azurefile-csi (Azure Files)
# - managed-csi-premium (Premium SSD - legacy)
```

## Creating Custom Storage Classes

Create a storage class for Standard SSD:

```yaml
# standard-ssd-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-standard-ssd
provisioner: disk.csi.azure.com
parameters:
  skuName: StandardSSD_LRS
  kind: Managed
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Create storage class for Premium SSD with zone redundancy:

```yaml
# premium-zrs-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium-zrs
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_ZRS
  kind: Managed
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Create storage class for Ultra Disk:

```yaml
# ultra-disk-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-ultra
provisioner: disk.csi.azure.com
parameters:
  skuName: UltraSSD_LRS
  kind: Managed
  cachingMode: None
  diskIOPSReadWrite: "2000"
  diskMBpsReadWrite: "320"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Apply the storage classes:

```bash
kubectl apply -f standard-ssd-storage-class.yaml
kubectl apply -f premium-zrs-storage-class.yaml
kubectl apply -f ultra-disk-storage-class.yaml
```

## Using Persistent Volume Claims

Create a PVC for a database:

```yaml
# mysql-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: managed-premium-zrs
  resources:
    requests:
      storage: 100Gi
```

Deploy MySQL using the PVC:

```yaml
# mysql-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
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
        ports:
        - containerPort: 3306
          name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "changeme"
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: mysql-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: managed-premium-zrs
      resources:
        requests:
          storage: 100Gi
```

Apply and verify:

```bash
kubectl apply -f mysql-statefulset.yaml

# Check PVC status
kubectl get pvc

# Check PV details
kubectl get pv

# View managed disk details
kubectl describe pv <pv-name>
```

## Expanding Volumes

Resize a volume by patching the PVC:

```bash
# Increase volume size to 200Gi
kubectl patch pvc mysql-data-mysql-0 \
  -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'

# Watch resize progress
kubectl get pvc mysql-data-mysql-0 -w
```

The CSI driver automatically:
1. Expands the Azure managed disk
2. Resizes the filesystem inside the pod

Verify the expansion:

```bash
# Check disk size in pod
kubectl exec mysql-0 -- df -h /var/lib/mysql

# View resize events
kubectl describe pvc mysql-data-mysql-0
```

## Creating Volume Snapshots

Install snapshot CRDs if not already present:

```bash
# Install snapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
```

Create a VolumeSnapshotClass:

```yaml
# azure-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-disk-snapshot-class
driver: disk.csi.azure.com
deletionPolicy: Delete
parameters:
  incremental: "true"
```

Create a snapshot:

```yaml
# mysql-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mysql-snapshot
spec:
  volumeSnapshotClassName: azure-disk-snapshot-class
  source:
    persistentVolumeClaimName: mysql-data-mysql-0
```

Apply and verify:

```bash
kubectl apply -f azure-snapshot-class.yaml
kubectl apply -f mysql-snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot mysql-snapshot

# Get snapshot details
kubectl describe volumesnapshot mysql-snapshot

# View Azure snapshot ID
kubectl get volumesnapshotcontent -o yaml | grep snapshotHandle
```

## Restoring from Snapshots

Create a new PVC from the snapshot:

```yaml
# restore-mysql-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-restored
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: managed-premium-zrs
  dataSource:
    name: mysql-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 100Gi
```

Deploy a new MySQL instance with restored data:

```bash
kubectl apply -f restore-mysql-pvc.yaml

# Create a pod using the restored volume
kubectl run mysql-restored \
  --image=mysql:8.0 \
  --env="MYSQL_ROOT_PASSWORD=changeme" \
  --overrides='
  {
    "spec": {
      "containers": [{
        "name": "mysql",
        "image": "mysql:8.0",
        "env": [{"name": "MYSQL_ROOT_PASSWORD", "value": "changeme"}],
        "volumeMounts": [{
          "name": "data",
          "mountPath": "/var/lib/mysql"
        }]
      }],
      "volumes": [{
        "name": "data",
        "persistentVolumeClaim": {
          "claimName": "mysql-restored"
        }
      }]
    }
  }'
```

## Using Availability Zones

Create zone-aware storage class:

```yaml
# zone-aware-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium-zone
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  kind: Managed
allowedTopologies:
- matchLabelExpressions:
  - key: topology.disk.csi.azure.com/zone
    values:
    - eastus-1
    - eastus-2
    - eastus-3
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Deploy workloads with zone affinity:

```yaml
# zone-aware-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: app-zonal
spec:
  serviceName: app
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: myapp
            topologyKey: topology.kubernetes.io/zone
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: managed-premium-zone
      resources:
        requests:
          storage: 50Gi
```

## Performance Optimization

Use Premium SSD for databases:

```yaml
# high-perf-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium-perf
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  kind: Managed
  # Use host caching for read-heavy workloads
  cachingMode: ReadOnly
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

For Ultra Disk with custom IOPS:

```yaml
# ultra-perf-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ultra-high-perf
provisioner: disk.csi.azure.com
parameters:
  skuName: UltraSSD_LRS
  kind: Managed
  cachingMode: None
  # Custom IOPS and throughput
  diskIOPSReadWrite: "10000"
  diskMBpsReadWrite: "500"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Enable Ultra Disk on node pool:

```bash
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name ultranodes \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --zones 1 2 3 \
  --enable-ultra-ssd
```

## Monitoring Disk Performance

Check disk metrics from within pods:

```bash
# Install fio for testing
kubectl run disk-test --image=ubuntu:latest --command -- sleep 3600
kubectl exec disk-test -- apt-get update
kubectl exec disk-test -- apt-get install -y fio

# Run read performance test
kubectl exec disk-test -- fio --name=randread \
  --ioengine=libaio --iodepth=16 \
  --rw=randread --bs=4k --direct=1 \
  --size=1G --numjobs=4 --runtime=60 \
  --group_reporting --filename=/data/test
```

Monitor from Azure:

```bash
# Get managed disk resource ID
az disk list --resource-group MC_myResourceGroup_myAKSCluster_eastus \
  --query "[].{Name:name, ID:id}"

# View disk metrics
az monitor metrics list \
  --resource /subscriptions/.../disks/pvc-xxxxx \
  --metric "Composite Disk Read Operations/sec" \
  --start-time 2026-02-09T00:00:00Z \
  --end-time 2026-02-09T23:59:59Z
```

## Troubleshooting Azure Disk Issues

If volumes fail to attach:

```bash
# Check CSI driver logs
kubectl logs -n kube-system -l app=csi-azuredisk-controller

# View PVC events
kubectl describe pvc mysql-data-mysql-0

# Check volume attachment
kubectl get volumeattachments
```

For permission issues:

```bash
# Verify AKS managed identity has permissions
az aks show --resource-group myResourceGroup \
  --name myAKSCluster \
  --query identityProfile

# Check role assignments
az role assignment list \
  --assignee <managed-identity-client-id> \
  --scope /subscriptions/<subscription-id>
```

## Using Encryption at Rest

Enable encryption with customer-managed keys:

```yaml
# cmk-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-premium-cmk
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  kind: Managed
  # Use customer-managed key from Key Vault
  diskEncryptionSetID: /subscriptions/.../diskEncryptionSets/myDES
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Create disk encryption set:

```bash
# Create Key Vault key
az keyvault key create \
  --vault-name myKeyVault \
  --name myKey \
  --protection software

# Create disk encryption set
az disk-encryption-set create \
  --resource-group myResourceGroup \
  --name myDES \
  --key-url https://myKeyVault.vault.azure.net/keys/myKey \
  --source-vault myKeyVault
```

## Conclusion

The Azure Disk CSI driver provides robust persistent storage for AKS workloads with support for multiple performance tiers, volume snapshots, and dynamic provisioning. Understanding the different disk types and configuring appropriate storage classes ensures optimal performance and cost for your applications.

Key capabilities include automated volume lifecycle management, backup and restore through snapshots, zone-redundant storage options, and support for ultra-high-performance disks. Proper configuration of storage classes and monitoring ensures reliable storage operations for stateful applications on AKS.
