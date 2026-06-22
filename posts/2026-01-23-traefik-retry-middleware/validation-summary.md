# Validation Summary: How to Implement Retry Middleware in Traefik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy HTTP retry middleware
- Traefik Kubernetes CRDs (`Middleware`, `IngressRoute`)
- Traefik circuit breaker middleware
- Traefik Prometheus metrics
- Kubernetes `kubectl`
- PromQL

## Sources Consulted
- Traefik Retry middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/retry/
- Traefik Kubernetes IngressRoute CRD documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Circuit Breaker middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/circuitbreaker/
- Traefik Headers middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/
- Traefik metrics documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post claimed Traefik retries backend 5xx responses by default. Current Traefik documentation says retry stops as soon as the server answers unless `status` is configured, so I added `status: ["500-599"]` to retry examples that discuss 5xx retries and updated the behavior explanation.
- The retry interval section described unbounded doubling intervals. Traefik documents `initialInterval` as enabling exponential backoff with a maximum interval of twice the initial interval, so I corrected the explanation.
- The timeout section showed an empty `Middleware` and used `responseForwarding.flushInterval` as though it capped retry duration. `flushInterval` controls response flushing, not request timeout. I replaced this with the documented retry `timeout` option.
- The testing section implied `/status/503` could eventually succeed with retries. That endpoint always returns 503, so I changed the note to say it should still end with 503 and should be used with metrics or an intermittent backend.
- The retry storm section stated Traefik adds jitter by default. The documented retry options do not expose jitter, so I changed this to recommend adding jitter at clients or callers.
- The retry headers example used `{{ .Attempt }}` templating for `customRequestHeaders`. Traefik headers middleware sets static values and does not document retry-attempt templating, so I changed the example to a static `X-Retry-Enabled` header and directed readers to metrics for actual retry counts.
- The retry ratio comment called the PromQL result a percentage. The query returns a fraction unless multiplied by 100, so I corrected the wording.

## Review Notes
The post is now technically accurate for current Traefik documentation. The examples rely on newer retry middleware options such as `status`, `timeout`, and `retryNonIdempotentMethod`; users running older Traefik CRDs must ensure their installed CRDs include those fields.
