# Validation Summary: How to Configure Cross-Region Storage Replication with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- AWS S3 (Cross-Region Replication / CRR)
- AWS IAM (roles and policies)
- AWS S3 Bucket Versioning
- AWS CLI (`aws s3`, `aws s3api`)
- Terraform AWS provider (`hashicorp/aws`) — `aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_s3_bucket_replication_configuration`, `aws_iam_role`, `aws_iam_role_policy`

## Sources Consulted
- AWS S3 Replication overview: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html
- AWS S3 Replication permissions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/setting-repl-config-perm-overview.html
- Terraform AWS provider — `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS provider — `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS provider — `aws_iam_role` / `aws_iam_role_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS CLI Reference — `s3api head-object`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3api/head-object.html
- AWS S3 storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- OpenTofu provider configuration / aliases: https://opentofu.org/docs/language/providers/configuration/

## Issues Found
No technical issues found.

All technical claims verified against current AWS and Terraform AWS provider documentation:
- The `aws_s3_bucket_versioning` resource (separate from `aws_s3_bucket`) is the correct approach since the AWS provider v4 split (the inline `versioning` block was deprecated).
- IAM trust policy with `s3.amazonaws.com` as principal and `sts:AssumeRole` action is the documented approach for the S3 replication service role.
- The IAM permission set (`s3:GetReplicationConfiguration`, `s3:ListBucket`, `s3:GetObjectVersionForReplication`, `s3:GetObjectVersionAcl`, `s3:ReplicateObject`, `s3:ReplicateDelete`) matches AWS's documented minimum permissions for object replication.
- `aws_s3_bucket_replication_configuration` is the current top-level resource (replacing the deprecated inline `replication_configuration` block in `aws_s3_bucket`).
- The `depends_on = [aws_s3_bucket_versioning.source]` is necessary because S3 rejects replication configuration on a bucket without versioning enabled.
- `STANDARD_IA` is a valid S3 destination storage class.
- `aws s3api head-object --query 'ReplicationStatus'` returns the replication status field (values: `PENDING`, `COMPLETED`, `FAILED`, `REPLICA`).

## Review Notes
- The `rule` block omits an explicit `filter {}` (or `prefix`). The Terraform AWS provider accepts this and replicates all objects, but newer provider versions favor V2-style rules with an explicit `filter {}` block. This is a stylistic preference rather than a correctness issue.
- The example uses bucket names `my-app-data-source` and `my-app-data-replica`. S3 bucket names are globally unique; readers will need to substitute their own names.
- For tag/metadata replication, additional permissions (`s3:GetObjectVersionTagging`, `s3:ReplicateTags`) would be needed — out of scope for the basic flow shown.
- Delete marker replication is not enabled in the rule (`delete_marker_replication` block absent); the `s3:ReplicateDelete` permission is included but only takes effect once delete marker replication is turned on. This is fine for the introductory example.
- KMS-encrypted source objects would require additional configuration (`source_selection_criteria` and KMS key permissions). Not covered, which is reasonable for a starter tutorial.
