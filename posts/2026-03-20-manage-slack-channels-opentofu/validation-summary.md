# Validation Summary: How to Manage Slack Channels with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- Slack Terraform provider (`pablovarela/slack`)
- Slack Web API scopes and methods
- New Relic Terraform provider
- AWS Systems Manager Parameter Store

## Sources Consulted
- Slack provider source repository: https://github.com/pablovarela/terraform-provider-slack
- Slack provider schema for `slack_conversation`: https://raw.githubusercontent.com/pablovarela/terraform-provider-slack/master/slack/resource_conversation.go
- Slack provider schema for `slack_usergroup`: https://raw.githubusercontent.com/pablovarela/terraform-provider-slack/master/slack/resource_usergroup.go
- Slack provider configuration schema: https://raw.githubusercontent.com/pablovarela/terraform-provider-slack/master/slack/provider.go
- Slack provider `slack_user` data source: https://raw.githubusercontent.com/pablovarela/terraform-provider-slack/master/slack/data_source_user.go
- Slack `conversations.create` method: https://docs.slack.dev/reference/methods/conversations.create/
- Slack `conversations.invite` method: https://docs.slack.dev/reference/methods/conversations.invite/
- Slack `conversations.setPurpose` method: https://docs.slack.dev/reference/methods/conversations.setPurpose/
- Slack `users.lookupByEmail` method: https://docs.slack.dev/reference/methods/users.lookupByEmail/
- Slack `users.list` method: https://docs.slack.dev/reference/methods/users.list/
- Slack `usergroups.create` method: https://docs.slack.dev/reference/methods/usergroups.create/
- Slack `usergroups.list` method: https://docs.slack.dev/reference/methods/usergroups.list/
- New Relic `newrelic_notification_destination` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/notification_destination.html.markdown
- New Relic `newrelic_notification_channel` resource docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/r/notification_channel.html.markdown
- New Relic `newrelic_notification_destination` data source docs: https://raw.githubusercontent.com/newrelic/terraform-provider-newrelic/main/website/docs/d/notification_destination.html.markdown
- New Relic Slack notification integration docs: https://docs.newrelic.com/docs/alerts/get-notified/notification-integrations/

## Issues Found
- The provider configuration comment said a bot token with `channels:write` scope was sufficient. That was inaccurate. Slack's current docs show the examples in this post require multiple scopes across conversations, users, and usergroups, and `channels:write` is not an adequate standalone description for the bot-token flow used here. I updated the comment to reflect the required scope categories.
- The `slack_conversation` resources in the monitoring example and module example omitted `is_private`. The Slack provider schema marks `is_private` as required, so those snippets would fail validation. I added `is_private = false` to those resources.
- The New Relic example attempted to create a `newrelic_notification_destination` with `type = "SLACK"` and a webhook URL. That is not supported by the official New Relic provider. Slack destinations must be authenticated through the New Relic UI/OAuth flow first, and then referenced from Terraform. I replaced the resource with a `data "newrelic_notification_destination"` lookup and kept the `newrelic_notification_channel` pointed at the Slack channel ID created by the Slack provider.
- The conclusion implied New Relic Slack delivery could be fully set up in a single apply from scratch. I clarified that the Slack destination must already exist in New Relic before OpenTofu can attach a notification channel to it.

## Review Notes
- The `pablovarela/slack` provider Registry page currently does not render documentation, so the review used the provider's source code as the authoritative schema reference.
- The provider repository is archived, and the latest published provider version remains in the 1.x line. The post's `~> 1.0` constraint is still compatible with the current published release series, so no version change was required.
- Slack user groups are subject to Slack plan and workspace-permission constraints. The example itself is valid, but readers will still need a workspace where user group management is allowed.
