# Validation Summary: How to Use Dapr with NGINX Ingress

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar annotations, tracing headers)
- NGINX Ingress Controller (Helm chart, Ingress resources, annotations)
- Kubernetes (Deployments, Services, Ingress API `networking.k8s.io/v1`)
- cert-manager (TLS certificate automation via ClusterIssuer)
- W3C Trace Context (traceparent, tracestate headers)

## Sources Consulted
- NGINX Ingress Controller rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- NGINX Ingress Controller annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- cert-manager annotation documentation: https://cert-manager.io/docs/usage/ingress/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- **pathType for regex paths**: The basic NGINX Ingress configuration used `pathType: Prefix` for paths containing regex patterns (`/orders(/|$)(.*)`). The official NGINX Ingress Controller rewrite example uses `pathType: ImplementationSpecific` when regex paths are used with `use-regex: "true"`. Changed both path entries from `Prefix` to `ImplementationSpecific` to match the recommended pattern.

## Review Notes
- The `configuration-snippet` annotation used in the "Forwarding Headers for Dapr Tracing" section is disabled by default in NGINX Ingress Controller v1.9.0+ due to security concerns (CVE-2021-25742). Users may need to enable it via the `allow-snippet-annotations` controller configuration. This is not an error in the post but is a significant operational caveat worth noting for readers on newer controller versions.
- All Helm commands, Dapr annotations, cert-manager annotations, rate limiting annotations, and NGINX configuration directives are accurate and current.
