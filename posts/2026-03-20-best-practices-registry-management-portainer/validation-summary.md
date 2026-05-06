# Validation Summary: Best Practices for Registry Management in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer registry management
- Docker registries and Docker Distribution
- Docker Compose
- Docker Engine daemon configuration
- Amazon ECR
- GitHub Container Registry
- Google Artifact Registry

## Sources Consulted
- Portainer registries overview: https://docs.portainer.io/admin/registries
- Portainer supported registry providers: https://docs.portainer.io/admin/registries/add
- Portainer custom registry setup: https://docs.portainer.io/admin/registries/add/custom
- Portainer Docker Hub registry setup: https://docs.portainer.io/admin/registries/add/dockerhub
- Portainer AWS ECR registry setup: https://docs.portainer.io/admin/registries/add/ecr
- Portainer GitHub registry setup: https://docs.portainer.io/admin/registries/add/ghcr
- Portainer per-environment registry access controls: https://docs.portainer.io/user/docker/host/registries and https://docs.portainer.io/user/docker/swarm/registries
- Portainer registry policies: https://docs.portainer.io/admin/environments/policies/docker-policies/registry-policy
- Docker Compose `pull_policy` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Hub personal access tokens: https://docs.docker.com/security/access-tokens/
- Docker Hub registry mirror documentation: https://docs.docker.com/docker-hub/image-library/mirror/
- Docker image prune reference: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Compose top-level `version` deprecation: https://docs.docker.com/reference/compose-file/version-and-name/
- CNCF Distribution configuration reference: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution deployment examples: https://distribution.github.io/distribution/about/deploying/
- Amazon ECR authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- GitHub Container Registry authentication: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Google Artifact Registry Docker API support: https://cloud.google.com/artifact-registry/docs/reference/docker-api

## Issues Found
- The supported registry list was inaccurate. I changed it so the post matches current Portainer providers, adds the missing GitLab and ProGet providers, and treats Google Artifact Registry as a custom Docker/OCI registry rather than a built-in Portainer provider.
- The ECR credential guidance did not match Portainer's current setup flow. I changed it from "IAM role or service account" to an IAM user for Portainer, because Portainer's documented ECR provider setup uses access keys for an IAM user.
- The GHCR credential guidance was too weak for Portainer's built-in GitHub provider. I changed it to a classic GitHub personal access token with the scopes Portainer requires.
- The registry access section used the wrong UI path and implied global scope. I corrected it to the environment-specific `Host/Swarm/Cluster > Registries > Manage access` flow and aligned the wording with Portainer's current access model.
- The self-hosted registry Compose example used the obsolete top-level `version` field and an older registry tag. I removed `version` and updated the example to `registry:3`, which matches current Docker/CNCF Distribution documentation.
- The image scanning section claimed a specific Portainer BE Trivy workflow and deployment-blocking behavior that is not documented in current Portainer docs. I replaced it with accurate guidance to use registry-side or CI/CD vulnerability scanning before deploying through Portainer.
- The pull policy example was not valid YAML because it repeated the top-level `services:` key. I rewrote it as a single valid example and updated `if_not_present` to the current Compose value `missing`.
- The registry mirror example had an undeclared named volume and paired an HTTPS daemon config example with a non-TLS mirror container. I updated it to `registry:3`, added TLS settings, declared the named volume, and enabled delete support for cache cleanup.

## Review Notes
- Registry access in Portainer is environment-specific. Portainer also documents registry policies under **Environment-related > Policies** for broader enforcement.
- If the private registry or mirror uses an internal or self-signed certificate authority, Docker hosts must trust that CA for pulls to succeed.
