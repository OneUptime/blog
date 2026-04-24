# Validation Summary: How to Set Up Tenant-Specific Registries in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker registries
- AWS ECR
- GitLab Container Registry
- Docker Compose
- CNCF Distribution (Docker Registry)

## Sources Consulted
- Portainer docs: Add a new registry - https://docs.portainer.io/admin/registries/add
- Portainer docs: Add a DockerHub account - https://docs.portainer.io/admin/registries/add/dockerhub
- Portainer docs: Add an AWS ECR registry - https://docs.portainer.io/admin/registries/add/ecr
- Portainer docs: Add a GitLab registry - https://docs.portainer.io/admin/registries/add/gitlab
- Portainer docs: Docker environment registries and access management - https://docs.portainer.io/user/docker/host/registries
- Portainer docs: API documentation index - https://docs.portainer.io/api/docs
- Portainer source: registry create handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_create.go
- Portainer source: registry configure handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_configure.go
- Portainer source: environment registry access handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_registry_access.go
- Portainer source: registry list handlers - https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_list.go
- Portainer source: environment registries list handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_registries_list.go
- Portainer source: auth handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: ECR token refresh logic - https://github.com/portainer/portainer/blob/develop/api/internal/registryutils/ecr_reg_token.go
- AWS docs: Amazon ECR authorization data - https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_AuthorizationData.html
- Docker docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker docs: Version top-level element (obsolete) - https://docs.docker.com/reference/compose-file/version-and-name/
- CNCF Distribution docs: Deploy a registry server - https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution docs: Registry configuration and htpasswd auth - https://distribution.github.io/distribution/about/configuration/

## Issues Found
- The post described GitLab Container Registry as using a deploy token. I changed this to a username plus personal access token with `read_api` and `read_registry` scopes because that is what current Portainer documentation specifies.
- The post implied registry access management was global under **Registries > [registry name]**. I corrected this to the environment-specific **Host/Swarm/Cluster > Registries** flow because Portainer documents registry access as applying per environment, not globally.
- The custom registry API example used `Type: 1`, which is Quay.io in current Portainer. I changed it to `Type: 3`, which is the current custom registry type.
- The access-control API example used `PUT /api/registries/{id}/configure` with `TeamAccessPolicies`. I corrected this to `PUT /api/endpoints/{endpointId}/registries/{registryId}` because the `configure` endpoint is for auth/TLS settings, while environment-specific registry access is managed on the endpoint route.
- The example referenced `TEAM_A_ID` without defining it. I added `ENDPOINT_ID` and `TEAM_A_ID` variables so the snippet is internally consistent.
- The ECR API example used nonexistent top-level fields (`AWSAccessKeyID`, `AWSSecretAccessKey`, `AWSRegion`) and put the wrong values in `Username` and `Password`. I changed it to the current Portainer payload shape: IAM access key in `Username`, secret access key in `Password`, and the region inside `Ecr.Region`.
- The post said ECR tokens are auto-refreshed by Portainer Business Edition. I corrected this to say Portainer refreshes them when needed, which matches the current server logic and is not scoped to BE in the implementation I reviewed.
- The self-hosted registry example used htpasswd auth without TLS and an incorrect `docker run ... htpasswd` invocation. I updated the Compose snippet to include TLS settings and corrected the credential-generation command to use `--entrypoint htpasswd -Bbn`, which the current Distribution docs require.
- The Compose example used the obsolete top-level `version` field. I removed it to match the current Compose specification.
- The verification example had a standard user call `GET /api/registries`, but that route is admin-only in current Portainer. I changed it to `GET /api/endpoints/{endpointId}/registries`, which is the correct environment-scoped listing route for authenticated users.

## Review Notes
- The self-hosted registry example now assumes certificate files already exist under `./certs`.
- Registry visibility does not grant environment access by itself; the team must already have access to the target environment for the registry access assignment to matter.
