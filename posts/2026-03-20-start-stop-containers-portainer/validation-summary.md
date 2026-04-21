# Validation Summary: How to Start and Stop Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer UI
- Portainer HTTP API
- Docker Engine API
- Docker CLI
- Bash, curl, and Python JSON parsing

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer CE 2.39.1 API specification: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer container details documentation: https://docs.portainer.io/user/docker/containers/view
- Portainer edit or duplicate container documentation: https://docs.portainer.io/user/docker/containers/edit
- Docker Engine API documentation: https://docs.docker.com/reference/api/engine/
- Docker Engine API v1.54 specification: https://docs.docker.com/reference/api/engine/version/v1.54.yaml
- Docker container run documentation: https://docs.docker.com/reference/cli/docker/container/run/
- Docker container inspect documentation: https://docs.docker.com/reference/cli/docker/container/inspect/

## Issues Found
- The Portainer authentication request used lowercase `username` and `password` keys. The official Portainer CE API schema defines the payload fields as `Username` and `Password`, so the JSON body was updated to match the documented schema.
- The duplicate-container example inspected only `.Config`, which does not show the full runtime configuration needed to recreate a container, such as host and networking settings. It now uses full `docker inspect` output.
- The duplicate-container `docker run` example placed a placeholder comment inside a backslash-continued command. In Bash, that causes the image line to be treated as a separate command. The note was moved into the preceding comment and the command was made executable.

## Review Notes
- The Portainer API access page currently emphasizes API access tokens with the `X-API-Key` header, while the CE 2.39.1 API specification still documents `/api/auth` JWT authentication and `Authorization: Bearer`. The post's JWT-based API example remains valid against the official API specification.
- The example uses `--insecure` for local HTTPS on `localhost:9443`; this is acceptable for a self-signed local Portainer instance but should not be copied blindly for production.
- The hardcoded Portainer environment ID `1` is environment-specific and may need to be changed by readers.
