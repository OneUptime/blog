# Validation Summary: How to Set Up Container Webhooks in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Webhooks
- Bash
- Container registries
- CI/CD

## Sources Consulted
- Portainer container webhooks documentation: https://docs.portainer.io/user/docker/containers/webhooks
- Portainer add-container documentation: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer stack webhooks documentation: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access token documentation: https://docs.portainer.io/2.21/api/access
- Portainer source for container recreation flow: https://github.com/portainer/portainer/blob/2.39.1/api/docker/container.go
- Portainer source for webhook execution response behavior: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/webhooks/webhook_execute.go
- Portainer source for empty HTTP responses: https://github.com/portainer/portainer/blob/2.39.1/pkg/libhttp/response/response.go
- Portainer source describing Docker API proxying through `/api/endpoints/{id}/docker`: https://github.com/portainer/portainer/blob/2.39.1/api/api-description.md
- CNCF Distribution HTTP API V2 spec: https://distribution.github.io/distribution/spec/api/
- Docker registry authentication reference: https://docs.docker.com/reference/api/registry/auth/

## Issues Found
- The prerequisites incorrectly said container webhooks were available in Community Edition 2.x+. I corrected this to Portainer Business Edition only and noted the non-Edge environment requirement, which matches the official Portainer documentation.
- The existing-container UI step used the wrong label. I changed `Create container webhook` to `Container webhook` to match the container details view documented by Portainer.
- The webhook execution section presented descriptive steps inside a `bash` block and implied an exact `docker stop`/`docker rm`/`docker create` sequence. I converted it to descriptive text and aligned it with Portainer's actual recreate flow, where the old container is replaced and the container ID changes.
- The post incorrectly said to use the `SERVICE_TAG` environment variable for different container image tags. I corrected this to the documented `tag` query parameter used by container webhooks.
- The secret-handling example used GitHub Actions `${{ ... }}` interpolation inside a bash snippet, which is not valid shell syntax. I replaced it with a generic runtime-injected secret example.
- The image verification script checked that `${TAG}` existed in the registry but then triggered the webhook without passing that tag. I fixed the deployment call to use `?tag=${TAG}` so the verified image tag is the one Portainer deploys.
- The image verification script now includes an `Accept` header for the manifest request so it aligns better with the Docker Registry HTTP API V2 manifest endpoint.
- The monitoring script referenced `WEBHOOK_URL` without defining it. I added the missing variable initialization.
- The conclusion said the webhook would "restart" the container. I corrected this to "recreate" because Portainer replaces the container during redeploy.

## Review Notes
- Portainer's current implementation returns `204 No Content` for webhook execution through `response.Empty`, which matches the examples kept in the post. However, the Swagger annotation in the webhook handler still says `202`, so there is a minor source-level inconsistency in Portainer itself.
- The monitoring example assumes `jq` is installed and that the API key has permission to query the endpoint's proxied Docker API.
