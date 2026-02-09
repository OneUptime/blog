# How to Implement Velero Volume Snapshots Using CSI Driver Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, CSI, Storage, Volume Snapshots

Description: Learn how to configure Velero with Container Storage Interface (CSI) drivers for native volume snapshotting in Kubernetes. Complete guide covering CSI integration and snapshot management.

---

Container Storage Interface (CSI) provides a standardized API for storage systems in Kubernetes, enabling portable volume snapshot capabilities across different storage providers. Velero's CSI integration leverages native Kubernetes volume snapshots, offering better performance and consistency compared to traditional backup methods. This approach works with any CSI-compliant storage driver, from cloud providers like AWS EBS and Azure Disk to on-premises solutions like Ceph and Longhorn.

## Understanding CSI Volume Snapshots

CSI volume snapshots create point-in-time copies of persistent volumes using storage system native capabilities. Unlike file-level backups that copy data through the filesystem, CSI snapshots leverage storage system features like copy-on-write, resulting in faster snapshot creation and lower overhead.

When Velero backs up persistent volume claims with CSI support enabled, it creates VolumeSnapshot resources that trigger the underlying CSI driver to perform storage-level snapshots. During restore operations, Velero creates new persistent volumes from these snapshots.

## Prerequisites for CSI Snapshot Integration

Ensure your cluster meets CSI snapshot requirements:

```bash
# Check if CSI snapshot CRDs are installed
kubectl get crd | grep volumesnapshot

# Expected output:
# volumesnapshotclasses.snapshot.storage.k8s.io
# volumesnapshotcontents.snapshot.storage.k8s.io
# volumesnapshots.snapshot.storage.k8s.io
```

If CRDs are missing, install the snapshot controller:

```bash
# Install snapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml

# Install snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

Verify the snapshot controller is running:

```bash
kubectl get pods -n kube-system | grep snapshot-controller
```

## Installing Velero with CSI Support

Install Velero with the CSI plugin enabled:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0,velero/velero-plugin-for-csi:v0.7.0 \
  --bucket my-velero-backups \
  --backup-location-config region=us-east-1 \
  --use-node-agent \
  --features=EnableCSI \
  --secret-file ./credentials-velero
```

The `--features=EnableCSI` flag enables CSI snapshot support, and the CSI plugin handles volume snapshot operations.

## Creating a VolumeSnapshotClass

Define a VolumeSnapshotClass for your storage provider:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: velero-snapshot-class
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  # AWS-specific parameters
  tagSpecification_1: "Name=velero-snapshot"
  tagSpecification_2: "Environment=production"
```

For other storage providers, adjust the driver name:

```yaml
# Azure Disk CSI
driver: disk.csi.azure.com

# GCP Persistent Disk CSI
driver: pd.csi.storage.gke.io

# Ceph RBD CSI
driver: rbd.csi.ceph.com

# Longhorn CSI
driver: driver.longhorn.io
```

Apply the VolumeSnapshotClass:

```bash
kubectl apply -f volumesnapshotclass.yaml
```

The `velero.io/csi-volumesnapshot-class: "true"` label tells Velero to use this class for backups.

## Configuring Velero Backup with CSI Snapshots

Create a backup that uses CSI snapshots:

```bash
# Create backup with CSI snapshot support
velero backup create my-csi-backup \
  --include-namespaces production \
  --snapshot-volumes=true \
  --csi-snapshot-timeout=10m \
  --wait
```

Verify the backup includes volume snapshots:

```bash
velero backup describe my-csi-backup --details

# Check for VolumeSnapshot entries
kubectl get volumesnapshots -A
```

## Creating Backup with Specific VolumeSnapshotClass

Specify which VolumeSnapshotClass to use:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: csi-backup-custom-class
  namespace: velero
spec:
  includedNamespaces:
  - production
  snapshotVolumes: true
  csi:
    snapshotTimeout: 10m
    # Use specific snapshot class
    volumeSnapshotClassName: velero-snapshot-class
```

Apply the backup:

```bash
kubectl apply -f csi-backup.yaml
```

## Handling Multi-Zone Volume Snapshots

For clusters spanning multiple availability zones, configure zone-aware snapshots:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: velero-snapshot-multi-zone
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  # Enable multi-AZ snapshots
  csi.storage.k8s.io/snapshotter-secret-name: aws-secret
  csi.storage.k8s.io/snapshotter-secret-namespace: kube-system
  # Tag snapshots with zone information
  tagSpecification_1: "Zone={{ .VolumeSnapshotContent.Zone }}"
```

This configuration ensures snapshots can be restored across availability zones.

## Restoring Volumes from CSI Snapshots

Restore a backup that contains CSI snapshots:

```bash
# Restore entire backup
velero restore create --from-backup my-csi-backup --wait

# Restore to different namespace
velero restore create --from-backup my-csi-backup \
  --namespace-mappings production:production-restore \
  --wait

# Restore specific PVCs only
velero restore create --from-backup my-csi-backup \
  --include-resources persistentvolumeclaims,persistentvolumes \
  --wait
