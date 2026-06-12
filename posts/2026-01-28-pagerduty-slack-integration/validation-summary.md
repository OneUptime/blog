# Validation Summary: How to Use PagerDuty with Slack

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- PagerDuty Slack integration
- Slack slash commands
- PagerDuty Slack Integration API
- Slack Web API
- Python requests
- Python Slack SDK
- Slack Workflow Builder / Slack app automation
- Mermaid diagrams

## Sources Consulted
- PagerDuty Slack Integration Guide: https://support.pagerduty.com/main/docs/slack-integration-guide
- PagerDuty Slack User Guide: https://support.pagerduty.com/main/docs/slack-user-guide
- PagerDuty Slack Integration API: https://developer.pagerduty.com/api-reference/56fee4184eabc-pager-duty-slack-integration-api
- PagerDuty Terraform provider slack connection resource documentation: https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/website/docs/r/slack_connection.html.markdown
- PagerDuty Terraform provider Slack connection implementation: https://github.com/PagerDuty/terraform-provider-pagerduty/blob/master/vendor/github.com/heimweh/go-pagerduty/pagerduty/slack_connection.go
- Slack chat.postMessage documentation: https://docs.slack.dev/reference/methods/chat.postMessage/
- Slack sending and scheduling messages documentation: https://docs.slack.dev/messaging/sending-and-scheduling-messages/

## Issues Found
- The setup flow used `/pd connect` to link a user's PagerDuty account. PagerDuty documents `/pd oncall` as a way to trigger the user-linking OAuth flow, while `/pd connect` connects a service or team to the current channel. Updated Step 2 and troubleshooting examples.
- The service notification code used the legacy `/extensions` endpoint and an unsupported Slack extension schema/config payload. Replaced it with the current Slack channel connection endpoint and documented fields: `source_id`, `source_type`, `channel_id`, `notification_type`, `events`, `priorities`, and `urgency`.
- Slash command examples included incident IDs and arguments that are not how PagerDuty documents dedicated-channel commands. Updated examples to `/pd trigger`, `/pd ack`, `/pd resolve`, `/pd note {note}`, and `/pd escalate`.
- The dedicated incident channel code attempted to update a PagerDuty service with a non-existent `slack_channel_extension`. Replaced it with the documented UI path for enabling automatic incident channel creation.
- The escalation examples used `/pd add-responder` and `/pd run-play`. Updated them to the documented `/pd page` and Incident Workflow command wording.
- The scheduled Slack message example posted to a channel name. Slack recommends channel-like IDs for reliable delivery, so the example now uses a channel ID.
- The mobile acknowledgment wording implied tapping a Slack notification action directly. Updated it to open the incident card in Slack mobile and use the Acknowledge button.
- The OAuth scopes list was incomplete for current PagerDuty Slack app behavior. Expanded the list to include relevant documented scopes such as `app_mentions:read`, `channels:manage`, `channels:join`, and `chat:write.public`.

## Review Notes
The Slack Workflow Builder YAML remains explicitly conceptual. Exact Workflow Builder configuration can vary by Slack plan, app configuration, and whether the team uses Slack's no-code workflow UI or a custom Slack app.
