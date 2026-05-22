# Validation Summary: How to Use the fileexists Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform filesystem functions: `fileexists`, `file`, `filebase64sha256`, `pathexpand`
- Terraform conditionals, variable validation, `for_each`, `count`, and outputs
- AWS Terraform provider resources for S3, IAM, EC2, and Lambda examples

## Sources Consulted
- Terraform `fileexists` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileexists
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform function call evaluation documentation: https://developer.hashicorp.com/terraform/language/expressions/function-calls
- Terraform `coalesce` function documentation: https://developer.hashicorp.com/terraform/language/functions/coalesce
- Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform AWS provider `aws_iam_server_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_server_certificate
- Terraform AWS provider `aws_lambda_function` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_lambda_layer_version` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version

## Issues Found
- The post said `fileexists` returns `false` otherwise. Terraform's official documentation says `fileexists` works only with regular files and returns an error for directories, FIFOs, and other special modes. Updated the introduction and notes to clarify that missing files return `false`, while directories and special files return an error.
- The post described the function as checking at plan time. Terraform documents filesystem functions as being evaluated while loading and validating configuration, before Terraform takes actions. Updated the wording to be more precise.
- The validation example used `fileexists(var.ssh_public_key_path)` with a default path beginning with `~`. Updated it to `fileexists(pathexpand(var.ssh_public_key_path))` so the home-directory shorthand is handled explicitly.
- The platform-specific path example used `coalesce([... ]...)`, which errors if every candidate is an empty string. Wrapped it in `try(..., null)` so the expression returns `null` when none of the listed paths exists.

## Review Notes
Terraform CLI is not installed in this workspace, so I could not run `terraform validate` against extracted examples. The snippets were reviewed against official Terraform language documentation and the current AWS provider documentation. Some AWS examples are intentionally partial and rely on surrounding resources or variables not shown in the post.
