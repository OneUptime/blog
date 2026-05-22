# Validation Summary: How to Handle Terraform CI/CD Pipeline Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, state locking, force-unlock, parallelism, targeted apply, plan JSON)
- GitHub Actions (workflow_dispatch, workflow commands, $GITHUB_OUTPUT, actions/checkout@v4, actions/github-script@v7)
- hashicorp/setup-terraform@v3
- aws-actions/configure-aws-credentials@v4
- AWS Provider for Terraform (retry_mode, max_retries)
- Bash scripting (grep classification, retry loops, timeout command)
- jq (for parsing terraform plan JSON output)
- Slack webhooks

## Sources Consulted
- Terraform `force-unlock` command docs: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform AWS Provider docs (retry_mode / max_retries): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/index.html.markdown
- Terraform CLI flags: `-parallelism`, `-lock-timeout`, `-target`, `-auto-approve`, `-no-color`
- GitHub Actions documentation for workflow_dispatch inputs with `type: choice`, `$GITHUB_OUTPUT`, and workflow commands (`::error::`)
- actions/github-script v7 (release tag exists)
- hashicorp/setup-terraform v3 (release tag exists)
- aws-actions/configure-aws-credentials v4 (release tag exists)

## Issues Found

1. **Incorrect use of `terraform force-unlock` to "get lock info"** (Handling State Lock Failures section).

   The original code ran `terraform force-unlock -force` without a LOCK_ID argument and assigned its output to a `LOCK_INFO` variable. According to the official Terraform documentation, `force-unlock` syntax is `terraform force-unlock [options] LOCK_ID` — LOCK_ID is a required positional argument. Without it the command fails with a usage error and produces no useful lock info. Additionally, `force-unlock` does not display lock metadata; its purpose is to *release* a lock, not inspect it.

   **Fix:** Replaced the broken `force-unlock` call with capturing the plan command's stderr/stdout and grepping the `Error acquiring the state lock` block from it. The Terraform plan/apply error output already contains Lock ID, Who, Created, Info, and Path fields, so this gives the operator the lock metadata they actually need. The retry-after-sleep behavior was preserved.

## Review Notes
- `retry_mode = "adaptive"` is a valid AWS provider value (accepted values are `standard` and `adaptive`). `max_retries = 10` is also valid (the provider default is 25; lowering it is a deliberate choice).
- `terraform_version: 1.7.0` in the recovery workflow is a real released version (January 2024). It is functional but somewhat dated by the post's publication window — readers may want to pin to a newer 1.x release.
- The `grep -c "will be" recovery-plan-output.txt || echo 0` pattern is slightly redundant (`grep -c` always prints a count even when it returns exit code 1 on no matches), but it does not break the script and `$REMAINING` is only used in an informational `echo`.
- `terraform apply -parallelism=5` is a real flag; default parallelism is 10.
- The `::error::FAILURE_TYPE=...` GitHub Actions workflow command is syntactically valid; it emits the string as an error annotation. It is not a structured key/value setter (that purpose is served by the separate `$GITHUB_OUTPUT` writes the script also performs).
- The `timeout 3600` GNU coreutils command returning exit code 124 on timeout is correct.
