# Validation Summary: How to Set Up a Complete GitOps Pipeline with Portainer and GitHub (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- GitHub
- GitHub Actions
- GitHub Container Registry (GHCR)
- Docker
- Docker Compose / Compose Specification
- Node.js
- npm
- Redis
- `curl`
- `jq`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks
- Portainer automatic updates / webhooks FAQ: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Add a GitHub registry in Portainer: https://docs.portainer.io/admin/registries/add/ghcr
- Add a custom registry in Portainer: https://docs.portainer.io/admin/registries/add/custom
- GitHub Docs, publishing and installing a package with GitHub Actions: https://docs.github.com/en/enterprise-cloud@latest/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- GitHub Docs, working with the Container registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Docs, about permissions for GitHub Packages: https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages
- GitHub Docs, use GITHUB_TOKEN for authentication in workflows: https://docs.github.com/actions/using-jobs/assigning-permissions-to-jobs
- Docker Docs, Compose file `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `metadata-action` documentation: https://github.com/docker/metadata-action
- Docker `build-push-action` documentation: https://github.com/docker/build-push-action
- npm Docs, `npm ci`: https://docs.npmjs.com/cli/v10/commands/npm-ci

## Issues Found
- The post described the deployment step as a Portainer webhook flow, but the workflow actually updated the stack through the Portainer API. I corrected the introduction and architecture diagram so they match the implementation.
- The secrets table listed `PORTAINER_WEBHOOK_URL`, but the workflow never used it. I removed the unused secret from the instructions.
- The Dockerfile installed production-only dependencies before running `npm run build`, which can break builds that rely on devDependencies. I changed it to `npm ci`, then `npm prune --omit=dev` after the build.
- The Compose example used the top-level `version` key, which Docker now documents as obsolete. I removed it from the Compose snippet.
- The workflow built a short-SHA image tag (`git-<shortsha>`) but deployed `git-${{ github.sha }}` with the full SHA, so Portainer could try to deploy an image tag that was never pushed. I changed the build to use a full-SHA tag and made the deploy job consume the exact tag produced by the build.
- The Portainer stack update example used the wrong request body field names (`stackFileContent`, `env`, `pullImage`) and hardcoded `endpointId=1`. Portainer’s API expects `StackFileContent`, `Env`, and now prefers `RepullImageAndRedeploy`; it also requires the real `endpointId`. I updated the snippet to fetch the stack’s `Id` and `EndpointId`, build the payload with `jq`, and send the documented field names.
- The GHCR registry instructions implied the dedicated GitHub registry option was generally available in Portainer. Portainer documents that provider as Business Edition only, so I corrected the instructions to distinguish BE’s GitHub provider from CE’s custom `ghcr.io` registry setup.
- The package permissions section told readers to enable pull-request approval permissions, which are unrelated to pushing images to GHCR. I replaced that with the permissions the workflow actually needs: `contents: read` and `packages: write`.

## Review Notes
- The deployment example now matches Portainer’s file-based stack update API. If a stack is deployed from a Git repository inside Portainer, the update and webhook flow is different and should use Portainer’s Git-based stack mechanisms instead.
