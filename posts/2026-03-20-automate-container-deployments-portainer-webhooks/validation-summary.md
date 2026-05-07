# Validation Summary: How to Automate Container Deployments with Portainer Webhooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker Swarm
- Webhooks
- Docker Hub
- Harbor
- Bash
- curl
- jq

## Sources Consulted
- Portainer container webhooks docs: https://docs.portainer.io/user/docker/containers/webhooks
- Portainer service webhooks docs: https://docs.portainer.io/user/docker/services/webhooks
- Portainer stack webhooks docs: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Docker Hub webhooks docs: https://docs.docker.com/docker-hub/repos/manage/webhooks/
- Harbor webhook docs: https://goharbor.io/docs/edge/working-with-projects/project-configuration/configure-webhooks/
- Portainer official source, service webhook handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/webhooks/webhook_execute.go
- Portainer official source, stack webhook handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/webhook_invoke.go

## Issues Found
- The post implied webhook support without noting scope limits. I added a note that Portainer webhooks require non-Edge environments, and that current Portainer docs mark stack and container webhooks as Business Edition features.
- The generic trigger example used the service/container webhook path for all webhook types. I added the stack-specific endpoint example (`/api/stacks/webhooks/...`) so the post no longer conflates the two URL formats.
- The container and service setup steps did not match the current Portainer UI wording. I corrected them to use the documented `Container webhook` and `Service webhook` toggles in the details screens.
- The Docker Hub and Harbor setup instructions were too loose compared with the current official docs. I updated Docker Hub to include naming the webhook and setting the destination URL, and I changed the Harbor labels to `Notify type: HTTP` and `Push artifact to registry`.
- The section titled `CI → Registry → Portainer` showed a script that triggers Portainer directly from CI after the push, not via a registry webhook chain. I renamed the section and comment to match the actual behavior.
- The monitoring example used `Authorization: Bearer ${API_TOKEN}` while the current Portainer access-token examples for `/api/endpoints/.../docker/...` use `X-API-Key`. I updated the header accordingly.

## Review Notes
- Portainer's current docs are not fully consistent about webhook response codes, but the official Portainer handlers return `204 No Content` on successful service and stack webhook execution, which matches the post's success checks.
- The monitoring example assumes `jq` is installed and that the target container name is exactly `/myapp`; those assumptions are reasonable for an example snippet but remain environment-specific.
