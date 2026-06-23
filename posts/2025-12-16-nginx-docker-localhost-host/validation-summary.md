# Validation Summary: How to Connect to Host localhost from Docker Container Through Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker networking
- Nginx reverse proxy configuration
- Linux networking and firewall tooling
- Node.js HTTP server binding

## Sources Consulted
- Docker Docs: Docker Desktop networking how-tos - https://docs.docker.com/desktop/features/networking/networking-how-tos/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: docker network create CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: dockerd host-gateway configuration - https://docs.docker.com/reference/cli/dockerd/
- Nginx Docs: ngx_http_proxy_module - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx Docs: ngx_http_upstream_module - https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Local Docker verification: Docker 29.4.2, Docker Compose v5.1.3, and `nginx:alpine` shell/tool availability.

## Issues Found
- The Compose snippets used the top-level `version: '3.8'` property. Docker's current Compose Specification keeps this field only for backward compatibility and warns that it is obsolete, so the examples were updated to start at `services:`.
- The host network mode note said it is only available on Linux. Docker's current documentation says host networking is supported on Docker Engine for Linux and Docker Desktop 4.34 or later when enabled in settings, so the note and summary table were updated.
- The bridge gateway and custom-network rows claimed support on all operating systems. Docker Desktop documents that there is no `docker0` bridge on the host and recommends `host.docker.internal` for connecting to host services, so those rows were narrowed to Linux Docker Engine.
- The Alpine entrypoint script used `#!/bin/bash`, but `nginx:alpine` provides `/bin/sh` and does not include Bash by default. The script was changed to `#!/bin/sh`.

## Review Notes
The Nginx `proxy_pass`, `upstream`, header, timeout, and keepalive directives matched the official Nginx documentation. The `extra_hosts: host.docker.internal:host-gateway` approach is consistent with Docker's documented `host-gateway` behavior. The final recommendation to bind host services to `0.0.0.0` is generally correct for bridge/gateway access, while Docker Desktop's `host.docker.internal` path can also reach services bound to localhost through Docker Desktop's host-service routing.
