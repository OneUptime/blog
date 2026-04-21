# Validation Summary: How to Set Up Stack Auto-Updates from Git in Portainer (Polling) (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Portainer GitOps updates and stack webhooks
- Portainer HTTP API
- Docker Compose
- Environment variable files

## Sources Consulted
- Portainer documentation: Add a new stack, including Git repository deployment, GitOps polling, Re-pull image, and environment variables: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer API documentation landing page and CE 2.40.0 OpenAPI schema: https://docs.portainer.io/api/docs and https://api-docs.portainer.io/versions/ce/2.40.0.yaml
- Portainer documentation: Deprecated and removed features, including removal of `POST /stacks`: https://docs.portainer.io/sts/advanced/deprecated
- Portainer documentation: Stack webhooks and `pullimage=false`: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Docker Compose file reference: obsolete top-level `version` property: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose documentation: `env_file` paths and environment variables: https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/

## Issues Found
- The Compose examples used `version: "3.8"`. Docker Compose now treats the top-level `version` property as obsolete, so I removed it from the YAML and API stack content.
- The API example used the removed `POST /api/stacks` endpoint with `type` and `endpointId` in the JSON body. Current Portainer versions use routes such as `/api/stacks/create/standalone/string?endpointId=1`, so I updated the endpoint and payload field names to match the OpenAPI schema.
- The authentication payload used lowercase `username` and `password`; the current OpenAPI schema documents `Username` and `Password`, so I updated the example.
- The webhook comment claimed Portainer redeploys with `--pull-always`. The official documentation describes default image pulling for stack webhooks and `pullimage=false` to disable it, so I changed the comment to avoid an inaccurate CLI flag.
- The `stack.env` troubleshooting section said Docker Compose expects a `.env` file beside `compose.yml`. The error is about a referenced `env_file`, so I corrected the cause and fixes to distinguish `env_file`, repository files, and Portainer-provided environment variables.

## Review Notes
The Git repository deployment and polling workflow matches current Portainer documentation. Portainer API authentication also supports API access tokens via `X-API-Key`; the JWT example remains valid according to the OpenAPI security definitions, but an API token is usually preferable for automation.
