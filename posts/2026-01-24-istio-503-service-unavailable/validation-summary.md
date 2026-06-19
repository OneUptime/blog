# Validation Summary: How to Fix '503 Service Unavailable' Istio Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Kubernetes Services and EndpointSlices
- Istio VirtualService, DestinationRule, Gateway, PeerAuthentication, and sidecar injection

## Sources Consulted
- Istio Traffic Management Problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio Envoy access logs guide: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio sidecar injection guide: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio protocol selection guide: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- Envoy response code details documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/response_code_details

## Issues Found
- Updated the service backend check from the deprecated Kubernetes Endpoints API to EndpointSlices. Kubernetes v1.33 deprecated Endpoints for this usage, and EndpointSlices are the current scalable API for Service backends.
- Updated Istio custom resources in full YAML examples from `networking.istio.io/v1beta1` and `security.istio.io/v1beta1` to the current `v1` APIs.
- Corrected the mTLS guidance to state that a DestinationRule can either omit `tls` and use Istio auto mTLS, or explicitly set `ISTIO_MUTUAL`. The previous wording implied `ISTIO_MUTUAL` was always mandatory when PeerAuthentication is `STRICT`.
- Clarified that a Service `targetPort` must match the application's listening port, or a named container port, rather than necessarily matching a numeric `containerPort` field.
- Changed the ingress gateway inspection command to use `gateways.networking.istio.io` to avoid ambiguity with the Kubernetes Gateway API resource.
- Fixed capitalization in the `UF` flag description from "Upstream connection Failure" to "Upstream connection failure."

## Review Notes
The remaining examples are intentionally generic placeholders and assume the user substitutes real pod, namespace, service, cluster, and deployment names. Some troubleshooting commands, such as checking listening ports inside a container, depend on tools available in the target image.
