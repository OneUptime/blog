# Validation Summary: How to Scale Services in Portainer on Docker Swarm - Docker

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Docker Swarm mode
- Docker CLI
- Portainer CE
- Docker Swarm services
- Docker configs and secrets
- Portainer service webhooks

## Sources Consulted
- Docker Docs: Run Docker Engine in swarm mode - https://docs.docker.com/engine/swarm/swarm-mode/
- Docker Docs: docker service create CLI reference - https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: docker service update CLI reference - https://docs.docker.com/reference/cli/docker/service/update/
- Docker Docs: docker service scale CLI reference - https://docs.docker.com/reference/cli/docker/service/scale/
- Docker Docs: docker service ps, logs, and rollback CLI references - https://docs.docker.com/reference/cli/docker/service/ps/, https://docs.docker.com/reference/cli/docker/service/logs/, https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker Docs: docker node ps and inspect CLI references - https://docs.docker.com/reference/cli/docker/node/ps/, https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker Docs: Docker configs and secrets - https://docs.docker.com/engine/swarm/configs/, https://docs.docker.com/engine/swarm/secrets/
- Portainer Documentation: Install Portainer CE with Docker Swarm on Linux - https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer Documentation: Docker Swarm services, scaling, logs, rollback, and webhooks - https://docs.portainer.io/user/docker/services, https://docs.portainer.io/user/docker/services/scale, https://docs.portainer.io/user/docker/services/webhooks
- OneUptime homepage link check - https://oneuptime.com

## Issues Found
- The Portainer Swarm install command used the older `ce2-21` download path. Updated it to the current official `ce-lts` stack manifest URL and matching `portainer-agent-stack.yml` filename from Portainer's Docker Swarm installation documentation.
- The `docker node ps <node-id>` comment described the command as showing node resource usage. Docker documents this command as listing tasks running on one or more nodes, so the comment was corrected.
- The service rollback configuration example had inline comments after shell continuation backslashes. That breaks the multi-line command because the backslash no longer escapes the newline. Removed the inline comments so the command is syntactically valid.

## Review Notes
Docker was not installed in the local review environment, so CLI behavior was verified against the official Docker CLI reference and Docker Swarm documentation. The Portainer webhook example is valid for non-Edge Portainer environments; passing a `tag` query parameter updates the service image tag as documented by Portainer.
