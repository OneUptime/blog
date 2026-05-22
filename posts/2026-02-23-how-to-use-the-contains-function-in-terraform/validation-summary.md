# Validation Summary: How to Use the contains Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform collection functions: `contains`, `keys`, `alltrue`, and `anytrue`
- Terraform variable validation, conditional expressions, `count`, `for` expressions, locals, and outputs
- AWS provider resources and data sources: CloudWatch Dashboard, CloudWatch Log Group, IAM policy document, and EC2 instance
- Amazon S3 IAM actions and resource ARNs

## Sources Consulted
- HashiCorp Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- HashiCorp Terraform `keys` function documentation: https://developer.hashicorp.com/terraform/language/functions/keys
- HashiCorp Terraform `alltrue` function documentation: https://developer.hashicorp.com/terraform/language/functions/alltrue
- HashiCorp Terraform `anytrue` function documentation: https://developer.hashicorp.com/terraform/language/functions/anytrue
- HashiCorp Terraform equality operators documentation: https://developer.hashicorp.com/terraform/language/expressions/operators
- HashiCorp Terraform type conversion documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- HashiCorp Terraform validation documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- HashiCorp Terraform meta-arguments documentation: https://developer.hashicorp.com/terraform/language/meta-arguments
- HashiCorp AWS provider `aws_cloudwatch_dashboard` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- HashiCorp AWS provider `aws_cloudwatch_log_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- AWS Service Authorization Reference for Amazon S3 actions and resource types: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html

## Issues Found
- The role-based access control example used `s3:ListBucket` with only the object ARN `arn:aws:s3:::app-bucket/*`. AWS documents `ListBucket` as applying to the bucket resource type, while `GetObject` and `PutObject` apply to object resources. Updated the example to include both `arn:aws:s3:::app-bucket` and `arn:aws:s3:::app-bucket/*` so the listed actions have matching resources.

## Review Notes
- The local Terraform CLI was not installed in the review environment, so examples were reviewed against official Terraform and provider documentation rather than executed with `terraform validate`.
- The post focuses on lists, while Terraform's official `contains` documentation also supports tuples and sets. The wording is technically acceptable for the examples shown.
