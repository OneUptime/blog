# Validation Summary: How to Speed Up Stack Deployments in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Portainer stacks, stack webhooks, and API
- Docker Engine and Docker CLI
- Docker Compose and Compose Deploy Specification
- Docker Registry pull-through cache
- Docker BuildKit and buildx registry cache
- Docker Swarm rolling updates
- Node.js and npm
- Bash, JSON, and YAML configuration

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CE OpenAPI specification: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer stack webhooks documentation: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Docker Hub registry mirror documentation: https://docs.docker.com/docker-hub/image-library/mirror/
- CNCF Distribution registry configuration: https://distribution.github.io/distribution/about/configuration/
- Docker daemon configuration reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy reference: https://docs.docker.com/reference/compose-file/deploy/
- Docker Build cache backends documentation: https://docs.docker.com/build/cache/backends/
- Docker Build registry cache documentation: https://docs.docker.com/build/cache/backends/registry/
- Docker service update reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker service inspect reference: https://docs.docker.com/reference/cli/docker/service/inspect/
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- npm ci documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- npm config documentation: https://docs.npmjs.com/cli/v10/using-npm/config/

## Issues Found
- The stack webhook examples used `/api/webhooks/{id}` and an authorization header for stack deployment. Updated them to `/api/stacks/webhooks/{id}` and removed auth from webhook calls because Portainer stack webhooks are public webhook endpoints. Added `pullimage=false` to the pre-pull flow so Portainer does not repeat the pull.
- The post did not mention that stack webhooks are a Portainer Business Edition feature in current documentation. Added that caveat where the webhook flow is used.
- The pre-pull Bash example did not fail the deployment if a background `docker pull` failed. Added PID tracking and explicit failure handling before triggering Portainer.
- The registry mirror TTL comment said layers were cached indefinitely while the snippet set `REGISTRY_PROXY_TTL=168h`. Changed the comment to describe the actual 7-day TTL and note that `0` disables expiration.
- The `daemon.json` example included a `//` comment inside a JSON block, which would make the file invalid. Moved the file label outside the JSON snippet.
- Compose snippets used the obsolete top-level `version: "3.8"` field. Removed it to align with the current Compose Specification.
- The Portainer API script described an API token but sent it as `Authorization: Bearer`. Changed it to `X-API-Key`, which matches Portainer access-token usage, and updated the deprecated `PullImage` field to `RepullImageAndRedeploy`.
- The Portainer API script built jq filters and file reads with unquoted shell interpolation. Changed the stack-name lookup to `jq --arg` and the compose file read to `jq -Rs . < "$compose_file"`.
- The Dockerfile used Node.js 18, which is EOL, and `npm ci --only=production`, where npm documents `only` as deprecated in favor of `--omit=dev`. Updated the example to Node.js 24, installed full dependencies for the build, then pruned dev dependencies with `npm prune --omit=dev`.
- The BuildKit example said it used cache mounts but actually used inline cache metadata, and it pushed a `:cache` tag that was never built or tagged. Replaced it with a current `docker buildx build` registry-cache example using `--cache-from`, `--cache-to`, and `--push`.
- The Swarm deployment timing loop ran `docker service ls` only once, so it did not actually poll for completion. Replaced it with a loop around `docker service inspect` and `.UpdateStatus.State`.
- The conclusion overstated first-pull cache behavior and deployment-time guarantees. Clarified that registry mirrors become local cache hits after the first pull and softened the timing claim to "many environments."

## Review Notes
Shell snippets were checked with `bash -n`, the JSON snippet was checked with `jq`, and the YAML snippets were parsed with PyYAML. Docker is not installed in this workspace, so Docker and Portainer behavior was validated against official documentation rather than executed against a live daemon.
