# Validation Summary: How to Deploy Velero on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero (Kubernetes backup/restore)
- velero-plugin-for-aws
- Kubernetes
- OpenTofu / Terraform (HCL)
- Helm (helm_release provider)
- AWS S3 (backup storage)
- AWS EC2 (volume snapshots)
- AWS IAM / IRSA (IAM Roles for Service Accounts)
- AWS EKS (OIDC provider)

## Sources Consulted
- VMware Tanzu Velero Helm chart values.yaml (velero-6.0.0): https://github.com/vmware-tanzu/helm-charts/blob/velero-6.0.0/charts/velero/values.yaml
- velero-plugin-for-aws repository (IAM permissions and version compatibility): https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero v1.13 Schedule API documentation: https://velero.io/docs/v1.13/api-types/schedule/

## Issues Found
No technical issues found.

- Helm chart `velero` v6.0.0 (which targets Velero 1.13.x) is a valid published release.
- `configuration.backupStorageLocation` and `configuration.volumeSnapshotLocation` are correctly defined as lists in v6.x of the chart.
- `initContainers[].volumeMounts.mountPath = /target` is the correct mount path for Velero plugin init containers.
- `velero/velero-plugin-for-aws:v1.9.0` is a valid release and is compatible with Velero 1.13.x (matches chart 6.0.0).
- IAM permissions for EC2 volume/snapshot operations and S3 (GetObject, DeleteObject, PutObject, AbortMultipartUpload, ListMultipartUploadParts, ListBucket) match the official velero-plugin-for-aws documentation.
- IRSA assume-role policy structure (Federated principal, sts:AssumeRoleWithWebIdentity, OIDC sub condition `system:serviceaccount:velero:velero`) is correct for the default service account name created by the Helm chart.
- `serviceAccount.server.annotations` is the correct path for setting the `eks.amazonaws.com/role-arn` annotation in this chart version.
- `velero.io/v1` `Schedule` CRD with `spec.schedule`, `spec.template` (ttl, includedNamespaces, excludedNamespaces, storageLocation, volumeSnapshotLocations, labelSelector), and `spec.useOwnerReferencesInBackup` are all valid fields.

## Review Notes
- Versions used in the post (Helm chart 6.0.0, plugin v1.9.0) are valid but outdated as of the validation date. The latest velero-plugin-for-aws is v1.14.0 (compatible with Velero 1.17.x), and the Helm chart has corresponding newer 8.x/9.x releases. The post would benefit from a version update in the future, but the shown configuration remains technically accurate for the chart version specified.
- For environments using CSI volume snapshots (which is now the recommended approach for many EKS deployments using EBS CSI), `velero-plugin-for-csi` would also be needed and the `EnableCSI` feature flag set. The post sticks to the legacy native AWS volume snapshot approach, which still works for the chart version pinned here.
- The example references `aws_iam_openid_connect_provider.eks.arn` and `local.oidc_provider` without defining them inline, which is acceptable for a focused tutorial assuming readers have an existing EKS/OIDC setup.
