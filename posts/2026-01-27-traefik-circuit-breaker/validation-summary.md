# Validation Summary: How to Implement Traefik Circuit Breaker

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Traefik (v3.0) - reverse proxy / ingress controller
- Traefik Middleware CRD (`traefik.io/v1alpha1`): CircuitBreaker, Retry, RateLimit, Errors, Chain, ForwardAuth
- Traefik TraefikService CRD: Weighted and Failover service kinds
- Traefik ServersTransport CRD
- Traefik IngressRoute CRD
- Kubernetes (Deployment, ConfigMap, Service)
- Prometheus + AlertManager + Grafana
- prometheus-operator PrometheusRule CRD
- Bash scripting (curl) and k6 load testing

## Sources Consulted
- Traefik Circuit Breaker middleware reference: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/circuitbreaker/
- Traefik TraefikService CRD reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/traefikservice/
- Traefik ServersTransport CRD reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/serverstransport/
- Traefik Retry, RateLimit, Errors, ForwardAuth middleware reference pages
- Traefik Prometheus metrics reference (traefik_service_requests_total, traefik_service_request_duration_seconds)
- Prometheus Operator PrometheusRule CRD docs
- k6 documentation (k6/http, k6/metrics, options.stages, options.thresholds)

## Issues Found

1. **Incorrect default values and descriptions for circuit breaker timing parameters.** The post stated `checkPeriod` default is `10s` with description "Time to wait before attempting recovery", `fallbackDuration` as "Time to wait in half-open state for probe results", and `recoveryDuration` as "Time window for calculating metrics". Per the Traefik docs: `checkPeriod` default is `100ms` and is the interval used to evaluate the expression; `fallbackDuration` is how long the circuit stays in the tripped/open state before transitioning to recovering; `recoveryDuration` is how long the circuit stays in the recovering state. Updated the comments and default values to match the official docs.

2. **Duplicate `entryPoints` keys in the Traefik ConfigMap YAML.** The static configuration declared `entryPoints:` twice in the same map (once for `web`/`websecure` and again for `metrics`), which is invalid YAML — the second declaration would replace the first, leaving Traefik without `web`/`websecure` entry points. Merged the `metrics` entry point into the single `entryPoints` block.

3. **The "Strategy 2: Fallback Service" example used `TraefikService.weighted` with `weight: 100` / `weight: 0` claiming the secondary "receives traffic when primary fails health checks".** Traefik's weighted round-robin does not provide automatic failover behavior, and a service with `weight: 0` never receives traffic. Replaced this with the `TraefikService` `failover` kind (with `service`, `fallback`, and `errors.status`), which is Traefik's actual primary/backup failover mechanism.

4. **The "Timeout" middleware in the "Combine with Other Resilience Patterns" section was misconfigured.** It used `forwardAuth.responseHeadersTimeout: 30s` to "make requests timeout after 30 seconds". `forwardAuth` is the authentication-forwarding middleware, and `responseHeadersTimeout` there only bounds the auth server's response — it does not act as a generic backend request timeout. Traefik has no standalone "timeout" Middleware kind; backend timeouts are configured via the `ServersTransport` CRD (and referenced from a service's `serversTransport` field). Replaced the broken middleware with a `ServersTransport` CRD using `forwardingTimeouts.dialTimeout`/`responseHeaderTimeout`/`idleConnTimeout`, and removed the now-nonexistent `timeout` entry from the chain example.

## Review Notes

- The circuit breaker expressions (`NetworkErrorRatio()`, `LatencyAtQuantileMS(...)`, `ResponseCodeRatio(from, to, totalFrom, totalTo)`) are accurate, including the percentile range (0.0 to 100.0, not 0.0 to 1.0) and the ResponseCodeRatio four-argument signature with half-open intervals.
- The `traefik:v3.0` image tag, `traefik.io/v1alpha1` CRD apiVersion, and `retry.initialInterval` field are all valid for Traefik v3.
- Prometheus metric names (`traefik_service_requests_total`, `traefik_service_request_duration_seconds_bucket`) match the current Traefik metrics surface.
- The fallback nginx deployment specifies `containerPort: 8080` on `nginx:alpine`, while the upstream nginx image listens on port 80 by default. `containerPort` is informational in Kubernetes, but the K8s Service that would front this pod (not shown) would need `targetPort: 80` or a custom nginx config to actually serve on 8080. Left as-is because the K8s Service object is not part of the example and this is illustrative; readers customizing the example should be aware.
- The `responseCode` field on the circuit breaker (default 503, configurable in Traefik v3) is not mentioned, but its omission is not an error — defaults apply.
- The `forwardingTimeouts.responseHeaderTimeout` default is `0s` (no timeout); a non-zero value was set in the replacement example for clarity.
