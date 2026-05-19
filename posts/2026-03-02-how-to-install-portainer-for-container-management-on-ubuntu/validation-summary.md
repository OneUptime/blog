# Validation Summary: How to Install Portainer for Container Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Portainer Community Edition (CE) 2.x
- Docker / Docker Engine
- Docker Compose v2
- Portainer Agent
- Ubuntu (apt package manager)
- Nginx reverse proxy
- Let's Encrypt / certbot
- Portainer REST API

## Sources Consulted
- Portainer CE Docker installation docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Agent for Docker Standalone docs: https://docs.portainer.io/admin/environments/add/docker/agent
- Bash manual on line continuation and comment behavior (escape character handling of `\<space>` vs `\<newline>`)
- Docker CLI reference (`docker run`, `docker volume`, `docker compose`)
- Nginx documentation for HTTPS reverse proxy and WebSocket upgrade headers

## Issues Found

1. **Broken `docker run` command due to inline comments after `\` line continuations.** In the "Installing Portainer CE" section, the docker run example included trailing inline comments on lines ending with `\` (e.g., `-p 8000:8000 \       # Used for Portainer Edge agent tunneling`). In bash, `\` is only a line continuation when it is the *last* character on the line. When followed by whitespace and a `#`, the `\` escapes the next space (becoming a literal space), the `#` starts a comment that terminates the line, and the multi-line command is broken — readers copying this verbatim would have the command silently truncated after the first such line. Fixed by moving the explanatory comments above the `docker run` invocation and leaving the `\` line continuations clean.

## Review Notes

- The post uses `portainer/portainer-ce:latest`. Portainer's official documentation now recommends the `:lts` tag for production use, but `:latest` still works correctly and is widely used in tutorials, so it was left as-is.
- The post installs Docker via the Ubuntu-packaged `docker.io` rather than `docker-ce` from Docker's official APT repo. Both work for the purposes of this tutorial; `docker.io` may lag slightly behind upstream but is acceptable for a quick start.
- The Docker Compose `version: "3.8"` field is technically obsolete in Docker Compose v2 (the `version` field is now ignored), but including it does not cause errors and is still extremely common in published examples — left unchanged.
- Default Portainer ports (8000 for Edge agent tunnel, 9443 for HTTPS UI) are correct; legacy port 9000 (HTTP) is not exposed by default since Portainer 2.x, which the post correctly omits.
- Portainer Agent default port `9001` and the volume mounts (`/var/run/docker.sock` and `/var/lib/docker/volumes`) for Docker Standalone are correct.
- The Portainer REST API examples (`/api/auth` returning a JSON body containing a `jwt` field, and the `/api/endpoints/{id}/docker/...` Docker proxy paths) match the documented API surface.
- The Nginx reverse-proxy config correctly handles WebSocket upgrades (needed for Portainer's in-browser terminal) and disables upstream TLS verification (needed because Portainer presents a self-signed cert on 9443).
