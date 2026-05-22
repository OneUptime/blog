# Validation Summary: How to Use lookup with Default Values in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform configuration language (HCL)
- Terraform collection functions
- Terraform AWS provider resources

## Sources Consulted
- Terraform `lookup` function documentation: https://developer.hashicorp.com/terraform/language/functions/lookup
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform `coalesce` function documentation: https://developer.hashicorp.com/terraform/language/functions/coalesce
- Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- AWS provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS provider `aws_wafv2_web_acl` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The null-handling section recommended `coalesce(lookup(...), "default")` for missing keys and null values, but Terraform's `coalesce` returns the first argument that is neither null nor an empty string. I updated the sentence and inline comment to make clear that this pattern also treats empty strings as a reason to use the default.

## Review Notes
The `lookup` syntax and behavior are accurate. The post correctly notes that the default argument is technically optional, and the recommendation to include it aligns with the Terraform documentation because omitting it has been deprecated since Terraform v0.7. The AWS examples are partial tutorial snippets and contain placeholder references such as `var.ami_id`, `var.vpc_id`, and omitted WAF configuration; the `lookup` usage inside those snippets is valid.
