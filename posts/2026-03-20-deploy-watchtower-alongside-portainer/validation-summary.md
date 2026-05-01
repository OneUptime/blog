# Validation Summary: How to Deploy Watchtower Alongside Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer stacks
- Watchtower
- Docker
- Docker Compose syntax
- Slack notifications
- Email notifications
- Gotify notifications

## Sources Consulted
- Watchtower home: https://containrrr.dev/watchtower/
- Watchtower arguments: https://containrrr.dev/watchtower/arguments/
- Watchtower notifications: https://containrrr.dev/watchtower/notifications/
- Watchtower container selection: https://containrrr.dev/watchtower/container-selection/
- Portainer stacks: https://docs.portainer.io/user/docker/stacks
- Portainer add stack: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The main stack example used the top-level `version: "3.8"` field. I removed it because current Docker Compose documentation marks the top-level `version` field as obsolete and only retained for backward compatibility.
- The `WATCHTOWER_SCHEDULE=0 0 4 * * *` comment said `4 AM daily`, which is misleading without a timezone. I corrected it to `4 AM UTC daily` and clarified in the summary that Watchtower schedules use UTC unless `TZ` is set.
- The introduction said Watchtower "redeploys updated images". I changed this to state that it pulls new images and restarts updated containers, which matches the official behavior description.
- The summary said `WATCHTOWER_CLEANUP=true` removes old image layers. I corrected this to old images, which is what Watchtower documents for `--cleanup`.
- The notification example combined Email and Gotify settings in one `environment` block, including two conflicting `WATCHTOWER_NOTIFICATIONS` values. I changed the Gotify lines into a commented alternative so the snippet no longer implies both can be enabled by pasting the block as-is.

## Review Notes
- The notification variables shown in the post are still documented by Watchtower, but they appear under the legacy-notifications path in the current docs. Watchtower also supports the newer shoutrrr-based `WATCHTOWER_NOTIFICATION_URL` approach.
- I could not run `docker` or `docker compose` locally in this environment because the Docker CLI is not installed here, so command verification was documentation-based rather than runtime-tested.
