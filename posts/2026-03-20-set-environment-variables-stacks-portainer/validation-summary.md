# Validation Summary: How to Set Environment Variables for Stacks in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Portainer API
- Docker Compose
- Docker images and volumes
- GitOps updates and stack webhooks

## Sources Consulted
- Portainer documentation: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer documentation: Inspect or edit a stack - https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer documentation: Stack webhooks - https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer CE API documentation - https://api-docs.portainer.io/?edition=ce&version=2.40.0
- Portainer CE OpenAPI schema - https://api-docs.portainer.io/versions/ce/2.40.0.yaml
- Docker Compose documentation: Interpolation - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose documentation: Set environment variables - https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker Compose file reference: Version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` field. Removed it so the examples follow the current Compose Specification.
- The Portainer API example used the removed `POST /api/stacks` endpoint with `type` and `endpointId` in the JSON body. Updated it to use `POST /api/stacks/create/standalone/string?endpointId=1`, which is the current API shape for deploying a Docker Standalone Compose stack from file content.
- The Portainer API JSON payload used lowercase field names for `name`, `stackFileContent`, and `env`. Updated the payload to the field names shown in the OpenAPI schema: `Name`, `StackFileContent`, `Env`, and `FromAppTemplate`.
- The Git stack instructions used the shorter label `Repository`. Updated it to `Git Repository`, matching the current Portainer UI documentation.
- The webhook comment said Portainer redeploys with `--pull-always` and did not mention Portainer's availability limitation. Updated it to say Portainer redeploys and pulls images by default, and added the Business Edition/non-Edge environment caveat from the webhook documentation.
- The `stack.env` troubleshooting note confused Compose interpolation `.env` files with the `env_file: stack.env` service attribute. Updated the cause and fixes to distinguish missing `stack.env` files from Portainer stack environment variables and the Docker Swarm limitation.

## Review Notes
The post is now technically accurate for current Portainer 2.40 STS API documentation and current Docker Compose behavior.
