# Validation Summary: How to Automate Container Deployments with Portainer Webhooks (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker Swarm services
- Docker Hub webhooks
- Bash
- `curl`
- `cron`
- Slack incoming webhooks

## Sources Consulted
- Portainer container webhook documentation: https://docs.portainer.io/user/docker/containers/webhooks
- Portainer service webhook documentation: https://docs.portainer.io/user/docker/services/webhooks
- Portainer stack webhook documentation: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/2.21/api/access
- Portainer source for webhook creation handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/webhooks/webhook_create.go
- Portainer source for webhook execution handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/webhooks/webhook_execute.go
- Portainer source for webhook response structure: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source for empty HTTP responses: https://github.com/portainer/portainer/blob/develop/pkg/libhttp/response/response.go
- Docker Hub webhook documentation: https://docs.docker.com/docker-hub/repos/manage/webhooks/
- Harbor webhook documentation: https://goharbor.io/docs/2.11.0/working-with-projects/project-configuration/configure-webhooks/
- Sonatype Nexus Repository webhook documentation: https://help.sonatype.com/en/webhooks.html

## Issues Found
- The post implied container, service, and stack webhooks were all available under the same Portainer edition assumptions. I corrected the prerequisites and feature descriptions to reflect that container and stack webhooks are Business Edition features, while all webhook types are limited to non-Edge environments.
- The post described container webhook behavior as a restart. I changed this to container recreation/redeploy wording to match Portainer’s documented behavior.
- The Portainer API example was incorrect. It attempted to create a container webhook through `POST /api/webhooks`, but the documented and implemented API surface for that endpoint is the service webhook flow. I replaced the snippet with a Swarm service example that uses the correct resource lookup, request fields, authentication header, and `.Token` response field.
- The trigger section only showed `/api/webhooks/...`, which is correct for container and service webhooks but not for stack webhooks. I added a note clarifying that stack webhooks use `/api/stacks/webhooks/...`.
- The Docker Hub instructions omitted the required webhook name field. I updated the steps to include both the name and destination URL.
- The post claimed Harbor and Nexus do not natively support webhooks. That is inaccurate according to their official documentation, so I rewrote that line to describe CI-triggered workflows more generally.

## Review Notes
- The API example now assumes an admin access token for webhook creation, which matches the referenced Portainer implementation.
- Stack webhooks use a different endpoint shape from container and service webhooks, so examples for those resources should not be interchanged.
