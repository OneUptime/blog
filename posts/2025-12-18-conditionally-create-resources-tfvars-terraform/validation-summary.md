# Validation Summary: How to Conditionally Create Resources Based on .tfvars

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform input variables and `.tfvars` files
- Terraform `count` and `for_each` meta-arguments
- Terraform conditional expressions
- Terraform modules
- AWS provider resources for CloudWatch, RDS, VPC Flow Logs, IAM, GuardDuty, ElastiCache, Security Groups, EC2, AWS Backup, and SSM Parameter Store

## Sources Consulted
- HashiCorp Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- HashiCorp Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform input variables and `.tfvars` documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform conditional expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- HashiCorp Terraform CLI variable file documentation: https://developer.hashicorp.com/terraform/cli/commands/plan#var-file-filename
- HashiCorp AWS provider `aws_flow_log` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/flow_log.html.markdown
- HashiCorp AWS provider `aws_guardduty_detector` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_detector.html.markdown
- HashiCorp AWS provider `aws_guardduty_detector_feature` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/guardduty_detector_feature.html.markdown
- HashiCorp AWS provider `aws_elasticache_cluster` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/elasticache_cluster.html.markdown
- HashiCorp AWS provider `aws_db_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown

## Issues Found
- The RDS example referenced `var.db_password` without declaring it. Added a sensitive string variable declaration so the snippet has a defined password input.
- The VPC Flow Logs example created an IAM role but did not attach the CloudWatch Logs permissions required for delivery. Added an `aws_iam_role_policy` resource and a dependency from `aws_flow_log` to that policy.
- The GuardDuty example used the deprecated `datasources` block on `aws_guardduty_detector`. Replaced it with current `aws_guardduty_detector_feature` resources for `S3_DATA_EVENTS` and `EKS_AUDIT_LOGS`.
- The conditional module example dereferenced `var.monitoring_config` even when the `.tfvars` example set it to `null`. Updated the module inputs to use conditional expressions so the null value is not dereferenced when the module is disabled.

## Review Notes
Terraform was not installed in the local workspace, so `terraform validate` could not be run. The review was completed against current official HashiCorp Terraform and AWS provider documentation. Several snippets remain illustrative and assume surrounding resources such as VPCs, subnets, AMIs, and EC2 instances exist elsewhere in the configuration.
