# Validation Summary: How to Manage Registries via the Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Container registries in Portainer
- AWS ECR
- Docker Hub
- GitHub Container Registry (GHCR)
- Kubernetes registry access
- `curl`
- `jq`

## Sources Consulted
- Portainer docs: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer docs: API documentation - https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI schema - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE 2.39.1 OpenAPI schema - https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer docs: Add an AWS ECR registry - https://docs.portainer.io/admin/registries/add/ecr
- Portainer docs: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer docs: Add a GitHub registry - https://docs.portainer.io/admin/registries/add/ghcr
- AWS CLI docs: `aws ecr get-login-password` - https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Portainer source: registry creation handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/registries/registry_create.go
- Portainer source: registry update handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/registries/registry_update.go
- Portainer source: endpoint registry access handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/endpoint_registry_access.go
- Portainer source: ECR token handling - https://github.com/portainer/portainer/blob/2.39.1/api/internal/registryutils/ecr_reg_token.go

## Issues Found
- The post used `Authorization: Bearer` for Portainer API access tokens. I changed the examples to `X-API-Key`, which is the current authentication method documented for Portainer access tokens.
- The registry type table was outdated and mapped several enum values incorrectly. I corrected the current type values and noted that GHCR is Portainer Business Edition only.
- The custom registry example used the wrong `Type` value. I changed it from `1` to `3`, and added `"TLS": true` so the API example matches Portainer's HTTPS-oriented custom-registry behavior when no `http://` scheme is intended.
- The AWS ECR example used the wrong registry type and passed the output of `aws ecr get-login-password` as the registry password. I corrected the type to `7` and updated the example to use AWS access key ID, secret access key, and region, which is what Portainer expects for ECR registries.
- The "Refreshing ECR Token" section was technically incorrect because it treated Portainer's stored ECR credentials as a short-lived Docker login token. I replaced it with a correct update example for the stored AWS ECR credentials.
- The environment-assignment example omitted the required JSON body for `/api/endpoints/{id}/registries/{registryId}`. I updated it to a valid Kubernetes namespace access example.
- The conclusion recommended automating manual ECR token rotation via the registry API. I corrected that guidance to point readers to the required AWS credential model instead of `aws ecr get-login-password`.

## Review Notes
- The review was validated against Portainer 2.39.1 documentation and source.
- The `/api/endpoints/{id}/registries/{registryId}` payload differs by environment type: Kubernetes uses `Namespaces`, while Docker/Podman environments use `UserAccessPolicies` and `TeamAccessPolicies`.
- No live Portainer instance was exercised during review; validation was performed against official documentation, OpenAPI schemas, and Portainer source.
