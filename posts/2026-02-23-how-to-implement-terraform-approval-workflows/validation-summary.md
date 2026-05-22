# Validation Summary: How to Implement Terraform Approval Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform plan JSON output
- GitHub Actions
- GitHub REST API for pull request reviews
- actions/github-script
- Python
- Slack incoming webhooks and Block Kit

## Sources Consulted
- HashiCorp Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Terraform create plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub REST API pull request reviews documentation: https://docs.github.com/en/rest/pulls/reviews
- actions/github-script documentation: https://github.com/actions/github-script
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks
- Slack Block Kit documentation: https://api.slack.com/block-kit
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The Terraform plan step used `terraform plan -out=tfplan -json > plan.json`, but the workflow only needed a saved plan and `terraform show -json` output. Changed it to `terraform plan -out=tfplan` followed by `terraform show -json tfplan > plan-details.json` to match Terraform's documented saved-plan JSON workflow.
- The risk classification script used the deprecated GitHub Actions `::set-output` command. Replaced it with writing `risk_level` to `$GITHUB_OUTPUT`, with a local fallback print.
- The GitHub Actions workflow loaded `plan-summary.json`, but the Python classifier never created that file. Updated the classifier to write the add/change/destroy counts to `plan-summary.json`.
- The GitHub comment step did not await the `github.rest.issues.createComment` API call and did not declare the token permissions needed for checkout, PR review reads, and issue comments. Added `await` and explicit workflow permissions.
- The Slack example attempted to override the destination channel by passing `"channel"` to an incoming webhook. Slack's current incoming webhook documentation states that webhook URLs are tied to their configured channel. Updated the example to accept a webhook URL per approver destination and removed the dynamic channel override.
- The Slack example used interactive buttons but described the script as waiting for responses. Adjusted the comment to clarify that button responses must be handled through Slack interactivity.
- The approval manager used `datetime.utcnow()`, which is deprecated in current Python documentation. Replaced it with timezone-aware `datetime.now(UTC)` usage.
- The emergency apply workflow ran `terraform apply -auto-approve` without first initializing Terraform and referenced `$SLACK_WEBHOOK` without showing how it was supplied. Added `terraform init` and mapped `SLACK_WEBHOOK` from GitHub Actions secrets.

## Review Notes
- Terraform is not installed in the local review environment, so command validation was performed against official HashiCorp Terraform documentation rather than local `terraform --help` output.
- The approval logic remains an illustrative example. A production implementation should also validate approver identity and apply branch protection or GitHub environment protection rules where appropriate.
