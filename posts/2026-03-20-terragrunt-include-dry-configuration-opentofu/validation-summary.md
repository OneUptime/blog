# Validation Summary: How to Use Terragrunt include for DRY Configuration with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- OpenTofu
- HCL configuration
- Terragrunt include blocks
- Terragrunt configuration inheritance and merge strategies

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions reference, including `find_in_parent_folders`: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt includes guide: https://docs.terragrunt.com/features/units/includes/
- Terragrunt migration guide for root `terragrunt.hcl`: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- OpenTofu `merge` function reference: https://opentofu.org/docs/language/functions/merge/

## Issues Found
- The introduction said included `locals` are merged into the child config. Terragrunt deliberately omits `locals` from include merge operations, although exposed includes can reference them. Updated the text to distinguish merged settings from exposed locals.
- The post described `find_in_parent_folders()` as searching for a `terragrunt.hcl` without an `include` block. Official Terragrunt docs state that it searches parent folders for the first file with the requested name. Updated the explanation and examples to use `find_in_parent_folders("root.hcl")`.
- The examples used the older root `terragrunt.hcl` pattern through bare `find_in_parent_folders()`. Terragrunt now recommends naming shared root configuration `root.hcl` and passing that name explicitly. Updated root include paths and related `_envcommon` paths.
- The merge strategy section used invalid/outdated strategy names: `shallow_merge`, `deep_merge`, and `deep_merge_map_only`. Current Terragrunt merge strategies are `no_merge`, `shallow`, and `deep`. Updated the example and strategy list.

## Review Notes
The remaining examples are illustrative and assume supporting files such as `env.hcl`, `_envcommon/*.hcl`, and OpenTofu modules define the referenced variables and inputs. No terminal commands were present to validate.
