# Validation Summary: How to Self-Host OneUptime with Docker Compose Behind an Existing Reverse Proxy

## Status

validated

## Post Type

Technical deployment guide with shell commands, environment configuration, and an NGINX reverse proxy example.

## Technologies Covered

- OneUptime 12.0.33 and its bundled NGINX ingress
- Docker Compose and container port publishing
- NGINX, HTTP/2, TLS termination, and WebSockets
- Forwarded headers and trusted proxy hop counting
- PostgreSQL, ClickHouse, and container logging
- Git and curl

## Sources Consulted

- OneUptime Docker Compose installation: https://oneuptime.com/docs/en/installation/docker-compose
- OneUptime 12.0.33 environment configuration: https://github.com/OneUptime/oneuptime/blob/12.0.33/config.example.env
- OneUptime 12.0.33 Compose entry point: https://github.com/OneUptime/oneuptime/blob/12.0.33/docker-compose.yml
- OneUptime 12.0.33 base Compose configuration: https://github.com/OneUptime/oneuptime/blob/12.0.33/docker-compose.base.yml
- OneUptime 12.0.33 ingress routes: https://github.com/OneUptime/oneuptime/blob/12.0.33/Nginx/default.conf.template
- OneUptime 12.0.33 global NGINX configuration: https://github.com/OneUptime/oneuptime/blob/12.0.33/Nginx/nginx.conf
- OneUptime client address resolution: https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/ClientIp.ts
- OneUptime Express utilities and audit-address integration: https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Utils/Express.ts
- Docker Compose interpolation and environment files: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose CLI: https://docs.docker.com/reference/cli/docker/compose/config/ , https://docs.docker.com/reference/cli/docker/compose/up/ , https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker firewall behavior: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- NGINX reverse proxy configuration: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- NGINX HTTP/2 module: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX listen and body-size directives: https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- Express proxy trust background: https://expressjs.com/en/guide/behind-proxies/
- Git checkout: https://git-scm.com/docs/git-checkout
- curl command reference: https://curl.se/docs/manpage.html

## Issues Found

1. **The deployment did not select the stated version.** `git checkout release` and the default `APP_TAG=release` both follow moving releases. Changed checkout to `12.0.33` and explicitly set `APP_TAG=12.0.33` so the source and OneUptime images match the version reviewed.
2. **Deprecated NGINX HTTP/2 syntax and missing placement context.** Replaced `listen 443 ssl http2` with `listen 443 ssl` plus `http2 on`. Specified NGINX 1.25.1 or later with HTTP/2 support and placement within the existing `http` context. Clarified that the loopback upstream assumes NGINX runs directly on the Docker host.
3. **Network restrictions omitted a stock database publication and Docker firewall behavior.** The versioned Compose file publishes PostgreSQL on host port 5400. Added instructions to remove that mapping unless needed for restricted backup access, and clarified that Docker-aware firewall rules are required because published ports can bypass UFW rules.
4. **The external body-size limit could be mistaken for the effective ingestion limit.** Added that the bundled `/otlp` and `/telemetry` locations cap request bodies at 4 MiB in this version. An external 100m setting does not override ingress or application limits.
5. **Forwarded-protocol troubleshooting omitted ingress rewriting.** The bundled ingress sets `X-Forwarded-Proto` to its own `$scheme`, which is HTTP for this upstream path. Corrected the explanation to distinguish this from the public URL configured through `HTTP_PROTOCOL=https` and to inspect redirect rules at both proxies.
6. **WebSocket longevity needed an idle-timeout qualification.** Added the documented default 60-second upstream inactivity timeout and the supported remedies of ping frames or an appropriate read timeout.

## Review Notes

- Classified as technically relevant and reviewed all shell commands, configuration fields, proxy headers, version claims, and linked documentation against official documentation or the exact upstream source tag.
- Downloaded the official 12.0.33 Compose files and example environment into a temporary directory. Rendered the effective model successfully with Docker Compose v5.1.4 using the corrected version, domain, protocol, ports, and hop count. No containers were started.
- Confirmed HTTP host port 8080 maps to ingress port 7849 and HTTPS host port 8443 maps to ingress port 7850. The stock mappings do not specify a loopback bind address.
- Confirmed the versioned environment supports primary-host certificate provisioning, disabling it with `PROVISION_SSL=false`, all listed secret names, and the default one-hop client-address setting. The bundled ingress appends to X-Forwarded-For, and the client-address utility reads from the trusted end of that list. The two-hop setting fits the illustrated external-proxy-plus-ingress chain.
- The live OneUptime installation documentation says managed TLS is unsupported, whereas the 12.0.33 environment source explicitly documents primary-host provisioning. Version-specific source was used for that claim. This review does not claim 12.0.33 is the latest release.
- Confirmed the backup recommendation covers the documented PostgreSQL and ClickHouse stores. Container log rotation and disk monitoring remain appropriate operational guidance.
- `curl -I` inspects response headers and the second curl command reports the initial response status; neither performs an authenticated browser session or follows a redirect chain. The accompanying browser and log checks remain necessary.
- Validation was a documentation/source review and Compose model render, not an end-to-end deployment. Certificate validity, public routing, authenticated sessions, WebSocket behavior, and observed audit addresses require testing in the target environment. NGINX was not started or syntax-tested with real certificate files.
