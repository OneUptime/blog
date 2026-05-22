# Validation Summary: How to Use Locals with Conditional Logic in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform local values
- Terraform conditional expressions
- Terraform functions: `lookup`, `coalesce`, `try`, `merge`, `concat`, `contains`, `startswith`
- Terraform `count` meta-argument
- AWS provider resources: RDS DB instances, WAFv2 Web ACLs, ECS services

## Sources Consulted
- Terraform locals block reference: https://developer.hashicorp.com/terraform/language/block/locals
- Terraform conditional expressions: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform `lookup` function: https://developer.hashicorp.com/terraform/language/functions/lookup
- Terraform `coalesce` function: https://developer.hashicorp.com/terraform/language/functions/coalesce
- Terraform `try` function: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform `merge` function: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform `concat` function: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `contains` function: https://developer.hashicorp.com/terraform/language/functions/contains
- Terraform `startswith` function: https://developer.hashicorp.com/terraform/language/functions/startswith
- Terraform `count` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_wafv2_web_acl` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Amazon ECS service definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html
- Amazon RDS Performance Insights documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Enabling.html

## Issues Found
- The conditional map merge example used `performance_insights = true`, which is not the Terraform AWS provider argument for RDS DB instances. Changed it to `performance_insights_enabled = true`.
- The `coalesce` explanation said it returns the first non-null value. Terraform's `coalesce` returns the first value that is not null or an empty string, so the explanation was updated.
- The KMS example said the key spec depended on compliance level but returned `"SYMMETRIC_DEFAULT"` in both branches. Changed it to a direct `kms_key_spec = "SYMMETRIC_DEFAULT"` assignment with a corrected comment.
- The ECS service example set `health_check_grace_period_seconds` without showing a load balancer. The AWS provider marks that argument as valid only for services configured to use load balancers, so the field was removed from the standalone example.

## Review Notes
Terraform CLI is not installed in this workspace, so local `terraform validate` could not be run. The review was completed against official Terraform language documentation, AWS provider documentation, and AWS service documentation.
