# Validation Summary: How to Use For Expressions with Filtering in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform for expressions
- Terraform functions: `contains`, `regex`, `can`
- Terraform optional object attributes
- Terraform dynamic blocks
- AWS Terraform Provider resources: `aws_route53_record`, `aws_security_group`

## Sources Consulted
- Terraform language documentation: For expressions and filtering: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform language documentation: Dynamic blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform function documentation: `contains`: https://developer.hashicorp.com/terraform/language/functions/contains
- Terraform function documentation: `regex`: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform function documentation: `can`: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform language documentation: Optional object type attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Terraform AWS Provider documentation: `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider documentation: `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
No technical issues found.

## Review Notes
The security group example uses inline `ingress` blocks through a Terraform `dynamic` block. This remains valid Terraform syntax, but the current AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the best practice for production security group rule management. The example is still acceptable in context because the post is demonstrating filtered collection usage with dynamic nested blocks.

Terraform CLI was not installed in the workspace, so local `terraform validate` execution was not available. The snippets were reviewed against official Terraform language documentation and AWS provider documentation instead.
