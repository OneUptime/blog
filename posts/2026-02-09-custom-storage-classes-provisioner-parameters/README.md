# How to Create Custom StorageClasses with Specific Provisioner Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, StorageClass, CSI

Description: Master the creation of custom StorageClasses in Kubernetes with provisioner-specific parameters for AWS EBS, GCP PD, Azure Disk, and other storage backends to optimize performance and cost.

---

StorageClasses in Kubernetes define how persistent volumes are dynamically provisioned. By creating custom StorageClasses with specific provisioner parameters, you can optimize storage performance, control costs, and meet specific application requirements.

## Understanding StorageClass Parameters

A StorageClass consists of four key components:

1. **Provisioner** - The CSI driver or in-tree provisioner
2. **Parameters** - Provider-specific configuration
3. **ReclaimPolicy** - What happens to volumes when PVCs are deleted
4. **VolumeBindingMode** - When volume binding occurs

Each storage provider supports different parameters that control disk type, IOPS, encryption, replication, and more.

## AWS EBS Custom StorageClasses

Create optimized StorageClasses for different AWS EBS volume types:

```yaml
# High-performance SSD for databases
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3-high-perf
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  # Provisioned IOPS (3000-16000 for gp3)
  iops: "10000"
  # Throughput in MB/s (125-1000 for gp3)
  throughput: "500"
  # Enable encryption
  encrypted: "true"
  # Specify KMS key
  kmsKeyId: "arn:aws:kms:us-east-1:123456789012:key/xxxxx"
  # Add tags for cost allocation
  tagSpecification_1: "Name=Application|Value=Database"
  tagSpecification_2: "Name=Environment|Value=Production"
  tagSpecification_3: "Name=Performance|Value=High"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Cost-optimized storage for development:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3-dev
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  # Minimum IOPS for cost savings
  iops: "3000"
  throughput: "125"
  encrypted: "false"
  tagSpecification_1: "Name=Environment|Value=Development"
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

Maximum IOPS for high-performance workloads:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-io2-extreme
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  # Maximum IOPS for io2 (up to 64000)
  iops: "50000"
  encrypted: "true"
  tagSpecification_1: "Name=Tier|Value=Premium"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## GCP Persistent Disk StorageClasses

Configure storage classes for different GCP disk types:

```yaml
# Balanced performance SSD
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-ssd-balanced
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-balanced
  # Replication type (regional or zonal)
  replication-type: regional-pd
  # Labels for organization
  disk-encryption-kms-key: projects/PROJECT_ID/locations/LOCATION/keyRings/KEYRING/cryptoKeys/KEY
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

Extreme performance storage:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-extreme
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-extreme
  # Provisioned IOPS
  provisioned-iops-on-create: "100000"
  replication-type: regional-pd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain
```

Cost-optimized standard disk:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-standard-cheap
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard
  replication-type: none
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Delete
```

## Azure Disk StorageClasses

Configure Azure managed disk options:

```yaml
# Premium SSD with caching
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-disk-premium-cached
provisioner: disk.csi.azure.com
parameters:
  storageaccounttype: Premium_LRS
  # Enable disk caching (ReadOnly, ReadWrite, None)
  cachingMode: ReadWrite
  kind: Managed
  # Add tags
  tags: |
    Environment=Production
    Application=Database
    CostCenter=Engineering
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Ultra Disk for maximum performance:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-ultra-disk
provisioner: disk.csi.azure.com
parameters:
  storageaccounttype: UltraSSD_LRS
  # Disk IOPS (300-160000)
  diskIOPSReadWrite: "50000"
  # Disk throughput in MB/s (1-2000)
  diskMBpsReadWrite: "1000"
  cachingMode: None
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Zone-redundant storage:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-disk-zrs
provisioner: disk.csi.azure.com
parameters:
  storageaccounttype: StandardSSD_ZRS
  cachingMode: ReadOnly
  # Resource group for disks
  resourceGroup: storage-resource-group
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Ceph RBD StorageClasses

Configure Rook-Ceph storage with specific pool parameters:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-ssd
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: ssd-pool
  # Image format (2 for layering support)
  imageFormat: "2"
  # Image features
  imageFeatures: layering,exclusive-lock,object-map,fast-diff
  # Ceph credentials
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  # Filesystem type
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: Immediate
```

