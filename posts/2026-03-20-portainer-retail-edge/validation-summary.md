# Validation Summary: How to Use Portainer for Retail Edge Computing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer Edge Stacks
- Portainer Edge Configurations
- Docker
- Docker Compose
- Portainer HTTP API
- Bash
- YAML

## Sources Consulted
- Portainer BE install docs: https://docs.portainer.io/start/install/server/docker/linux
- Portainer Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Agent architecture: https://docs.portainer.io/advanced/edge-agent
- Portainer Edge Stacks docs: https://docs.portainer.io/user/edge/stacks/add
- Portainer Edge Configurations docs: https://docs.portainer.io/user/edge/configurations
- Portainer API docs (BE 2.39.1): https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer agent README: https://github.com/portainer/agent
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Hub postgres official image: https://hub.docker.com/_/postgres

## Issues Found
- The Step 1 `docker run` example used inline comments after line-continuation backslashes, which breaks shell parsing. I moved the comments below the command and aligned the image tag with current Portainer install docs by switching to `portainer/portainer-ee:sts`.
- The Step 2 Edge Agent example treated `EDGE_ID` as an arbitrary store identifier, but Portainer generates an Edge ID per environment and includes it in the generated deployment command. I changed the example to use UI-provided `EDGE_ID` and `EDGE_KEY` values.
- The Step 2 example used `EDGE_SERVER_HOST` as if it were the Portainer server URL. In Portainer agent documentation, `EDGE_SERVER_HOST` controls the local Edge UI bind address, not the Portainer API/tunnel target. I removed that incorrect variable usage.
- The Step 2 Edge Agent example omitted the standard `/var/lib/docker/volumes` and `/:/host` mounts shown in Portainer’s documented agent deployment/update commands. I added those mounts and changed the agent tag to `portainer/agent:sts` so the agent tag matches the server tag stream.
- The Step 3 stack example used the obsolete top-level Compose `version` field and depended on `${STORE_ID}` without showing a documented per-device configuration path. I removed the obsolete `version` entry, changed the example to use `PORTAINER_EDGE_ID`, and mounted a device-specific Edge Configuration directory to match Portainer’s documented Edge Configurations workflow.
- The Step 4 API example referenced `PORTAINER_URL` without defining it after the Step 2 cleanup, and the surrounding text implied scheduled updates even though the shown API call performs an immediate update. I added an explicit `PORTAINER_URL` and changed the wording to “automated updates”.
- The Step 4 and Step 5 API examples used `X-API-Key`. HTTP header names are case-insensitive, but Portainer’s API documentation names the header `X-API-KEY`, so I normalized the examples to that documented form.
- The Step 5 monitoring example used `https://portainer.retailchain.com` without the `:9443` port shown in the earlier install example. I updated it to `https://portainer.retailchain.com:9443` for consistency with the documented installation.
- The Step 6 example conflated stack-level Edge Stack environment variables with per-store configuration and called an unsupported per-environment Edge Stack API path. I replaced it with the documented Edge Configurations approach using device-specific folders keyed by `PORTAINER_EDGE_ID`.
- The Step 7 offline resilience example used `sqlite:latest` as though it were a long-running database service container. I replaced it with a valid `postgres:16-alpine` service and added the missing top-level volume definitions.

## Review Notes
- Edge Stack environment variables, Pre-pull images, Retry deployment, and several rollout controls are Business Edition features. The post already uses Portainer BE, so the corrected examples remain consistent with that edition.
- `EDGE_INSECURE_POLL=1` is only needed when the Portainer server presents a self-signed certificate. The default Portainer install does that on `9443`, so keeping the flag is technically correct for this post’s setup.
- I validated the edited shell snippets with `bash -n` and validated the YAML snippets with Python YAML parsing. I could not run `docker`-based validation in this workspace because the `docker` CLI is not installed.
