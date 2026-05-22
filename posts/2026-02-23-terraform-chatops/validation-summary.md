# Validation Summary: How to Use Terraform with ChatOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform HCL provider configuration
- Slack slash commands and interactive messages
- Slack Python SDK
- Slack Block Kit
- GitHub Actions
- AWS SNS

## Sources Consulted
- Slack Python SDK SignatureVerifier documentation: https://docs.slack.dev/tools/python-slack-sdk/reference/signature/index.html
- Slack request signing documentation: https://docs.slack.dev/authentication/verifying-requests-from-slack/
- Slack Block Kit button element documentation: https://docs.slack.dev/reference/block-kit/block-elements/button-element/
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform automation guidance: https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform
- Terraform workspace select command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform Registry documentation for pablovarela/slack slack_conversation: https://registry.terraform.io/providers/pablovarela/slack/latest/docs/resources/conversation
- GitHub Actions issue_comment event documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- HashiCorp setup-terraform GitHub Action: https://github.com/hashicorp/setup-terraform
- AWS SNS Subscribe API documentation: https://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html
- AWS SNS HTTP/S endpoint documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-http-https-endpoint-as-subscriber.html

## Issues Found
- The Flask bot imported `jsonify` but did not use it. Removed the unused import to keep the example clean.
- The bot mapped environments to Terraform workspaces but never actually selected or set the workspace before running Terraform. Updated the command helper to set `TF_WORKSPACE` for Terraform subprocesses, which is appropriate for non-interactive automation.
- The `apply` and `status` slash command paths referenced undefined helper functions. Added minimal `post_approval_request` and `get_terraform_status` implementations so the example is complete.
- The Slack interaction handler parsed `request.form` before verifying the Slack signature. Moved signature verification before payload parsing so the raw request body is available for verification.
- The Slack Block Kit section text could exceed Slack's 3000-character section text limit when wrapping Terraform output in code fences. Reduced the output slice to leave room for formatting characters.
- The Terraform example claimed to configure webhooks with Terraform and subscribed SNS directly to a Slack incoming webhook URL. AWS SNS sends its own HTTP/S JSON envelope and subscription confirmation flow, so a Slack webhook is not a direct SNS subscriber. Updated the text and HCL to create an SNS topic for a separate notification service instead.
- The HCL snippet used AWS resources without declaring the AWS provider. Added `hashicorp/aws` to `required_providers`.
- The GitHub Actions workflow used Terraform without installing it and posted plan output unconditionally. Added `hashicorp/setup-terraform@v4`, made the Slack post conditional on a plan command, used `-input=false`, passed the environment var file consistently, and used `jq` to generate valid JSON for the Slack webhook payload.

## Review Notes
- The Terraform automation guidance from HashiCorp recommends saved plan files for robust production approval workflows. The article's bot still demonstrates a simplified ChatOps flow where approval triggers a fresh `terraform apply`; this is acceptable for an introductory example, but a production implementation should bind approvals to a specific saved plan and prevent multiple outstanding plans against the same state.
- Local `terraform` was not installed in this environment, so Terraform CLI snippets were verified against official documentation rather than executed locally.
