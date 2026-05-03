# Validation Summary: How to Create Services in Portainer on Docker Swarm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm (orchestration mode)
- Docker CLI (service, config, secret, node, swarm subcommands)
- Portainer CE (agent stack deployment, service webhooks)
- nginx (used as example image)

## Sources Consulted
- Docker `service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker `service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker `service rollback` reference: https://docs.docker.com/reference/cli/docker/service/rollback/
- Docker `service scale`, `ps`, `logs` references: https://docs.docker.com/reference/cli/docker/service/
- Docker `swarm init` / `swarm join`: https://docs.docker.com/reference/cli/docker/swarm/
- Docker `config create` and `secret create`: https://docs.docker.com/engine/swarm/configs/, https://docs.docker.com/engine/swarm/secrets/
- Docker `node` reference: https://docs.docker.com/reference/cli/docker/node/
- Portainer Swarm install docs: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer service webhooks: https://docs.portainer.io/user/docker/services

## Issues Found
No technical issues found.

- All `docker swarm init`/`join` flags (`--advertise-addr`, `--token`) and the manager port `2377` are correct.
- The Portainer CE agent stack URL pattern `https://downloads.portainer.io/ce<version>/portainer-agent-stack.yml` matches the published Portainer docs (CE 2.21 is a valid release).
- `docker service create` flags used (`--name`, `--replicas`, `--publish published=80,target=80`, `--update-delay`, `--update-parallelism`, `--rollback-parallelism`, `--update-failure-action`, `--update-max-failure-ratio`, `--rollback-delay`, `--config`, `--secret`) are all valid per the official CLI reference. `rollback` is a valid value for `--update-failure-action` (alongside `pause` and `continue`).
- `docker service scale myapp=5`, `docker service update --image ...`, `docker service rollback`, `docker service ps`, and `docker service logs --tail 100 -f` are all correct.
- `docker config create` and `docker secret create` reading from stdin via `-` is the documented syntax.
- `docker node ls`, `docker node inspect --pretty`, and `docker node ps <node-id>` are all valid commands.
- Portainer webhook URL format `/api/webhooks/<uuid>?tag=<image-tag>` is the documented pattern for triggering service image updates from CI/CD.

## Review Notes
- The Portainer CE version `ce2-21` in the download URL will become outdated as new releases ship. Readers should consult Portainer's install docs for the latest version path.
- `nginx:latest` and `nginx:1.25` are used as illustrative tags; the Docker pattern itself is version-agnostic.
- `docker info | grep -A 20 "Swarm:"` works on GNU grep; on environments without `-A` support a different approach would be needed, but this is fine for Linux hosts where Docker Swarm typically runs.
