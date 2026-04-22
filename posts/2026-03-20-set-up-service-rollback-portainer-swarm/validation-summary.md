# Validation Summary: How to Set Up Service Rollback in Portainer on Swarm - Set

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Community Edition
- Docker Swarm
- Docker services
- Docker configs and secrets
- Portainer service webhooks

## Sources Consulted
- Docker CLI reference: `docker swarm init` - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker CLI reference: `docker swarm join` - https://docs.docker.com/reference/cli/docker/swarm/join/
- Docker CLI reference: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Docker CLI reference: `docker service update` - https://docs.docker.com/reference/cli/docker/service/update/
- Docker CLI reference: `docker service rollback` - https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker CLI reference: `docker config create` - https://docs.docker.com/reference/cli/docker/config/create/
- Docker CLI reference: `docker secret create` - https://docs.docker.com/reference/cli/docker/secret/create/
- Docker CLI reference: `docker node ps` - https://docs.docker.com/reference/cli/docker/node/ps/
- Portainer CE Docker Swarm installation docs - https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer service webhooks docs - https://docs.portainer.io/user/docker/services/webhooks
- OneUptime homepage - https://oneuptime.com/

## Issues Found
- The Portainer Swarm install command used an old version-pinned `ce2-21` download path while the post does not discuss that older version. Updated it to the current official CE LTS manifest path, `https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml`, and matched the output filename used by Portainer's current docs.
- The rollback configuration command placed inline comments after line-continuation backslashes. In a shell, that prevents the backslash from escaping the newline and breaks the multi-line command. Moved the explanation into standalone comments above the command and left the options as valid continued lines.
- The `docker node ps <node-id>` command was described as viewing node resource usage. Docker documents this command as listing tasks on one or more nodes, so the comment now says "View tasks on a node."

## Review Notes
Portainer service webhooks with `?tag=...` are supported for updating a service image tag, but Portainer documents service webhooks as available only for non-Edge environments. Docker's automatic rollback behavior depends on the service update failure threshold and monitoring period, so production services should set those values deliberately for their workload.
