# How to Implement Velero Volume Snapshots Using CSI Driver Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, CSI, Storage, Volume Snapshot

Description: Learn how to configure Velero with Container Storage Interface (CSI) drivers for native volume snapshotting in Kubernetes. Complete guide covering CSI integration and snapshot management.

---

Container Storage Interface (CSI) provides a standardized API for storage systems in Kubernetes, enabling portable volume snapshot capabilities across different storage providers. Velero's CSI integration leverages native Kubernetes volume snapshots, offering better performance and consistency compared to traditional backup methods. This approach works with CSI storage drivers that support the Kubernetes VolumeSnapshot v1 API, from cloud providers like AWS EBS and Azure Disk to on-premises solutions like Ceph and Longhorn.

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
kubectl kustomize https://github.com/kubernetes-csi/external-snapshotter/client/config/crd | kubectl apply -f -

# Install snapshot controller
kubectl -n kube-system kustomize https://github.com/kubernetes-csi/external-snapshotter/deploy/kubernetes/snapshot-controller | kubectl apply -f -
```

Verify the snapshot controller is running:

```bash
kubectl get pods -n kube-system | grep snapshot-controller
```

## Installing Velero with CSI Support

Install Velero with CSI support enabled:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.13.0 \
  --bucket my-velero-backups \
  --backup-location-config region=us-east-1 \
  --features=EnableCSI \
  --secret-file ./credentials-velero
```

The `--features=EnableCSI` flag enables CSI snapshot support. In Velero v1.14 and later, CSI support is built into Velero, so you do not need to install the separate CSI plugin.

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

The `velero.io/csi-volumesnapshot-class: "true"` label tells Velero to use this class for backups. Configure only one labeled VolumeSnapshotClass per CSI driver.

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

# Check CSI-specific backup log entries
velero backup logs my-csi-backup | grep -i csi
```

## Creating Backup with Specific VolumeSnapshotClass

Specify which VolumeSnapshotClass to use:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: csi-backup-custom-class
  namespace: velero
  annotations:
    # Use specific snapshot class for the EBS CSI driver
    velero.io/csi-volumesnapshot-class_ebs.csi.aws.com: "velero-snapshot-class"
spec:
  includedNamespaces:
  - production
  snapshotVolumes: true
  csiSnapshotTimeout: 10m
```

Apply the backup:

```bash
kubectl apply -f csi-backup.yaml
```

Velero uses the `velero.io/csi-volumesnapshot-class_<driver name>` annotation to select a VolumeSnapshotClass for a specific Backup or Schedule.

## Handling Multi-Zone Volume Snapshots

For clusters spanning multiple availability zones on AWS EBS, configure Fast Snapshot Restore for the zones where you need faster volume initialization:

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
  # Enable Fast Snapshot Restore in selected Availability Zones
  fastSnapshotRestoreAvailabilityZones: "us-east-1a,us-east-1b"
  # Tag snapshots with VolumeSnapshot metadata
  tagSpecification_1: "snapshotnamespace={{ .VolumeSnapshotNamespace }}"
  tagSpecification_2: "snapshotname={{ .VolumeSnapshotName }}"
```

EBS snapshots are regional resources, but Fast Snapshot Restore is enabled per Availability Zone and requires the EBS CSI driver IAM role to allow the `ec2:EnableFastSnapshotRestores` API. Interpolated snapshot tags require the EBS CSI external-snapshotter sidecar to run with `--extra-create-metadata`.

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

Track snapshot creation and status while a backup is in progress:

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
velero backup logs <backup-name> | grep -i csi
kubectl logs -n velero deploy/velero | grep -i csi
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
    csiSnapshotTimeout: 10m
    labels:
      backup-type: csi-snapshot
```

Velero removes the in-cluster VolumeSnapshot objects after the backup is uploaded. When Velero deletes the backup, it also deletes the associated snapshot data from object or block storage.

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
  # Increase timeout for large volumes
  csiSnapshotTimeout: 30m
  # Hook to flush application data before snapshotting
  hooks:
    resources:
    - name: flush-application
      includedNamespaces:
      - production
      includedResources:
      - pods
      labelSelector:
        matchLabels:
          backup: required
      pre:
      - exec:
          command:
          - /bin/sh
          - -c
          - |
            sync
```

This configuration increases timeout and adds a pre-backup hook that flushes buffered filesystem writes before Velero creates snapshots.

## Optimizing Snapshot Performance

Reduce restore initialization time and protect snapshots with supported AWS EBS snapshot settings:

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
  # Enable Fast Snapshot Restore in selected Availability Zones
  fastSnapshotRestoreAvailabilityZones: "us-east-1a,us-east-1b"
  # Lock snapshots in governance mode for seven days
  lockMode: "governance"
  lockDuration: "7"
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
  --snapshot-volumes=true \
  --wait

# Verify CSI snapshot details were recorded
velero backup describe test-csi-backup --details

# Delete the test resources
kubectl delete pod test-pod -n default
kubectl delete pvc test-pvc -n default

# Restore from backup
velero restore create --from-backup test-csi-backup --wait
kubectl wait --for=condition=Ready pod/test-pod -n default --timeout=120s

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
  # Enable Fast Snapshot Restore for faster restores in selected zones
  fastSnapshotRestoreAvailabilityZones: "us-east-1a,us-east-1b"
  # Add snapshot tags for cost allocation and lifecycle policies
  tagSpecification_1: "Environment=production"
  tagSpecification_2: "snapshotcontent={{ .VolumeSnapshotContentName }}"
```

This configuration enables Fast Snapshot Restore and adds AWS tags that can be used for cost allocation and lifecycle policies. Interpolated snapshot tags require the EBS CSI external-snapshotter sidecar to run with `--extra-create-metadata`.

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
csiSnapshotTimeout: 30m
```

## Monitoring Snapshot Costs

Track storage costs for CSI snapshots by reviewing retained Velero backups and provider snapshots:

```bash
# List backups and expiration times
velero backup get

# For AWS EBS, list CSI-managed snapshots
aws ec2 describe-snapshots \
  --owner-ids self \
  --filters Name=tag-key,Values=CSIVolumeSnapshotName \
  --query 'Snapshots[*].[SnapshotId,StartTime,VolumeSize,State]' \
  --output table
```

Set up automated cleanup for old snapshots to control costs.

## Conclusion

CSI volume snapshots provide efficient, storage-native backup capabilities for Kubernetes persistent volumes. By leveraging CSI drivers, Velero creates fast, consistent snapshots that integrate seamlessly with cloud provider snapshot services. Configure appropriate VolumeSnapshotClasses for your storage backend, implement retention policies to manage costs, and test restore procedures regularly to ensure your backup strategy provides reliable data protection. CSI integration simplifies volume backup operations while improving performance and consistency compared to file-level backup methods.
