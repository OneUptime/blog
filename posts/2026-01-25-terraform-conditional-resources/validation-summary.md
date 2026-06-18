# Validation Summary: How to Create Conditional Resources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform `count` and `for_each` meta-arguments
- Terraform conditional expressions, locals, `coalesce()`, `try()`, and `one()`
- AWS Terraform provider resources for EC2, NAT Gateway, EIP, RDS, S3, CloudFront, WAFv2, ALB, and security groups

## Sources Consulted
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform conditional expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform `one()` function documentation: https://developer.hashicorp.com/terraform/language/functions/one
- Terraform `try()` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- Terraform `coalesce()` function documentation: https://developer.hashicorp.com/terraform/language/functions/coalesce
- AWS provider `aws_cloudfront_distribution` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_s3_bucket_server_side_encryption_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS provider `aws_s3_bucket_logging` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_logging
- AWS provider `aws_wafv2_web_acl` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl

## Issues Found
- The section titled "Conditional Blocks with Dynamic" claimed to use `dynamic` blocks, but the example used `count` on separate S3 configuration resources. Updated the heading and introductory sentence to describe conditional related resources with `count`, matching Terraform's documented behavior that `dynamic` blocks generate nested blocks rather than top-level resources.
- The "Multiple Conditional Resources with for_each" section created a filtered `enabled_features` local but used `count` on the CloudFront and WAF resources. Updated those resources to use `for_each` with filtered maps derived from `local.enabled_features`, so the example now demonstrates the documented `for_each` meta-argument.
- The conclusion recommended reaching for `dynamic` blocks even though the article no longer includes a dynamic block example. Updated the sentence to recommend `for_each` for more complex conditional logic covered by the post.

## Review Notes
The examples are illustrative snippets and assume surrounding resources, variables, IAM roles, providers, and AWS prerequisites exist. Several AWS snippets would need additional production hardening, such as globally unique S3 bucket names, suitable RDS subnet/security configuration, and complete logging target bucket permissions, but those omissions are outside the conditional-resource concept being demonstrated.
