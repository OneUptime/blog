# Validation Summary: How to Enable Debug Logging in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker CLI
- Docker Compose
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer admin settings general page: https://docs.portainer.io/admin/settings/general
- Portainer CE API documentation 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE API documentation 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer update docs for Docker: https://docs.portainer.io/start/upgrade/docker
- Docker `docker container logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`logging`): https://docs.docker.com/reference/compose-file/services/
- Docker JSON-file logging driver reference: https://docs.docker.com/engine/logging/drivers/json-file/

## Issues Found
- The post claimed `PUT /api/settings` with a `{"LogLevel":"DEBUG"}` payload could enable runtime debug logging. Current Portainer CE API docs do not document `LogLevel` on `/settings`, while current Portainer BE docs expose runtime debug toggling through `PUT /api/support/debug_log` with `{"debugLogEnabled": true|false}`. I updated the example to the documented BE endpoint and marked it as BE-only.
- The authentication section included exact “expected debug output” lines that are not documented as stable current output. I replaced them with version-agnostic guidance because Portainer log text and formatting vary by version and log mode.
- The `docker logs` example placed `--tail` after the container name. Docker’s current CLI reference documents the option before the container argument, so I corrected it to `docker logs --tail 100 portainer`.
- The Compose example used the top-level `version: "3.8"` field. Docker’s current Compose reference marks the `version` element as obsolete, so I removed it.
- The log-rotation redeploy example omitted port `8000`, unlike the main Portainer deployment example. I restored it so the example remains consistent with Portainer’s documented default port exposure when Edge Agent communication is in use.
- Several descriptions overstated what Portainer specifically guarantees at each log level. I adjusted them to safer, documented wording.

## Review Notes
- Portainer’s UI-based debug toggle is documented under Settings and is part of the Portainer support section, which is available in Portainer Business Edition.
- On Portainer Community Edition, the documented way to enable debug logging remains starting the container with `--log-level=DEBUG`.
- The post still uses `portainer/portainer-ce:latest` in container examples. Portainer’s current install and upgrade docs generally use explicit tags such as `:sts` or `:lts`; pinning to the currently installed tag/channel is safer during troubleshooting to avoid accidental version changes.
