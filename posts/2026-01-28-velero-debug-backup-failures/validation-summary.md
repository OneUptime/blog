# Validation Summary: How to Debug Velero Backup Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Velero
- Kubernetes
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- CSI VolumeSnapshot and VolumeSnapshotClass
- AWS S3 and AWS CLI
- Azure Storage and Azure CLI
- Google Cloud Storage, gsutil, and gcloud CLI
- Bash

## Sources Consulted
- Velero troubleshooting documentation: https://velero.io/docs/main/troubleshooting/
- Velero backup reference: https://velero.io/docs/main/backup-reference/
- Velero file system backup documentation: https://velero.io/docs/main/file-system-backup/
- Velero backup hooks documentation: https://velero.io/docs/v1.17/backup-hooks/
- Velero CSI documentation: https://velero.io/docs/main/csi/
- Velero CSI snapshot data movement documentation: https://velero.io/docs/v1.17/csi-snapshot-data-movement/
- Velero installation customization documentation: https://velero.io/docs/v1.18/customize-installation/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- AWS CLI S3 command documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/
- Azure CLI storage blob documentation: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- Google Cloud gcloud service account key documentation: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create

## Issues Found
- The file system backup annotation example applied `backup.velero.io/backup-volumes` to a PVC. Velero documents this annotation as a pod annotation, and the value should be the pod volume name. Changed the example to annotate a pod and use a generic volume name.
- The hook testing example implied the stored hook annotation could be passed directly to `/bin/sh -c`. Velero hook commands are commonly specified as JSON arrays and are not executed inside a shell by default. Changed the example to print the stored command and then manually execute an equivalent shell command matching the JSON-array format.
- The timeout/resource configuration comment described `--default-backup-ttl` as a timeout. That flag controls default backup retention. Updated the comment to say the snippet adjusts retention and timeouts.

## Review Notes
- The local environment did not have `velero` or `kubectl` available in PATH, so CLI validation was performed against official documentation rather than local `--help` output.
- `--resource-timeout`, `--default-item-operation-timeout`, and `--fs-backup-timeout` behavior is version-sensitive across Velero releases. The post is broadly correct for modern Velero, but readers should verify flags against the exact Velero version installed in their cluster.
