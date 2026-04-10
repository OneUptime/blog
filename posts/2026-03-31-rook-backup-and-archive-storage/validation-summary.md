# Validation Summary: How to Set Up Rook-Ceph for Backup and Archive Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (CephObjectStore CRD, RGW)
- Ceph RADOS Gateway (S3-compatible object storage)
- Velero (Kubernetes backup tool)
- AWS CLI (S3 API commands)
- Kubernetes StorageClass and ObjectBucketClaim provisioning
- S3 Object Lock (WORM / immutable backups)
- S3 Lifecycle policies

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook ObjectBucketClaim documentation: https://rook.io/docs/rook/v1.12/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Velero AWS plugin source and documentation (velero-plugin-for-aws v1.10.0)
- Velero CLI reference for `velero install` and `velero schedule create`
- Ceph official documentation on S3 Object Lifecycle Management (radosgw)
- Ceph official documentation on S3 Object Lock support (introduced in Nautilus v14.2.0)
- Ceph documentation on zone group placement targets and storage classes

## Issues Found

### 1. `--use-volume-snapshots=true` is incorrect for on-prem Ceph (line 74)
**What was wrong:** The `velero install` command used `--use-volume-snapshots=true` with `--provider aws`. This creates an AWS EBS VolumeSnapshotLocation that calls EC2 APIs (`CreateSnapshot`/`DescribeSnapshots`), which will not work in an on-premises Ceph environment.
**What was changed:** Changed to `--use-volume-snapshots=false`. For on-prem Ceph, volume data should be backed up via Velero's file-system backup (Restic/Kopia) or by configuring CSI volume snapshots separately with the Ceph CSI driver.
**Why:** The AWS volume snapshotter plugin is hardcoded to use EC2 APIs for EBS snapshots. It has no relation to S3/RGW and cannot interact with Ceph storage volumes.

### 2. GLACIER storage class transition in lifecycle policy (lines 103-121)
**What was wrong:** The lifecycle policy included a `Transitions` rule moving objects to the `GLACIER` storage class after 30 days. GLACIER is an AWS-specific storage class that does not exist in Ceph RGW by default. This command would fail unless a custom storage class named GLACIER was pre-configured in the Ceph zone group.
**What was changed:** Removed the `Transitions` block from the lifecycle rule, keeping only the `Expiration` rule (which is natively supported by Ceph RGW). Added a note explaining that storage class transitions require custom zone group configuration in Ceph.
**Why:** Ceph RGW supports lifecycle expiration natively since Luminous (v12), but transitions between storage classes require custom storage classes to be defined in the zone group's placement targets. Presenting GLACIER as a drop-in option is misleading for a Ceph-focused tutorial.

## Review Notes
- The `--include-namespaces "*"` in the Velero schedule command is technically valid (Velero accepts `*` as a wildcard for all namespaces), but it is redundant since omitting the flag already defaults to all namespaces.
- The Velero AWS plugin version v1.10.0 is a valid released version.
- The CephObjectStore YAML, StorageClass provisioner (`rook-ceph.ceph.rook.io/bucket`), and Object Lock commands are all correct and current.
- Ceph RGW Object Lock support has been available since Nautilus (v14.2.0, March 2019) and the commands shown are accurate.
- The RGW service URL format (`rook-ceph-rgw-<storename>.<namespace>.svc.cluster.local`) is correct for Rook-managed object stores.
