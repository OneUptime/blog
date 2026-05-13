# Validation Summary: How to Configure Velero Volume Snapshot Location with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero
- Velero VolumeSnapshotLocation
- Velero BackupStorageLocation
- Velero CSI snapshot support
- Velero Helm chart
- Flux CD HelmRelease and Kustomization
- Kubernetes VolumeSnapshotClass
- AWS EBS snapshots
- Azure Managed Disk snapshots
- GCP Persistent Disk snapshots

## Sources Consulted
- Velero CSI snapshot support documentation: https://velero.io/docs/main/csi/
- Velero customize installation documentation: https://velero.io/docs/v1.18/customize-installation/
- Velero backup storage and volume snapshot locations documentation: https://velero.io/docs/v1.18/locations/
- Velero AWS plugin VolumeSnapshotLocation documentation: https://github.com/velero-io/velero-plugin-for-aws/blob/main/volumesnapshotlocation.md
- Velero Azure plugin VolumeSnapshotLocation documentation: https://github.com/velero-io/velero-plugin-for-microsoft-azure/blob/main/volumesnapshotlocation.md
- Velero GCP plugin VolumeSnapshotLocation documentation: https://github.com/velero-io/velero-plugin-for-gcp/blob/main/volumesnapshotlocation.md
- Velero Helm chart values and chart metadata: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Amazon EKS EBS CSI snapshot documentation: https://docs.aws.amazon.com/eks/latest/userguide/csi-snapshot-controller.html

## Issues Found
- The introduction said Velero quiesces pods automatically. Velero triggers volume snapshots, but application quiescing requires backup hooks or application-specific handling, so the wording was corrected.
- The AWS VSL example used `provider: aws` and undocumented `additionalTags` configuration. The provider was updated to `velero.io/aws`, and the unsupported tag configuration was removed.
- The secondary AWS VSL example implied Velero performs cross-region EBS snapshot copies. Velero VSL regions must match the volumes being snapshotted, so the heading and comment were corrected.
- The Azure and GCP VSL examples used short provider names. These were updated to the documented plugin provider names `velero.io/azure` and `velero.io/gcp`.
- The GCP VSL example described `project` as the project where snapshots are created. Official plugin documentation says it is for retrieving existing snapshots during restores when different from the credential project, so the comment and placeholder were corrected.
- The CSI example referred to a generic CSI plugin feature flag and described an EBS tag parameter as creating fast snapshots. The comment now names `EnableCSI` and describes the EBS parameter as a snapshot tag.
- The HelmRelease example pinned the old `6.x` chart line. The current official chart line is `12.x`, so the version was updated.
- The best-practices section told readers to tag all snapshots, but tagging support is provider-specific. The recommendation was narrowed to providers that support snapshot tagging.

## Review Notes
The command examples and Flux API versions are valid for the documented workflow. The guide still assumes the cloud provider plugin, credentials, and snapshot controller or CSI driver are installed correctly; those are appropriate prerequisites for this post.
