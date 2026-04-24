# Validation Summary: How to Deploy Portainer on a Subpath Using --base-url

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Nginx
- Traefik
- Reverse proxies

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/sts/advanced/cli
- Portainer CE install docs for Docker and Compose examples: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer release notes for `--trusted-origins`: https://docs.portainer.io/sts/release-notes
- Portainer 2.39.1 validation logic for `--trusted-origins`: https://raw.githubusercontent.com/portainer/portainer/2.39.1/pkg/validate/validate.go
- Nginx `proxy_pass` reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx HTTP/2 module reference: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Docker Compose file reference for the obsolete top-level `version` key: https://docs.docker.com/reference/compose-file/version-and-name/
- Traefik `StripPrefix` middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/stripprefix/
- Traefik Docker routing labels reference: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/

## Issues Found
- The post incorrectly said Portainer should receive the `/portainer` prefix from the reverse proxy. Portainer's CLI docs state that when `--base-url` is used, the reverse proxy must still strip the configured subpath. I corrected the Nginx and Traefik explanations and examples to strip `/portainer` before forwarding upstream.
- The Nginx example preserved the `/portainer` prefix by proxying to `http://portainer:9000/portainer/`. I changed it to `http://portainer:9000/` so Nginx strips the matched location prefix while proxying.
- The Traefik example explicitly advised against `StripPrefix`, which was the opposite of the behavior Portainer documents for `--base-url`. I added a `StripPrefix` middleware and attached it to the router.
- The post used `--trusted-origins=https://example.com`. Current released Portainer validation accepts bare domains for this flag, not full URLs or paths. I changed the examples and explanatory text to use `example.com`.
- The Docker Compose example used the top-level `version` key, which Docker now documents as obsolete. I removed it from the snippet.
- The Nginx example used `listen 443 ssl http2;`. Current Nginx documentation provides `http2 on;` as the non-deprecated form, so I updated the snippet accordingly.
- The standalone `docker run` example did not place the Portainer container on the proxy network even though the proxy examples route to `http://portainer:9000`. I added `--network proxy` so the container name is reachable by the reverse proxy in the illustrated setup.

## Review Notes
- As of April 24, 2026, Portainer's latest release on GitHub is `2.39.1` (published March 19, 2026). The current released code validates `--trusted-origins` as bare hostnames only. This is worth rechecking on future Portainer releases because the development branch is changing this behavior.
