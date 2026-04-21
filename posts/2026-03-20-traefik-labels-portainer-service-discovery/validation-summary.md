# Validation Summary: How to Use Traefik Labels for Portainer Service Discovery - Service

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Traefik Proxy
- Portainer
- Docker
- Docker Compose
- Docker labels
- Traefik HTTP routers, services, middlewares, TLS, and API
- curl
- jq

## Sources Consulted
- Traefik Docker provider configuration documentation: https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
- Traefik Docker label routing documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/
- Traefik HTTP router rules and priority documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Traefik HTTP services and load balancer documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/
- Traefik StripPrefix middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/stripprefix/
- Traefik API and dashboard documentation: https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/
- Docker Compose services labels documentation: https://docs.docker.com/reference/compose-file/services/#labels
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer add stack documentation: https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
- The description and conclusion implied no Traefik configuration files are involved at all. Updated the wording to "per-service configuration files" because the Docker provider, entrypoints, and certificate resolver still require Traefik configuration.
- The discovery explanation said Traefik detects containers only with `traefik.enable=true`. Updated it to mention the Docker provider and clarify that `traefik.enable=true` is required when `exposedByDefault=false`; Traefik's Docker provider defaults to exposing containers unless changed.
- The flow diagram was fenced as `bash` even though it is not shell syntax. Changed the fence to `text`.
- The `HostRegexp` example used Traefik v2 placeholder syntax. Replaced it with Traefik v3 regex syntax and YAML-safe escaping.
- The full Compose example used the obsolete top-level `version: "3.8"` property. Removed it to align with the current Compose Specification.
- The routing conflict explanation said Traefik uses rule specificity. Updated it to say Traefik uses router priority and that the default priority is based on rule length.
- The API verification command comments assumed the API was exposed on `localhost:8080`. Updated the comment to make that prerequisite explicit.

## Review Notes
- The examples are valid for Docker Compose / Docker standalone style labels. In Docker Swarm deployments, Traefik's Swarm provider typically reads service labels under `deploy.labels`.
- The `websecure` entrypoint and `letsencrypt` certificate resolver names are user-defined and must exist in Traefik's static configuration before these labels will work.
