# Validation Summary: How to Troubleshoot Traefik Routing Issues with Portainer - Part 2

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Traefik Proxy
- Portainer
- Docker
- Docker Compose
- Bash
- curl
- jq
- ACME / Let's Encrypt

## Sources Consulted
- Traefik API & Dashboard documentation: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik Docker provider labels documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik HTTP service load balancing documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/
- Traefik ServersTransport documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/serverstransport/
- Traefik logs and access logs documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/logs-and-accesslogs/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Docker container logs CLI documentation: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker network connect CLI documentation: https://docs.docker.com/reference/cli/docker/network/connect/
- Docker Compose interpolation documentation: https://docs.docker.com/reference/compose-file/interpolation/
- Portainer requirements and ports documentation: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer CE Docker installation documentation: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer reverse proxy with Traefik documentation: https://docs.portainer.io/advanced/reverse-proxy/traefik

## Issues Found
- The 502 troubleshooting example described port `9443` as simply wrong. Portainer's HTTPS interface can be used on `9443`, but Traefik must use `server.scheme=https` and a suitable `ServersTransport` when Portainer presents a self-signed backend certificate. Updated the text to distinguish the HTTP `9000` path from the HTTPS `9443` path.
- The HTTPS backend label referenced `insecureTransport` without defining the ServersTransport or specifying the file provider. Added a minimal dynamic configuration snippet with `insecureSkipVerify: true` and changed the label to `insecureTransport@file`.
- The Docker Compose BasicAuth explanation said the shell interprets `$apr1`. In a Compose file, Compose interpolation is the relevant behavior. Updated the comments and replaced the abbreviated placeholder with an APR1-style hash example using doubled dollar signs.
- The ACME certificate lookup assumed the certificate resolver was named `letsencrypt`. Traefik resolver names are user-defined. Updated the jq filters to inspect all resolver entries and also match SANs.
- The ACME log grep used basic-regex alternation syntax. Updated it to `grep -Ei "acme|certificate|error"` for clearer, standard extended-regex behavior.

## Review Notes
- The post assumes Traefik's API is reachable on `localhost:8080`; this is valid for common insecure dashboard/API troubleshooting setups, but production deployments should secure the API as Traefik documents.
- The certificate troubleshooting step checks port 80, which applies to HTTP-01 ACME challenges. DNS-01 and TLS-ALPN-01 deployments have different reachability requirements.
