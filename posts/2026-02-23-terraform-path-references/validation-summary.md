# Validation Summary: How to Use Path References (path.module path.root path.cwd) in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform modules
- Terraform filesystem path references
- Terraform CLI `-chdir`
- Terraform `file` and `templatefile` functions
- HashiCorp Archive provider
- AWS Lambda Terraform resource

## Sources Consulted
- Terraform language documentation: References to Named Values - Filesystem and Workspace Info: https://developer.hashicorp.com/terraform/language/expressions/references#filesystem-and-workspace-info
- Terraform CLI documentation: Switching working directory with `-chdir`: https://developer.hashicorp.com/terraform/cli/commands#switching-working-directory-with-chdir
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Archive provider `archive_file` data source documentation: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- HashiCorp AWS provider `aws_lambda_function` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function

## Issues Found
- The post described `path.root` as the directory "where you run `terraform apply`". This is imprecise when Terraform is invoked with `-chdir`, because `path.root` is the root module directory after Terraform changes into the selected configuration directory. Updated the wording to say it is the root module directory for the current configuration.
- The post described `path.cwd` as the current working directory. Terraform documents it as the original working directory from where Terraform was invoked before applying any `-chdir` argument. Updated the wording to reflect this distinction.
- The Lambda archive example wrote `handler.zip` to `${path.module}`. Terraform's official path reference documentation cautions against using `path.module` in write operations because local module calls can share the same source directory and overwrite each other. Changed the generated archive output path to `${path.root}/generated/handler.zip` while keeping `path.module` for reading the module-owned source file.

## Review Notes
The remaining examples are technically sound for illustrating path references. The post could optionally mention Terraform's current recommendation to use `*.tftpl` for template files, but using `.tpl` is still allowed and not technically incorrect.
