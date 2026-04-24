# Validation Summary: How to Override Container Command and Entrypoint in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Dockerfile (`CMD`, `ENTRYPOINT`)
- Docker Compose
- Official Docker images (`redis`, `postgres`, `nginx`, `node`)

## Sources Consulted
- Portainer Docs, Advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docs, Inspect a container: https://docs.portainer.io/user/docker/containers/inspect
- Portainer Docs, Why can't I use the console with my container?: https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-cant-i-use-the-console-with-my-container
- Portainer Docs, Access a container's console: https://docs.portainer.io/sts/user/docker/containers/console
- Docker Docs, Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Docs, Running containers: https://docs.docker.com/engine/containers/run/
- Docker Docs, Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Control startup order in Compose: https://docs.docker.com/compose/how-tos/startup-order/
- Portainer source, command/entrypoint request mapping: https://github.com/portainer/portainer/blob/develop/app/react/docker/containers/CreateView/CommandsTab/toRequest.ts
- Portainer source, command tokenization helper: https://github.com/portainer/portainer/blob/develop/app/docker/helpers/containers.ts
- Portainer source, argument splitting implementation: https://github.com/portainer/portainer/blob/develop/app/docker/helpers/splitargs.ts
- Portainer source, container create command UI: https://github.com/portainer/portainer/blob/develop/app/react/docker/containers/CreateView/CommandsTab/CommandsTab.tsx
- Redis official image source, entrypoint behavior: https://github.com/redis/docker-library-redis/blob/master/docker-entrypoint.sh
- Postgres official image source, Dockerfile and entrypoint behavior: https://github.com/docker-library/postgres/blob/master/Dockerfile-debian.template
- Postgres official image source, entrypoint script: https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh
- NGINX official image source, Alpine Dockerfile: https://github.com/nginxinc/docker-nginx/blob/master/stable/alpine-slim/Dockerfile
- NGINX official image source, entrypoint script: https://github.com/nginxinc/docker-nginx/blob/master/stable/alpine-slim/docker-entrypoint.sh
- Node official image source, Node 20 Dockerfile: https://github.com/nodejs/docker-node/blob/main/20/bookworm/Dockerfile
- Node official image source, entrypoint script: https://github.com/nodejs/docker-node/blob/main/docker-entrypoint.sh

## Issues Found
- The post described Portainer's UI as a `Command & logging` tab. Portainer's docs describe this as the `Advanced container settings` section and its `Command & logging` area. I updated the wording to match the documented UI.
- The post treated the `Command` field as a pure `CMD` replacement without noting `ENTRYPOINT` interaction. Docker's runtime docs state that when an image defines an `ENTRYPOINT`, the runtime command is appended as that entrypoint's arguments unless the entrypoint is also overridden. I added that clarification.
- The shell-command example implied that putting `/bin/sh -c ...` in `Command` alone is the general pattern. I corrected the example to explicitly override `Entrypoint` to `/bin/sh` and pass `-c ...` in `Command`, which is the reliable way to use shell operators in this context.
- The debugging-shell example suggested leaving `Command` empty to get an interactive shell. That is not the reliable Portainer debugging flow for a recreated container. I changed the example to `Entrypoint: /bin/sh` with `Command: -c "sleep infinity"` and kept the guidance to use Portainer's `Exec/Console` feature.
- The post incorrectly claimed that Portainer accepts JSON array syntax such as `["python", "app.py"]` in the container form. Portainer's current UI accepts string inputs and tokenizes them into argument arrays. I replaced that section with accurate guidance about Portainer's string-based command format and noted that JSON-array syntax belongs to Dockerfiles and Compose files instead.

## Review Notes
- The `redis`, `postgres`, `nginx`, and `node` examples are acceptable because their official image entrypoint scripts pass alternate commands through with `exec "$@"`; that behavior is image-specific and should not be generalized to every Docker image.
- The Compose example using `depends_on.condition: service_completed_successfully` is valid in current Docker Compose documentation.
