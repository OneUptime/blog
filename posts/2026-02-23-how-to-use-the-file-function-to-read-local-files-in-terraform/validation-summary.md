# Validation Summary: How to Use the file Function to Read Local Files in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform filesystem functions: `file`, `fileexists`, `filebase64`, `templatefile`, `pathexpand`
- HCL
- AWS Terraform provider resources for EC2, IAM, S3, ACM, and Lambda
- Cloud-init configuration

## Sources Consulted
- HashiCorp Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- HashiCorp Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform `fileexists` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileexists
- HashiCorp Terraform `filebase64` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64
- HashiCorp Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- HashiCorp Terraform filesystem and workspace references: https://developer.hashicorp.com/terraform/language/expressions/references#filesystem-and-workspace-info
- HashiCorp AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function

## Issues Found
- Corrected the explanation of relative paths. The original text said paths are relative to the root module directory. Terraform resolves plain relative paths relative to the current working directory, which is typically the root module directory; the post now states that distinction and recommends explicit path values.
- Corrected the SSH public key example. `file("~/.ssh/id_rsa.pub")` does not expand `~`; the post now uses `file(pathexpand("~/.ssh/id_rsa.pub"))`.
- Corrected the Lambda example in the function-composition section. The original resource omitted the required deployment package source and used a plain `sha256(file(...))` value as `source_code_hash`. The example now includes a `filename` argument and avoids presenting the text-file hash as a Lambda package update trigger.
- Updated the Lambda runtime example from `python3.9` to `python3.12` to avoid relying on an older runtime in a current example.

## Review Notes
The core explanation of `file` as a UTF-8 text reader, its static-file limitation at the start of a Terraform run, and the distinction from `templatefile` matched the official Terraform documentation. The post correctly recommends `filebase64` for raw binary file contents.
