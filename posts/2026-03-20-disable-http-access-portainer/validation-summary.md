# Validation Summary: How to Disable HTTP Access in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Community Edition
- Docker
- Docker Compose
- Nginx
- UFW
- HTTP / HTTPS and TLS

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings (`Force HTTPS only`): https://docs.portainer.io/admin/settings/general
- Portainer CE installation on Docker: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer update guidance for Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer Agent installation on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Docker `run` command reference: https://docs.docker.com/engine/containers/run/
- Docker filter reference: https://docs.docker.com/engine/cli/filter/
- Docker `container rm` reference: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- NGINX `return` directive reference: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html

## Issues Found
- The post said that simply omitting `-p 9000:9000` disables HTTP. Portainer's official docs distinguish between not publishing port 9000 and actually disabling the HTTP listener. Updated the explanation and the `docker run` example to add `--http-disabled`, which is Portainer's documented HTTPS-only setting.
- The agent section implied a general Portainer Agent HTTP concern. Updated it to reflect Portainer's documentation: standard Portainer Agents communicate with the server over HTTPS on port 9001 by default, while the `Force HTTPS only` / `--http-disabled` caution specifically calls out Edge Agent HTTPS readiness.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field and did not disable Portainer's HTTP listener. Removed the `version` line and added `command: ["--http-disabled"]` so the Compose example matches current Docker Compose guidance and the post's HTTPS-only objective.

## Review Notes
- Port `8000` is optional and only required for Edge Agent tunnel traffic. The examples remain valid, but that port can be removed if Edge Agents are not used.
- The `ufw deny 9000/udp` rule is harmless but not required for Portainer's web interface, which uses TCP.
- Local checks: `validation.json` was validated with `jq`; `curl`, `nc`, and `ufw` syntax were confirmed with local help output. Docker is not installed in this workspace, so Docker CLI syntax and Portainer runtime behavior were verified against official Docker and Portainer documentation instead of local execution.
