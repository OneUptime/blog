# Validation Summary: How to Use Workspaces for Feature Branch Environments in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (workspaces, CLI)
- HCL / Terraform language (locals, interpolation, `terraform.workspace`, `timeadd`, `timestamp`)
- AWS Provider (`aws_instance`, `aws_db_instance`)
- GitHub Actions (`actions/checkout@v4`, `opentofu/setup-opentofu@v1`, `aws-actions/configure-aws-credentials@v4`, `actions/github-script@v7`)
- Bash scripting (sed, tr, grep, jq, curl)
- Terraform Cloud API (workspaces endpoint, `search[name]` query)

## Sources Consulted
- OpenTofu repository and docs: https://github.com/opentofu/opentofu (workspace CLI in `internal/command/views/workspace.go`; `terraform.workspace` interpolation still documented)
- opentofu/setup-opentofu action: https://github.com/opentofu/setup-opentofu (confirms `cli_config_credentials_token` input)
- OpenTofu `timeadd` / `timestamp` function docs (duration units `ns, us, ms, s, m, h`)
- Terraform AWS provider docs for `aws_db_instance` (`skip_final_snapshot`, `deletion_protection`)
- Terraform Cloud API docs: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces (workspace GET endpoint, `search[name]` query parameter)
- actions/github-script: https://github.com/actions/github-script (v7 uses Node.js, supports `require('child_process')`)
- aws-actions/configure-aws-credentials v4 and actions/checkout v4 documentation

## Issues Found
No technical issues found.

Verification notes:
- `tofu workspace list` output format (asterisk + 1 space for current, 2 spaces for others) matches the `grep "^  feature-"` pattern used in the cleanup script.
- The `branch_to_workspace` sed/tr pipeline traces through correctly for all three examples (including the intentional `feature-feature-...` result when the branch already starts with `feature/`).
- The GitHub Actions destroy job's `tofu workspace select ... || exit 0` pattern correctly short-circuits the run-block when the workspace is absent, without failing the step.
- Terraform Cloud API endpoint and query string URL-encoding (`search%5Bname%5D=feature-`) are correct.

## Review Notes
- `timeadd(timestamp(), ...)` in a tag causes the `MaxAgeDate` tag to change on every plan/apply (since `timestamp()` is re-evaluated each run), producing perpetual drift. It still works as written and is a common pattern, but readers should be aware it will show up in every plan as a tag update.
- The `cleanup-stale-feature-workspaces.sh` script relies on Terraform Cloud for workspace creation timestamps; the same approach won't work unchanged for local or S3 backends (which have no API for creation time). The post implicitly assumes a Terraform Cloud / Enterprise backend.
- `terraform.workspace` continues to work in OpenTofu for backward compatibility; `tofu.workspace` is also available as an OpenTofu-native alternative but is not required.
- The `get_workspace_id` helper in the cleanup script is referenced but not defined — intentional as a placeholder, and flagged here only for completeness.
