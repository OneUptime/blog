# Validation Summary: How to Configure Traefik as a Kubernetes Ingress Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik Proxy
- Traefik Helm chart
- Kubernetes Ingress and Services
- Traefik IngressRoute, IngressRouteTCP, Middleware, and TraefikService CRDs
- Let's Encrypt ACME certificate resolvers
- TLS termination and passthrough
- Path-based routing and weighted routing

## Sources Consulted
- Traefik Kubernetes IngressRoute documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Kubernetes Service documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/service/
- Traefik Kubernetes TraefikService documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/traefikservice/
- Traefik Kubernetes IngressRouteTCP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- Traefik StripPrefix middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/stripprefix/
- Traefik EntryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- Traefik Helm chart values: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml

## Issues Found
- The Helm install example used stale value paths for HTTP-to-HTTPS redirect and TLS on the `websecure` entrypoint. Updated the settings to use `ports.web.http.redirections.entryPoint.*` and `ports.websecure.http.tls.enabled`, which match the current Traefik Helm chart values.
- The `IngressRoute` service example used `strategy: RoundRobin`. Updated it to `strategy: wrr`, the current documented value for weighted round-robin service load balancing.
- The StripPrefix middleware example used `forceSlash: false`, which Traefik marks as deprecated. Removed the deprecated option while keeping the prefix stripping behavior.
- The health-check example and takeaway implied that Traefik health checks remove unhealthy Kubernetes pods from rotation. Current Traefik Kubernetes CRD documentation scopes these `healthCheck` fields to Kubernetes `ExternalName` services, while normal pod health should be handled with Kubernetes readiness probes. Updated the example and takeaway accordingly.
- The routing decision tree referred to pod selection after Traefik health checks. Updated it to refer to endpoint availability and endpoint selection.

## Review Notes
The post does not pin a Traefik version. The corrected examples align with the current Traefik documentation and Helm chart as reviewed on 2026-05-27, but future chart value path changes could require another pass.
