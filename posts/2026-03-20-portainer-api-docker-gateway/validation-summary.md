# Validation Summary: How to Use the Portainer API as a Docker API Gateway - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Docker CLI contexts and remote hosts
- Python `requests`
- HTTP authentication headers

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer API access tokens: https://docs.portainer.io/api/access
- Portainer logs overview: https://docs.portainer.io/admin/logs
- Portainer activity logs: https://docs.portainer.io/admin/logs/activity
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- Docker CLI reference (`docker`, `-H`, `DOCKER_HOST`, supported protocols): https://docs.docker.com/reference/cli/docker/
- Docker contexts reference: https://docs.docker.com/engine/manage-resources/contexts/
- Docker Engine SDK/API examples: https://docs.docker.com/reference/api/engine/sdk/examples/
- Docker Engine OpenAPI specification (official Moby source): https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml
- Docker authconfig implementation for `X-Registry-Auth` encoding (official Moby source): https://raw.githubusercontent.com/moby/moby/master/api/pkg/authconfig/authconfig.go

## Issues Found
- The original Step 3 incorrectly described Portainer as a drop-in Docker remote context. Docker contexts and `DOCKER_HOST` target direct daemon sockets or hosts, while Portainer's gateway is path-based under `/api/endpoints/{id}/docker/...`. I rewrote that section to show the correct approach: using a custom HTTP client against Portainer's gateway URL.
- The original Step 3 Python example was labeled as Docker SDK usage, but it actually used `requests`, included an unused `docker` import, and omitted `raise_for_status()` on write operations. I corrected the label, removed the unused import, and added status checks so the example matches what it is doing.
- The private-registry pull example encoded `X-Registry-Auth` with plain `base64`, which can introduce line-wrapping issues and does not match Docker's documented base64url encoding. I updated the command to generate a newline-free base64url value.
- The security benefits section overstated two claims. I narrowed the logging claim to Portainer BE's documented authentication/activity logs and qualified TLS so it is explicitly tied to HTTPS access.

## Review Notes
- Docker's Engine API docs recommend versioned API paths for direct HTTP clients. Portainer's own gateway examples commonly show unversioned paths, so the post remains functional, but version-pinning is safer for long-lived automation.
