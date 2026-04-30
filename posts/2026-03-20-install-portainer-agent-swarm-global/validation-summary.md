# Validation Summary: How to Install Portainer Agent on Docker Swarm as a Global Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm
- Docker CLI (`docker service create`, `docker stack deploy`, overlay networking)
- Docker Compose v3 syntax for Swarm stacks
- Portainer Agent
- Portainer Community Edition

## Sources Consulted
- Portainer Documentation: Install Portainer Agent on Docker Swarm — https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Documentation: Install Portainer CE with Docker Swarm on Linux — https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer published Swarm manifest — https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml
- Docker Docs: `docker service create` — https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: Manage swarm service networks — https://docs.docker.com/engine/swarm/networking/
- Docker Docs: `docker stack deploy` — https://docs.docker.com/reference/cli/docker/stack/deploy/

## Issues Found
1. **The `docker service create` example was incomplete.** It attached the service to `portainer_agent_network` without creating that overlay network first. Docker's Swarm docs require the network to exist before using `--network` with `docker service create`. I added `docker network create --driver overlay portainer_agent_network` before the service creation command.

2. **The stack-file agent deployment did not publish port `9001`.** Portainer's Swarm agent documentation requires the Portainer Server to be able to reach the Swarm nodes on port `9001`, and the matching `docker service create` example already published that port. Without a `ports` section, the agent service would not be exposed for external Portainer Server connections. I added a `ports` entry that publishes `9001` in `host` mode.

3. **The full Portainer + Agent stack omitted the Linux placement constraint on the agent service.** Portainer's published Swarm manifest constrains the agent to `node.platform.os == linux`. Without that constraint, mixed-OS swarms can attempt to schedule the Linux agent image onto Windows nodes and fail. I added the missing placement constraint.

## Review Notes
- Portainer's current documentation labels the traditional Portainer Agent on Docker Swarm as a legacy option and recommends the Edge Agent for most new deployments. This post is still technically valid for classic agent-based Swarm setups.
- The post uses `:latest` image tags. Portainer's current Swarm installation manifest uses `:lts`, while other Portainer docs still show `:latest` in some examples. The commands are plausible, but pinning to `:lts` or an explicit version would make the deployment more predictable.
- The stack examples use Compose file version `3.8`. Docker's `docker stack deploy` documentation still supports legacy Compose file version `3.0` and above, so this remains valid for Swarm stack deployment.
