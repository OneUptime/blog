# Validation Summary: How to Configure S3 Bucket Versioning with OpenTofu

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon S3 bucket versioning
- Amazon S3 lifecycle configuration
- Amazon S3 Block Public Access
- Amazon S3 server-side encryption with AWS KMS
- Amazon S3 Bucket Keys
- AWS CLI `s3api`
- MFA Delete

## Sources Consulted
- OpenTofu 1.6 `init` command documentation: https://opentofu.org/docs/v1.6/cli/commands/init/
- OpenTofu 1.6 `plan` command documentation: https://opentofu.org/docs/v1.6/cli/commands/plan/
- OpenTofu 1.6 `apply` command documentation: https://opentofu.org/docs/v1.6/cli/commands/apply/
- HashiCorp AWS provider `aws_s3_bucket_versioning` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- HashiCorp AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- HashiCorp AWS provider `aws_s3_bucket_public_access_block` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- HashiCorp AWS provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Amazon S3 Versioning documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html
- Amazon S3 enabling versioning documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/manage-versioning-examples.html
- Amazon S3 MFA Delete documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html
- Amazon S3 delete marker documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html
- Amazon S3 deleting object versions documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html
- Amazon S3 lifecycle configuration elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 Block Public Access documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- Amazon S3 default bucket encryption documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html
- Amazon S3 Bucket Keys documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html
- AWS CLI `list-object-versions` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `get-object` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- AWS CLI `delete-object` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/delete-object.html

## Issues Found
- The introduction said every `DELETE` creates a new version. In S3 versioning, a simple delete without a version ID creates a delete marker, while deleting with a version ID permanently deletes that version. Updated the explanation to distinguish writes from simple deletes.
- The optional MFA Delete comments omitted required constraints. The AWS provider requires the resource-level `mfa` argument when changing MFA Delete, AWS requires the bucket-owner root account to enable MFA Delete, and S3 MFA Delete cannot be used with lifecycle configurations. Updated the comments around the commented `mfa_delete` line.
- The lifecycle configuration used noncurrent-version actions but did not explicitly depend on bucket versioning. Added `depends_on = [aws_s3_bucket_versioning.main]` so OpenTofu applies versioning before configuring lifecycle behavior.
- The CLI comment described `get-object --version-id` as restoring a version. The command downloads a specific object version; it does not restore that version as the current S3 object. Updated the comment to say it downloads a specific version.

## Review Notes
The AWS provider resources and AWS CLI options are current and valid for the documented use case. `tofu`, `terraform`, and `aws` were not installed in the review environment, so syntax and command behavior were validated against official documentation rather than executed locally. The examples still assume provider configuration, variable declarations, IAM permissions, and KMS permissions are handled outside the shown snippets. S3 lifecycle transitions now prevent objects smaller than 128 KB from transitioning by default unless an object-size filter or lifecycle configuration override is used.
