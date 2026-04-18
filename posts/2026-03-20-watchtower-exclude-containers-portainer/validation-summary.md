# Validation Summary: How to Exclude Containers from Watchtower Updates via Portainer (2)

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Watchtower (containrrr/watchtower) — container auto-updates
- Portainer CE — container management UI
- Docker / Docker Compose
- Docker container labels
- PostgreSQL, MySQL, Redis (as example pinned services)

## Sources Consulted
- Watchtower official arguments documentation: https://containrrr.dev/watchtower/arguments/
- Watchtower container filtering documentation: https://containrrr.dev/watchtower/container-selection/
- Watchtower GitHub releases: https://github.com/containrrr/watchtower/releases
- Portainer CE release history (2.21.0 confirmed as real release)

## Issues Found
- **Incorrect CLI flag `--ignore-containers`** (Method 3): Watchtower does not have an `--ignore-containers` option. The correct flag is `--disable-containers` (env var `WATCHTOWER_DISABLE_CONTAINERS`), which accepts a comma- or space-separated list of container names to exclude. This flag was introduced in Watchtower v1.7.0. Fixed both the prose and the YAML `command:` example to use `--disable-containers`.

## Review Notes
- The label `com.centurylinklabs.watchtower.enable` and env var `WATCHTOWER_LABEL_ENABLE=true` are correct and current.
- The `--monitor-only`, `--run-once`, and `--debug` flags used in the verification command are valid Watchtower arguments.
- Pinned version examples (`portainer/portainer-ce:2.21.0`, `postgres:16.1`, `mysql:8.0.35`, `redis:7.2.4`, `containrrr/watchtower:1.7.1`) are all real, published image tags.
- Note for future readers: the containrrr/watchtower GitHub repository was archived on 2025-12-17, meaning the project is no longer actively maintained upstream. This does not invalidate the advice in the post but is worth flagging for long-term planning.
