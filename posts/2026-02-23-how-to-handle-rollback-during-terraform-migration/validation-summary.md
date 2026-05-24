# Validation Summary: How to Handle Rollback During Terraform Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI: state pull/push/mv/rm, import, init, plan, apply, version)
- AWS CLI (s3api list-object-versions, get-object)
- Azure CLI (az storage blob list, az storage blob copy start)
- Git (checkout, revert, stash, rev-parse)
- Bash scripting

## Sources Consulted
- HashiCorp Terraform CLI docs: `terraform state push` (https://developer.hashicorp.com/terraform/cli/commands/state/push)
- HashiCorp Terraform CLI docs: `terraform state mv`, `state rm`, `import`, `plan -detailed-exitcode`, `init -reconfigure`, `version -json`
- AWS CLI Reference: `aws s3api get-object` and `list-object-versions`
- Azure CLI Reference: `az storage blob copy start` (incl. `--source-snapshot`) and `az storage blob list`
- Git documentation: `git checkout <commit> -- <pathspec>`, `git revert`, `git stash pop`

## Issues Found
- **`terraform state push --partial` does not exist.** The Partial Rollback section recommended `terraform state push --partial wave3-backup.json`, but `terraform state push` always replaces the entire state file atomically. The only supported flags are `-force`, `-ignore-remote-version`, `-lock`, and `-lock-timeout`. Fixed by rewriting the example to use the valid partial-rollback techniques the post already mentions elsewhere: `terraform state mv` to restore moved resources, or `terraform state rm` followed by `terraform import` to fix bad imports. Added an explanatory comment noting why partial pushes are not possible.

## Review Notes
- All other Terraform CLI flags and behaviors verified accurate: `terraform version -json`, `terraform plan -detailed-exitcode` (0=no changes, 1=error, 2=changes), `terraform init -reconfigure`, `terraform state pull/push/mv/rm/list`, `terraform import`.
- AWS CLI `s3api get-object` syntax with output filename as trailing positional argument is correct.
- Azure CLI `az storage blob copy start --source-snapshot` is a valid optional parameter.
- The `cp -r *.tf` in the backup script uses `-r` unnecessarily for regular files, but is harmless and not a technical error.
- The "import blocks can be removed without state changes" comment is broadly correct — once an import block is applied, removing it from configuration does not affect the imported resource's state entry.
