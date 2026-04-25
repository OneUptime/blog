# Validation Summary: How to Check Image Updates via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Bash
- `curl`
- `jq`
- Slack incoming webhooks

## Sources Consulted
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer API overview: https://docs.portainer.io/api/docs
- Portainer API usage examples and Docker proxy pattern: https://docs.portainer.io/sts/api/examples
- Portainer FAQ on how image update checks work: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-does-the-image-update-notification-icon-work
- Portainer docs on enabling/disabling the image up-to-date indicator: https://docs.portainer.io/faqs/troubleshooting/how-to-enable-disable-image-up-to-date-indicator
- Portainer host setup docs noting the image indicator is BE-only: https://docs.portainer.io/sts/user/docker/host/setup
- Portainer source for container image-status requests: https://github.com/portainer/portainer/blob/develop/app/react/docker/components/ImageStatus/useImageNotification.ts
- Portainer source for the standalone container recreate route: https://github.com/portainer/portainer/blob/develop/api/http/handler/docker/containers/recreate.go
- Portainer source for non-proxy Docker URL construction: https://github.com/portainer/portainer/blob/develop/app/react/docker/queries/utils/buildDockerUrl.ts
- Portainer source for Docker proxy URL construction: https://github.com/portainer/portainer/blob/develop/app/react/docker/proxy/queries/buildDockerProxyUrl.ts
- Portainer source showing the feature is gated to Business Edition: https://github.com/portainer/portainer/blob/develop/app/react/portainer/feature-flags/feature-flags.service.ts
- Docker Engine API specification: https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml

## Issues Found
- The auth guidance was inconsistent. The post said JWT or API access token, but the examples only used `Authorization: Bearer`. I updated the examples to use `X-API-Key` for API access tokens and documented the JWT alternative, matching Portainer’s docs.
- The image-status checks used the wrong route family and HTTP method. I changed them from `POST /api/endpoints/{id}/docker/.../image_status` to Portainer’s `GET /api/docker/{environmentId}/.../image_status` route, matching the Portainer UI/source.
- The prerequisite edition was too broad. I changed `Portainer CE or BE` to `Portainer BE` because the image up-to-date indicator feature is documented as a Business Edition feature.
- The container update example was not actually recreating the container. It stopped and deleted the old container, then printed a success message without issuing a create request. I replaced that section with Portainer’s standalone container recreate endpoint.
- The digest comparison section only inspected the local image twice, so it did not compare local and remote state. I updated it to compare the local repo digest with the registry digest returned by Docker’s distribution inspect endpoint.
- The image pull example was too loose about image reference handling. I split image name and tag explicitly and improved the streamed error extraction to align better with Docker’s API behavior.
- The dangling image example used `?dangling=true`, which is not the documented Docker API query shape for `GET /images/json`. I replaced it with the documented JSON-encoded `filters` parameter.
- The Slack notification script had a Bash subshell issue, so `OUTDATED_ITEMS` would not persist outside the loop. I changed the loop form so the accumulated list is preserved.
- The Slack payload was built with manual string interpolation, which is unsafe for embedded quotes/newlines. I changed it to generate JSON with `jq`.
- I added URL encoding where image references are used in Docker API paths or query parameters so repository names with slashes/tags are handled correctly.

## Review Notes
- Portainer’s `image_status` route is used by the Portainer UI and source, but it is not prominently exposed in the public API overview pages. I verified that behavior directly from Portainer’s source.
- For agent-managed Swarm tasks, Portainer’s UI can also send `X-PortainerAgent-Target` when checking per-container image status. The revised post now keeps the recreate example scoped to standalone Docker containers, which is the safest fit for the commands shown.
