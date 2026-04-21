# Validation Summary: How to Use Terragrunt inputs for Variable Passing with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terragrunt
- OpenTofu
- HCL configuration
- OpenTofu input variables

## Sources Consulted
- Terragrunt HCL attributes documentation: https://docs.terragrunt.com/reference/hcl/attributes/#inputs
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/#include
- Terragrunt dependency block documentation: https://docs.terragrunt.com/reference/hcl/blocks/#dependency
- Terragrunt HCL functions documentation: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt root `terragrunt.hcl` migration guidance: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu `file` function documentation: https://opentofu.org/docs/language/functions/file/
- OpenTofu `jsondecode` function documentation: https://opentofu.org/docs/language/functions/jsondecode/

## Issues Found
- The post described `inputs` as a block. Terragrunt documents `inputs` as an attribute whose map entries are passed to OpenTofu/Terraform via `TF_VAR_*` environment variables. Updated the description, introduction, and section heading to use "attribute."
- The examples used `find_in_parent_folders()` with no filename for the root include. Terragrunt now recommends naming the root configuration something like `root.hcl` and calling `find_in_parent_folders("root.hcl")`. Updated the root include examples and the `_envcommon` path lookup accordingly.

## Review Notes
The remaining examples use supported Terragrunt patterns: `dependency.<name>.outputs`, exposed includes, `merge()`, `read_terragrunt_config()`, `get_env()`, `get_terragrunt_dir()`, `file()`, and `jsondecode()`. Local CLI validation was not run because `terragrunt`, `tofu`, and `terraform` are not installed in this workspace.
