# Validation Summary: How to Configure Service Replicas in Portainer

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Docker Swarm (orchestration mode)
- Portainer CE (UI for Docker/Swarm)
- Docker CLI (`docker service`, `docker config`, `docker secret`, `docker node`, `docker stack`)
- Docker configs and secrets
- Portainer service webhooks

## Sources Consulted
- Docker `service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker `service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker `service scale`, `service rollback`, `service ps`, `service logs` references on docs.docker.com
- Docker `config` and `secret` CLI references: https://docs.docker.com/reference/cli/docker/config/ and https://docs.docker.com/reference/cli/docker/secret/
- Docker `node` CLI reference: https://docs.docker.com/reference/cli/docker/node/
- Docker Swarm `swarm init` / `swarm join` reference
- Portainer CE installation docs (Swarm agent stack URL pattern `https://downloads.portainer.io/ce2-XX/portainer-agent-stack.yml`)
- Portainer service webhooks documentation (webhook URL with optional `?tag=` query parameter)

## Issues Found
- The rollback configuration example used inline comments (`# ...`) appearing after `\` line-continuation characters. In bash, a backslash only acts as a line continuation when it is the last character before the newline; trailing whitespace/comment text after `\` breaks continuation, so the command would not run as written. Moved the explanatory comments to standalone lines above the command so the example is now valid bash.

## Review Notes
- All Docker CLI flags shown (`--replicas`, `--publish published=...,target=...`, `--update-delay`, `--update-parallelism`, `--rollback-parallelism`, `--rollback-delay`, `--update-failure-action rollback`, `--update-max-failure-ratio`, `--config`, `--secret`) are valid current options.
- `docker service scale myapp=5`, `docker service rollback`, `docker service ps`, `docker service logs --tail 100 -f`, `docker node ls`, `docker node inspect --pretty`, `docker node ps`, `docker config ls`, `docker secret ls` are all current.
- The Portainer agent stack URL `https://downloads.portainer.io/ce2-21/portainer-agent-stack.yml` corresponds to Portainer CE 2.21. As of mid-2026, newer Portainer CE 2.x releases exist; readers may wish to substitute the latest version path. The URL format itself is correct.
- The Portainer webhook URL pattern `https://<host>/api/webhooks/<uuid>?tag=<tag>` is accurate; the optional `tag` query parameter is supported for image tag overrides on container/service update webhooks.
- The post does not actually walk through the Portainer UI for setting replicas (despite the title); it primarily uses the Docker CLI with Portainer covered for stack deployment and webhooks. Content is technically accurate as a Swarm/Portainer reference, but the title vs. content mismatch could be tightened in a future revision.
