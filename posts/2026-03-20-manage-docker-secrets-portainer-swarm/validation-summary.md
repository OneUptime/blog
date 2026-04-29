# Validation Summary: How to Manage Docker Secrets in Portainer on Swarm

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker Swarm
- Docker services
- Docker secrets
- Docker configs
- Portainer service webhooks

## Sources Consulted
- Portainer CE on Docker Swarm (Linux): https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer services: https://docs.portainer.io/user/docker/services
- Portainer secrets: https://docs.portainer.io/user/docker/secrets
- Portainer service webhooks: https://docs.portainer.io/sts/user/docker/services/webhooks
- Docker `swarm init`: https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker `service create`: https://docs.docker.com/reference/cli/docker/service/create/
- Docker `service update`: https://docs.docker.com/reference/cli/docker/service/update/
- Docker `service logs`: https://docs.docker.com/reference/cli/docker/service/logs/
- Docker `config create`: https://docs.docker.com/reference/cli/docker/config/create/
- Docker `secret create`: https://docs.docker.com/reference/cli/docker/secret/create/
- Docker `node inspect`: https://docs.docker.com/reference/cli/docker/node/inspect/
- Docker `node ps`: https://docs.docker.com/reference/cli/docker/node/ps/

## Issues Found
- The Portainer install snippet used the older `ce2-21` download path. Updated it to the current official `ce-lts` manifest URL and aligned the output filename with the deployed stack file.
- The post used `docker service rollback myapp`, which is not a valid Docker CLI subcommand. Replaced it with the documented rollback command: `docker service update --rollback myapp`.
- The service logs example placed flags after the service name. Reordered it to `docker service logs --tail 100 -f myapp` to match the documented CLI usage.
- The Docker secret creation example used `echo`, which appends a trailing newline and can unintentionally change secret values such as passwords. Replaced it with `printf`.
- The `docker node ps` comment incorrectly described the command as showing node resource usage. Updated the description to reflect that it lists tasks running on a node.
- The rollback policy snippet used inline comments after line-continuation backslashes, which makes the shell command invalid. Removed the inline comments so the command is syntactically correct.

## Review Notes
- Portainer's current CE Swarm installation docs use the `ce-lts` manifest path rather than a pinned `ce2-21` path, so version-specific install URLs in older drafts can become outdated.
- Portainer currently defaults to HTTPS on port `9443` for the UI when installed on Swarm.
- Docker was not available in the local workspace, so command validation was performed against the official Docker and Portainer documentation rather than by executing the CLI locally.
