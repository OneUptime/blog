# Validation Summary: How to Use Dapr with NGINX as API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar service invocation)
- NGINX Ingress Controller (Kubernetes)
- Kubernetes (Deployments, Services, Ingress, TLS Secrets)
- Helm

## Sources Consulted
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Kubernetes Annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- NGINX Ingress Controller Rewrite Documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- NGINX Ingress Controller Annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes Ingress API (networking.k8s.io/v1): https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes IngressClass (deprecation of ingress.class annotation): https://kubernetes.io/blog/2020/04/02/improvements-to-the-ingress-api-in-kubernetes-1.18/
- headers-more-nginx-module README: https://github.com/openresty/headers-more-nginx-module

## Issues Found

1. **`more_set_headers` used instead of `proxy_set_header` for request headers** — The "Configuring Custom NGINX Headers" section used `more_set_headers` to set headers on requests going to the Dapr sidecar. However, `more_set_headers` sets HTTP *response* headers (back to the client), not *request* headers to the upstream backend. Changed to `proxy_set_header`, which is the correct NGINX directive for setting headers on proxied requests.

2. **`pathType: Prefix` used with regex path** — The Ingress resource used `pathType: Prefix` with a regex path pattern `/users(/|$)(.*)`. Per the official NGINX Ingress Controller rewrite documentation, regex paths require `pathType: ImplementationSpecific`. Changed accordingly.

3. **Deprecated `kubernetes.io/ingress.class` annotation** — The Ingress resource used the `kubernetes.io/ingress.class: "nginx"` annotation, which has been deprecated since Kubernetes 1.18 (April 2020). Replaced with `spec.ingressClassName: nginx`, which is the current standard.

## Review Notes
- The Service resource exposes port 3500 (the Dapr HTTP sidecar port) directly, which works for routing external traffic through NGINX to the Dapr sidecar. This is a valid pattern but means traffic bypasses the application container's port and goes through Dapr's service invocation API instead.
- The Dapr service invocation URL format `/v1.0/invoke/{app-id}/method/{method-name}` is correct per the current Dapr API.
- Rate limiting annotations (`limit-rps`, `limit-connections`, `limit-req-status-code`) are all valid NGINX Ingress Controller annotations.
