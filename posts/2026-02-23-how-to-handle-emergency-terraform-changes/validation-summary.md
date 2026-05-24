# Validation Summary: How to Handle Emergency Terraform Changes

## Status
validated

## Post Type
Guide / Tutorial — describes procedures and scripts for handling emergency Terraform infrastructure changes during production incidents.

## Technologies Covered
- Terraform (CLI: `-chdir`, `plan -out`, `show -json`, `apply`)
- Bash shell scripting (`set -euo pipefail`, `exec`, `tee`, heredocs)
- jq (JSON parsing of Terraform plan output)
- GitHub Actions (workflow YAML, `actions/checkout@v4`, `hashicorp/setup-terraform@v3`, `actions/github-script@v7`)
- AWS CLI (`cloudwatch get-metric-statistics`)
- Git and GitHub CLI (`gh pr create`)

## Sources Consulted
- Terraform CLI documentation: https://developer.hashicorp.com/terraform/cli/commands/plan, https://developer.hashicorp.com/terraform/cli/commands/show, https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform JSON output format (resource_changes.change.actions values): https://developer.hashicorp.com/terraform/internals/json-format#change-representation
- hashicorp/setup-terraform action README (output wrapper behavior): https://github.com/hashicorp/setup-terraform
- actions/github-script v7 docs: https://github.com/actions/github-script
- GitHub Actions `env:` context for passing data to scripts: https://docs.github.com/en/actions/learn-github-actions/contexts
- AWS CloudWatch metrics for ApplicationELB: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html (HTTPCode_Target_5XX_Count is the documented metric in the AWS/ApplicationELB namespace)
- GitHub CLI `gh pr create` docs (label flag accepts comma-separated values): https://cli.github.com/manual/gh_pr_create
- Bash documentation on `set -euo pipefail` and process substitution

## Issues Found
- **Broken JavaScript template literal in the `Post Plan` GitHub Actions step.** The original code used three literal backticks (` ``` `) directly inside a template literal that is itself delimited by single backticks. The first inner backtick would terminate the template literal, causing a JavaScript syntax error and breaking the workflow. Fixed by introducing a `const fence = '```';` variable (single-quoted, so the backticks are literal characters) and interpolating `${fence}` inside the template literal.
- **`process.env.PLAN_OUTPUT` was referenced but never set.** The workflow used `${process.env.PLAN_OUTPUT}` but never populated that environment variable, so the PR comment would contain the string `undefined`. Fixed by adding `id: plan` to the Terraform Plan step and adding `env: PLAN_OUTPUT: ${{ steps.plan.outputs.stdout }}` to the Post Plan step. The `hashicorp/setup-terraform@v3` action's wrapper script automatically captures the wrapped command's stdout into `steps.<id>.outputs.stdout`, so this is the standard pattern.

## Review Notes
- The jq filter `select(.change.actions | contains(["delete"]))` correctly identifies both pure deletes and replace actions (which Terraform represents as `["delete", "create"]` or `["create", "delete"]` in `change.actions`). This is intentional and appropriate for the safety check.
- The `emergency-apply` job re-runs `terraform plan` implicitly via `terraform apply -auto-approve` (no plan file is passed). In practice, the plan reviewed in `emergency-validate` is not the same plan that gets applied. For a stricter emergency procedure you would persist the plan file as a workflow artifact and apply that exact file, but this is a best-practice improvement rather than a correctness bug — the example as written still works.
- The `-target` flag is alluded to in the safety-check error message but no example shows it being passed via `$EXTRA_ARGS`. This is fine — the script is designed to accept arbitrary extra args.
- All action versions referenced (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`, `actions/github-script@v7`) are current major versions as of the validation date.
- `terraform -chdir=...` syntax is correct (introduced in Terraform 0.14).
- The AWS CloudWatch namespace `AWS/ApplicationELB` and metric `HTTPCode_Target_5XX_Count` are correct for measuring 5xx errors from ALB targets.
