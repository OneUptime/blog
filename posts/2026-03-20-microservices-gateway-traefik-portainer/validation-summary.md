# Validation Summary: How to Set Up a Microservices Gateway with Portainer and Traefik (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Traefik Proxy
- Docker and Docker Compose
- Portainer
- Let's Encrypt ACME
- Traefik HTTP middlewares and routing
- `curl` and `jq`

## Sources Consulted
- Traefik configuration overview: https://doc.traefik.io/traefik/v3.4/getting-started/configuration-overview/
- Traefik API and dashboard docs: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Traefik Docker provider docs: https://doc.traefik.io/traefik/v3.3/providers/docker/
- Traefik provider namespace docs: https://doc.traefik.io/traefik/v3.5/reference/install-configuration/providers/overview/
- Traefik Prometheus metrics docs: https://doc.traefik.io/traefik/v3.0/observability/metrics/prometheus/
- Traefik ForwardAuth docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/
- Traefik Headers middleware docs: https://doc.traefik.io/traefik/master/reference/routing-configuration/http/middlewares/headers/
- Traefik HTTP router docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/router/
- Traefik v2 to v3 migration details (`swarmMode` removal): https://doc.traefik.io/traefik/master/migrate/v2-to-v3-details/
- Docker Compose `version` field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer container logs docs: https://docs.portainer.io/user/docker/containers/logs

## Issues Found
- The post placed `http.middlewares` inside `traefik.yml` as if it were static configuration. In Traefik v3, middlewares are dynamic configuration objects. I moved the global rate-limit middleware into the dynamic file and attached it from the `websecure` entrypoint using `global-ratelimit@file`.
- The post used `providers.docker.swarmMode: false`. In Traefik v3, `swarmMode` is no longer a valid Docker provider option and the old v2-style setting is unsupported. I removed it.
- The post referenced file-provider middlewares from Docker labels without a provider suffix. Cross-provider references require the `@file` namespace. I updated the router labels to use `jwt-auth@file`, `rate-limit@file`, `security-headers@file`, `cors@file`, and `request-limit@file`.
- The post described a headers middleware as “API Key authentication”, but that middleware only adds request and response headers. I corrected it to a shared headers example so it no longer claims to perform authentication.
- The monitoring commands would not work as written because the shown config did not expose the dashboard/API through a router and did not enable metrics routing. I added a secured `api@internal` router, enabled Prometheus metrics with manual routing, added a router for `prometheus@internal`, and updated the `curl` commands to use basic auth.
- The API versioning example omitted HTTPS router settings, which would make it inconsistent with the rest of the post’s HTTPS gateway setup. I added `entrypoints=websecure` and `tls=true` for both versioned routers.
- The Compose snippet used the obsolete top-level `version` field. I removed it to match current Compose guidance.

## Review Notes
- The post pins `traefik:v3.0`. That is still coherent with the corrected configuration, but newer Traefik v3 minor releases exist and may be preferable for production deployments.
- The example dashboard credentials use `admin:change-me` for demonstrative purposes only and should be replaced before real deployment.
