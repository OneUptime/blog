# Validation Summary: How to Use the dirname Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language (HCL)
- Terraform filesystem functions: `dirname`, `basename`, `fileset`, `filebase64sha256`
- Terraform expressions and grouping mode
- AWS Lambda Terraform resource example
- YAML decoding with `yamldecode`

## Sources Consulted
- HashiCorp Terraform `dirname` function documentation: https://developer.hashicorp.com/terraform/language/functions/dirname
- HashiCorp Terraform `basename` function documentation: https://developer.hashicorp.com/terraform/language/functions/basename
- HashiCorp Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- HashiCorp Terraform `filebase64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- HashiCorp Terraform `yamldecode` function documentation: https://developer.hashicorp.com/terraform/language/functions/yamldecode
- HashiCorp Terraform references to named values documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- HashiCorp Terraform `for` expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- Go package documentation showing Terraform `dirname` uses `filepath.Dir`: https://pkg.go.dev/github.com/hashicorp/terraform/lang/funcs
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The post said `dirname` follows Unix conventions without qualification. Terraform documents `dirname` as host-platform-dependent, with Windows using backslashes as path separators. Updated the wording to describe Unix-like behavior while noting Windows behavior.
- The AWS Lambda example used `runtime = "python3.9"`, which AWS lists as a deprecated runtime as of December 15, 2025. Updated the example to `python3.13`, a currently supported Lambda runtime.
- The nested `dirname` example used `level_0 = full_path`, but Terraform local values must be referenced as `local.full_path`. Updated the reference so the snippet is syntactically valid.
- The important notes said `dirname` always returns forward slashes and does not normalize paths. Terraform documents the result as normalized and platform-dependent, and Terraform's implementation uses Go `filepath.Dir`. Updated the notes to reflect platform separators and normalized returned paths.

## Review Notes
Terraform CLI was not installed in the workspace, so examples were reviewed against official documentation and Terraform's published Go package documentation rather than by running `terraform console`.
