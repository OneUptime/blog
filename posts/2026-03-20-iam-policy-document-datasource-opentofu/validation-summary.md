# Validation Summary: How to Use aws_iam_policy_document Data Source in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider
- AWS IAM
- Amazon S3
- AWS STS
- HCL
- `jq`

## Sources Consulted
- OpenTofu data sources documentation: https://opentofu.org/docs/v1.8/language/data-sources/
- OpenTofu `show` command documentation: https://opentofu.org/docs/v1.10/cli/commands/show/
- AWS provider `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS provider `aws_caller_identity` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity
- AWS provider `aws_iam_role` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider `aws_iam_role_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- Amazon S3 bucket policy condition key examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- Amazon S3 actions, resources, and condition keys reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html

## Issues Found
- The Step 1 object-level policy applied the `s3:x-amz-server-side-encryption` condition to `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` together. AWS documents that this condition key applies to upload requests such as `PutObject`, not `GetObject` or `DeleteObject`. I split the example into one statement for `GetObject` and `DeleteObject`, and a separate `PutObject` statement that keeps the SSE-KMS condition.
- Steps 3 and 4 referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. I added `data "aws_caller_identity" "current" {}` before the merged-policy example so the later ARN interpolation is valid.

## Review Notes
- The post is now technically correct after the fixes above.
- Some identifiers such as `var.bucket_name`, `var.region`, and `aws_dynamodb_table.app` are example inputs/resources that are assumed to be defined elsewhere in the user's configuration.
