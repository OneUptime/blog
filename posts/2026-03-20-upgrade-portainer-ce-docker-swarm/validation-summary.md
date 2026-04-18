# Validation Summary: How to Upgrade Portainer CE on Docker Swarm - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer Community Edition (CE)
- Docker Swarm
- Docker Compose (stack file v3.8)
- Docker CLI (`docker service`, `docker stack`)
- Alpine Linux (backup container)

## Sources Consulted
- Portainer CE official installation docs for Swarm: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer upgrade documentation: https://docs.portainer.io/start/upgrade
- Docker `service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker `stack deploy` reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker `service inspect` reference: https://docs.docker.com/reference/cli/docker/service/inspect/
- Compose file v3 reference: https://docs.docker.com/reference/compose-file/legacy-versions/
- Portainer agent image: https://hub.docker.com/r/portainer/agent

## Issues Found
No technical issues found.

Verification details:
- `portainer/portainer-ce` and `portainer/agent` are the current official images on Docker Hub.
- Portainer agent listens on TCP port 9001 by default, and `tasks.agent` is the correct Docker Swarm DNS name for load-balancing across agent tasks.
- `-H tcp://tasks.agent:9001 --tlsskipverify` matches the documented Portainer-on-Swarm command.
- Ports 9443 (HTTPS UI), 9000 (legacy HTTP UI), and 8000 (Edge agent tunnel) match the documented port mappings.
- `docker service update --image <image> --force <service>` is a valid way to trigger a rolling update of a Swarm service.
- `docker service ps --no-trunc`, `--filter desired-state=running`, and the `docker service inspect --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'` Go template are all correct.
- `mode: global` for the agent and `mode: replicated` with a manager-node placement constraint for the Portainer server is the canonical Swarm deployment pattern.
- The Compose v3.8 schema is valid and widely supported by the Swarm stack deployer.

## Review Notes
- If readers deploy via `docker stack deploy -c portainer-stack.yml portainer`, the resulting service names will be prefixed (e.g. `portainer_portainer`, `portainer_agent`). The post's `docker service update portainer` (Option 1) targets a standalone service not deployed via a stack. This is consistent with how Option 1 and Option 2 are framed as alternatives, but readers mixing the two approaches should remember the stack-name prefix.
- Port 9000 (plain HTTP) is considered legacy; newer Portainer deployments may drop it in favor of 9443 (HTTPS) only. Exposing it is not required but remains supported.
- `portainer/portainer-ce:latest` and `portainer/agent:latest` work but pinning to a specific version (e.g. `portainer/portainer-ce:2.21.4`) is generally a better practice for reproducible upgrades.
- The Compose spec has moved beyond explicit `version:` fields (the modern spec ignores them), but `version: "3.8"` is still accepted by `docker stack deploy` and is compatible with current Docker Swarm.
