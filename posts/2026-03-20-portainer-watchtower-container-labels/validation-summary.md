# Validation Summary: How to Configure Per-Container Update Behavior with Watchtower Labels

## Status
validated

## Post Type
Guide

## Technologies Covered
- Watchtower
- Docker
- Docker Compose
- Portainer
- Docker labels

## Sources Consulted
- Watchtower Introduction: https://containrrr.dev/watchtower/introduction/
- Watchtower Container Selection: https://containrrr.dev/watchtower/container-selection/
- Watchtower Lifecycle Hooks: https://containrrr.dev/watchtower/lifecycle-hooks/
- Watchtower Arguments: https://containrrr.dev/watchtower/arguments/
- Watchtower Running Multiple Instances: https://containrrr.dev/watchtower/running-multiple-instances/
- Docker Compose services reference (`labels`): https://docs.docker.com/reference/compose-file/services/
- Docker CLI reference for `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference for `docker container logs`: https://docs.docker.com/reference/cli/docker/container/logs/

## Issues Found
- The introduction and Step 2 incorrectly implied Watchtower supports per-container schedule changes and per-container image tag override labels. I updated the text to reflect the documented behavior: Watchtower tracks the image tag a container was originally started with, and changing tags requires updating the image reference and redeploying the container.
- The lifecycle hooks section omitted that lifecycle hooks are disabled by default. I added the required Watchtower setting: `WATCHTOWER_LIFECYCLE_HOOKS=true` or `--enable-lifecycle-hooks`.
- The lifecycle hooks section treated hook labels as simple script paths without noting execution behavior. I corrected the explanation to match the docs: lifecycle hooks are shell commands executed inside the container via `sh`, so the image must include both the commands/scripts and a `sh` executable.
- The `com.centurylinklabs.watchtower.lifecycle.post-update-timeout` label was described and used as if it were measured in seconds. I corrected the timeout reference to minutes, added the default lifecycle-command timeout behavior from the docs, and changed the example value from `120` to `2` to preserve the likely intended two-minute timeout.
- The mixed update strategy example set `monitor-only=true` on `postgres` without also setting `enable=true`. That example would be skipped when `WATCHTOWER_LABEL_ENABLE=true` is used, so I added `com.centurylinklabs.watchtower.enable=true` to make the example consistent with the article’s opt-in pattern.
- The post claimed to cover all Watchtower labels while only listing a subset. I narrowed that wording so the reference no longer incorrectly presents itself as exhaustive.

## Review Notes
- Watchtower's monitor-only mode still may pull an updated image to compare digests because of Docker API limitations; the article's current wording is acceptable, but that nuance could be added in a future revision if desired.
- Modern Docker Compose no longer requires a top-level `version` key, but `version: "3.8"` remains accepted here and is not technically incorrect.
