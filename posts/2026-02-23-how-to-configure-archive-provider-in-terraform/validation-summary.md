# Validation Summary: How to Configure Archive Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Archive provider
- AWS Lambda
- AWS Lambda Layers
- Google Cloud Functions
- Google Cloud Storage
- Azure Storage Blob
- Terraform null_resource and local-exec provisioner

## Sources Consulted
- HashiCorp Terraform Registry: Archive provider `archive_file` data source - https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- HashiCorp Terraform Registry: AWS `aws_lambda_function` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- HashiCorp Terraform Registry: AWS `aws_lambda_layer_version` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- AWS Lambda runtimes documentation - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- HashiCorp Terraform Registry: Google `google_cloudfunctions_function` resource - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions_function
- Google Cloud Functions runtime support documentation - https://cloud.google.com/functions/docs/runtime-support
- HashiCorp Terraform Registry: AzureRM `azurerm_storage_blob` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_blob

## Issues Found
- The AWS Lambda examples used `nodejs18.x`. AWS lists Node.js 18 as deprecated, with a deprecation date of September 1, 2025. Updated the examples to use `nodejs22.x`, which is a current supported Lambda runtime.
- The Google Cloud Functions example omitted a trigger. The Terraform resource requires a function trigger in practice, and the official documentation shows `trigger_http` or `event_trigger` for deployment. Added `trigger_http = true` to make the example complete.

## Review Notes
- The Archive provider examples align with the current `archive_file` data source schema, including `source_dir`, `source_file`, inline `source` blocks, `excludes`, and checksum outputs.
- The post correctly notes that the `archive_file` data source builds during Terraform plan. In split plan/apply CI workflows, the generated archive must persist from plan to apply; this is worth expanding in a future revision but is not a correctness issue in the current post.
