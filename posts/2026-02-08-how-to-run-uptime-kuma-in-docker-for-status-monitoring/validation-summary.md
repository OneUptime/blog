# Validation Summary: How to Run Uptime Kuma in Docker for Status Monitoring

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Uptime Kuma
- Docker
- Docker Compose
- Nginx reverse proxy
- Socket.IO API usage through `uptime-kuma-api`
- SQLite backup and restore
- Slack and other notification integrations

## Sources Consulted
- Uptime Kuma official install guide: https://github.com/louislam/uptime-kuma/wiki/%F0%9F%94%A7-How-to-Install
- Uptime Kuma Docker tags documentation: https://github.com/louislam/uptime-kuma/wiki/Docker-Tags
- Uptime Kuma official Compose template: https://raw.githubusercontent.com/louislam/uptime-kuma/master/compose.yaml
- Uptime Kuma Dockerfile healthcheck definition: https://raw.githubusercontent.com/louislam/uptime-kuma/master/docker/dockerfile
- Uptime Kuma reverse proxy documentation: https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy
- Uptime Kuma status page documentation: https://github.com/louislam/uptime-kuma/wiki/Status-Page
- Uptime Kuma Docker container monitor documentation: https://github.com/louislam/uptime-kuma/wiki/How-to-Monitor-Docker-Containers
- `uptime-kuma-api` documentation: https://uptime-kuma-api.readthedocs.io/en/stable/api.html

## Issues Found
- The Docker examples used `louislam/uptime-kuma:1`, while current Uptime Kuma documentation recommends the v2 tag for new deployments. Updated both Docker examples to `louislam/uptime-kuma:2`.
- The Compose section claimed automatic HTTPS, but the Nginx example only configured HTTP on port 80 and did not include Certbot, Caddy, Traefik, or an SSL server block. Reworded the section to describe a reverse proxy and note that TLS must be added at the proxy before public exposure.
- The Compose snippet used the obsolete top-level `version` key. Removed it to match current Compose examples.
- The custom healthcheck referenced `/app/extra/healthcheck.js`, but the current Docker image defines `extra/healthcheck`. Updated the Compose healthcheck command.
- The Docker container monitor description said it catches cases where a container is up but the service inside has crashed. Uptime Kuma's Docker monitor checks Docker/container state, so the text now says it catches service exits that stop the container and notes Docker socket access is privileged.
- The status page section said pages update in real time via WebSocket. Current Uptime Kuma documentation says status pages cache results and refresh periodically. Updated the explanation accordingly.
- The backup example copied only `kuma.db` while the service was running. Updated the guidance to stop Uptime Kuma and copy the data directory for a consistent backup.
- The resource usage section gave exact memory and database size numbers without an authoritative basis. Replaced those values with dependency-aware guidance.

## Review Notes
The `uptime-kuma-api` package is a third-party Socket.IO client rather than an official REST API, but the usage pattern and `add_monitor` arguments in the post match its documented API. The Nginx reverse proxy example is HTTP-only; it is technically correct as a local reverse proxy example, but production deployments should add HTTPS through Certbot, Caddy, Traefik, or equivalent TLS automation.
