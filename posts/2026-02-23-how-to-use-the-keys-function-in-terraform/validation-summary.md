# Validation Summary: How to Use the keys Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform collection functions
- Terraform `for_each`
- AWS provider resources for S3, Lambda, and Route 53

## Sources Consulted
- Terraform `keys` function documentation: https://developer.hashicorp.com/terraform/language/functions/keys
- Terraform `values` function documentation: https://developer.hashicorp.com/terraform/language/functions/values
- Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- Terraform `alltrue` function documentation: https://developer.hashicorp.com/terraform/language/functions/alltrue
- Terraform `length` function documentation: https://developer.hashicorp.com/terraform/language/functions/length
- Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider `aws_lambda_function` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The section titled "Dynamic Block Generation from Maps" did not use Terraform `dynamic` blocks. I changed the section heading and introductory sentence to describe what the example actually demonstrates: listing configured map keys for a resource argument.
- The `port_map` example comment listed object keys as `{api = 8080, admin = 8081, grpc = 9090}`. Terraform orders map/object keys lexically in relevant ordered results and display contexts, so I changed the comment to `{admin = 8081, api = 8080, grpc = 9090}`.
- The DNS scenario was described as a "complete example" but assumes surrounding Route 53/provider context such as `aws_route53_zone.main`. I changed the wording to "an example" to avoid overstating completeness.

## Review Notes
The Terraform function behavior is accurate: `keys` returns map keys in lexicographical order, `values` is ordered by corresponding keys, `contains` works for list/tuple/set membership, `alltrue` is valid for validating a list of booleans, and `length` works directly on maps. The AWS provider snippets use valid resource arguments, but they are illustrative and assume referenced resources, variables, IAM roles, hosted zones, and package files exist elsewhere in the configuration.
