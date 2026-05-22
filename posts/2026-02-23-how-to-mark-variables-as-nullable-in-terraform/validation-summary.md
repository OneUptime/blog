# Validation Summary: How to Mark Variables as Nullable in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variables
- Terraform HCL
- Terraform `nullable` variable argument
- AWS provider resources for CloudFront, SNS, Route 53, ECS, and CloudWatch examples

## Sources Consulted
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform types and values reference: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform type constraints reference: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- AWS provider `aws_cloudfront_distribution` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS provider `aws_sns_topic_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription

## Issues Found
- The post incorrectly stated that explicitly passing `null` to a nullable variable with a default causes Terraform to use the default. Updated the explanation, examples, table, and wrap-up to state that with `nullable = true`, explicit `null` overrides the default and the variable value is `null`.
- The CloudFront example used both a dynamic `viewer_certificate` block and a static `viewer_certificate` block, but the AWS provider allows a maximum of one `viewer_certificate` block. Updated the snippet to use one block with conditional arguments and conditional `aliases`.
- The VPC example claimed `null` values would be accepted even though the shown `vpc_cidr` validation would also reject null. Updated the wording to clarify that `null` could pass unless validation rules also reject it.
- The post described the practical example as a complete module, but the snippet references resources and variables not included in the example. Updated the wording to call it a module excerpt.

## Review Notes
Terraform was not installed in the local environment, so CLI validation could not be run. The review was performed against official Terraform and AWS provider documentation.
