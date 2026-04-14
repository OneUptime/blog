# Validation Summary: How to Use Dapr Service Invocation with API Gateways

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (service invocation, distributed tracing, Configuration CRD)
- Kubernetes (Deployments, Services, Ingress)
- Kong Gateway (Kubernetes Ingress Controller, KongPlugin CRDs for rate-limiting and JWT)
- NGINX Ingress Controller
- Helm
- Zipkin (distributed tracing)
- W3C Trace Context (traceparent, tracestate headers)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr name resolution (Kubernetes DNS): https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr service invocation overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr sidecar (daprd) overview: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Dapr CLI list command: https://docs.dapr.io/reference/cli/dapr-list/
- Dapr configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Zipkin tracing setup: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr W3C trace context: https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- Kong Charts GitHub: https://github.com/Kong/charts
- Kong Ingress Controller install: https://developer.konghq.com/kubernetes-ingress-controller/install/
- Kong KongPlugin CRD: https://developer.konghq.com/kubernetes-ingress-controller/custom-resources/
- Kong rate-limiting plugin: https://docs.konghq.com/hub/kong-inc/rate-limiting/configuration/
- Kong JWT plugin: https://docs.konghq.com/hub/kong-inc/jwt/configuration/
- Kong annotations reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/

## Issues Found
1. **Description mentioned Envoy but post never covers it.** The description claimed the post covers "Kong, NGINX, and Envoy" but only Kong and NGINX are actually discussed. Fixed by removing Envoy from the description.

2. **Architecture diagram showed incorrect routing path.** The diagram showed the API gateway routing directly to the Dapr sidecar on port 3500 (`Gateway -->|HTTP :3500| DaprSidecarA`), but the standard pattern described in the text and the Kong Ingress configuration routes to the frontend Kubernetes Service on port 80. The frontend app then internally calls its Dapr sidecar on localhost:3500. Fixed the diagram to show `Gateway --> Frontend Service (:80) --> Dapr Sidecar (localhost:3500)` to match the described pattern.

## Review Notes
- All Dapr API endpoints, annotations, CLI commands, and Configuration CRD fields are correct and current.
- All Kong Helm chart references, CRD formats, plugin configurations, and annotations are correct.
- The NGINX Ingress configuration uses standard Kubernetes Ingress v1 format and is correct.
- The "Direct Dapr Sidecar Access" advanced section correctly notes this as an alternative pattern and appropriately shows a Service targeting port 3500.
- The Zipkin endpoint uses namespace `monitoring` rather than the default namespace shown in Dapr docs — this is valid and depends on deployment choice.
