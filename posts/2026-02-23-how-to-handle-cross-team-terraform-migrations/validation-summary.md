# Validation Summary: How to Handle Cross-Team Terraform Migrations

## Status
validated

## Post Type
Guide (mix of process/governance documentation and technical implementation)

## Technologies Covered
- Terraform (state management, `terraform state mv`, `terraform plan -detailed-exitcode`, `-chdir` flag)
- `terraform_remote_state` data source
- AWS provider (aws_instance, S3 backend)
- Bash scripting

## Sources Consulted
- Terraform CLI `state mv` documentation: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform CLI `state pull` documentation: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform CLI `plan` documentation (especially `-detailed-exitcode` semantics: 0 = no changes, 1 = error, 2 = changes present): https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `-chdir` global option: https://developer.hashicorp.com/terraform/cli/commands#switching-working-directory-with-chdir
- `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data

## Issues Found
1. **Incorrect exit code check in `state-handoff.sh`** (originally `if [ $SOURCE_EXIT -le 2 ] && [ $TARGET_EXIT -le 2 ]`). Because `terraform plan -detailed-exitcode` returns 1 on error, `-le 2` matched the error case as well, so a failed plan would have been reported as "Handoff successful." Fixed to explicitly accept only the two valid success codes (0 and 2) and treat anything else (including 1 = error) as a failure: `if { [ $SOURCE_EXIT -eq 0 ] || [ $SOURCE_EXIT -eq 2 ]; } && { [ $TARGET_EXIT -eq 0 ] || [ $TARGET_EXIT -eq 2 ]; }; then`.

## Review Notes
- The `terraform state mv -state-out=...` approach in the handoff script implicitly assumes both source and target configurations use **local** state. Per the official docs, `-state` and `-state-out` only apply when the backend in use is local; with remote backends (S3, Terraform Cloud, etc.) this approach will not work directly and would need a pull/manipulate/push flow instead. The post does not call this out, but the script as written is syntactically valid Terraform CLI usage for the local-state case.
- The script uses `cd $TARGET_DIR` without quoting; safe for the example values shown but would break on paths containing spaces. Not changed since it is illustrative.
- `terraform_remote_state` is still supported but HashiCorp generally recommends explicit input variables / data sources where possible to avoid tight coupling between states. Not corrected — the post explicitly presents it as one option among two.
- `private_subnet_ids["us-east-1a"]` assumes the module outputs a map keyed by AZ; this matches the example output declaration above it and is internally consistent.
- The `-chdir` flag is available from Terraform 0.14+ and is current.
- The `verify-all-teams.sh` script handles `terraform plan -detailed-exitcode` correctly via its `case` statement (treating 0 as pass, 2 as warn, anything else as fail).
