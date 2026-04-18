# Validation Summary: How to View Service Task Status in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm (swarm init, join, service, node, config, secret)
- Portainer CE (Swarm stack deployment, webhooks)
- Docker CLI service management (create, scale, update, rollback, ps, logs)
- Docker configs and secrets
- CI/CD webhook integration

## Sources Consulted
- Docker Swarm mode documentation: https://docs.docker.com/engine/swarm/
- `docker service create` reference: https://docs.docker.com/reference/cli/docker/service/create/
- `docker service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- `docker service rollback` reference: https://docs.docker.com/reference/cli/docker/service/rollback/
- `docker node` reference: https://docs.docker.com/reference/cli/docker/node/
- `docker config` and `docker secret` references: https://docs.docker.com/reference/cli/docker/config/ and https://docs.docker.com/reference/cli/docker/secret/
- Portainer Swarm installation docs: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer webhook API reference: https://docs.portainer.io/

## Issues Found
No technical issues found.

- Swarm management port 2377 referenced in the join command is correct.
- `--publish published=80,target=80` long-form syntax is valid and current.
- `--update-failure-action rollback`, `--update-max-failure-ratio`, `--rollback-parallelism`, and `--rollback-delay` flags all exist and behave as described.
- `docker node ps <node-id>` correctly lists tasks running on the specified node.
- Portainer CE agent stack URL path pattern (`ce2-21/portainer-agent-stack.yml`) matches Portainer's published layout.
- The Portainer service webhook endpoint `POST /api/webhooks/<uuid>?tag=<tag>` matches the documented behavior for updating a service to a new image tag.

## Review Notes
- The inline comments on continuation lines in the "Service Rollback Configuration" block (e.g., `--update-failure-action rollback \    # Auto-rollback on failure`) are a common documentation pattern but technically break bash line continuation if copied verbatim, because the `\` is no longer the final character before the newline. Left as-is since this is a widely understood annotation style in tutorials and the flags themselves are accurate.
- The post title focuses on "viewing service task status in Portainer" but the body covers broader service management, configs/secrets, node inspection, rollback policies, and webhooks. The technical content is correct; the scope is just wider than the title implies.
- Specific version references (`nginx:1.25`, Portainer `ce2-21`) are current as of the post's publication date.
