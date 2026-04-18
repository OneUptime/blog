# Validation Summary: How to Deploy Watchtower Alongside Portainer - Part 3

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Watchtower (containrrr/watchtower)
- Portainer (portainer-ce stacks)
- Docker / Docker Compose
- Slack notifications (legacy Watchtower notifier)
- Cron (6-field schedule format)

## Sources Consulted
- Watchtower arguments reference: https://containrrr.dev/watchtower/arguments/
- Watchtower notifications: https://containrrr.dev/watchtower/notifications/
- Watchtower private registries: https://containrrr.dev/watchtower/private-registries/
- Watchtower container selection (label-enable): https://containrrr.dev/watchtower/container-selection/

## Issues Found

1. **Missing `WATCHTOWER_NOTIFICATIONS=slack`** in the main stack example. Per the Watchtower notifications docs, to use the legacy Slack notifier you must set `WATCHTOWER_NOTIFICATIONS=slack` in addition to `WATCHTOWER_NOTIFICATION_SLACK_HOOK_URL` — otherwise no Slack message is sent. Added the missing variable.

2. **Incorrect `DOCKER_CONFIG=/config.json`** in the private registry example. `DOCKER_CONFIG` is expected to be a *directory* path, not a file path. Watchtower already looks for `/config.json` by default when mounted there, so the env var was unnecessary and misleading. Removed the variable and clarified the prose.

3. **`REPO_USER` / `REPO_PASS` environment variables are not supported** by Watchtower. The official private-registries docs describe only `config.json` mounting and credential helpers — there are no such env vars. Removed the invalid "Or use environment variables" subsection.

4. **Typo in log example**: `containrrr/portainer-ce` should be `portainer/portainer-ce` (the actual Portainer CE image lives under the `portainer` namespace, not `containrrr`). Fixed.

## Review Notes
- The `WATCHTOWER_NOTIFICATION_SLACK_*` variables are the *legacy* notification system. Watchtower is migrating to shoutrrr-style `WATCHTOWER_NOTIFICATION_URL` URLs (e.g. `slack://watchtower@token-a/token-b/token-c`). The legacy variables still work and are auto-converted to shoutrrr URLs, but a future post update could switch to the modern form.
- The 6-field cron format (`Seconds Minutes Hours DayOfMonth Month DayOfWeek`) is correctly described; Watchtower uses robfig/cron which supports this format.
- The label `com.centurylinklabs.watchtower.enable=true` is the correct opt-in label — the `centurylinklabs` prefix is retained from Watchtower's original maintainer for backwards compatibility.
- The caution about not using Watchtower on stateful/production databases is sound advice — Watchtower does a stop/recreate cycle, not a rolling update.
