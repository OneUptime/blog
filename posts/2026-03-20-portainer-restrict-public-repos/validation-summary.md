# Validation Summary: How to Restrict Public Repository Usage in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker image registries
- Docker CLI
- Trivy
- Syslog / SIEM log streaming
- Bash shell scripting

## Sources Consulted
- Portainer docs: Add a custom registry — https://docs.portainer.io/admin/registries/add/custom
- Portainer docs: Registries for Docker environments — https://docs.portainer.io/user/docker/host/registries
- Portainer docs: Policies overview — https://docs.portainer.io/admin/environments/policies
- Portainer docs: Docker registry policy — https://docs.portainer.io/admin/environments/policies/docker-policies/registry-policy
- Portainer docs: API documentation landing page — https://docs.portainer.io/api/docs
- Portainer docs: Activity logs — https://docs.portainer.io/admin/logs/activity
- Portainer docs: Stream auth and activity logs to an external provider — https://docs.portainer.io/sts/advanced/siem
- Portainer source: registry create handler — https://github.com/portainer/portainer/blob/master/api/http/handler/registries/registry_create.go
- Portainer source: endpoint registry access handler — https://github.com/portainer/portainer/blob/master/api/http/handler/endpoints/endpoint_registry_access.go
- Portainer source: registry types and access policy structs — https://github.com/portainer/portainer/blob/master/api/portainer.go
- Docker docs: `docker image pull` — https://docs.docker.com/reference/cli/docker/image/pull/
- Docker docs: `docker image tag` — https://docs.docker.com/reference/cli/docker/image/tag/
- Docker docs: `docker image push` — https://docs.docker.com/reference/cli/docker/image/push/
- Trivy docs: installation and container image usage — https://trivy.dev/docs/latest/getting-started/installation/
- Trivy docs: `trivy image` CLI reference — https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_image/
- Trivy docs: container image scanning behavior — https://trivy.dev/docs/dev/guide/target/container_image/

## Issues Found
- The post description, introduction, and conclusion overstated Portainer's enforcement model. I updated them to reflect the documented behavior: Portainer can add approved registries, hide anonymous Docker Hub in the UI, and limit registry access per environment, but fully blocking public pulls requires additional controls outside Portainer.
- The registry creation API example used `Type: 6`, which is not the custom registry type. I changed it to `Type: 3`, matching Portainer's custom registry type in the official source.
- The UI section referenced undocumented settings such as "Restrict users from pulling Docker Hub images", "Restrict public images", and "Restrict users to use defined registries only". I replaced that section with the documented workflow: hide anonymous Docker Hub, manage access from the environment's Registries view, and optionally use Business Edition registry policies.
- The API section used `PUT /api/settings` with unrelated fields (`allowPrivilegedModeForRegularUsers`, `enableHostManagementFeatures`), which does not configure registry restrictions. I replaced it with the supported per-environment registry access endpoint: `PUT /api/endpoints/{id}/registries/{registryId}`.
- The Trivy example ran the scanner in a container without mounting the Docker socket and counted findings by grepping human-readable output, which is not a reliable validation method. I updated it to a supported containerized Trivy invocation with the Docker socket mounted and `--exit-code` used for CRITICAL findings.
- The alerting section relied on `docker logs ... | grep ...` patterns that are not documented by Portainer as a supported way to detect registry-policy violations. I replaced it with Portainer's documented Activity logs / SIEM streaming approach.

## Review Notes
- Portainer's docs explicitly state that hiding anonymous Docker Hub does not fully disable Docker Hub access, because anonymous Docker Hub access is built into Docker itself.
- Docker registry policies in Portainer are a Business Edition feature and currently apply only to Edge (Standard) Agent environments running Portainer 2.37.0 or later.
- Portainer's published API documentation does not fully reflect all current registry-related fields and routes, so the API examples were cross-checked against the official Portainer source code.
- The Trivy example remains technically valid with `aquasec/trivy:latest`, but pinning a specific Trivy version would improve reproducibility in future revisions.