```

During restore, Velero creates new PersistentVolumes from the VolumeSnapshots, automatically handling volume provisioning.

## Monitoring CSI Snapshot Operations

Track snapshot creation and status:

```bash
# List all volume snapshots
kubectl get volumesnapshots -A

# Get detailed snapshot information
kubectl describe volumesnapshot <snapshot-name> -n <namespace>

# Check snapshot content
kubectl get volumesnapshotcontents

# Monitor snapshot controller logs
kubectl logs -n kube-system -l app=snapshot-controller -f
```

Check Velero logs for CSI-specific operations:

```bash
kubectl logs -n velero -l name=velero | grep -i csi
```

## Implementing Snapshot Lifecycle Policies

Configure automatic snapshot cleanup:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-csi-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    # Automatically delete after 7 days
    ttl: 168h
    includedNamespaces:
    - production
    snapshotVolumes: true
    csi:
      snapshotTimeout: 10m
    labels:
      backup-type: csi-snapshot
```

When Velero deletes the backup, it also removes associated VolumeSnapshots and VolumeSnapshotContents.

## Handling Snapshot Failures

Configure retry and timeout settings:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: csi-backup-resilient
  namespace: velero
spec:
  includedNamespaces:
  - production
  snapshotVolumes: true
  csi:
    # Increase timeout for large volumes
    snapshotTimeout: 30m
  # Hook to verify snapshot before proceeding
  hooks:
    resources:
    - name: verify-snapshot
      includedNamespaces:
      - production
      labelSelector:
        matchLabels:
          backup: required
      post:
      - exec:
          command:
          - /bin/sh
          - -c
          - |
            echo "Verifying snapshot creation..."
            sleep 10
            kubectl get volumesnapshots -n production
```

This configuration increases timeout and adds verification hooks.

## Optimizing Snapshot Performance

Reduce snapshot time with optimized configurations:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: velero-fast-snapshot
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  # Use faster snapshot type (if supported)
  type: fast
  # Disable encryption for faster snapshots (not recommended for production)
  encrypted: "false"
  # Increase IOPS for snapshot operations
  iops: "3000"
```

Balance performance with cost and security requirements.

## Testing CSI Snapshot and Restore

Create a test application with persistent data:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: gp3

---
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: default
spec:
  containers:
  - name: app
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Test data $(date)" > /data/test.txt
      cat /data/test.txt
      sleep 3600
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: test-pvc
```

Backup and restore the test application:

```bash
# Create backup
velero backup create test-csi-backup \
  --include-namespaces default \
  --include-resources pvc,pod \
  --wait

# Verify snapshot was created
kubectl get volumesnapshots -n default

# Delete the test resources
kubectl delete pod test-pod -n default
kubectl delete pvc test-pvc -n default

# Restore from backup
velero restore create --from-backup test-csi-backup --wait

# Verify data is restored
kubectl exec test-pod -n default -- cat /data/test.txt
```

The restored pod should show the original test data.

## Integrating with Cloud Provider Snapshot Services

Configure provider-specific snapshot features:

```yaml
# AWS EBS snapshot configuration
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: velero-aws-ebs
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Delete
parameters:
  # Copy snapshots to different region for DR
  destinationRegion: us-west-2
  # Encrypt snapshots
  encrypted: "true"
  kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
```

This configuration enables cross-region snapshot copying and encryption.

## Troubleshooting CSI Snapshot Issues

Common issues and solutions:

**VolumeSnapshot stuck in Pending:**

```bash
# Check snapshot status
kubectl describe volumesnapshot <snapshot-name> -n <namespace>

# Check CSI driver logs
kubectl logs -n kube-system -l app=ebs-csi-controller

# Verify VolumeSnapshotClass exists
kubectl get volumesnapshotclass
```

**Restore fails with volume provisioning error:**

```bash
# Check if VolumeSnapshotContent exists
kubectl get volumesnapshotcontent

# Verify storage class exists for restore
kubectl get storageclass

# Check Velero restore logs
velero restore logs <restore-name>
```

**Snapshot timeout errors:**

Increase snapshot timeout in backup spec:

```yaml
csi:
  snapshotTimeout: 30m
```

## Monitoring Snapshot Costs

Track storage costs for CSI snapshots:

```bash
# List all snapshots with creation time
kubectl get volumesnapshots -A -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
CREATED:.metadata.creationTimestamp,\
READY:.status.readyToUse

# Count total snapshots
kubectl get volumesnapshots -A --no-headers | wc -l
```

Set up automated cleanup for old snapshots to control costs.

## Conclusion

CSI volume snapshots provide efficient, storage-native backup capabilities for Kubernetes persistent volumes. By leveraging CSI drivers, Velero creates fast, consistent snapshots that integrate seamlessly with cloud provider snapshot services. Configure appropriate VolumeSnapshotClasses for your storage backend, implement retention policies to manage costs, and test restore procedures regularly to ensure your backup strategy provides reliable data protection. CSI integration simplifies volume backup operations while improving performance and consistency compared to file-level backup methods.
