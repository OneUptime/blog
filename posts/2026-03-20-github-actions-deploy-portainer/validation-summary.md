# Validation Summary: How to Use GitHub Actions to Deploy to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitHub Actions
- GitHub Container Registry (GHCR)
- Docker Buildx and Docker image publishing
- Portainer API
- Portainer stack webhooks
- GitHub Environments
- `curl`
- `jq`
- YAML workflow configuration

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer Community Edition 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer stack webhooks docs: https://docs.portainer.io/user/docker/stacks/webhooks
- GitHub Docs, publishing and installing a package with GitHub Actions: https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions?learn=continuous_deployment&learnProduct=actions
- GitHub Docs, publishing Docker images: https://docs.github.com/actions/tutorials/publish-packages/publish-docker-images
- GitHub Docs, automatic token authentication and workflow permissions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication

## Issues Found
- The post implied that stack webhooks are a general Portainer feature. I updated the introduction and basic webhook section to state that stack webhooks are used on Portainer Business Edition webhook-enabled stacks.
- The GitHub Actions workflows pushed to GHCR with `GITHUB_TOKEN` but did not declare the required workflow permissions. I added `contents: read` and `packages: write` to both workflows, matching GitHub's documented pattern for package publishing.
- The staging deployment example used `POST /api/stacks/{id}/images/update?pullImage=true`, which does not match the current Portainer stack redeploy endpoint for Git-based stacks. I replaced it with the documented `PUT /api/stacks/{id}/git/redeploy` call, including the required JSON body and `endpointId`.
- The secrets table was missing `PORTAINER_WEBHOOK_URL` even though the basic workflow used it. I added the missing secret entry.
- The rollback workflow was only a placeholder `echo` and would not roll back anything. I replaced it with a working Portainer webhook-based rollback example that passes the selected image tag with `?tag=...`.

## Review Notes
- The API-based staging example now explicitly targets a Git-based Portainer stack. File-based stacks use different update endpoints.
- Portainer's webhook docs note that stack webhooks are only available on non-Edge environments.
- GitHub recommends pinning third-party actions to commit SHAs for stronger supply-chain security, but the version-tag references used in the post remain technically valid.
