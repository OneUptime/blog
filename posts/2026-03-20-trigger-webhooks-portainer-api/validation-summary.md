# Validation Summary: How to Trigger Webhooks via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Portainer API
- Portainer webhooks
- Docker Swarm services
- Docker Compose stacks
- CI/CD shell scripting
- GitHub Actions
- curl
- jq

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer CE 2.39.1 generated API spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE 2.40.0 generated API spec: https://api-docs.portainer.io/versions/ee/2.40.0.yaml
- Portainer stack webhook documentation: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer service webhook documentation: https://docs.portainer.io/sts/user/docker/services/webhooks
- Portainer container webhook documentation: https://docs.portainer.io/sts/user/docker/containers/webhooks
- Local `curl --help all` output for `-s`, `-w`, `-X`, and `-o` flags
- Local `jq --help` output and sample jq filter execution

## Issues Found
- The API examples used `Authorization: Bearer ${API_TOKEN}` for an API access token. Portainer's current API access documentation uses the `X-API-Key` header for access tokens, so the examples now use `X-API-Key: ${PORTAINER_API_KEY}`.
- The webhook listing example used response fields such as `.ResourceID`, but the generated API spec returns `ResourceId` and `EndpointId`. The jq filter now uses the correct response field casing.
- The create example claimed `WebhookType: 1` creates a stack webhook. The generated API spec documents `/api/webhooks` as the service/container webhook endpoint, with `WebhookType: 1` for service webhooks. The example now creates a Docker Swarm service webhook.
- The trigger example used `/api/webhooks/{token}` for stacks and expected `204 No Content`. Portainer's stack webhook endpoint is `/api/stacks/webhooks/{webhookID}` and the generated API spec documents `200` for stack webhook success; `/api/webhooks/{id}` documents `202` for service/container webhook success. The trigger examples and CI checks now use the correct endpoints and accept `200` or `202`.
- The webhook type table mapped stack, service, and container to values `1`, `2`, and `3`. The table now distinguishes stack webhook trigger URLs from `/api/webhooks` `WebhookType` values, and notes container webhooks as Business Edition functionality.
- The delete example used the old auth header and implied all webhook types are deletable through `/api/webhooks`. It now uses `X-API-Key` and labels the lookup as service/container webhook deletion.

## Review Notes
The Portainer BE API spec describes container webhook creation with `WebhookType: 2`, while the shared `portainer.WebhookType` enum still lists only `ServiceWebhook` in the generated spec. Readers should verify container webhook creation against their installed Portainer edition and version.
