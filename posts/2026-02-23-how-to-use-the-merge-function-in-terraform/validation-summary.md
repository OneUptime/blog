# Validation Summary: How to Use the merge Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform configuration language (HCL)
- Terraform collection functions
- Terraform AWS provider resources

## Sources Consulted
- Terraform `merge` function documentation: https://developer.hashicorp.com/terraform/language/functions/merge
- Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform `lookup` function documentation: https://developer.hashicorp.com/terraform/language/functions/lookup
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS VPC property documentation for DNS and tenancy fields: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html

## Issues Found
- The post described `merge` as taking maps and returning a map. Terraform's official documentation says `merge` accepts maps or objects and returns a map or object, depending on the arguments. Updated the introduction and function description accordingly.
- The post said all maps must have compatible value types and suggested `{a = "string"}` merged with `{a = 5}` may error. Terraform's official `merge` documentation shows that mixed argument types can produce an object matching the merged attributes. Updated the edge case to describe Terraform's actual behavior.
- The post said Terraform has no spread operator. Because the post later correctly discusses Terraform's `...` expansion symbol for function arguments, updated this wording to say Terraform has no object spread syntax.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official documentation rather than executed locally. The AWS resource snippets are illustrative and omit provider setup and required variables such as `var.cidr_block`, which is acceptable for the context but would need surrounding configuration to run as complete Terraform modules.
