# Validation Summary: Using Portainer with Docker Compose

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose / Compose specification
- Docker Swarm stack deployment behavior
- Git-based stack deployment / GitOps updates in Portainer
- Docker environment variables, `.env` files, and secrets
- Docker Official Images (`nginx`, `postgres`)

## Sources Consulted
- Portainer Documentation, "Add a new stack" - https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation, "Inspect or edit a stack" - https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Documentation, "How do automatic updates for stacks/applications work?" - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Documentation, "Environment Variable Management in Docker: .env vs. stack.env" - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Portainer Documentation, "Remove a stack" - https://docs.portainer.io/user/docker/stacks/remove
- Portainer Documentation, "Application" templates page - https://docs.portainer.io/user/docker/templates/application
- Portainer Documentation, "Client sent an HTTP request to an HTTPS server" - https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/client-sent-an-http-request-to-an-https-server
- Docker Docs, "Version and name top-level elements" - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "Interpolation" - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Docs, "Set environment variables within your container's environment" - https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/
- Docker Docs, "Secrets in Compose" - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs, "Deploy a stack to a swarm" - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Hub Official Image tags for `nginx` - https://hub.docker.com/_/nginx/tags
- Docker Hub Official Image tags for `postgres` - https://hub.docker.com/_/postgres/tags

## Issues Found
- The example Compose file used a top-level `version: "3.8"` key. Docker now documents the top-level `version` field as obsolete, so I removed it to align the example with the current Compose specification.
- The Git deployment section used outdated or inaccurate Portainer terminology and behavior. I changed `Repository` to `Git Repository`, replaced `Automatic updates` with `GitOps updates`, and clarified that updates happen through polling or a Portainer webhook rather than simply "on push".
- The stack update section implied that any stack can be edited directly in Portainer. Current Portainer docs state that the editor is only available for stacks created with the Web editor; Git-based stacks must be changed in the repository and then redeployed. I updated the wording accordingly.
- The `.env` section inaccurately described `Load variables from .env file` as the switch for reading a repository `.env` file. I corrected this to match Portainer's documented behavior: Git-based stacks can process a repository `.env` file in specific conditions, while the UI option uploads a local `.env` file into the stack configuration.
- The stack management section said deleting a stack can optionally remove volumes and that Portainer shows logs for all services as a stack-wide action. I adjusted this to match Portainer documentation more closely by stating that you can delete the stack and access logs for the services or containers within it.
- The best-practices section recommended storing secrets in environment variables. Docker's official guidance is to prefer secrets for sensitive data, so I updated that recommendation.
- I also clarified that the example stack is for a Docker Standalone or Podman environment, because the example uses Compose features that do not map cleanly to Docker Swarm stack deployment behavior.

## Review Notes
- The image tags used in the examples (`nginx:1.25.4`, `nginx:1.27.0`, and `postgres:16.2-alpine`) were still present in the Docker Official Images catalog at review time.
- Portainer stack behavior differs by target environment. In Docker Swarm mode, Portainer relies on `docker stack deploy`, which uses the legacy Compose v3 format and does not support the full modern Compose specification.
