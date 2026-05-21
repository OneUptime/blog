# Validation Summary: How to Debug Service-to-Service Connectivity in Istio

## Status
validated

## Post Type
Tutorial / Debugging guide

## Technologies Covered
- Istio service mesh
- Envoy sidecar proxies
- Kubernetes Services and EndpointSlices
- Istio PeerAuthentication
- Istio AuthorizationPolicy
- Istio VirtualService and DestinationRule
- Istio Sidecar resources
- Istio Telemetry and access logging
- istioctl and kubectl

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Kubernetes Service documentation, Endpoints deprecation and EndpointSlice guidance: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Envoy access log response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- Replaced Kubernetes `Endpoints` diagnostics with `EndpointSlices`, because the Kubernetes Endpoints API is deprecated as of Kubernetes v1.33 and current documentation recommends EndpointSlice for service backends.
- Corrected the sidecar/mTLS wording to specify the important failing case: a source without a sidecar calling a destination that requires STRICT mTLS.
- Renamed and corrected the "Test Basic Connectivity Without Istio" step. The original command executed `curl` from the `istio-proxy` container, which is not a reliable app-level test and does not mean Istio is bypassed. It now tests from the source application container.
- Updated Istio API versions in examples from older beta/alpha versions to current documented `v1` APIs for `PeerAuthentication`, `AuthorizationPolicy`, `DestinationRule`, `Sidecar`, and `Telemetry`.
- Updated the mesh-config access logging command to include the existing install flags placeholder used by Istio documentation, avoiding accidental install-profile drift.
- Removed `RBAC` from the response-flags list because it is not an Envoy response flag. The post now points readers to Istio/Envoy response code details such as `rbac_access_denied_matched_policy[...]` or the `RBAC: access denied` response body for AuthorizationPolicy denials.

## Review Notes
The remaining Istio and Envoy diagnostic commands match current `istioctl proxy-config` documentation. The examples are still generic placeholders, so readers must replace pod, container, namespace, service, port, and cluster names with values from their own mesh.
