# Validation Summary: How to Use the path_relative_from_include Function in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform / OpenTofu
- HCL configuration
- Infrastructure as Code path resolution

## Sources Consulted
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt render command reference: https://docs.terragrunt.com/reference/cli/commands/render/

## Issues Found
- The opening example contained a contradictory clarification about `path_relative_from_include()` evaluation. I removed the inaccurate sentence and kept the correct parent-to-child / child-to-parent definitions, matching the Terragrunt functions reference.
- The shared module source explanation said `../../modules/vpc` would resolve to `project/modules/vpc` from `live/dev/vpc/`, but the actual resolved relative path is `../../../modules/vpc`. I corrected the text.
- The variable-file and hook examples used only `path_relative_from_include()` for file paths that may be evaluated while Terraform or hooks run from a module working directory. I updated those examples to anchor paths with `get_terragrunt_dir()` before applying `path_relative_from_include()`, consistent with Terragrunt's documented guidance for paths that must resolve outside `.terragrunt-cache`.
- The examples for copying shared Terraform files and a shared lockfile used `include_in_copy` for files located beside the root config. Terragrunt documents `include_in_copy` as copy-pattern configuration for the source/copy process, so I replaced those snippets with documented `init-from-module` hooks that copy from the root-derived path into `get_working_dir()`.
- The multiple-includes section implied the function automatically selected include context. Terragrunt documents that named includes require passing the include name when the function is used from a child config, so I updated the example to call `path_relative_from_include("root")`, `path_relative_from_include("region")`, and `path_relative_from_include("env")`.
- The debugging section used `terragrunt render-json`, which is deprecated in favor of `terragrunt render --format json`. I updated the command.

## Review Notes
Terragrunt was not installed in the local environment, so examples were reviewed against the current official Terragrunt documentation rather than executed locally.
