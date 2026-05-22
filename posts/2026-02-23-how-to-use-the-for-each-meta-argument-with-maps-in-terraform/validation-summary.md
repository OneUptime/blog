# Validation Summary: How to Use the for_each Meta-Argument with Maps in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform `for_each` meta-argument
- Terraform maps, objects, for expressions, and dynamic blocks
- AWS Terraform Provider resources

## Sources Consulted
- HashiCorp Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- HashiCorp Terraform `lookup` function documentation: https://developer.hashicorp.com/terraform/language/functions/lookup
- Terraform AWS Provider `aws_cloudwatch_log_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS Provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The CloudWatch Logs example used `retention_in_days = 2555` for the `audit` log group. The AWS provider's valid retention values include `2557`, not `2555`, so this was changed to `2557`.
- The `services` variable in the locals example used `lookup(svc, "public", false)` even though `svc` was declared as an object type without a `public` attribute. The object type now declares `public = optional(bool, false)`, and the filter uses `if svc.public`.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The examples were reviewed against official Terraform language documentation and Terraform AWS Provider resource documentation.
