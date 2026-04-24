# Validation Summary: How to Set Up Watchtower Notifications with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer stack configuration
- Watchtower
- Docker Compose-style YAML
- Slack incoming webhooks
- SMTP email notifications
- Microsoft Teams incoming webhooks
- Shoutrrr notification URLs
- Generic webhooks
- Gotify

## Sources Consulted
- Watchtower notifications docs: https://containrrr.dev/watchtower/notifications/
- Watchtower arguments docs: https://containrrr.dev/watchtower/arguments/
- Watchtower upstream flags source: https://raw.githubusercontent.com/containrrr/watchtower/main/internal/flags/flags.go
- Shoutrrr service overview: https://containrrr.dev/shoutrrr/v0.8/services/overview/
- Shoutrrr Slack service docs: https://containrrr.dev/shoutrrr/v0.8/services/slack/
- Shoutrrr Generic Webhook docs: https://containrrr.dev/shoutrrr/v0.8/services/generic/
- Shoutrrr Generic Webhook examples: https://containrrr.dev/shoutrrr/v0.8/examples/generic/
- Microsoft Teams Incoming Webhook docs: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook

## Issues Found
- The post claimed that `WATCHTOWER_NOTIFICATIONS_LEVEL=info` avoids notifications for scans with no updates. That is not what the setting does; it filters by log severity. I corrected the examples and conclusion to use `WATCHTOWER_NOTIFICATION_REPORT=true` for concise update/failure summaries, while keeping `WATCHTOWER_NOTIFICATIONS_LEVEL=info` as the severity threshold.
- The email example used the wrong environment variable name: `WATCHTOWER_NOTIFICATION_EMAIL_SUBJECT_TAG`. I changed it to `WATCHTOWER_NOTIFICATION_EMAIL_SUBJECTTAG`, which matches the current Watchtower flag and documentation.
- The Microsoft Teams setup steps used the older `... -> Connectors` navigation path only. I updated the instructions to the current Microsoft Learn flow for New Teams: channel `...` -> `Manage channel` -> `Edit` -> `Incoming Webhook`.
- The generic webhook example mixed legacy Gotify notifications with Shoutrrr generic webhook syntax, and the URL format was incorrect. I replaced it with a valid Shoutrrr generic URL using `generic://... ?template=json` and header syntax with `@Authorization=...`.
- The multi-provider Shoutrrr section used incorrect or outdated URL examples and said multiple notification URLs could be comma-separated or repeated with numbered suffixes. I corrected the examples to current documented formats and changed the guidance to space-separated URLs.
- The sample notification message did not match Watchtower's documented default session report output. I replaced it with a report-format example consistent with `WATCHTOWER_NOTIFICATION_REPORT=true`, and clarified that the test command produces a startup/debug notification.

## Review Notes
- `WATCHTOWER_NOTIFICATION_SLACK_ICON_EMOJI` is still present in the current upstream Watchtower flag definitions even though it is not called out on the rendered notification docs page.
- Microsoft documents Incoming Webhooks as current, but also notes that Microsoft 365 connectors are nearing deprecation. This section should be rechecked periodically against Microsoft Learn.
- `docker` was not available in the local review environment, so CLI verification was done against upstream documentation and source rather than local `watchtower --help` output.
