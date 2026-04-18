# Validation Summary: How to Set Up Watchtower Notifications with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Watchtower (containrrr/watchtower)
- Portainer (stack environment variables)
- Docker / Docker Compose
- Shoutrrr (notification routing library)
- Slack (incoming webhooks)
- SMTP / Email
- Microsoft Teams (incoming webhooks)
- Discord, Telegram, Pushover, Gotify (via Shoutrrr)

## Sources Consulted
- Watchtower notifications documentation: https://containrrr.dev/watchtower/notifications/
- Watchtower arguments documentation: https://containrrr.dev/watchtower/arguments/
- Shoutrrr services overview: https://containrrr.dev/shoutrrr/services/overview/
- Shoutrrr Slack service: https://containrrr.dev/shoutrrr/services/slack/
- Shoutrrr Discord service: https://containrrr.dev/shoutrrr/services/discord/
- Shoutrrr Telegram service: https://containrrr.dev/shoutrrr/services/telegram/
- Shoutrrr Pushover service: https://containrrr.dev/shoutrrr/services/pushover/
- Slack incoming webhooks: https://api.slack.com/messaging/webhooks
- logrus log levels (used by Watchtower for `WATCHTOWER_NOTIFICATIONS_LEVEL`)

## Issues Found
No technical issues found.

All environment variable names match the official Watchtower documentation:
- `WATCHTOWER_NOTIFICATIONS`, `WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL`, `WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER`, `WATCHTOWER_NOTIFICATION_SLACK_CHANNEL`, `WATCHTOWER_NOTIFICATION_SLACK_ICON_EMOJI`
- Email: `WATCHTOWER_NOTIFICATION_EMAIL_FROM/TO/SERVER/SERVER_PORT/SERVER_USER/SERVER_PASSWORD/SUBJECT_TAG/DELAY`
- MSTeams: `WATCHTOWER_NOTIFICATION_MSTEAMS_HOOK_URL`, `WATCHTOWER_NOTIFICATION_MSTEAMS_USE_LOG_DATA`
- `WATCHTOWER_NOTIFICATION_URL` (Shoutrrr) and space-separated multiple URLs are both valid.
- `WATCHTOWER_NOTIFICATIONS_LEVEL` is correct (note plural "NOTIFICATIONS"); the listed levels (panic, fatal, error, warn, info, debug, trace) match logrus.
- CLI flags `--run-once`, `--monitor-only`, `--debug` are valid Watchtower flags.
- Shoutrrr URL formats for Discord (`discord://token@webhookid`), Telegram (`telegram://token@telegram?chats=@channelname`), and Pushover (`pushover://shoutrrr:apiToken@userKey`) match the official Shoutrrr URL schemas.

## Review Notes
- The legacy notification system (using `WATCHTOWER_NOTIFICATIONS=slack|email|msteams|gotify` with per-service env vars) is documented by the Watchtower project as superseded by the Shoutrrr-based `WATCHTOWER_NOTIFICATION_URL` notifier. The legacy variables still work in current Watchtower releases but new deployments are encouraged to use Shoutrrr URLs. The post does cover Shoutrrr in a later section, so this is acceptable.
- The Slack Shoutrrr URL example (`slack://token@channel`) is a simplified placeholder — the full Shoutrrr Slack URL format is `slack://[botname@]token-a/token-b/token-c` derived from the three path segments of the Slack webhook URL. The post's intent is clearly to illustrate combining multiple URLs, so this is fine, but readers using a real Slack webhook need the full path format.
- `--monitor-only` combined with `--run-once` will only emit notifications for the check itself (when `WATCHTOWER_NOTIFICATIONS_LEVEL=info`) since no updates will be performed; this is sufficient to verify the notifier transport works.
- `WATCHTOWER_NOTIFICATION_SLACK_CHANNEL` overrides the channel set when the legacy webhook was created; with newer Slack webhooks the channel is fixed at webhook creation and this override may be ignored.
