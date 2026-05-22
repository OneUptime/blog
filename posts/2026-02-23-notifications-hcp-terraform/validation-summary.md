# Validation Summary: How to Configure Notifications in HCP Terraform (Slack, Email, Webhook)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform workspace notifications
- Terraform `tfe` provider
- Slack incoming webhooks
- Email notifications
- Generic webhooks
- Microsoft Teams notifications
- PagerDuty Events API
- Python Flask webhook handling

## Sources Consulted
- HCP Terraform workspace notifications documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/notifications
- HCP Terraform workspace notification configurations API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace
- HashiCorp `tfe_notification_configuration` provider documentation/source: https://github.com/hashicorp/terraform-provider-tfe/blob/main/website/docs/r/notification_configuration.html.markdown
- HashiCorp `tfe_notification_configuration` provider schema/source: https://github.com/hashicorp/terraform-provider-tfe/blob/main/internal/provider/resource_tfe_notification_configuration.go

## Issues Found
- The post described the notification trigger list as all notification events, but the listed values were only run events. Updated the wording to "run events" to avoid implying that assessment and workspace event triggers are not supported.
- The `run:errored` description said only that a run failed. Official HCP Terraform documentation says this trigger also covers cancellation. Updated the description to "failed or was canceled."
- The generic webhook example said `token` is sent in the `Authorization` header as a bearer token. Official HCP Terraform documentation states the token is used to compute an HMAC-SHA-512 signature sent in the `X-TFE-Notification-Signature` header. Updated the HCL comment and explanatory text.
- The Microsoft Teams section implied a middleware or transformation layer was required. HCP Terraform natively supports `microsoft-teams` as a destination type. Updated the text to state that middleware is only needed for custom formatting or routing.

## Review Notes
The `tfe_notification_configuration` examples use the supported `url` and `token` arguments. Current provider documentation recommends the write-only alternatives `url_wo` and `token_wo` for Terraform 1.11.0 or later to avoid storing sensitive values in state, but the existing arguments remain valid.
