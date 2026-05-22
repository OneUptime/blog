# Validation Summary: How to Understand Variable Precedence in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform input variables
- Terraform CLI
- Terraform variable definition files
- Terraform environment variables
- HashiCorp Vault CLI

## Sources Consulted
- HashiCorp Terraform documentation: Use input variables to add module arguments: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform CLI documentation: terraform plan command: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI documentation: terraform apply command: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp Vault CLI documentation: read command: https://developer.hashicorp.com/vault/docs/commands/read

## Issues Found
- The post incorrectly described `-var` as a separate precedence level above `-var-file`. Current Terraform documentation says `-var` and `-var-file` command-line options are processed together in the order provided. I updated the precedence list, command-line flag section, examples, quick reference table, and wrap-up wording to state that command-line variable options have the highest precedence as a group, with later command-line options overriding earlier ones for the same variable.

## Review Notes
The examples using `-var` after `-var-file` were already valid; the wording now clarifies that those examples work because the `-var` option appears later on the command line. The referenced OneUptime links returned HTTP 200 responses.
