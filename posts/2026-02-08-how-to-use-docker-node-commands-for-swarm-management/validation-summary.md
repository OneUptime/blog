# Validation Summary: How to Use docker node Commands for Swarm Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Swarm mode
- Docker CLI `docker node` commands
- Bash scripting

## Sources Consulted
- Docker Docs: `docker node` CLI reference - https://docs.docker.com/reference/cli/docker/node/
- Docker Docs: `docker node ls` CLI reference - https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Docs: `docker node inspect` CLI reference - https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker Docs: `docker node ps` CLI reference - https://docs.docker.com/reference/cli/docker/node/ps/
- Docker Docs: `docker node update` CLI reference - https://docs.docker.com/reference/cli/docker/node/update/
- Docker Docs: `docker node rm` CLI reference - https://docs.docker.com/reference/cli/docker/node/rm/
- Docker Docs: Administer and maintain a swarm of Docker Engines - https://docs.docker.com/engine/swarm/admin_guide/
- Docker Docs: How nodes work - https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/
- Local Docker CLI help output for `docker node`, `docker node ls`, `docker node inspect`, `docker node ps`, `docker node update`, and `docker node rm`

## Issues Found
- The post described `docker node ps --filter desired-state=running` as showing only running tasks and excluding completed or failed ones. Docker documents `desired-state` as filtering by desired state values (`running`, `shutdown`, or `accepted`), not by the task's current runtime state. Updated the explanation and rolling maintenance script variable/message to say "desired state of running."

## Review Notes
The commands and flags reviewed are current and match Docker's official CLI documentation. `docker node` commands are swarm manager cluster-management commands, so the examples assume they are run from a manager node unless explicitly run on the node being removed.
