# Validation Summary: How to Use the base64sha256 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform hash and crypto functions
- HashiCorp AWS provider
- HashiCorp Archive provider
- HashiCorp Google provider
- AWS Lambda
- AWS Systems Manager Parameter Store
- Google Cloud Functions
- Google Cloud Storage

## Sources Consulted
- Terraform `base64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64sha256
- Terraform `filebase64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- Terraform AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_lambda_layer_version` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- Terraform Archive provider `archive_file` data source documentation: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- Terraform Google provider `google_storage_bucket_object` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_object
- Terraform Google provider `google_cloudfunctions_function` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions_function
- AWS Lambda CreateFunction API documentation: https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html

## Issues Found
- The introduction implied that `base64sha256` simply saves users from manually chaining `sha256` and `base64encode`. Terraform documents that this is not equivalent because `sha256` returns a hexadecimal string. Updated the wording to say that `base64sha256` avoids encoding the hexadecimal output from `sha256`.
- The GCP example claimed that Google Cloud Functions use `base64sha256` for source code change detection. The Terraform Google provider uses `source_archive_bucket` and `source_archive_object`; the example is really using the hash in the Cloud Storage object name. Updated the section text to describe that pattern accurately.
- The file hashing section described `base64sha256(file("${path.module}/artifact.zip"))` as merely less efficient. Terraform documents that `file()` accepts UTF-8 text, so it is not suitable for binary zip archives. Updated the example to use a UTF-8 JSON file and clarified that `filebase64sha256` works directly with file bytes, including binary archives.
- The complete Lambda example referenced `var.environment` without declaring it, which made the example not self-contained. Replaced the value with a literal environment string.
- The complete Lambda example wrote the archive to a nested `build/function.zip` path without showing that the directory exists. Updated it to write to `${path.module}/function.zip` to keep the example self-contained.

## Review Notes
The Terraform function examples, AWS Lambda `source_code_hash` usage, Lambda layer `source_code_hash` usage, and Archive provider `output_base64sha256` usage are consistent with official documentation. The GCP example is valid as a content-addressed object naming pattern, but for URL- and path-friendly object names a future revision could use a hexadecimal hash such as `filesha256` instead of base64.
