# Validation Summary: How to Use Watchtower in Monitor-Only Mode with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Watchtower (containrrr/watchtower)
- Portainer (portainer-ce)
- Docker
- Docker Compose
- Slack (incoming webhook notifications)
- SMTP / email notifications

## Sources Consulted
- Watchtower official documentation — arguments: https://containrrr.dev/watchtower/arguments/
- Watchtower official documentation — notifications: https://containrrr.dev/watchtower/notifications/
- Portainer CE documentation (https://docs.portainer.io/)

## Issues Found
No technical issues found.

Verified items:
- `WATCHTOWER_MONITOR_ONLY=true` and `--monitor-only` flag are valid per official docs.
- `WATCHTOWER_SCHEDULE` uses a 6-field cron expression (with seconds); `0 0 0 * * *` correctly represents midnight every day.
- Email notification env vars (`WATCHTOWER_NOTIFICATION_EMAIL_FROM/TO/SERVER/SERVER_PORT/SERVER_USER/SERVER_PASSWORD`) and `WATCHTOWER_NOTIFICATIONS=email` are correct.
- Slack legacy notification env vars (`WATCHTOWER_NOTIFICATIONS=slack`, `WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL`, `WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER`) remain supported for backwards compatibility.
- CLI flags `--monitor-only`, `--run-once`, `--notifications=slack`, `--notification-slack-hook-url` are valid.
- `WATCHTOWER_LABEL_ENABLE=true` combined with the `com.centurylinklabs.watchtower.enable=true` label is the documented approach for selective monitoring.
- Portainer CE image `portainer/portainer-ce:latest` exposing port 9000 is valid.
- Docker socket mount (`/var/run/docker.sock`) is required for both containers to function as described.

## Review Notes
- The `version: "3.8"` key in Docker Compose is obsolete in the modern Compose spec (Compose V2 ignores it with a warning) but still works; not an error.
- Watchtower recommends the shoutrrr-based approach (`WATCHTOWER_NOTIFICATION_URL`) for new configurations. The legacy `WATCHTOWER_NOTIFICATIONS=email|slack` style used in the post is still supported and auto-converted to shoutrrr internally, so the examples remain correct.
- Portainer CE also exposes port 9443 (HTTPS) in recent versions; the post only maps 9000 (HTTP), which is fine but users may want to expose 9443 as well.
- Mounting `/var/run/docker.sock` into a container grants effectively root-level access to the host — worth flagging for readers, but not a technical inaccuracy.
