# Validation Summary: How to Fix 'Error: Resource Already Exists' in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CLI
- AWS provider for OpenTofu/Terraform
- AzureRM provider
- Google Cloud provider

## Sources Consulted
- OpenTofu import CLI docs: https://opentofu.org/docs/cli/import/
- OpenTofu `import` block docs for v1.6.x: https://opentofu.org/docs/v1.6/language/import/
- OpenTofu `lifecycle` meta-argument docs for v1.6.x: https://opentofu.org/docs/v1.6/language/meta-arguments/lifecycle/
- AWS CLI `describe-vpcs` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html
- AWS S3 error responses: https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html
- AWS EC2 API error codes: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/errors-overview.html
- AWS provider `aws_s3_bucket` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider `aws_iam_role` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider `aws_security_group` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_instance` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_db_instance` import docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AzureRM provider `azurerm_resource_group` import docs: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group
- Google Cloud Terraform import guide: https://cloud.google.com/docs/terraform/resource-management/import

## Issues Found
- The first "common error" example used `VpcLimitExceeded`, which is a quota error, not an "already exists" error. I replaced it with the AWS `InvalidGroup.Duplicate` security group error, which is an actual duplicate-resource case.
- The `tofu import` section did not mention that a matching `resource` block must already exist in configuration. I added that requirement because OpenTofu's import command imports into state only and does not create configuration.
- The Azure resource group import example used a shortened placeholder resource ID. I corrected it to the full resource ID format documented by the AzureRM provider.
- The `import` block section said "OpenTofu 1.5+". OpenTofu documents `import` blocks in v1.6.x, so I corrected the version floor to `1.6+` and noted that the feature is documented as experimental.
- The `import` block workflow implied the blocks must be removed after use. OpenTofu documents them as optional to remove, so I changed that line to say they can be removed or kept as a record.
- The final section was titled as `lifecycle.ignore_changes`, but the code and explanation were using `prevent_destroy`. I retitled and rewrote that section so it accurately describes `lifecycle.prevent_destroy` blocking destructive replacement plans.

## Review Notes
- The post is technically sound after the fixes, but `prevent_destroy` is a safeguard rather than the main fix for an existing duplicate-resource error. Importing the resource into state or using a data source remains the primary resolution path.
- OpenTofu currently documents `import` blocks as experimental, so this post may need another quick review if that status changes in later OpenTofu releases.
