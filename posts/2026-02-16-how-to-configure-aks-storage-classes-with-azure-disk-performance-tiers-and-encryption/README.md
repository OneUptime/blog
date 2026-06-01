# How to Configure AKS Storage Classes with Azure Disk Performance Tiers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Storage Class, Azure Disk, Encryption, Kubernetes, Persistent Volume, Performance

Description: Learn how to create custom AKS storage classes with Azure Disk performance tiers, encryption at rest, and customer-managed keys.

---

AKS comes with a few built-in storage classes, but they use default settings that may not fit your workload requirements. If you need high-performance storage for a database, server-side encryption with your own keys, or specific IOPS guarantees, you need custom storage classes. In this post, I will walk through creating AKS storage classes that use Azure Disk SKUs, configure encryption, and give your persistent volumes the performance characteristics your applications need.

## Understanding Azure Disk Types

Azure offers several managed disk types, each with different performance and cost profiles:

**Standard HDD (Standard_LRS)** - Cheapest option. Good for backups, dev/test, and infrequently accessed data. Up to 2,000 IOPS.

**Standard SSD (StandardSSD_LRS)** - Better consistency than HDD. Good for web servers and lightly used databases. Up to 6,000 IOPS.

**Premium SSD (Premium_LRS)** - Production-grade. Provides guaranteed IOPS based on disk size. Up to 20,000 base IOPS for a P80 disk.

**Premium SSD v2 (PremiumV2_LRS)** - Decouples IOPS, throughput, and capacity. You pay for what you provision independently.

**Ultra Disk (UltraSSD_LRS)** - Highest performance. Up to 400,000 IOPS and 10,000 MB/s throughput. For the most demanding database workloads.

## Built-in Storage Classes

AKS comes with these default storage classes.

```bash
# List default storage classes

kubectl get storageclass
```

You will see `managed-csi` (Standard SSD) and `managed-csi-premium` (Premium SSD) among others. These work fine for basic use cases, but they do not let you configure customer-managed key encryption or Premium SSD v2 and Ultra Disk performance settings.

## Step 1: Create a Premium SSD Storage Class

Create a storage class that provisions Premium SSD disks. With Premium SSD, the baseline performance tier is selected from the requested PVC size.

```yaml
# premium-ssd-storageclass.yaml
# Storage class for Premium SSD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: premium-ssd-high-perf
# Azure Disk CSI driver
provisioner: disk.csi.azure.com
parameters:
  # Premium SSD disk type
  skuName: Premium_LRS
  # Cache settings for the disk
  cachingMode: ReadOnly
  # Disk filesystem type
  fsType: ext4
# Delete the disk when the PVC is deleted
reclaimPolicy: Delete
# Allow the volume to be expanded
allowVolumeExpansion: true
# WaitForFirstConsumer ensures the disk is created in the same zone as the pod
volumeBindingMode: WaitForFirstConsumer
```

Apply it.

```bash
kubectl apply -f premium-ssd-storageclass.yaml
```

The `volumeBindingMode: WaitForFirstConsumer` is critical for AKS clusters with availability zones. Without it, the disk might be created in a different zone than the pod, causing scheduling failures.

## Step 2: Create a Premium SSD v2 Storage Class

Premium SSD v2 lets you independently configure IOPS, throughput, and disk size.

```yaml
# premium-v2-storageclass.yaml
# Storage class for Premium SSD v2 with custom IOPS and throughput
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: premium-v2-custom
provisioner: disk.csi.azure.com
parameters:
  skuName: PremiumV2_LRS
  # Custom IOPS - independent of disk size
  DiskIOPSReadWrite: "10000"
  # Custom throughput in MB/s
  DiskMBpsReadWrite: "250"
  cachingMode: None
  fsType: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Premium SSD v2 is excellent for databases where you know exactly how much IOPS you need. You pay for the provisioned performance, not a fixed tier.

## Step 3: Create an Ultra Disk Storage Class

Ultra Disks provide the highest performance but require specific VM sizes and availability zone configuration.

```yaml
# ultra-disk-storageclass.yaml
# Storage class for Ultra Disks - maximum performance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ultra-disk
provisioner: disk.csi.azure.com
parameters:
  skuName: UltraSSD_LRS
  # AKS Azure Disk CSI parameters support custom IOPS up to 160,000
  DiskIOPSReadWrite: "50000"
  # Throughput up to 2,000 MB/s through the AKS StorageClass parameters
  DiskMBpsReadWrite: "1000"
  cachingMode: None
  fsType: ext4
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

Note: Ultra Disks require the node pool to have Ultra Disk support enabled.

```bash
# Create a node pool with Ultra Disk support
az aks nodepool add \
  --resource-group myResourceGroup \
  --cluster-name myCluster \
  --name ultrapool \
  --node-count 3 \
  --node-vm-size Standard_D8s_v5 \
  --enable-ultra-ssd
```

## Step 4: Configure Encryption with Customer-Managed Keys

By default, Azure Disks are encrypted at rest with platform-managed keys. For compliance requirements, you may need to use your own keys from Azure Key Vault.

First, set up the encryption infrastructure.

