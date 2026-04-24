# Validation Summary: How to Trigger Webhooks via the Portainer API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Portainer HTTP API
- Portainer webhooks for Docker services, containers, and stacks
- Docker Swarm
- Docker Hub webhooks
- GitHub Actions
- `curl`
- `jq`

## Sources Consulted
- Portainer documentation: Accessing the Portainer API (https://docs.portainer.io/api/access)
- Portainer documentation: API documentation index (https://docs.portainer.io/api/docs)
- Portainer Community Edition 2.39.1 OpenAPI schema (https://api-docs.portainer.io/versions/ce/2.39.1.yaml)
- Portainer Business Edition 2.39.1 OpenAPI schema (https://api-docs.portainer.io/versions/ee/2.39.1.yaml)
- Portainer documentation: Container webhooks (https://docs.portainer.io/user/docker/containers/webhooks)
- Portainer documentation: Service webhooks (https://docs.portainer.io/user/docker/services/webhooks)
- Portainer documentation: Stack webhooks (https://docs.portainer.io/user/docker/stacks/webhooks)
- Docker documentation: Docker Hub webhooks (https://docs.docker.com/docker-hub/repos/manage/webhooks/)
- docker/login-action README (https://github.com/docker/login-action)

## Issues Found
- The API examples used incorrect webhook payload and response field names. Portainer 2.39.1 documents `ResourceID`, `EndpointID`, and `WebhookType` in the create payload, and returns `Token`, `EndpointId`, `ResourceId`, and `Type` in webhook objects. I updated the `curl` payloads and `jq` selectors accordingly.
- The post authenticated API calls with `Authorization: Bearer` but the current Portainer access-token documentation uses `X-API-Key`. I updated the examples to use an API access token and the `X-API-Key` header.
- The webhook trigger example expected `204 No Content`, which does not match the current OpenAPI. `/api/webhooks/{id}` is documented to return `202 Accepted`, while `/api/stacks/webhooks/{webhookID}` is documented to return `200 OK`. I corrected the examples and the GitHub Actions status check.
- The generic `/api/webhooks` endpoints were presented as if they also covered stacks. Portainer documents stack webhooks separately under `/api/stacks/webhooks/{token}`, and stack objects expose webhook tokens via `Webhook` and Git auto-update settings via `AutoUpdate.Webhook`. I corrected Step 8 and clarified that the list/delete API examples apply to service and container webhooks.
- The prerequisites understated feature availability. Current Portainer docs state webhooks are only available on non-Edge environments, and the container and stack webhook docs explicitly mark those features as Business Edition only. I updated the prerequisites and step headings to reflect that.
- The Docker Hub instructions omitted the webhook name field that Docker’s current UI requires. I updated the steps to include entering a name along with the destination URL.
- The GitHub Actions example pushed an image without first authenticating to the registry. I added a `docker/login-action@v4` step so the example workflow is runnable on GitHub-hosted runners.

## Review Notes
- Service webhooks are documented on the current Portainer site without a Business Edition-only note, while container and stack webhooks are explicitly marked as Business Edition features.
- Portainer distinguishes between service/container webhooks (`/api/webhooks/...`) and stack webhooks (`/api/stacks/webhooks/...`). Readers should not assume the endpoints are interchangeable.
