# Validation Summary: How to Add GitLab Container Registry to Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- GitLab Container Registry
- GitLab deploy tokens
- GitLab personal access tokens
- Docker CLI
- GitLab CI/CD

## Sources Consulted
- Portainer Docs: Add a GitLab registry - https://docs.portainer.io/admin/registries/add/gitlab
- Portainer Docs: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer Docs: Add a new registry - https://docs.portainer.io/admin/registries/add
- GitLab Docs: GitLab container registry - https://docs.gitlab.com/user/packages/container_registry/
- GitLab Docs: Authenticate with the container registry - https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab Docs: Deploy tokens - https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab Docs: Personal access tokens - https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab Docs: Build and push container images to the container registry - https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/
- Docker Docs: docker login - https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The post said Portainer uses `Settings > Registries`. Portainer's current docs use the main **Registries** menu, so I corrected the navigation path.
- The post implied Portainer's **GitLab** registry option could use either a personal access token or a deploy token. Portainer's official GitLab integration requires a personal access token with `read_api` and `read_registry`, so I corrected that flow.
- The post did not distinguish between Portainer's **GitLab** provider and **Custom registry** provider. I updated the instructions so deploy tokens are used with **Custom registry**, which aligns with GitLab's registry authentication model and Portainer's custom registry documentation.
- The personal access token section listed an outdated GitLab UI path and the wrong minimum scopes. I changed it to the current profile path and updated the scopes to `read_api` and `read_registry` for Portainer's GitLab integration.
- The overview overstated the GitLab.com registry path as a universal GitLab path. I corrected it to the GitLab.com-specific naming convention and included the optional path segment supported by GitLab.
- The `docker login` examples used `-p`. That flag is still supported, but both GitLab and Docker recommend `--password-stdin`, so I updated the commands to the current documented pattern.
- The self-hosted GitLab section said the setup was identical. I corrected it to reflect the actual Portainer behavior for self-hosted GitLab, where you either use **GitLab** with overridden defaults or **Custom registry** with the configured registry hostname.

## Review Notes
- The stack example is syntactically valid for a Swarm-style stack file. In Compose v2 tooling, the top-level `version` key is considered obsolete, but keeping it here is still workable for Portainer stack documentation.
- The CI/CD snippet is valid, but Docker-in-Docker still depends on runner-side DinD prerequisites outside the scope of this post.
