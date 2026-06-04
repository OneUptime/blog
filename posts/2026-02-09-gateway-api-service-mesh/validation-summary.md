# Validation Summary: How to use Gateway API with service mesh integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- Istio
- Linkerd
- Envoy Gateway
- Cilium
- Prometheus Operator ServiceMonitor
- Jaeger / OpenTelemetry tracing
- Helm and kubectl

## Sources Consulted
- Kubernetes Gateway API installation and HTTPRoute documentation: https://gateway-api.sigs.k8s.io/guides/ and https://gateway-api.sigs.k8s.io/reference/api-types/httproute/
- Istio Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio PeerAuthentication, AuthorizationPolicy, DestinationRule, VirtualService, EnvoyFilter, Telemetry, and Jaeger documentation: https://istio.io/latest/docs/reference/config/security/peer_authentication/, https://istio.io/latest/docs/reference/config/security/authorization-policy/, https://istio.io/latest/docs/reference/config/networking/destination-rule/, https://istio.io/latest/docs/reference/config/networking/virtual-service/, https://istio.io/latest/docs/reference/config/networking/envoy-filter/, https://istio.io/latest/docs/reference/config/telemetry/, https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Linkerd Gateway API, install, ServiceProfile, and proxy injection documentation: https://linkerd.io/2-edge/features/gateway-api/, https://linkerd.io/2/tasks/install/, https://linkerd.io/2/features/service-profiles/, https://linkerd.io/2-edge/features/proxy-injection/
- Envoy Gateway Helm install, compatibility, BackendTrafficPolicy, SecurityPolicy, and Gateway namespace mode documentation: https://gateway.envoyproxy.io/docs/install/install-helm/, https://gateway.envoyproxy.io/news/releases/matrix/, https://gateway.envoyproxy.io/docs/concepts/gateway_api_extensions/backend-traffic-policy/, https://gateway.envoyproxy.io/docs/concepts/gateway_api_extensions/security-policy/, https://gateway.envoyproxy.io/docs/tasks/operations/gateway-namespace-mode/
- Cilium Gateway API and mutual authentication documentation: https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/ and https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/

## Issues Found
- The Istio install section used old Gateway API feature flags and Gateway API v1.0.0 CRDs. Updated it to install current Gateway API CRDs and use Istio's current Gateway API defaults.
- The nginx example exposed container port 8080 even though the stock nginx image listens on port 80. Updated the Deployment and Service target port.
- Several Istio examples used older API versions. Updated DestinationRule, VirtualService, PeerAuthentication, AuthorizationPolicy, Telemetry, and EnvoyFilter examples to their current documented API versions.
- The DestinationRule used the old `consecutiveErrors` outlier detection field. Replaced it with `consecutive5xxErrors`.
- The Envoy Gateway install used v0.6.0, which is end-of-life. Updated it to v1.8.0 and corrected Linkerd injection guidance for Envoy Gateway data plane pods.
- The Linkerd ServiceProfile section presented ServiceProfiles as the current approach. Replaced the example with a Gateway API HTTPRoute and noted that ServiceProfiles are now backwards-compatibility resources.
- The Cilium install used an old version and stale Helm values. Updated it to the current OCI chart and `authentication.mutual.spire.install.enabled`.
- The Cilium mTLS policy claimed to secure gateway-to-service traffic with a gateway service account selector. Changed it to an east-west workload-to-workload mutual authentication policy.
- The Istio Jaeger example omitted the required MeshConfig extension provider and referenced an old sample manifest. Added the provider configuration and updated the Jaeger sample URL to the current Istio release.
- The Envoy Gateway BackendTrafficPolicy used outdated singular `targetRef` syntax and an obsolete `type: Global` field. Updated the snippet to current `targetRefs` syntax.
- The Gateway authentication example used a Gateway API RequestHeaderModifier with `${jwt.sub}`, which would set a static string rather than extract a JWT claim. Replaced it with Envoy Gateway SecurityPolicy JWT authentication and claim-to-header mapping.
- The ServiceMonitor selected the old `app: istio-ingressgateway` label and omitted a namespace selector. Updated it for Istio Gateway API generated gateway labels and namespace selection.
- The troubleshooting section used the removed `istioctl authn tls-check` command and an old ingress deployment name. Replaced it with current policy/certificate checks and the Gateway API generated deployment name.

## Review Notes
- The guide remains a broad integration overview. Some snippets still require environment-specific details such as real services, TLS secrets, JWT issuer/JWKS URLs, a load balancer implementation, and installed Prometheus CRDs.
