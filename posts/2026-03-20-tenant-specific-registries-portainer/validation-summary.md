# Validation Summary: How to Set Up Tenant-Specific Registries in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Portainer registry management and API
- Docker / Docker Compose
- CNCF Distribution registry
- Apache htpasswd
- NGINX reverse proxy and Basic Authentication
- Docker CLI image login, tag, push, and pull workflows

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer CE 2.39.1 OpenAPI specification: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE 2.39.1 OpenAPI specification: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Docker environment registry access documentation: https://docs.portainer.io/user/docker/host/registries
- Portainer 2.39.1 source for endpoint registry access: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/endpoint_registry_access.go
- Portainer 2.39.1 source for registry access checks: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/registries/handler.go
- CNCF Distribution registry configuration reference: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution registry deployment guide: https://distribution.github.io/distribution/about/deploying/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI login reference: https://docs.docker.com/reference/cli/docker/login/
- Docker CLI push reference: https://docs.docker.com/reference/cli/docker/image/push/
- Docker CLI tag reference: https://docs.docker.com/reference/cli/docker/image/tag/
- Apache htpasswd documentation: https://httpd.apache.org/docs/current/en/programs/htpasswd.html
- NGINX SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- NGINX HTTP Basic Auth module documentation: https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html
- NGINX reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy

## Issues Found
- The Portainer registry creation payload used `"Type": 1`, which is Quay.io in the current Portainer API. Changed tenant registries to `"Type": 3` for custom registries.
- The Portainer examples used a JWT bearer header for the admin token, while current Portainer access-token documentation uses `X-API-Key`. Changed admin automation examples to use `X-API-Key`.
- The registry access endpoint `/api/registries/{id}/access` is not in the current Portainer API. Changed access updates to the supported environment-scoped endpoint `/api/endpoints/{id}/registries/{registryId}`.
- The access payload used obsolete `AuthorizedTeams` / `AuthorizedUsers` arrays. Replaced it with `TeamAccessPolicies` and `UserAccessPolicies`, matching Portainer's current registry access model.
- The post implied registry access was global. Portainer's Docker registry access is environment-scoped, so the examples now define `ENVIRONMENT_ID` and verify access through `/api/endpoints/{id}/registries`.
- The verification example used `/api/registries/{id}/repositories`, which is not a supported repository listing endpoint in the current CE API. Replaced it with a supported registry inspection check using `?endpointId=...` and the expected 403 response.
- The Compose snippets used the obsolete top-level `version` field. Removed it to align with the current Compose Specification.
- The registry examples used `registry:2` and plain HTTP with Basic Auth. Updated to current `registry:3`, added TLS certificate configuration, and set `"TLS": true` in Portainer registry registration.
- The nginx proxy example mounted no htpasswd files, referenced paths that did not match the generated htpasswd files, and enabled `listen 443 ssl` without certificate directives. Added the auth mount, corrected htpasswd paths, and added `ssl_certificate` / `ssl_certificate_key`.
- The nginx file was mounted as `/etc/nginx/nginx.conf` but had `server` and `upstream` at the top level. Wrapped the config in valid `events` and `http` blocks.
- The Docker push example did not authenticate before pushing to the private registry. Added `docker login --password-stdin` before tagging and pushing.
- The conclusion overstated what Portainer alone enforces. Clarified that Portainer restricts registry visibility/use inside an environment, while registry credentials enforce direct push and pull access.

## Review Notes
- The `htpasswd -Bbn` commands are syntactically valid and generate bcrypt hashes, but Apache discourages `-b` for real passwords because plaintext appears on the command line. For production, prefer prompting or secret-managed automation.
- TLS certificates in the examples must be trusted by Portainer and by Docker clients using the registries.
- GitHub Container Registry support in Portainer may depend on edition and version; custom registries should support the Docker Registry HTTP API V2 expected by Portainer.
