# Validation Summary: How to Check Image Updates via the Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Docker CLI
- Bash
- `curl`
- `jq`
- Slack incoming webhooks

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer API access documentation: https://docs.portainer.io/2.21/api/access
- Portainer FAQ on image update detection: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-does-the-image-update-notification-icon-work
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Engine API Swagger spec: https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml
- Docker CLI `docker manifest inspect` reference: https://docs.docker.com/reference/cli/docker/manifest/
- Docker CLI `docker image pull` reference: https://docs.docker.com/reference/cli/docker/image/pull/

## Issues Found
- The post used `Authorization: Bearer ${API_TOKEN}` while describing a Portainer API access token. Portainer documents access tokens via the `X-API-Key` header, so the examples were updated to use `X-API-Key`.
- The private-registry pull example used a Docker-style username/password payload in `X-Registry-Auth`. Portainer documents passing a base64-encoded `{"registryId":<id>}` payload for Portainer-managed registries, so that example was corrected.
- The digest comparison example mixed two different digest types by comparing `RepoDigests[0]` with `docker manifest inspect ... | jq '.config.digest'`. The script was updated to compare Portainer's first local repo digest with the remote manifest digest from `docker manifest inspect --verbose`, which matches Portainer's documented update-check behavior.
- The stack redeploy example used `PullImage`, which is deprecated in Portainer 2.36+. It was replaced with `RepullImageAndRedeploy`.
- The automated daily script treated any `"Pull complete"` message as evidence of a newer image. Docker pull output includes per-layer completion messages, so this could generate false positives. The script now compares the local image ID before and after the pull.
- The Slack webhook payload was constructed with raw shell string interpolation, which could break JSON encoding. It was updated to generate JSON with `jq`.

## Review Notes
- Portainer's `/api/endpoints/{id}/docker/...` paths are reverse-proxied Docker Engine API calls; Portainer's own docs note that these requests and responses match Docker's API.
- The stack update example applies to file-based stacks, which is how Portainer documents `PUT /api/stacks/{id}`.
- The `docker manifest inspect` example assumes the machine running the script can reach the registry and authenticate if required.
