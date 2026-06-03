# How to Configure VolumeSnapshotClass for Different Snapshot Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, CSI, VolumeSnapshot

Description: Learn how to configure VolumeSnapshotClass resources for different storage providers including AWS EBS, GCP PD, Azure Disk, and more, with provider-specific parameters and best practices.

---

VolumeSnapshotClass is the blueprint that defines how snapshots should be created in Kubernetes. Each storage provider has unique parameters and capabilities, and configuring the VolumeSnapshotClass correctly ensures snapshots work efficiently and meet your requirements.

## Understanding VolumeSnapshotClass

A VolumeSnapshotClass is similar to a StorageClass but specifically for snapshots. It specifies:

1. **Driver** - The CSI driver that handles snapshot operations
2. **DeletionPolicy** - What happens when the VolumeSnapshot is deleted
3. **Parameters** - Provider-specific configuration options

The CSI driver name must match the driver that manages your storage backend. Using the wrong driver or parameters will cause snapshot creation to fail.

## AWS EBS CSI Driver Configuration

For Amazon EBS volumes, configure the VolumeSnapshotClass with snapshot tagging:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot-class
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  # Add tags to snapshots for cost tracking
  tagSpecification_1: "Environment=Production"
  tagSpecification_2: "Application=MySQL"
  tagSpecification_3: "ManagedBy=Kubernetes"
```

For fast snapshot restore:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-snapshot-fast-restore
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  # Enable fast snapshot restore in specific Availability Zones
  fastSnapshotRestoreAvailabilityZones: "us-east-1a,us-east-1b"
```

## Google Cloud Persistent Disk Configuration

For GCP Persistent Disk snapshots, configure storage location and retention:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: pd-snapshot-class
driver: pd.csi.storage.gke.io
deletionPolicy: Delete
parameters:
  # Specify storage location (regional or multi-regional)
  storage-locations: us-central1

  # For multi-regional storage
  # storage-locations: us

  # Create a disk image and add it to an image family
  snapshot-type: images
  image-family: mysql-snapshots
```

For production workloads with geographic redundancy:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: pd-snapshot-multiregional
driver: pd.csi.storage.gke.io
deletionPolicy: Retain
parameters:
  # Store in multi-region location for disaster recovery
  storage-locations: us

  # Add labels for organization
  labels: environment=production,application=database,backup-tier=critical
```

## Azure Disk CSI Configuration

For Azure Disk snapshots with resource group management:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-disk-snapshot-class
driver: disk.csi.azure.com
deletionPolicy: Delete
parameters:
  # Specify resource group for snapshots
  resourceGroup: snapshot-resource-group

  # Enable incremental snapshots (more efficient)
  incremental: "true"

  # Add tags for Azure resource management
  tags: Environment=Production,Application=MySQL,CostCenter=Engineering
```

For cross-region snapshots:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: azure-disk-snapshot-cross-region
driver: disk.csi.azure.com
deletionPolicy: Retain
parameters:
  resourceGroup: snapshot-rg-westus
  incremental: "true"
  # Store snapshots in a different Azure region
  location: westus
```

## Ceph RBD Snapshot Configuration

For Ceph RBD volumes managed by Rook:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: rbd-snapshot-class
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  # Ceph cluster namespace
  clusterID: rook-ceph

  # CSI provisioner settings
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

For snapshots with a custom name prefix:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: rbd-snapshot-ssd-pool
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Retain
parameters:
  clusterID: rook-ceph

  # Prefix to use for naming RBD snapshots
  snapshotNamePrefix: scheduled-snapshot

  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

## NetApp Trident Configuration

For NetApp storage with Trident CSI driver:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: trident-snapshot-class
driver: csi.trident.netapp.io
deletionPolicy: Delete
```

## Pure Storage Configuration

For Pure Storage FlashArray or FlashBlade:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: pure-snapshot-class
driver: pure-csi
deletionPolicy: Delete
```

## Configuring Multiple VolumeSnapshotClasses

Create different snapshot classes for different use cases:

