# Validation Summary: How to Run Envoy Proxy in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Envoy Proxy
- Envoy static configuration
- Envoy HTTP connection manager
- Envoy clusters and load balancing
- Envoy local rate limiting
- Envoy circuit breaking and retries
- Envoy admin interface and observability

## Sources Consulted
- Envoy official documentation: https://www.envoyproxy.io/docs
- Envoy Docker Hub image documentation: https://hub.docker.com/r/envoyproxy/envoy
- Envoy cluster configuration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy health check API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy local rate limit API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The examples used `envoyproxy/envoy:v1.30-latest`. That tag still exists, but it is outdated for a current tutorial. Updated the Docker run, Docker Compose, and validation examples to `envoyproxy/envoy:v1.38-latest`, which is available and validated locally as Envoy 1.38.0.
- The Docker Compose example mounted `./envoy-config/envoy.yaml`, but the compose services are named `api-v1` and `api-v2` while the quick-start config points to `backend:3000`. Updated the Compose volume to mount `./envoy-config/envoy-lb.yaml`, matching the load-balancing configuration shown in the post.
- The load-balancing health check used `path: "/health"`, but the sample nginx backends created in the post only serve `/`. Updated the health check path to `/` so the sample backends can pass active health checks.
- The Docker Compose example used the obsolete top-level `version` field. Removed it to align with the current Compose Specification.

## Review Notes
- The full quick-start and load-balancing Envoy configs were validated with `docker run --rm ... envoyproxy/envoy:v1.38-latest envoy --mode validate -c /etc/envoy/envoy.yaml`.
- The extracted Docker Compose example was validated with `docker compose config --quiet`.
- Envoy's admin interface documentation warns that it can expose sensitive information and perform destructive operations. The post exposes it on `0.0.0.0` for a local Docker tutorial; production usage should restrict admin access to a secure network or localhost.
