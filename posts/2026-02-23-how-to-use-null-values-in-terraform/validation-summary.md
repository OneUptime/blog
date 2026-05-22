# Validation Summary: How to Use Null Values in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform input variables, type constraints, conditionals, dynamic blocks, and functions
- AWS Terraform provider resources

## Sources Consulted
- Terraform Types and Values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform Variable Block Reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform Type Constraints documentation, including optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform coalesce function documentation: https://developer.hashicorp.com/terraform/language/functions/coalesce
- Terraform Dynamic Blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- AWS provider aws_s3_bucket_server_side_encryption_configuration resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS provider aws_s3_bucket_logging resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_logging

## Issues Found
- The S3 server-side encryption example used the nested block name `apply_server_side_encryption_configuration`, but the AWS provider resource expects `apply_server_side_encryption_by_default`. Updated the block name so the example matches the provider schema.
- The S3 logging example made `log_bucket` default to `null` even though `target_bucket` is required when the logging resource is created. Added variable validation so `log_bucket` must be provided when `enable_logging` is true.

## Review Notes
Terraform CLI is not installed in this environment, so I could not run `terraform validate` locally. The review was performed against the current official Terraform language documentation and AWS provider registry documentation.
