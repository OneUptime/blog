# Validation Summary: How to Use the floor Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform built-in numeric, collection, string, and type conversion functions
- AWS provider resources for EC2 instances and CloudWatch log groups

## Sources Consulted
- Terraform `floor` function documentation: https://developer.hashicorp.com/terraform/language/functions/floor
- Terraform `ceil` function documentation: https://developer.hashicorp.com/terraform/language/functions/ceil
- Terraform arithmetic and logical operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- Terraform `range` function documentation: https://developer.hashicorp.com/terraform/language/functions/range
- Terraform `sum` function documentation: https://developer.hashicorp.com/terraform/language/functions/sum
- Terraform `join` function documentation: https://developer.hashicorp.com/terraform/language/functions/join
- Terraform `tostring` function documentation: https://developer.hashicorp.com/terraform/language/functions/tostring
- Terraform `max` function documentation: https://developer.hashicorp.com/terraform/language/functions/max
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform AWS provider `aws_cloudwatch_log_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group

## Issues Found
- The `zone_distribution` and `packing` examples passed lists of numbers directly to `join`, but Terraform documents `join` as operating on a list of strings. Updated both examples to convert each number with `tostring` in a `for` expression before joining.

## Review Notes
The CloudWatch log group example's default `retention_days` value resolves to 14, which is one of the AWS provider's supported `retention_in_days` values. If readers change the input variables, they should ensure the calculated value remains one of the provider-supported retention values.
