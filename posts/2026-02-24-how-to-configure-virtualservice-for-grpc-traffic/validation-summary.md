# Validation Summary: How to Configure VirtualService for gRPC Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio DestinationRule
- gRPC
- HTTP/2
- Kubernetes Services
- grpcurl
- istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-grpc-on
- gRPC over HTTP/2 protocol specification: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- grpcurl documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The post implied that TLS is required for gRPC through an Istio Gateway. Istio supports plaintext gRPC/HTTP2 Gateway protocols, so the note was corrected to say TLS is common externally but not required by Istio.
- The post did not mention the backend protocol-selection requirement for gateways. Istio gateways forward backend HTTP traffic as HTTP/1.1 unless the backend Service port is explicitly declared as `grpc` or `http2`, so that caveat was added.
- The DestinationRule section said `h2UpgradePolicy: UPGRADE` ensures HTTP/2 for gRPC. Istio documents this field as upgrading HTTP/1.1 upstream connections to HTTP/2, not as the primary way to configure native gRPC. The section was revised to recommend declaring the Service port protocol and to keep DestinationRule focused on subsets and traffic policies.
- The retry section did not mention Envoy's caveat that gRPC retry policies are triggered by status codes in response headers, not trailer-only statuses. A short caveat was added.

## Review Notes
The remaining VirtualService examples use supported Istio fields and the gRPC path format matches the gRPC HTTP/2 protocol. The examples use `networking.istio.io/v1beta1`, which is still supported, though Istio documentation now commonly shows `networking.istio.io/v1` for these resources.
