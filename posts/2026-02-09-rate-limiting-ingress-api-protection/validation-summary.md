# Validation Summary: How to Use Rate Limiting at the Kubernetes Ingress Layer

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx / NGINX Ingress Controller annotations and ConfigMap settings
- Traefik Middleware CRDs
- Istio Gateway, VirtualService, and EnvoyFilter
- Envoy local and global rate limiting
- Envoy rate limit service with Redis
- Prometheus metrics and alerting
- kubectl log and metrics inspection commands

## Sources Consulted
- Kubernetes ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Kubernetes ingress-nginx custom errors documentation: https://kubernetes.github.io/ingress-nginx/user-guide/custom-errors/
- Kubernetes ingress-nginx monitoring documentation: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- Traefik RateLimit middleware documentation: https://doc.traefik.io/traefik/v3.1/middlewares/http/ratelimit/
- Istio rate limiting with Envoy documentation: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy HTTP rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter.html
- Envoy rate limit service repository documentation: https://github.com/envoyproxy/ratelimit

## Issues Found
- The first ingress-nginx example used `limit-connections` under a comment claiming it returned 429 for rate-limit violations. `limit-connections` controls concurrent connections, not request-rate status codes, so it was replaced with `nginx.ingress.kubernetes.io/limit-req-status-code: "429"`.
- The NGINX header-based example placed `limit_req_zone` inside `configuration-snippet`, but that annotation is inserted into a location context and cannot define an HTTP-level rate limit zone. The example now defines the zone with the controller ConfigMap `http-snippet` and applies it with `configuration-snippet`.
- The Traefik Middleware examples used the old `traefik.containo.us/v1alpha1` API group. They were updated to the current `traefik.io/v1alpha1` API group used by Traefik v3 documentation.
- The Envoy rate limit service Deployment mounted configuration at `/data/ratelimit/config` without setting runtime environment variables, so the service would not load the mounted files by default. Added `RUNTIME_ROOT`, `RUNTIME_SUBDIRECTORY`, and `RUNTIME_APPDIRECTORY`.
- The distributed Istio rate limiting text implied the Deployment alone provided a complete cluster-wide setup. It now notes that Redis and an EnvoyFilter pointing at the rate limit service are also required.
- The custom NGINX response example embedded nested `location` blocks in `configuration-snippet` and referenced unsupported inline response behavior. It now uses `custom-http-errors` and `default-backend`, which is the supported ingress-nginx path for custom 429 responses.
- Prometheus examples grouped `nginx_ingress_controller_requests` by `remote_addr`, but the official ingress-nginx request metric does not expose a client IP label. The examples now group by `namespace` and `ingress`, and the IP analysis is done from logs instead.
- The log-analysis command used `awk '{print $NF}'`, which would not reliably extract the client IP from ingress-nginx rate-limit log lines. It now extracts the `client:` field with `sed`.

## Review Notes
- ingress-nginx rate limits are enforced per controller replica, so deployments with multiple replicas or HPA can have a higher effective limit than the annotation value.
- The header-based ingress-nginx example depends on snippet annotations being enabled, which has security implications and may be disabled by cluster policy.
- For production, pin the Envoy rate limit service image to a known tag or digest instead of relying on a floating image tag.
