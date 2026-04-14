# Validation Summary: How to Use Dapr with Traefik Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar annotations for Kubernetes)
- Traefik (v2 and v3 ingress controller)
- Kubernetes (Deployments, Services, CRDs)
- Helm (Traefik chart installation)
- Zipkin (distributed tracing)

## Sources Consulted
- Traefik Helm Chart values.yaml and PR #1301 (redirectTo removal): https://github.com/traefik/traefik-helm-chart
- Traefik v2.11 Tracing Overview: https://doc.traefik.io/traefik/v2.11/observability/tracing/overview/
- Traefik v2.11 Zipkin Tracing: https://doc.traefik.io/traefik/v2.11/observability/tracing/zipkin/
- Traefik v2-to-v3 Migration Details: https://doc.traefik.io/traefik/migrate/v2-to-v3-details/
- Traefik v3 OpenTelemetry Tracing: https://doc.traefik.io/traefik/observability/tracing/opentelemetry/
- Traefik IngressRoute CRD documentation: https://doc.traefik.io/traefik/routing/providers/kubernetes-crd/
- Traefik Middleware documentation (StripPrefix, RateLimit, ForwardAuth): https://doc.traefik.io/traefik/middlewares/overview/
- B3 Propagation specification (openzipkin): https://github.com/openzipkin/b3-propagation
- Dapr Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Outdated Helm redirect syntax**: `ports.web.redirectTo.port=websecure` was removed in Traefik Helm chart v34+ (January 2025). Changed to the current syntax: `ports.web.redirections.entryPoint.to=websecure` with `ports.web.redirections.entryPoint.scheme=https`.

2. **Incorrect claim about W3C trace context headers**: The post stated "Configure Traefik to forward W3C trace context headers" but configured Zipkin tracing, which uses B3 propagation headers (`X-B3-TraceId`, `X-B3-SpanId`, etc.), not W3C Trace Context (`traceparent`/`tracestate`). Changed text to "Configure Traefik to enable Zipkin distributed tracing (Traefik v2)".

3. **Non-standard tracing enable flag**: `--tracing=true` was changed to `--tracing.zipkin=true`, which is the explicit and documented way to enable the Zipkin tracing backend in Traefik v2.

4. **Tracing config scoped to v2 only**: Added "(Traefik v2)" qualifier to the tracing section and its YAML comment, since Traefik v3 removed all vendor-specific tracing backends (Zipkin, Jaeger, Datadog) in favor of OpenTelemetry exclusively.

## Review Notes
- The Traefik tracing configuration shown is only valid for Traefik v2. In Traefik v3, tracing is exclusively OpenTelemetry-based (`--tracing.otlp.http=true` or `--tracing.otlp.grpc=true`). A future update could add a v3-specific tracing example.
- The `--tracing.serviceName=traefik` flag is valid but redundant in Traefik v2, as `traefik` is already the default service name. Kept as-is since it improves clarity.
- The IngressRoute CRD apiVersion `traefik.io/v1alpha1` is correct for both Traefik v2.10+ and v3. The older `traefik.containo.us/v1alpha1` apiVersion is deprecated.
- The Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all correct and current.
- The Middleware CRDs (StripPrefix, RateLimit, ForwardAuth) are all syntactically correct with valid field names and values.
