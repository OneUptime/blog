# Validation Summary: How to Use DRY Configuration Patterns with Terragrunt and OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terragrunt
- OpenTofu
- AWS S3 remote state
- AWS provider for OpenTofu/Terraform
- HCL
- YAML

## Sources Consulted
- Terragrunt Includes: https://docs.terragrunt.com/features/units/includes/
- Terragrunt HCL Blocks Reference: https://docs.terragrunt.com/reference/hcl/blocks
- Terragrunt HCL Functions Reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt HCL Attributes Reference: https://docs.terragrunt.com/reference/hcl/attributes
- Terragrunt migration guide for root config naming: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- OpenTofu S3 backend reference: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu provider requirements reference: https://opentofu.org/docs/language/providers/requirements/
- HashiCorp Developer tutorial covering AWS `default_tags`: https://developer.hashicorp.com/terraform/tutorials/configuration-language/configure-providers

## Issues Found
- The post used the older root `terragrunt.hcl` pattern and an implicit `find_in_parent_folders()` include. I updated the examples and layout to use `root.hcl` plus `find_in_parent_folders("root.hcl")`, which matches Terragrunt's current recommended pattern and avoids the deprecated root-`terragrunt.hcl` convention.
- The generated provider example referenced `local.env_vars.environment` without defining `env_vars` in the root locals block. I added `env_vars = yamldecode(file(find_in_parent_folders("env_vars.yaml")))` so the generated provider snippet resolves correctly when included from child configs.
- The post described backend duplication and propagation in terms of generic "modules", which is inaccurate for reusable child modules because backend configuration belongs in root modules / Terragrunt units. I corrected those references and aligned the directory layout with the examples by renaming the root file to `root.hcl` and adding the missing `prod/eks/terragrunt.hcl` entry.

## Review Notes
- `terraform_binary = "tofu"` is still valid, but on current Terragrunt releases it is redundant because `tofu` is already the default binary.
- `dynamodb_table` remains a valid S3 backend locking option in OpenTofu. Newer OpenTofu versions also support `use_lockfile = true` for native S3 locking, but the post's current example is still technically correct.
