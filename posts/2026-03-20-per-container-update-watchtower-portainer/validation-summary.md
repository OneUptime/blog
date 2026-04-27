# Validation Summary: Per-Container Update Configuration with Watchtower and Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Watchtower (containrrr/watchtower)
- Portainer
- Docker / Docker Compose
- Slack webhooks (notifications)

## Sources Consulted
- Watchtower arguments reference: https://containrrr.dev/watchtower/arguments/
- Watchtower container selection (labels): https://containrrr.dev/watchtower/container-selection/
- Watchtower running multiple instances (scope): https://containrrr.dev/watchtower/running-multiple-instances/
- Watchtower notifications: https://containrrr.dev/watchtower/notifications/

## Issues Found
1. **"Per-Container Update Schedules" introduction was inaccurate.** The original prose claimed Watchtower supports per-container "cron-style schedules via the `monitor-only` label and scope feature." The example below it uses neither cron syntax nor the `monitor-only` label - it uses `--interval 60` (seconds) and the scope feature to run a second Watchtower instance. Rewrote the intro to accurately describe what the example does (running multiple scoped Watchtower instances each with their own poll interval) and added a clarifying note that `--interval` takes seconds while `--schedule`/`WATCHTOWER_SCHEDULE` is the cron-based alternative, and that the two are mutually exclusive (per official docs).

2. **Scoped Watchtower instance was missing its own scope label.** Per the Watchtower docs, an unscoped Watchtower instance will terminate any other running Watchtower instances regardless of their scope. To survive alongside other Watchtower containers, a scoped instance must itself carry the `com.centurylinklabs.watchtower.scope=<scope>` label. Added the missing label to the `watchtower-frontend` service in the example to match the pattern shown in the official docs.

## Review Notes
- All Watchtower environment variables used (`WATCHTOWER_POLL_INTERVAL`, `WATCHTOWER_CLEANUP`, `WATCHTOWER_INCLUDE_STOPPED`, `WATCHTOWER_LABEL_ENABLE`, `WATCHTOWER_NOTIFICATIONS`, `WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL`, `WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER`) are valid and current.
- All container labels referenced (`com.centurylinklabs.watchtower.enable`, `com.centurylinklabs.watchtower.monitor-only`, `com.centurylinklabs.watchtower.scope`) match the official documentation.
- The `version: "3.8"` line in the compose file is now obsolete in modern Docker Compose (the top-level `version` field is no longer required and is ignored), but it remains harmless and widely seen in published examples - left as-is since it does not produce incorrect behavior.
- The legacy Slack notification environment variables shown still work, but Watchtower also supports a newer shoutrrr-based notification system (`WATCHTOWER_NOTIFICATION_URL`) which is preferred going forward. Not changed since the shown form is documented and functional.
- Slack itself has deprecated legacy incoming webhooks in favor of Slack apps; readers configuring this today should generate a webhook from a Slack app rather than a legacy custom integration.
