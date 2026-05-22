# Validation Summary: How to Use the terraform Block in Terragrunt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform
- HCL
- Terraform modules
- Terraform CLI arguments and hooks

## Sources Consulted
- Terragrunt HCL `terraform` block reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt Extra Arguments documentation: https://docs.terragrunt.com/features/units/extra-arguments/
- Terragrunt Hooks documentation: https://docs.terragrunt.com/features/hooks/
- Terragrunt Includes documentation: https://docs.terragrunt.com/features/units/includes/
- Terraform module source documentation: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI commands documentation: https://developer.hashicorp.com/terraform/cli/commands

## Issues Found
- The `after_hook "save_plan"` example copied `tfplan`, but the preceding `plan` command did not create that file. Added an `extra_arguments "save_plan"` block with `arguments = ["-out=tfplan"]` because Terraform only writes a saved plan file when `-out=FILENAME` is used.
- The `include_in_copy` section described copying additional files from parent directories. Updated it to match Terragrunt's documented behavior: it controls files copied from the Terragrunt working directory into the working directory under `.terragrunt-cache`, commonly for hidden or otherwise excluded files.
- The child-module inheritance example said the child's `terraform` block merges with the root's, but the shown `include` block used Terragrunt's default shallow merge. Added `merge_strategy = "deep"` and clarified the explanation.
- The practical example included `push` and `refresh` in command lists. Removed them from the example command arrays to avoid recommending outdated or non-routine Terraform subcommands in current configurations.

## Review Notes
The remaining examples match Terragrunt's documented `terraform` block shape, `source` formats, `extra_arguments`, hooks, registry `tfr:///` shorthand, and Terraform CLI flags. The registry example uses Terragrunt's registry protocol rather than Terraform's native module source syntax, which is correct for Terragrunt.
