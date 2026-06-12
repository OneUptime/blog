# Validation Summary: How to Use Velero with Cloud Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Kubernetes
- AWS S3
- AWS IAM
- AWS EBS snapshots
- Azure Blob Storage
- Azure service principals and Azure RBAC
- Google Cloud Storage
- Google Cloud IAM and Compute Engine persistent disk snapshots
- Helm

## Sources Consulted
- Velero AWS plugin documentation: https://github.com/velero-io/velero-plugin-for-aws
- Velero Azure plugin documentation: https://github.com/velero-io/velero-plugin-for-microsoft-azure
- Velero Azure BackupStorageLocation documentation: https://github.com/velero-io/velero-plugin-for-microsoft-azure/blob/main/backupstoragelocation.md
- Velero Azure VolumeSnapshotLocation documentation: https://github.com/velero-io/velero-plugin-for-microsoft-azure/blob/main/volumesnapshotlocation.md
- Velero GCP plugin documentation: https://github.com/velero-io/velero-plugin-for-gcp
- Velero Helm chart values: https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml
- Velero provider documentation: https://velero.io/docs/v1.8/supported-providers/
- AWS S3 / Velero setup notes in the Velero AWS plugin documentation, including the `us-east-1` bucket creation exception.

## Issues Found
- The AWS S3 bucket creation command always passed `--create-bucket-configuration LocationConstraint=$REGION`. This fails for `us-east-1`, where S3 does not accept a `LocationConstraint`. I changed the command to omit the bucket configuration when `REGION=us-east-1`.
- The AWS IAM policy omitted Velero S3 multipart upload permissions (`s3:AbortMultipartUpload`, `s3:ListMultipartUploadParts`) and `s3:PutObjectTagging`, which are included in the official Velero AWS policy. I added those permissions and split bucket-level `s3:ListBucket` into its own statement.
- The provider plugin examples used `v1.8.0`, which is outdated relative to current Velero provider plugin documentation. I updated the AWS, Azure, and GCP plugin image tags in CLI and Helm examples to `v1.13.0`, matching the current provider setup examples consulted.
- The Azure section enabled `useAAD: "true"` in Helm but did not grant the service principal `Storage Blob Data Contributor`, which the Velero Azure plugin requires for AAD access to Blob Storage. I added the role assignment and added `useAAD="true"` to the matching CLI install configuration.
- The Azure multi-cloud BackupStorageLocation example used `storageAccountAccessKeyEnvVar`, but the Velero Azure plugin field is `storageAccountKeyEnvVar`. I corrected the field name.
- The multi-cloud diagram described Velero as performing DR replication to other storage providers. Velero targets one backup storage location per backup; keeping copies in other locations requires separate backups, schedules, or provider-side replication. I changed the labels to describe separate DR/archive backups.
- The Azure verification command omitted `--auth-mode login`, which is more consistent with the earlier Azure CLI examples using AAD authentication. I added it.

## Review Notes
The examples still use broad cloud roles in a few places, such as Azure `Contributor` and GCP `roles/compute.storageAdmin`. Those roles can work, but production deployments should normally replace them with narrower custom roles after validating the exact snapshot and storage operations required.
