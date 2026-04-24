# Validation Summary: How to Drain and Manage Swarm Nodes from Portainer - Node

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Portainer API
- Docker Engine API
- Bash
- Python 3

## Sources Consulted
- Docker Docs: Manage nodes in a swarm - https://docs.docker.com/engine/swarm/manage-nodes/
- Docker Docs: Drain a node on the swarm - https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Docker Docs: docker node ls - https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Docs: docker node ps - https://docs.docker.com/reference/cli/docker/node/ps/
- Docker Docs: docker node update - https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs: Docker Engine API - https://docs.docker.com/reference/api/engine/
- Docker Docs: Engine API v1.24 - https://docs.docker.com/reference/api/engine/version/v1.24/
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer Docs: API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer Docs: Swarm details - https://docs.portainer.io/2.33-lts/user/docker/swarm/details

## Issues Found
- The Portainer UI navigation was inaccurate. The post said `Swarm > Nodes`, but Portainer documents swarm nodes under `Swarm > Details`, with node availability managed from the node overview. I corrected the UI path and changed the task-monitoring reference from `Swarm > Services` to `Services`.
- The post overstated what draining does by saying it removes "all running tasks" and later implied "all tasks" migrate. Docker documents drain as affecting Swarm service scheduling only, not standalone containers. I corrected the wording in the introduction, availability-state explanation, and conclusion.
- The CLI verification example used `docker node ps worker1` with the comment "Should show nothing running". Docker shows task history there, including shutdown tasks, so that comment was inaccurate. I changed the example to `docker node ps worker1 --filter desired-state=running` and clarified that it should show no running tasks.
- The maintenance script would continue after a timeout even if tasks had not drained yet. That contradicts the post's "safe maintenance workflow" framing and can be unsafe if services cannot be rescheduled. I changed the script to stop with an error and instruct the reader to check service constraints, replica counts, and cluster capacity before proceeding.
- The Portainer API example hardcoded `Role: worker` and `Labels: {}` when updating the node. Docker's node-update API replaces the node spec, and omitted fields reset while hardcoded values can unintentionally demote a manager or wipe labels. I changed the example to fetch the current node object, preserve the existing spec, update only `Availability`, and then submit the full spec back through Portainer's Docker API proxy.
- The removal section heading implied node removal was being done "from Portainer", but the actual instructions used Docker CLI commands. I corrected the heading to match the implementation shown.

## Review Notes
- Docker requires these node-management CLI commands to be run from a swarm manager node, so I made that explicit in the CLI and script sections.
- Docker's current API reference points readers to versioned Engine API docs; the node update request shape used here is verified against the official Engine API documentation for `POST /nodes/{id}/update` and remains applicable to the Portainer-proxied Docker endpoint.
