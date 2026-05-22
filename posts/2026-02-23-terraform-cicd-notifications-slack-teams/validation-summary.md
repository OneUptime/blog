# Validation Summary: How to Set Up Terraform CI/CD Notifications (Slack Teams)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI
- GitHub Actions
- Slack incoming webhooks and Block Kit
- Microsoft Teams incoming webhooks
- Adaptive Cards
- Bash and jq

## Sources Consulted
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- HashiCorp `setup-terraform` GitHub Action documentation: https://github.com/marketplace/actions/hashicorp-setup-terraform
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions expressions and status check functions: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Actions workflow commands and environment files: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- Slack incoming webhook documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack Block Kit reference: https://docs.slack.dev/reference/block-kit/
- Microsoft Teams incoming webhook documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Adaptive Cards `Action.OpenUrl` schema reference: https://adaptivecards.io/explorer/action.openurl.html
- Adaptive Cards `TextBlock` schema reference: https://learn.microsoft.com/en-us/adaptive-cards/schema-explorer/text-block

## Issues Found
- The Terraform plan and drift examples captured `PIPESTATUS[0]` but did not fail the job when `terraform plan -detailed-exitcode` returned `1`. Updated both snippets to exit on Terraform errors while preserving the `2` status for detected changes.
- The Terraform apply example piped `terraform apply` through `tee` without exiting with Terraform's captured status, so apply failures could be reported as successful steps. Updated it to capture `PIPESTATUS[0]`, write the summary, and exit with the Terraform apply status.
- The Terraform commands were intended for CI/CD but omitted `-input=false`. Added it to `terraform init`, `terraform plan`, and `terraform apply` commands to avoid interactive prompts in automation.
- The Slack failure payload interpolated multiline error output directly into JSON, which could produce invalid JSON. Reworked it to build the payload with `jq`.
- The Slack PR plan payload interpolated the PR title directly into JSON. Reworked it to pass the title through an environment variable and build the JSON with `jq`, avoiding breakage from quotes or newlines in valid PR titles.
- The Microsoft Teams section said it used Adaptive Cards but showed a legacy MessageCard payload. Replaced it with the current Teams incoming webhook Adaptive Card envelope using `type: "message"` and `application/vnd.microsoft.card.adaptive`.
- The Teams example included a shell comparison using single quotes around `$STATUS`, which would compare the literal string instead of the variable. The replacement Adaptive Card example uses the existing `COLOR` variable directly.
- The examples used `hashicorp/setup-terraform@v3`; updated them to `@v4`, which is the current documented major version.
- The notification-noise example claimed to suppress formatting-only changes but actually suppressed Terraform-only changes. Updated it to suppress documentation-only changes instead.

## Review Notes
The remaining Slack examples use direct JSON strings only for stable values such as generated URLs, actors, and Terraform summary lines. For production workflows that include arbitrary user-controlled text in any notification field, building all payloads with a JSON-aware tool such as `jq` is safer.
