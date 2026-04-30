# Validation Summary: How to Set Up GitHub Actions That Deploy to Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- GitHub Actions
- Portainer
- Docker
- GitHub Container Registry (GHCR)
- Bash and `curl`
- Python
- PostgreSQL service containers

## Sources Consulted
- GitHub Docs: Expressions - https://docs.github.com/en/actions/learn-github-actions/expressions
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Docs: Creating PostgreSQL service containers - https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers
- GitHub Docs: GitHub-hosted runners - https://docs.github.com/actions/how-tos/using-github-hosted-runners/using-github-hosted-runners/about-github-hosted-runners
- GitHub Docs: Publishing and installing a package with GitHub Actions - https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- Portainer Docs: Webhooks - https://docs.portainer.io/user/docker/stacks/webhooks.md
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer API spec (CE 2.39.1) - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Docs: Automatic updates for stacks/applications - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work.md
- docker/metadata-action README - https://raw.githubusercontent.com/docker/metadata-action/master/README.md
- docker/login-action README - https://raw.githubusercontent.com/docker/login-action/master/README.md
- docker/build-push-action README - https://raw.githubusercontent.com/docker/build-push-action/master/README.md

## Issues Found
- Portainer stack webhooks were presented without the Portainer limitation that they require Business Edition and a non-Edge environment. I added that caveat to the introduction and conclusion so the webhook path is not presented as universally available.
- Step 1 documented secrets that did not match the actual workflow examples. The post listed `PORTAINER_STACK_WEBHOOK`, `REGISTRY_URL`, and `REGISTRY_TOKEN`, while the examples actually used `PORTAINER_STAGING_WEBHOOK`, `PORTAINER_PRODUCTION_WEBHOOK`, `vars.PRODUCTION_STACK_ID`, and an endpoint ID. I corrected the secret and variable setup and clarified that GHCR uses the automatically provided `GITHUB_TOKEN`.
- Both GHCR build jobs were missing explicit token permissions. GitHub's package documentation recommends `contents: read` and `packages: write` when publishing with `GITHUB_TOKEN`, so I added those permissions to both build jobs.
- The production Portainer API example was not valid for Portainer's file-based stack update endpoint. Portainer's API requires `StackFileContent` in the update payload, and the original example omitted it, hardcoded `endpointId=1`, and used deprecated `PullImage`. I changed the example to fetch the current stack file first, then send `StackFileContent`, `Env`, `Prune`, and `RepullImageAndRedeploy` with a configurable endpoint ID.
- The advanced workflow's PostgreSQL service container was missing a `ports` mapping even though the test step connected to `localhost:5432`. For jobs running directly on the runner, GitHub documents that the service port must be mapped to the host, so I added `5432:5432`.
- The advanced webhook deployment matrix used secret names that did not line up with Step 1 and used plain `curl -X POST`, which would not fail on HTTP error responses. I standardized the secret names and changed the deploy call to `curl -fsS`.
- The reusable composite action repeated the same invalid Portainer update pattern as the production workflow and defaulted `endpoint-id` to `1`, which is not generally safe. I updated it to require `endpoint-id`, retrieve the current stack file, and send a valid file-based stack update payload.

## Review Notes
- The workflow examples are GHCR-specific as written. If the post is later expanded to cover other registries, the login step and credentials guidance should be updated together rather than implying the same snippet works unchanged for private registries.
- The API-based deployment examples now clearly target file-based Portainer stacks. Git-based Portainer stacks should use the Git redeploy API or Portainer webhook/auto-update flow instead.
- The action versions used in the post are pinned to specific majors and should be rechecked during future reviews as GitHub and Docker release newer majors.
