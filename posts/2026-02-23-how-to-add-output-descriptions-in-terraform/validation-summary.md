# Validation Summary: How to Add Output Descriptions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform output blocks
- Terraform CLI
- terraform-docs
- pre-commit hooks
- HCL configuration syntax

## Sources Consulted
- HashiCorp Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- HashiCorp Terraform `terraform output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform `terraform console` command reference: https://developer.hashicorp.com/terraform/cli/commands/console
- HashiCorp Terraform references to values documentation: https://developer.hashicorp.com/terraform/language/expressions/references
- terraform-docs Markdown command reference: https://terraform-docs.io/reference/markdown/
- terraform-docs pre-commit hooks documentation: https://terraform-docs.io/how-to/pre-commit-hooks/
- terraform-docs GitHub README: https://github.com/terraform-docs/terraform-docs

## Issues Found
- Removed the `terraform console` subsection that claimed outputs can show descriptions in some versions. The official `terraform console` documentation describes it as an expression evaluation console for configuration and state values, not as a command that displays output descriptions.
- Updated the terraform-docs pre-commit snippet from `v0.18.0` to `v0.24.0` and added the module path argument. Current terraform-docs documentation shows pre-commit hook arguments should include the path to scan, and the project README currently documents `v0.24.0`.

## Review Notes
The Terraform output block examples use valid documented arguments such as `description`, `value`, and `sensitive`. The `terraform output -raw` guidance for sensitive scalar values is technically correct, but sensitive outputs are still stored in Terraform state and should be handled as secrets.
