# Validation Summary: How to Design Istio Architecture for Financial Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio security APIs
- Istio traffic management APIs
- Istio Telemetry API
- Envoy access logging
- Kubernetes namespaces
- Kubernetes NetworkPolicy
- Kubernetes CLI

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio Envoy access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio trace sampling task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio traffic management common problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Envoy access log command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The access log example used `X-ENVOY-PEER-METADATA` request headers for source workload and namespace. Those are not reliable access-log fields for audit identity. Changed the example to log supported Envoy mTLS SAN operators for source and destination principals.
- The access log example used `%REQ(PATH)%` for request path and `%CONNECTION_ID%` for correlation. Changed the path operator to Istio's documented original-path fallback and changed correlation to `%STREAM_ID%`, which Envoy recommends over connection IDs for most request correlation.
- The tracing example used an `EnvoyFilter` to patch Envoy HTTP connection manager sampling. Replaced it with Istio's supported `telemetry.istio.io/v1` Telemetry API and `randomSamplingPercentage`.
- Several networking resources used `networking.istio.io/v1beta1`. Updated the examples to the current `networking.istio.io/v1` API used in Istio's current documentation.
- The external TLS example combined a TLS/HTTPS ServiceEntry-style endpoint with TLS origination in a DestinationRule, which can produce the documented double-TLS mistake when applications already send HTTPS. Changed the ServiceEntry to use HTTP on port 80 with `targetPort: 443` so the sidecar originates TLS to the external service.
- The text claimed CA pinning prevents man-in-the-middle attacks even if a certificate authority is compromised. Adjusted the wording to say a dedicated CA bundle limits trust and reduces man-in-the-middle risk, which is the accurate guarantee.
- The external integration section claimed the snippet used egress gateways, but the snippet only showed ServiceEntry and DestinationRule resources. Adjusted the wording to distinguish controlled ServiceEntry access from optional centralized egress gateways.

## Review Notes
- The control-plane high availability example assumes at least three schedulable topology zones because it uses required pod anti-affinity with three istiod replicas.
- The NetworkPolicy example is structurally valid, but real clusters may need additional DNS, control-plane, or egress exceptions depending on the CNI and platform.
