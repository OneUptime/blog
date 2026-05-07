# Validation Summary: How to Add GitHub Container Registry (GHCR) to Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- GitHub Container Registry (GHCR)
- GitHub Actions
- Docker CLI
- Docker Compose

## Sources Consulted
- Portainer Documentation: Add a new registry - https://docs.portainer.io/admin/registries/add
- Portainer Documentation: Add a GitHub registry - https://docs.portainer.io/admin/registries/add/ghcr
- Portainer Documentation: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Portainer Documentation: What scopes are required for GitHub, GitLab and Bitbucket tokens? - https://docs.portainer.io/faqs/getting-started/what-scopes-are-required-for-github-gitlab-and-bitbucket-tokens
- GitHub Docs: Working with the Container registry - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs: Publishing Docker images - https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- GitHub Docs: Publishing and installing a package with GitHub Actions - https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- Docker Docs: docker login - https://docs.docker.com/reference/cli/docker/login/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Portainer navigation path was outdated. I changed `Settings > Registries` to `Registries` to match current Portainer documentation.
- The setup steps mixed Portainer's custom registry flow with its dedicated GitHub provider. I clarified that `Custom registry` is the general option and that the `GitHub` provider is an extra Portainer Business Edition option.
- The PAT scope guidance was incomplete. I updated it to distinguish `read:packages` for private-image pulls via a custom registry from the `write:packages`, `delete:packages`, and `repo` scopes Portainer documents for its GitHub provider.
- The Docker CLI login example used `GITHUB_TOKEN` for a local PAT login. I changed it to `CR_PAT` to match GitHub's GHCR documentation and avoid confusion with the workflow-only `GITHUB_TOKEN`.
- The Compose example used the top-level `version` key, which Docker now marks as obsolete. I removed `version: "3.8"`.
- The GitHub Actions workflow omitted explicit token permissions for GHCR publishing. I added `contents: read` and `packages: write`, which GitHub documents for `GITHUB_TOKEN`-based package publishing.

## Review Notes
- Public GHCR images can be pulled anonymously. Portainer registry credentials are primarily needed for private images or for consistent authenticated pulls during deployments.
