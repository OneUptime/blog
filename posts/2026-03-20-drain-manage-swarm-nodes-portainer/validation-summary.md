# Validation Summary: How to Drain and Manage Swarm Nodes from Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Engine CLI

## Sources Consulted
- Docker Docs: Drain a node on the swarm - https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Docker Docs: Manage nodes in a swarm - https://docs.docker.com/engine/swarm/manage-nodes/
- Docker Docs: docker node update - https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs: docker node ps - https://docs.docker.com/reference/cli/docker/node/ps/
- Docker Docs: docker node rm - https://docs.docker.com/reference/cli/docker/node/rm/
- Docker Docs: docker swarm leave - https://docs.docker.com/reference/cli/docker/swarm/leave/
- Docker Docs: docker swarm join - https://docs.docker.com/reference/cli/docker/swarm/join/
- Docker Docs: How services work - https://docs.docker.com/engine/swarm/how-swarm-mode-works/services/
- Portainer Docs: Swarm - https://docs.portainer.io/2.33-lts/user/docker/swarm
- Portainer Docs: Details - https://docs.portainer.io/2.33-lts/user/docker/swarm/details

## Issues Found
- The post described drain as "migrating" tasks and implied it covers all workloads. Docker documents drain as stopping swarm service tasks on that node and creating replacement tasks on other `Active` nodes, and it does not affect standalone containers. I corrected the wording to refer to swarm service task rescheduling.
- The post implied draining ensures "no downtime". Docker only guarantees desired-state reconciliation; service tasks can remain pending if no eligible active node can run them. I changed the maintenance and summary text to remove the downtime guarantee and note the dependency on eligible capacity and placement rules.
- The Portainer navigation said `Swarm > Nodes`, but current Portainer docs describe the node list from the Swarm details view rather than a `Nodes` submenu. I updated the UI instruction to match the documented navigation more closely without changing the flow.
- Several CLI examples omitted required execution context. Docker documents `docker node update`, `docker node ps`, and `docker node rm` as cluster-management commands that must run on a swarm manager, while `docker swarm leave` must run on the node being removed. I added the missing context comments.
- Manager removal did not mention quorum. Docker documents that manager removal must preserve quorum. I added a short note to maintain manager quorum before removing a manager node.
- The line claiming a new node appears in Portainer "within seconds" was more specific than the docs support. I softened that wording to avoid a timing guarantee.

## Review Notes
- Docker CLI was not installed in the local environment on May 1, 2026, so command validation relied on current official Docker documentation rather than local `--help` output.
- The commands and behaviors in the post remain valid for current Docker Swarm mode documentation as of May 1, 2026.
