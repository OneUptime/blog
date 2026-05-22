# Validation Summary: How to Use Terragrunt with Terraform Modules

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform
- Terragrunt
- Terraform modules
- Terraform Registry module sources
- Git and S3 module sources
- HCL configuration

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/modules/syntax
- Terraform module sources reference: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform output command reference: https://developer.hashicorp.com/terraform/cli/commands/output

## Issues Found
- The post said Terragrunt supports all Terraform module source types plus extras. Terragrunt uses Terraform-style source syntax for local paths, Git URLs, and archives, but registry modules use Terragrunt's `tfr` protocol. Updated the wording to distinguish registry module sources.
- The post said Git references are slow because Terragrunt downloads the source every time. Terragrunt uses `.terragrunt-cache`, so the stronger claim was inaccurate. Updated the wording to say Git references can slow iteration and may require refreshing the cached copy.
- The parent `inputs` merge example omitted `merge_strategy = "deep"`, even though Terragrunt's default include merge strategy is shallow. Added `merge_strategy = "deep"` and updated the explanatory sentence.
- The multiple include composition examples also relied on inherited `inputs` being merged. Added `merge_strategy = "deep"` to the root and shared template includes.
- The dependency ordering statement was too broad. Clarified that Terragrunt uses dependency ordering when running commands across multiple modules.
- The post used the deprecated `run-all` command wording. Updated the example and text to the current `terragrunt run --all plan` form.

## Review Notes
The HCL snippets are illustrative and assume the referenced Terraform modules define matching variables and outputs. Local Terraform, OpenTofu, and Terragrunt binaries were not installed in the review environment, so command behavior was verified against official documentation rather than local CLI execution.
