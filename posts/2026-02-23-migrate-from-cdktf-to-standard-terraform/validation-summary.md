# Validation Summary: How to Migrate from CDKTF to Standard Terraform

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Terraform CLI
- Terraform HCL and JSON configuration syntax
- CDK for Terraform (CDKTF)
- Terraform state management
- Terraform modules
- AWS Terraform provider resources and data sources
- json2hcl

## Sources Consulted
- Terraform JSON configuration syntax: https://developer.hashicorp.com/terraform/language/syntax/json
- Terraform configuration syntax overview: https://developer.hashicorp.com/terraform/language/syntax
- Terraform files and configuration structure: https://developer.hashicorp.com/terraform/language/files
- Terraform `state` command reference: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform `fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform `validate` command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform modules overview: https://developer.hashicorp.com/terraform/language/modules
- CDKTF constructs documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/constructs
- CDKTF application tutorial showing `cdktf synth` output: https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-applications
- json2hcl project documentation: https://github.com/kvz/json2hcl

## Issues Found
- The post showed `go install github.com/kvz/json2hcl/v2@latest`, but the `json2hcl` project documentation does not document that install path and the repository is now archived/deprecated. Updated the text to describe it as a deprecated third-party tool, changed the install example to download the current release binary, and changed the conversion command to invoke the downloaded binary.
- The inline VPC example referenced `data.aws_availability_zones.available.names[count.index]` without declaring the `aws_availability_zones` data source. Added the required data source block so the snippet is internally complete.

## Review Notes
- The migration flow, CDKTF synthesis description, Terraform JSON/HCL explanation, state move guidance, module examples, variable/output snippets, and Terraform CLI commands are consistent with the consulted documentation.
- The local environment did not have `terraform`, `cdktf`, or `go` installed, so command behavior was verified against documentation rather than by executing the CLIs locally.
