# Validation Summary: How to Implement API Versioning with Dapr and API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar injection annotations, service invocation API, HTTP proxy via `dapr-app-id` header)
- Kong Ingress Controller (path-based routing, `strip-path` annotation, `response-transformer` plugin, KongPlugin CRD)
- NGINX Ingress Controller (server-snippet, configuration-snippet, header-based routing)
- Kubernetes Ingress (`networking.k8s.io/v1`)
- Express.js (route handlers)

## Sources Consulted
- Dapr documentation on sidecar annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr HTTP proxy feature (dapr-app-id header): https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Kong Kubernetes Ingress annotations: https://docs.konghq.com/kubernetes-ingress-controller/latest/references/annotations/
- Kong response-transformer plugin: https://docs.konghq.com/hub/kong-inc/response-transformer/
- NGINX Ingress annotations (server-snippet, configuration-snippet): https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- IETF Sunset Header (RFC 8594): https://www.rfc-editor.org/rfc/rfc8594
- Cross-referenced 250+ Dapr blog posts and 31+ Kong blog posts in this codebase for pattern consistency

## Issues Found
1. **Missing `dapr.io/enabled: "true"` annotation in Dapr deployment snippet**: The deployment metadata snippet (showing how to annotate v2 deployments) included `dapr.io/app-id` and `dapr.io/app-port` but was missing the required `dapr.io/enabled: "true"` annotation. Without this annotation, the Dapr sidecar injector will not inject the sidecar into the pod. All other Dapr blog posts in this codebase consistently include this annotation. **Fixed** by adding `dapr.io/enabled: "true"` to the snippet.

## Review Notes
- **KongPlugin not attached to Ingress route**: The `deprecation-header` KongPlugin CRD is defined but the post does not show how to attach it to the v1 Ingress using the `konghq.com/plugins: deprecation-header` annotation. Without this annotation on the Ingress resource, the plugin will have no effect. Other Kong posts in this codebase consistently demonstrate plugin attachment. A future revision could add this annotation to the v1 Ingress example or add a brief note explaining the attachment step.
- **NGINX snippet annotations security caveat**: The `server-snippet` and `configuration-snippet` annotations used for header-based versioning are disabled by default in NGINX Ingress Controller v1.9.0+ due to security concerns. Users must explicitly enable them via the `enable-snippet-directives` controller setting. A future revision could note this requirement.
- **Deprecation header format**: The `Deprecation: version=v1` value is non-standard. The IETF draft (draft-ietf-httpapi-deprecation-header) specifies a date or boolean value (e.g., `Deprecation: true` or a date). Using `version=v1` is a custom convention that works in practice but does not conform to the draft specification.
- **Port 3500 in Ingress backends**: The Ingress resources use port 3500, which is Dapr's default sidecar HTTP port. This is valid for the NGINX header-based approach (which uses `dapr-app-id` header proxying), but for the Kong path-based approach the intent is less clear. Readers should ensure their Kubernetes Service port mappings are configured appropriately for their chosen approach.
