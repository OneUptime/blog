# Validation Summary: How to Create Path-Based Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress (networking.k8s.io/v1)
- NGINX Ingress Controller (ingress-nginx)
- NGINX (standalone)
- Traefik (traefik.io/v1alpha1 IngressRoute / Middleware)
- AWS Application Load Balancer (ALB) Ingress Controller
- kubectl / curl debugging commands
- Mermaid diagrams

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress path types: https://kubernetes.io/docs/concepts/services-networking/ingress/#path-types
- NGINX Ingress Controller rewrite annotation docs: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- NGINX core docs on the `location` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#location
- Traefik v3 routing rules reference: https://doc.traefik.io/traefik/routing/routers/#rule
- Traefik Kubernetes CRD reference: https://doc.traefik.io/traefik/reference/dynamic-configuration/kubernetes-crd/
- AWS Load Balancer Controller annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/

## Issues Found

1. **Traefik regex matcher used non-existent syntax.** The original example used `PathPrefix(`/api/v{version:[0-9]+}`)`. Traefik's router DSL (v2 and v3) does not support inline `{name:pattern}` regex groups inside `PathPrefix`. The supported way to do regex path matching in current Traefik (v3) is the dedicated `PathRegexp` matcher. Updated the example to `PathRegexp(`^/api/v[0-9]+/`)` so it actually works against current Traefik documentation.

## Review Notes
- The "Regex Match" YAML snippet (`path: "~/api/v[0-9]+/.*"`) is intentionally generic and does not map to a specific real-world router schema. It reads as a conceptual illustration rather than copy-pasteable config; leaving as-is since the surrounding prose frames it that way.
- The NGINX location priority list ("Exact → Preferential prefix → Regex → Prefix") is a simplified ordering commonly used in tutorials. The actual algorithm is slightly more nuanced (NGINX first finds the longest prefix, then evaluates regexes unless `^~` was used, then falls back to that prefix). The simplified form conveys the correct intuition for newcomers and matches how this is usually taught, so left unchanged.
- The AWS ALB example uses the legacy `kubernetes.io/ingress.class: alb` annotation. Modern Kubernetes (1.18+) prefers the `ingressClassName` spec field, but the annotation is still honored by the AWS Load Balancer Controller for backward compatibility. Could be modernized in a future revision but is not technically incorrect.
- The `nginx.ingress.kubernetes.io/rewrite-target: /$2` annotation paired with the `(/|$)(.*)` capture group is the canonical pattern documented by the ingress-nginx project — verified correct.
- All `kubectl`, `curl`, and NGINX `location` block syntax verified correct.
