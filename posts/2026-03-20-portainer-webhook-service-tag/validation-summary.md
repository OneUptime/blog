# Validation Summary: How to Use Webhook Environment Variables (SERVICE_TAG) in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition webhooks
- Docker and Docker Compose
- GitHub Actions
- GitLab CI/CD
- Portainer HTTP API
- `curl`
- `bash`

## Sources Consulted
- Portainer stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer service webhooks: https://docs.portainer.io/user/docker/services/webhooks
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer BE 2.39.1 API specification: https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Docker Compose variable interpolation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- GitHub Actions workflow commands (`GITHUB_OUTPUT`): https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- `actions/checkout` README: https://github.com/actions/checkout
- `docker/login-action` README: https://github.com/docker/login-action
- `docker/metadata-action` README: https://github.com/docker/metadata-action
- `docker/build-push-action` README: https://github.com/docker/build-push-action
- GitLab container registry authentication: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- GitLab container registry build and push examples: https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/

## Issues Found
- The post incorrectly described `SERVICE_TAG` as a JSON request body value for Portainer webhooks. Portainer documents webhook environment variables as URL query parameters. I updated the explanation and all webhook examples to use query-string syntax.
- The article described this as a container-webhook feature. Current Portainer docs document `SERVICE_TAG` for stack and service webhooks, while standalone container webhooks use the `tag` query parameter for image tag changes. I corrected the wording accordingly.
- The stack webhook example used the wrong endpoint (`/api/webhooks/...`) and unsupported JSON payload. I changed it to the documented stack webhook endpoint (`/api/stacks/webhooks/...`) with `?SERVICE_TAG=...`.
- The Compose example used the obsolete top-level `version` field. I removed it to align the snippet with the current Compose specification.
- The first GitHub Actions workflow would not push successfully as written because it did not check out the repository or authenticate to the registry. I added `actions/checkout@v6`, `docker/login-action@v4`, and corrected the webhook call.
- The GitLab CI example used a hard-coded GitLab.com registry host and did not authenticate before `docker push`. I changed it to use `CI_REGISTRY_IMAGE`, added registry login via `CI_REGISTRY_USER` and `CI_REGISTRY_PASSWORD`, and corrected the webhook call.
- The multi-tag GitHub Actions workflow used outdated action major versions and produced a short-SHA image tag while deploying a full `github.sha` tag. I updated the action versions to the current documented majors and changed SHA tagging to `format=long` so the built and deployed tags match.
- The Portainer API example omitted the required `endpointId` query parameter, did not include `StackFileContent` in the update payload, and used the deprecated `PullImage` field. I replaced it with a file-based stack example that preserves existing environment variables and uses `RepullImageAndRedeploy`.
- The conclusion said the tag was passed via the webhook body. I corrected this to query parameters or the Portainer API.

## Review Notes
- Portainer documents webhook environment variables for Business Edition stack and service webhooks on non-Edge environments.
- The API example now assumes `jq` is installed because preserving existing environment variables safely requires JSON manipulation.
- The GitLab example still assumes the runner can execute Docker commands. On Docker-in-Docker runners, the surrounding `image` and `services` setup from GitLab's Docker documentation may also be required.
