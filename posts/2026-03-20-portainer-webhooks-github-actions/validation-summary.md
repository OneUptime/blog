# Validation Summary: How to Integrate Portainer Webhooks with GitHub Actions - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Portainer stack webhooks
- GitHub Actions
- Docker Buildx
- Docker registries (Docker Hub, GHCR, private registries)
- Slack incoming webhooks
- `curl`
- YAML workflow configuration

## Sources Consulted
- Portainer Docs: Stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Docs: Automatic updates for stacks/applications: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- GitHub Docs: Workflow syntax for GitHub Actions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Deploying with GitHub Actions / environments and deployments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- GitHub Docs: Managing environments for deployment: https://docs.github.com/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment
- `actions/checkout` README: https://github.com/actions/checkout
- `docker/setup-buildx-action` README: https://github.com/docker/setup-buildx-action
- `docker/login-action` README: https://github.com/docker/login-action
- `docker/metadata-action` README: https://github.com/docker/metadata-action
- `docker/build-push-action` README: https://github.com/docker/build-push-action
- Slack Docs: Incoming webhooks: https://api.slack.com/messaging/webhooks

## Issues Found
- The post treated Portainer webhooks as a generic prerequisite, but the documented stack webhook feature used here is a Portainer Business Edition feature and only works on non-Edge environments. I corrected the prerequisite and related wording so the article matches Portainer's current documentation.
- The intro and architecture wording said Portainer would redeploy the container, while the documented workflow in the post uses stack webhooks. I corrected that wording to refer to redeploying the stack.
- The secrets section suggested using a Docker Hub password. Docker's official `login-action` guidance recommends a Docker Hub personal access token instead of an account password, so I corrected the secret description.
- The post implied GHCR or private registries fit into the Docker Hub example unchanged. I added the missing technical note that `docker/login-action` needs a `registry:` value and the image name must be updated for non-Docker-Hub registries.
- The workflow snippets used older major versions of the GitHub Actions and Docker actions. I updated them to the current documented major versions used in the official action READMEs.
- The production deployment example attempted to call `github.rest.repos.createDeploymentStatus()` with `context.payload.deployment?.id || 0`, which is not valid for a `push` workflow payload and would not work as written. I removed that step and replaced it with the correct note that jobs referencing a GitHub Actions environment automatically create deployment records and statuses.
- The rollback workflow claimed it updated Portainer via API, but the code only posted to the existing webhook and ignored the requested version. I corrected the workflow to use Portainer's documented `?tag=` webhook parameter and added explicit HTTP status checking so the snippet actually performs a version-tag rollback as described.

## Review Notes
- The examples are Docker Hub-centric by default. GHCR and private registries are still valid targets, but they require matching `registry:` and image-name changes in the workflow.
- The rollback example assumes a Portainer stack webhook and image tags that match the value supplied through the manual workflow input.
