# Validation Summary: How to Monitor Service Image Updates in Portainer on Swarm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Swarm (cluster init/join, services, configs, secrets, nodes)
- Docker CLI (`docker service`, `docker stack`, `docker node`, `docker config`, `docker secret`, `docker info`)
- Portainer CE (Swarm agent stack deployment, service webhooks)
- Bash / curl

## Sources Consulted
- Docker `service update` CLI reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker `service create` CLI reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker Swarm mode init / join docs: https://docs.docker.com/engine/swarm/swarm-mode/
- Portainer Swarm install docs: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer service webhooks docs: https://docs.portainer.io/user/docker/services/webhooks
- Portainer 2.39 LTS release notes / GitHub releases: https://github.com/portainer/portainer/releases
- GNU Bash manual on quoting / escape character: https://www.gnu.org/software/bash/manual/bash.html#Escape-Character

## Issues Found

1. **Outdated Portainer download URL** — The original post pinned to `https://downloads.portainer.io/ce2-21/portainer-agent-stack.yml` (Portainer CE 2.21, released September 2024). For a post dated 2026-03-20, this is significantly outdated; current LTS is 2.39 (Feb 2026). Replaced with the official `ce-lts` alias (`https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml`) which always resolves to the current LTS, matching Portainer's recommended install instructions.

2. **Broken inline comments after backslash line continuation** — In the "Service Rollback Configuration" snippet, two lines used the pattern `--flag value \    # comment`. A backslash must be the *immediately last character before the newline* for line continuation to work; trailing whitespace plus a `#` comment terminates the line and causes subsequent lines to run as separate (failing) commands. Verified by direct shell test. Moved the explanatory comments to standalone `#` lines above the `docker service create` command, preserving the author's intent without breaking the snippet.

## Review Notes
- The Portainer service webhook URL pattern (`POST /api/webhooks/<uuid>?tag=<tag>`) is correct and matches Portainer's documented behavior — the `tag` query parameter is exposed for image tag updates.
- All Docker service flags shown (`--update-delay`, `--update-parallelism`, `--update-failure-action`, `--update-max-failure-ratio`, `--rollback-parallelism`, `--rollback-delay`, `--publish published=80,target=80`, `--config`, `--secret`) are valid per current Docker CLI reference.
- The `docker swarm join` worker port `2377` is correct (cluster management port).
- Style note (not fixed): the post's title promises coverage of "monitoring service image updates" specifically, but the body is largely a general Swarm/Portainer commands reference. The webhook section is the only piece that directly relates to image-update-driven workflows. A future revision could expand on actual image digest/version drift detection (e.g., Portainer's "image up to date" indicator, registry polling, or watchtower-style tools) to better match the title.
- The `docker info | grep -A 20 "Swarm:"` example works but `docker system info --format '{{.Swarm}}'` would be a cleaner version-agnostic alternative — left as-is since the original is functional.
