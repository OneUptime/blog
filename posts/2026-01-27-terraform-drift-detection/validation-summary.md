# Validation Summary: How to Detect Drift in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, HCL, state management)
- Terraform Cloud
- GitHub Actions (CI/CD workflows)
- AWS (EC2, IAM, AWS Config, SNS)
- Bash scripting
- Python (boto3, subprocess)
- driftctl
- Slack GitHub Action

## Sources Consulted
- Terraform CLI plan command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `-detailed-exitcode` flag documentation: https://developer.hashicorp.com/terraform/cli/commands/plan#detailed-exitcode
- Terraform refresh command: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform `apply -refresh-only` documentation: https://developer.hashicorp.com/terraform/cli/commands/apply#refresh-only
- Terraform machine-readable UI (JSON output): https://developer.hashicorp.com/terraform/internals/machine-readable-ui
- Terraform Cloud block documentation: https://developer.hashicorp.com/terraform/cli/cloud/settings
- Terraform lifecycle meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform import command: https://developer.hashicorp.com/terraform/cli/commands/import
- GitHub Actions docs: https://docs.github.com/en/actions
- hashicorp/setup-terraform action: https://github.com/hashicorp/setup-terraform
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials
- AWS Config managed rule REQUIRED_TAGS: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS IAM PrincipalTag condition key: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-principaltag
- driftctl (archived) repository: https://github.com/snyk/driftctl

## Issues Found
- **Python custom drift reporter check was incorrect.** The code used `'planned_change' in data` to detect planned change events in Terraform's JSON output. Terraform's machine-readable UI emits planned change events with a top-level `type: "planned_change"` field, not a key named `planned_change`. The check would never match real Terraform JSON output. Fixed by changing the condition to `data.get('type') == 'planned_change'`.

## Review Notes
- `terraform refresh` is marked deprecated in Terraform 0.15.4+ in favor of `terraform apply -refresh-only`. The post does include the modern `apply -refresh-only` alternative under "Option 3: Refresh State Only", so the legacy `terraform refresh` reference is acceptable as a known command users may still encounter.
- `slackapi/slack-github-action@v1` is older — v2 has been the current major version since mid-2024 and uses a different input/env interface. v1 still works, so the example is not incorrect, but readers building new workflows may want to consult the v2 docs.
- driftctl is correctly noted as deprecated/archived (the project was archived by Snyk).
- The GitHub Actions versions referenced (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`, `aws-actions/configure-aws-credentials@v4`) are current.
- The `terraform { cloud { ... } }` block syntax is the current standard for Terraform Cloud / HCP Terraform integration.
- The bash drift report script correctly handles `set -e` interaction with the `|| EXIT_CODE=$?` pattern (commands on the left of `||` are exempt from `set -e`).
