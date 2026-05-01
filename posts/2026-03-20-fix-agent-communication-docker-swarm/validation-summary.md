# Validation Summary: How to Fix Agent Communication Issues on Docker Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Docker Swarm
- Docker overlay networking
- Swarm DNS service discovery
- UFW firewall configuration

## Sources Consulted
- Portainer documentation, "Install Portainer Agent on Docker Swarm": https://docs.portainer.io/admin/environments/add/swarm/agent
- Docker Docs, "Getting started with Swarm mode": https://docs.docker.com/engine/swarm/swarm-tutorial/
- Docker Docs, "Manage swarm service networks": https://docs.docker.com/engine/swarm/networking/
- Portainer official `agent` repository README: https://github.com/portainer/agent
- Portainer official `portainer-compose` Swarm stack example: https://github.com/portainer/portainer-compose/blob/master/docker-stack.yml
- Portainer agent source, swarm startup logic: https://raw.githubusercontent.com/portainer/agent/develop/cmd/agent/main.go

## Issues Found
- The post presented the standard Portainer Agent on Docker Swarm as the default/current approach. I changed the opening sentence to mark it as a legacy option, matching current Portainer documentation.
- The overlay-network diagnostic commands used `docker exec` against an agent container and targeted `tasks.portainer_agent_agent`. I replaced them with `docker run --rm --network ... busybox ...` checks against `tasks.agent`, which is the documented Swarm service alias pattern and avoids depending on troubleshooting tools being present inside the agent image.
- The firewall section omitted two material networking requirements from the official docs. I added that the Portainer Server instance must be able to reach nodes on `9001/tcp`, and that encrypted overlay networks also require IP protocol 50 (ESP) between nodes.

## Review Notes
The post is technically valid after these fixes. Portainer’s current documentation recommends the Edge Agent for most new Docker Swarm setups, but the standard Agent guidance here is still relevant for existing legacy deployments.
