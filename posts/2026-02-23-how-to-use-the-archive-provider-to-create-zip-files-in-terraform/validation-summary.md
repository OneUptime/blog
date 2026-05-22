# Validation Summary: How to Use the Archive Provider to Create ZIP Files in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Archive Provider
- AWS Provider for Terraform
- AWS Lambda
- IAM roles and managed policy attachments
- Python and Node.js Lambda runtimes

## Sources Consulted
- HashiCorp Terraform Registry: archive_file data source: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- HashiCorp Terraform Registry: aws_lambda_function resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- HashiCorp Help Center: Archive provider symlink handling in v2.4.0 and newer: https://support.hashicorp.com/hc/en-us/articles/17941249816083-Error-Archiving-Directory-with-Symlinks-When-Using-the-Terraform-Archive-Provider
- HashiCorp Help Center: Archive provider empty archive behavior in v2.4.2 and newer: https://support.hashicorp.com/hc/en-us/articles/27359812944019-Terraform-run-fails-with-archive-has-not-been-created-as-it-would-be-empty-when-using-the-archive-file-resource

## Issues Found
- The multiple Lambda functions example used `nodejs20.x`. AWS Lambda lists Node.js 20 as deprecated as of April 30, 2026, so this is no longer a current runtime choice on the validation date. Changed it to `nodejs22.x`, which AWS lists as a supported Lambda runtime.

## Review Notes
- The `archive_file` data source arguments used in the post (`type`, `source_file`, `source_dir`, `source`, `content`, `filename`, `output_path`, `excludes`, `output_base64sha256`, and `output_size`) match the Archive provider documentation.
- The AWS Lambda example correctly uses `filename` with the generated archive path and `source_code_hash` with the archive provider's base64-encoded SHA-256 output.
- The examples assume that source directories contain files and that output parent directories such as `dist` already exist or are otherwise managed. Archive provider versions 2.4.2 and newer return an error for archives that would be empty.
