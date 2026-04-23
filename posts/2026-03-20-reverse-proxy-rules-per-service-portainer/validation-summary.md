# Validation Summary: How to Configure Reverse Proxy Rules per Service in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Traefik
- Traefik Docker provider
- Traefik routers, services, middleware, and ACME certificate resolvers
- Nginx reverse proxy configuration
- Let's Encrypt / ACME

## Sources Consulted
- Portainer reverse proxy with Traefik documentation: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer stack documentation: https://docs.portainer.io/user/docker/stacks
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Traefik release support policy: https://doc.traefik.io/traefik/deprecation/releases/
- Traefik Docker provider configuration: https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
- Traefik Docker label routing documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik HTTP router documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/router/
- Traefik HTTP routing rules documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik BasicAuth middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/basicauth/
- Traefik RateLimit middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ratelimit/
- Traefik Headers middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx HTTP basic auth module documentation: https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html
- Nginx HTTPS server documentation: https://nginx.org/en/docs/http/configuring_https_servers.html
- Nginx ACME module documentation: https://nginx.org/en/docs/http/ngx_http_acme_module.html
- Certbot Nginx instructions: https://certbot.eff.org/instructions?ws=nginx&os=snap

## Issues Found
- The Traefik container used `traefik:v3.0`, which is outside active and security support as of 2026-04-23. Updated the example to the currently supported `traefik:v3.6` minor release.
- The Docker Compose example used the obsolete top-level `version` field. Removed it because the Compose Specification treats it as informative only and Docker Compose warns when it is present.
- The Traefik Docker provider was enabled without `--providers.docker.exposedbydefault=false`, so unlabeled containers could be exposed through default routing. Added the setting so the `traefik.enable=true` labels control exposure.
- The HTTP-01 ACME configuration enabled `httpchallenge` but omitted the required challenge entrypoint. Added `--certificatesresolvers.le.acme.httpchallenge.entrypoint=web`.
- The HTTPS routers did not specify `entrypoints`, so they would not be scoped explicitly to the `websecure` entrypoint. Added `traefik.http.routers.*.entrypoints=websecure` labels.
- The admin router referenced a `basic-auth` middleware but the main stack did not define that middleware. Added a valid BasicAuth users label with escaped dollar signs for Docker Compose.
- The standalone BasicAuth middleware example used an ellipsis instead of a valid htpasswd-style hash. Replaced it with a complete example hash using Docker Compose dollar-sign escaping.
- The summary implied both Traefik and Nginx provide the same automatic Let's Encrypt behavior. Clarified that Traefik integrates directly with Let's Encrypt, while Nginx uses its ACME module or an external ACME client such as Certbot.

## Review Notes
The Nginx examples are syntactically valid reverse proxy and basic authentication snippets, but in a real Portainer stack the Nginx container must be attached to the same Docker network as the upstream service containers for names such as `api`, `admin`, and `webapp` to resolve. For production Traefik BasicAuth, prefer storing credentials in a file, secret, or another safer store instead of labels.
