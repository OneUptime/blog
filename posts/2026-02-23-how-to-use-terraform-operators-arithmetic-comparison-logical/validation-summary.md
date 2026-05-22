# Validation Summary: How to Use Terraform Operators (Arithmetic Comparison Logical)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform expressions and operators
- Terraform functions
- AWS provider resources for CloudFront

## Sources Consulted
- Terraform operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `pow` function documentation: https://developer.hashicorp.com/terraform/language/functions/pow
- Terraform `floor` function documentation: https://developer.hashicorp.com/terraform/language/functions/floor
- Terraform `ceil` function documentation: https://developer.hashicorp.com/terraform/language/functions/ceil
- Terraform type documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- AWS provider `aws_cloudfront_distribution` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS provider `aws_cloudfront_cache_policy` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudfront_cache_policy

## Issues Found
- The post described Terraform operators as only three categories and grouped `==` and `!=` under comparison. Terraform's official documentation treats equality operators separately from numeric comparison operators, and numeric comparison operators expect numbers. Updated the wording and headings to say "equality and comparison" where both are discussed.
- The division section said Terraform always produces a floating-point result and implied `15 / 5` is internally `3.0`. Terraform's documented `number` type represents both whole and fractional values, so the wording was changed to "fractional number" and the misleading internal representation note was removed.
- The CloudFront example used the deprecated `forwarded_values` block in `default_cache_behavior`. Updated it to use the `aws_cloudfront_cache_policy` data source with the AWS-managed `Managed-CachingOptimized` policy and set `cache_policy_id`.

## Review Notes
The examples are illustrative and omit surrounding resources such as `aws_vpc.main` and `aws_lb.app`, which is acceptable for a focused operators tutorial. Terraform CLI was not installed in the local environment, so syntax was reviewed against official documentation rather than by running `terraform validate`.
