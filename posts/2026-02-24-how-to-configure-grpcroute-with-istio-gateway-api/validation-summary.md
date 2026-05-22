# Validation Summary: How to Configure GRPCRoute with Istio Gateway API

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Istio
- Kubernetes Gateway API
- GRPCRoute
- gRPC
- Kubernetes Services
- grpcurl

## Sources Consulted
- Gateway API GRPCRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/grpcroute/
- Gateway API v1.5 API reference: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Istio Kubernetes Gateway API task: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Gateway API controller reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service application protocol documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- grpcurl usage documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The post said GRPCRoute was part of the experimental Gateway API channel and installed Gateway API v1.2.0 experimental CRDs. GRPCRoute is GA and in the Standard Channel since Gateway API v1.1.0, so the prerequisites now use the current standard CRD installation pattern from Istio's Gateway API documentation.
- GRPCRoute examples used `gateway.networking.k8s.io/v1alpha2`. Updated them to `gateway.networking.k8s.io/v1`, which is the current GA API version for GRPCRoute.
- The listener explanation implied HTTP and HTTPS listeners were enough without noting HTTP/2 negotiation. Added the HTTPS ALPN and cleartext h2c caveat.
- The metadata explanation said gRPC metadata is equivalent to HTTP/2 headers. Changed it to say metadata is sent as HTTP/2 headers, which is more precise for request header matching.
- The `grpcurl` examples targeted an IP while the routes use hostname matching. Added `-authority api.example.com` to the plaintext examples so the request authority matches the configured `hostnames`.
- The mesh-internal routing note referred to a generic "mesh parentRef". Updated it to refer to a `Service` parentRef, which matches Gateway API mesh routing behavior used by Istio.

## Review Notes
The remaining examples are structurally consistent with the Gateway API GRPCRoute reference, including service/method matches, header matches, request header modification, weighted backend refs, and status conditions. Local schema validation was not run because this workspace does not have `kubectl`, `kubeconform`, Ruby, or `yq` installed.
