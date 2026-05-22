# Validation Summary: How to Use the filebase64 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform HCL
- Terraform `filebase64`, `file`, `base64encode`, and `filebase64sha256` functions
- AWS provider resources: EC2 instance, EC2 launch template, S3 object, ECS task definition, Lambda function
- Kubernetes provider `kubernetes_secret`
- AzureRM provider `azurerm_virtual_machine_extension`
- Google provider Cloud Functions and Cloud Storage object resources
- Cloud-init

## Sources Consulted
- Terraform `filebase64` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `base64encode` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64encode
- Terraform `filebase64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS provider `aws_s3_object` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Google provider `google_storage_bucket_object` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_object
- AzureRM provider `azurerm_virtual_machine_extension` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_machine_extension
- Cloud-init `write_files` documentation: https://cloudinit.readthedocs.io/en/latest/reference/yaml_examples/write_files.html
- RFC 4648 Base64 specification: https://www.rfc-editor.org/rfc/rfc4648

## Issues Found
- The introduction and scenarios list incorrectly implied Lambda function code is commonly passed to Terraform as base64 file content. Updated the wording to focus on EC2 user data, S3 object content, and other fields that actually accept base64 input in the shown Terraform examples.
- The Kubernetes Secret example used `data` with `filebase64(...)`. The Terraform Kubernetes provider's `data` argument accepts unencoded secret values, while `binary_data` accepts base64-encoded values. Changed the example to use `binary_data` with an opaque binary truststore.
- The Google Cloud Functions example uploaded a ZIP archive using `google_storage_bucket_object.content = filebase64(...)`. The Google provider's `content` argument is literal string content, while local files should be uploaded with `source`. Updated the example and explanation to use `source`.
- The Lambda change-detection section said `filebase64` was used for content, but the example correctly used `filename` for content and `filebase64sha256` for `source_code_hash`. Updated the surrounding explanation to match the code.
- The summary repeated the inaccurate Lambda and Kubernetes claims. Updated it to reference Kubernetes binary secret data and removed Lambda code as an example of `filebase64` content.

## Review Notes
Terraform CLI was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The reviewed snippets were checked against official Terraform and provider documentation instead. The S3 `content_base64` examples are valid for small binary objects, but provider documentation recommends `source` for larger files to avoid storing large encoded content in state.
