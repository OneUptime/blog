# Validation Summary: How to Configure Custom Domain Names for Portainer Services - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker networking
- Traefik
- Let's Encrypt ACME DNS challenge
- Cloudflare DNS / flarectl
- Nginx Proxy Manager
- NGINX

## Sources Consulted
- Traefik API & Dashboard documentation: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik ACME / Let's Encrypt documentation: https://doc.traefik.io/traefik/v3.3/https/acme/
- Traefik EntryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik Docker guide: https://doc.traefik.io/traefik/master/expose/docker/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Nginx Proxy Manager setup documentation: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager advanced configuration: https://nginxproxymanager.com/advanced-config/
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy
- Cloudflare `flarectl` source (`dns create` implementation): https://github.com/cloudflare/cloudflare-go/blob/master/cmd/flarectl/dns.go

## Issues Found
- The Traefik stack used `CF_API_TOKEN` for the Cloudflare DNS challenge. I changed it to `CF_DNS_API_TOKEN` because Traefik's ACME documentation lists `CF_DNS_API_TOKEN` as the current token-based Cloudflare environment variable, with `CF_ZONE_API_TOKEN` optional.
- The Traefik stack enabled only `--api.dashboard=true`. I changed it to `--api=true` because the current Traefik dashboard documentation enables the routed `api@internal` service through `--api=true` in secure mode.
- The tutorial declared `proxy` as an external Docker network but did not call out that it must already exist before stack deployment. I added that requirement to prerequisites and clarified the `docker network create proxy` command accordingly because Docker Compose requires external networks to pre-exist.
- The Nginx Proxy Manager example assumed container-name forwarding without attaching NPM to the same user-defined Docker network. I added the shared `proxy` network to the NPM stack and changed the forward hostname to `myapp`, which is resolvable as a service name on that shared network.
- The manual NGINX example used `listen 443 ssl http2;`, which is deprecated in current NGINX. I changed it to `listen 443 ssl;` with `http2 on;` per the current HTTP/2 module documentation.

## Review Notes
- The post pins `traefik:v3.0`. The configuration remains valid, but a newer Traefik v3 minor release would be a better default for a fresh deployment.
- The Traefik dashboard example is technically valid but publicly exposing `api@internal` without authentication is not recommended by Traefik for production use.
- The manual NGINX option assumes the upstream application is reachable from the NGINX host at `localhost:3000`; if NGINX runs in Docker or the app port is not published to the host, the upstream target would need to be adjusted.
