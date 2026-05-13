# Validation Summary: How to Configure Velero with AWS S3 Backend via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero
- Velero Helm chart
- Velero AWS plugin
- Flux CD HelmRelease
- Amazon EKS IRSA
- AWS IAM
- Amazon S3 buckets, lifecycle rules, encryption, and cross-region replication
- AWS CLI

## Sources Consulted
- Velero AWS plugin README: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Velero upgrade documentation for v1.18 AWS plugin version: https://velero.netlify.app/docs/main/upgrade-to-1.18
- Velero Helm chart values and Chart.yaml: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- AWS CLI create-bucket command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI put-bucket-replication command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- AWS CLI put-bucket-lifecycle-configuration command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Amazon S3 replication permissions guide: https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS service account role association guide: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon S3 lifecycle rule documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html

## Issues Found
- The S3 replication section said it created an IAM role, but only wrote the permissions policy and never created the role, trust policy, or inline policy attachment. Added the S3 service trust policy, `aws iam create-role`, and `aws iam put-role-policy` commands.
- The S3 replication configuration omitted the current rule fields used by AWS CLI examples when applying a whole-bucket `Filter`: `Priority`, `DeleteMarkerReplication`, and `Filter`. Added those fields.
- The Velero IRSA section attached `VeleroBackupPolicy` but never created it. Added an IAM policy document and `aws iam create-policy` command using the permissions recommended by the Velero AWS plugin, scoped to both S3 buckets used in the post.
- The HelmRelease used chart version `6.x` and AWS plugin `v1.9.0`, which correspond to older Velero releases. Updated the chart constraint to `12.x` and the AWS plugin image to `v1.14.0` to match the current Velero 1.18 chart/plugin family.
- The lifecycle configuration omitted `Filter`/`Prefix`; current AWS CLI documentation requires a `Filter` when the lifecycle rule does not include the legacy `Prefix` element. Added `Filter: { Prefix: "" }` so the rule applies to all objects.

## Review Notes
- The commands were reviewed against official documentation, but the local environment does not have `aws`, `helm`, or `kubectl` installed, so live CLI execution was not performed.
- S3 lifecycle transitions can be affected by AWS minimum object-size transition behavior; this is cost-related behavior rather than a syntax error in the example.
