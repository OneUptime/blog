# Validation Summary: How to Drain and Remove Docker Swarm Nodes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Docker Engine
- Docker Swarm mode
- Docker CLI
- Swarm node management
- Swarm service task scheduling
- Raft quorum management

## Sources Consulted
- Docker Docs: Drain a node on the swarm - https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Docker Docs: Manage nodes in a swarm - https://docs.docker.com/engine/swarm/manage-nodes/
- Docker Docs: Administer and maintain a swarm of Docker Engines - https://docs.docker.com/engine/swarm/admin_guide/
- Docker Docs: docker node rm CLI reference - https://docs.docker.com/reference/cli/docker/node/rm/
- Docker Docs: docker swarm leave CLI reference - https://docs.docker.com/reference/cli/docker/swarm/leave/
- Docker Docs: docker swarm init CLI reference - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: docker node ls CLI reference - https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Docs: docker node ps CLI reference - https://docs.docker.com/reference/cli/docker/node/ps/
- Docker Docs: docker service ps CLI reference - https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: docker service update CLI reference - https://docs.docker.com/reference/cli/docker/service/update/
- Local Docker CLI help output for `docker node update`, `docker node rm`, `docker node demote`, `docker swarm leave`, `docker swarm init`, `docker service update`, `docker node ps`, `docker service ps`, `docker node ls`, and `docker service ls`.

## Issues Found
- The post described draining as migrating all tasks to other nodes. Docker Swarm drain stops swarm service tasks on the drained node and creates replacement tasks on active nodes; it does not live-migrate containers and does not affect standalone containers. Updated wording to refer specifically to swarm service tasks and replacement scheduling.
- The manager removal section said it was a three-step process while showing four steps. Updated the description and numbered list to match the commands.
- The post implied a manager could be removed without demotion and that the remaining managers would simply adjust the Raft group. Docker requires manager nodes to be demoted before removal. Updated the explanation to state that demotion is required and cleanly updates Raft membership.
- The dead worker section stated Swarm had already rescheduled tasks after a task timeout. Updated this to the more accurate behavior: Swarm attempts to reschedule service tasks when a node becomes unreachable, assuming suitable capacity exists.
- The maintenance script used `--filter "desired-state=running"` to count tasks on a drained node. During drain, terminating tasks may already have desired state `Shutdown`, so that check can return zero before the containers have actually stopped. Updated the script to check current task states and wait until no non-terminal states remain.
- The final monitoring command checked a drained node for desired-running tasks, which does not verify replacement tasks elsewhere. Updated it to inspect the service's desired-running tasks.
- The capacity check command used `docker node ls --format '{{.Hostname}}: {{.Status}}'`, which shows readiness status, not CPU or memory capacity. Replaced it with a `docker node inspect` command that reports advertised CPU and memory resources.
- The "Use labels for selective draining" best practice did not use labels in the command shown. Renamed the note to accurately describe listing affected tasks before draining.

## Review Notes
The commands and flags reviewed are current in Docker's CLI reference. Operators should still verify capacity, placement constraints, and replica counts before draining, because service availability during drain depends on the service configuration and the remaining nodes' ability to run replacement tasks.
