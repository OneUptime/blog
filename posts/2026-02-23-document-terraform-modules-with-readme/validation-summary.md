# Validation Summary: How to Document Terraform Modules with README

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform modules
- Terraform CLI
- terraform-docs
- Markdown documentation

## Sources Consulted
- HashiCorp Terraform module configuration documentation: https://developer.hashicorp.com/terraform/language/modules/configuration
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform init documentation: https://developer.hashicorp.com/terraform/cli/init
- HashiCorp Terraform plan documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- terraform-docs Markdown reference: https://terraform-docs.io/reference/markdown/
- terraform-docs output configuration documentation: https://terraform-docs.io/user-guide/configuration/output/

## Issues Found
- The Usage section used a triple-backtick `markdown` fence around an example that itself contained a fenced `hcl` block. This prematurely closed the outer code block and left stray ````bash`/````text` fences. Changed the outer fence to four backticks and closed the inner HCL block normally so the Markdown example renders correctly.
- The starter template included two identical `BEGIN_TF_DOCS`/`END_TF_DOCS` marker blocks, one under Inputs and one under Outputs. terraform-docs' documented default output template wraps a single generated content block between one begin/end marker pair. Changed this to a single "Inputs and Outputs" generated block.

## Review Notes
Terraform and terraform-docs were not installed in the local environment, so CLI verification via local `terraform` or `terraform-docs` commands was not possible. Technical claims were verified against official HashiCorp and terraform-docs documentation instead. The internal OneUptime link and the shields.io badge URL both returned HTTP 200 during link checks.
