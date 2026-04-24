# Validation Summary: How to Fix 'Origin Invalid' Errors After Upgrading Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer CE
- Docker
- Docker Compose
- Reverse proxies
- Nginx
- Traefik
- Caddy
- Browser storage and JavaScript

## Sources Consulted
- Portainer release notes: https://docs.portainer.io/release-notes
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy overview: https://docs.portainer.io/advanced/reverse-proxy
- Portainer Traefik reverse proxy guide: https://docs.portainer.io/sts/advanced/reverse-proxy/traefik
- Portainer nginx reverse proxy guide: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Portainer Docker Standalone upgrade guide: https://docs.portainer.io/start/upgrade/docker
- Portainer FAQ, "Unable to Authenticate After Portainer Update": https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/unable-to-authenticate-after-portainer-update
- Portainer issue documenting the affected releases and workaround: https://github.com/portainer/portainer/issues/12748
- Traefik headers / CORS middleware docs: https://doc.traefik.io/traefik-hub/api-gateway/secure/middleware/headers
- Caddy `reverse_proxy` docs: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- MDN `Location.reload()` docs: https://developer.mozilla.org/en-US/docs/Web/API/Location/reload

## Issues Found
- The post claimed the problem started in `Portainer 2.19+`. Portainer's release notes document the known reverse-proxy "Origin invalid" issue in `2.27.7` and `2.27.8`, with the workaround added in `2.27.9 LTS` and `2.31.3 STS`. I corrected the version history in the introduction and conclusion.
- The post said Portainer uses `--tunnel-addr` to determine valid origins. That flag is for the Edge Agent tunnel listener, not browser origin validation. I replaced it with the documented `--trusted-origins` flag and `TRUSTED_ORIGINS` environment variable.
- The post treated this as a generic CORS-header problem and suggested Traefik `accessControlAllowOriginList`. Traefik documents that as CORS response middleware, not the fix for Portainer's reverse-proxy origin validation. I replaced the Traefik example with a valid reverse-proxy routing example and moved the Portainer-specific fix to `TRUSTED_ORIGINS`.
- The nginx example proxied to `https://localhost:9443` and manually forwarded `Origin`, which was not aligned with Portainer's published reverse-proxy guidance and could require extra TLS handling for the upstream. I updated the example to preserve `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto` while proxying to Portainer's HTTP listener on `127.0.0.1:9000`.
- The Caddy example proxied to the HTTPS listener with `tls_insecure_skip_verify`, which was unnecessary for the simplified host-based reverse-proxy case. I replaced it with a simpler HTTP upstream example.
- The downgrade guidance to `2.18.4` was inaccurate and unsafe as general advice. Portainer's documented guidance is to update to a release that includes the `--trusted-origins` workaround. I changed the section to update to a current LTS image and set `--trusted-origins`.
- The Docker Compose + Traefik example used `latest`, omitted the documented Portainer workaround, and added unnecessary header middleware. I changed it to a current `lts` image, added `TRUSTED_ORIGINS`, and aligned the labels with Portainer's Traefik guidance.
- The JavaScript snippet used `location.reload(true)`, which MDN documents as a non-standard parameter. I replaced it with `location.reload()` and clarified that the script only clears script-accessible storage for the current origin.
- The browser-console examples referenced generic missing CORS headers instead of the documented Portainer symptoms. I changed them to `403 (Forbidden)` / `"Forbidden - Origin invalid"` examples and updated the log grep accordingly.

## Review Notes
- Portainer's current documentation recommends the LTS release stream for production deployments, so the updated commands use `portainer/portainer-ce:lts` instead of `latest`.
- `--http-disabled` is valid, but it should be used only when you access Portainer directly over HTTPS or proxy HTTPS all the way through. If your reverse proxy terminates TLS and sends HTTP to Portainer on port `9000`, keep the upstream HTTP listener available.
