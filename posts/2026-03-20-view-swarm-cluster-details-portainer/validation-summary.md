# Validation Summary: How to View Swarm Cluster Details in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer CE (2.21)
- Docker Swarm mode
- Docker services, configs, and secrets
- Docker CLI (`docker service`, `docker node`, `docker config`, `docker secret`, `docker info`)
- Portainer Service Webhooks API
- Shell / curl / CI-CD webhook integration

## Sources Consulted
- Docker Engine CLI reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker Engine CLI reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Engine CLI reference: https://docs.docker.com/reference/cli/docker/node/ps/
- Docker Engine CLI reference: https://docs.docker.com/reference/cli/docker/config/create/
- Docker Swarm mode overview: https://docs.docker.com/engine/swarm/
- Portainer CE installation docs: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer downloads: https://downloads.portainer.io/
- Portainer webhooks documentation: https://docs.portainer.io/user/docker/services/webhooks

## Issues Found
- **`docker node ps <node-id>` comment was inaccurate.** The original comment read "View node resource usage", but `docker node ps` lists the tasks currently running on a node — it does not show CPU/memory resource metrics. Updated the comment to "View tasks running on a node" to match the actual behavior documented in the Docker CLI reference.

## Review Notes
- The Portainer download URL `https://downloads.portainer.io/ce2-21/portainer-agent-stack.yml` is valid for Portainer CE 2.21. By April 2026, newer CE releases exist, but pinning to 2.21 is intentional and syntactically correct. Readers wanting the latest should check https://docs.portainer.io for the current stack URL.
- `--publish published=80,target=80`, `--update-failure-action rollback`, `--update-max-failure-ratio 0.25`, `--rollback-parallelism`, and `--rollback-delay` are all valid and current `docker service create/update` flags.
- The Portainer service webhook URL format (`/api/webhooks/<uuid>?tag=<tag>`) matches the documented service webhook API; the post correctly scopes this to service webhooks (not stack webhooks).
- `docker config create <name> -` reading from stdin and `docker secret create <name> -` are both documented and correct.
- Content about viewing swarm cluster details is delivered primarily via CLI commands; the Portainer UI itself is referenced only briefly. Title accurately reflects the hybrid CLI+UI nature of the guide.
