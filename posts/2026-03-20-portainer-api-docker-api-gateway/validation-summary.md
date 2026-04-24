# Validation Summary: How to Use the Portainer API as a Docker API Gateway

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Portainer Business Edition / Community Edition
- Docker Engine API
- Docker CLI
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer API documentation overview - https://docs.portainer.io/api/docs
- Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer CE OpenAPI spec 2.39.1 - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE OpenAPI spec 2.39.1 - https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer logs overview - https://docs.portainer.io/admin/logs
- Portainer activity logs - https://docs.portainer.io/admin/logs/activity
- Portainer roles documentation - https://docs.portainer.io/sts/admin/user/roles
- Portainer Docker roles and permissions - https://docs.portainer.io/sts/advanced/docker-roles-and-permissions
- Portainer HTTPS / SSL documentation - https://docs.portainer.io/advanced/ssl
- Docker CLI `docker` reference (`-H`, `DOCKER_HOST`) - https://docs.docker.com/reference/cli/docker/
- Docker daemon socket and security guidance - https://docs.docker.com/reference/cli/dockerd/
- Docker Engine API reference and versioning guidance - https://docs.docker.com/reference/api/engine/

## Issues Found
- The post described Portainer logging as if every API call always produced a full audit trail. Portainer's current docs describe authentication and activity logs as Business Edition features, so I changed the logging claims and comparison table to be edition-specific.
- The post described RBAC as a generic Portainer capability. Current Portainer docs state granular RBAC is a Business Edition feature, so I changed the wording to distinguish general environment access control from Business Edition RBAC.
- The post claimed Portainer "handles TLS termination" without qualification. Current Portainer docs state the UI and API are exposed over HTTPS by default on port `9443`, so I replaced that wording with the documented behavior.
- The `DOCKER_HOST` section was technically incorrect. Docker's docs show `DOCKER_HOST` points the Docker CLI at a Docker daemon host, while Portainer's gateway is mounted under `/api/endpoints/{id}/docker`, so the Docker CLI cannot use Portainer as a drop-in daemon endpoint. I rewrote that section to explain the limitation instead of recommending a non-working configuration.
- The wrapper script and comparison examples used `Authorization: Bearer` with a generic API token variable. Current Portainer access-token docs and API usage examples use `X-API-Key` for access tokens, so I updated the examples to use an access-token header and renamed the variables accordingly.
- The environment-permissions example used an incorrect endpoint shape (`/api/users/{USER_ID}/permissions`) and request body. The current OpenAPI spec shows user creation on `/api/users`, role discovery on `/api/roles`, and environment access updates via `PUT /api/endpoints/{ENDPOINT_ID}` with `UserAccessPolicies`, so I replaced the snippet with the documented model and marked it as Business Edition.
- The wrapper script treated any second argument to `ps` as `all=true` while the usage text did not document that. I tightened the script so only `ps all` triggers `?all=true`, and updated the usage line to match.

## Review Notes
- The example `curl` calls use Docker API version `v1.43`. Docker's current docs recommend specifying a version supported by the daemon you are targeting; newer engines document newer versions as well.
- Portainer's UI uses the term "environment", while the API path remains `/api/endpoints/...`; this is expected and matches the current docs and OpenAPI spec.
- The commands and request shapes were checked against official documentation and the current Portainer OpenAPI specs, but they were not executed against a live Portainer instance in this workspace.
