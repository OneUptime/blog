# Validation Summary: How to Manage Swarm Nodes in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Swarm
- Portainer

## Sources Consulted
- Portainer Docker Swarm details documentation: https://docs.portainer.io/user/docker/swarm/details
- Docker Swarm node management guide: https://docs.docker.com/engine/swarm/manage-nodes/
- Docker `node inspect` CLI reference: https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker `node rm` CLI reference: https://docs.docker.com/reference/cli/docker/node/rm/
- Docker `swarm leave` CLI reference: https://docs.docker.com/reference/cli/docker/swarm/leave/
- Docker drain-node tutorial note about Drain affecting Swarm tasks, not standalone containers: https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Portainer source used to verify current Docker Swarm node UI capabilities: https://github.com/portainer/portainer

## Issues Found
- The Portainer navigation path was incorrect. The post said `Swarm > Nodes`, but current Portainer documentation shows `Swarm > Details`, with the node list inside the `Nodes` section. I updated the navigation text accordingly.
- The post implied Portainer can promote and demote Swarm nodes through a `Role` dropdown. Current Portainer documentation and source show the role is displayed in the node detail view, while availability and labels are editable. I changed the section to instruct readers to use `docker node promote` and `docker node demote` from a Swarm manager node, and added the manager quorum warning from Docker’s docs.
- The drain explanation was too broad. `Drain` reschedules Swarm service tasks, but it does not remove standalone containers created outside Swarm. I changed the wording from “all running tasks” to “Swarm service tasks”.
- The node removal workflow was incorrect. The original post said to drain the node and remove it from the Portainer UI, and said `docker node rm` requires the node to be drained first. Docker’s official docs state that `docker node rm` removes nodes that are down or have already left the swarm, and manager nodes must be demoted before removal. I replaced this with the correct `docker swarm leave` then `docker node rm` flow and clarified that draining alone is insufficient.
- The overview, description, and conclusion overstated Portainer-only management. I adjusted them so they accurately reflect that Portainer covers common visibility and node operations, while some lifecycle tasks still require the Docker CLI.

## Review Notes
- The Docker CLI examples in this post are current and use non-deprecated Swarm node commands.
- Portainer’s current Swarm node view supports inspecting node details, changing availability, and editing labels. Role changes and node removal are not documented there as UI actions, so the post now treats those as CLI-driven tasks.
