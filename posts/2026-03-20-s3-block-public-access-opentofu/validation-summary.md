# Validation Summary: How to Block Public Access on S3 Buckets with OpenTofu

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon S3 Block Public Access
- Amazon S3 bucket and account-level public access block settings
- Amazon CloudFront Origin Access Control
- AWS Config managed rules
- AWS CLI `s3control` and `s3api`

## Sources Consulted
- OpenTofu 1.6 resource syntax documentation: https://opentofu.org/docs/v1.6/language/resources/syntax/
- OpenTofu CLI commands documentation: https://opentofu.org/docs/v1.6/cli/commands/
- HashiCorp AWS provider `aws_s3_account_public_access_block` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_account_public_access_block
- HashiCorp AWS provider `aws_s3_bucket_public_access_block` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block
- HashiCorp AWS provider `aws_config_config_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule
- Amazon S3 Block Public Access documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- Amazon S3 bucket-level Block Public Access documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-bucket.html
- Amazon CloudFront Origin Access Control for S3 origins documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS Config managed rule `s3-bucket-level-public-access-prohibited`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-level-public-access-prohibited.html
- AWS Config managed rule `s3-account-level-public-access-blocks-periodic`: https://docs.aws.amazon.com/config/latest/developerguide/s3-account-level-public-access-blocks-periodic.html
- AWS CLI `s3control get-public-access-block` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3control/get-public-access-block.html
- AWS CLI `s3api get-public-access-block` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-public-access-block.html
- AWS CLI `s3api list-buckets` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-buckets.html

## Issues Found
- The prerequisites only mentioned S3 permissions, but the examples also use S3 Control for account-level public access block settings and AWS Config for managed rules. Updated the prerequisite to include S3, S3 Control, and AWS Config permissions.
- The account-level example said it overrides bucket-level settings. AWS documents this as S3 applying the most restrictive combination of organization, account, access point, and bucket-level settings. Updated the comment to match that behavior.
- The CloudFront website example disabled `block_public_policy` and `restrict_public_buckets`, claiming this was required for a CloudFront bucket policy. For CloudFront Origin Access Control, the bucket policy grants the CloudFront service principal with a distribution condition and is not a public policy, so all four Block Public Access settings can remain enabled. Updated the section title, comments, and settings accordingly.
- The AWS Config bucket rule used the non-existent managed rule identifier `S3_BUCKET_PUBLIC_ACCESS_PROHIBITED`. Replaced it with the documented `S3_BUCKET_LEVEL_PUBLIC_ACCESS_PROHIBITED` identifier and aligned the rule name and description.
- The AWS Config account rule name did not match the periodic managed rule identifier being used. Updated the rule name to `s3-account-level-public-access-blocks-periodic` for clarity.

## Review Notes
The OpenTofu resource syntax, AWS provider resource arguments, AWS Config managed rule identifiers, and AWS CLI commands are current and valid for the documented use case. `tofu`, `terraform`, and `aws` were not installed in the review environment, so syntax and command behavior were validated against official documentation rather than executed locally. The snippets still assume provider configuration, variable declarations, bucket policy configuration for CloudFront OAC, an AWS Config recorder, and IAM permissions are handled outside the shown examples.
