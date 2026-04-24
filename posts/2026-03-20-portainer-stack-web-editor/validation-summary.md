# Validation Summary: How to Create a Stack from the Web Editor in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Compose file format
- Docker Swarm
- PostgreSQL
- Adminer

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs, "Inspect or edit a stack": https://docs.portainer.io/sts/user/docker/stacks/edit
- Docker Docs, "Interpolation": https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Docs, "Specify a project name": https://docs.docker.com/compose/how-tos/project-name/
- Docker Docs, "docker stack deploy": https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs, "Deploy a stack to a swarm": https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs, "docker container ls": https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Docs, "docker service logs": https://docs.docker.com/reference/cli/docker/service/logs/
- Docker Docs, "View container logs": https://docs.docker.com/engine/logging/
- Docker Official Image docs for PostgreSQL: https://github.com/docker-library/docs/blob/master/postgres/README.md
- Docker Official Image docs for Adminer: https://hub.docker.com/_/adminer/

## Issues Found
- The original sample stack was not deployable as written. The `node:18-alpine` service referenced `server.js` that was not provided, the Nginx service had no matching proxy/app configuration, and the verification step checked `/health` even though the stack did not expose that endpoint. I replaced the sample with a working `postgres:18` plus `adminer:5` stack based on documented official images.
- The introduction said the editor provided immediate environment-variable substitution. Portainer's stack documentation describes defining variables in Portainer and referencing them from the stack file, while keeping the compose content unchanged. I corrected that wording.
- The stack-name note claimed only lowercase alphanumeric names with hyphens were allowed. Docker's documented Compose project-name rules are broader, and Portainer's stack docs do not document that exact restriction. I removed the inaccurate limitation.
- The environment-variable instructions pointed readers to Advanced mode for `.env`-style input. Portainer's stack documentation specifically documents setting variables individually or using `Load variables from .env file`, so I updated the workflow to match the official stack UI behavior.
- The standalone log example used a fixed container name (`my-web-app_api_1`) that did not match current Docker naming assumptions or the revised sample stack. I replaced the verification commands with accurate Swarm and Docker Standalone examples.
- The update section said Portainer would apply only changed services as a rolling update. Portainer's documentation describes editing the stack and then redeploying it; the original wording was too specific and not accurate across standalone and Swarm environments. I changed it to redeploy language.
- Several descriptions referred only to containers, even though Portainer stack views and Docker behavior differ between Docker Standalone and Swarm. I adjusted those lines to use more accurate service/container wording.

## Review Notes
- `version: "3.8"` was retained in the example because Portainer stacks may target Docker Swarm, and Docker documents that `docker stack deploy` still relies on the legacy Compose v3 format rather than the latest versionless Compose Specification.
- The local workspace did not have the `docker` CLI installed on April 24, 2026, so validation was documentation-based rather than live command execution-based.
