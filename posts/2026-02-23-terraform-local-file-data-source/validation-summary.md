# Validation Summary: How to Use the local_file Data Source in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp local provider
- Terraform data sources
- Terraform filesystem, encoding, and hash functions
- AWS provider resources for EC2, IAM, S3, API Gateway, and Lambda
- JSON and YAML decoding in Terraform

## Sources Consulted
- HashiCorp Local Provider `local_file` data source documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/data-sources/file
- HashiCorp Terraform data source documentation: https://developer.hashicorp.com/terraform/language/data-sources
- HashiCorp Terraform `yamldecode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamldecode
- HashiCorp Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- HashiCorp Terraform `filebase64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- HashiCorp AWS Provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The available attributes list omitted `content_base64sha256`, `content_base64sha512`, and `content_sha512`. Added them to match the current `hashicorp/local` provider schema.
- The post said `id` is the file path. The official provider schema defines `id` as the hexadecimal SHA1 hash of the file content, so this was corrected.
- The Lambda example used `content_base64` for `source_code_hash`. That value is the Base64-encoded file content, not a hash. Changed it to `content_base64sha256`.
- The Lambda example used `nodejs18.x`, which AWS lists as deprecated as of September 1, 2025. Updated the example to `nodejs24.x`.
- The YAML example claimed `yamldecode` requires Terraform 1.0+. Current Terraform documentation presents it as a built-in function without that 1.0+ caveat, so the inaccurate version note was removed.

## Review Notes
The `local_file` data source reads text content as UTF-8 and replaces invalid UTF-8 sequences in `content`; `content_base64` is the safer attribute for binary file content. The post's security note about file content being stored in Terraform state is important and technically accurate.
