# Validation Summary: How to Build Health Check Recovery

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- NGINX Plus active health checks
- HAProxy health checks, slow start, and Runtime API
- Kubernetes readiness, liveness, and startup probes
- Envoy cluster load balancing, active health checks, outlier detection, and circuit breakers
- Node.js / Express warm-up health endpoints
- Prometheus PromQL and alerting rules

## Sources Consulted
- NGINX `ngx_http_upstream_hc_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html
- HAProxy health checks documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- HAProxy Runtime API `set server` documentation: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-server/
- HAProxy slow start / circuit breaker guide: https://www.haproxy.com/blog/circuit-breaking-haproxy
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Envoy cluster v3 API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy health check v3 API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Express API documentation: https://expressjs.com/en/4x/api/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The short Kubernetes Deployment examples omitted the required Deployment selector and matching pod template labels. Added `spec.selector.matchLabels` and matching `template.metadata.labels`.
- The Envoy slow start snippets placed `slow_start_config` directly on the cluster. Moved it under `round_robin_lb_config.slow_start_config`, which is the correct location for round-robin load balancing.
- The Envoy health check `expected_statuses` range used `end: 299`. Envoy status ranges are half-open, so changed it to `end: 300` to cover all 2xx responses.
- The Envoy recovery threshold explanation did not mention the startup exception. Added a caveat that `healthy_threshold` applies when recovering an unhealthy host, while initial startup can require only one successful check.
- The custom HAProxy Runtime API example used a non-standard HTTP `/runtime` endpoint. Replaced it with a Unix socket example using Python's `socket` module and the documented `set server backend/server weight` command.
- The Express warm-up example called local warm-up endpoints before the server was listening. Changed startup to await `app.listen()` before running `warmUp()`, while readiness remains false until warm-up completes.
- The Prometheus recovery duration comment said "Average" while the query used `histogram_quantile(0.95, ...)`. Updated the comment to "95th percentile" and added `sum by (le, service)` aggregation for histogram buckets.

## Review Notes
- The NGINX health check example correctly uses NGINX Plus active health check parameters such as `passes` and `fails`.
- HAProxy `rise`, `fall`, `inter`, and `slowstart` usage matches the documented health check and slow start behavior.
- Kubernetes `successThreshold: 3` is valid for readiness probes; liveness and startup probes correctly leave `successThreshold` at its default of 1.
- The application code remains illustrative and depends on placeholder functions such as `initializeDatabasePool`, `db`, `cache`, and `getItemWithCaching`.
