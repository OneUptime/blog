# Validation Summary: How to Set Up Stack Webhooks for Remote Redeployment in Portainer - Remote

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Portainer API
- Portainer stack webhooks
- Docker Compose
- GitOps polling and webhook updates

## Sources Consulted
- Portainer documentation: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer documentation: Stack webhooks - https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer documentation: Accessing the Portainer API - https://docs.portainer.io/sts/api/access
- Portainer documentation: Deprecated and removed features - https://docs.portainer.io/sts/advanced/deprecated
- Portainer CE API 2.40.0 OpenAPI specification - https://api-docs.portainer.io/versions/ce/2.40.0.yaml
- Docker Compose file reference: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose environment variable interpolation - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose environment variables and env_file - https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it because the current Compose Specification treats `version` as obsolete and only informative.
- The API example used the removed `POST /api/stacks` endpoint and old request shape. Updated it to `POST /api/stacks/create/standalone/string?endpointId=...` with the current `Name`, `StackFileContent`, and `Env` payload fields.
- The API example used an inline password login flow. Updated it to use the documented `X-API-Key` access token header.
- The webhook section implied a `--pull-always` behavior/flag. Updated the wording to match Portainer's webhook behavior: redeploy and pull the latest image for the existing tag by default, with `pullimage=false` available to prevent pulling.
- The webhook section omitted the Portainer Business Edition and non-Edge environment limitation. Added that caveat.
- The `stack.env` troubleshooting note incorrectly described the cause as Docker Compose expecting a `.env` file. Updated it to distinguish `env_file: stack.env` from Compose `.env` interpolation and to note Docker Standalone/Podman versus Docker Swarm handling.

## Review Notes
The examples still use placeholder URLs and `--insecure` for local/self-signed TLS scenarios. Production examples should prefer trusted TLS certificates and avoid `latest` image tags where reproducibility matters.