```yaml
# Fast, short-term snapshots for development

apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: dev-snapshots
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "false"
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  tagSpecification_1: "Environment=Development"
---
# Production snapshots with retention and tags
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: prod-snapshots
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  tagSpecification_1: "Environment=Production"
  tagSpecification_2: "Compliance=Required"
---
# Long-term archival snapshots
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: archive-snapshots
driver: ebs.csi.aws.com
deletionPolicy: Retain
parameters:
  tagSpecification_1: "Type=Archive"
  tagSpecification_2: "Retention=7years"
  lockMode: "governance"
  lockDuration: "30"
```

## Setting a Default VolumeSnapshotClass

Mark a VolumeSnapshotClass as default:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: default-snapshot-class
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  tagSpecification_1: "ManagedBy=Kubernetes"
```

When a VolumeSnapshot doesn't specify a class, Kubernetes uses the default:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: auto-snapshot
spec:
  # No volumeSnapshotClassName specified - uses default
  source:
    persistentVolumeClaimName: mysql-pvc
```

## Understanding DeletionPolicy

The deletionPolicy determines what happens to the underlying snapshot when the VolumeSnapshot resource is deleted:

**Delete** - Removes both the VolumeSnapshot and the actual storage snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ephemeral-snapshots
driver: ebs.csi.aws.com
deletionPolicy: Delete  # Snapshot deleted when VolumeSnapshot is deleted
```

**Retain** - Keeps the storage snapshot even when VolumeSnapshot is deleted:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: permanent-snapshots
driver: ebs.csi.aws.com
deletionPolicy: Retain  # Snapshot preserved for manual cleanup
```

Use Retain for production snapshots to prevent accidental data loss:

```bash
# Even after deleting the VolumeSnapshot, the underlying snapshot remains
kubectl delete volumesnapshot important-data-snapshot

# The VolumeSnapshotContent remains with a DeletionPolicy of Retain
kubectl get volumesnapshotcontent
```

## Testing VolumeSnapshotClass Configuration

Verify your VolumeSnapshotClass works correctly:

```bash
# Apply the snapshot class
kubectl apply -f volumesnapshotclass.yaml

# Verify it's created
kubectl get volumesnapshotclass

# Test snapshot creation
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: test-snapshot
spec:
  volumeSnapshotClassName: ebs-snapshot-class
  source:
    persistentVolumeClaimName: test-pvc
EOF

# Check snapshot status
kubectl get volumesnapshot test-snapshot
kubectl describe volumesnapshot test-snapshot

# Verify the snapshot content was created
kubectl get volumesnapshotcontent -o yaml | grep -A 10 test-snapshot
```

## Provider-Specific Troubleshooting

For AWS EBS issues:

```bash
# Check IAM permissions for snapshot operations
aws sts get-caller-identity

# Verify KMS key access if the source volume uses a customer-managed KMS key
aws kms describe-key --key-id arn:aws:kms:...

# Check CSI driver logs
kubectl logs -n kube-system -l app=ebs-csi-controller
```

For GCP Persistent Disk:

```bash
# Verify service account permissions
gcloud projects get-iam-policy PROJECT_ID

# Check snapshot creation in GCP console
gcloud compute snapshots list

# Review CSI driver logs
kubectl logs -n kube-system -l app=gcp-compute-persistent-disk-csi-driver
```

For Azure Disk:

```bash
# Check Azure permissions
az role assignment list --assignee <service-principal-id>

# List snapshots in resource group
az snapshot list --resource-group snapshot-resource-group

# Review driver logs
kubectl logs -n kube-system -l app=csi-azuredisk-controller
```

## Best Practices

1. **Use encrypted source volumes** for production snapshots
2. **Set appropriate deletionPolicy** based on data criticality
3. **Tag snapshots** for cost tracking and organization
4. **Create multiple classes** for different use cases
5. **Test snapshot creation** after configuring new classes
6. **Document provider-specific parameters** for your team
7. **Monitor snapshot costs** across different configurations

Properly configured VolumeSnapshotClasses ensure your snapshots are created efficiently, stored securely, and meet your organization's compliance and disaster recovery requirements.
