# Validation Summary: How to Debug Docker Compose Volume Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker
- Docker Compose
- Docker volumes
- Bind mounts
- tmpfs mounts
- SELinux mount labels
- Docker Desktop file sharing

## Sources Consulted
- Docker Compose file reference: services `volumes` attribute: https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference: top-level `volumes`: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose file reference: interpolation: https://docs.docker.com/reference/compose-file/interpolation/
- Docker Compose CLI reference: `docker compose config`: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Compose CLI reference: `docker compose up`: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose CLI reference: `docker compose down`: https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Engine storage docs: bind mounts: https://docs.docker.com/engine/storage/bind-mounts/
- Docker CLI reference: `docker volume ls`: https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker CLI reference: `docker volume prune`: https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker CLI reference: `docker volume rm`: https://docs.docker.com/reference/cli/docker/volume/rm/
- Docker Desktop settings: file sharing: https://docs.docker.com/desktop/settings-and-maintenance/settings/

## Issues Found
- The introduction said Docker Compose supports three volume types while the example listed named volumes, bind mounts, anonymous volumes, and tmpfs. Updated the wording to "several mount types" to match current Compose documentation.
- The anonymous volume section said anonymous volumes are recreated each time. Docker documents that Compose can retrieve anonymous volumes from previous containers unless `--renew-anon-volumes` is used, but anonymous volumes are not automatically mounted by a later `docker compose up` after `down` because they lack stable names. Updated the claim and example comment.
- The bind-mount missing-path section implied Compose always fails when a source path does not exist. Current Compose short syntax creates a missing bind source directory by default for backward compatibility; failures apply to required paths, file mounts, Docker Desktop sharing restrictions, or long syntax with host path creation disabled. Updated the wording to avoid the overclaim.
- The path verification note suggested checking only `pwd`. Since Compose resolves relative host paths from the Compose file's parent directory, replaced that with `docker compose ls` plus `docker compose config` to better reflect the actual resolution model.
- The Docker Desktop shared-folder defaults were outdated/incomplete. Updated the macOS/default virtual file share list to the current documented defaults.
- The project-specific volume example used `${COMPOSE_PROJECT_NAME:-myapp}_pgdata` as a top-level volume key. Compose interpolation applies to YAML values, not keys, and local validation rejected that snippet. Changed it to a stable key with an interpolated `name:` value.
- The volume-conflict example mixed two alternative top-level `volumes:` definitions in one YAML block and omitted the required service image/build context. Split the alternatives into separate snippets and added `image: postgres:15`.

## Review Notes
The remaining examples and commands are technically valid for current Docker Compose. The `version: '3.8'` field still parses, but modern Compose uses the Compose Specification and no longer requires a version field; this is a future cleanup rather than a correctness blocker.
