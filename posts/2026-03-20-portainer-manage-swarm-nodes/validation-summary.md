# Validation Summary: How to Manage Swarm Nodes in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Swarm node management

## Sources Consulted
- Portainer Swarm overview: https://docs.portainer.io/2.33-lts/user/docker/swarm.md
- Portainer Swarm details: https://docs.portainer.io/2.33-lts/user/docker/swarm/details.md
- Docker Swarm node management: https://docs.docker.com/engine/swarm/manage-nodes.md
- Docker Swarm administration guide: https://docs.docker.com/engine/swarm/admin_guide.md
- Docker Swarm join nodes: https://docs.docker.com/engine/swarm/join-nodes.md
- Docker CLI `docker node update`: https://docs.docker.com/reference/cli/docker/node/update.md
- Docker CLI `docker node rm`: https://docs.docker.com/reference/cli/docker/node/rm.md
- Docker CLI `docker node promote`: https://docs.docker.com/reference/cli/docker/node/promote.md

## Issues Found
- Corrected the Portainer navigation and node-list descriptions. Official Portainer docs describe the Swarm `Details` page and list role, CPU and memory, engine version, IP address, status, and availability. The original post had the status and availability meanings swapped and claimed the list showed running task counts.
- Corrected the Portainer UI workflow for availability and labels. Current Portainer documentation shows these changes are made directly on the node overview page and saved with `Apply changes`, not through a separate `Edit this node` flow.
- Removed the claim that Portainer can promote or demote Swarm node roles from the UI. Official Portainer docs only document viewing the role, setting availability, viewing current status, and applying labels on the node overview page; promotion and demotion are done with the Docker CLI.
- Removed the unsupported instruction to remove a Swarm node from the Portainer node detail view. The official Swarm node docs for Portainer do not document a node-detail remove action, while Docker documents removal through `docker swarm leave` followed by `docker node rm`.
- Adjusted the intro, description, prerequisites, and conclusion so they no longer imply all node lifecycle operations happen inside Portainer or that draining guarantees zero downtime.

## Review Notes
- `docker service update --force` is technically valid for rebalancing, but Docker documents that it restarts service tasks and may disrupt clients. The post’s command is correct, but this operational caveat could be called out more explicitly in a future revision.
