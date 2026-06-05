# Validation Summary: How to Configure Volume Snapshot Encryption at Rest

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes VolumeSnapshot, VolumeSnapshotClass, and StorageClass
- Kubernetes CSI snapshot API
- AWS EBS CSI Driver and AWS EBS encryption
- AWS KMS key rotation
- Google Cloud Persistent Disk CSI Driver and CMEK
- Azure Disk CSI Driver and Disk Encryption Sets
- AWS CLI, kubectl, jq, and Kubernetes CronJob manifests

## Sources Consulted
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI Volume Snapshot API reference: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- AWS EBS CSI Driver StorageClass parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS EBS CSI Driver snapshot tagging documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/tagging.md
- Amazon EBS encryption documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html
- Amazon EC2 CreateSnapshot API reference: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateSnapshot.html
- AWS CLI copy-snapshot reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-snapshot.html
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- GKE volume snapshots documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/volume-snapshots
- GKE Persistent Disk volume snapshots documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/backup-pd-volume-snapshots
- GCP Persistent Disk CSI driver parameters source: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver/blob/master/pkg/parameters/parameters.go
- Google Compute Engine disk encryption documentation: https://docs.cloud.google.com/compute/docs/disks/disk-encryption
- Azure Disk CSI driver parameters: https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/docs/driver-parameters.md
- Azure managed disk encryption documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption
- AKS Azure Disk CSI storage documentation: https://learn.microsoft.com/en-us/azure/aks/azure-csi-disk-storage-provision

## Issues Found
- The AWS example incorrectly placed `encrypted` and `kmsKeyId` in a `VolumeSnapshotClass`. The EBS CSI driver uses those parameters for EBS volume provisioning through `StorageClass`; EBS snapshots inherit encryption from the source volume. Changed the AWS example to configure an encrypted `StorageClass` and use `VolumeSnapshotClass` only for snapshot settings such as tags.
- The AWS snapshot tag examples used `Name=...|Value=...`, which is not the EBS CSI driver's tag syntax. Changed them to `key=value` tag specifications.
- The `VolumeSnapshot` example used custom annotations implying they enable encryption. Kubernetes and the CSI snapshot API do not use those annotations for encryption. Removed them and clarified that encryption comes from the source PVC's backing disk.
- The GCP example put `disk-encryption-kms-key` in `VolumeSnapshotClass` and used unsupported `snapshot-labels`. Changed the example to put CMEK on the Persistent Disk `StorageClass` and use supported snapshot parameters such as `storage-locations` and `labels`.
- The Azure example put `diskEncryptionSetID` in `VolumeSnapshotClass`. The Azure Disk CSI driver documents `diskEncryptionSetID` as a disk provisioning parameter, while snapshot classes support parameters such as `resourceGroup`, `incremental`, `location`, and `tags`. Removed the invalid snapshot parameter and added a note explaining where customer-managed keys are configured.
- The key rotation CronJob attempted to create a new KMS key and patch `VolumeSnapshotClass.parameters.kmsKeyId`. `VolumeSnapshotClass` objects are effectively class definitions for snapshot creation, and the AWS snapshot key is not configured there. Replaced the job with AWS KMS automatic key rotation using `aws kms enable-key-rotation`.
- The monitoring and reporting scripts counted encryption by reading custom Kubernetes annotations. Those annotations do not prove cloud snapshot encryption. Updated the AWS examples to resolve the CSI `snapshotHandle` from `VolumeSnapshotContent` and query AWS with `aws ec2 describe-snapshots`.
- The compliance report Slack payload interpolated raw report text directly into JSON, which can break on newlines or quotes. Changed it to build JSON with `jq -n`.
- The cross-region `VolumeSnapshotClass` example used unsupported EBS CSI parameters such as `copySnapshotToRegion` and `destinationKmsKeyId-*`. Replaced it with an `aws ec2 copy-snapshot` example using `--encrypted` and `--kms-key-id`.

## Review Notes
The corrected examples focus on AWS EBS for verification and reporting because Kubernetes does not expose a provider-neutral encryption status field for all CSI snapshots. Equivalent compliance checks for GCP and Azure should query the corresponding cloud provider APIs for the physical snapshot referenced by the CSI snapshot handle.
