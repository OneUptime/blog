# Validation Summary: How to Plan Large-Scale Terraform Migrations

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform workspaces
- Terraform remote and local backends
- HCP Terraform
- AWS S3 state backup examples
- CI/CD migration workflows

## Sources Consulted
- Terraform CLI state commands: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform CLI `state mv` command: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform CLI `state pull` command: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform CLI `plan` command and `-detailed-exitcode`: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `init` command and `-upgrade`: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/block/moved

## Issues Found
- The migration script used `terraform -chdir="$SOURCE_DIR" state mv -state-out="$TARGET_DIR/terraform.tfstate"` while describing a general state-file migration. Terraform documents `-state` and `-state-out` as legacy options for local state movement only, and `-chdir` would make a relative target path resolve from the source directory. Updated the script to explicitly accept source and target local state file paths and pass both `-state` and `-state-out` to `terraform state mv`.
- Updated the example invocation from directory arguments to explicit local state file arguments: `source/terraform.tfstate` and `target/terraform.tfstate`.

## Review Notes
- Terraform was not installed in the review environment, so validation was documentation-based rather than local CLI-based.
- The verification script correctly treats `terraform plan -detailed-exitcode` exit code 2 as a failed clean-plan check because the script is verifying that no changes are present.
- For remote backends such as HCP Terraform, cross-state moves require a backend-specific migration workflow; the corrected script is intentionally scoped to local state files because Terraform's `-state-out` option is documented for local state movement only.
