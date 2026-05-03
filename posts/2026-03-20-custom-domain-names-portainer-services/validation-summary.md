# Validation Summary: How to Configure Custom Domain Names for Portainer Services

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Portainer
- Nginx Proxy Manager (jc21/nginx-proxy-manager)
- Traefik v3.0
- Docker / Docker Compose
- Let's Encrypt ACME (TLS-ALPN-01 challenge)
- DNS A records (Cloudflare/Pi-hole/AdGuard Home)

## Sources Consulted
- Nginx Proxy Manager documentation: https://nginxproxymanager.com/
- Nginx Proxy Manager Docker setup: https://nginxproxymanager.com/setup/
- Traefik v3 Docker provider documentation: https://doc.traefik.io/traefik/providers/docker/
- Traefik v3 ACME / Let's Encrypt: https://doc.traefik.io/traefik/https/acme/
- Traefik v3 routers and services labels: https://doc.traefik.io/traefik/routing/providers/docker/
- Docker Compose specification: https://docs.docker.com/compose/compose-file/
- Portainer stack documentation: https://docs.portainer.io/user/docker/stacks

## Issues Found
No technical issues found.

Verifications performed:
- NPM image `jc21/nginx-proxy-manager:latest` is the correct/official image.
- NPM default ports (80 HTTP, 443 HTTPS, 81 admin UI) and default credentials (`admin@example.com` / `changeme`) match upstream documentation.
- NPM volume mount paths `/data` and `/etc/letsencrypt` match the documented persistent locations.
- Traefik v3.0 CLI flags (`--providers.docker=true`, `--providers.docker.exposedbydefault=false`, `--entrypoints.web.address=:80`, `--entrypoints.websecure.address=:443`, ACME flags) are valid and current for v3.
- Traefik docker socket mount (`/var/run/docker.sock:/var/run/docker.sock:ro`) is correct (read-only is the recommended posture).
- Traefik label syntax (`traefik.http.routers.<name>.rule`, `entrypoints`, `tls.certresolver`, `traefik.http.services.<name>.loadbalancer.server.port`) is current and correct.
- Use of TLS-ALPN-01 challenge (`acme.tlschallenge=true`) is appropriate when port 443 is publicly reachable, which the stack ensures.
- External Docker network usage is correct: both stacks share the `proxy` network, which is created out-of-band with `docker network create proxy`.
- DNS A record example format is valid.

## Review Notes
- Compose `version: "3.8"` is no longer required by the modern Compose Specification (top-level `version` is informational/ignored), but it remains accepted and harmless. Not an error.
- The TLS-ALPN-01 challenge requires port 443 to be reachable from the internet for issuance/renewal. The stack exposes 443, so this works as written; readers behind NAT or with port-blocked ISPs may need to switch to the DNS-01 challenge instead. Worth noting in a future revision but not technically incorrect.
- NPM's default credentials should be changed immediately after first login; the post correctly identifies them as defaults but does not explicitly remind the reader to rotate them. Optional improvement, not an error.
