# Validation Summary: How to Use Terragrunt Functions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terragrunt
- Terraform / OpenTofu
- HCL
- Infrastructure as Code
- AWS CLI examples

## Sources Consulted
- Terragrunt official HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt official HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- OneUptime internal linked blog URLs, checked with HTTP 200 responses

## Issues Found
- Corrected the `path_relative_from_include()` description and example comment. The function returns the relative path from the current Terragrunt configuration back to the included configuration, not from the included configuration to the current one.
- Corrected the `run_cmd` performance warning. Terragrunt caches `run_cmd` results by default for the same directory and command; commands only bypass that cache when using options such as `--terragrunt-no-cache` or when the command/cache key changes.

## Review Notes
The examples use current Terragrunt HCL blocks and functions, including `include`, `remote_state`, `terraform.extra_arguments`, `generate`, `before_hook`, `read_terragrunt_config`, `get_env`, `get_repo_root`, `get_parent_terragrunt_dir`, and `run_cmd`. The official documentation also notes that `path_relative_to_include()` and `path_relative_from_include()` require an include block name when used in a child config that has multiple include blocks; the post's examples either use these functions from parent/root context or do not depend on multiple includes.