```bash
# Create a Key Vault
az keyvault create \
  --name myencryptionkv \
  --resource-group myResourceGroup \
  --location eastus \
  --enable-purge-protection

# Create an encryption key
az keyvault key create \
  --vault-name myencryptionkv \
  --name disk-encryption-key \
  --kty RSA \
  --size 2048

# Get the key URL
KEY_URL=$(az keyvault key show \
  --vault-name myencryptionkv \
  --name disk-encryption-key \
  --query "key.kid" -o tsv)

# Create a Disk Encryption Set
az disk-encryption-set create \
  --name myDiskEncryptionSet \
  --resource-group myResourceGroup \
  --location eastus \
  --key-url $KEY_URL \
  --source-vault myencryptionkv

# Get the Disk Encryption Set ID
DES_ID=$(az disk-encryption-set show \
  --name myDiskEncryptionSet \
  --resource-group myResourceGroup \
  --query id -o tsv)

# Grant the Disk Encryption Set access to the Key Vault
DES_PRINCIPAL=$(az disk-encryption-set show \
  --name myDiskEncryptionSet \
  --resource-group myResourceGroup \
  --query identity.principalId -o tsv)

az keyvault set-policy \
  --vault-name myencryptionkv \
  --object-id $DES_PRINCIPAL \
  --key-permissions wrapkey unwrapkey get

# Grant the AKS cluster identity access to the Disk Encryption Set
AKS_PRINCIPAL=$(az aks show \
  --resource-group myResourceGroup \
  --name myCluster \
  --query identity.principalId -o tsv)

az role assignment create \
  --role "Contributor" \
  --assignee $AKS_PRINCIPAL \
  --scope $DES_ID
```

Now create a storage class that uses customer-managed key encryption.

```yaml
# encrypted-storageclass.yaml
# Storage class with customer-managed key encryption
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-premium
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  # Reference to the Disk Encryption Set
  diskEncryptionSetID: "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Compute/diskEncryptionSets/myDiskEncryptionSet"
  cachingMode: ReadOnly
  fsType: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Step 5: Create PVCs Using Custom Storage Classes

Now use these storage classes in your PersistentVolumeClaims.

```yaml
# database-pvc.yaml
# PVC using the high-performance Premium SSD storage class
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: premium-ssd-high-perf
  resources:
    requests:
      # Request 1Ti - this gives the disk the P30 baseline performance tier
      storage: 1Ti
---
# PVC using encrypted storage for sensitive data
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sensitive-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: encrypted-premium
  resources:
    requests:
      storage: 100Gi
```

Mount these in your pods.

```yaml
# database-deployment.yaml
# PostgreSQL deployment using the high-performance PVC
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          volumeMounts:
            # Mount the persistent volume for data
            - name: data
              mountPath: /var/lib/postgresql/data
          env:
            - name: POSTGRES_PASSWORD
              value: "changeme"
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: database-data
```

## Performance Tier Overview

Here is a reference for common Azure Premium SSD performance tiers.

| Tier | Size | IOPS | Throughput (MB/s) | Monthly Cost (approx) |
|------|------|------|-------------------|----------------------|
| P4 | 32 GiB | 120 | 25 | $5 |
| P10 | 128 GiB | 500 | 100 | $19 |
| P15 | 256 GiB | 1,100 | 125 | $37 |
| P20 | 512 GiB | 2,300 | 150 | $73 |
| P30 | 1 TiB | 5,000 | 200 | $135 |
| P40 | 2 TiB | 7,500 | 250 | $260 |
| P50 | 4 TiB | 7,500 | 250 | $491 |

## Step 6: Volume Expansion

When you need more space, expand the PVC. The storage class must have `allowVolumeExpansion: true`.

```bash
# Expand a PVC from 1Ti to 2Ti
kubectl patch pvc database-data -p '{"spec": {"resources": {"requests": {"storage": "2Ti"}}}}'

# Check the PVC status - it may show "FileSystemResizePending"
kubectl get pvc database-data

# The Azure Disk CSI driver supports resizing persistent volumes without downtime
```

## Step 7: Snapshot and Backup

Create snapshots of your persistent volumes for backup.

```yaml
# volume-snapshot.yaml
# Create a snapshot of the database volume
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: csi-azuredisk-vsc
  source:
    persistentVolumeClaimName: database-data
```

Restore from a snapshot by creating a new PVC.

```yaml
# restore-pvc.yaml
# Restore a PVC from a snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-restored
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: premium-ssd-high-perf
  resources:
    requests:
      storage: 1Ti
  dataSource:
    name: database-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Best Practices

**Always use WaitForFirstConsumer.** This prevents zone mismatch issues in multi-zone clusters. The disk is created in the same zone as the pod.

**Set the reclaim policy based on data importance.** Use `Retain` for production databases where accidental PVC deletion should not destroy data. Use `Delete` for ephemeral or reproducible data.

**Right-size your disks.** Premium SSD performance scales with disk size. A 64 GiB P6 disk only provides 240 IOPS, while a 256 GiB P15 provides 1,100. If you need more IOPS, sometimes the cheapest option is a larger disk.

**Use Premium SSD v2 for databases.** The ability to independently set IOPS and throughput means you do not have to overprovision capacity just to get the performance you need.

Custom storage classes give you fine-grained control over how persistent storage behaves in your AKS cluster. Taking the time to configure them properly ensures your stateful workloads get the performance, encryption, and reliability they need.
