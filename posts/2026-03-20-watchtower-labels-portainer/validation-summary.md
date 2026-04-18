# Validation Summary: How to Configure Per-Container Updates with Watchtower in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Watchtower (containrrr/watchtower) — automated Docker container image updates
- Portainer — Docker management UI (Stacks / Compose-based deployment)
- Docker Compose / Docker labels
- Go cron expressions (6-field format) for scheduling

## Sources Consulted
- Watchtower official documentation: https://containrrr.dev/watchtower/
- Watchtower container selection & labels: https://containrrr.dev/watchtower/container-selection/
- Watchtower arguments / env vars: https://containrrr.dev/watchtower/arguments/
- Watchtower lifecycle hooks: https://containrrr.dev/watchtower/lifecycle-hooks/
- Watchtower GitHub repo: https://github.com/containrrr/watchtower
- Docker Hub image: https://hub.docker.com/r/containrrr/watchtower

## Issues Found
No technical issues found.

All label names verified against Watchtower documentation:
- `com.centurylinklabs.watchtower.enable` — correct
- `com.centurylinklabs.watchtower.stop-signal` — correct
- `com.centurylinklabs.watchtower.lifecycle.pre-update` — correct
- `com.centurylinklabs.watchtower.lifecycle.post-update` — correct
- `com.centurylinklabs.watchtower.depends-on` — correct
- `com.centurylinklabs.watchtower.scope` — correct

Environment variables verified:
- `WATCHTOWER_LABEL_ENABLE=true` — correct behavior (only update labeled containers)
- `WATCHTOWER_SCOPE` — correct (restricts Watchtower instance to matching scoped containers)
- `WATCHTOWER_SCHEDULE` — 6-field Go cron format is accurate; `0 0 2 * * *` = 2 AM daily and `0 0 * * * *` = hourly on the hour are both correct.

CLI flags verified:
- `--monitor-only` and `--run-once` are both valid Watchtower flags.
- `containrrr/watchtower` is the correct Docker Hub image.

YAML compose snippets are syntactically valid Compose files and align with how Portainer stacks are deployed.

## Review Notes
- The lifecycle hooks (`pre-update` / `post-update` labels) require the Watchtower instance to be started with the `--enable-lifecycle-hooks` flag (or `WATCHTOWER_LIFECYCLE_HOOKS=true`). The post focuses on per-container labels and does not cover Watchtower instance configuration, so this is out of scope but worth noting for readers who hit silent hook failures. The commands specified in the labels are also executed inside the target container, so the referenced binaries (`echo`, `curl`) must exist in that container's image.
- `depends-on` ordering semantics in Watchtower are subtle: the label lists containers whose lifecycle should be coordinated with this container during updates. The post's phrasing ("Stop 'cache' container before updating 'app'") is an acceptable simplification.
- Image tags are shown as `:latest` (or unpinned) for simplicity. Pinning specific versions in production stacks is generally advisable, but this is a stylistic note, not a technical error.
