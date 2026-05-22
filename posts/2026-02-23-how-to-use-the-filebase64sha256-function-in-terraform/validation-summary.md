# Validation Summary: How to Use the filebase64sha256 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform HCL
- Terraform `filebase64sha256`, `filesha256`, and `filemd5` functions
- HashiCorp AWS provider Lambda resources
- HashiCorp AWS provider S3 object resource
- HashiCorp Archive provider `archive_file` data source
- AWS Lambda runtimes, functions, versions, aliases, and layers
- Amazon S3 object uploads and object tags

## Sources Consulted
- HashiCorp Developer documentation: `filebase64sha256` function - https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- Terraform Registry documentation: `aws_lambda_function` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform Registry documentation: `aws_lambda_layer_version` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- Terraform Registry documentation: `aws_lambda_alias` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_alias
- Terraform Registry documentation: `aws_s3_object` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- Terraform Registry documentation: `archive_file` data source - https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/archive_file
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Developer Guide: Manage Lambda function versions - https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html

## Issues Found
- The examples used deprecated AWS Lambda runtimes: `nodejs18.x` and `python3.9`. AWS Lambda lists Node.js 18 as deprecated on September 1, 2025 and Python 3.9 as deprecated on December 15, 2025. Updated the examples to currently supported runtimes: `nodejs24.x`, `python3.14`, and `python3.13` for layer compatibility.
- The Lambda alias example referenced `aws_lambda_function.app.version` but did not set `publish = true` on the Lambda function. Added `publish = true` so Terraform publishes function versions that the alias can track.

## Review Notes
- The explanation of `filebase64sha256` is consistent with HashiCorp documentation: it hashes file contents and is similar to `base64sha256(file(filename))`, but works for binary files because `file` only accepts UTF-8 text.
- The Lambda `source_code_hash` examples are consistent with the AWS provider documentation, which expects a base64-encoded SHA256 hash of the package file.
- The `archive_file` example correctly uses `output_base64sha256` instead of recalculating the hash from a file that may not exist before the data source runs.
- The S3 example correctly uses `etag = filemd5(...)` for upload change detection and stores the SHA256 value as a tag for verification/tracking.
