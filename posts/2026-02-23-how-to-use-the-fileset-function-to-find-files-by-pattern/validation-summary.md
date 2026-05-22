# Validation Summary: How to Use the fileset Function to Find Files by Pattern

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform filesystem functions (`fileset`, `file`, `filemd5`, `filebase64sha256`, `templatefile`)
- Terraform collection and string functions (`for_each`, `lookup`, `regex`, `try`, `basename`, `trimsuffix`, `startswith`)
- AWS S3 objects
- AWS IAM policies
- AWS Lambda functions
- AWS ACM certificates
- AWS CloudWatch dashboards

## Sources Consulted
- HashiCorp Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- HashiCorp Terraform built-in functions reference: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- HashiCorp Terraform `basename` function documentation: https://developer.hashicorp.com/terraform/language/functions/basename
- HashiCorp Terraform `filemd5` function documentation: https://docs.hashicorp.com/terraform/language/functions/filemd5
- HashiCorp Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform AWS provider `aws_s3_object` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- HashiCorp Terraform IAM policy tutorial / `aws_iam_policy` example: https://developer.hashicorp.com/terraform/tutorials/aws/aws-iam-policy
- Terraform AWS provider `aws_lambda_function` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_acm_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS provider `aws_cloudwatch_dashboard` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The S3 content type example used `regex("\\.[^.]+$", each.value)` directly. Terraform's `regex` function raises an error when a file has no extension, which could break the example because `fileset("${path.module}/website", "**/*")` can match extensionless files. Changed it to `try(regex("\\.[^.]+$", each.value), "")` so extensionless files fall back to `application/octet-stream`.
- The Lambda example used `runtime = "python3.9"`. AWS lists Python 3.9 as a deprecated Lambda runtime as of December 15, 2025. Updated the example to `python3.12`, which is currently listed as a supported Lambda runtime.
- The recursive YAML filtering example used `startswith(f, "test-")`, which only filters files whose full relative path begins with `test-`. Because the pattern is recursive (`**/*.yaml`), nested files such as `services/test-api.yaml` would not be filtered. Changed it to `startswith(basename(f), "test-")` so the filter applies to the file name at any depth.
- The symlink behavior note made a specific claim about returning symlinks. The official Terraform documentation describes `fileset` as enumerating regular file names, so the note was changed to avoid relying on symlink traversal or special filesystem objects.

## Review Notes
- Terraform CLI was not installed in the local environment, so validation was performed against official Terraform, AWS provider, and AWS Lambda documentation rather than by running `terraform validate`.
- The `aws_s3_object` `etag = filemd5(...)` pattern is valid for standard unencrypted/plain uploads, but the AWS provider documentation notes limitations with KMS encryption and multipart uploads. The post's example is acceptable for its stated simple static website use case.
