# Validation Summary: How to Use DuckDNS with Portainer for Dynamic DNS

## Status
validated

## Post Type
Guide

## Technologies Covered
- DuckDNS
- Portainer CE
- Traefik Proxy
- Docker and Docker Compose
- Docker networking
- Let's Encrypt ACME DNS-01
- Dynamic DNS

## Sources Consulted
- DuckDNS HTTP API spec: https://www.duckdns.org/spec.jsp
- DuckDNS FAQ: https://www.duckdns.org/faqs.jsp
- DuckDNS overview/why page: https://www.duckdns.org/why.jsp
- LinuxServer.io DuckDNS container documentation: https://docs.linuxserver.io/images/docker-duckdns/
- Traefik ACME / Let's Encrypt documentation for v3: https://doc.traefik.io/traefik/v3.0/https/acme/
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/v3.0/providers/docker/
- Traefik Docker routing labels documentation: https://doc.traefik.io/traefik/v3.0/routing/providers/docker/
- Portainer installation on Docker Standalone: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy guide for Traefik: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker `network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker `container logs` CLI reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Live DNS checks on the review host with `dig` for `test.duckdns.org` and nested hosts under it

## Issues Found
- The Traefik and Portainer stacks both declared `proxy` as an external Docker network, but the post never created it. Docker Compose does not create external networks automatically and errors if they do not already exist. I added `docker network create proxy` before the Traefik and Portainer deployments.
- The post told readers to forward both ports `80` and `443`, but the article uses a DNS-01 ACME challenge and only routes Portainer on Traefik's `websecure` entrypoint. Port `80` was unused in the provided configuration. I removed the unused `web` entrypoint and `80:80` mapping from the Traefik stack and corrected the router port-forwarding guidance to `443` only.
- The log command example used `docker logs duckdns -f`. Docker documents the command as `docker logs [OPTIONS] CONTAINER`. I updated the example to `docker logs -f duckdns`.

## Review Notes
- Portainer currently serves HTTPS on `9443` by default, but Portainer's own Traefik reverse-proxy documentation still routes Traefik to the container's internal HTTP service on port `9000`. The post's `traefik.http.services.portainer.loadbalancer.server.port=9000` label is therefore correct.
- DuckDNS explicitly documents that TXT records apply to sub-subdomains, which is what enables ACME DNS-01 validation for hostnames such as `portainer.myserver.duckdns.org`. I also verified via live DNS lookups that nested DuckDNS hostnames resolve to the same A record as the base DuckDNS hostname.
- Docker was not installed in the local review environment, so Docker commands were validated against official documentation rather than executed locally.
