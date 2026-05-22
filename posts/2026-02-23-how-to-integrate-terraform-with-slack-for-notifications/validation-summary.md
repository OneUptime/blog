# Validation Summary: How to Integrate Terraform with Slack for Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Slack incoming webhooks
- Slack Terraform provider
- HCP Terraform / Terraform Enterprise notifications
- GitHub Actions
- Shell scripting with curl and jq

## Sources Consulted
- Slack Developer Docs: Sending messages using incoming webhooks: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack Developer Docs: Slack GitHub Action incoming webhook usage: https://docs.slack.dev/tools/slack-github-action/sending-techniques/sending-data-slack-incoming-webhook/
- Slack GitHub Action repository and release information: https://github.com/slackapi/slack-github-action
- Terraform language docs: provisioners and local-exec: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform language docs: terraform_data resource: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform Registry: pablovarela/slack provider and slack_conversation resource: https://registry.terraform.io/providers/pablovarela/slack/latest/docs/resources/conversation
- Terraform Registry: hashicorp/tfe notification_configuration resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/notification_configuration

## Issues Found
- Slack incoming webhook payloads attempted to override `channel`, `username`, and `icon_emoji`. Slack's current incoming webhook documentation states that these values cannot be overridden by incoming webhook payloads and are inherited from the Slack app configuration. Removed the channel variable from the webhook example and removed unsupported payload fields from the curl payload.
- The custom shell script constructed JSON by interpolating shell variables directly into a heredoc. This can produce invalid JSON if Terraform output contains quotes, newlines, or other special characters. Updated the script to build the payload with `jq -n` and documented that the example uses `jq`.
- The GitHub Actions example used `slackapi/slack-github-action@v1.24.0` with the older `SLACK_WEBHOOK_URL` environment variable style. Updated it to the current documented v3 syntax using the `webhook` input and `webhook-type: incoming-webhook`.
- The incoming webhook setup instructions described searching for the older Incoming Webhooks app flow. Updated the wording to match the current Slack app-based incoming webhook setup.

## Review Notes
- The `null_resource` plus `local-exec` examples remain technically valid, but HashiCorp now documents `terraform_data` as the built-in resource to use when provisioners need to run without managing an external object. The post keeps `null_resource` because the section is explicitly about that approach and Terraform 1.0 compatibility.
- Terraform was not installed in the local review environment, so HCL snippets were reviewed against documentation rather than executed with `terraform validate`.
