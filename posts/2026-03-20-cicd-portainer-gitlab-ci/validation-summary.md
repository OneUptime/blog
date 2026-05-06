# Validation Summary: How to Set Up CI/CD with Portainer and GitLab CI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitLab CI/CD
- GitLab Container Registry
- Docker
- Portainer
- Portainer stack webhooks
- Portainer REST API
- YAML
- `curl`
- `jq`

## Sources Consulted
- GitLab Docs: Deprecated keywords, `only` / `except` -> `rules` https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab Docs: Specify when jobs run with `rules` https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docs: Use Docker to build Docker images (`docker:dind`, `DOCKER_HOST`, `DOCKER_TLS_CERTDIR`, privileged runner requirements) https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Docs: Authenticate with the container registry (`CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, `--password-stdin`) https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
- Portainer Docs: Stack webhooks, including BE-only availability, non-Edge limitation, and `?tag=` / `pullimage=false` parameters https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Docs: Accessing the Portainer API (`X-API-Key` with access tokens) https://docs.portainer.io/api/access
- Portainer Docs: API documentation index https://docs.portainer.io/api/docs
- Portainer OpenAPI 2.39.1 CE spec: `/stacks/{id}`, `/stacks/{id}/file`, `/stacks/{id}/git/redeploy`, `/stacks/webhooks/{webhookID}`, auth schemes, and update payload fields https://api-docs.portainer.io/versions/ce/2.39.1.yaml

## Issues Found
- The GitLab CI example used `only`, which GitLab documents as deprecated. I replaced those sections with `rules` so the example uses current syntax.
- The Docker build job omitted the documented `docker:dind` connection variables and did not note the privileged-runner requirement. I added `DOCKER_HOST`, `DOCKER_TLS_CERTDIR`, pinned the Docker client/service images to the documented example versions, and added the runner caveat.
- The registry login used `docker login -p`, while GitLab documents `--password-stdin` as the recommended approach for CI. I updated the login command accordingly.
- The Portainer webhook jobs expected HTTP `204`, but the Portainer OpenAPI spec documents `200` for `/stacks/webhooks/{webhookID}`. I corrected both webhook checks to `200`.
- The post's variables list was incomplete for the shown snippets. I added `PORTAINER_STAGING_WEBHOOK_URL` and `PORTAINER_URL`.
- The webhook-based deployment path omitted an important Portainer limitation. I added the documented note that stack webhooks are only available in Portainer Business Edition and on non-Edge environments.
- The advanced Portainer API example used `Authorization: Bearer` while the Portainer access-token docs require the access token in `X-API-Key`. I changed the header to `X-API-Key`.
- The advanced API example hard-coded `endpointId=1`. I changed it to read the actual `EndpointId` from the selected stack before updating.
- The advanced API example used `PullImage`, which the current Portainer OpenAPI spec marks as deprecated in favor of `RepullImageAndRedeploy`. I updated the payload field.
- The advanced API example ran in `curlimages/curl` but used `jq`, which is not guaranteed to be present there. I changed the job image to Alpine and installed `curl` and `jq` before running the script.
- The advanced API example was presented too broadly. The current Portainer API documents `PUT /stacks/{id}` as only valid for file-based stacks, so I scoped the text accordingly.

## Review Notes
- The post assumes the application repository already contains a valid `Dockerfile`, `requirements.txt`, and `tests/` directory for the sample pipeline.
- The webhook example assumes the Portainer-managed stack is configured to consume tag-based updates in a way that matches `CI_COMMIT_SHORT_SHA`.
- `curlimages/curl:latest` remains in the webhook jobs. That is technically valid, but pinning an explicit image version would make the example more reproducible.
