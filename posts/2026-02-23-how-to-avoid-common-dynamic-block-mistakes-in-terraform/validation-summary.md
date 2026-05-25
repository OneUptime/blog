# Validation Summary: How to Avoid Common Dynamic Block Mistakes in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform configuration language
- Terraform dynamic blocks
- HCL expressions and type system
- Terraform `for_each` and `count`
- HashiCorp AWS provider resources

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- HashiCorp AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- HashiCorp AWS provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The post said a dynamic block `for_each` accepts only a list, set, or map. Terraform's official dynamic block documentation says it accepts any collection or structural value. Updated the wording to include lists, sets, maps, tuples, and objects.
- The S3 logging example used the inline `logging` block on `aws_s3_bucket` without noting that this is deprecated in the current AWS provider documentation. Updated the section wording and code comment to clarify that the inline block is outdated and that a separate `aws_s3_bucket_logging` resource with `count` is the current cleaner approach.

## Review Notes
- Terraform CLI is not installed in this workspace, so examples were reviewed against official documentation rather than by running `terraform validate`.
- The security group examples use inline `ingress` blocks, which remain documented but are no longer the AWS provider's preferred approach for complex rule management. The examples are still acceptable for explaining dynamic block mechanics.
