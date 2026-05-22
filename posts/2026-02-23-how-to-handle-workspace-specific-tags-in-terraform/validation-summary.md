# Validation Summary: How to Handle Workspace-Specific Tags in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform workspaces and expressions
- Terraform AWS provider
- Terraform AzureRM provider
- Terraform Google provider / Google Cloud labels
- AWS Config
- AWS IAM policies
- AWS CLI
- AWS Auto Scaling Groups

## Sources Consulted
- Terraform workspaces documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- Terraform named value references: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform `timeadd` function documentation: https://developer.hashicorp.com/terraform/language/functions/timeadd
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- HashiCorp AWS provider default tags tutorial: https://developer.hashicorp.com/terraform/tutorials/aws/aws-default-tags
- Terraform AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS Config `required-tags` managed rule documentation: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS CLI `describe-db-instances` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS CLI `get-bucket-tagging` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-tagging.html
- Google Cloud labels overview: https://cloud.google.com/resource-manager/docs/labels-overview
- Terraform AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## Issues Found
- The post overstated tag coverage by saying metadata/default tags apply to every resource. HashiCorp's documentation notes an Auto Scaling Group exception for AWS provider default tags, and not every cloud resource is taggable, so the wording was changed to "taggable resources" and "Most taggable AWS resources" while preserving the later ASG propagation section.
- The GCP label requirements comment was too narrow. Google Cloud labels allow lowercase letters, numeric characters, underscores, hyphens, and international characters, with keys starting with a lowercase letter or international character. The comment was updated to match the official requirements.
- The temporary workspace tag example used `timeadd(timestamp(), "48h")`. Terraform documents that using `timestamp()` directly in resource attributes causes diffs on every run, so the example now uses a stable input value, `var.expires_on`.
- The enforcement section described Terraform validation, but the shown variable only defines required tag keys and does not validate resources by itself. The wording and comment were changed to describe shared required tag definitions plus AWS Config checks. Related summary wording was adjusted because AWS Config checks compliance but does not by itself prevent resource creation.

## Review Notes
Local CLI verification was limited because `terraform` and `aws` were not installed in the workspace. The review was completed against official Terraform, HashiCorp provider, AWS, and Google Cloud documentation.
