# Validation Summary: How to Add GitLab Container Registry to Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- GitLab Container Registry
- GitLab CI/CD
- GitLab deploy tokens
- GitLab personal access tokens
- Docker / Docker-in-Docker
- Docker Compose

## Sources Consulted
- Portainer Documentation: Add a GitLab registry — https://docs.portainer.io/admin/registries/add/gitlab
- Portainer Documentation: Add a custom registry — https://docs.portainer.io/admin/registries/add/custom
- Portainer Documentation: Stack webhooks — https://docs.portainer.io/sts/user/docker/stacks/webhooks
- GitLab Docs: Authenticate with the container registry — https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab Docs: GitLab container registry — https://docs.gitlab.com/user/packages/container_registry/
- GitLab Docs: Personal access tokens — https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab Docs: Deploy tokens — https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab Docs: Authenticate with registry in Docker-in-Docker — https://docs.gitlab.com/ci/docker/authenticate_registry/
- GitLab Docs: Use Docker to build Docker images — https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Predefined CI/CD variables reference — https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Docs: CI/CD variables — https://docs.gitlab.com/ci/variables/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Verify repository client with certificates — https://docs.docker.com/engine/security/certificates/

## Issues Found
- The post originally treated Portainer's GitLab registry type and a generic custom registry as if they accepted the same GitLab credentials. Portainer's GitLab registry integration currently documents a personal access token with `read_api` and `read_registry`, while GitLab deploy tokens do not support GitLab API access. I corrected the introduction, token guidance, Portainer setup steps, and conclusion to separate the GitLab provider flow from the custom registry flow.
- The container image naming section was too restrictive. GitLab documents image names as `<registry>/<namespace>/<project>[/<optional path>]`, not as a mandatory extra image segment under every project. I corrected the pattern and examples.
- The personal access token creation steps were outdated and incomplete. GitLab's current UI uses **Edit profile → Access → Personal access tokens**, and the relevant token flow is the legacy PAT flow with the scopes required by Portainer's GitLab registry docs. I updated the navigation and scopes.
- The Portainer registry examples were inaccurate. The original `GitLab` example used a deploy token and included a hard-coded URL for `gitlab.com`, while Portainer's docs describe the GitLab provider as username plus PAT with optional override configuration. I rewrote the examples so the GitLab provider uses a PAT and the Custom registry example uses the deploy token.
- The `.gitlab-ci.yml` example used an incomplete Docker-in-Docker setup and `docker login -p`. GitLab's current docs recommend pinned Docker CLI/DinD images, `DOCKER_TLS_CERTDIR`, and `--password-stdin`. I updated the snippet to match the documented pattern.
- The Compose snippet used the top-level `version: "3.8"` field. Docker's current Compose reference marks the top-level `version` element as obsolete, so I removed it.
- The webhook section implied a stack webhook workflow without noting Portainer's edition caveat. Current Portainer docs document stack webhooks as a Business Edition feature on non-Edge environments. I added that limitation.
- The self-signed certificate troubleshooting section did not mention Docker's hostname-and-port directory naming for registries on non-default ports. I added that note.

## Review Notes
- The GitLab CI example assumes a runner that is already configured for Docker-in-Docker builds. Runner registration and privileged mode configuration are outside the scope of the post.
- Portainer registry access is tied to the Portainer environment and access model, so readers may still need to assign registry access appropriately after adding it.
- Group deploy tokens remain a good fit when GitLab Container Registry is added to Portainer as a Custom registry entry for multiple projects in the same group.
