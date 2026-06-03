# Validation Summary: How to Implement Velero Volume Snapshots Using CSI Driver Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Velero
- Kubernetes
- Container Storage Interface (CSI)
- Kubernetes VolumeSnapshot API
- CSI external-snapshotter
- AWS EBS CSI driver
- AWS CLI

## Sources Consulted
- Velero CSI support documentation: https://velero.io/docs/v1.18/csi/
- Velero Backup API type documentation: https://velero.io/docs/v1.18/api-types/backup/
- Velero Backup reference: https://velero.io/docs/v1.18/backup-reference/
- Kubernetes CSI external-snapshotter documentation: https://github.com/kubernetes-csi/external-snapshotter
- AWS EBS CSI driver snapshot documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/snapshot.md
- AWS EBS CSI driver tagging documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/tagging.md
- AWS EBS CSI driver snapshot example: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/examples/kubernetes/snapshot/manifests/classes/snapshotclass.yaml
- AWS CLI `describe-snapshots` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-snapshots.html

## Issues Found
- The post claimed CSI snapshots work with any CSI-compliant driver. Updated this to require a CSI driver that supports the Kubernetes VolumeSnapshot v1 API.
- The snapshot CRD/controller install commands referenced individual raw files from the `master` branch. Replaced them with the official external-snapshotter kustomize-based install commands.
- The Velero install example installed `velero-plugin-for-csi:v0.7.0`. Updated it because Velero v1.14 and later include CSI support in core Velero and no longer require the separate CSI plugin.
- The Backup and Schedule YAML examples used invalid nested `spec.csi.snapshotTimeout` and `spec.csi.volumeSnapshotClassName` fields. Replaced them with `spec.csiSnapshotTimeout` and the documented `velero.io/csi-volumesnapshot-class_<driver name>` annotation.
- The verification steps suggested checking `VolumeSnapshot` objects after `velero backup create --wait`. Updated this because Velero removes in-cluster `VolumeSnapshot` objects after backup upload; `velero backup describe --details` and backup logs are the correct post-backup checks.
- The multi-zone example used unsupported EBS snapshot parameters and an invalid tag interpolation variable. Replaced it with documented AWS EBS Fast Snapshot Restore and supported snapshot tag interpolation variables.
- The backup hook example attempted to run `kubectl` inside application pods as a post hook to verify snapshots. Replaced it with a valid pre-backup `sync` hook.
- The optimization and provider-specific examples used unsupported EBS `VolumeSnapshotClass` parameters such as `type`, `iops`, `encrypted`, `kmsKeyId`, and `destinationRegion`. Replaced them with documented EBS snapshot parameters such as `fastSnapshotRestoreAvailabilityZones`, `lockMode`, `lockDuration`, and `tagSpecification_*`.
- The test backup command restricted resources and then checked removed `VolumeSnapshot` objects. Updated it to request volume snapshots, verify backup details, and wait for the restored pod to become Ready before reading restored data.
- The snapshot cost section counted Kubernetes `VolumeSnapshot` objects, which is unreliable after Velero cleanup. Replaced it with Velero backup listing and an AWS CLI query for CSI-managed EBS snapshots.

## Review Notes
- `kubectl` and `velero` were not installed in the local environment, so CLI behavior was verified against official documentation rather than local `--help` output.
- Interpolated AWS EBS snapshot tags require the EBS CSI external-snapshotter sidecar to run with `--extra-create-metadata`; this caveat was added where interpolation is used.
