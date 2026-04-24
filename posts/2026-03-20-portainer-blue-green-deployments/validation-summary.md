# Validation Summary: How to Implement Blue-Green Deployments with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Traefik Proxy
- Docker Compose / Docker Engine
- Docker Swarm
- Portainer API
- Bash
- `curl`
- `jq`

## Sources Consulted
- Traefik Docs, Docker provider routing configuration: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik Docs, Swarm provider: https://doc.traefik.io/traefik/providers/swarm/
- Traefik Docs, API & Dashboard: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Docker Docs, Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, `docker service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Portainer Docs, API documentation: https://docs.portainer.io/api/docs
- Portainer API spec (CE 2.39.1): https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Docs, API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer Docs, Inspect or edit a stack: https://docs.portainer.io/sts/user/docker/stacks/edit

## Issues Found
- The Compose example used the top-level `version: "3.8"` field. Current Docker Compose documentation marks the top-level `version` property as obsolete, so I removed it.
- The original post mixed Traefik's standalone Docker provider example with a Swarm-only `docker service update` command. Docker documents `docker service update` as a Swarm command, and Traefik documents that Swarm requires the Swarm provider with labels under `deploy.labels`. I removed the misleading command and clarified the Swarm-specific requirement.
- The green smoke-test example was not wired up in the Compose snippet: there was no direct port mapping or dedicated Traefik route for green. I added a green-only Traefik hostname and updated the smoke-test `curl` command to use that route.
- The automated Portainer API example had an incorrect request shape. Portainer's API expects `endpointId` as a query parameter and uses `StackFileContent` / `Env` field names in the JSON body. I corrected the endpoint, payload keys, and JSON construction.
- The script queried Traefik at `http://traefik:8080`, which does not match the published-host-port example shown in the Compose file. I changed it to `http://localhost:8080` so it aligns with the documented port mapping.

## Review Notes
- The post is technically accurate after the above fixes as of April 24, 2026.
- The automated switch example now explicitly targets a file-based Portainer stack, which matches the documented stack update endpoint behavior.
- `--api.insecure=true` is valid for demo setups, but Traefik recommends securing or not publicly exposing the API/dashboard in production.
