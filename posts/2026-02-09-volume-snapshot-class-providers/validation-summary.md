# Validation Summary: How to Configure VolumeSnapshotClass for Different Snapshot Providers

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes VolumeSnapshot and VolumeSnapshotClass
- CSI external snapshotter
- AWS EBS CSI Driver
- Google Compute Engine Persistent Disk CSI Driver
- Azure Disk CSI Driver
- Ceph RBD CSI Driver / Rook Ceph
- NetApp Trident CSI Driver
- Pure Storage CSI / Pure Service Orchestrator
- kubectl, AWS CLI, gcloud CLI, Azure CLI

## Sources Consulted
- Kubernetes CSI VolumeSnapshot API: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- Kubernetes VolumeSnapshotClass concepts: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CSI VolumeSnapshotClass secrets: https://kubernetes-csi.github.io/docs/secrets-and-credentials-volume-snapshot-class.html
- AWS EBS CSI snapshot parameters: https://raw.githubusercontent.com/kubernetes-sigs/aws-ebs-csi-driver/master/docs/snapshot.md
- AWS EBS CSI tagging documentation: https://raw.githubusercontent.com/kubernetes-sigs/aws-ebs-csi-driver/master/docs/tagging.md
- AWS EBS CSI StorageClass parameters: https://raw.githubusercontent.com/kubernetes-sigs/aws-ebs-csi-driver/master/docs/parameters.md
- GCP Persistent Disk CSI snapshot guide: https://raw.githubusercontent.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/master/docs/kubernetes/user-guides/snapshots.md
- GCP Persistent Disk CSI snapshot examples and parameter parsing: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- Azure Disk CSI snapshot guide: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/deploy/example/snapshot/README.md
- Azure Disk CSI driver parameters: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/docs/driver-parameters.md
- Ceph CSI RBD snapshot class example: https://raw.githubusercontent.com/ceph/ceph-csi/devel/examples/rbd/snapshotclass.yaml
- NetApp Trident snapshot documentation: https://docs.netapp.com/us-en/trident/trident-use/vol-snapshots.html
- Pure Storage pure-csi chart documentation: https://github.com/purestorage/helm-charts/tree/master/pure-csi

## Issues Found
- AWS EBS examples used unsupported `encrypted`, `kmsKeyId`, and `copySnapshotToRegion` VolumeSnapshotClass parameters. Replaced them with supported snapshot tagging, fast snapshot restore, and snapshot lock parameters.
- AWS EBS tag examples used an invalid `Name=...|Value=...` format. Changed them to the documented `key=value` format.
- GCP example used `image-family` without selecting disk images and used unsupported `snapshot-labels`. Added `snapshot-type: images` for the image-family example and changed labels to the supported `labels` parameter.
- Azure example formatted `tags` as a multi-line block and used unsupported `storageAccountType` for VolumeSnapshotClass. Changed tags to the documented comma-separated format and replaced the ZRS snapshot example with the supported `location` cross-region parameter.
- Ceph RBD example used `pool` in a VolumeSnapshotClass and described pool-specific snapshot configuration. Removed the unsupported pool parameter and revised the example to use the documented `snapshotNamePrefix`.
- NetApp Trident example used `snapshotPolicy` and `snapshotReserve` as VolumeSnapshotClass parameters. Removed them because Trident documents a minimal VolumeSnapshotClass and those settings are storage/backend provisioning settings.
- Pure Storage example used unsupported `backend` and `retentionDuration` VolumeSnapshotClass parameters. Removed them and left the documented minimal class.
- The testing section suggested checking `parameters` on VolumeSnapshotContent output. Reworded this to verify that the snapshot content was created, since provider parameters are not generally surfaced there as a reliable validation target.
- The best-practice and troubleshooting wording implied EBS snapshot encryption is configured through VolumeSnapshotClass. Changed this to refer to encrypted source volumes and KMS access for customer-managed keys.

## Review Notes
- The post is technically relevant and includes implementation details, so it was reviewed as a code/configuration guide.
- Kubernetes treats VolumeSnapshotClass `parameters` as opaque strings; invalid provider-specific keys may pass Kubernetes admission but fail in the CSI driver. The corrected examples use parameters documented by the relevant CSI drivers.
- Pure Storage `pure-csi` documentation is old and marked feature-frozen; future updates should consider whether Portworx CSI is the preferred Pure Storage path for new deployments.
