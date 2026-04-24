# Validation Summary: How to Configure Swarm Service Placement Strategies in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Docker Compose / Swarm stack deployment

## Sources Consulted
- Docker Docs: Deploy services to a swarm - https://docs.docker.com/engine/swarm/services/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: docker node update - https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs: docker service create - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: Drain a node on the swarm - https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Docker Docs: Docker object labels - https://docs.docker.com/engine/manage-resources/labels/
- Portainer Documentation: Add a new service - https://docs.portainer.io/user/docker/services/add
- Portainer Documentation: Details (Docker Swarm node details) - https://docs.portainer.io/2.33-lts/user/docker/swarm/details
- Portainer Documentation: Install Portainer Agent on Docker Swarm - https://docs.portainer.io/admin/environments/add/swarm/agent

## Issues Found
- The post incorrectly stated that Docker Swarm supports `spread`, `binpack`, and `random` placement strategies. I replaced this with the current Swarm-mode model: placement `constraints` plus placement `preferences`, where `spread` is the only supported preference strategy.
- The description referenced "affinity rules", which are not the current Swarm-mode placement mechanism documented by Docker. I changed this to placement constraints and spread preferences.
- The sample node labels were internally inconsistent: `postgres` required both `storage=ssd` and `type=database`, but the original labels did not place both values on the same node. I moved the `type=database` label to `manager1` so the example can schedule as written.
- The `portainer-agent` example constrained the agent to manager nodes only. Portainer documents the agent as a global service, with placement constraints such as `node.platform.os` used when needed. I updated the example to run globally on Linux nodes.
- The Portainer UI section used raw expression-style input and a specific placement tab reference that is not reflected in the current official docs. I rewrote it to describe adding placement constraints and preferences through Portainer's advanced service options.
- The dynamic placement section incorrectly claimed that removing a node label would cause running services to migrate away immediately. I corrected this to explain that label changes affect scheduling eligibility, and added the accurate note that `drain` is the mechanism for moving running service tasks off a node during maintenance.

## Review Notes
- Portainer currently documents the classic Portainer Agent on Swarm as a legacy option and recommends the Edge Agent for many newer use cases.
- Swarm placement preferences are best-effort. If a service must only run on nodes carrying the label used for `spread`, combine the preference with an appropriate constraint.
