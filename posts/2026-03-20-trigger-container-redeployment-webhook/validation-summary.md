# Validation Summary: How to Trigger Container Redeployment via Webhook in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer container webhooks
- Docker containers and images
- Docker CLI (`docker build`, `docker push`)
- GitHub Actions
- GitLab CI/CD
- curl

## Sources Consulted
- Portainer container webhooks documentation: https://docs.portainer.io/user/docker/containers/webhooks
- Portainer add container documentation, container webhook section: https://docs.portainer.io/user/docker/containers/add
- Portainer service webhooks documentation, including `SERVICE_TAG` environment variable context: https://docs.portainer.io/user/docker/services/webhooks
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub `actions/checkout` official repository: https://github.com/actions/checkout
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab deprecated CI/CD keywords documentation: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab predefined CI/CD variables documentation: https://docs.gitlab.com/ci/variables/predefined_variables/
- Docker `docker image build` CLI reference: https://docs.docker.com/reference/cli/docker/image/build/
- Docker `docker image push` CLI reference: https://docs.docker.com/reference/cli/docker/image/push/

## Issues Found
- The introduction described the workflow as "complete GitOps", but the post demonstrates an imperative CI/CD webhook redeploy rather than a full GitOps reconciliation workflow. Changed this to "automated deployment workflow."
- The post omitted the Portainer edition/environment caveat for container webhooks. Added that container webhooks are a Portainer Business Edition feature and are only available on non-Edge environments, matching Portainer's current documentation.
- The post referred to `SERVICE_TAG` when demonstrating container webhook `tag` query parameters. Portainer's container webhook documentation uses `tag` for changing the container image tag; `SERVICE_TAG` is documented separately as an environment variable example for service compose files. Renamed the section and comment to use the `tag` query parameter.
- The GitHub Actions example used `actions/checkout@v4`; the official `actions/checkout` repository now documents `v6` as the current usage version. Updated the example to `actions/checkout@v6`.
- The GitLab CI example used `only`, which GitLab documents as deprecated in favor of `rules`. Replaced it with a `rules` condition for the `main` branch using the documented `CI_COMMIT_BRANCH` predefined variable.

## Review Notes
- The Portainer webhook URL format, POST method, and `?tag=` query parameter for updating a container to a different image tag match the official Portainer container webhook documentation.
- The Docker build and push commands use documented CLI syntax. The CI snippets assume Docker is available in the runner and that registry authentication has already been configured.
