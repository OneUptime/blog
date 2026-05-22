# Validation Summary: How to Use Locals to Avoid Repeating Expressions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform local values
- Terraform functions: `merge`, `jsonencode`
- AWS provider resources and data sources
- IAM policy JSON

## Sources Consulted
- Terraform local values documentation: https://developer.hashicorp.com/terraform/language/values/locals
- Terraform locals tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/locals
- Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_security_group_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_network_acl_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl_rule
- AWS provider `aws_iam_role_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- AWS provider `aws_ecs_task_definition` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider `aws_region` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region
- AWS provider `aws_caller_identity` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity
- AWS provider `aws_cloudwatch_log_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The ARN example used `data.aws_region.current.name`. In the current AWS provider documentation, the `name` argument for the `aws_region` data source is deprecated, while `id` is documented as the region name. Changed the example to `data.aws_region.current.id` to avoid relying on deprecated provider behavior.

## Review Notes
- The Terraform locals examples are technically correct: local values can reference variables, resources, functions, and other local values, and must be referenced with the singular `local.<NAME>` syntax.
- The `merge` and `jsonencode` examples align with Terraform's official function documentation, and the IAM policy example follows the AWS provider's recommendation to use `jsonencode()` or an IAM policy document data source for JSON policies.
- The security group examples are valid Terraform, but the latest AWS provider documentation recommends using `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for current best practice instead of inline `ingress` and `egress` rules on `aws_security_group`, especially with multiple CIDR blocks.
