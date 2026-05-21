# Validation Summary: How to Migrate from Legacy Istio APIs to Gateway API

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio
- Kubernetes Gateway API
- Kubernetes CRDs
- Istio Gateway, VirtualService, and DestinationRule
- Gateway API Gateway and HTTPRoute
- `kubectl` and `istioctl`

## Sources Consulted
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio Getting Started guide, Gateway API CRD installation and auto-provisioned gateways: https://istio.io/latest/docs/setup/getting-started/
- Istio Request Routing task, Gateway API mesh routing and Service parentRefs: https://istio.io/latest/docs/tasks/traffic-management/request-routing/
- Istio Installing Gateways guide, Gateway API deployment behavior: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Kubernetes Gateway API HTTPRoute API reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API HTTP timeouts guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-timeouts/
- Kubernetes Gateway API HTTPRoute retries GEP: https://gateway-api.sigs.k8s.io/geps/gep-1731/

## Issues Found
- Updated the Gateway API CRD installation command from the old v1.2.0 release URL to the current v1.5.1 install guidance used by Istio documentation. Because the post covers mesh routing and retry fields, the command now installs the experimental CRDs.
- Changed the recommended Istio version from 1.21+ to 1.22+ for better alignment with Istio's stable Gateway API mesh support.
- Corrected the DestinationRule mapping. `DestinationRule` is not replaced by a generic `BackendPolicy`; the post now notes adjacent Gateway API policy resources while keeping `DestinationRule` for Istio-specific traffic policies.
- Reworded the DestinationRule section so it no longer describes DestinationRule as a Gateway API policy attachment.
- Corrected the retry section. Gateway API now has an experimental HTTPRoute `retry` field, while Istio Telemetry API is not the right mechanism for retry policy migration.
- Fixed the mesh-internal routing explanation. HTTPRoute mesh routing uses a `parentRef` that points to a Kubernetes Service.
- Updated the proxy-config validation command to target the generated Gateway API deployment (`my-gateway-istio`) instead of the legacy `istio-ingressgateway` deployment.
- Corrected the header matching gotcha to reflect Gateway API behavior: exact header matching is the default, regular expression matching is implementation-specific, and core HTTPRoute does not provide prefix header matching.

## Review Notes
The examples are intentionally simplified and assume that referenced Services and TLS Secrets already exist in the relevant namespaces. Gateway API retry support remains experimental, so production migrations should verify the installed CRDs and Istio implementation support before replacing retry-heavy VirtualServices.
