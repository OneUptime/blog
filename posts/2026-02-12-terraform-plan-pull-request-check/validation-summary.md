# Validation Summary: How to Run Terraform Plan as a Pull Request Check

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI
- Terraform output sensitivity
- AWS IAM OIDC federation
- GitHub Actions workflows
- GitHub Actions permissions, path filters, artifacts, and concurrency
- hashicorp/setup-terraform
- aws-actions/configure-aws-credentials
- actions/checkout
- actions/github-script
- actions/upload-artifact
- Infracost
- Slack GitHub Action

## Sources Consulted
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform output values and sensitive outputs: https://developer.hashicorp.com/terraform/tutorials/configuration-language/outputs
- hashicorp/setup-terraform README: https://github.com/hashicorp/setup-terraform
- aws-actions/configure-aws-credentials README: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout README: https://github.com/actions/checkout
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- actions/github-script README/releases: https://github.com/actions/github-script
- Infracost GitHub Actions documentation: https://www.infracost.io/docs/integrations/github_actions/
- Slack GitHub Action documentation: https://docs.slack.dev/tools/slack-github-action/sending-data-slack-incoming-webhook/

## Issues Found
- The primary workflow used older action versions and pinned Terraform 1.7.0. Updated the examples to current documented action versions and Terraform 1.14.6.
- The multiple-directory workflow used `git diff origin/main...HEAD` after a default checkout, but `actions/checkout` fetches one commit by default. Added `fetch-depth: 0` so the base branch reference is available.
- The changed-directory command used `xargs` without `-r`, which can run `dirname` with no input on Ubuntu when no Terraform files match. Added `xargs -r`.
- The plan-artifact section claimed applying a saved plan removes drift. Reworded it to apply only to trusted internal PRs and to require verification that the plan matches the intended commit and state.
- The sensitive-output section implied `sensitive = true` broadly prevents secrets from appearing in plans. Narrowed the wording to sensitive output values.
- The sanitize-output example wrote a multi-line value to `$GITHUB_OUTPUT` with single-line syntax and embedded the plan directly in shell. Updated it to pass the plan through an environment variable and write a proper multi-line output.
- The Slack notification example used `slackapi/slack-github-action@v1` and the older webhook configuration. Updated it to the current v3 incoming-webhook syntax.

## Review Notes
The Infracost snippet still uses a compact illustrative flow. Current Infracost documentation recommends the GitHub App where possible or `infracost ci setup --ci-pipeline` to generate a full workflow for CI integration.
