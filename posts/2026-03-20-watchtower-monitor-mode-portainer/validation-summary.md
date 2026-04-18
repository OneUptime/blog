# Validation Summary: How to Use Watchtower Monitor-Only Mode with Portainer - Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Watchtower (containrrr/watchtower)
- Portainer
- Docker Compose
- Slack notifications (via Watchtower notification integration)

## Sources Consulted
- Watchtower Arguments documentation: https://containrrr.dev/watchtower/arguments/
- Watchtower Notifications documentation: https://containrrr.dev/watchtower/notifications/
- Watchtower Container Selection documentation (labels)

## Issues Found
No technical issues found.

Verified items:
- `WATCHTOWER_MONITOR_ONLY=true` — valid; documented behavior: only monitors for new images, sends notifications, does not update.
- `WATCHTOWER_POLL_INTERVAL=21600` — valid; expressed in seconds (6 hours).
- `WATCHTOWER_NOTIFICATIONS=slack` — valid notification type.
- `WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL` — correct variable name.
- `WATCHTOWER_NOTIFICATION_SLACK_IDENTIFIER` — correct variable name.
- `WATCHTOWER_NOTIFICATIONS_LEVEL=info` — correct variable name (controls log level for notifications globally).
- `com.centurylinklabs.watchtower.monitor-only` label — confirmed valid for per-container override (true/false).
- `com.centurylinklabs.watchtower.enable` label — confirmed valid.
- CLI flags `--monitor-only`, `--run-once`, `--debug` — all valid and currently supported.
- Docker Compose version `"3.8"` — valid Compose file format.
- Docker socket mount path `/var/run/docker.sock` — correct.

## Review Notes
- The `version: "3.8"` line in Compose files is accepted by Docker but is no longer required by modern Compose — Compose Specification drops the top-level `version` field. Portainer still accepts it, so no change is needed, but it could be omitted in future revisions.
- The Portainer UI path `Containers → Recreate` with the "Re-pull image" option matches current Portainer CE behavior.
- The post's CLI output example is illustrative; actual Watchtower log messages may vary slightly in wording between versions.
