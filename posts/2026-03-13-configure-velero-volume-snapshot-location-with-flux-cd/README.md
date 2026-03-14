# How to Configure Velero Volume Snapshot Location with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, VolumeSnapshotLocation, PersistentVolumes, GitOps, Kubernetes, Backup

Description: Configure Velero VolumeSnapshotLocation resources using Flux CD to manage persistent volume snapshot backends for complete Kubernetes data protection.

---

## Introduction

Velero's VolumeSnapshotLocation (VSL) resource defines where Persistent Volume snapshots are created and stored. Unlike Kubernetes resource backups (which go to object storage), volume snapshots are created as native cloud provider snapshots—EBS snapshots on AWS, Managed Disk snapshots on Azure, and Persistent Disk snapshots on GCP. Managing VSLs through Flux ensures snapshot configuration is version-controlled and consistently applied.

A complete Velero backup strategy requires both a BackupStorageLocation (for Kubernetes resource data) and a VolumeSnapshotLocation (for PV data). When a backup runs, Velero quiesces the pods, triggers cloud provider snapshots for each PV, and records the snapshot IDs in the backup metadata stored in the BSL. On restore, the snapshots are used to recreate the volumes.

This guide covers configuring VSLs for AWS EBS, Azure Managed Disks, and GCP Persistent Disks.

## Prerequisites

- Velero deployed with the appropriate cloud provider plugin
- Flux CD bootstrapped on the cluster
- Cloud provider credentials with snapshot permissions
- `kubectl` CLI installed

## Step 1: Create an AWS EBS Volume Snapshot Location

```yaml
# infrastructure/velero/snapshots/vsl-aws.yaml
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: aws-primary
  namespace: velero
spec:
  # AWS EBS provider
  provider: aws
  config:
    # Region where EBS snapshots will be created
    # Must match the region where your cluster runs
    region: us-east-1
    # Optional: Tag all snapshots with these tags for cost tracking
    additionalTags: "ManagedBy=velero,Environment=production"
```

## Step 2: Create a Secondary VSL in Another Region

```yaml
# infrastructure/velero/snapshots/vsl-aws-dr.yaml
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: aws-disaster-recovery
  namespace: velero
spec:
  provider: aws
  config:
    # DR region for cross-region snapshot copies
    region: eu-west-1
```

## Step 3: Create Azure Managed Disk Snapshot Location

```yaml
# infrastructure/velero/snapshots/vsl-azure.yaml
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: azure-primary
  namespace: velero
spec:
  provider: azure
  config:
    # Azure resource group for storing snapshots
    resourceGroup: velero-backups-rg
    # Azure API timeout for snapshot operations
    apiTimeout: 3m
    # Snapshot incremental: true creates incremental snapshots (recommended)
    incremental: "true"
```

## Step 4: Create GCP Persistent Disk Snapshot Location

```yaml
# infrastructure/velero/snapshots/vsl-gcp.yaml
apiVersion: velero.io/v1
kind: VolumeSnapshotLocation
metadata:
  name: gcp-primary
  namespace: velero
spec:
  provider: gcp
  config:
    # GCP project where snapshots will be created
    project: my-gcp-project
    # Optional: snapshot storage location (regional or multi-regional)
    snapshotLocation: us-central1
```

## Step 5: Use CSI Snapshots (Provider-Agnostic)

Modern Velero supports CSI VolumeSnapshots, which work across providers through the Kubernetes CSI interface.

```yaml
# infrastructure/velero/snapshots/vsl-csi.yaml
# For CSI-based snapshots, enable the CSI plugin feature flag in Velero
# No VSL resource is needed - CSI uses VolumeSnapshotClass resources instead
---
# Create a VolumeSnapshotClass for CSI snapshots
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: velero-csi-snapshots
  labels:
    # This label tells Velero to use this class for CSI snapshots
    velero.io/csi-volumesnapshot-class: "true"
driver: ebs.csi.aws.com  # Replace with your CSI driver
deletionPolicy: Retain
parameters:
  # EBS-specific: create fast snapshots
  tagSpecification_1: "ManagedBy=velero"
```

## Step 6: Configure Velero to Use Multiple VSLs

```yaml
# infrastructure/velero/helmrelease.yaml (updated values section)
# Add this to the Velero HelmRelease values:
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: velero
  namespace: velero
spec:
  interval: 10m
  chart:
    spec:
      chart: velero
      version: "6.x"
      sourceRef:
        kind: HelmRepository
        name: vmware-tanzu
        namespace: flux-system
  values:
    configuration:
      backupStorageLocation:
        - name: default
          provider: aws
          bucket: my-cluster-velero-backups
          config:
            region: us-east-1
      # Configure multiple volume snapshot locations
      volumeSnapshotLocation:
        - name: aws-primary
          provider: aws
          config:
            region: us-east-1
        - name: aws-dr
          provider: aws
          config:
            region: eu-west-1
    credentials:
      useSecret: true
      existingSecret: velero-aws-credentials
```

## Step 7: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/velero-snapshots.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: velero-snapshot-locations
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/velero/snapshots
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: velero
```

## Step 8: Verify VSL Status

```bash
# Check all volume snapshot locations
kubectl get volumesnapshotlocation -n velero

# Get detailed status
kubectl describe volumesnapshotlocation aws-primary -n velero

# Create a backup that includes volume snapshots
velero backup create pv-backup-test \
  --include-namespaces my-app \
  --volume-snapshot-locations aws-primary \
  --wait

# Verify snapshots were created in AWS
aws ec2 describe-snapshots \
  --owner-ids self \
  --filters "Name=tag:velero.io/backup,Values=pv-backup-test"
```

## Best Practices

- Configure VSLs in the same region as your cluster nodes to minimize snapshot transfer costs and time.
- Use `incremental: "true"` for Azure snapshots to significantly reduce storage costs and snapshot creation time after the first full snapshot.
- Tag all snapshots with consistent metadata (`ManagedBy=velero`, cluster name, environment) to enable lifecycle policies and cost tracking.
- Consider using CSI VolumeSnapshots for provider-agnostic PV backup. CSI snapshots use the standard Kubernetes snapshot interface and work with any CSI-compliant storage driver.
- Test volume restore procedures regularly. Snapshot creation succeeds does not guarantee snapshot restore will succeed. Run quarterly restore drills.

## Conclusion

Velero VolumeSnapshotLocations are now configured and managed through Flux CD. Persistent Volume data is protected through cloud-native snapshots that are created automatically when backup schedules run. With both BackupStorageLocation and VolumeSnapshotLocation configured, Velero can perform complete cluster backups that include both Kubernetes resource definitions and application data volumes.
