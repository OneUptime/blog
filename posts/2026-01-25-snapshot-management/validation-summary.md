# Validation Summary: How to Configure Snapshot Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EBS snapshots and Amazon Data Lifecycle Manager
- Azure Managed Disk snapshots and Azure Disk Backup
- Google Cloud Persistent Disk snapshots and snapshot schedules
- Kubernetes CSI VolumeSnapshot resources
- Bash scripting with AWS CLI
- Python monitoring with boto3

## Sources Consulted
- AWS EBS snapshots documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html
- AWS CLI `copy-snapshot` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/copy-snapshot.html
- AWS CLI `describe-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS EC2 Instance Metadata Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS Data Lifecycle Manager `CrossRegionCopyRule` API reference: https://docs.aws.amazon.com/dlm/latest/APIReference/API_CrossRegionCopyRule.html
- Azure Managed Disk incremental snapshots documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-incremental-snapshots
- Azure Disk Backup with Azure CLI documentation: https://learn.microsoft.com/en-us/azure/backup/backup-managed-disks-cli
- Azure CLI `az dataprotection backup-policy` reference: https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-policy
- Azure CLI `az dataprotection backup-vault` reference: https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-vault
- Google Cloud Persistent Disk snapshots documentation: https://docs.cloud.google.com/compute/docs/disks/snapshots
- Google Cloud scheduled snapshots documentation: https://docs.cloud.google.com/compute/docs/disks/scheduled-snapshots
- Google Cloud CLI `gcloud compute disks snapshot` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/disks/snapshot
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CSI external-snapshotter documentation: https://github.com/kubernetes-csi/external-snapshotter

## Issues Found
- The introduction implied all snapshots only record changes since the last snapshot. Updated the wording to clarify that modern cloud snapshots are typically incremental after the initial snapshot.
- The speed claim said snapshot creation takes seconds regardless of volume size. Changed it to say initiating a snapshot is fast, while completion time depends on volume size and changed data.
- The AWS instance metadata example used IMDSv1 and `aws ec2 describe-instances --instance-id`. Updated it to use an IMDSv2 token and the correct `--instance-ids` AWS CLI option.
- The AWS cross-region copy command used `--destination-region` as the destination selector. Updated it to use `--region us-west-2`, because AWS CLI sends the copy request to the destination regional endpoint selected by `--region`.
- The AWS DLM cross-region copy snippet used `TargetRegion` for an EBS snapshot policy. Updated it to `Target`, which is the current field for custom snapshot policies.
- The Azure scheduling section used `az backup vault create` and an inline Recovery Services-style policy body for managed disk snapshots. Replaced it with Azure Disk Backup commands using `az dataprotection backup-vault create`, `az dataprotection backup-policy get-default-policy-template --datasource-type AzureDisk`, and `az dataprotection backup-policy create`.
- The Python monitoring script treated EBS snapshot `VolumeSize` as billable snapshot storage and calculated a monthly cost from it. Renamed the metric to provisioned source volume size and added a cost note, because EBS snapshot billing is based on stored changed blocks rather than the source volume size.

## Review Notes
- The Kubernetes examples assume the VolumeSnapshot CRDs, snapshot controller, CSI snapshotter sidecar, and a CSI driver with snapshot support are already installed.
- The Google Cloud `--guest-flush` example is valid, but it requires supported guest configuration and pre/post scripts for application-consistent Linux snapshots.
- The Azure Disk Backup policy template must be edited before creation if the user wants a schedule different from the default template.
