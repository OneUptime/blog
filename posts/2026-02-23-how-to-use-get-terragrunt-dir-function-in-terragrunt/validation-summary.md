# Validation Summary: How to Use the get_terragrunt_dir Function in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform / OpenTofu
- HCL
- Infrastructure as Code

## Sources Consulted
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt render command reference: https://docs.terragrunt.com/reference/cli/commands/render/
- Terragrunt migration guide for root terragrunt.hcl: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- Linked OneUptime Terragrunt functions article: https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-functions/view

## Issues Found
- Updated references to a root `terragrunt.hcl` file to use `root.hcl` and updated `find_in_parent_folders()` to `find_in_parent_folders("root.hcl")`. Current Terragrunt documentation recommends renaming shared root configuration files to `root.hcl`; root `terragrunt.hcl` remains supported for now but emits warnings and may become an error in a future major version.
- Replaced the debugging command `terragrunt render-json | jq '.locals'` with `terragrunt render --json | jq '.locals'`. Current Terragrunt CLI documentation uses the `render` command with JSON output flags.
- Generalized the opening definition from "current `terragrunt.hcl` file" to "current Terragrunt configuration file" so it remains accurate for included root files named `root.hcl`.

## Review Notes
The remaining Terragrunt examples use valid HCL blocks and arguments according to current Terragrunt documentation, including `terraform`, `extra_arguments`, `optional_var_files`, `before_hook`, `generate`, `locals`, and `inputs`. The linked OneUptime article is reachable.
