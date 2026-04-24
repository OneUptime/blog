# Validation Summary: How to Generate a Portainer Support Bundle

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition (BE)
- Portainer Community Edition (CE)
- Portainer HTTP API
- Docker CLI
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer Documentation, General settings: https://docs.portainer.io/admin/settings/general
- Portainer Documentation, API access: https://docs.portainer.io/api/access
- Portainer Documentation, API usage examples: https://docs.portainer.io/api/examples
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer BE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer CE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Documentation, removing Portainer (for default container and volume naming assumptions): https://docs.portainer.io/faqs/installing/how-do-i-remove-portainer
- Docker CLI reference, `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference, `docker logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference, `docker network ls`: https://docs.docker.com/reference/cli/docker/network/ls/
- Docker CLI reference, `docker version`: https://docs.docker.com/reference/cli/docker/version/
- Docker CLI reference, `docker info`: https://docs.docker.com/reference/cli/docker/system/info/
- Portainer official source, Linux Dockerfile (`ENTRYPOINT ["/portainer"]`): https://github.com/portainer/portainer/blob/develop/build/linux/Dockerfile

## Issues Found
- The UI navigation was outdated. The post said to use `Help -> Support Bundle` or `Settings -> Support`, but current Portainer docs place the feature under `Settings`, in the `Portainer support` section of the General settings page. I updated the steps accordingly.
- The bundle file format was incorrect. The post said the UI download was a ZIP file, while current Portainer docs specify a `.tar.gz` bundle. I corrected the file type in both the UI and API sections.
- The API example used the wrong endpoint and method. The post used `GET /api/support/bundle`; current BE OpenAPI documentation exposes `POST /support/download`. I updated the example to `POST /api/support/download`.
- The API auth example was ambiguous. The original example used a generic bearer token variable, but Portainer's API access docs document user access tokens via `X-API-Key`. I changed the example to use `X-API-Key` with an admin access token.
- The support bundle contents were over-specified without documentation support. I replaced the speculative contents list with the behavior Portainer documents: diagnostic installation data with sensitive credentials removed.
- The manual CE diagnostic script used `portainer --version`, but the official Portainer Linux image runs `/portainer` as its entrypoint. I updated the script and later examples to use `/portainer --version`.
- The manual CE script and later commands hard-coded default container and volume names without making that assumption explicit. I parameterized the script with `PORTAINER_CONTAINER` and `PORTAINER_DATA_VOLUME` defaults so the examples remain accurate for non-default names.
- The reporting examples used `/api/status` to fetch version information. Current Portainer API docs mark `/status` as deprecated in favor of `/system/status`, and `/system/version` / `/status` semantics differ. I replaced the version example with `docker exec ... /portainer --version` and changed the API health example to `/api/system/status`.
- The "Portainer startup flags" example was imprecise. `docker inspect ... Config.Cmd` does not reliably represent the running Portainer process arguments for this image layout. I changed it to inspect `Path` and `Args`.
- The "Test Docker socket connectivity" command was broken. `wget --unix-socket` is not a valid current Portainer diagnostic command here. I replaced it with `docker version --format '{{json .Server}}' | jq .`, which directly tests daemon connectivity through the Docker CLI.

## Review Notes
- Portainer CE does not expose the support-bundle download endpoint in the current CE API spec; the manual collection section remains a best-effort CE alternative rather than an official CE support bundle feature.
- The manual CE collection script is Linux-oriented because it relies on commands such as `free` and `ss`; the post now states that scope explicitly.
- The BE OpenAPI spec allows both `X-API-Key` and `Authorization: Bearer ...` authentication styles for support endpoints. The revised example uses `X-API-Key` because that matches Portainer's access-token documentation.
