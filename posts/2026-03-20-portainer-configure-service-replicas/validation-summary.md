# Validation Summary: How to Configure Service Replicas in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Docker Compose deploy configuration for Swarm stacks

## Sources Consulted
- Docker Docs: `docker service create` https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: `docker service ps` https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: `docker node update` https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs: Deploy services to a swarm https://docs.docker.com/engine/swarm/services/
- Docker Docs: Compose Deploy Specification https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: `docker stack deploy` https://docs.docker.com/reference/cli/docker/stack/deploy/
- Portainer Docs: Add a new service https://docs.portainer.io/user/docker/services/add
- Portainer Docs: Configure service options https://docs.portainer.io/sts/user/docker/services/configure
- Portainer Docs: Scale a service https://docs.portainer.io/user/docker/services/scale
- Portainer Docs: View the status of a service task https://docs.portainer.io/sts/user/docker/services/tasks

## Issues Found
- The existing-service replica update steps did not match Portainer's current documented workflow. I updated the instructions to use the documented scale control in the **Scheduling Mode** column.
- The Portainer task-inspection instructions were inaccurate. I changed them to the documented flow of expanding the service with the down-arrow in the **Services** view.
- The constraint section was labeled as if it were a complete list, but it omitted supported built-in keys such as `node.platform.os` and `node.platform.arch`. I renamed the section to **Common Constraint Keys** and added the missing examples.
- The engine label example used a vague operating-system value. I updated it to match Docker's current official example style: `engine.labels.operatingsystem == ubuntu-24.04`.
- The placement-preference explanation was slightly too absolute. I revised it to reflect Docker's best-effort spread behavior across label values.
- The `docker service ps --format` example showed node names even though Docker's documented `.Node` template placeholder is the node identifier. I replaced the example with the standard `docker service ps` output, which is the safer documented way to show node placement.
- The replicated-mode use-case list implied that generic databases are a straightforward fit for service replicas. I narrowed that wording to stateful services that explicitly support clustering or replication.
- The global-mode explanation said "every node" without qualification. I corrected this to "every eligible node" to match Swarm scheduling behavior.

## Review Notes
- `version: "3.8"` remains acceptable in the stack example because Docker Swarm stack deployment still uses the legacy Compose file v3 format via `docker stack deploy`, even though the latest standalone Compose specification has evolved separately.
- The local workspace did not have the `docker` CLI installed, so command verification was performed against official Docker and Portainer documentation rather than local `--help` output.
