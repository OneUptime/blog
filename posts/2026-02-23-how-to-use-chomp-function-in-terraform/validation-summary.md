# Validation Summary: How to Use the chomp Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform string functions
- Terraform filesystem functions
- Terraform variable validation
- AWS Terraform provider resources

## Sources Consulted
- Terraform `chomp` function documentation: https://developer.hashicorp.com/terraform/language/functions/chomp
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Terraform `trimspace` function documentation: https://developer.hashicorp.com/terraform/language/functions/trimspace
- Terraform strings and heredoc documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform custom conditions and variable validation documentation: https://developer.hashicorp.com/terraform/language/validate
- AWS provider `aws_key_pair` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair
- AWS provider `aws_iam_server_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_server_certificate

## Issues Found
- The SSH key example used `file(var.ssh_key_path)` with a default value of `~/.ssh/id_rsa.pub`. Terraform's `pathexpand` function is the documented way to expand a leading `~` path segment. Changed the example to `file(pathexpand(var.ssh_key_path))` so the default path works as intended.

## Review Notes
- Terraform was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform console` or `terraform validate`.
- The combination `trimspace(chomp(...))` is technically correct, but `chomp` is redundant when `trimspace` is already intended to remove leading and trailing whitespace.
