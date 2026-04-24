# Validation Summary: How to Troubleshoot Registry Authentication Issues in Portainer

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer
- Docker Engine and `docker login`
- Docker Registry HTTP API v2 / CNCF Distribution
- AWS Elastic Container Registry (ECR)
- Azure Container Registry (ACR)
- GitLab Container Registry
- Harbor robot accounts
- DNS, TLS, and Docker daemon registry configuration

## Sources Consulted
- Portainer Docs, Add a new registry: https://docs.portainer.io/admin/registries/add
- Portainer Docs, Add a DockerHub account: https://docs.portainer.io/sts/admin/registries/add/dockerhub
- Portainer Docs, Add an AWS ECR registry: https://docs.portainer.io/admin/registries/add/ecr
- Portainer Docs, Add an Azure registry: https://docs.portainer.io/admin/registries/add/azure
- Portainer Docs, Add a GitLab registry: https://docs.portainer.io/admin/registries/add/gitlab
- Docker Docs, Registry authentication: https://docs.docker.com/reference/api/registry/auth/
- CNCF Distribution, HTTP API V2: https://distribution.github.io/distribution/spec/api/
- Docker Docs, `docker login`: https://docs.docker.com/reference/cli/docker/login/
- Docker Docs, Verify repository client with certificates: https://docs.docker.com/engine/security/certificates/
- Amazon ECR Docs, Private registry authentication in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Microsoft Learn, `az acr`: https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest
- Microsoft Learn, Troubleshoot Azure Container Registry authentication issues: https://learn.microsoft.com/mt-mt/troubleshoot/azure/azure-container-registry/acr-authentication-errors
- Microsoft Learn, Authenticate with Azure Container Registry from Azure Container Instances: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-aci
- Microsoft Learn, Azure Container Registry Microsoft Entra permissions and role assignments overview: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview
- GitLab Docs, Deploy tokens: https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab Docs, Authenticate with the container registry: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- Harbor Docs, Create System Robot Accounts: https://goharbor.io/docs/edge/administration/robot-accounts/

## Issues Found
- Step 1 used invalid `docker pull` placeholders such as `...` and wildcard hostnames like `*.amazonaws.com`, which are not runnable image references. Replaced them with valid example image references for each registry family.
- Step 2 used `curl -I` and implied `403 Forbidden` was the normal auth-failure signal for a registry ping. Updated this to `curl -i`, aligned the expected `200/401/404` outcomes with the Docker Registry v2 auth flow, and clarified that `403` usually indicates proxy or policy interference rather than the normal auth challenge.
- Step 3 treated `_catalog` and Docker Hub web API calls as generic credential tests. Reworked the examples so they match provider behavior: basic-auth registry ping for custom registries, PAT-based `docker login` for Docker Hub, ECR authorization-token usage for HTTP API requests, and `docker login` for ACR.
- Step 4 used `docker login --password`, which is valid but not the recommended secure non-interactive pattern. Updated it to `--password-stdin`, consistent with current Docker documentation and the surrounding troubleshooting guidance.
- Step 5 incorrectly said GitLab robot accounts use the `robot$` prefix and implied special-character escaping was a Portainer UI concern. Corrected the username guidance to distinguish Harbor robot accounts from GitLab deploy-token usernames, and replaced the escaping note with more accurate copy/paste and hidden-whitespace failure modes.
- Step 7 checked `aws ecr describe-repositories` as if it validated an ECR registry token and used `az ad sp show` as if it validated ACR pull access. Replaced this with a fresh ECR login test, clarified the difference between Portainer's native AWS ECR registry integration and a custom ECR registry entry, and switched the ACR check to `az acr check-health` plus a permission note.
- Step 8 suggested checking DNS from inside the Portainer container, which is not the authoritative pull path for Docker image resolution. Narrowed the guidance to the Docker host or Portainer Agent node, which is where image pulls actually originate.
- The diagnostic checklist repeated the incorrect GitLab `robot$` guidance. Updated it to match Harbor and GitLab's actual username conventions.

## Review Notes
- The post is technically sound after the corrections above.
- For Azure Container Registry, the exact pull role can vary by registry permission mode. Some environments use `AcrPull`, while ABAC-enabled registries can use repository-scoped reader roles.
- For self-signed registries, Docker daemon trust is the key fix for image pulls. In some Portainer features that connect directly to external services, additional CA trust on Portainer server or agent containers may also matter.
