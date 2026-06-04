# Validation Summary: How to Use Envoy with Gateway API for Unified Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Envoy Gateway
- Kubernetes Gateway API
- GatewayClass, Gateway, HTTPRoute, and ReferenceGrant resources
- Helm
- Kubernetes Services and TLS Secrets
- Envoy Gateway BackendTrafficPolicy and EnvoyProxy extension resources
- Envoy proxy observability endpoints

## Sources Consulted
- Envoy Gateway Helm installation documentation: https://gateway.envoyproxy.io/docs/install/install-helm/
- Envoy Gateway HTTPRoute API reference: https://gateway.envoyproxy.io/v1.7/api/gateway_api/httproute/
- Kubernetes Gateway API HTTP timeouts guide: https://gateway-api.sigs.k8s.io/guides/http-timeouts/
- Kubernetes Gateway API HTTP request mirroring guide: https://gateway-api.sigs.k8s.io/guides/http-request-mirroring/
- Kubernetes Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/http-header-modifier/
- Envoy Gateway ReferenceGrant API reference: https://gateway.envoyproxy.io/v1.6/api/gateway_api/referencegrant/
- Envoy Gateway local and global rate-limit documentation: https://gateway.envoyproxy.io/v1.8/tasks/traffic/local-rate-limit/ and https://gateway.envoyproxy.io/v1.8/tasks/traffic/global-rate-limit/
- Envoy Gateway proxy metrics documentation: https://gateway.envoyproxy.io/docs/tasks/observability/proxy-metric/
- Envoy Gateway Envoy proxy admin interface documentation: https://gateway.envoyproxy.io/docs/troubleshooting/envoy-proxy-admin-interface/
- Envoy Gateway extension API reference for EnvoyProxy: https://gateway.envoyproxy.io/v1.8/api/extension_types/

## Issues Found
- The Helm installation used a non-current repository/chart form. Updated it to the official OCI chart, pinned to Envoy Gateway v1.8.0, and added the documented deployment readiness wait command.
- The timeout section claimed retry configuration and included unsupported Envoy-specific timeout annotations. Renamed the section to timeout policies, removed the annotations, and kept the standard Gateway API `rules.timeouts` fields.
- The rate-limit example used the obsolete/non-current `RateLimitPolicy` shape. Replaced it with the current Envoy Gateway `BackendTrafficPolicy` schema using local rate limiting.
- The observability commands port-forwarded the control-plane deployment while querying Envoy proxy stats. Updated the metrics and admin examples to select the Envoy proxy pod/deployment created for the Gateway and use the documented ports and endpoints.
- The EnvoyProxy example replaced the full Envoy bootstrap with only an admin listener, which would remove required generated bootstrap configuration. Removed the unsafe bootstrap replacement and kept logging and access-log customization.

## Review Notes
The Gateway API examples use fields that are current for `gateway.networking.k8s.io/v1`, while `ReferenceGrant` remains `gateway.networking.k8s.io/v1beta1`. Some Gateway API features shown, such as request mirroring, URL rewriting, and timeouts, are implementation/conformance-level dependent; Envoy Gateway documentation covers them, but users should confirm support against the Envoy Gateway version deployed in their cluster.
