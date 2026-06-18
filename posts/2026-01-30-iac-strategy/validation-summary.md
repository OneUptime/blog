# Validation Summary: How to Build IaC Strategy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Infrastructure as Code
- Terraform
- OpenTofu
- Pulumi
- AWS CDK
- Crossplane
- GitHub Actions
- TFLint
- tfsec
- Infracost
- AWS S3 backend and Secrets Manager
- Open Policy Agent and Rego
- Terraform Test
- Terratest
- terraform-docs
- Slack GitHub Action

## Sources Consulted
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform test documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform validate command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform fmt command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- HashiCorp setup-terraform action: https://github.com/hashicorp/setup-terraform
- TFLint setup action: https://github.com/terraform-linters/setup-tflint
- Aqua Security tfsec action: https://github.com/aquasecurity/tfsec-action
- Infracost GitHub Actions documentation: https://github.com/infracost/actions
- Open Policy Agent Terraform documentation: https://openpolicyagent.org/docs/terraform
- Open Policy Agent Rego v1 upgrade documentation: https://openpolicyagent.org/docs/v0-upgrade
- Open Policy Agent `if` keyword reference: https://openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent `contains` keyword reference: https://openpolicyagent.org/docs/policy-reference/keywords/contains
- Slack GitHub Action documentation: https://github.com/slackapi/slack-github-action
- Terratest Terraform module documentation: https://terratest.gruntwork.io/docs/getting-started/quick-start/
- terraform-docs documentation: https://terraform-docs.io/

## Issues Found
- The Terraform S3 backend example used `dynamodb_table` for state locking. Current Terraform documentation marks DynamoDB-based S3 backend locking as deprecated, so the example now uses `use_lockfile = true`.
- The reusable module environment validation allowed only `dev`, `staging`, and `production`, but later Terraform Test and Terratest examples used `environment = "test"`. The validation description, allowed values, and error message now include `test`.
- The sensitive variable comment said `sensitive = true` prevents values from appearing in logs. Terraform redacts sensitive values from CLI output, but sensitive values can still exist in state, so the comment now makes that caveat explicit.
- The OPA policy used legacy Rego multi-value rule syntax, `deny[msg]`, which is not valid under default OPA v1 syntax. The policy now uses `deny contains msg if { ... }`.
- The runbook template had malformed nested Markdown code fences. The outer Markdown example now uses four-backtick fences and the inner Bash blocks close correctly.
- The drift detection workflow checked `steps.plan.outputs.exitcode`, but the shell step did not write that output and the pipeline through `tee` would otherwise hide Terraform's detailed exit code. The workflow now captures `${PIPESTATUS[0]}`, writes it to `$GITHUB_OUTPUT`, and fails only on Terraform exit code 1.

## Review Notes
- The Infracost example uses `infracost/actions/setup@v3`, which the Infracost repository describes as legacy. It is still documented, but new CI integrations should consider the newer `diff` and `scan` actions.
- The tfsec action remains available, but tfsec is now part of Trivy. Future updates could consider migrating the security scan example to Trivy.
- The related OneUptime links were checked and returned HTTP 200.
