# Validation Summary: How to Pass Variables via terraform.tfvars File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variables
- Terraform variable definition files (`.tfvars`, `.auto.tfvars`, `.tfvars.json`)
- HCL expression syntax
- Terraform CLI (`plan`, `apply`, `destroy`, `validate`, `-var-file`)
- AWS provider VPC example

## Sources Consulted
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- HashiCorp Terraform validate command documentation: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp Terraform language syntax documentation: https://developer.hashicorp.com/terraform/language/syntax/configuration
- HashiCorp Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform AWS provider VPC resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The auto-loading section listed `terraform.tfvars`, `terraform.tfvars.json`, then `.auto.tfvars` files as the order. Current HashiCorp documentation describes value precedence for automatically-loaded variable definition files as `.auto.tfvars` / `.auto.tfvars.json` first, then `terraform.tfvars.json`, then `terraform.tfvars`. Updated the post to describe this as value precedence from highest to lowest.
- The validation section implied a named tfvars file could be checked with plain `terraform validate`. Named tfvars files are not auto-loaded, so the post now shows `terraform validate -var-file="production.tfvars"` for named files.
- The wrapping-up section said `terraform.tfvars` supports the "full HCL syntax". A tfvars file uses HCL expression syntax for variable assignments, but not Terraform blocks such as resources or data sources. Updated the wording to "HCL expression syntax including comments."

## Review Notes
Terraform CLI was not installed in the workspace, so command behavior was verified against current official HashiCorp CLI documentation instead of local command output. The post's internal OneUptime link returned HTTP 200.
