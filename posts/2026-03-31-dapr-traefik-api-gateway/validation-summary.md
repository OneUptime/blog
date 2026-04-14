# Validation Summary: How to Use Dapr with Traefik as API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, sidecar injection)
- Traefik (IngressRoute CRD, Middleware, TLS termination)
- Kubernetes (Deployments, Services, Helm)
- Let's Encrypt (TLS certificates)

## Sources Consulted
- Traefik Helm chart repository — https://github.com/traefik/traefik-helm-chart
- Traefik v3 migration guide — CRD API group migration from `traefik.containo.us` to `traefik.io`
- Dapr service invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr How-To: Invoke services using HTTP — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/

## Issues Found

1. **Outdated Traefik Helm repo URL**: The Helm repo URL `https://helm.traefik.io/traefik` is legacy. Updated to the current canonical URL `https://traefik.github.io/charts`.

2. **Removed Traefik CRD API group**: All five CRD manifests (IngressRoute x2, Middleware x2, IngressRoute TLS) used `traefik.containo.us/v1alpha1`, which was removed in Traefik v3. Updated all occurrences to `traefik.io/v1alpha1`.

3. **TLS IngressRoute missing middlewares**: The TLS IngressRoute did not reference the `strip-prefix` and `add-dapr-headers` middlewares, which would cause requests on the `websecure` entrypoint to fail (no prefix stripping, no `dapr-app-id` header). Added the middleware references to match the non-TLS route.

4. **Incorrect test curl URL**: The test command `curl https://api.example.com/products/v1.0/invoke/product-service/method/list` mixed two incompatible Dapr invocation patterns — the `dapr-app-id` header proxy approach (set up by middleware) and the explicit Dapr invoke API path. With the header-based approach, the path after prefix stripping should be the actual app endpoint. Fixed to `curl https://api.example.com/products/list`, which after stripping `/products` sends `/list` to the Dapr sidecar with the `dapr-app-id` header for proper proxy-based routing.

## Review Notes
- The post does not show how to configure the `letsencrypt` cert resolver in Traefik's static configuration (e.g., via Helm values). The `certResolver: letsencrypt` reference in the TLS IngressRoute requires a corresponding resolver configuration to work. This is not technically wrong but could confuse readers who are new to Traefik.
- The Kubernetes Service targets port 3500 (Dapr sidecar HTTP port) directly, which is a valid pattern for routing external traffic through the Dapr sidecar. This is correct but worth noting as an intentional architectural choice.