Erasure-coded pool for cost efficiency:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-ec
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  # Use erasure-coded pool
  pool: ec-pool
  dataPool: ec-data-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: Immediate
```

## NetApp Trident StorageClasses

Configure NetApp storage with backend options:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: netapp-solidfire-bronze
provisioner: csi.trident.netapp.io
parameters:
  # Backend configuration
  backendType: solidfire-san
  # QoS parameters
  IOPS: "1000"
  # Snapshot policy
  snapshotPolicy: default
  # Export policy
  exportPolicy: default
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

## Local Persistent Volume StorageClass

For local SSD or NVMe storage:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-nvme
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

## Multi-Tier Storage Strategy

Create a tiered storage approach with different classes:

```yaml
# Tier 1: Ultra-high performance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: tier1-ultra-performance
  labels:
    tier: "1"
    performance: ultra
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "64000"
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Tier 2: High performance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: tier2-high-performance
  labels:
    tier: "2"
    performance: high
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "10000"
  throughput: "500"
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Tier 3: Standard performance
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: tier3-standard
  labels:
    tier: "3"
    performance: standard
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
# Tier 4: Archive/cold storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: tier4-archive
  labels:
    tier: "4"
    performance: low
provisioner: ebs.csi.aws.com
parameters:
  type: sc1
  encrypted: "true"
reclaimPolicy: Retain
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

## Setting Default StorageClass

Mark a StorageClass as default:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Remove default annotation from existing class:

```bash
# Remove default annotation
kubectl patch storageclass gp2 -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'

# Set new default
kubectl patch storageclass standard -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Testing Custom StorageClasses

Validate your StorageClass configuration:

```bash
# Apply the StorageClass
kubectl apply -f storageclass.yaml

# Verify it exists
kubectl get storageclass

# Test with a PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-gp3-high-perf
  resources:
    requests:
      storage: 10Gi
EOF

# Check PVC status
kubectl get pvc test-pvc
kubectl describe pvc test-pvc

# Verify parameters were applied
kubectl get pv -o yaml | grep -A 20 "parameters"
```

## Cost Optimization with StorageClasses

Create cost-aware storage classes:

```yaml
# Development: cheap and fast deletion
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dev-storage
  labels:
    environment: dev
    cost: low
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  encrypted: "false"
reclaimPolicy: Delete  # Auto-delete to save costs
volumeBindingMode: Immediate
allowVolumeExpansion: true
---
# Production: performance with retention
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: prod-storage
  labels:
    environment: prod
    cost: high
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "10000"
  throughput: "500"
  encrypted: "true"
reclaimPolicy: Retain  # Keep for compliance
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Monitoring StorageClass Usage

Track which StorageClasses are used most:

```bash
# List all PVCs with their StorageClass
kubectl get pvc -A -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
STORAGECLASS:.spec.storageClassName,\
CAPACITY:.status.capacity.storage

# Count PVCs per StorageClass
kubectl get pvc -A -o json | jq -r '.items[] | .spec.storageClassName' | sort | uniq -c

# Total storage per StorageClass
kubectl get pvc -A -o json | jq -r '.items[] |
  select(.status.phase == "Bound") |
  "\(.spec.storageClassName) \(.status.capacity.storage)"' |
  awk '{sum[$1]+=$2} END {for (sc in sum) print sc, sum[sc]}'
```

Custom StorageClasses give you fine-grained control over storage behavior, allowing you to optimize for performance, cost, compliance, and reliability based on your specific application requirements.
