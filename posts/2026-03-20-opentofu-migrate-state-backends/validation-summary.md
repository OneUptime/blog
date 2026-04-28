# Validation Summary: How to Migrate State Between Backends in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (CLI: `tofu init`, `tofu state pull/push/mv/list`, `tofu plan`)
- Terraform-compatible HCL backend configuration
- S3 backend (with DynamoDB-based state locking)
- GCS backend
- AWS CLI (`aws s3 ls`)
- jq (for state file inspection)

## Sources Consulted
- OpenTofu CLI `state mv` command: https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu CLI `init` command (incl. `-migrate-state` and `-reconfigure`): https://opentofu.org/docs/cli/commands/init/
- OpenTofu S3 backend reference: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu GCS backend reference: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu state `pull` / `push` commands: https://opentofu.org/docs/cli/commands/state/pull/ and https://opentofu.org/docs/cli/commands/state/push/

## Issues Found
- **`tofu state mv` missing DESTINATION argument (Splitting State During Migration).** The original example invoked `tofu state mv -state=../full-state.json -state-out=terraform.tfstate module.vpc` with only one address. `tofu state mv` requires both SOURCE and DESTINATION (see OpenTofu docs); invoking it with a single address fails with "Error: Unexpected number of arguments". Fixed by passing the destination address (`module.vpc module.vpc`) so the resource keeps the same address in the new state file.

## Review Notes
- All other commands and flags (`tofu init -migrate-state`, `tofu init -reconfigure`, `tofu state pull`, `tofu state push`, `tofu state list`, `tofu plan`) are valid and current.
- The S3 backend block (with `bucket`, `key`, `region`, `encrypt`, `dynamodb_table`) and the GCS backend block (with `bucket`, `prefix`) are correct.
- Minor stylistic note (not corrected — out of scope per review rules): in the "Manual Migration" section, the `OLD_BACKEND_CONFIG="-backend-config=old-backend.hcl"` shell variable is set but never referenced in subsequent commands. It is not technically incorrect — just dead code — so it was left in place to preserve the author's content.
- The interactive prompt shown for `-migrate-state` ("Do you want to copy existing state to the new backend?") is a faithful paraphrase of OpenTofu's actual prompt, which includes additional context lines but matches the question shown.
- The post does not mention the newer S3 native locking option (`use_lockfile = true`), which OpenTofu supports as an alternative to DynamoDB-based locking. The `dynamodb_table` approach used in the post remains valid and supported.
