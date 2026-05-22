# Validation Summary: How to Handle State Files in Mono-Repo Terraform Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (S3 backend, partial backend configuration, `terraform_remote_state` data source, modules)
- AWS S3 and DynamoDB (for state storage and state locking)
- Terragrunt (terragrunt.hcl, `find_in_parent_folders()`)
- GitHub Actions (workflow YAML, matrix strategy, `actions/checkout@v4`, `hashicorp/setup-terraform@v3`)
- GNU Make (Makefile patterns)
- Bash (shell scripts, `set -euo pipefail`, `cd -`)
- jq (JSON manipulation)

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform partial backend configuration: https://developer.hashicorp.com/terraform/language/backend#partial-configuration
- Terraform `terraform_remote_state` data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terragrunt documentation: https://terragrunt.gruntwork.io/docs/reference/built-in-functions/ (for `find_in_parent_folders`)
- GitHub Actions workflow commands (setting outputs): https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-output-parameter
- jq manual: https://jqlang.github.io/jq/manual/ (for `-R`, `-s`, `-c` flags)
- `hashicorp/setup-terraform@v3`: https://github.com/hashicorp/setup-terraform
- `actions/checkout@v4`: https://github.com/actions/checkout

## Issues Found

**1. `jq` output not compact, breaking `$GITHUB_OUTPUT` assignment**

In the CI/CD GitHub Actions section, the script used:
```bash
jq -R -s 'split("\n") | map(select(length > 0))'
```

Without the `-c` (compact) flag, `jq` produces multi-line pretty-printed JSON. Assigning a multi-line value to `$GITHUB_OUTPUT` via `echo "components=$changed" >> $GITHUB_OUTPUT` is malformed — GitHub Actions requires either a single-line `name=value` or a heredoc-style delimiter (`name<<EOF ... EOF`). As written, the matrix expansion in the downstream `plan` job would fail.

**Fix:** Added the `-c` flag to produce single-line JSON output, which works correctly with the simple `echo` assignment to `$GITHUB_OUTPUT`.

## Review Notes

- The S3 backend attributes (`bucket`, `key`, `region`, `encrypt`, `dynamodb_table`) are all valid. Note that as of Terraform 1.10 (November 2024), the S3 backend supports native state locking via `use_lockfile = true`, and `dynamodb_table` is being deprecated in newer versions. The post's use of `dynamodb_table` is still functional and widely deployed, but readers using newer Terraform versions may prefer the native locking approach. This was not changed because the post does not claim a specific Terraform version and DynamoDB-based locking remains supported and common.
- The `cd -` pattern in `apply-environment.sh` works correctly across loop iterations because `cd -` returns to the previous directory (the loop's starting directory), not the immediately preceding path component.
- The relative path `../../backend-config/$ENV.hcl` from `environments/$ENV/$COMP/` correctly resolves to `environments/backend-config/$ENV.hcl`, consistent with the Makefile's `BACKEND_CONFIG = environments/backend-config/$(ENV).hcl`.
- The `git diff --name-only origin/main...HEAD` triple-dot notation is correct for PR-style diffs (uses the merge base as the comparison point).
- The helper module pattern that re-exports `outputs` works correctly because module outputs can be arbitrary types, including the full outputs map from a remote state data source.
