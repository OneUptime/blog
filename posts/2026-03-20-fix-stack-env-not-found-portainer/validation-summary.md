# Validation Summary: How to Fix stack.env Not Found Errors in Portainer

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Portainer HTTP API
- Git-based stack deployment and webhooks

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: Webhooks — https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Documentation: Environment Variable Management in Docker: .env vs. stack.env — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer Documentation: How do automatic updates for stacks/applications work? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Documentation: Accessing the Portainer API — https://docs.portainer.io/api/access
- Portainer API Documentation (CE 2.39.1 OpenAPI) — https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Docs: Compose file reference — https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Interpolation — https://docs.docker.com/reference/compose-file/interpolation/
- Docker Docs: Variable interpolation and `.env` files — https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/

## Issues Found
1. The Compose example used the obsolete top-level `version: "3.8"` field. I removed it to align the snippet with the current Compose Specification, where `version` is retained only for backward compatibility and is reported as obsolete.

2. The web editor example implied it could be pasted and deployed as-is, but the PostgreSQL service depended on `${DB_PASSWORD}` being defined first. I added a note telling readers to define `DB_PASSWORD` in Portainer before deployment.

3. The API example for creating a stack was outdated. `POST /api/stacks` with `name`, `stackFileContent`, `type`, and `endpointId` in the JSON body does not match the current Portainer API. I replaced it with the documented standalone stack creation endpoint, `POST /api/stacks/create/standalone/string?endpointId=1`, and corrected the payload fields to `Name`, `StackFileContent`, and `Env`.

4. The API example used the older JWT login flow even though current Portainer docs center access-token authentication with `X-API-Key`. I updated the example to use an API access token, which matches the current access documentation and avoids an unnecessary login step in the snippet.

5. The webhook section was misleading. It omitted that stack webhooks are documented as a Portainer Business Edition feature and are unavailable on Edge environments, and it described the redeploy behavior as `--pull-always`, which is not how the Portainer docs describe it. I corrected the note to match the official webhook documentation.

6. The `stack.env` explanation was incorrect. The post said the error happened because Docker Compose expected a `.env` file next to the compose file, but `stack.env` is a Portainer-specific pattern. I corrected the cause and fixes to reflect Portainer’s documented behavior: `stack.env` is for Docker Standalone and Podman, while Docker Swarm does not support `env_file` in `docker stack deploy` and requires variables to be defined individually in Portainer.

## Review Notes
- The post now reflects current Portainer CE 2.39.1 API paths and current Portainer documentation as of April 30, 2026.
- For Git-based stacks, Portainer can also process a repository `.env` file, but Portainer’s docs note this is separate from `stack.env` behavior and should not be conflated with Swarm deployments.
- The webhook example remains valid as a simple trigger example, but readers should be aware it applies to the documented Business Edition stack webhook feature.
