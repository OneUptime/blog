# Validation Summary: How to Deploy Velero with Flux CD for Cluster Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero
- Flux CD
- Kubernetes
- Helm and HelmRelease
- AWS S3
- AWS IAM
- AWS EBS snapshots

## Sources Consulted
- Velero AWS plugin documentation and source: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero Helm chart values and chart metadata: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Velero chart package metadata on Artifact Hub: https://artifacthub.io/packages/helm/vmware-tanzu/velero
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- AWS CLI S3 bucket documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/mb.html
- AWS CLI IAM documentation: https://docs.aws.amazon.com/cli/latest/reference/iam/

## Issues Found
- The HelmRelease used Velero chart version `6.x` with `velero/velero-plugin-for-aws:v1.9.0`, which is an older Velero 1.13-era pairing. Updated the chart constraint to `12.x` and the AWS plugin image to `velero/velero-plugin-for-aws:v1.14.0`, matching the current Velero 1.18 chart line and AWS plugin compatibility guidance.
- The node-agent best practice implied that deploying the DaemonSet alone causes file system backups of Persistent Volumes. Updated the wording to clarify that node-agent makes file system backups available, and that pods must be annotated or `defaultVolumesToFsBackup` enabled when file system backups should be used.
- The conclusion said workloads can be backed up "on a schedule" even though the post does not create a Schedule resource. Updated it to say backups can be run manually or on a schedule, and clarified that volume data can be captured through EBS snapshots or file system backups depending on configuration.
- The expected `velero backup-location get` output omitted the current `ACCESS MODE` and `DEFAULT` columns. Updated the sample output to match the Velero 1.18 CLI table printer.

## Review Notes
The Flux API versions and Helm chart value names used in the examples are current. The AWS IAM policy follows the Velero AWS plugin documentation for S3 backups and EBS snapshots; `s3:PutObjectTagging` is only needed if the BackupStorageLocation uses the `tagging` config field, which this post does not use.
