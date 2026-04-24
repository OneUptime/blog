# Validation Summary: How to Install Portainer Using Docker Compose

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker Engine
- Docker Compose
- Nginx
- OpenSSL
- TLS/HTTPS

## Sources Consulted
- Portainer CE Docker install docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer CLI options: https://docs.portainer.io/sts/advanced/cli
- Portainer custom SSL docs: https://docs.portainer.io/advanced/ssl
- Portainer reverse proxy docs: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose environment variable interpolation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- OpenSSL `req` reference: https://docs.openssl.org/3.6/man1/openssl-req/
- NGINX proxy module reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The description claimed the post covered Portainer Business Edition, but the content only documented CE. I corrected the description and overview to match the actual scope.
- Each Compose snippet used the top-level `version` field. Docker Compose now treats this field as obsolete, so I removed it from all examples.
- The post described port `8000` as the Portainer agent port. Current Portainer docs describe it as the optional TCP tunnel used for Edge features, so I updated the comments and environment variable naming to reflect that.
- The Nginx reverse proxy example proxied to Portainer's HTTPS endpoint on `9443` with `proxy_ssl_verify off`. I changed the example to enable Portainer's HTTP port `9000` internally and proxy to that instead, which matches Portainer's reverse-proxy guidance more closely and avoids an unnecessary insecure upstream TLS hop.
- The OpenSSL example used `-nodes`, which is deprecated in current OpenSSL. I replaced it with `-noenc`.
- The sample `.env` pinned `PORTAINER_VERSION` to `2.20.2`, which is outdated by April 24, 2026. I updated it to `2.39.0`, the current LTS CE release listed in Portainer's requirements documentation.

## Review Notes
- `docker` is not installed in this workspace, so Docker CLI verification was done against official Docker and Portainer documentation rather than local `docker compose --help` output.
- The article still uses `portainer/portainer-ce:latest` in its main examples. This is valid, but pinning all examples to a maintained stream tag or exact release would make the guide more reproducible over time.
