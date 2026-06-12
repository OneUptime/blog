# Validation Summary: How to Send Notifications with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflows, contexts, conditions, and permissions
- Slack incoming webhooks and Slack GitHub Action
- Discord webhooks and embeds
- Microsoft Teams incoming webhooks and MessageCard payloads
- SendGrid Mail Send API
- PagerDuty Events API v2
- GitHub Issues API via actions/github-script
- Shell, curl, and JSON payload construction

## Sources Consulted
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions expressions reference: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- Slack GitHub Action documentation and action metadata: https://docs.slack.dev/tools/slack-github-action/ and https://github.com/slackapi/slack-github-action
- Discord message/embed resource documentation: https://docs.discord.com/developers/resources/message
- sarisia/actions-status-discord action metadata: https://github.com/sarisia/actions-status-discord
- Microsoft Teams incoming webhook and actionable message documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook and https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using
- SendGrid Mail Send API documentation: https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/send-alert-event
- actions/github-script documentation and action metadata: https://github.com/actions/github-script

## Issues Found
- The Slack GitHub Action example used `slackapi/slack-github-action@v1.25.0` with v1 inputs (`channel-id` and `slack-message`). Updated it to the current v3 action syntax using `method: chat.postMessage`, `token`, and `payload`.
- Several `curl` webhook examples left secret webhook URLs unquoted and omitted the JSON content type. Quoted the webhook secret expansions and added `Content-Type: application/json` where JSON is posted.
- The conditional Slack failure example interpolated `github.event.head_commit.message` directly into JSON. Replaced it with `github.sha` to avoid trigger-specific null values and JSON breakage from commit messages containing quotes or newlines.
- The Discord webhook example used `github.event.head_commit.timestamp`, which only exists for push events. Removed the optional timestamp field so the payload works across more workflow triggers.
- The PagerDuty example used `github.run_id` in the `dedup_key`, which prevents a later successful run from resolving an earlier failed deployment alert. Changed the trigger and resolve payloads to use a stable repository-level deployment dedup key.
- The PagerDuty deployment step used `continue-on-error: true`, which would allow a failed deployment job to succeed after sending the alert. Added a final failure step so the job still fails after the alert is sent.
- The GitHub Issues example used `actions/github-script@v7`, lacked explicit issue write permissions, and attempted to create issues with labels that might not exist. Updated to `actions/github-script@v9`, added `permissions: issues: write`, and removed the label dependency.
- The workflow summary example constructed JSON by interpolating a multiline shell variable into a JSON string, which can produce invalid JSON. Replaced it with `jq -n --arg text "$MESSAGE" '{text: $text}'` so multiline text is encoded correctly.

## Review Notes
- Microsoft now emphasizes Teams Workflows/Power Automate for incoming webhook-style integrations; the MessageCard example remains aligned with Microsoft's actionable message documentation, but Teams webhook setup guidance may need periodic review.
- Slack incoming webhooks and Discord embeds are shown with direct JSON payloads. For production workflows, generating JSON with `jq` or an action input payload is safer when interpolating untrusted event fields.
