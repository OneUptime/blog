# Validation Summary: How to Handle Terragrunt Module Versioning

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform module sources
- Terragrunt `terraform` block and `source` attribute
- Terragrunt built-in functions
- Git tags, branches, and commit refs
- Terraform provider dependency lock files

## Sources Consulted
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform module sources guide: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt lock file handling documentation: https://docs.terragrunt.com/reference/lock-files/
- Git `tag` documentation: https://git-scm.com/docs/git-tag

## Issues Found
- The post described Git tags as immutable references for production. Git tags are refs and can be replaced or deleted unless protected, so I changed the wording to "stable release tag" and added a note to protect release tags in the Git host.
- The provider lock-file example said to regenerate the lock file after changing the module version. Terraform's `.terraform.lock.hcl` tracks provider selections, not Terragrunt Git module refs, so I clarified that `terragrunt init -upgrade` is appropriate when a module upgrade changes provider constraints.

## Review Notes
The Terragrunt `source` examples, Git `ref` usage, subdirectory `//` syntax, `read_terragrunt_config`, `find_in_parent_folders`, and `get_repo_root()` usage are consistent with the referenced documentation. The drift-detection shell script is a simple illustrative GNU-style script; teams using macOS/BSD tools may need to replace `grep -P`.
