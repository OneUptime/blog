# Validation Summary: How to Set Up Traefik as Ingress Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik (Ingress Controller / Edge Router)
- Kubernetes (IngressRoute CRD, Middleware CRD, TLSOption CRD, Secrets)
- Helm (chart installation)
- Let's Encrypt (ACME HTTP-01, TLS-ALPN-01, DNS-01 challenges)
- Cloudflare (DNS provider for DNS-01 challenge)
- Prometheus (metrics)
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- OpenTelemetry (tracing via OTLP)

## Sources Consulted
- Traefik Helm chart repository — https://github.com/traefik/traefik-helm-chart
- Traefik official documentation — https://doc.traefik.io/traefik/
- Traefik Kubernetes CRD provider docs — https://doc.traefik.io/traefik/routing/providers/kubernetes-crd/
- Traefik BasicAuth middleware docs — https://doc.traefik.io/traefik/middlewares/http/basicauth/
- Traefik Headers middleware docs — https://doc.traefik.io/traefik/middlewares/http/headers/
- Traefik CircuitBreaker middleware docs — https://doc.traefik.io/traefik/middlewares/http/circuitbreaker/
- Traefik RateLimit middleware docs — https://doc.traefik.io/traefik/middlewares/http/ratelimit/
- Traefik TLS options docs — https://doc.traefik.io/traefik/https/tls/
- Traefik ACME (Let's Encrypt) docs — https://doc.traefik.io/traefik/https/acme/
- Traefik Prometheus metrics docs — https://doc.traefik.io/traefik/observability/metrics/prometheus/
- Traefik OTLP tracing docs — https://doc.traefik.io/traefik/observability/tracing/overview/
- Kubernetes Secret types reference — https://kubernetes.io/docs/concepts/configuration/secret/#secret-types
- Prometheus Operator ServiceMonitor / PrometheusRule reference — https://prometheus-operator.dev/

## Issues Found

1. **Incorrect Kubernetes Secret type for BasicAuth secrets.** Two `Secret` examples used `type: kubernetes.io/basic-auth` while providing only a `users` key in htpasswd format. The Kubernetes API validator requires secrets of type `kubernetes.io/basic-auth` to contain `username` and `password` keys — using that type with only a `users` field would fail validation at apply-time. The official Traefik basicAuth middleware docs use an `Opaque` secret (with a `users` key in htpasswd format). Changed both secrets (`auth-secret` in the BasicAuth Middleware example and `dashboard-auth-secret` in the dashboard example) from `type: kubernetes.io/basic-auth` to `type: Opaque`.

2. **Misleading comment on htpasswd generation.** The BasicAuth example included the comment `# Generate with: htpasswd -nb admin password | base64`. Because the example uses `stringData:` (which Kubernetes base64-encodes for you), piping through `base64` would double-encode the htpasswd entry and break authentication. Updated the comment to `# Generate the htpasswd entry with: htpasswd -nb admin password` to reflect what is actually needed with `stringData`.

## Review Notes

- The `strategy: RoundRobin` field on the IngressRoute service is technically valid but redundant — `RoundRobin` is the only supported value and is the default. Left as-is since it is illustrative and not incorrect.
- `preferServerCipherSuites: true` in the TLSOption is accepted by Traefik but has been a no-op in Go since 1.18 (server cipher preference is always honored for TLS 1.2 in modern Go). This is a documentation-level deprecation rather than a functional error, so it was left as-is.
- In the headers middleware example, `frameDeny: true` / `contentTypeNosniff: true` produce the same headers as the corresponding entries in `customResponseHeaders`. This is redundant but not incorrect.
- The Helm chart's `tracing` stanza structure has shifted between Traefik v2 and v3 chart releases; the example shown is plausible but the exact field nesting (`tracing.enabled` vs. `tracing.otlp.enabled`) depends on the chart version installed. Readers on the latest chart may need to adjust based on `helm show values traefik/traefik`.
- All other YAML manifests, CLI commands, Helm repository URL, ACME challenge configurations, Prometheus metric names (`traefik_service_requests_total`, `traefik_service_request_duration_seconds_bucket`), and dashboard internal service reference (`api@internal` of kind `TraefikService`) verified against the official Traefik documentation.
