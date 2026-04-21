# Validation Summary: How to Configure Swarm Service Placement Strategies in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Docker Swarm stack management
- Docker Engine Swarm mode
- Docker Compose Deploy Specification
- Docker CLI node and service commands

## Sources Consulted
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker node update CLI reference - https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs: docker node ls CLI reference - https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Docs: docker service ps CLI reference - https://docs.docker.com/reference/cli/docker/service/ps/
- Portainer Documentation: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: Swarm details - https://docs.portainer.io/user/docker/swarm/details
- Portainer Documentation: Configure service options - https://docs.portainer.io/user/docker/services/configure
- Portainer Documentation: View the status of a service task - https://docs.portainer.io/user/docker/services/tasks

## Issues Found
- The placement preferences description said Swarm can "spread or pack" replicas. Docker's documented placement preference strategy currently only supports `spread`, so this was changed to "spread replicas across values of a label."
- The node-label troubleshooting command used `docker node ls --filter label=tier=gpu`. Docker documents `label` as an engine-label filter and `node.label` as the filter for Swarm node labels, so this was changed to `docker node ls --filter node.label=tier=gpu`.
- The Portainer node-label UI path was listed as `Swarm > Nodes > [node] > Labels`. Current Portainer documentation places node label management in the node overview under `Swarm > Details > [node] > Node Details`, so the path was updated.
- The "built-in placement filters" table used `engine.labels.ostype == linux` as a built-in node property. Docker documents `engine.labels` as Docker Engine labels and `node.platform.os` as the built-in operating-system constraint field, so the example was changed to `node.platform.os == linux`.
- The troubleshooting sentence stated that pending replicas always mean no nodes satisfy the constraints. Pending tasks can also be caused by other scheduling requirements, so the wording was narrowed to placement-constraint failures.

## Review Notes
The stack YAML's `deploy.placement.constraints` and `deploy.placement.preferences` structure matches the Compose Deploy Specification for Swarm-style deployments. The `docker node update --label-add` and `docker service ps --no-trunc` commands are current and documented, with the caveat that `docker node update` must be run against a Swarm manager.
