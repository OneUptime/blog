# Validation Summary: How to Import AWS S3 Buckets into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS S3
- AWS CLI
- Terraform AWS provider
- HCL

## Sources Consulted
- OpenTofu import documentation: https://opentofu.org/docs/language/import/
- OpenTofu CLI import documentation: https://opentofu.org/docs/cli/import/
- AWS CLI `get-bucket-versioning`: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-versioning.html
- AWS CLI `get-bucket-encryption`: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-encryption.html
- AWS CLI `get-public-access-block`: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-public-access-block.html
- AWS CLI `get-bucket-lifecycle-configuration`: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-lifecycle-configuration.html
- AWS CLI `get-bucket-policy`: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-policy.html
- Terraform Registry `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform Registry `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform Registry `aws_s3_bucket_server_side_encryption_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform Registry `aws_s3_bucket_public_access_block`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- Terraform Registry `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform Registry `aws_s3_bucket_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy
- AWS S3 bucket policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html
- AWS Organizations tag policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html

## Issues Found
- The public access block inventory command assumed a bucket-level public access block configuration was present. I changed it to tolerate missing configuration so the inventory step remains usable for buckets without a bucket-level setting.
- The Step 3 heading implied every shown sub-resource should always be imported. I changed it to clarify that only existing bucket sub-resources should be imported, since optional resources such as lifecycle configuration and bucket policy may not exist.
- The bucket policy example denied `s3:*` only for object ARNs. I changed the policy document to include both the bucket ARN and the object ARN so bucket-level actions are covered correctly, matching AWS guidance for HTTPS-only bucket policies.
- The `ignore_changes` comment incorrectly implied AWS Organizations tag policies directly manage S3 bucket tags. I changed the comment to describe generic external tag management instead.

## Review Notes
- OpenTofu’s configuration-driven `import` documentation is current as of 2026-04-30, but the feature is still labeled experimental in the official docs.
- The examples are appropriate for general purpose S3 buckets. Several of the referenced S3 APIs and provider resources are not supported for S3 directory buckets.
- Amazon S3 now applies default bucket encryption by default, so `get-bucket-encryption` commonly returns an encryption configuration even when it was not manually configured.
