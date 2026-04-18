# Validation Summary: How to View Service Logs in Portainer on Swarm - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Docker Swarm (orchestration)
- Docker CLI (service, node, config, secret, stack subcommands)
- Portainer CE 2.21 (Swarm management UI, webhooks)
- nginx (example image)

## Sources Consulted
- Docker CLI reference for `docker node ps`: https://docs.docker.com/reference/cli/docker/node/ps/
- Docker CLI reference for `docker service create` / `update` / `rollback` / `scale` / `logs` / `ps`: https://docs.docker.com/reference/cli/docker/service/
- Docker CLI reference for `docker swarm init` / `join`: https://docs.docker.com/reference/cli/docker/swarm/
- Docker CLI reference for `docker config` and `docker secret`: https://docs.docker.com/reference/cli/docker/config/ and https://docs.docker.com/reference/cli/docker/secret/
- Portainer CE Swarm install docs: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Verified URL `https://downloads.portainer.io/ce2-21/portainer-agent-stack.yml` returns HTTP 200
- Portainer webhook documentation: https://docs.portainer.io/user/docker/services/webhooks

## Issues Found
- The comment "View node resource usage" above `docker node ps <node-id>` was inaccurate. `docker node ps` lists tasks running on a node, not resource utilization metrics (CPU/memory). Updated the comment to "View tasks running on a node" to match the command's actual behavior.

## Review Notes
- The Portainer download URL uses the versioned path `ce2-21`. This works today (HTTP 200), but the official Portainer docs now recommend the `ce-lts` (Long-Term Support) path which auto-points to the latest LTS release. Future revisions may want to swap to `ce-lts` for longevity.
- All Docker Swarm CLI flags (`--update-failure-action`, `--update-max-failure-ratio`, `--rollback-parallelism`, `--rollback-delay`, `--update-delay`, `--update-parallelism`) are valid and current.
- The short-form `--config <name>` and `--secret <name>` syntax used in the service create example is valid and mounts the resource at `/<name>` inside the container by default.
- The `--publish published=80,target=80` long-form syntax is correct.
- The Portainer webhook URL pattern `https://<portainer>/api/webhooks/<uuid>?tag=<tag>` is the documented format for triggering image-tag updates.
